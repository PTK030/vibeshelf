import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * The routes were Polish until the app switched to English. Anyone holding
   * an old link or tab would otherwise hit a 404.
   */
  async redirects() {
    return [
      { source: "/biblioteka", destination: "/library", permanent: true },
      { source: "/organizuj", destination: "/organize", permanent: true },
      { source: "/ustawienia", destination: "/settings", permanent: true },
    ];
  },

  images: {
    remotePatterns: [
      // Album art and playlist covers.
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "mosaic.scdn.co" },
      // Profile pictures linked from a user's Spotify account.
      { protocol: "https", hostname: "image-cdn-ak.spotifycdn.com" },
      { protocol: "https", hostname: "image-cdn-fa.spotifycdn.com" },
    ],
  },
};

export default nextConfig;
