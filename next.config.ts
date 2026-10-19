import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  cacheComponents: true,
  // The scholarly answers index is read from disk by the chat route
  outputFileTracingIncludes: {
    "/api/chat": ["./data/scholarly/**"],
  },
  outputFileTracingExcludes: {
    "*": ["./data/*.json", "./data/*.txt"],
  },
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
