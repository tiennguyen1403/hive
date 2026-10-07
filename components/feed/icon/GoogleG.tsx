/**
 * Google's "G" for "Tiếp tục với Google" (slice B16): the standard colour mark
 * Google requires on a button an app draws itself. The user chose it over the
 * mock's one-colour Phosphor glyph on 06/10/2026 (QĐ-41): "Don't: Use
 * monochrome versions of the Google "G" for the button", and "Regardless of
 * the text, you can't change the size or color of the Google "G" logo. It
 * must be the standard color version (the standard color gradient super G
 * logo) and appear on a white background"
 * (https://developers.google.com/identity/branding-guidelines, "Create a
 * custom Sign in with Google Button").
 *
 * NOT DRAWN HERE. Every number below is Google's own, from the pre-approved
 * asset bundle that page links ("Download pre-approved brand icons",
 * `signin-assets.zip`, `Android + Web/SVG/Light/Theme=Light, Show text=No,
 * Shape=Pill, Platform=Android+Web.svg`): the G is the 20 × 20 mark at
 * (10, 10) of that 40 × 40 button, so the viewBox cuts it out and leaves the
 * button's circle and stroke behind. What changed on the way in, and why it
 * draws the same:
 *
 *   · the Figma re-import data (`data-figma-gradient-fill`,
 *     `data-figma-skip-parse`) is gone, and with it the path that carried it,
 *     which the file never paints (`fill="none"` is inherited from the root);
 *   · the ids carry a `hive-g-` prefix, and there is one Google button per
 *     page (`AccountForm`, `extras`);
 *   · `mask-type: alpha` and the conic sweep stay inline styles, as in the
 *     file: SVG has no conic gradient, so Google ships a CSS one in a
 *     `foreignObject`, and the mask's own fill only works as an alpha mask.
 *
 * Its size is the button's icon box, `.btn .i` — 20 px, as the glyph it
 * replaces and as the mark in Google's own 40 px button. Decoration: the
 * button's words say "Google".
 */

/** The blur Google applies to each painted layer, by layer: the filter region in user space. */
const BLURS: readonly (readonly [x: number, y: number, width: number, height: number])[] = [
  [5.25922, 4.90668, 29.7381, 29.772],
  [12.9977, 14.828, 14.1038, 10.8265],
  [23.9146, 13.1219, 18.8784, 10.1871],
  [15.8659, 11.8415, 18.8171, 8.7561],
  [20.1341, 8.54878, 18.8171, 8.7561],
  [13.9756, 14.7683, 21.0122, 10.2195],
  [19.0404, 9.0042, 12.2878, 10.0309],
];

/** The six soft blobs over the sweep, layers 1 to 6, as the file lists them. */
const BLOBS: readonly { cx: number; cy: number; rx: number; ry: number; fill: string; rotate?: number }[] = [
  { cx: 20.0496, cy: 20.2413, rx: 5.39634, ry: 2.83537, fill: "#3186FF", rotate: 24.4473 },
  { cx: 33.3538, cy: 18.2155, rx: 7.43918, ry: 3.09357, fill: "#3186FF" },
  { cx: 25.2744, cy: 16.2195, rx: 7.40854, ry: 2.37805, fill: "#FF4641" },
  { cx: 29.5427, cy: 12.9268, rx: 7.40854, ry: 2.37805, fill: "#FF5B8B" },
  { cx: 24.4817, cy: 19.878, rx: 8.5061, ry: 3.10976, fill: "#3186FF" },
  { cx: 25.1842, cy: 14.0197, rx: 4.53882, ry: 2.37805, fill: "#FF4641", rotate: -28.6599 },
];

