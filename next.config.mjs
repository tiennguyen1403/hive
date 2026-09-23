/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    // `images.domains` đã deprecated ở Next 16 — phải dùng remotePatterns.
    // Unsplash là ảnh MƯỢN TẠM (PRODUCT.md ghi rõ chưa có thư viện ảnh thật).
    // Có ảnh thật thì xoá mục này, không phải sửa chỗ nào khác.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
