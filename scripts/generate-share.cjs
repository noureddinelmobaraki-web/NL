const fs = require('fs');
const path = require('path');

const domain = "https://noureddinelmobaraki-web.github.io/NL";

const songs = [
  { id: 1,  title: "TRI9 TBAWE9",           image: "01. TRI9 TBA... - Background.webp" },
  { id: 2,  title: "VETO",                   image: "02. VETO - Background.webp" },
  { id: 3,  title: "TOTAL",                  image: "03. TOTAL - Background.webp" },
  { id: 4,  title: "7CHAYCHI DIMO9RATI",     image: "04. 7CHAYCH... - Background.webp" },
  { id: 5,  title: "A Lot",                  image: "05. A Lot - Background.webp" },
  { id: 6,  title: "BEAUTIFUL",              image: "06. BEAUTIFUL - Background.webp" },
  { id: 7,  title: "Bouh",                   image: "07. Bouh - Background.webp" },
  { id: 8,  title: "Brain Damage",           image: "08. Brain Da... - Background.webp" },
  { id: 9,  title: "Deal With The Devil",    image: "09. Deal With... - Background.webp" },
  { id: 10, title: "Dokhana V2",             image: "10. Dokhana V2 - Background.webp" },
  { id: 11, title: "GOUROU",                 image: "11. GOUROU - Background.webp" },
  { id: 12, title: "ITCHY W SCRATCHY",       image: "12. ITCHY W SCRATCHY - Background.webp" },
  { id: 13, title: "KOUN NADI",              image: "13. KOUN NADI - Background.webp" },
  { id: 14, title: "L'AI Could Never",       image: "14. L'AI Could... - Background.webp" },
  { id: 15, title: "L'bayda Mon Amour",      image: "15. L'bayda M... - Background.webp" },
  { id: 16, title: "Let The Rhythm Hit 'em", image: "16. Let The R... - Background.webp" },
  { id: 17, title: "LMORPHINIYA 31",         image: "17. LMORPHINIYA 31 - Background.webp" },
  { id: 18, title: "LMORPHINIYA 33",         image: "18. LMORPHINIYA 33 - Background.webp" },
  { id: 19, title: "LMORPHINIYA 1013",       image: "19. LMORPHI... - Background.webp" },
  { id: 20, title: "Lmorphinya 19 V2",       image: "20. Lmorphinya 19 V2 - Background.webp" },
  { id: 21, title: "MAGNETO",                image: "21. MAGNETO - Background.webp" },
  { id: 22, title: "None Shall Pass",        image: "22. None Sha... - Background.webp" },
  { id: 23, title: "Ohio",                   image: "23. Ohio - Background.webp" },
  { id: 24, title: "Ostora",                 image: "24. Ostora - Background.webp" },
  { id: 25, title: "Tromso",                 image: "25. Tromso - Background.webp" },
];

const shareDir = path.join(process.cwd(), 'public', 'share');
if (!fs.existsSync(shareDir)) {
  fs.mkdirSync(shareDir, { recursive: true });
}

songs.forEach(song => {
  // Construct raw github image URL for reliable OG tags on static pages
  const imageUrl = `https://raw.githubusercontent.com/noureddinelmobaraki/nradio/main/src/assets/images/songs/${encodeURIComponent(song.image)}`;
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${song.title} | NL — Noureddin El Mobaraki</title>
    
    <!-- Open Graph / Meta Tags -->
    <meta property="og:type" content="music.song">
    <meta property="og:url" content="${domain}/?s=${song.id}">
    <meta property="og:title" content="${song.title} | NL — Noureddin El Mobaraki">
    <meta property="og:description" content="Listen to ${song.title} by NL (Noureddin El Mobaraki) — Independent Rap from Casablanca.">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:site_name" content="NL — Noureddin El Mobaraki">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${song.title} | NL — Noureddin El Mobaraki">
    <meta name="twitter:description" content="Listen to ${song.title} by NL (Noureddin El Mobaraki) — Independent Rap from Casablanca.">
    <meta name="twitter:image" content="${imageUrl}">

    <script>
        // Redirect human users to the main app with the song parameter
        window.location.href = "../../?s=${song.id}";
    </script>
    <style>
        body { background: #050505; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: sans-serif; text-align: center; }
        .loader { border: 2px solid rgba(255,255,255,0.1); border-top: 2px solid #6366f1; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; margin-bottom: 20px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        a { color: #6366f1; text-decoration: none; }
    </style>
</head>
<body>
    <div style="display: flex; flex-direction: column; align-items: center;">
        <div class="loader"></div>
        <p>Opening <b>${song.title}</b> in NL...</p>
        <p style="font-size: 12px; opacity: 0.5;">If not redirected, <a href="../../?s=${song.id}">click here</a>.</p>
    </div>
</body>
</html>`;

  fs.writeFileSync(path.join(shareDir, `song-${song.id.toString().padStart(2, '0')}.html`), html);
  // Also create one without pading if requested (user said song-01.html in example)
  fs.writeFileSync(path.join(shareDir, `song-${song.id}.html`), html);
});

console.log("Successfully generated 25 share pages in /public/share/");
