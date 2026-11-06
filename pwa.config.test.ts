import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateSW, getManifest } from "workbox-build";
import { pwaWorkboxOptions } from "./pwa.config";

describe("Icon-only PWA generation", () => {
  it("generates a worker using all four public icons without caching private data", async () => {
    const directory = await mkdtemp(join(tmpdir(), "taller-pwa-"));
    try {
      const manifest = await getManifest({
        globDirectory: pwaWorkboxOptions.globDirectory,
        globPatterns: pwaWorkboxOptions.globPatterns,
      });
      expect(manifest.manifestEntries.map((entry) => entry.url).sort()).toEqual([
        "icons/apple-touch-icon.png",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/icon-maskable.png",
      ]);
      const result = await generateSW({
        ...pwaWorkboxOptions,
        swDest: join(directory, "sw.js"),
      });
      expect(result.count).toBe(4);
      expect(result.warnings).toEqual([]);
      expect(await readFile(join(directory, "sw.js"), "utf8")).toContain("icons/icon-192.png");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});