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
  // The acquisition tier is real: a free card is read from the plans API and
  // rendered ahead of the paid terms, and branch accounting is a listed module.
  assert.match(js, /S\.freePlan=list\.find/, 'the free plan must be read from the plans API');
  assert.match(js, /class="pricecard free"/, 'the free acquisition card must be rendered');
  // The card is conditional, so the page can never advertise a plan the API did
  // not publish, and the three-column grid only applies when the card exists.
  assert.match(js, /freeCard=free\?`/, 'the free card must only render when the API publishes a plan');
  assert.match(js, /classList\.toggle\("with-free",Boolean\(S\.freePlan\)\)/, 'the grid must follow the published plan count');
  assert.match(read('index.html'), /\.prices\.with-free\{max-width:1120px;grid-template-columns:repeat\(3,1fr\)\}/, 'desktop must show three cards in one row');
  assert.match(js, /الفروع والمحاسبة المركزية/, 'branch accounting must be listed as a module');
  assert.match(js, /محاسبة الفروع/, 'the hero and FAQ must state branch accounting');
});

test('English URL is a static English page with its own canonical and shared hreflang', () => {
  const ar = read('index.html');
  const en = read('en/index.html');
  assert.match(en, /<html lang="en" dir="ltr"/);
  assert.match(en, /<link rel="canonical" href="https:\/\/enginex2030\.com\/en\/">/);
  assert.match(en, /<meta property="og:locale" content="en_US">/);
  const heading = (en.match(/data-i="heroH"[^>]*>(.*?)<\/h1>/) || [])[1]?.replace(/<[^>]+>/g, '') || '';
  assert.match(heading, /^Run every branch, project, and margin/);
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

test('missing pages return a real 404 instead of the homepage', () => {
  const conf = read('../.deploy/default.conf');
  assert.match(conf, /location \/ \{\s*try_files \$uri \$uri\/ =404;/);
  assert.ok(!conf.includes('/index.html;\n  }\n}'), 'SPA fallback to index.html remains');
  assert.match(conf, /error_page 404 \/404\.html;/);
  const page = read('404.html');
  assert.match(page, /<meta name="robots" content="noindex">/);
  assert.ok(!read('offline.html').includes('href="/owner-login"'), 'Offline page links to a path that now 404s');
});

test('core homepage sections are in the initial HTML for both languages', () => {
  const ar = read('index.html');
  const en = read('en/index.html');
  for (const [page, words] of [[ar, ['سجل التدقيق', 'فاتورة ضريبية قابلة للتتبع', 'هل أحتاج بطاقة دفع للتجربة؟', 'المناقصة والتسعير']], [en, ['Audit trail', 'Traceable tax invoice', 'Do I need a payment card for the trial?', 'Tender & pricing']]]) {
    assert.match(page, /id="groups"><article class="group/);
    assert.match(page, /id="zatcaList"><div><b>QR/);
    assert.match(page, /id="faqs"><details open><summary>/);
    assert.match(page, /id="timeline"><li class="step/);
    for (const word of words) assert.ok(page.includes(word), 'Missing prerendered text: ' + word);
    assert.match(page, /id="prices"><(article class="pricecard|div class="pricecard"><div class="skel")/);
  }
  assert.ok(!/[؀-ۿ]/.test(en.match(/id="faqs">([\s\S]*?)<\/div><\/div><\/section>/)[1]), 'English FAQ contains Arabic');
});

test('hero artwork is a responsive AVIF/WebP image under 200 KB with immutable caching', () => {
  const html = read('index.html');
  assert.ok(!html.includes('future-architecture.png') && !read('architecture.css').includes('future-architecture-v2.png'), 'Hero still loads the PNG');
  assert.match(html, /<source type="image\/avif" srcset="[^"]+1024w[^"]+1600w[^"]+2039w"/);
  assert.match(html, /<img class="future-cover" src="\/media\/[^"]+\.webp" srcset="[^"]+2039w"/);
  for (const file of fs.readdirSync(path.join(dist, 'media'))) {
    assert.ok(fs.statSync(path.join(dist, 'media', file)).size < 200 * 1024, file + ' is 200 KB or larger');
  }
  assert.match(read('../.deploy/default.conf'), /~\^\/media\/ "public, max-age=31536000, immutable";/);
});

test('redirects stay on https in one hop and HSTS is sent', () => {
  const conf = read('../.deploy/default.conf');
  assert.match(conf, /absolute_redirect off;/);
  assert.match(conf, /add_header Strict-Transport-Security "max-age=31536000" always;/);
  assert.match(conf, /return 301 https:\/\/\$ex_canonical_host\$request_uri;/);
  assert.ok(!/location[^{]*\{[^}]*add_header/.test(conf), 'A location-level add_header would drop the security headers');
});

test('the ENGINEX wordmark replaces the old mark wherever the product is branded', () => {
  const pages = ['index.html', 'en/index.html', 'about.html', 'privacy.html', 'terms.html', '404.html', 'install.html', 'offline.html'];
  for (const page of pages) {
    const html = read(page);
    assert.ok(!html.includes('/brand.svg"'), page + ' still shows the old brand.svg mark');
    assert.match(html, /<img class="brand-logo" src="\/logo\/enginex-logo(-light)?-320\.png" srcset="[^"]+640\.png 2x"[^>]*alt="ENGINEX/, page + ' has no ENGINEX wordmark');
  }
  for (const page of ['index.html', 'install.html']) {
    assert.match(read(page), /class="footer"[\s\S]*enginex-logo-light-320\.png/, page + ' footer should use the light logo on its dark background');
    assert.match(read(page), /<link rel="apple-touch-icon" href="\/apple-touch-icon\.png">/);
  }
  assert.match(read('index.html'), /"logo":"https:\/\/enginex2030\.com\/logo\/enginex-logo-640\.png"/);
  assert.match(read('index.html'), /© <span id="year"><\/span> ENGINEX ERP/);
  for (const file of ['favicon.ico', 'apple-touch-icon.png', 'logo/enginex-logo-320.png', 'logo/enginex-logo-640.png', 'logo/enginex-logo-light-320.png', 'logo/enginex-logo-light-640.png']) {
    assert.ok(fs.existsSync(path.join(dist, file)), 'Missing dist/' + file);
  }
});

test('build output has no unresolved config markers or base64 images', () => {
  const allText = ['index.html', 'about.html', 'install.html', 'offline.html', 'privacy.html', 'terms.html', 'marketing.js', 'install.js', 'config.js'].map(read).join('\n');
  assert.ok(!allText.includes('__VITE_API_'), 'Unresolved API configuration token');
  assert.ok(!/data:image\/[^;]+;base64,/i.test(allText), 'Unexpected embedded base64 image');
});
