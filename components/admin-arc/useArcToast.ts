"use client";

import { useCallback } from "react";
import { useToastStack } from "@/registry/components/toast-stack/toast-stack";

/**
 * Say something in the Arc back office's toast, with the v3 signature
 * (`useAdminToast`, until round v5 slice 6): a confirmation by default, or a
 * refusal with `"error"`. The screens moved from v3 keep every
 * call as it was: `say(result.message, result.ok ? "ok" : "error")`.
 *
 * Arc's `ToastStack` draws it (`success` or `error`), from the provider the
 * Arc frame puts around the screen. An empty sentence shows nothing, as the
 * v3 toast did: an action that answered with no message has nothing to say.
 */
export type ArcSay = (message: string, tone?: "ok" | "error") => void;

export function useArcToast(): ArcSay {
  const { toast } = useToastStack();
  return useCallback<ArcSay>(
    (message, tone = "ok") => {
      if (!message) return;
      toast({ type: tone === "ok" ? "success" : "error", title: message });
    },
    [toast],
  );
}
