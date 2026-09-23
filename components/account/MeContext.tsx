"use client";

import { createContext, useContext, useMemo } from "react";
import type { Me } from "@/lib/me";

/**
 * Who is signed in, handed down from the server.
 *
 * This replaces `SessionContext`, which read `localStorage` on mount and
 * matched what it found against `data/customers.ts`. There is an auth server
 * now, the session is an http-only cookie, and the answer is known before the
 * first byte of HTML leaves — so there is no `ready` flag here and no paint
 * during which a signed-in visitor looks signed out.
 *
 * It holds a DTO and no methods. Signing in and out are Server Actions
 * (`lib/actions/auth.ts`); a context cannot set a cookie, and a context that
 * pretended to would be a second answer to a question the server has already
 * answered.
 */
const Ctx = createContext<{ me: Me | null } | null>(null);

export function MeProvider({ me, children }: { me: Me | null; children: React.ReactNode }) {
  // One object per render of the layout, so the six trees below do not
  // re-render because a new literal was built.
  const value = useMemo(() => ({ me }), [me]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Null means nobody is signed in. A missing provider is a bug and says so. */
export function useMe(): Me | null {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMe must be used inside <MeProvider>");
  return ctx.me;
}
