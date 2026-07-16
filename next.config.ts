import type { NextConfig } from "next";
import { SITE_USES_TRAILING_SLASH } from "./src/lib/siteTrailingSlash";

/** Backend origin without trailing `/` — code uses `${NEXT_PUBLIC_API_URL}/path`. */
function normalizePublicApiUrl(raw: string | undefined): string | undefined {
  if (raw == null || raw === "") return undefined;
  return raw.replace(/\/+$/, "");
}

const normalizedApiUrl = normalizePublicApiUrl(process.env.NEXT_PUBLIC_API_URL);

/** Comma-separated extra hostnames (CMS may store absolute media URLs from other API origins). */
function parseExtraImageHostnames(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return [...new Set(raw.split(",").map((h) => h.trim()).filter(Boolean))];
}

type ImageRemotePattern = {
  protocol: "http" | "https";
  hostname: string;
  port?: string;
  pathname: string;
};

function buildImageRemotePatterns(): ImageRemotePattern[] {
  const patterns: ImageRemotePattern[] = [
    {
      protocol: "http",
      hostname: "localhost",
      port: "4000",
      pathname: "/**",
    },
    {
      protocol: "http",
      hostname: "127.0.0.1",
      port: "4000",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "tjsujaiqhcpzokod.public.blob.vercel-storage.com",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "*.public.blob.vercel-storage.com",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "eshopinflix.sfo3.digitaloceanspaces.com",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "api.refurb.market",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "api.spectrotech.co.uk",
      pathname: "/**",
    },
  ];

  const addHostname = (hostname: string, protocol: "http" | "https" = "https", port?: string) => {
    const alreadyListed = patterns.some(
      (p) => p.hostname === hostname && p.protocol === protocol
    );
    if (alreadyListed) return;
    patterns.push({
      protocol,
      hostname,
      ...(port ? { port } : {}),
      pathname: "/**",
    });
  };

  if (normalizedApiUrl) {
    try {
      const api = new URL(normalizedApiUrl);
      const protocol = api.protocol.replace(":", "") as "http" | "https";
      addHostname(api.hostname, protocol, api.port || undefined);
    } catch {
      // ignore invalid NEXT_PUBLIC_API_URL at build time
    }
  }

  for (const hostname of parseExtraImageHostnames(
    process.env.NEXT_PUBLIC_EXTRA_IMAGE_HOSTS
  )) {
    addHostname(hostname);
  }

  return patterns;
}

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Cache static assets for 1 year
        source: "/:all*(svg|jpg|jpeg|png|gif|ico|webp|mp4|webm|woff|woff2|ttf|otf)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Cache JS/CSS chunks for 1 year (they have content hashes)
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // HTML pages: stale-while-revalidate for faster repeat visits
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=120, stale-while-revalidate=300",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/profiles/:role/:slug",
        destination: "/:role/:slug",
        permanent: true,
      },
      {
        source: "/profiles/:role/:slug/",
        destination: "/:role/:slug/",
        permanent: true,
      },
      {
        source: "/terms-of-service",
        destination: "/terms-and-conditions/",
        permanent: true,
      },
      {
        source: "/terms-of-service/",
        destination: "/terms-and-conditions/",
        permanent: true,
      },
    ];
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  experimental: {
    /** Smaller initial CSS: keep route/component CSS in separate chunks when safe. */
    cssChunking: "strict",
    optimizePackageImports: [
      "lucide-react",
      "react-icons",
      "@heroicons/react",
      "@headlessui/react",
      "@reduxjs/toolkit",
      "react-redux",
      "embla-carousel",
      "embla-carousel-react",
      "embla-carousel-fade",
      "html-react-parser",
      "react-toastify",
      "react-select",
      "react-spinners",
      "axios",
      "@stripe/stripe-js",
      "@stripe/react-stripe-js",
    ],
  },
  trailingSlash: SITE_USES_TRAILING_SLASH,
  ...(normalizedApiUrl
    ? { env: { NEXT_PUBLIC_API_URL: normalizedApiUrl } }
    : {}),
  images: {
    minimumCacheTTL: 31536000, // 1 year
    formats: ["image/avif", "image/webp"],
    remotePatterns: buildImageRemotePatterns(),
    // Allow unoptimized images for external URLs
    unoptimized: false,
  },
};
export default nextConfig;