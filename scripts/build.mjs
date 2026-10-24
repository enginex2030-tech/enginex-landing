import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(root, 'src');
const publicDir = path.join(root, 'public');
const distDir = path.join(root, 'dist');
const deployDir = path.join(root, '.deploy');
const defaultApiBase = 'https://app.enginex2030.com';

async function readDotEnv(file) {
  try {
    const content = await readFile(file, 'utf8');
    const values = {};
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator < 0) continue;
      const key = trimmed.slice(0, separator).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
      let value = trimmed.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      values[key] = value;
    }
    return values;
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
}

function normalizeApiBase(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('VITE_API_BASE_URL must be a valid http or https origin.');
  }
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('VITE_API_BASE_URL must use http or https.');
  if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('VITE_API_BASE_URL must be an origin only, such as https://app.example.com.');
  }
  return parsed.origin;
}

async function copyContents(source, destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) await copyContents(from, to);
    else if (entry.isFile()) await cp(from, to);
  }
}

const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Reads the T translation table from marketing.js so the static English page
// uses exactly the copy the browser would switch to.
async function readTranslations() {
  const source = await readFile(path.join(sourceDir, 'marketing.js'), 'utf8');
  const match = source.match(/T=(\{ar:\{.*?\},en:\{.*?\}\});const D=/s);
  if (!match) throw new Error('marketing.js translation table T was not found.');
  return new Function('return ' + match[1])();
}

// Turns the Arabic index.html into a crawlable English page: language,
// direction, head metadata and every data-i text node are written statically.
function localizeEnglish(html, en) {
  const replaceOnce = (value, pattern, replacement) => {
    if (!pattern.test(value)) throw new Error('English page build: pattern not found ' + pattern);
    return value.replace(pattern, replacement);
  };
  let page = html;
  page = replaceOnce(page, /<html lang="ar" dir="rtl"/, '<html lang="en" dir="ltr"');
  page = replaceOnce(page, /<title>[^<]*<\/title>/, `<title>${escapeHtml(en.metaTitle)}</title>`);
  page = replaceOnce(page, /(<meta name="description" content=")[^"]*"/, `$1${escapeHtml(en.metaDesc)}"`);
  page = replaceOnce(page, /(<link rel="canonical" href=")[^"]*"/, '$1https://enginex2030.com/en/"');
  page = replaceOnce(page, /(<meta property="og:locale" content=")ar_SA"/, '$1en_US"');
  page = replaceOnce(page, /(<meta property="og:locale:alternate" content=")en_US"/, '$1ar_SA"');
  page = replaceOnce(page, /(<meta property="og:title" content=")[^"]*"/, `$1${escapeHtml(en.metaTitle)}"`);
  page = replaceOnce(page, /(<meta property="og:url" content=")[^"]*"/, '$1https://enginex2030.com/en/"');
  page = replaceOnce(page, /(<button class="tool" id="lang"[^>]*>)EN</, '$1AR<');
  return page.replace(/(<([a-z0-9]+)\b[^>]*\bdata-i="([^"]+)"[^>]*>)[^<]*(<\/\2>)/g, (whole, open, tag, key, close) => {
    if (!(key in en)) throw new Error('English page build: missing translation for data-i="' + key + '"');
    return open + escapeHtml(en[key]) + close;
  });
}

// Pre-splits data-split headings into word spans so the hero word reveal starts on first paint.
// Words, never letters, so Arabic shaping is preserved; marketing.js keeps these spans when the text matches.
function splitWords(html) {
  return html.replace(/(<([a-z0-9]+)\b[^>]*\bdata-split\b[^>]*>)([^<]*)(<\/\2>)/g, (whole, open, tag, text, close) =>
    open + text.split(' ').map((word) => '<span class="w">' + word + '</span>').join(' ') + close);
}

// Containers that marketing.js fills in the browser. Their markup is also written
// into the HTML at build time so crawlers read it without running JavaScript.
const renderedContainers = ['painGrid', 'timeline', 'aiSteps', 'aiFields', 'groups', 'zatcaList', 'safeGrid', 'platforms', 'stories', 'faqs', 'tabs', 'shotTitle', 'shotText', 'points'];

