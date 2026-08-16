import fs from 'fs';
let content = fs.readFileSync('src/main.tsx', 'utf-8');
content = content.replace("import App from './App.tsx';", "import App from './App.tsx';\nimport { LazyMotion, domAnimation } from 'framer-motion';");
content = content.replace("<App />", "<LazyMotion features={domAnimation} strict>\n          <App />\n        </LazyMotion>");
fs.writeFileSync('src/main.tsx', content);
