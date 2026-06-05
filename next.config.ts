import type { NextConfig } from "next";
import { SITE_USES_TRAILING_SLASH } from "./src/lib/siteTrailingSlash";

/** Backend origin without trailing `/` — code uses `${NEXT_PUBLIC_API_URL}/path`. */
function normalizePublicApiUrl(raw: string | undefined): string | undefined {
  if (raw == null || raw === "") return undefined;
  return raw.replace(/\/+$/, "");
}

const normalizedApiUrl = normalizePublicApiUrl(process.env.NEXT_PUBLIC_API_URL);

function buildImageRemotePatterns(): NonNullable<
  NextConfig["images"]
>["remotePatterns"] {
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
    {
      protocol: "https",
      hostname: "api.zextons.co.uk",
      pathname: "/**",
    },
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
      hostname: "zextonsbackend-new-eosin.vercel.app",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "eshopinflix.sfo3.digitaloceanspaces.com",
      pathname: "/**",
    },
  ];

  if (normalizedApiUrl) {
    try {
      const api = new URL(normalizedApiUrl);
      const protocol = api.protocol.replace(":", "") as "http" | "https";
      const port = api.port || undefined;
      const alreadyListed = patterns.some(
        (p) => p.hostname === api.hostname && p.protocol === protocol
      );
      if (!alreadyListed) {
        patterns.push({
          protocol,
          hostname: api.hostname,
          ...(port ? { port } : {}),
          pathname: "/**",
        });
      }
    } catch {
      // ignore invalid NEXT_PUBLIC_API_URL at build time
    }
  }

  return patterns;
}

const nextConfig: NextConfig = {
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
      "embla-carousel-react",
      "embla-carousel-fade",
      "html-react-parser",
      "react-toastify",
      "react-select",
    ],
  },
  trailingSlash: SITE_USES_TRAILING_SLASH,
  ...(normalizedApiUrl
    ? { env: { NEXT_PUBLIC_API_URL: normalizedApiUrl } }
    : {}),
  images: {
    minimumCacheTTL: 60,
    formats: ["image/avif", "image/webp"],
    remotePatterns: buildImageRemotePatterns(),
    // Allow unoptimized images for external URLs
    unoptimized: false,
  },
};
export default nextConfig;