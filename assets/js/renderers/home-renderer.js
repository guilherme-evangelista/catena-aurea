'use strict';

const CatenaHomeRenderer = (() => {
  const BOOK_KEYS = ['mateus', 'marcos', 'lucas', 'joao'];

  function renderBookCards() {
    CatenaDOM.refs.bookCards.innerHTML = BOOK_KEYS.map((key, index) => {
      const meta = BOOK_META[key];
      const theme = BOOK_THEMES[key];
      const symbol = SYMBOLS[key];
      const symbolColor = theme.symbol || theme.gold;
      const delay = index * 80;
      const imgPath = `assets/images/cover-${key}.jpg`;

      return `
        <div class="book-card fade-up"
             style="animation-delay:${delay}ms"
             role="listitem"
             data-book="${key}"
             tabindex="0"
             aria-label="Abrir ${CatenaText.escHtml(meta.name)}">
          <div class="book-card-bg"
               style="background-image:url('${imgPath}');background-color:${theme.bg1}"></div>
          <div class="book-card-overlay"
               style="background:linear-gradient(to top,rgba(0,0,0,.95) 0%,rgba(0,0,0,.5) 45%,rgba(0,0,0,.1) 100%)"></div>
          <div class="book-card-body">
            <div class="book-card-symbol" style="color:${symbolColor}">${symbol}</div>
            <div class="book-card-vol" style="color:${theme.gold};opacity:.7">${CatenaText.escHtml(meta.vol)}</div>
            <div class="book-card-name">${CatenaText.escHtml(meta.name)}</div>
            <div class="book-card-cta">Ler coment&aacute;rios &rarr;</div>
          </div>
        </div>`;
    }).join('');
  }

  return { renderBookCards };
})();
