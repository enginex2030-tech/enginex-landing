import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { pages as englishPages, shared as englishShared } from './pages-en.mjs';

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

// marketing.js rewrites the title and description from T when the page loads, so
// the static head has to carry the same strings. Otherwise the correct copy only
// appears after JavaScript runs - and never for a crawler or a shared link card.
function applyHeadCopy(html, copy, language) {
  const replaceOnce = (value, pattern, replacement) => {
    if (!pattern.test(value)) throw new Error('Head copy: pattern not found ' + pattern);
    return value.replace(pattern, replacement);
  };
  const title = escapeHtml(copy.metaTitle);
  const description = escapeHtml(copy.metaDesc);
  let page = html;
  page = replaceOnce(page, /<title>[^<]*<\/title>/, `<title>${title}</title>`);
  page = replaceOnce(page, /(<meta name="description" content=")[^"]*"/, `$1${description}"`);
  page = replaceOnce(page, /(<meta property="og:title" content=")[^"]*"/, `$1${title}"`);
  page = replaceOnce(page, /(<meta property="og:description" content=")[^"]*"/, `$1${description}"`);
  page = replaceOnce(page, /(<meta name="twitter:title" content=")[^"]*"/, `$1${title}"`);
  if (language === 'en') page = replaceOnce(page, /<html lang="ar" dir="rtl"/, '<html lang="en" dir="ltr"');
  return page;
}

// Turns the Arabic index.html into a crawlable English page: language,
// direction, head metadata and every data-i text node are written statically.
function localizeEnglish(html, en) {
  const replaceOnce = (value, pattern, replacement) => {
    if (!pattern.test(value)) throw new Error('English page build: pattern not found ' + pattern);
    return value.replace(pattern, replacement);
  };
  let page = applyHeadCopy(html, en, 'en');
  page = replaceOnce(page, /(<link rel="canonical" href=")[^"]*"/, '$1https://enginex2030.com/en/"');
  page = replaceOnce(page, /(<meta property="og:locale" content=")ar_SA"/, '$1en_US"');
  page = replaceOnce(page, /(<meta property="og:locale:alternate" content=")en_US"/, '$1ar_SA"');
  page = replaceOnce(page, /(<meta property="og:url" content=")[^"]*"/, '$1https://enginex2030.com/en/"');
  page = localizeDataI(page, en, 'index.html');
  page = localizeAria(page, en, 'index.html');
  // The fact strip ships both languages and lets CSS pick one. On the English
  // page the Arabic copies are dead weight, so they are removed here.
  page = page.replace(/<b class="ar">[^<]*<\/b>/g, '');
  page = localizeLinks(page);
  return localizeLangLink(page, '/');
}

// Reads a top-level array literal (faq:[...]) out of marketing.js so the FAQ
// structured data is generated from the same copy the page shows. Hand-written
// JSON-LD drifted from the visible FAQ and left Arabic questions on /en/.
function readArrayLiteral(source, key) {
  const start = source.indexOf(key + ':[');
  if (start < 0) throw new Error('marketing.js has no ' + key + ' array');
  const open = source.indexOf('[', start);
  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'") { inString = true; quote = ch; continue; }
    if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) return JSON.parse(source.slice(open, i + 1).replace(/'/g, '"'));
    }
  }
  throw new Error('marketing.js has an unterminated ' + key + ' array');
}

// The FAQPage node is rewritten in the page's own language, from that array.
function replaceFaqJsonLd(html, faq, language) {
  const index = language === 'en' ? 1 : 0;
  return html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/, (whole, open, body, close) => {
    let data;
    try { data = JSON.parse(body); } catch { return whole; }
    const nodes = data['@graph'] || [data];
    const node = nodes.find((item) => item && item['@type'] === 'FAQPage');
    if (!node) return whole;
    node.mainEntity = faq.map((item) => ({
      '@type': 'Question',
      name: item[index],
      acceptedAnswer: { '@type': 'Answer', text: item[index + 2] },
    }));
    return open + JSON.stringify(data) + close;
  });
}

// Every text node that carries a data-i key is written in the target language.
// A key without copy is a build failure: a half-translated page must never ship.
function localizeDataI(html, table, file, strict = true) {
  return html.replace(/(<([a-z0-9]+)\b[^>]*\bdata-i="([^"]+)"[^>]*>)[^<]*(<\/\2>)/g, (whole, open, tag, key, close) => {
    if (!(key in table)) {
      if (!strict) return whole;
      throw new Error(file + ': missing English copy for data-i="' + key + '"');
    }
    return open + escapeHtml(table[key]) + close;
  });
}

// aria-label carries visible copy for screen readers, so it is translated too.
function localizeAria(html, table, file) {
  return html.replace(/<[a-z0-9]+\b[^>]*\bdata-i-aria="([^"]+)"[^>]*>/g, (tag, key) => {
    if (!(key in table)) throw new Error(file + ': missing English copy for data-i-aria="' + key + '"');
    return tag.replace(/aria-label="[^"]*"/, 'aria-label="' + escapeHtml(table[key]) + '"');
  });
}

