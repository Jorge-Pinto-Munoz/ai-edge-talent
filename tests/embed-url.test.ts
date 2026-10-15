import { describe, expect, it } from "vitest";
import { embedUrl } from "@/lib/journey/rules";

describe("enlaces de video embebibles", () => {
  it.each([
    ["https://www.youtube.com/watch?v=abc123", "https://www.youtube-nocookie.com/embed/abc123"],
    ["https://youtu.be/abc123", "https://www.youtube-nocookie.com/embed/abc123"],
    ["https://youtube.com/shorts/abc123", "https://www.youtube-nocookie.com/embed/abc123"],
    ["https://vimeo.com/123456", "https://player.vimeo.com/video/123456"],
    ["https://vimeo.com/123456/a1b2c3", "https://player.vimeo.com/video/123456?h=a1b2c3"],
    ["https://www.loom.com/share/f00ba5", "https://www.loom.com/embed/f00ba5"],
    ["https://drive.google.com/file/d/XyZ-1/view?usp=sharing", "https://drive.google.com/file/d/XyZ-1/preview"],
  ])("%s", (url, src) => expect(embedUrl(url).src).toBe(src));
});