/** The G's outline, the mask everything is painted through. */
const G_PATH =
  "M29.3987 18.1814H19.9849V22.0445H25.3598C25.1286 23.294 24.4294 24.3596 23.3676 25.0712C22.4746 25.6716 21.3266 26.0211 19.9849 26.0211C17.3864 26.0211 15.1823 24.2666 14.3947 21.9004C14.1952 21.2989 14.0853 20.6599 14.0853 19.9983C14.0853 19.3367 14.1952 18.6966 14.3947 18.0962C15.1823 15.7311 17.3864 13.9755 19.9849 13.9755C21.4524 13.9755 22.767 14.4816 23.8039 15.4713L26.6653 12.6057C24.936 10.9908 22.6786 10 19.9849 10C16.0832 10 12.705 12.2414 11.0618 15.5076C10.383 16.8592 10 18.3834 10 19.9994C10 21.6155 10.383 23.1396 11.0618 24.4913C12.705 27.7597 16.0832 30 19.9849 30C22.6797 30 24.9485 29.1137 26.6018 27.5861C28.4887 25.8452 29.5732 23.2702 29.5732 20.2275C29.5732 19.5182 29.5131 18.835 29.3987 18.1825V18.1814Z";

/** The disc the colour sweep is clipped to. */
const SWEEP_DISC =
  "M7.25922 19.7927C7.25922 12.6759 13.0209 6.90668 20.1283 6.90668C27.2357 6.90668 32.9973 12.6759 32.9973 19.7927C32.9973 26.9094 27.2357 32.6786 20.1283 32.6786C13.0209 32.6786 7.25921 26.9094 7.25922 19.7927Z";

/** The colour sweep round the G, as the file's CSS has it. */
const SWEEP =
  "conic-gradient(from 90deg,rgba(255, 70, 65, 1) 0deg,rgba(255, 70, 65, 1) 4.14555deg,rgba(49, 134, 255, 1) 39.154deg,rgba(49, 134, 255, 1) 72.0044deg,rgba(0, 165, 183, 1) 96.7463deg,rgba(14, 188, 95, 1) 120.897deg,rgba(14, 188, 95, 1) 154.722deg,rgba(108, 196, 0, 1) 179.136deg,rgba(255, 204, 0, 1) 203.588deg,rgba(255, 211, 20, 1) 226.915deg,rgba(255, 204, 0, 1) 251.688deg,rgba(255, 106, 43, 1) 273.129deg,rgba(253, 70, 65, 1) 289.305deg,rgba(255, 70, 65, 1) 359.593deg,rgba(255, 70, 65, 1) 360deg)";

export function GoogleG() {
  return (
    <svg className="i" viewBox="10 10 20 20" fill="none" aria-hidden="true" focusable="false">
      <mask
        id="hive-g-mask"
        style={{ maskType: "alpha" }}
        maskUnits="userSpaceOnUse"
        x="10"
        y="10"
        width="20"
        height="20"
      >
        <path d={G_PATH} fill="#E94FFF" />
      </mask>
      <g mask="url(#hive-g-mask)">
        <g filter="url(#hive-g-blur-0)">
          <g clipPath="url(#hive-g-disc)">
            <g transform="matrix(0.00804129 -0.00805186 0.00804128 0.00805186 19.6819 19.7927)">
              <foreignObject x="-2105.64" y="-2105.64" width="4211.29" height="4211.29">
                <div style={{ background: SWEEP, height: "100%", width: "100%", opacity: 1 }} />
              </foreignObject>
            </g>
          </g>
        </g>
        {BLOBS.map((b, i) => (
          <g key={i} filter={`url(#hive-g-blur-${i + 1})`}>
            <ellipse
              cx={b.cx}
              cy={b.cy}
              rx={b.rx}
              ry={b.ry}
              fill={b.fill}
              {...(b.rotate === undefined ? {} : { transform: `rotate(${b.rotate} ${b.cx} ${b.cy})` })}
            />
          </g>
        ))}
      </g>
      <defs>
        {BLURS.map(([x, y, width, height], i) => (
          <filter
            key={i}
            id={`hive-g-blur-${i}`}
            x={x}
            y={y}
            width={width}
            height={height}
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
            <feGaussianBlur stdDeviation="1" result="effect1_foregroundBlur" />
          </filter>
        ))}
        <clipPath id="hive-g-disc">
          <path d={SWEEP_DISC} />
        </clipPath>
      </defs>
    </svg>
  );
}
