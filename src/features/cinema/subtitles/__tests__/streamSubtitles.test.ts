import { describe, expect, it } from "vitest";
import {
  autoRetimeCues,
  dedupeCues,
  hlsTracksToSubtitleTracks,
  mergeHlsVttPlaylist,
  stripVttHeader,
} from "../streamSubtitles";

describe("streamSubtitles", () => {
  it("strips WEBVTT header incl. X-TIMESTAMP-MAP", () => {
    const seg = "WEBVTT\nX-TIMESTAMP-MAP=MPEGTS:900000,LOCAL:00:00:00.000\n\n00:00:01.000 --> 00:00:02.000\nHi";
    expect(stripVttHeader(seg)).toBe("00:00:01.000 --> 00:00:02.000\nHi");
  });
  it("merges a media playlist", async () => {
    const pl = "#EXTM3U\n#EXTINF:6,\nhttps://w.dev/a.vtt\n#EXTINF:6,\nhttps://w.dev/b.vtt\n#EXT-X-ENDLIST";
    const files: Record<string, string> = {
      "https://w.dev/a.vtt": "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nA",
      "https://w.dev/b.vtt": "WEBVTT\n\n00:00:07.000 --> 00:00:08.000\nB",
    };
    const out = await mergeHlsVttPlaylist(pl, "https://w.dev/p.m3u8", async (u) => files[u]);
    expect(out.startsWith("WEBVTT")).toBe(true);
    expect(out).toContain("\nA");
    expect(out).toContain("\nB");
  });
  it("follows master → subtitle group", async () => {
    const master = '#EXTM3U\n#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="s",LANGUAGE="en",NAME="English",URI="https://w.dev/subs.m3u8"\n#EXT-X-STREAM-INF:BANDWIDTH=1\nv.m3u8';
    const files: Record<string, string> = {
      "https://w.dev/subs.m3u8": "#EXTM3U\n#EXTINF:6,\nhttps://w.dev/a.vtt",
      "https://w.dev/a.vtt": "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nA",
    };
    const out = await mergeHlsVttPlaylist(master, "https://w.dev/m.m3u8", async (u) => files[u]);
    expect(out).toContain("\nA");
  });
  it("dedupes overlapping segment cues", () => {
    const c = { start: 1, end: 2, text: "x" };
    expect(dedupeCues([c, { ...c }])).toHaveLength(1);
  });
  it("retimes PAL subtitles that overflow duration", () => {
    const dur = 6000;
    const cues = [{ start: 10, end: 12, text: "a" }, { start: 6200, end: 6230, text: "b" }];
    const r = autoRetimeCues(cues, dur);
    expect(r.factor).toBeCloseTo(23.976 / 25, 4);
    expect(r.cues[1].end).toBeLessThanOrEqual(dur * 1.01);
  });
  it("leaves fitting subtitles untouched", () => {
    const r = autoRetimeCues([{ start: 10, end: 5000, text: "a" }], 6000);
    expect(r.factor).toBe(1);
  });
  it("maps hls subtitleTracks to lazy stream tracks", () => {
    const t = hlsTracksToSubtitleTracks({ subtitleTracks: [{ url: "https://w.dev/s.m3u8", lang: "ara", name: "Arabic" }] });
    expect(t[0]).toMatchObject({ provider: "stream", lang: "ar", loaded: false, remoteUrl: "https://w.dev/s.m3u8" });
  });
});
