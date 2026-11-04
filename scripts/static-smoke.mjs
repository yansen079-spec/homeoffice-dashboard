import fs from 'node:fs';
import vm from 'node:vm';

const requiredFiles = [
  'index.html',
  'marketplace.html',
  'seller.html',
  'product.html',
  'store.html',
  'account.html'
];

const jsFiles = [
  'index.html.js',
  'marketplace.html.js',
  'seller.html.js',
  'market_v29_check.js'
];

let failed = false;

function fail(message) {
  failed = true;
  console.error('FAIL:', message);
}

function pass(message) {
  console.log('PASS:', message);
}

function warn(message) {
  console.warn('WARN:', message);
}

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) fail(`missing required page: ${file}`);
  else pass(`required page exists: ${file}`);
}

for (const file of jsFiles) {
  if (!fs.existsSync(file)) {
    warn(`optional JS file missing: ${file}`);
    continue;
  }
  const source = fs.readFileSync(file, 'utf8');
  try {
    new vm.Script(source, { filename: file });
    pass(`JavaScript parses: ${file}`);
  } catch (error) {
    fail(`JavaScript syntax error in ${file}: ${error.message}`);
  }
}

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');

  if (!/<meta\s+name=["']viewport["']/i.test(html)) {
    fail(`${file} is missing viewport meta`);
  }

  const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi)];
  inlineScripts.forEach((match, index) => {
    const attrs = match[1] || '';
    const code = match[2] || '';
    const type = attrs.match(/\btype=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (type && !['text/javascript', 'application/javascript', 'module'].includes(type)) return;
    if (type === 'module') {
      warn(`module script skipped for syntax parse: ${file}#${index + 1}`);
      return;
    }
    if (!code.trim()) return;
    try {
      new vm.Script(code, { filename: `${file}#inline-${index + 1}` });
    } catch (error) {
      fail(`inline JavaScript syntax error in ${file} script #${index + 1}: ${error.message}`);
    }
  });

  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map(m => m[1]);
  const seen = new Set();
  const duplicates = new Set();
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  if (duplicates.size) {
    warn(`${file} duplicate ids: ${[...duplicates].slice(0, 20).join(', ')}`);
  }
}

const allText = fs.readdirSync('.')
  .filter(name => /\.(html|js|txt|sql|md)$/i.test(name))
  .map(name => fs.readFileSync(name, 'utf8'))
  .join('\n');

const secretPatterns = [
  { name: 'Supabase service role key', regex: /\bservice_role\b\s*[:=]\s*["'][^"']+["']/i },
  { name: 'Midtrans server key literal', regex: /MIDTRANS_SERVER_KEY\s*[:=]\s*["'][^"']+["']/i },
  { name: 'Stripe live secret key', regex: /\bsk_live_[A-Za-z0-9]+/ }
];

for (const { name, regex } of secretPatterns) {
  if (regex.test(allText)) fail(`possible committed secret detected: ${name}`);
  else pass(`no ${name} found`);
}


const pwaFiles = ['manifest.webmanifest', 'sw.js'];
for (const file of pwaFiles) {
  if (!fs.existsSync(file)) fail(`missing PWA file: ${file}`);
  else pass(`PWA file exists: ${file}`);
}

if (fs.existsSync('manifest.webmanifest')) {
  try {
    const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
    if (!manifest.name || !manifest.start_url || !manifest.scope) {
      fail('PWA manifest missing name/start_url/scope');
    } else {
      pass('PWA manifest has required app metadata');
    }
    for (const icon of manifest.icons || []) {
      if (icon.src && !/^(https?:|data:)/i.test(icon.src)) {
        const iconPath = icon.src.replace(/^\.\//, '');
        if (!fs.existsSync(iconPath)) fail(`PWA icon missing: ${iconPath}`);
      }
    }
  } catch (error) {
    fail(`PWA manifest invalid JSON: ${error.message}`);
  }
}

if (fs.existsSync('sw.js')) {
  const sw = fs.readFileSync('sw.js', 'utf8');
  try {
    new vm.Script(sw, { filename: 'sw.js' });
    pass('Service worker JavaScript parses');
  } catch (error) {
    fail(`Service worker syntax error: ${error.message}`);
  }
  if (!sw.includes("addEventListener('fetch'") && !sw.includes('addEventListener("fetch"')) {
    warn('Service worker has no fetch handler');
  }
}

if (failed) {
  console.error('\nStatic smoke audit failed.');
  process.exit(1);
}

console.log('\nStatic smoke audit passed.');
