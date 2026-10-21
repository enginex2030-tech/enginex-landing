(() => {
  // The language is decided by the path alone: / is Arabic and /en/ is English.
  // Canonical and hreflang links are written into each page at build time.
  // Old ?lang= links are forwarded to the matching path so saved URLs keep working.
  const url = new URL(location.href);
  const englishPath = url.pathname === '/en/' || url.pathname === '/en/index.html';
  const requested = url.searchParams.get('lang');
  if (!englishPath && requested === 'en') location.replace('/en/' + url.hash);
  else if (englishPath && requested === 'ar') location.replace('/' + url.hash);
})();
