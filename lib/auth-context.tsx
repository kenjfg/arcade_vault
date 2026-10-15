"use client";

import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";

// Key of the simulated user from before SPEC 14. Removed on mount.
const LEGACY_STORAGE_KEY = "av_user";

export interface AuthUser {
  name: string; // profiles.username
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean; // true until the initial session and its profile are known
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Where the links in the auth emails land (app/auth/confirm/route.ts).
export function authConfirmUrl(
  type: "email" | "recovery",
  next: string,
): string {
  const params = new URLSearchParams({ type, next });
  return `${window.location.origin}/auth/confirm?${params}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    user: AuthUser | null;
    loading: boolean;
  }>({ user: null, loading: true });

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // localStorage unavailable (e.g. private mode): nothing to clean.
    }

    const supabase = createClient();
    let active = true;
    // Only the latest session's profile may land: an older, slower read is dropped.
    let latest = 0;

    async function load(session: Session | null) {
      const request = ++latest;
      if (!session) {
        setState({ user: null, loading: false });
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", session.user.id)
        .maybeSingle();
      if (!active || request !== latest) return;
      setState({ user: data ? { name: data.username } : null, loading: false });
    }

    // Fires INITIAL_SESSION right away, then on every sign in/out in any tab.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED") return; // same user, same profile
      // Supabase calls inside this callback can deadlock the client: run them after it.
      setTimeout(() => void load(session), 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const logout = useCallback(async () => {
    await createClient().auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
