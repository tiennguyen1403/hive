"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { customerById } from "@/data/customers";
import type { Customer } from "@/data/types";
import {
  SESSION_STORAGE_KEY,
  parseSession,
  serializeSession,
  signInResult,
  type Session,
  type SignInResult,
} from "@/lib/session";

interface SessionApi {
  session: Session | null;
  /** The signed-in customer, resolved. Null when nobody is. */
  me: Customer | null;
  /**
   * False until storage has been read. Every account screen waits on this:
   * bouncing someone to the sign-in page during the one paint before their
   * session loads would throw them out of their own account.
   */
  ready: boolean;
  signIn: (identifier: string, password: string) => SignInResult;
  signOut: () => void;
}

const Ctx = createContext<SessionApi | null>(null);

/**
 * Who the browser is acting as.
 *
 * Simulated, and the sign-in screen says so — there is no auth server and no
 * password store. `lib/session.ts` holds the rules; this is the plumbing:
 * read once on mount, write on change, and follow other tabs.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setSession(parseSession(window.localStorage.getItem(SESSION_STORAGE_KEY)));
    } catch {
      // Storage refused. Signed out is the safe reading of "cannot tell".
    }
    setReady(true);
  }, []);

  // Signing out in one tab has to sign out in the others. A second tab still
  // showing an order history after that is the worst kind of stale.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== SESSION_STORAGE_KEY) return;
      setSession(parseSession(e.newValue));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const signIn = useCallback((identifier: string, password: string) => {
    const result = signInResult(identifier, password);
    if (result.ok) {
      setSession(result.session);
      try {
        window.localStorage.setItem(SESSION_STORAGE_KEY, serializeSession(result.session));
      } catch {
        // The visit still works; it just will not survive a reload.
      }
    }
    return result;
  }, []);

  const signOut = useCallback(() => {
    setSession(null);
    try {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Nothing to clear if storage is unavailable.
    }
  }, []);

  const value = useMemo<SessionApi>(
    () => ({
      session,
      me: session ? (customerById.get(session.customerId) ?? null) : null,
      ready,
      signIn,
      signOut,
    }),
    [session, ready, signIn, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
