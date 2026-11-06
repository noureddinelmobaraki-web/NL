# Implementation Plan — Books & Audiobooks Polish, Performance Engine & Ambient Video

This plan outlines the architecture, visual refinement, and technical implementation for the Books & Audiobooks stages in NL, ensuring high-performance rendering, zero visual clipping, immersive fullscreen reading, ambient relaxing background video playback, and brand-accurate orb titles.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were clarified and confirmed with the user:
> 1. **Ambient Video in Audiobooks**: Plays silently (`muted`) in the background with a 50% dark overlay veil. It includes a toggle button on the audiobook player to pause/resume the video backdrop (enabled by default).
> 2. **Fullscreen Reading Mode**: Activated via an expand/fullscreen button next to the Eye-Comfort icon in the reader toolbar. Exiting is achieved seamlessly via a floating close trigger when interacting with the top of the screen on Desktop or tapping the screen on Mobile.

---

## 1. Overview & Core Concept

### A. What It Does
- **Gradual Background Dimming (80%)**: When navigating into either the `Books` or `Audio Books` stage, the portal background smoothly and progressively dims by 80% over 4 seconds, establishing a cozy, low-distraction library atmosphere.
- **High-Performance Card Recycling & Staggered Reveal Engine**: Eliminates layout stutter, re-renders, and hover clipping by:
  - Decoupling hover scale triggers until clicked.
  - Staggering the entrance of book and audiobook cards (1 card every ~100–300ms, ~3 items/second) only after their cover and title are ready.
  - Using a single lightweight card template with unified glass tokens.
- **Streamlined Top Bar (Zero Overlap & Popover Z-Index Fix)**: Fixes menu collisions and clipping on language/genre/sort pills across Desktop and Mobile.
- **100% Fullscreen Book Reader**: Adds a dedicated fullscreen mode that hides all browser chrome, stage margins, and headers, giving an edge-to-edge reading canvas with a subtle hover/tap exit trigger.
- **Ambient YouTube Relaxing Backdrop for Audiobooks**: Plays a random 4K nature/space/ocean/desert video from the provided 268-video archive in the background while listening, muted with 50% opacity and an in-player control toggle.
- **Custom Transparent WebP Titles for Books & Audio Books Orbs**: Replaces the text labels under the 3D wireframe orbs with the provided transparent WebP images (`books-removebg-preview.webp` and `audio.books-removebg-preview.webp`), proportionally matching the `X` and `ALBUMS` titles.

---

## 2. Technical Architecture & System Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LiquidGlassPortalPage                           │
│  ┌─────────────────────────┐            ┌───────────────────────────┐  │
│  │    Base WebP Picture    │            │ 4-Second 80% Dim Overlay  │  │
│  │ (pc.webp / phone.webp)  │            │ (Books & Audiobooks only) │  │
│  └────────────┬────────────┘            └─────────────┬─────────────┘  │
│               │                                       │                │
│  ┌────────────▼───────────────────────────────────────▼─────────────┐  │
│  │                   Portal Orbs (4-Orb Mind-Map)                   │  │
│  │  [Books Orb]       [Earth X]       [Sun Albums]    [Audio Books] │  │
│  │  ↳ books.webp      ↳ X.webp        ↳ ALBUMS.webp   ↳ audio.webp  │  │
│  └────────────┬───────────────────────────────────────┬─────────────┘  │
└───────────────┼───────────────────────────────────────┼────────────────┘
                │ (mode: 'books')                       │ (mode: 'audiobooks')
                ▼                                       ▼
