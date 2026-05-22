'use strict';

const CatenaCommentaryPanel = (() => {
  let currentVsKey = null;
  let currentCopyRef = '';
  let copyFeedbackTimer = null;

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
    currentCopyRef = buildCopyReference(bookKey, block.range);
    resetCopyButton();
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
    document.body.classList.add('commentary-open');
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
    currentCopyRef = '';
    resetCopyButton();
    setMaximized(false);
    refs.commPanel.classList.remove('open');
    refs.commPanel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('commentary-open');

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
    document.body.classList.toggle('commentary-maximized', isMaximized);

    if (!refs.commMaximize) return isMaximized;

    refs.commMaximize.setAttribute('aria-pressed', String(isMaximized));
    refs.commMaximize.setAttribute(
      'aria-label',
      isMaximized ? 'Restaurar painel de comentários' : 'Maximizar comentários'
    );
    refs.commMaximize.title = isMaximized ? 'Restaurar painel' : 'Maximizar comentários';
    return isMaximized;
  }

  async function copyAll() {
    const text = getCopyText();
    if (!text) return false;

    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          copyWithFallback(text);
        }
      } else {
        copyWithFallback(text);
      }
      setCopyButtonFeedback(true);
      return true;
    } catch (err) {
      console.warn('[Catena Aurea] Could not copy commentary:', err);
      setCopyButtonFeedback(false);
      return false;
    }
  }

  function getCopyText() {
    const bodyText = getCommentaryBodyText();
    return [currentCopyRef, bodyText].filter(Boolean).join('\n\n');
  }

  function getCommentaryBodyText() {
    const body = CatenaDOM.refs.commBody;
    if (!body) return '';

    const paragraphs = Array.from(body.querySelectorAll('p'));
    const blocks = paragraphs.length ? paragraphs : [body];
    return blocks
      .map(block => normalizeCopyText(block.textContent))
      .filter(Boolean)
      .join('\n\n');
  }

  function buildCopyReference(bookKey, rangeStr) {
    const abbr = BOOK_META[bookKey]?.abbr || '';
    const range = normalizeCopyReference(rangeStr);
    return `${abbr}${range}`;
  }

  function normalizeCopyReference(value) {
    return String(value || '')
      .replace(/\s+/g, '')
      .replace(/[\u2013\u2014\u2212]/g, '-');
  }

  function normalizeCopyText(value) {
    return String(value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t\r\n]+/g, ' ')
      .trim();
  }

  function copyWithFallback(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.select();

    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error('Clipboard copy failed');
  }

  function setCopyButtonFeedback(copied) {
    const button = CatenaDOM.refs.commCopy;
    if (!button) return;

    window.clearTimeout(copyFeedbackTimer);
    button.classList.toggle('is-copied', copied);
    button.classList.toggle('is-copy-error', !copied);
    button.setAttribute('aria-label', copied ? 'Coment\u00e1rios copiados' : 'N\u00e3o foi poss\u00edvel copiar');
    button.title = copied ? 'Copiado' : 'N\u00e3o foi poss\u00edvel copiar';

    copyFeedbackTimer = window.setTimeout(resetCopyButton, 1600);
  }

  function resetCopyButton() {
    const button = CatenaDOM.refs.commCopy;
    if (!button) return;

    window.clearTimeout(copyFeedbackTimer);
    button.classList.remove('is-copied', 'is-copy-error');
    button.setAttribute('aria-label', 'Copiar coment\u00e1rios');
    button.title = 'Copiar coment\u00e1rios';
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
    copyAll,
    toggleMaximized,
    setMaximized,
    getState,
    clearHighlights,
  };
})();
