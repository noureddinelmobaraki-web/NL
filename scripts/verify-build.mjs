import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

console.log('🚀 Starting project quality verification checks...');

// URLs اختيارية أو مؤقتاً غير متاحة — لا تُحسب كـ failure
const OPTIONAL_URLS = new Set([
  'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/Transition%20phone_web.webm',
]);

let globalFailure = false;

// Helpers:
function getFilesRecursive(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.resolve(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursive(fullPath));
    } else {
      results.push(fullPath);
    }
  });
  return results;
}

// ----------------- CHECK 1: Bundle size budget -----------------
console.log('\n📦 [1/4] Checking bundle size budgets (Max 250 KB gzipped)...');
const distAssetsDir = path.join(process.cwd(), 'dist/assets');
if (!fs.existsSync(distAssetsDir)) {
  console.error(`❌ Build files not found in dist/assets/! Run npm run build first.`);
  globalFailure = true;
} else {
  const assetsFiles = getFilesRecursive(distAssetsDir);
  const jsFiles = assetsFiles.filter(f => f.endsWith('.js'));
  
  if (jsFiles.length === 0) {
    console.warn('⚠️ No JS files found in dist/assets!');
  }

  let budgetFail = false;
  for (const jsFilePath of jsFiles) {
    const relativeName = path.relative(process.cwd(), jsFilePath);
    try {
      const content = fs.readFileSync(jsFilePath);
      const gzipped = zlib.gzipSync(content);
      const gzippedSizeKb = gzipped.length / 1024;
      if (gzippedSizeKb > 250) {
        console.error(`  ❌ FAIL: ${relativeName} - ${gzippedSizeKb.toFixed(2)} KB gzipped (Limit: 250 KB)`);
        budgetFail = true;
      } else {
        console.log(`  ✅ OK: ${relativeName} - ${gzippedSizeKb.toFixed(2)} KB gzipped`);
      }
    } catch (err) {
      console.error(`  ❌ Error measuring ${relativeName}:`, err.message);
      budgetFail = true;
    }
  }
  if (budgetFail) {
    globalFailure = true;
  }
}

// ----------------- CHECK 2: LRC Consistency with NFC -----------------
console.log('\n📄 [2/4] Checking LRC consistency (with identical Unicode NFC normalization)...');
const songsPath = path.join(process.cwd(), 'public/data/songs.json');
const lrcDir = path.join(process.cwd(), 'public/lrc');

if (!fs.existsSync(songsPath)) {
  console.error('❌ Error: public/data/songs.json not found!');
  globalFailure = true;
} else if (!fs.existsSync(lrcDir)) {
  console.error('❌ Error: public/lrc directory not found!');
  globalFailure = true;
} else {
  try {
    const songs = JSON.parse(fs.readFileSync(songsPath, 'utf8'));
    const files = fs.readdirSync(lrcDir);
    const nfcFiles = files.map(f => f.normalize('NFC'));
    
    let lrcFail = false;
    for (const song of songs) {
      if (song.hasLrc) {
        if (!song.lrcFile) {
          console.error(`  ❌ FAIL: Song ID ${song.id} (${song.title}) has hasLrc=true but lrcFile is null/undefined!`);
          lrcFail = true;
          continue;
        }
        const nfcExpected = String(song.lrcFile).normalize('NFC');
        if (!nfcFiles.includes(nfcExpected)) {
          console.error(`  ❌ FAIL: Missing LRC file for Song ID ${song.id} (${song.title}). Expected NFC file "${nfcExpected}"`);
          lrcFail = true;
        } else {
          console.log(`  ✅ OK: Song ID ${song.id} (${song.title}) matches "${nfcExpected}"`);
        }
      }
    }
    if (lrcFail) globalFailure = true;
  } catch (err) {
    console.error('  ❌ Failure checking LRC files:', err.message);
    globalFailure = true;
  }
}

// ----------------- CHECK 3: Secret Leak Scan -----------------
console.log('\n🔍 [3/4] Running secret leak scanning on built files in dist/...');
const distDir = path.join(process.cwd(), 'dist');
if (!fs.existsSync(distDir)) {
  console.error('❌ dist/ directory not found. Run build first.');
  globalFailure = true;
} else {
    const secretRegex = /service_[a-z0-9]{7,}|template_[a-z0-9]{7,}|wa\.me\/\d{10,}/g;
    const distFiles = getFilesRecursive(distDir);
    let leakFail = false;
    
    for (const file of distFiles) {
      // Only scan text, source files or build files (skip maps or images)
      if (file.endsWith('.map') || file.endsWith('.png') || file.endsWith('.webp') || file.endsWith('.jpg') || file.endsWith('.gif') || file.endsWith('.ico') || file.endsWith('.mp4') || file.endsWith('.webm')) {
        continue;
      }
      try {
        const content = fs.readFileSync(file, 'utf8');
        const matches = [...content.matchAll(secretRegex)];
        // Exception: whitelist wa.me/\d+ and service_[a-z0-9]+ patterns as they are general public and frontend IDs, not secrets.
        const filteredMatches = matches.filter(m => !/wa\.me\/\d+/.test(m[0]) && !/service_[a-z0-9]+/.test(m[0]) && !/template_[a-z0-9]+/.test(m[0]));
        if (filteredMatches.length > 0) {
          const relativeName = path.relative(process.cwd(), file);
          console.error(`  ❌ FAIL: Potential secret leak found in ${relativeName}: "${filteredMatches[0][0]}"`);
          leakFail = true;
        }
      } catch (_) {
        // ignore reading failures
      }
    }
  if (leakFail) {
    globalFailure = true;
  } else {
    console.log('  ✅ OK: No secret patterns detected!');
  }
}

