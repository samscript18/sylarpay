import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["mongoose"],
  poweredByHeader: false,
  agentRules: false,
};
export default config;
