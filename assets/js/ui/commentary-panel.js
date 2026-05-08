'use strict';

const CatenaCommentaryPanel = (() => {
  let currentVsKey = null;

  function open(vsKey) {
    const bookKey = CatenaState.currentBook;
    const target = parseCommentaryTarget(vsKey, CatenaState.currentChapter);
    const chapter = target.chapter;
    const book = CatenaDataService.getBook(bookKey);
    const block = book?.commentary?.[chapter]?.[target.vsKey];
    if (!book || !block) return false;

    const meta = BOOK_META[bookKey];
    const theme = BOOK_THEMES[bookKey];
    const refs = CatenaDOM.refs;

    currentVsKey = target.routeKey;
    highlightVerses(block.range, chapter);

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
    return true;
  }

  function openFromVerse(verseEl) {
    return open(verseEl.dataset.vskey);
  }

  function parseCommentaryTarget(vsKey, fallbackChapter) {
    const raw = String(vsKey || '');
    const match = raw.match(/^(\d+):(.+)$/);
    if (!match) {
      return {
        chapter: String(fallbackChapter || ''),
        vsKey: raw,
        routeKey: raw,
      };
    }

    return {
      chapter: match[1],
      vsKey: match[2],
      routeKey: raw,
    };
  }

  function close(options = {}) {
    const refs = CatenaDOM.refs;
    currentVsKey = null;
    refs.commPanel.classList.remove('open');
    refs.commPanel.setAttribute('aria-hidden', 'true');
    setMaximized(false);

    if (options.clearHighlight === true) {
      clearHighlights();
    }
  }

  function toggleMaximized() {
    const panel = CatenaDOM.refs.commPanel;
    return setMaximized(!panel.classList.contains('is-maximized'));
  }

  function setMaximized(isMaximized) {
    const refs = CatenaDOM.refs;
    refs.commPanel.classList.toggle('is-maximized', isMaximized);

    if (!refs.commMaximize) return isMaximized;

    refs.commMaximize.setAttribute('aria-pressed', String(isMaximized));
    refs.commMaximize.setAttribute(
      'aria-label',
      isMaximized ? 'Restaurar painel de comentários' : 'Maximizar comentários'
    );
    refs.commMaximize.title = isMaximized ? 'Restaurar painel' : 'Maximizar comentários';
    return isMaximized;
  }

  function getState() {
    const panel = CatenaDOM.refs.commPanel;
    return {
      vsKey: currentVsKey,
      isOpen: !!panel?.classList.contains('open'),
      isMaximized: !!panel?.classList.contains('is-maximized'),
    };
  }

  function clearHighlights() {
    document.querySelectorAll('.verse-row.highlighted, .liturgy-verse.highlighted')
      .forEach(row => row.classList.remove('highlighted'));
  }

  function highlightVerses(rangeStr, chapter = null) {
    clearHighlights();

    const range = CatenaBible.parseCatenaRange(rangeStr);
    if (!range) return;
    const chapterKey = chapter ? String(chapter) : null;

    document.querySelectorAll('.verse-row').forEach(row => {
      const verseNumber = row.querySelector('.v-num');
      const value = verseNumber ? Number(verseNumber.textContent) : NaN;
      if (value >= range.start && value <= range.end) {
        row.classList.add('highlighted');
      }
    });

    document.querySelectorAll('.liturgy-verse[data-verse]').forEach(verse => {
      if (chapterKey && verse.dataset.chapter && verse.dataset.chapter !== chapterKey) return;

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
    setMaximized,
    getState,
    clearHighlights,
  };
})();
