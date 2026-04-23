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

  function formatVerseMarkers(text) {
    return escHtml(text || '')
      .replace(/(^|[\s\n.!?])(\d{1,3}[a-c]?)(?=[^\s.,;:)\]])/g, '$1<sup class="lit-v-num">$2</sup>')
      .replace(/\n/g, '<br>');
  }

  return {
    escHtml,
    formatPlainText,
    formatVerseMarkers,
  };
})();
