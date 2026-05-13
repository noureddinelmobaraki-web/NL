# NRADIO Deployment Guide (GitHub Pages)

Follow these steps to deploy the project to GitHub Pages reliably:

## 1. Domain Configuration
Ensure the `base` property in `vite.config.ts` matches your repository name.
Current configuration: `base: '/nradio/'` (This means the link will be `https://<user>.github.io/nradio/`).

## 2. Generate Share Pages
Run the automated script to generate the static share templates in the `public/` directory:
```bash
node scripts/generate-share.mjs
```
This script populates `public/share/` with 25 HTML files containing SEO Meta Tags for each song.

## 3. Build & Deploy
Execute the standard Vite build command:
```bash
npm run build
```
This will create a `dist/` folder containing the entire app, including the `share/` folder copied from `public/`.

## 4. Push to GitHub
Upload the contents of the `dist/` folder to your `gh-pages` branch or the root of your deployment repository.

### Key Features Integrated:
- **Favicon**: The profile image (`profile_img.webp`) is now linked as the site favicon and OG image.
- **Deep-Linking**: Sharing a song generates a link like `.../share/song-1.html`.
- **Bot Support**: Bots (WhatsApp, Twitter) see the Meta Tags for the specific song.
- **Auto-Redirect**: Human users are automatically redirected from the share page to the main app with the `?s=ID` parameter, which auto-scrolls to the song.
- **Mobile Share**: Native sharing is supported on iOS/Android browsers.
