-- Buckets. Path convention: <shop_id>/<file>. First folder = shop id.
-- shop-public : profile + cover photos (public read, owner write)
-- shop-upi    : UPI QR images (private; owner + approved customers via signed URLs)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('shop-public', 'shop-public', true, 2097152, array['image/jpeg','image/png','image/webp']),
  ('shop-upi', 'shop-upi', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create or replace function public.storage_shop_id(p_name text) returns uuid
language plpgsql immutable set search_path = public as $$
begin return (storage.foldername(p_name))[1]::uuid; exception when others then return null; end $$;

create policy "shop-public owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'shop-public' and public.is_shop_owner(public.storage_shop_id(name)));
create policy "shop-public owner update" on storage.objects for update to authenticated
  using (bucket_id = 'shop-public' and public.is_shop_owner(public.storage_shop_id(name)));
create policy "shop-public owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'shop-public' and public.is_shop_owner(public.storage_shop_id(name)));

create policy "shop-upi owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'shop-upi' and public.is_shop_owner(public.storage_shop_id(name)));
create policy "shop-upi owner update" on storage.objects for update to authenticated
  using (bucket_id = 'shop-upi' and public.is_shop_owner(public.storage_shop_id(name)));
create policy "shop-upi owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'shop-upi' and public.is_shop_owner(public.storage_shop_id(name)));
create policy "shop-upi read owner or connected" on storage.objects for select to authenticated
  using (bucket_id = 'shop-upi' and (
    public.is_shop_owner(public.storage_shop_id(name))
    or public.is_approved(public.storage_shop_id(name), auth.uid())));

-- Avatars: users manage only their own folder <user_id>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "avatars own write" on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
