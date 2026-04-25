'use strict';

const CatenaCommentaryPanel = (() => {
  function open(vsKey) {
    const bookKey = CatenaState.currentBook;
    const chapter = CatenaState.currentChapter;
    const book = CatenaDataService.getBook(bookKey);
    const block = book?.commentary?.[chapter]?.[vsKey];
    if (!book || !block) return;

    const meta = BOOK_META[bookKey];
    const theme = BOOK_THEMES[bookKey];
    const refs = CatenaDOM.refs;

    highlightVerses(block.range);

    refs.commLabel.textContent = `${meta.name} \u2014 Catena \u00c1urea`;
    refs.commRef.textContent = block.range;
    refs.commHeader.style.background = `color-mix(in srgb, ${theme.bg1} 70%, transparent)`;

    const commentaryText = CatenaBible.expandLeadingRangeQuote(
      block.text,
      block.range,
      book.gospel[chapter] || {}
    );
    refs.commBody.innerHTML = formatCommentary(commentaryText, block.range);
    refs.commBody.scrollTop = 0;

    refs.commPanel.classList.add('open');
    refs.commPanel.setAttribute('aria-hidden', 'false');
  }

  function openFromVerse(verseEl) {
    open(verseEl.dataset.vskey);
  }

  function close(options = {}) {
    const refs = CatenaDOM.refs;
    refs.commPanel.classList.remove('open');
    refs.commPanel.setAttribute('aria-hidden', 'true');
    setMaximized(false);

    if (options.clearHighlight === true) {
      clearHighlights();
    }
  }

  function toggleMaximized() {
    const panel = CatenaDOM.refs.commPanel;
    setMaximized(!panel.classList.contains('is-maximized'));
  }

  function setMaximized(isMaximized) {
    const refs = CatenaDOM.refs;
    refs.commPanel.classList.toggle('is-maximized', isMaximized);

    if (!refs.commMaximize) return;

    refs.commMaximize.setAttribute('aria-pressed', String(isMaximized));
    refs.commMaximize.setAttribute(
      'aria-label',
      isMaximized ? 'Restaurar painel de comentários' : 'Maximizar comentários'
    );
    refs.commMaximize.title = isMaximized ? 'Restaurar painel' : 'Maximizar comentários';
  }

  function clearHighlights() {
    document.querySelectorAll('.verse-row.highlighted, .liturgy-verse.highlighted')
      .forEach(row => row.classList.remove('highlighted'));
  }

  function highlightVerses(rangeStr) {
    clearHighlights();

    const range = CatenaBible.parseCatenaRange(rangeStr);
    if (!range) return;

    document.querySelectorAll('.verse-row').forEach(row => {
      const verseNumber = row.querySelector('.v-num');
      const value = verseNumber ? Number(verseNumber.textContent) : NaN;
      if (value >= range.start && value <= range.end) {
        row.classList.add('highlighted');
      }
    });

    document.querySelectorAll('.liturgy-verse[data-verse]').forEach(verse => {
      const value = Number(verse.dataset.verse);
      if (value >= range.start && value <= range.end) {
        verse.classList.add('highlighted');
      }
    });
  }

  return {
    open,
    openFromVerse,
    close,
    toggleMaximized,
    clearHighlights,
  };
})();
