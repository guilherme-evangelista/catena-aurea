'use strict';

const CatenaChapterRenderer = (() => {
  function renderChapterList(bookKey, book) {
    const meta = BOOK_META[bookKey];
    const chapters = Object.keys(book.gospel).sort((a, b) => +a - +b);
    const commentary = book.commentary;

    CatenaDOM.refs.sidebarLabel.textContent = meta.name;
    CatenaDOM.refs.chapterList.innerHTML = chapters.map(ch => {
      const hasCommentary = commentary[ch] && Object.keys(commentary[ch]).length > 0;
      return `<button class="ch-btn" id="ch-btn-${ch}" data-ch="${ch}">
        <span>Cap&iacute;tulo ${ch}</span>
        ${hasCommentary ? '<span class="ch-dot" aria-hidden="true"></span>' : ''}
      </button>`;
    }).join('');
  }

  function renderChapter(bookKey, chapter, book) {
    try {
      const meta = BOOK_META[bookKey];
      const verses = book.gospel[chapter];
      const commentary = book.commentary[chapter] || {};
      const verseKeys = Object.keys(verses).sort((a, b) => +a - +b);
      const symbol = SYMBOLS[bookKey];
      const commentaryMap = CatenaBible.buildCommentaryMap(commentary);

      let firstVerse = true;
      const rows = verseKeys.map(verse => {
        const text = verses[verse];
        const commentaryKey = commentaryMap[verse];
        const hasCommentary = !!commentaryKey;

        let display = CatenaText.escHtml(text);
        if (firstVerse && text.length > 0) {
          display = `<span class="illuminated">${CatenaText.escHtml(text[0])}</span>${CatenaText.escHtml(text.slice(1))}`;
          firstVerse = false;
        }

        const pip = hasCommentary ? '<span class="comm-pip" aria-hidden="true"></span>' : '';
        const cls = hasCommentary ? 'verse-row has-commentary' : 'verse-row';
        const data = hasCommentary ? ` data-vskey="${CatenaText.escHtml(commentaryKey)}"` : '';

        return `<div class="${cls}"${data} role="${hasCommentary ? 'button' : 'text'}" ${hasCommentary ? 'tabindex="0"' : ''}>
          <span class="v-num" aria-label="Vers&iacute;culo ${verse}">${verse}</span>
          <span class="v-text">${display}${pip}</span>
        </div>`;
      }).join('');

      CatenaDOM.refs.chapterView.innerHTML = `
        <div class="chapter-header fade-up">
          <div class="chapter-header-icon scale-in" aria-hidden="true">${symbol}</div>
          <div class="chapter-header-text">
            <div class="book-name">${CatenaText.escHtml(meta.name)} &middot; ${CatenaText.escHtml(meta.vol)}</div>
            <div class="chapter-label">Cap&iacute;tulo ${chapter}</div>
          </div>
        </div>
        <div class="fade-up">${rows}</div>
        <div class="chapter-ornament fade-up" aria-hidden="true">&middot; &middot; &#10022; &middot; &middot;</div>`;

      CatenaDOM.showPanel('chapter');
    } catch (err) {
      console.error('[Catena Aurea] renderChapter error:', err);
      CatenaDOM.refs.chapterView.innerHTML = `<p style="padding:40px;color:var(--text-faint)">
        Erro ao renderizar o cap&iacute;tulo: ${CatenaText.escHtml(err.message)}</p>`;
      CatenaDOM.showPanel('chapter');
    }
  }

  function renderLoadError(err) {
    console.error('[Catena Aurea] Data load error:', err);
    CatenaDOM.refs.chapterView.innerHTML = `
      <div style="padding:48px 52px;max-width:620px">
        <p style="font-family:'Cinzel',serif;font-size:1rem;color:var(--book-accent);margin-bottom:12px">
          Erro ao carregar os dados
        </p>
        <p style="color:var(--text-dim);line-height:1.7;margin-bottom:16px">
          Os arquivos de dados n&atilde;o puderam ser carregados. Se estiver abrindo o site
          diretamente pelo explorador de ficheiros (protocolo <code>file://</code>),
          use um servidor local:
        </p>
        <pre style="background:rgba(255,255,255,.06);padding:12px 16px;border-radius:6px;font-size:.85rem;color:var(--text);">python3 -m http.server 8000</pre>
        <p style="color:var(--text-faint);font-size:.85rem;margin-top:12px">
          Depois acesse <strong>http://localhost:8000</strong> no seu browser.
        </p>
      </div>`;
    CatenaDOM.showPanel('chapter');
  }

  return {
    renderChapterList,
    renderChapter,
    renderLoadError,
  };
})();
