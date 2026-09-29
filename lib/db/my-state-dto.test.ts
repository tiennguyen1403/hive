import { describe, expect, it } from "vitest";
import { toFavorite, toMyState, toProfileAnswer, toUnsaveAnswer } from "./my-state-dto";

/** A document shaped exactly as `my_state()` writes it for the first demo account after a reset. */
const doc = () => ({
  favorites: [
    { productId: "p-bui", color: "black", savedAt: null },
    { productId: "p-than", color: "navy", savedAt: "2026-09-29T21:04:05+07:00" },
  ],
  reminders: [6],
  sizes: { top: "L", bottom: null },
  notify: { order: true, drop: true, wishlist: false, promo: true },
});

describe("toMyState", () => {
  it("reads the document into MyState, order kept", () => {
    expect(toMyState(doc())).toEqual(doc());
  });

  it("reads an account that keeps nothing", () => {
    const empty = {
      favorites: [],
      reminders: [],
      sizes: { top: null, bottom: null },
      notify: { order: true, drop: true, wishlist: true, promo: true },
    };
    expect(toMyState(empty)).toEqual(empty);
  });

  it("names the field that is wrong", () => {
    const bad = (patch: object) => () => toMyState({ ...doc(), ...patch });
    expect(bad({ favorites: {} })).toThrow("state.favorites must be an array");
    expect(bad({ favorites: [{ productId: "bui", color: "black", savedAt: null }] })).toThrow(
      "state.favorites[0].productId",
    );
    expect(bad({ favorites: [{ productId: "p-bui", color: "red", savedAt: null }] })).toThrow(
      "state.favorites[0].color",
    );
    // A UTC stamp would move every date the screens print by seven hours.
    expect(
      bad({ favorites: [{ productId: "p-bui", color: "black", savedAt: "2026-09-29T14:04:05+00:00" }] }),
    ).toThrow("state.favorites[0].savedAt");
    expect(bad({ reminders: [6.5] })).toThrow("state.reminders[0]");
    expect(bad({ sizes: { top: "XXL", bottom: null } })).toThrow("state.sizes.top");
    expect(bad({ notify: { order: true, drop: true, wishlist: true } })).toThrow("state.notify.promo");
    expect(() => toMyState(null)).toThrow("state must be an object");
  });

  it("does not take a missing savedAt for an unknown one", () => {
    expect(() => toFavorite({ productId: "p-bui", color: "black" })).toThrow("favorite.savedAt");
  });
});

describe("the answers of the writes", () => {
  it("reads what Bỏ lưu took off, and the state after it", () => {
    const removed = { productId: "p-bui", color: "black", savedAt: null };
    expect(toUnsaveAnswer({ removed, state: doc() })).toEqual({ removed, state: doc() });
    expect(toUnsaveAnswer({ removed: null, state: doc() })).toEqual({ removed: null, state: doc() });
  });

  it("reads the saved name and phone, and nothing that is not ten digits", () => {
    expect(toProfileAnswer({ name: "Trần Minh Anh", phone: "0912345678" })).toEqual({
      name: "Trần Minh Anh",
      phone: "0912345678",
    });
    expect(() => toProfileAnswer({ name: "Trần Minh Anh", phone: "0912 345 678" })).toThrow(
      "profile.phone",
    );
  });
});