┌────────────────────────────────┐    ┌───────────────────────────────────┐
│           BooksStage           │    │          AudiobooksStage          │
│ ┌────────────────────────────┐ │    │ ┌───────────────────────────────┐ │
│ │ Streamlined Top Bar (Fixed)│ │    │ │  Ambient YouTube Video Canvas │ │
│ └──────────────┬─────────────┘ │    │ │  (268 Nature/Space/Sea URLs,  │ │
│ ┌──────────────▼─────────────┐ │    │ │   50% Veil, Muted, Toggle)    │ │
│ │ Staggered Poster Grid      │ │    │ └───────────────┬───────────────┘ │
│ │ (1 item / ~300ms, static   │ │    │ ┌───────────────▼───────────────┐ │
│ │  hover, instant render)    │ │    │ │ Staggered Audiobook Grid      │ │
│ └──────────────┬─────────────┘ │    │ └───────────────┬───────────────┘ │
│ ┌──────────────▼─────────────┐ │    │ ┌───────────────▼───────────────┐ │
│ │ Edge-to-Edge Fullscreen    │ │    │ │ SunAlbums Chapter Player      │ │
│ │ Reader + Eye-Comfort +     │ │    │ │ (Draggable, Chapter tubes,    │ │
│ │ Top-Edge Exit Trigger      │ │    │ │  Backdrop Video Toggle)       │ │
│ └────────────────────────────┘ │    └───────────────────────────────────┘
└────────────────────────────────┘
```

---

## 3. Detailed Implementation Steps

### Step 1: 4-Second 80% Background Dimming
- In `LiquidGlassPortalPage.tsx`, add an active dimming layer:
  - When `mode === 'books'` or `mode === 'audiobooks'`, transition an overlay from `opacity: 0` to `opacity: 0.8` with `transition: opacity 4s cubic-bezier(0.2, 0.8, 0.2, 1)`.
  - When switching back to `'orbs'`, `'video'`, or `'sun'`, the dimming fades out smoothly.

### Step 2: Custom Transparent WebP Titles for Books & Audio Books
- Update `LIQUID_GLASS_TITLE_IMAGES` in `LiquidGlassPortalPage.tsx`:
  - `booksImage: 'https://cdn.jsdelivr.net/gh/noureddinelmobaraki-web/nl-audio-cdn@main/books-removebg-preview.webp'`
  - `audiobooksImage: 'https://cdn.jsdelivr.net/gh/noureddinelmobaraki-web/nl-audio-cdn@main/audio.books-removebg-preview.webp'`
- Ensure both images use `.lg-orb-title-img` styling with identical aspect-ratio handling and proportional sizing matching `X.webp` and `ALBUMS.webp`.

### Step 3: Books & Audiobooks Grid Engine & Topbar Overlap Fix
- **Fix Top Bar Overlaps**:
  - Increase `z-index` of `.lg-branch-popover` to `100`, assign click-outside closing with auto-closing of sibling popovers.
  - Set `white-space: nowrap`, `overflow-x: auto`, and fix flex wrapping on mobile so buttons and popovers never clip or truncate.
- **Performance & Hover Decoupling**:
  - Remove intrusive hover scale animations (`transform: translateY(-5px)` and `scale(1.045)`) that trigger layout thrashing and accidental pop-in/pop-out.
  - Replace with high-performance CSS hardware acceleration (`will-change: opacity`, static transform) and subtle border highlight on hover.
- **Staggered Progressive Reveal (~3 items/second)**:
  - Implement a visible item counter or staggered CSS animation delay: each poster item appears smoothly with a progressive delay (`animation-delay: ${index * 120}ms`), appearing in a steady, elegant cascade only once metadata/cover is mounted.
  - Ensure searching and category filter changes reset the reveal cascade smoothly without UI jumps.

### Step 4: Fullscreen Reader Mode in `BooksStage`
- Expand `readerFullscreen` state:
  - When active, render `.lg-reader-workspace--pure-fullscreen` (fixed `inset: 0`, `z-index: 100`, `width: 100vw`, `height: 100vh`, `padding: 0`, background `#000000`).
  - The iframe expands to 100% of the screen.
  - Add an auto-hiding top floating capsule trigger:
    - On Desktop: Appears when hovering near the top 60px of the screen with "Exit Fullscreen" (`Minimize2`), "Eye Comfort" (`Eye`), and "Close" (`X`).
    - On Mobile: A subtle top floating chip that toggles visibility on screen tap.

### Step 5: Ambient Background YouTube Video for Audiobooks
- Create a curated dataset/utility `youtubeBackgrounds.ts` extracting the YouTube IDs from `youtube_nature_space_ocean_desert_backgrounds_847dbdde.md` (nature, space, sea, desert).
- In `AudiobooksStage.tsx`:
  - When an audiobook starts playing, select a random ambient video ID.
  - Embed a silent, looping YouTube player iframe (`autoplay=1&mute=1&controls=0&loop=1&playsinline=1&rel=0`) fixed in the background of `AudiobooksStage`.
  - Cover it with a 50% dark translucent glass veil (`background: rgba(0, 0, 0, 0.50)`).
  - Add a toggle button (`Video` / `VideoOff` icon) in the audiobook player controls to turn the background video on or off (on by default).

---

## 4. Verification & Testing Plan
- **Verification Commands**:
  - Run `compile_applet` to ensure 0 TypeScript compilation errors.
  - Run `lint_applet` to ensure 0 ESLint errors.
- **Interactive Verification**:
  - Test navigation into `Books` and verify background dims by 80% over 4 seconds.
  - Test topbar popovers (Language, Sort, Format) to ensure zero overlap and no clipping.
  - Test poster grid cascade reveal and verify no disappearing posters on hover.
  - Test Fullscreen button in reader and verify edge-to-edge reading with top hover/tap exit.
  - Test starting an audiobook and verify random background YouTube video plays muted with 50% dimming, and test the toggle button.
  - Test 4-Orb portal view and verify new `Books` and `Audio Books` WebP images render cleanly under their respective orbs.
