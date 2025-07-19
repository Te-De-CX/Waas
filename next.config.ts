import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

// next.config.js
module.exports = {
  env: {
    OPAY_MERCHANT_ID: process.env.OPAY_MERCHANT_ID,
    OPAY_SECRET_KEY: process.env.OPAY_SECRET_KEY,
    OPAY_SALT_INDEX: process.env.OPAY_SALT_INDEX,
  },
}