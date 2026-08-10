import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * R31-3 — the public site's head.
 *
 * Two things were wrong before launch. The favicon pointed at `/vite.svg`
 * with no `public/` directory behind it at all, so every visitor got a 404 and
 * the browser's blank page icon. And there was not a single Open Graph or
 * Twitter tag, so sharing the link anywhere it actually gets shared — Slack,
 * LinkedIn, X, Discord — rendered a bare URL with no title, description or
 * image.
 *
 * Both fail silently and neither shows up in any functional test, which is
 * exactly why they survived 155 batches. These assertions are the guard.
 */
const root = process.cwd();
const html = readFileSync(resolve(root, "index.html"), "utf-8");

/** `<meta property|name="X" content="Y">`, attribute order independent. */
const meta = (key: string): string | null => {
  const pattern = new RegExp(
    `<meta[^>]*(?:property|name)=["']${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`,
    "i"
  );
  const tag = html.match(pattern)?.[0];
  if (!tag) return null;
  return tag.match(/content=["']([^"']*)["']/i)?.[1] ?? null;
};

describe("public site metadata (R31-3)", () => {
  describe("favicon actually exists", () => {
    it("references a file that is present in public/", () => {
      const href = html.match(
        /<link[^>]*rel=["'][^"']*icon[^"']*["'][^>]*>/i
      )?.[0];
      expect(href, "no favicon <link> at all").toBeTruthy();

      const url = href!.match(/href=["']([^"']+)["']/i)?.[1];
      expect(url).toBeTruthy();
      // Root-absolute in source; Vite rewrites it with the configured base.
      expect(url!.startsWith("/")).toBe(true);

      const onDisk = resolve(root, "public", url!.replace(/^\//, ""));
      expect(
        existsSync(onDisk),
        `favicon ${url} has no file behind it (this was a live 404)`
      ).toBe(true);
    });
  });

  describe("Open Graph", () => {
    it("carries the tags a share card is built from", () => {
      expect(meta("og:type")).toBe("website");
      expect(meta("og:title")).toBeTruthy();
      expect(meta("og:description")).toBeTruthy();
      expect(meta("og:site_name")).toBeTruthy();
      expect(meta("og:image:alt")).toBeTruthy();
    });

    it("uses ABSOLUTE urls — crawlers do not resolve relative ones", () => {
      for (const key of ["og:url", "og:image"]) {
        const value = meta(key);
        expect(value, `${key} missing`).toBeTruthy();
        expect(value!, `${key} must be absolute`).toMatch(/^https:\/\//);
      }
    });

    it("declares the image dimensions it actually has", () => {
      expect(meta("og:image:width")).toBe("1200");
      expect(meta("og:image:height")).toBe("630");
    });

    it("ships the image the tags point at", () => {
      const url = meta("og:image")!;
      const file = url.split("/").pop()!;
      expect(existsSync(resolve(root, "public", file))).toBe(true);
    });
  });

  describe("Twitter card", () => {
    it("declares a large-image card with its own title and image", () => {
      expect(meta("twitter:card")).toBe("summary_large_image");
      expect(meta("twitter:title")).toBeTruthy();
      expect(meta("twitter:image")).toMatch(/^https:\/\//);
    });
  });

  describe("basics that were already right (controls)", () => {
    it("keeps lang, viewport, description, title and a canonical", () => {
      expect(html).toMatch(/<html[^>]*lang=["']en["']/i);
      expect(meta("viewport")).toContain("width=device-width");
      expect(meta("description")).toBeTruthy();
      expect(html).toMatch(/<title>[^<]+<\/title>/i);
      expect(html).toMatch(
        /<link[^>]*rel=["']canonical["'][^>]*href=["']https:\/\//i
      );
    });

    it("points canonical and og:url at the same page", () => {
      const canonical = html
        .match(/<link[^>]*rel=["']canonical["'][^>]*>/i)?.[0]
        ?.match(/href=["']([^"']+)["']/i)?.[1];
      expect(canonical).toBe(meta("og:url"));
    });
  });
});
