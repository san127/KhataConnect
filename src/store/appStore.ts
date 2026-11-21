import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase/client';
import { getMyProfile } from '../services/profile/profileService';
import { listMyShops } from '../services/shop/shopService';
import type { Profile, Role, Shop } from '../types/models';

const K = { mode: 'kc.mode', shop: 'kc.selectedShop', onboarded: 'kc.onboarded' };

interface AppState {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  shops: Shop[];
  mode: Role;
  selectedShopId: string | null;
  recoveryMode: boolean;
  onboarded: boolean;
  init: () => () => void;
  loadUserData: () => Promise<void>;
  refreshShops: () => Promise<void>;
  setMode: (m: Role) => void;
  selectShop: (id: string) => void;
  setRecoveryMode: (v: boolean) => void;
  finishOnboarding: () => void;
  selectedShop: () => Shop | null;
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false, session: null, profile: null, shops: [], mode: 'CUSTOMER', selectedShopId: null,
  recoveryMode: false, onboarded: true,

  init: () => {
    (async () => {
      const [mode, shop, onboarded] = await Promise.all([AsyncStorage.getItem(K.mode), AsyncStorage.getItem(K.shop), AsyncStorage.getItem(K.onboarded)]);
      set({ mode: mode === 'SHOPKEEPER' ? 'SHOPKEEPER' : 'CUSTOMER', selectedShopId: shop, onboarded: onboarded === '1' });
      const { data } = await supabase.auth.getSession();
      set({ session: data.session });
      if (data.session) await get().loadUserData();
      set({ ready: true });
    })().catch(() => set({ ready: true }));

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') set({ recoveryMode: true });
      set({ session });
      if (session) { setTimeout(() => get().loadUserData().catch(() => {}), 0); }
      else set({ profile: null, shops: [], selectedShopId: null, recoveryMode: false });
    });
    return () => sub.subscription.unsubscribe();
  },

  loadUserData: async () => {
    const uid = get().session?.user.id;
    if (!uid) return;
    const [profile, shops] = await Promise.all([getMyProfile(uid), listMyShops(uid)]);
    const sel = get().selectedShopId;
    set({ profile, shops, selectedShopId: shops.find(s => s.id === sel)?.id ?? shops[0]?.id ?? null });
  },
  refreshShops: async () => {
    const uid = get().session?.user.id;
    if (!uid) return;
    const shops = await listMyShops(uid);
    const sel = get().selectedShopId;
    set({ shops, selectedShopId: shops.find(s => s.id === sel)?.id ?? shops[0]?.id ?? null });
  },
  setMode: m => { set({ mode: m }); AsyncStorage.setItem(K.mode, m).catch(() => {}); },
  selectShop: id => { set({ selectedShopId: id }); AsyncStorage.setItem(K.shop, id).catch(() => {}); },
  setRecoveryMode: v => set({ recoveryMode: v }),
  finishOnboarding: () => { set({ onboarded: true }); AsyncStorage.setItem(K.onboarded, '1').catch(() => {}); },
  selectedShop: () => get().shops.find(s => s.id === get().selectedShopId) ?? null,
}));
