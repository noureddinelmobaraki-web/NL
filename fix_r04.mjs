import fs from 'fs';
let file = 'vite.config.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `sourcemap: 'hidden',`;
const replacement = `// لا توجد أداة تتبّع أخطاء تستهلك الخرائط، ولا خطوة ترفعها ثم تحذفها.
    // 'hidden' كان ينتج 7MB خرائط تُنشر للعموم على GitHub Pages.
    sourcemap: false,`;

if (content.includes(target)) {
    fs.writeFileSync(file, content.replace(target, replacement));
    console.log("Fixed vite.config.ts");
} else {
    console.log("vite.config.ts target not found");
}
