import fs from 'fs';
import path from 'path';

const domain = "https://noureddinelmobaraki.github.io/nradio";

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
  const imageUrl = `https://raw.githubusercontent.com/noureddinelmobaraki/nradio/main/src/assets/images/songs/${encodeURIComponent(song.image)}`;
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${song.title} | NRADIO</title>
    
    <meta property="og:type" content="music.song">
    <meta property="og:url" content="${domain}/?s=${song.id}">
    <meta property="og:title" content="${song.title} | Listen on NRADIO">
    <meta property="og:description" content="Click to listen to ${song.title} by NL on NRADIO.">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:site_name" content="NRADIO">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${song.title} | Listen on NRADIO">
    <meta name="twitter:description" content="Click to listen to ${song.title} by NL on NRADIO.">
    <meta name="twitter:image" content="${imageUrl}">

    <script>
        window.location.href = "../../?s=${song.id}";
    </script>
</head>
<body style="background: #050505; color: white;">
    <p>Opening <b>${song.title}</b> in NRADIO...</p>
</body>
</html>`;

  fs.writeFileSync(path.join(shareDir, `song-${song.id}.html`), html);
});

console.log("Generated share pages.");
