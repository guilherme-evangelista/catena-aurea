const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(readFileSync(path.join(__dirname, 'fixtures/liturgy-2026-10-31.json'), 'utf8'));
const files = [
  'assets/js/themes.js',
  'assets/js/core/date-utils.js',
  'assets/js/core/bible-utils.js',
  'assets/js/core/text-utils.js',
  'assets/js/core/state.js',
  'assets/js/services/data-service.js',
  'assets/js/renderers/liturgy-renderer.js',
  'assets/js/ui/liturgy-copy.js',
  'data/lucas.js',
].map(file => [file, readFileSync(path.join(root, file), 'utf8')]);

function button() {
  const classes = new Set();
  return {
    disabled: false,
    attributes: {},
    events: {},
    classList: {
      contains: name => classes.has(name),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
    },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, handler) { this.events[name] = handler; },
  };
}

function setup() {
  const nodes = new Map();
  const timers = new Map();
  const clipboard = [];
  let timerId = 0;
  const context = vm.createContext({
    URLSearchParams,
    window: {
      setTimeout(fn) { timers.set(++timerId, fn); return timerId; },
      clearTimeout(id) { timers.delete(id); },
    },
    navigator: { clipboard: { async writeText(text) { clipboard.push(text); } } },
    document: { getElementById: id => nodes.get(id) || null },
    console: { warn() {} },
    CatenaDOM: { refs: { liturgyView: { innerHTML: '' } } },
  });
  for (const [filename, source] of files) vm.runInContext(source, context, { filename });
  const api = vm.runInContext('({ copy: CatenaLiturgyCopy, bible: CatenaBible, state: CatenaState, renderer: CatenaLiturgyRenderer, book: window.CATENA_DATA.lucas })', context);
  api.state.bookCache.lucas = api.book;
  const reference = api.bible.parseGospelReference(fixture.leituras.evangelho[0].referencia);
  return { ...api, context, nodes, timers, clipboard, reference };
}

test('copy starts with the day title, separates every reading and excludes all prayers and antiphons', () => {
  const { copy, reference } = setup();
  const data = {
    ...fixture,
    cor: 'Verde',
    antifonas: { entrada: 'ANTIPHON_ENTRY', comunhao: 'ANTIPHON_COMMUNION' },
    oracoes: { coleta: 'PRAYER_COLLECT', oferendas: 'PRAYER_OFFERINGS', comunhao: 'PRAYER_COMMUNION', extras: ['PRAYER_EXTRA'] },
    leituras: {
      primeiraLeitura: [{ referencia: 'Fl 1,1-2', titulo: 'FIRST_TITLE', texto: '1FIRST_START 2FIRST_END' }],
      salmo: [{ referencia: 'Sl 1', refrao: 'PSALM_REFRAIN', texto: 'PSALM_END' }],
      segundaLeitura: [{ referencia: 'Rm 1,1', titulo: 'SECOND_TITLE', text: 'SECOND_END' }],
      evangelho: fixture.leituras.evangelho,
      extras: [{ titulo: 'EXTRA_TITLE', texto: 'EXTRA_END' }],
    },
  };
  const before = JSON.stringify(data);
  const text = copy.getCopyText(data, reference);
  assert.ok(text.startsWith(fixture.liturgia + '\n'));
  assert.ok(text.includes('\nVerde\n\nPrimeira Leitura\nFl 1,1-2\nFIRST_TITLE\n\n1 FIRST_START 2 FIRST_END\n\nSalmo Responsorial'));
  assert.ok(text.includes('PSALM_REFRAIN\n\nPSALM_END\n\nSegunda Leitura'));
  assert.ok(text.includes('SECOND_END\n\nEvangelho\nLc 14,1.7-11\n'));
  assert.ok(text.includes('Leituras Complementares\nEXTRA_TITLE\n\nEXTRA_END\n\nCatena \u00c1urea'));
  assert.ok(!text.includes('\u00ac'));
  assert.ok(!/ANTIPHON_|PRAYER_/.test(text));
  assert.equal(JSON.stringify(data), before);
  assert.equal(copy.getCopyText(data, reference), text);
});

test('all linked commentary blocks are copied in full once, even when multiple verses share a block', () => {
  const { copy, reference, bible, book } = setup();
  const text = copy.getCopyText(fixture, reference);
  for (const key of ['1', '7']) {
    const block = book.commentary['14'][key];
    const heading = `Lc ${block.range}`;
    const fullText = bible.expandLeadingRangeQuote(block.text, block.range, book.gospel['14']).trim();
    assert.equal(text.split(heading).length - 1, 1, heading);
    assert.ok(text.includes(fullText));
  }
  assert.ok(!text.includes(`Lc ${book.commentary['14']['12'].range}`));
  assert.ok(text.indexOf('Lc 14:1') < text.indexOf('Lc 14:7'));
});

test('disjoint verses include only linked blocks and ignore alternative Gospel readings', () => {
  const { copy, bible, book } = setup();
  const gospel = { referencia: 'Lc 14,1.12', texto: '1FIRST 12SECOND' };
  const data = { ...fixture, leituras: { evangelho: [gospel, { referencia: 'Lc 14,7-11', texto: 'ALTERNATIVE_GOSPEL' }] } };
  const text = copy.getCopyText(data, bible.parseGospelReference(gospel.referencia));
  assert.ok(text.includes(`Lc ${book.commentary['14']['1'].range}`));
  assert.ok(text.includes(`Lc ${book.commentary['14']['12'].range}`));
  assert.ok(!text.includes(`Lc ${book.commentary['14']['7'].range}`));
  assert.ok(!text.includes('ALTERNATIVE_GOSPEL'));
});

