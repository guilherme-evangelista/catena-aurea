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
        <a class="book-card fade-up"
             href="?evangelho=${key}&amp;capitulo=1"
             style="animation-delay:${delay}ms"
             role="listitem"
             data-book="${key}"
             tabindex="0"
             aria-label="Abrir ${CatenaText.escHtml(meta.name)}">
          <div class="book-card-bg"
               style="background-image:url('${imgPath}');background-color:${theme.bg1}"></div>
          <div class="book-card-glow"
               style="--card-accent:${theme.accent};--card-gold:${theme.gold};--card-bg:${theme.bg1}"></div>
          <div class="book-card-frame" style="border-color:${theme.accent}"></div>
          <div class="book-card-body">
            <div class="book-card-eyebrow">Evangelho de</div>
            <div class="book-card-vol" style="color:${theme.gold}">${CatenaText.escHtml(meta.vol)}</div>
            <div class="book-card-name">${CatenaText.escHtml(meta.name)}</div>
            <div class="book-card-cta">
              <div class="book-card-symbol" style="color:${symbolColor}">${symbol}</div>
              <span class="book-card-cta-label" data-short-label="Coment&aacute;rios">Ler coment&aacute;rios</span>
              <span aria-hidden="true">&rarr;</span>
            </div>
          </div>
        </a>`;
    }).join('');
  }

  return { renderBookCards };
})();
