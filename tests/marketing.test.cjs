const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const read = (file) => fs.readFileSync(path.join(dist, file), 'utf8');

test('build includes every page and local design asset', () => {
  for (const file of ['index.html', 'about.html', 'install.html', 'offline.html', 'privacy.html', 'terms.html', 'styles.css', 'editorial.css', 'marketing.js', 'motion.js', 'motion.css', 'install.js', 'laser-scene.js', 'laser-scene.css', 'config.js', 'brand.svg', 'favicon.svg', 'icons.svg', 'screens/projects.webp', 'icons/cloud-192.png', 'icons/cloud-512.png', 'fonts/cairo-arabic.woff2', 'fonts/cairo-latin.woff2']) {
    assert.ok(fs.existsSync(path.join(dist, file)), 'Missing dist/' + file);
  }
});

test('landing page retains Arabic/English switching and responsive layouts', () => {
  const html = read('index.html');
  const js = read('marketing.js');
  const css = html + read('styles.css');
  assert.match(html, /<html lang="ar" dir="rtl"/);
  assert.match(html, /<h1\b/);
  assert.match(js, /document\.documentElement\.dir/);
  assert.match(js, /T=\{ar:/);
  for (const breakpoint of ['max-width:480px', 'min-width:720px', 'min-width:1024px']) {
    assert.ok(css.includes(breakpoint), 'Missing responsive breakpoint ' + breakpoint);
  }
});

test('configured API origin drives registration, pricing, and installer requests', () => {
  const html = read('index.html');
  const installHtml = read('install.html');
  const js = read('marketing.js');
  const install = read('install.js');
  const config = read('config.js');
  assert.match(html, /https?:\/\/[^" ]+\/register/);
  assert.ok(html.indexOf('/config.js') < html.indexOf('/marketing.js'));
  assert.match(html, /\/marketing\.js\?v=[a-z0-9-]+/i);
  assert.ok(installHtml.indexOf('/config.js') < installHtml.indexOf('/install.js'));
  assert.match(js, /window\.__ENGINEX_API_URL__/);
  assert.match(js, /\/api\/admin\/plans/);
  assert.match(install, /window\.__ENGINEX_API_URL__/);
  assert.match(install, /\/api\/desktop-release/);
  assert.match(config, /window\.__ENGINEX_API_URL__\s*=\s*"https?:\/\//);
});

test('pricing and product proof contain no fabricated marketing data', () => {
  const html = read('index.html');
  const js = read('marketing.js');
  assert.ok(!html.includes('data-period='), 'Obsolete billing toggle remains in the page');
  assert.ok(!html.includes('remove-admin-pricing.js'), 'Legacy pricing-copy override remains active');
  assert.ok(!js.includes('أضف اسم العميل'), 'Customer testimonial placeholder remains');
  assert.match(js, /دليل المنتج قبل الشراء/);
  assert.match(js, /Number\(x\.annualPrice\)>0&&Number\(x\.biennialPrice\)>0/);
});

test('English URL is a static English page with its own canonical and shared hreflang', () => {
  const ar = read('index.html');
  const en = read('en/index.html');
  assert.match(en, /<html lang="en" dir="ltr"/);
  assert.match(en, /<link rel="canonical" href="https:\/\/enginex2030\.com\/en\/">/);
  assert.match(en, /<meta property="og:locale" content="en_US">/);
  const heading = (en.match(/data-i="heroH"[^>]*>(.*?)<\/h1>/) || [])[1]?.replace(/<[^>]+>/g, '') || '';
  assert.match(heading, /^Know every project’s real margin/);
  assert.ok(!/[؀-ۿ]/.test(heading), 'English hero heading still contains Arabic');
  assert.match(ar, /<link rel="canonical" href="https:\/\/enginex2030\.com\/">/);
  for (const page of [ar, en]) {
    assert.ok(page.includes('<link rel="alternate" hreflang="ar" href="https://enginex2030.com/">'));
    assert.ok(page.includes('<link rel="alternate" hreflang="en" href="https://enginex2030.com/en/">'));
    assert.ok(page.includes('<link rel="alternate" hreflang="x-default" href="https://enginex2030.com/">'));
  }
});

test('page language follows the URL path, not the browser or saved preference', () => {
  const js = read('marketing.js') + read('seo.js');
  assert.ok(!js.includes('navigator.language'), 'Browser language still selects the page language');
  assert.ok(!js.includes('ex-lang'), 'Saved language still overrides the URL');
  assert.ok(!js.includes('history.replaceState'), 'Language is still written into the URL');
});

test('public pages publish no personal bank or payment account details', () => {
  const allText = ['index.html', 'en/index.html', 'about.html', 'install.html', 'privacy.html', 'terms.html', 'marketing.js'].map(read).join('\n');
  for (const marker of ['IBAN', 'Account number', 'رقم الحساب', 'ipn.eg', 'InstaPay', 'التحويل البنكي']) {
    assert.ok(!allText.includes(marker), 'Payment account detail remains: ' + marker);
  }
  assert.ok(!read('../.deploy/default.conf').includes('ipn.eg'), 'CSP still allows the InstaPay image host');
});

test('build output has no unresolved config markers or base64 images', () => {
  const allText = ['index.html', 'about.html', 'install.html', 'offline.html', 'privacy.html', 'terms.html', 'marketing.js', 'install.js', 'config.js'].map(read).join('\n');
  assert.ok(!allText.includes('__VITE_API_'), 'Unresolved API configuration token');
  assert.ok(!/data:image\/[^;]+;base64,/i.test(allText), 'Unexpected embedded base64 image');
});