test('commentary keys shared across chapter boundaries are not incorrectly deduplicated', () => {
  const { copy, bible, state } = setup();
  state.bookCache.lucas = {
    gospel: { '1': { '80': 'TEXT_80' }, '2': { '1': 'TEXT_1', '2': 'TEXT_2' } },
    commentary: {
      '1': { '1': { range: '1:80', text: 'CHAPTER_ONE_COMMENT' } },
      '2': { '1': { range: '2:1-2', text: 'CHAPTER_TWO_COMMENT' } },
    },
  };
  const gospel = { referencia: 'Lc 1,80-2,2', texto: '80FIRST 2,1SECOND 2THIRD' };
  const text = copy.getCopyText({ ...fixture, leituras: { evangelho: [gospel] } }, bible.parseGospelReference(gospel.referencia));
  assert.equal(text.split('CHAPTER_ONE_COMMENT').length - 1, 1);
  assert.equal(text.split('CHAPTER_TWO_COMMENT').length - 1, 1);
  assert.ok(text.indexOf('CHAPTER_ONE_COMMENT') < text.indexOf('CHAPTER_TWO_COMMENT'));
});

test('missing commentary or an unknown Gospel still permits copying the readings', () => {
  const { copy, reference, state } = setup();
  delete state.bookCache.lucas;
  const withoutBook = copy.getCopyText(fixture, reference);
  assert.ok(withoutBook.includes('1 Aconteceu'));
  assert.ok(!withoutBook.includes('Catena \u00c1urea'));
  assert.ok(!copy.getCopyText(fixture, null).includes('Catena \u00c1urea'));
  assert.equal(copy.getCopyText(null, null), '');
});

test('clipboard receives the complete text, shows success and resets its feedback', async () => {
  const { copy, reference, clipboard, timers } = setup();
  const target = button();
  assert.equal(await copy.copyAll(fixture, reference, target), true);
  assert.deepEqual(clipboard, [copy.getCopyText(fixture, reference)]);
  assert.equal(target.disabled, false);
  assert.equal(target.classList.contains('is-copied'), true);
  assert.equal(target.attributes['aria-label'], 'Liturgia e coment\u00e1rios copiados');
  for (const reset of timers.values()) reset();
  assert.equal(target.classList.contains('is-copied'), false);
  assert.equal(target.title, 'Copiar liturgia e coment\u00e1rios');
});

test('an ongoing copy prevents duplicate writes and releases the button after completion', async () => {
  const { copy, reference, context } = setup();
  let finish;
  let writes = 0;
  context.navigator.clipboard.writeText = () => { writes++; return new Promise(resolve => { finish = resolve; }); };
  const target = button();
  const pending = copy.copyAll(fixture, reference, target);
  assert.equal(target.disabled, true);
  assert.equal(await copy.copyAll(fixture, reference, target), false);
  finish();
  assert.equal(await pending, true);
  assert.equal(writes, 1);
  assert.equal(target.disabled, false);
});

test('fallback copying works without clipboard access and restores focus', async () => {
  for (const clipboardAvailable of [false, true]) {
    const { copy, reference, context } = setup();
    let copied = '';
    let removed = false;
    let focused = false;
    let textarea;
    context.navigator.clipboard = clipboardAvailable ? { async writeText() { throw new Error('denied'); } } : undefined;
    context.document.activeElement = { focus() { focused = true; } };
    context.document.body = { appendChild() {} };
    context.document.createElement = () => (textarea = { style: {}, setAttribute() {}, select() {}, remove() { removed = true; } });
    context.document.execCommand = command => { assert.equal(command, 'copy'); copied = textarea.value; return true; };
    assert.equal(await copy.copyAll(fixture, reference, button()), true);
    assert.equal(copied, copy.getCopyText(fixture, reference));
    assert.equal(removed, true);
    assert.equal(focused, true);
  }
});

test('copy failure cleans up, reports the error and leaves the button ready to retry', async () => {
  const { copy, reference, context } = setup();
  const target = button();
  let removed = false;
  context.navigator.clipboard = undefined;
  context.document.body = { appendChild() {} };
  context.document.createElement = () => ({ style: {}, setAttribute() {}, select() {}, remove() { removed = true; } });
  context.document.execCommand = () => false;
  assert.equal(await copy.copyAll(fixture, reference, target), false);
  assert.equal(removed, true);
  assert.equal(target.disabled, false);
  assert.equal(target.classList.contains('is-copy-error'), true);
  context.document.execCommand = () => true;
  assert.equal(await copy.copyAll(fixture, reference, target), true);
  assert.equal(target.classList.contains('is-copy-error'), false);
});

test('rendered controls bind copying to the displayed day and disable it when loading fails', async () => {
  const { copy, renderer, reference, nodes, context, clipboard } = setup();
  const target = button();
  nodes.set('liturgy-copy', target);
  renderer.render(fixture, reference);
  const html = context.CatenaDOM.refs.liturgyView.innerHTML;
  const groupStart = html.indexOf('<div class="liturgy-controls">');
  const groupEnd = html.indexOf('</div>', groupStart);
  assert.ok(groupStart > -1);
  assert.ok(html.indexOf('id="liturgy-date"', groupStart) < html.indexOf('id="liturgy-copy"', groupStart));
  assert.ok(html.indexOf('id="liturgy-copy"', groupStart) < groupEnd);
  await target.events.click();
  assert.equal(clipboard[0], copy.getCopyText(fixture, reference));
  renderer.renderError(new Error('offline'), '2026-11-05');
  assert.match(context.CatenaDOM.refs.liturgyView.innerHTML, /id="liturgy-copy"[^>]* disabled/);
});
