/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    // `images.domains` đã deprecated ở Next 16 — phải dùng remotePatterns.
    // Unsplash là ảnh MƯỢN TẠM (PRODUCT.md ghi rõ chưa có thư viện ảnh thật).
    // Có ảnh thật thì xoá mục này, không phải sửa chỗ nào khác.
    //
    // Uploaded photos (slice B3c) need no entry here: the app serves them itself
    // at `/photos/up/…`, a local path, so the browser never calls Supabase.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },

  experimental: {
    serverActions: {
      // Slice B3c: one product photo per call to `uploadProductPhoto` — at
      // most 1,5 MB after the browser crops and shrinks it — plus the
      // multipart overhead, which "an additional 10–20 KB is a reasonable rule
      // of thumb" for. The default is 1 MB.
      // node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
