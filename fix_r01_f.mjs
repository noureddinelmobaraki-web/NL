import fs from 'fs';
let file = 'eslint.config.js';
let content = fs.readFileSync(file, 'utf8');

const target = `'no-console': ['warn', { allow: ['warn', 'error'] }],`;
const replacement = `'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-restricted-syntax': ['warn', {
        selector: "CallExpression[callee.object.name='useMusicStore'][callee.property.name='getState']",
        message: 'R01: استعمل useMusicStore((s) => s.tracks) بدل getState() داخل المكوّنات.',
      }],`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