// The same page, in the other language. Every internal link is rewritten so a
// visitor who chose English never lands on an Arabic page from the English one.
const englishPaths = new Map([
  ['/', '/en/'],
  ['/index.html', '/en/'],
  ['/about.html', '/en/about.html'],
  ['/install.html', '/en/install.html'],
  ['/privacy.html', '/en/privacy.html'],
  ['/terms.html', '/en/terms.html'],
  ['/404.html', '/en/404.html'],
  ['/offline.html', '/en/offline.html'],
]);

function localizeLinks(html) {
  return html.replace(/href="([^"]+)"/g, (whole, href) => {
    if (href.startsWith('/en/')) return whole;
    const hashAt = href.indexOf('#');
    const pathPart = hashAt >= 0 ? href.slice(0, hashAt) : href;
    const hash = hashAt >= 0 ? href.slice(hashAt) : '';
    if (!englishPaths.has(pathPart)) return whole;
    return 'href="' + englishPaths.get(pathPart) + hash + '"';
  });
}

// The language switch is a plain link to the twin of the current page, so the
// choice made on the landing page carries through the whole site.
function localizeLangLink(html, arabicPath) {
  return html.replace(/(<a\b[^>]*\bdata-lang-link\b[^>]*>)([^<]*)(<\/a>)/g, (whole, open, text, close) => {
    const next = open.replace(/href="[^"]*"/, 'href="' + arabicPath + '"').replace(/hreflang="[^"]*"/, 'hreflang="ar"');
    return next + 'AR' + close;
  });
}

