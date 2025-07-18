import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

// next.config.js
module.exports = {
  env: {
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_OPAY_HOST_URL: process.env.NEXT_PUBLIC_OPAY_HOST_URL,
    
    // Add other public variables here
  },
}