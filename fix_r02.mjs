import fs from 'fs';
let file = 'src/main.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("import { LazyMotion, domAnimation } from 'framer-motion';", "import { LazyMotion, domMax } from 'framer-motion';");
content = content.replace("<LazyMotion features={domAnimation} strict>", "{/* domMax مطلوب وليس اختيارياً: domAnimation لا يحمل محرك التخطيط،\n        والمشروع يستعمل layoutId في 7 مواضع (SongCard، Lens، MeBit، Movies، AeroGallery).\n        قبل أي رجوع إلى domAnimation: grep -rn 'layoutId' src وتأكد أن الناتج صفر. */}\n        <LazyMotion features={domMax} strict>");

fs.writeFileSync(file, content);
console.log("Fixed main.tsx");
