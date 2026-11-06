import { resolve } from "node:path";

// Public icons exist before either TanStack build environment finishes.
export const pwaWorkboxOptions = {
  globDirectory: resolve("public"),
  globPatterns: ["icons/*.png"],
  navigateFallback: null,
  runtimeCaching: [],
  cleanupOutdatedCaches: true,
};