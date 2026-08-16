import fs from 'fs';
let text = fs.readFileSync('eslint.config.js', 'utf-8');
text = text.replace("'@typescript-eslint/no-explicit-any': 'warn',", "");
text = text.replace("...reactHooks.configs.recommended.rules,", "...reactHooks.configs.recommended.rules,\n      ...tseslint.configs.recommended[1].rules,\n      '@typescript-eslint/no-explicit-any': 'warn',");
text = text.replace("'react-hooks': reactHooks,", "'react-hooks': reactHooks,\n      '@typescript-eslint': tseslint.plugin,");
fs.writeFileSync('eslint.config.js', text);
