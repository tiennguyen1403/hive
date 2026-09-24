/**
 * The same picture for the X (Twitter) card, `summary_large_image` (QĐ-31):
 * X reads `twitter:image` rather than `og:image`, and this file is how Next
 * writes that tag for a generated image. Nothing is drawn twice in code —
 * the Open Graph image is the one source.
 */
export { alt, contentType, size, default } from "./opengraph-image";
