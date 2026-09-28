"use client";

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";

const STORAGE_KEY = "av_user";

export interface AuthUser {
  name: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (user: AuthUser | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// getSnapshot must return a referentially stable value when nothing changed,
// or useSyncExternalStore re-renders forever. JSON.parse() makes a new object
// every call, so cache by the raw string and only re-parse when it changes.
let cachedRaw: string | null = null;
let cachedUser: AuthUser | null = null;

function readUser(): AuthUser | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw === cachedRaw) return cachedUser;
  cachedRaw = raw;
  try {
    cachedUser = raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    cachedUser = null;
  }
  return cachedUser;
}

function readServerUser(): AuthUser | null {
  return null;
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

// "storage" only fires in *other* tabs by spec. Dispatching it ourselves after
// a write lets this tab's useSyncExternalStore subscribers pick up the change too.
function notifyLocalTab() {
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useSyncExternalStore(subscribe, readUser, readServerUser);

  const login = useCallback((nextUser: AuthUser | null) => {
    try {
      if (nextUser) localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable (e.g. private mode) — session just won't persist.
    }
    notifyLocalTab();
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    notifyLocalTab();
  }, []);

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
