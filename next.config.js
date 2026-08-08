/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Image Security ────────────────────────────────────────────────────────
  // Restrict remote images to known trusted domains only
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" }, // Google avatars
      { protocol: "https", hostname: "avatars.githubusercontent.com" }, // GitHub avatars
      { protocol: "https", hostname: "images.unsplash.com" }, // Unsplash stock images
    ],
  },

  // ── HTTP Security Headers ─────────────────────────────────────────────────
  // These complement the middleware headers for static assets and non-API pages
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },

  // ── Server-Side Redirects ─────────────────────────────────────────────────
  async redirects() {
    return [
      // Redirect bare /admin to /admin/users
      {
        source: "/admin",
        destination: "/admin/users",
        permanent: false,
      },
    ];
  },

  // ── Build Hardening ───────────────────────────────────────────────────────
  poweredByHeader: false, // Remove X-Powered-By: Next.js header (prevents fingerprinting)
};

module.exports = nextConfig;
