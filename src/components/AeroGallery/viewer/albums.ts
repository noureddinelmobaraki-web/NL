/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * Central album registry for the Aero gallery + unified image viewer.
 *
 * WHY THIS FILE EXISTS:
 *   Adding a new album (or new images to an album) should be a ONE-PLACE edit.
 *   The hub, the album switcher tabs and the fullscreen viewer all read from
 *   this registry, so you never have to touch component code to add content.
 *
 * TO ADD IMAGES to an existing album: add URLs to the matching array in
 *   src/constants/assets.ts (ASSETS.profile.me_bits / ASSETS.profile.lens).
 *
 * TO ADD A NEW ALBUM:
 *   1) add its images to ASSETS,
 *   2) add one entry to ALBUMS below (id, label, audioSource, accent),
 *   3) (optional) map its images in getAlbumImages().
 * Everything else — tabs, transitions, viewer, audio — keeps working.
 */

import { ASSETS } from "../../../constants/assets";

export type AlbumId = "mebit" | "lens";

/** Matches the audioManager sources used by the two galleries. */
export type AlbumAudioSource = "mebit" | "lens";

export interface AlbumConfig {
  id: AlbumId;
  /** Short label shown on the segmented album switcher. */
  label: string;
  /** audioManager source that plays this album's soundtrack. */
  audioSource: AlbumAudioSource;
  /** Accent used by the viewer glass frame + zoom knob for this album. */
  accent: string;
}

export const ALBUMS: Record<AlbumId, AlbumConfig> = {
  mebit: {
    id: "mebit",
    label: "ME bit",
    audioSource: "mebit",
    accent: "#3aa0ff",
  },
  lens: {
    id: "lens",
    label: "Lens",
    audioSource: "lens",
    accent: "#12b6a4",
  },
};

export const ALBUM_ORDER: AlbumId[] = ["mebit", "lens"];

/** Returns the ordered image URLs for an album. */
export function getAlbumImages(id: AlbumId): string[] {
  if (id === "lens") return [...ASSETS.profile.lens];
  return [...ASSETS.profile.me_bits];
}
