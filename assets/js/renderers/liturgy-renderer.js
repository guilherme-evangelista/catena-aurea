'use strict';

const CatenaLiturgyRenderer = (() => {
  function render(data, gospelRef, handlers = {}) {
    const isoDate = CatenaDate.parseApiDate(data.data) || CatenaState.liturgy.date;
    CatenaState.liturgy.date = isoDate;
    CatenaState.liturgy.verseTexts = {};

    const readings = data.leituras || {};
    const prayers = data.oracoes || {};
    const antiphons = data.antifonas || {};
    const gospel = CatenaBible.firstReading(readings.evangelho);

    CatenaDOM.refs.liturgyView.innerHTML = `
      <div class="liturgy-shell">
        ${renderControls(isoDate)}

        <header class="liturgy-hero fade-up">
          <div class="liturgy-eyebrow">Liturgia Di&aacute;ria</div>
          <h1>${data.liturgia ? CatenaText.escHtml(data.liturgia) : 'Liturgia di&aacute;ria'}</h1>
          <div class="liturgy-meta-row">
            <span>${CatenaText.escHtml(CatenaDate.formatLongDate(isoDate))}</span>
            ${data.cor ? `<span class="liturgy-color">${CatenaText.escHtml(data.cor)}</span>` : ''}
          </div>
        </header>

        ${renderAntiphons(antiphons)}
        ${renderPrayerSections(prayers)}
        ${renderReadingGroup('Primeira Leitura', readings.primeiraLeitura)}
        ${renderReadingGroup('Salmo Responsorial', readings.salmo, true)}
        ${renderReadingGroup('Segunda Leitura', readings.segundaLeitura)}
        ${renderGospelReading(gospel, gospelRef)}
        ${renderReadingGroup('Leituras Complementares', readings.extras)}
      </div>`;

    bindControls(handlers.onSelectDate);
  }

  function renderError(err, isoDate, handlers = {}) {
    CatenaDOM.refs.liturgyView.innerHTML = `
      <div class="liturgy-shell">
        ${renderControls(isoDate)}
        <section class="liturgy-section liturgy-error fade-up">
          <div class="liturgy-section-header">
            <div>
              <div class="liturgy-kicker">Liturgia Di&aacute;ria</div>
              <h2>N&atilde;o foi poss&iacute;vel carregar esta data</h2>
            </div>
          </div>
          <p>${CatenaText.escHtml(err.message || 'Verifique a conex\u00e3o e tente novamente.')}</p>
        </section>
      </div>`;
    bindControls(handlers.onSelectDate);
  }

  function renderControls(isoDate) {
    return `
      <div class="liturgy-nav fade-up">
        <button class="liturgy-day-btn" id="liturgy-prev" aria-label="Dia anterior" title="Dia anterior">&lsaquo;</button>
        <label class="liturgy-date-picker">
          <span>Escolher dia</span>
          <input type="date" id="liturgy-date" value="${CatenaText.escHtml(isoDate)}" aria-label="Escolher dia da liturgia">
        </label>
        <button class="liturgy-day-btn" id="liturgy-next" aria-label="Dia seguinte" title="Dia seguinte">&rsaquo;</button>
      </div>`;
  }

  function renderAntiphons(antiphons) {
    const items = [
      ['Ant&iacute;fona de Entrada', antiphons.entrada],
      ['Ant&iacute;fona da Comunh&atilde;o', antiphons.comunhao],
    ].filter(([, text]) => text);

    if (!items.length) return '';

    return `<details class="liturgy-section liturgy-collapsible liturgy-antiphons fade-up">
      <summary class="liturgy-section-header liturgy-collapse-summary">
        <div>
          <div class="liturgy-kicker">Ant&iacute;fonas</div>
          <h2>Textos pr&oacute;prios</h2>
        </div>
        <span class="liturgy-collapse-icon" aria-hidden="true"></span>
      </summary>
      <div class="liturgy-two-col liturgy-collapse-content">
        ${items.map(([label, text]) => `
          <div class="liturgy-mini">
            <h3>${label}</h3>
            <p>${CatenaText.formatPlainText(text)}</p>
          </div>`).join('')}
      </div>
    </details>`;
  }

  function renderPrayerSections(prayers) {
    const items = [
      ['Ora&ccedil;&atilde;o do Dia', prayers.coleta],
      ['Sobre as Oferendas', prayers.oferendas],
      ['Depois da Comunh&atilde;o', prayers.comunhao],
    ].filter(([, text]) => text);

    const extras = Array.isArray(prayers.extras) ? prayers.extras : [];
    extras.forEach((extra, index) => {
      if (typeof extra === 'string' && extra.trim()) {
        items.push([`Ora&ccedil;&atilde;o ${index + 1}`, extra]);
      } else if (extra && (extra.titulo || extra.texto || extra.text)) {
        const label = extra.titulo
          ? CatenaText.escHtml(extra.titulo)
          : `Ora&ccedil;&atilde;o ${index + 1}`;
        items.push([label, extra.texto || extra.text || '']);
      }
    });

    if (!items.length) return '';

    return `<details class="liturgy-section liturgy-collapsible liturgy-prayers-section fade-up">
      <summary class="liturgy-section-header liturgy-collapse-summary">
        <div>
          <div class="liturgy-kicker">Ora&ccedil;&otilde;es</div>
          <h2>Ora&ccedil;&otilde;es da celebra&ccedil;&atilde;o</h2>
        </div>
        <span class="liturgy-collapse-icon" aria-hidden="true"></span>
      </summary>
      <div class="liturgy-prayers liturgy-collapse-content">
        ${items.map(([label, text]) => `
          <div class="liturgy-prayer">
            <h3>${label}</h3>
            <p>${CatenaText.formatPlainText(text)}</p>
          </div>`).join('')}
      </div>
    </details>`;
  }

  function renderReadingGroup(label, readings, isPsalm = false) {
    if (!Array.isArray(readings) || readings.length === 0) return '';

    return readings.map(reading => {
      const readingText = reading.texto || reading.text || '';

      return `
        <section class="liturgy-section liturgy-reading fade-up">
          <div class="liturgy-section-header">
            <div>
              <div class="liturgy-kicker">${CatenaText.escHtml(label)}</div>
              ${reading.referencia ? `<div class="liturgy-reference">${CatenaText.escHtml(reading.referencia)}</div>` : ''}
              ${reading.titulo ? `<h2>${CatenaText.escHtml(reading.titulo)}</h2>` : ''}
            </div>
          </div>
          ${isPsalm && reading.refrao ? `<p class="liturgy-psalm-response">${CatenaText.formatPlainText(reading.refrao)}</p>` : ''}
          <div class="liturgy-text">${CatenaText.formatVerseMarkers(readingText, reading.referencia)}</div>
        </section>`;
    }).join('');
  }

  function renderGospelReading(gospel, gospelRef) {
    if (!gospel) return '';

    const hasCatena = !!(gospelRef && CatenaDataService.getBook(gospelRef.bookKey));
    const gospelText = gospel.texto || gospel.text || '';

    return `
      <section class="liturgy-section liturgy-gospel fade-up">
        <div class="liturgy-section-header">
          <div>
            <div class="liturgy-kicker">Evangelho</div>
            ${gospel.referencia ? `<div class="liturgy-reference">${CatenaText.escHtml(gospel.referencia)}</div>` : ''}
            ${gospel.titulo ? `<h2>${CatenaText.escHtml(gospel.titulo)}</h2>` : ''}
          </div>
        </div>
        <div class="liturgy-gospel-text">
          ${renderGospelText(gospelText, gospelRef, gospel.referencia)}
        </div>
        ${hasCatena ? `
          <p class="liturgy-hint">Catena &Aacute;urea dispon&iacute;vel para esta per&iacute;cope do Evangelho.</p>
        ` : `
          <p class="liturgy-hint">A refer&ecirc;ncia deste Evangelho n&atilde;o p&ocirc;de ser vinculada automaticamente aos coment&aacute;rios da Catena &Aacute;urea.</p>
        `}
      </section>`;
  }

  function renderGospelText(text, gospelRef, reference = '') {
    const parts = CatenaBible.splitGospelText(text, gospelRef);
    if (!parts.verses.length) {
      return `<p>${CatenaText.formatVerseMarkers(text, reference)}</p>`;
    }

    const book = gospelRef ? CatenaDataService.getBook(gospelRef.bookKey) : null;
    const commentary = book?.commentary?.[String(gospelRef.chapter)] || {};
    const commentaryMap = CatenaBible.buildCommentaryMap(commentary);

    const intro = parts.intro
      ? `<p class="liturgy-gospel-intro">${CatenaText.formatPlainText(parts.intro)}</p>`
      : '';

    const verses = parts.verses.map(part => {
      const verseKey = String(part.verse);
      const commentaryKey = commentaryMap[verseKey];
      CatenaState.liturgy.verseTexts[verseKey] = part.text;

      const cls = commentaryKey
        ? 'liturgy-verse has-commentary'
        : 'liturgy-verse';
      const interactiveAttrs = commentaryKey
        ? ` data-vskey="${CatenaText.escHtml(commentaryKey)}" role="button" tabindex="0"`
        : '';

      return `<span class="${cls}" data-verse="${CatenaText.escHtml(verseKey)}"${interactiveAttrs}>
        <sup class="lit-v-num">${CatenaText.escHtml(part.label)}</sup> ${CatenaText.formatPlainText(part.text)}
      </span>`;
    }).join(' ');

    return `${intro}<p class="liturgy-verse-flow">${verses}</p>`;
  }

  function bindControls(onSelectDate) {
    const selectDate = typeof onSelectDate === 'function' ? onSelectDate : () => {};
    const prev = document.getElementById('liturgy-prev');
    const next = document.getElementById('liturgy-next');
    const date = document.getElementById('liturgy-date');

    if (prev) prev.addEventListener('click', () => selectDate(CatenaDate.shiftISODate(CatenaState.liturgy.date, -1)));
    if (next) next.addEventListener('click', () => selectDate(CatenaDate.shiftISODate(CatenaState.liturgy.date, 1)));
    if (date) {
      date.addEventListener('change', () => {
        if (date.value) selectDate(date.value);
      });
    }
  }

  return {
    render,
    renderError,
  };
})();
