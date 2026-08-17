/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    // The TikZJax engine (public/tikzjax/** and public/tj/**) is version-pinned
    // and large (~15 MB, dominated by core.dump.gz). Cache it immutably so a
    // returning browser never re-downloads it.
    return [
      {
        source: "/tikzjax/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/tj/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
