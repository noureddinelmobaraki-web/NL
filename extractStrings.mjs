import fs from 'fs';

const data = JSON.parse(fs.readFileSync('arabic_lines2.json', 'utf8'));
const regex = /[\u0600-\u06FF]+(?:[\s.,!?()\-—]+[\u0600-\u06FF]+)*/g;
const uniqueStrings = new Set();

data.forEach(d => {
    let cleanLine = d.text.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
    let match;
    while ((match = regex.exec(cleanLine)) !== null) {
        uniqueStrings.add(match[0].trim());
    }
});

fs.writeFileSync('unique_arabic.json', JSON.stringify(Array.from(uniqueStrings), null, 2));
console.log('Unique strings: ' + uniqueStrings.size);
