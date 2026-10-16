// Renders the page's math once KaTeX has loaded (its scripts are deferred).
window.addEventListener('DOMContentLoaded', function () {
  'use strict';
  if (typeof renderMathInElement !== 'function') return;
  renderMathInElement(document.body, {
    delimiters: [
      { left: '\\[', right: '\\]', display: true },
      { left: '\\(', right: '\\)', display: false },
    ],
    throwOnError: false,
  });
});
