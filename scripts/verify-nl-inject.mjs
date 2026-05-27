import fs from 'fs';
import path from 'path';

const desktopJsPath = path.join(process.cwd(), 'public/win12/desktop.js');
const code = fs.readFileSync(desktopJsPath, 'utf8');

// Mock browser globals
const apps = {
  explorer: {
    path: {
      folder: {
        'C:': {
          folder: {
            '用户': {
              folder: {
                'Administrator': {
                  folder: {
                    '图片': {
                      folder: {}
                    }
                  }
                }
              }
            }
          }
        },
        'D:': {
          folder: {}
        }
      }
    }
  }
};

const window = {
  __nlPortfolioReady: false
};

const document = {
  getElementById: () => null,
  querySelectorAll: () => []
};

// We will extract and run everything inside the injectNLPortfolio block
const blockStart = code.indexOf('(function injectNLPortfolio()');
const blockEnd = code.indexOf('// ─── END OF PORTFOLIO DESIGN ───');

if (blockStart === -1 || blockEnd === -1) {
  console.error("Could not find the block");
  process.exit(1);
}

const blockCode = code.substring(blockStart, blockEnd);

// Run are code using eval under the mocks
const fnString = `(function() {
  const apps = ${JSON.stringify(apps)};
  const window = {};
  const document = {
    getElementById: () => null,
    querySelectorAll: () => []
  };
  const $ = () => ({
    removeClass: () => ({ addClass: () => {} }),
    addClass: () => {},
    on: () => {},
    html: () => {},
    append: () => {},
    css: () => {}
  });

  ${blockCode}
})()`;

try {
  eval(fnString);
  console.log("EVAL SUCCESSFUL! No syntax or basic runtime errors.");
} catch (err) {
  console.error("EVAL FAILED with error:", err);
}
