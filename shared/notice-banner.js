// Site-wide notice banner shared by every project page.
// Edit NOTICE below to change the banner on all pages at once.
// Include it right after </header>, as a plain (non-async) script so the banner
// renders in place without a layout shift:
//   <script src="/shared/notice-banner.js"></script>
(function () {
  const NOTICE = {
    text: "We're hiring! Join FuriosaAI as an AI Research Engineer",
    href: 'https://furiosa.ai/careers',
  };

  if (!document.getElementById('notice-banner-styles')) {
    const style = document.createElement('style');
    style.id = 'notice-banner-styles';
    style.textContent = `
      .notice { background: #000000; color: #FFFFFF; text-align: center; font-size: 14px; font-weight: 500; }
      .notice a { display: inline-block; padding: 10px 24px; color: #FFFFFF; text-decoration: none; }
      .notice a:hover { color: #FFFFFF; text-decoration: underline; }
      .notice a span { color: #E21500; }
    `;
    document.head.appendChild(style);
  }

  const banner = document.createElement('div');
  banner.className = 'notice';
  const link = document.createElement('a');
  link.href = NOTICE.href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = NOTICE.text + ' ';
  const arrow = document.createElement('span');
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '→';
  link.appendChild(arrow);
  banner.appendChild(link);

  // Insert where the <script> tag sits; fall back to the top of <body>.
  const script = document.currentScript;
  if (script && script.parentNode) {
    script.parentNode.insertBefore(banner, script);
  } else {
    document.body.prepend(banner);
  }
})();
