import { defineConfig } from "@playwright/test"
export default defineConfig({
  testDir: "./tests/browser",
  use: {
    baseURL: process.env.AURA_TEST_URL || "http://localhost:3000",
    viewport: { width: 1440, height: 1100 },
    launchOptions: { args: ["--autoplay-policy=no-user-gesture-required"] },
  },
  timeout: 45000,
})
