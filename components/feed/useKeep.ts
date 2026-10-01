"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useMyState } from "@/components/account/MyStateContext";
import { startWait } from "@/components/shop/WaitVeil";
import type { ColorKey, Favorite, MyState, NotifyKey, Product, ProductId, Size, SizeSlot } from "@/data/types";
import {
  restoreFavoriteAction,
  saveFavoriteAction,
  setMySizeAction,
  setNotifyAction,
  setReminderAction,
  unsaveFavoriteAction,
} from "@/lib/actions/my-state";
import {
  hasReminder,
  isSaved,
  mySizeOf,
  withFavorite,
  withFavoriteBack,
  withNotify,
  withReminder,
  withSize,
  withoutFavorite,
} from "@/lib/feed-me";
import { useLocale } from "@/components/i18n/LocaleContext";
import { signHref } from "@/lib/feed-sign-in";
import { picker } from "@/lib/i18n";
import { keepFailureMessage, type KeepRefusal, type KeepResult, type KeepTopic, type UnsaveResult } from "@/lib/my-state";
import { useFeedToast } from "./FeedToast";

/** What a heart press did: saved (the heart pops), taken off, or asked the shopper to sign in first. */
export type HeartPress = "saved" | "removed" | "ask";

export interface Keep {
  state: MyState | null;
  signedIn: boolean;
  isSaved: (id: ProductId) => boolean;
  hasReminder: (no: number) => boolean;
  /** "Size của tôi" for this style: quần for trousers, áo otherwise; none while signed out. */
  mySize: (p: Pick<Product, "family">) => Size | null;
  /** The heart on a card, a rail's card or the product page: saves in `color`, or takes the style off. */
  toggleFavorite: (p: Product, color: ColorKey) => HeartPress;
  /** "Nhắc tôi" / "Đã bật nhắc". */
  toggleReminder: (no: number) => void;
  /**
   * The reminder on or off, as asked, whatever the screen drew last — for a
   * "Hoàn tác" that runs after the state it was made from has moved on
   * (Thông báo's "Trong app", slice 4a).
   */
  setReminder: (no: number, on: boolean) => void;
  /** One of the four switches under "Nhận thông báo về" (Thông báo, slice 4a). */
  setNotify: (key: NotifyKey, on: boolean) => void;
  /** Hồ sơ's sizes: true once the account has it, false when it was refused (and the toast said why). */
  setSize: (slot: SizeSlot, size: Size | null) => Promise<boolean>;
  /** Yêu thích's filled heart: off the list, with no toast of its own on success. */
  unsave: (id: ProductId) => Promise<UnsaveResult>;
  /** "Hoàn tác": the style back where it stood. */
  restore: (fav: Favorite, at: number) => Promise<KeepResult>;
}

/**
 * The account's state for a Feed screen (round v4 slice 3b): the provider's
 * optimistic writes (`MyStateContext`) with the Feed's words around them.
 *
 * Signed out, a press never reaches the server: the mock's invitation says
 * what signing in is for, with a way in that comes back to this very page
 * (`feed.js`: `askSignIn` — "Đăng nhập để lưu mẫu", "Đăng nhập để bật
 * nhắc"). Signed in, a refusal takes the drawing back and says the action's
 * own sentence; one that says the session has gone offers the way in too.
 *
 * In the page's language since round v6 slice E1: the actions answer in
 * Vietnamese, so a refusal is worded again here from its `reason` and the
 * write's topic (`keepFailureMessage`) — the same sentence in Vietnamese, its
 * English on an English page. The rate limit's sentence carries a wait the
 * action measured, so it is shown as the action wrote it (still Vietnamese,
 * like every action's rate limit until its slice).
 */
export function useKeep(): Keep {
  const { state, signedIn, keep } = useMyState();
  const toast = useFeedToast();
  const router = useRouter();
  const locale = useLocale();

  const askSignIn = useCallback(
    (text: string) => {
      const here = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const href = signHref("in", here);
      toast(text, {
        label: picker(locale)({ vi: "Đăng nhập", en: "Sign in" }),
        run: () => {
          startWait(href);
          router.push(href);
        },
      });
    },
    [toast, router, locale],
  );

  const refused = useCallback(
    (r: KeepRefusal, topic: KeepTopic) => {
      const text = r.reason === "RATE_LIMITED" ? r.message : keepFailureMessage(r.reason, topic, locale);
      if (r.reason === "SIGNED_OUT") askSignIn(text);
      else toast(text);
    },
    [askSignIn, toast, locale],
  );

  const toggleFavorite = useCallback(
    (p: Product, color: ColorKey): HeartPress => {
      if (!signedIn) {
        askSignIn(keepFailureMessage("SIGNED_OUT", "favorites", locale));
        return "ask";
      }
      const saved = isSaved(state, p.id);
      const run = saved
        ? keep("favorites", (s) => withoutFavorite(s, p.id), () => unsaveFavoriteAction(p.id))
        : keep("favorites", (s) => withFavorite(s, p.id, color), () => saveFavoriteAction(p.id, color));
      void run.then((r) => {
        if (!r.ok) refused(r, "favorites");
      });
      return saved ? "removed" : "saved";
    },
    [signedIn, state, keep, askSignIn, refused, locale],
  );

  const setReminder = useCallback(
    (no: number, on: boolean) => {
      if (!signedIn) {
        askSignIn(keepFailureMessage("SIGNED_OUT", "reminders", locale));
        return;
      }
      void keep("reminders", (s) => withReminder(s, no, on), () => setReminderAction(no, on)).then((r) => {
        if (!r.ok) refused(r, "reminders");
      });
    },
    [signedIn, keep, askSignIn, refused, locale],
  );

  const toggleReminder = useCallback(
    (no: number) => setReminder(no, !hasReminder(state, no)),
    [state, setReminder],
  );

  const setNotify = useCallback(
    (key: NotifyKey, on: boolean) => {
      if (!signedIn) {
        askSignIn(keepFailureMessage("SIGNED_OUT", "notify", locale));
        return;
      }
      void keep("notify", (s) => withNotify(s, key, on), () => setNotifyAction(key, on)).then((r) => {
        if (!r.ok) refused(r, "notify");
      });
    },
    [signedIn, keep, askSignIn, refused, locale],
  );

  const setSize = useCallback(
    async (slot: SizeSlot, size: Size | null) => {
      const r = await keep("sizes", (s) => withSize(s, slot, size), () => setMySizeAction(slot, size));
      if (!r.ok) refused(r, "sizes");
      return r.ok;
    },
    [keep, refused],
  );

  const unsave = useCallback(
    async (id: ProductId) => {
      const r = await keep("favorites", (s) => withoutFavorite(s, id), () => unsaveFavoriteAction(id));
      if (!r.ok) refused(r, "favorites");
      return r;
    },
    [keep, refused],
  );

  const restore = useCallback(
    async (fav: Favorite, at: number) => {
      const r = await keep("favorites", (s) => withFavoriteBack(s, fav, at), () => restoreFavoriteAction(fav.productId));
      if (!r.ok) refused(r, "favorites");
      return r;
    },
    [keep, refused],
  );

  return useMemo<Keep>(
    () => ({
      state,
      signedIn,
      isSaved: (id) => isSaved(state, id),
      hasReminder: (no) => hasReminder(state, no),
      mySize: (p) => mySizeOf(state, p),
      toggleFavorite,
      toggleReminder,
      setReminder,
      setNotify,
      setSize,
      unsave,
      restore,
    }),
    [state, signedIn, toggleFavorite, toggleReminder, setReminder, setNotify, setSize, unsave, restore],
  );
}