// Head metadata for a page that is generated in both languages from one source.
function applyPageHead(html, entry, url) {
  // open + old value + close: the closing tag must survive, or the whole head
  // ends up rendered as body text.
  const set = (page, pattern, value) => {
    if (!pattern.test(page)) throw new Error('Page head: pattern not found ' + pattern);
    return page.replace(pattern, (whole, open, old, close) => open + escapeHtml(value) + close);
  };
  let page = html;
  page = set(page, /(<title>)([^<]*)(<\/title>)/, entry.title);
  page = set(page, /(<meta name="description" content=")([^"]*)(")/, entry.description);
  page = set(page, /(<meta property="og:title" content=")([^"]*)(")/, entry.ogTitle || entry.title);
  page = set(page, /(<meta property="og:description" content=")([^"]*)(")/, entry.ogDescription || entry.description);
  page = page.replace(/(<meta name="twitter:title" content=")[^"]*"/, '$1' + escapeHtml(entry.title) + '"');
  page = set(page, /(<meta property="og:url" content=")([^"]*)(")/, url);
  page = set(page, /(<link rel="canonical" href=")([^"]*)(")/, url);
  page = page.replace(/(<meta property="og:locale" content=")ar_SA"/, '$1en_US"');
  page = page.replace(/(<meta property="og:locale:alternate" content=")en_US"/, '$1ar_SA"');
  page = page.replace(/<html lang="ar" dir="rtl"/, '<html lang="en" dir="ltr"');
  if (entry.jsonLd) page = page.replace(/(<script type="application\/ld\+json">)[\s\S]*?(<\/script>)/, (whole, open, close) => open + entry.jsonLd + close);
  return page;
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

// A Content-Security-Policy hash is the digest of one exact inline block. A hash
// that no longer matches does not degrade gracefully: the browser drops the whole
// <style> block and the page loses its layout and its Arabic font. So the policy
// is generated from the pages that were just written, for both languages, instead
// of being pasted into the template by hand.
const inlineBlocks = (html) => {
  const styles = [];
  const scripts = [];
  for (const match of html.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi)) styles.push(match[1]);
  for (const match of html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi)) {
    // JSON-LD is data, never executed, so it needs no script hash.
    if (/type\s*=\s*["']application\/ld\+json["']/i.test(match[1])) continue;
    scripts.push(match[2]);
  }
  return { styles, scripts };
};

// A browser normalises CRLF and lone CR to LF before it hashes an inline block,
// so the digest has to be taken from the normalised text. Hashing the raw file
// bytes produces a hash the browser never computes - which is exactly how a
// stylesheet gets blocked while looking "correct" in the config.
const cspText = (text) => String(text).replace(/\r\n?/g, '\n');

const cspHash = (text) => `'sha256-${createHash('sha256').update(cspText(text), 'utf8').digest('base64')}'`;

async function collectInlineHashes() {
  const files = await htmlFiles(distDir);
  const pages = await Promise.all(files.map(async (file) => inlineBlocks(await readFile(file, 'utf8'))));
  const styles = [...new Set(pages.flatMap((page) => page.styles.map(cspHash)))];
  const scripts = [...new Set(pages.flatMap((page) => page.scripts.map(cspHash)))];
  // Styles now live in base.css, so a page with an inline <style> but no extracted
  // hash would mean the extractor stopped matching and the policy would block it.
  if (pages.some((page) => page.styles.length) && !styles.length) {
    throw new Error('CSP build: inline <style> blocks were found but no hash was produced.');
  }
  return { styles: styles.join(' '), scripts: scripts.join(' ') };
}

// Every built page is covered by the policy, not only the landing page: a new
// page with an inline script must not silently fall outside the hash list.
async function htmlFiles(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...(await htmlFiles(file)));
    else if (entry.isFile() && entry.name.endsWith('.html')) found.push(file);
  }
  return found;
}

// A head rewrite that loses a closing tag turns the whole head into visible
// body text. That shipped once; it must fail the build instead.
function assertHeadIntact(html, file) {
  const head = html.slice(0, html.indexOf('</head>') + 7);
  if (!head.endsWith('</head>')) throw new Error(file + ': the English page has no closed head.');
  for (const tag of ['title', 'style', 'script']) {
    const open = (head.match(new RegExp('<' + tag + '[ >]', 'g')) || []).length;
    const close = (head.match(new RegExp('</' + tag + '>', 'g')) || []).length;
    if (open !== close) throw new Error(file + ': unbalanced <' + tag + '> in the English head.');
  }
  if (/<\/head>[\s\S]*<title>/.test(html)) throw new Error(file + ': a title leaked into the body.');
}

async function writeNginxConfig(apiBase) {
  const hashes = await collectInlineHashes();
  const template = await readFile(path.join(root, 'nginx.conf.template'), 'utf8');
  for (const token of ['__VITE_API_BASE_URL__', '__CSP_SCRIPT_HASHES__', '__CSP_STYLE_HASHES__']) {
    if (!template.includes(token)) throw new Error('nginx.conf.template is missing ' + token + '.');
  }
  const config = template
    .replaceAll('__CSP_SCRIPT_HASHES__', hashes.scripts)
    .replaceAll('__CSP_STYLE_HASHES__', hashes.styles)
    .replaceAll('__VITE_API_BASE_URL__', apiBase);
  if (/__[A-Z][A-Z0-9_]*__/.test(config)) throw new Error('nginx.conf.template has an unreplaced token.');
  await writeFile(path.join(deployDir, 'default.conf'), config);
  console.log('CSP hashes: ' + hashes.styles + ' ' + hashes.scripts);
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
const arabicIndex = applyHeadCopy(await readFile(path.join(sourceDir, 'index.html'), 'utf8'), translations.ar, 'ar');
const marketingSource = await readFile(path.join(sourceDir, 'marketing.js'), 'utf8');
const faq = readArrayLiteral(marketingSource, 'faq');
const plansPayload = await fetchPlans(apiBase);
const renderedAr = await renderSections(marketingSource, 'ar', plansPayload);
const renderedEn = await renderSections(marketingSource, 'en', plansPayload);
await writeFile(path.join(distDir, 'en', 'index.html'), splitWords(prerenderSections(replaceFaqJsonLd(localizeEnglish(arabicIndex, translations.en), faq, 'en'), renderedEn)));
await writeFile(path.join(distDir, 'index.html'), splitWords(prerenderSections(replaceFaqJsonLd(localizeDataI(arabicIndex, translations.ar, 'index.html', false), faq, 'ar'), renderedAr)));
// Every other page exists in both languages from the same Arabic source. The
// English twin keeps the same layout and links only to English pages.
const englishTable = { ...translations.en, ...englishShared };
for (const [file, entry] of Object.entries(englishPages)) {
  const source = await readFile(path.join(sourceDir, file), 'utf8');
  const table = { ...englishTable, ...entry.items };
  let page = applyPageHead(source, entry, 'https://enginex2030.com/en/' + file);
  page = localizeDataI(page, table, file);
  page = localizeAria(page, table, file);
  page = localizeLinks(page);
  page = localizeLangLink(page, '/' + file);
  assertHeadIntact(page, file);
  await writeFile(path.join(distDir, 'en', file), page);
}
await copyContents(publicDir, distDir);
// Keep existing public asset URLs usable by saved links and installer pages.
await copyContents(path.join(root, 'assets'), path.join(distDir, 'assets'));
await replaceTokens(distDir, apiBase, apiHost);
await writeNginxConfig(apiBase);
console.log('Built dist/ with VITE_API_BASE_URL=' + apiBase);
