# Contributing to Noureddin El Mobaraki (NL) Web Portfolio

Thank you for your interest in contributing! This project is a modern, high-fidelity React portfolio and audio-visual application for artist Noureddin El Mobaraki (NL).

Please read through these guidelines to ensure a smooth contribution process.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** v20 or newer
- **npm** v10 or newer

### 2. Setup
Clone the repository and install all dependencies:
```bash
npm install
```

### 3. Development Server
Start the interactive developer mode on the local server container or port `3000`:
```bash
npm run dev
```

---

## 🛠️ Development & Quality Controls

We hold high quality standards. Before submitting a Pull Request, please ensure you run and pass the following quality check commands:

### Formatting & Syntax Validation
We use TypeScript and ESLint, which must yield zero warnings and zero errors.
```bash
npm run lint
```

### Static Type Safety Checks
Ensure that your changes do not violate the strictly configured TypeScript rule set:
```bash
npx tsc --noEmit
```

### Production Build Verification
Verify that the bundler succeeds in compiling the static application tree:
```bash
npm run build
```

---

## 🎨 Design Rules & Best Practices

1. **Keep it Human & Humble**: Never decorate screens with synthetic logs, port diagnostics, terminal noise, or synthetic network flags, as these introduce unsolicited visual clutter.
2. **Typography**: Always reference variables declared in `src/index.css`. Prefer **Inter** or dedicated theme-specific typography loaded securely.
3. **Icons**: Exclusively use `lucide-react` for graphics and visual signs. Custom SVG elements are not permitted inside React templates.
4. **i18n Multi-lingual Support**: All dynamic texts and UI strings must leverage the `useTranslation` hook from `react-i18next`, matching the structural translation keys in `src/i18n/locales/`.

---

## 📬 Submitting a Pull Request (PR)

1. **Fork & Branch**: Create an isolated topic branch from the latest state of `main`.
2. **Commit Messages**: Write meaningful, precise commit messages.
3. **Verify Compliance**: Make sure that `lint`, static typing, and production compilation build flawlessly locally.
4. **Draft the PR**: Ensure the Pull Request references the standard template and contains appropriate descriptive screenshots if there are UI updates.