// Fetches the published plans once per build. Pricing is optional: if the API
// cannot be reached the page keeps its loading skeleton and the browser fills it.
async function fetchPlans(apiBase) {
  try {
    const response = await fetch(apiBase + '/api/admin/plans', { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.json();
  } catch (error) {
    console.warn('Pricing not prerendered: ' + error.message);
    return null;
  }
}

// Runs marketing.js against a minimal DOM stand-in and returns the markup its
// own render functions produce, so the static HTML matches what the browser draws.
async function renderSections(source, language, plansPayload) {
  const element = () => ({ innerHTML: '', textContent: '', src: '', alt: '', dataset: {}, style: {}, children: [], classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, hasAttribute: () => false, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, focus() {} });
  const elements = Object.fromEntries([...renderedContainers, 'prices', 'shot', 'lang', 'theme', 'menu', 'mobile', 'year'].map((id) => [id, element()]));
  const observer = function () { return { observe() {}, unobserve() {}, disconnect() {} }; };
  const context = {
    ...elements,
    Intl, URL, Event: class { constructor(type) { this.type = type; } }, AbortController, setTimeout, clearTimeout,
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    IntersectionObserver: observer, ResizeObserver: observer,
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, performance: { now: () => 0 },
    location: { pathname: language === 'en' ? '/en/' : '/', hash: '' },
    document: { documentElement: {}, title: '', hidden: false, querySelectorAll: () => [], querySelector: () => ({}), getElementById: () => null, addEventListener() {}, dispatchEvent() {} },
    window: { devicePixelRatio: 1 },
    fetch: async () => (plansPayload ? { ok: true, json: async () => plansPayload } : { ok: false })
  };
  vm.runInNewContext(source, context);
  // Let the pricing request inside marketing.js settle before reading the markup.
  await new Promise((resolve) => setTimeout(resolve, 0));
  return elements;
}

function prerenderSections(html, rendered) {
  const fillEmpty = (page, id, markup) => {
    const pattern = new RegExp(`(<([a-z0-9]+)\\b[^>]*\\bid="${id}"[^>]*>)(</\\2>)`);
    if (!pattern.test(page)) throw new Error(`Prerender: empty container #${id} was not found in index.html.`);
    return page.replace(pattern, (whole, open, tag, close) => open + markup + close);
  };
  let page = html;
  for (const id of renderedContainers) {
    const markup = id === 'shotTitle' || id === 'shotText' ? escapeHtml(rendered[id].textContent) : rendered[id].innerHTML;
    if (!markup) throw new Error(`Prerender: marketing.js rendered nothing into #${id}.`);
    page = fillEmpty(page, id, markup);
  }
  page = page.replace(/(<img id="shot"[^>]*\balt=")[^"]*"/, `$1${escapeHtml(rendered.shot.alt)}"`);
  const prices = rendered.prices.innerHTML;
  if (prices && !prices.includes('price-error')) {
    const skeleton = /(<div class="prices" id="prices">)(?:<div class="pricecard"><div class="skel"><i><\/i><i><\/i><i><\/i><\/div><\/div>)+(<\/div>)/;
    if (!skeleton.test(page)) throw new Error('Prerender: pricing skeleton was not found in index.html.');
    page = page.replace(skeleton, (whole, open, close) => open + prices + close);
  }
  return page;
}

async function replaceTokens(directory, apiBase, apiHost) {
  const textExtensions = new Set(['.html', '.js', '.css', '.xml', '.txt', '.svg', '.webmanifest']);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await replaceTokens(file, apiBase, apiHost);
    } else if (textExtensions.has(path.extname(entry.name).toLowerCase())) {
      let value = await readFile(file, 'utf8');
      value = value
        .replaceAll('__VITE_API_BASE_URL_JSON__', JSON.stringify(apiBase))
        .replaceAll('__VITE_API_BASE_URL__', apiBase)
        .replaceAll('__VITE_API_HOST__', apiHost);
      await writeFile(file, value);
    }
  }
}

const fileEnv = await readDotEnv(path.join(root, '.env'));
const requestedApiBase = process.env.VITE_API_BASE_URL || fileEnv.VITE_API_BASE_URL || defaultApiBase;
const apiBase = normalizeApiBase(requestedApiBase.trim());
const apiHost = new URL(apiBase).host;
await rm(distDir, { recursive: true, force: true });
await rm(deployDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await mkdir(deployDir, { recursive: true });
await copyContents(sourceDir, distDir);
// Publish a stable English URL so Google can index it as a separate language version.
await mkdir(path.join(distDir, 'en'), { recursive: true });
const translations = await readTranslations();
const arabicIndex = await readFile(path.join(sourceDir, 'index.html'), 'utf8');
const marketingSource = await readFile(path.join(sourceDir, 'marketing.js'), 'utf8');
const plansPayload = await fetchPlans(apiBase);
const renderedAr = await renderSections(marketingSource, 'ar', plansPayload);
const renderedEn = await renderSections(marketingSource, 'en', plansPayload);
await writeFile(path.join(distDir, 'en', 'index.html'), splitWords(prerenderSections(localizeEnglish(arabicIndex, translations.en), renderedEn)));
await writeFile(path.join(distDir, 'index.html'), splitWords(prerenderSections(arabicIndex, renderedAr)));
await copyContents(publicDir, distDir);
// Keep existing public asset URLs usable by saved links and installer pages.
await copyContents(path.join(root, 'assets'), path.join(distDir, 'assets'));
await replaceTokens(distDir, apiBase, apiHost);
const nginxTemplate = await readFile(path.join(root, 'nginx.conf.template'), 'utf8');
if (!nginxTemplate.includes('__VITE_API_BASE_URL__')) throw new Error('nginx.conf.template is missing the API origin token.');
await writeFile(path.join(deployDir, 'default.conf'), nginxTemplate.replaceAll('__VITE_API_BASE_URL__', apiBase));
console.log('Built dist/ with VITE_API_BASE_URL=' + apiBase);
