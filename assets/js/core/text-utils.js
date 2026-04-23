'use strict';

const CatenaText = (() => {
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatPlainText(text) {
    return escHtml(text || '').replace(/\n/g, '<br>');
  }

  function formatVerseMarkers(text, reference = '') {
    const source = String(text || '');
    const allowedVerses = typeof CatenaBible !== 'undefined' &&
      typeof CatenaBible.parseReferenceVerseSet === 'function'
      ? CatenaBible.parseReferenceVerseSet(reference)
      : null;

    const markers = typeof CatenaBible !== 'undefined' &&
      typeof CatenaBible.collectInlineVerseMarkers === 'function'
      ? CatenaBible.collectInlineVerseMarkers(source, { allowedVerses })
      : [];

    if (!markers.length) {
      return formatPlainText(source);
    }

    let html = '';
    let cursor = 0;

    markers.forEach(marker => {
      html += escHtml(source.slice(cursor, marker.markerStart));
      html += `<sup class="lit-v-num">${escHtml(marker.label)}</sup>`;
      cursor = marker.markerEnd;
    });

    html += escHtml(source.slice(cursor));
    return html.replace(/\n/g, '<br>');
  }

  return {
    escHtml,
    formatPlainText,
    formatVerseMarkers,
  };
})();
