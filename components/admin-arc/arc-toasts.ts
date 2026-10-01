/**
 * The Arc back office's toast stack, and the dialogs and drawers opened over
 * it (round v5 slice 4, first fix).
 *
 * Radix dismisses a dialog or a drawer on any press or focus outside it, and
 * a toast is outside: closing a refusal ("Lịch chồng lên Số 06") with its own
 * button closed the form under it too, and what had been typed went with it.
 * `ArcAdminFrame` puts its `ToastStack` inside an element that carries
 * `TOAST_LAYER`, and every dialog and drawer of the zone passes
 * `keepOpenForToasts` to `onInteractOutside`, a documented Radix prop, so Arc
 * itself is not patched. Escape, a press on the overlay and the dialogs' own
 * buttons close them as before.
 *
 * `arc-overlays.test.ts` fails when a `DialogContent` or a `DrawerContent` in
 * `components/admin-arc/` goes without it.
 */
export const TOAST_LAYER = "data-arc-toasts";

/**
 * `onInteractOutside` for the zone's dialogs and drawers: a press or a focus
 * inside the toast stack is not outside the dialog. Radix dispatches the event
 * on the element that was pressed or focused.
 */
export function keepOpenForToasts(event: { target: EventTarget | null; preventDefault: () => void }): void {
  const target = event.target as { closest?: (selector: string) => unknown } | null;
  if (typeof target?.closest === "function" && target.closest(`[${TOAST_LAYER}]`)) event.preventDefault();
}