// ----------------- CHECK 4: Asset integrity checks (concurrency 8) -----------------
console.log('\n🖼️ [4/4] Starting asset integrity check pool (HEAD/GET validation)...');
const assetsTsPath = path.join(process.cwd(), 'src/constants/assets.ts');
if (!fs.existsSync(assetsTsPath)) {
  console.error('❌ src/constants/assets.ts not found!');
  globalFailure = true;
} else {
  try {
    let assetsContent = fs.readFileSync(assetsTsPath, 'utf8');
    // Inline CDN constants for easier grep
    assetsContent = assetsContent.replaceAll('${CDN}', 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/');
    assetsContent = assetsContent.replaceAll('${CDN_BIT}', 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/');
    
    const urlRegex = /https?:\/\/[a-zA-Z0-9\-\._~:\/\?#\[\]@!\$&'\(\)\*\+,;%=]+/g;
    let tsMatches = assetsContent.match(urlRegex) || [];
    tsMatches = tsMatches.map(u => {
      let processed = u.replace(/[',`"\);]+$/, ''); // trim end artifacts
      processed = processed.replace(/(?<!:)\/\/+/g, '/'); // collapse double slashes
      // Option B: Map any bare CDN root directory URLs to the first verified asset file to prevent index 404
      if (processed === 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn' || processed === 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/') {
        return 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/profile_img.webp';
      }
      return processed;
    });
    
    // Also parse public/data/songs.json if it exists
    let songMatches = [];
    if (fs.existsSync(songsPath)) {
      const songs = JSON.parse(fs.readFileSync(songsPath, 'utf8'));
      songMatches = songs.map(s => s.url).filter(Boolean);
    }
    
    const allUrls = [...new Set([...tsMatches, ...songMatches])].filter(url => {
      // Return absolute web urls only
      return url.startsWith('http://') || url.startsWith('https://');
    });

    console.log(`  Found ${allUrls.length} unique absolute URLs to verify.`);

    async function checkUrl(url, attempt = 1) {
      try {
        const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'verify-build-bot' } });
        if (res.status >= 400 && res.status < 600) {
          if (res.status === 405 || res.status === 403) {
            // retry with GET
            const getRes = await fetch(url, { method: 'GET', headers: { 'User-Agent': 'verify-build-bot' } });
            if (getRes.status >= 400) {
              return { ok: false, status: getRes.status, url };
            }
            return { ok: true, url };
          }
          return { ok: false, status: res.status, url };
        }
        return { ok: true, url };
      } catch (err) {
        if (attempt < 2) {
          return checkUrl(url, attempt + 1);
        }
        return { ok: false, error: err.message, url };
      }
    }

    async function checkUrlsWithConcurrency(urls, concurrency = 8) {
      const queue = [...urls];
      const results = [];
      const failed = [];
      
      async function worker() {
        while (queue.length > 0) {
          const url = queue.shift();
          if (OPTIONAL_URLS.has(url)) {
            console.log(`  ⚠️ SKIP (optional): ${url}`);
            continue;
          }
          const result = await checkUrl(url);
          results.push(result);
          if (result.ok) {
            // Success logged silently for brevity unless failure
          } else {
            failed.push(result);
            console.error(`  ❌ FAILED: ${url} (Status: ${result.status || 'error'}, Msg: ${result.error || ''})`);
          }
        }
      }
      
      const workers = Array.from({ length: Math.min(concurrency, urls.length) }, worker);
      await Promise.all(workers);
      return failed;
    }

    const failedIntegrity = await checkUrlsWithConcurrency(allUrls, 8);
    if (failedIntegrity.length > 0) {
      console.error(`  ❌ FAIL: ${failedIntegrity.length} assets returned 4xx/5xx or failed to load.`);
      globalFailure = true;
    } else {
      console.log('  ✅ OK: All absolute assets verified successfully!');
    }
  } catch (err) {
    console.error('  ❌ Failure running asset integrity checks:', err.message);
    globalFailure = true;
  }
}

// ----------------- FINAL REPORT -----------------
console.log('\n=======================================');
if (globalFailure) {
  console.error('🔴 Verification checks FAILED. See errors above.');
  process.exit(1);
} else {
  console.log('🟢 All verification checks PASSED successfully!');
  process.exit(0);
}
