// lib/useLocalStorage.ts
import { useMemo, useSyncExternalStore } from 'react';

// Dispatched when this tab changes a value; the browser's 'storage' event only reaches other tabs
const CHANGE_EVENT = 'mediremind:local-storage';

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/**
 * Reads a localStorage value and re-renders when it changes.
 * Returns undefined while rendering on the server or hydrating (the value isn't known yet),
 * and null when the key isn't set.
 */
export function useLocalStorageItem(key: string): string | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(key),
    () => undefined,
  );
}

// Writes a value (or removes it, given null) and notifies useLocalStorageItem in this tab
export function setLocalStorageItem(key: string, value: string | null) {
  if (value === null) window.localStorage.removeItem(key);
  else window.localStorage.setItem(key, value);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * The signed-in user saved by the login page.
 * undefined while hydrating, null when signed out (or the saved value is unreadable).
 */
export function useStoredUser<T>(): T | null | undefined {
  const raw = useLocalStorageItem('user');
  return useMemo(() => {
    if (raw === undefined || raw === null) return raw;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }, [raw]);
}
