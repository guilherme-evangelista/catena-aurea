'use strict';

const CatenaLiturgyCopy = (() => {
  function getCopyText(data, gospelRef) {
    if (!data) return '';

    const date = CatenaDate.parseApiDate(data.data) || CatenaState.liturgy.date;
    const readings = data.leituras || {};
    const gospel = CatenaBible.firstReading(readings.evangelho);
    const sections = [[
      data.liturgia || 'Liturgia di\u00e1ria',
      CatenaDate.formatLongDate(date),
      data.cor,
    ].filter(Boolean).join('\n')];

    appendReadings(sections, 'Primeira Leitura', readings.primeiraLeitura);
    appendReadings(sections, 'Salmo Responsorial', readings.salmo);
    appendReadings(sections, 'Segunda Leitura', readings.segundaLeitura);
    appendReadings(sections, 'Evangelho', gospel ? [gospel] : []);
    appendReadings(sections, 'Leituras Complementares', readings.extras);

    const commentary = getCommentaryText(gospel, gospelRef);
    if (commentary) sections.push(`Catena \u00c1urea\n\n${commentary}`);
    return sections.join('\n\n');
  }

  function appendReadings(sections, label, readings) {
    if (!Array.isArray(readings)) return;

    for (const reading of readings) {
      const reference = CatenaBible.normalizeReference(reading.referencia);
      const header = [label, reference, reading.titulo].filter(Boolean).join('\n');
      const text = reading.texto || reading.text || '';
      const parts = CatenaBible.splitGospelText(text, null, reference);
      const body = parts.verses.length
        ? [parts.intro, ...parts.verses.map(part => {
          const chapter = part.chapterLabel ? `${part.chapterLabel},` : '';
          return `${chapter}${part.label} ${part.text}`;
        })].filter(Boolean).join(' ')
        : text.trim();
      sections.push([header, reading.refrao, body].filter(Boolean).join('\n\n'));
    }
  }

  function getCommentaryText(gospel, gospelRef) {
    if (!gospel || !gospelRef) return '';
    const book = CatenaDataService.getBook(gospelRef.bookKey);
    if (!book) return '';

    const parts = CatenaBible.splitGospelText(gospel.texto || gospel.text || '', gospelRef, gospel.referencia);
    const maps = {};
    const seen = new Set();
    const blocks = [];
    for (const part of parts.verses) {
      const chapter = String(part.chapter || gospelRef.chapter);
      const commentary = book.commentary[chapter] || {};
      if (!maps[chapter]) maps[chapter] = CatenaBible.buildCommentaryMap(commentary);
      const key = maps[chapter][String(part.verse)];
      const block = commentary[key];
      const id = `${chapter}:${key}`;
      if (!block || seen.has(id)) continue;
      seen.add(id);

      const text = CatenaBible.expandLeadingRangeQuote(block.text, block.range, book.gospel[chapter] || {});
      const reference = `${BOOK_META[gospelRef.bookKey].abbr} ${block.range}`;
      blocks.push(`${reference}\n\n${String(text).replace(/\r\n?/g, '\n').trim()}`);
    }
    return blocks.join('\n\n');
  }

  async function copyAll(data, gospelRef, button) {
    if (button.disabled) return false;
    const text = getCopyText(data, gospelRef);
    if (!text) return false;
    button.disabled = true;

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
      showFeedback(button, true);
      return true;
    } catch (err) {
      console.warn('[Catena Aurea] Could not copy liturgy:', err);
      showFeedback(button, false);
      return false;
    } finally {
      button.disabled = false;
    }
  }

  function copyWithFallback(text) {
    const focused = document.activeElement;
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    try {
      textarea.select();
      if (!document.execCommand('copy')) throw new Error('Clipboard copy failed');
    } finally {
      textarea.remove();
      focused?.focus({ preventScroll: true });
    }
  }

  function showFeedback(button, copied) {
    window.clearTimeout(button.copyFeedbackTimer);
    button.classList.toggle('is-copied', copied);
    button.classList.toggle('is-copy-error', !copied);
    const label = copied ? 'Liturgia e coment\u00e1rios copiados' : 'N\u00e3o foi poss\u00edvel copiar. Tente novamente';
    button.setAttribute('aria-label', label);
    button.title = label;
    button.copyFeedbackTimer = window.setTimeout(() => {
      button.classList.remove('is-copied', 'is-copy-error');
      button.setAttribute('aria-label', 'Copiar liturgia e coment\u00e1rios');
      button.title = 'Copiar liturgia e coment\u00e1rios';
    }, 1600);
  }

  return { getCopyText, copyAll };
})();
