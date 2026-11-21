// import { useEffect, useRef } from 'react';
// import { subscribeTables } from '../services/notification/notificationService';

// /** Re-run `onChange` (debounced) whenever any of the tables change. */
// export function useRealtime(name: string, tables: string[], onChange: () => void, userId?: string) {
//   const cb = useRef(onChange);
//   cb.current = onChange;
//   useEffect(() => {
//     let t: ReturnType<typeof setTimeout> | undefined;
//     const off = subscribeTables(name, tables, () => { clearTimeout(t); t = setTimeout(() => cb.current(), 400); }, userId);
//     return () => { clearTimeout(t); off(); };
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [name, userId, tables.join(',')]);
// }


import { useEffect, useRef } from 'react';
import { subscribeTables } from '../services/notification/notificationService';

export function useRealtime(
  name: string,
  tables: string[],
  onChange: () => void,
  userId?: string
) {
  const cb = useRef(onChange);

  cb.current = onChange;

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;

    const off = subscribeTables(
      name,
      tables,
      () => {
        if (t) clearTimeout(t);

        t = setTimeout(() => {
          cb.current();
        }, 400);
      },
      userId
    );

    return () => {
      if (t) clearTimeout(t);
      off();
    };
  }, [name, userId, tables.join(',')]);
}