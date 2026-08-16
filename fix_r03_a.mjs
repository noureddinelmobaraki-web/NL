import fs from 'fs';
let file = 'src/components/Games/GamesPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `              <img className="nl-game-thumb" src={buildUrl(g.dir, g.poster)}
                alt="" loading="lazy" decoding="async" draggable={false} />`;

const replacement = `              <img className="nl-game-thumb" src={buildUrl(g.dir, g.poster)}
                width={320} height={180}
                alt="" loading="lazy" decoding="async" draggable={false} />`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log("Fixed GamesPage.tsx");
