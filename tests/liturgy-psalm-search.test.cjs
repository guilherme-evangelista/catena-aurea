const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(readFileSync(path.join(__dirname, 'fixtures/liturgy-2026-12-27.json'), 'utf8'));
const context = vm.createContext({
  URLSearchParams,
  document: { getElementById: () => null },
  CatenaDOM: { refs: { liturgyView: { innerHTML: '' } } },
});
for (const file of [
  'assets/js/core/date-utils.js',
  'assets/js/core/bible-utils.js',
  'assets/js/core/text-utils.js',
  'assets/js/core/state.js',
  'assets/js/renderers/liturgy-renderer.js',
]) {
  vm.runInContext(readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
const renderer = vm.runInContext('CatenaLiturgyRenderer', context);

function render(psalms, extraReadings = {}) {
  renderer.render({ ...fixture, leituras: { ...extraReadings, salmo: psalms } }, null);
  return context.CatenaDOM.refs.liturgyView.innerHTML;
}

function searchLinks(html) {
  return Array.from(html.matchAll(/<a class="comm-control liturgy-psalm-search"[^>]*>/g), match => {
    const tag = match[0];
    const url = new URL(tag.match(/href="([^"]+)"/)[1].replace(/&amp;/g, '&'));
    return { tag, url };
  });
}

test('YouTube search includes the entire Psalm reference, refrain and all stanzas', () => {
  const psalm = fixture.leituras.salmo[0];
  const before = JSON.stringify(psalm);
  const html = render([psalm]);
  const links = searchLinks(html);
  assert.equal(links.length, 1);
  assert.equal(links[0].url.origin, 'https://www.youtube.com');
  assert.equal(links[0].url.pathname, '/results');
  assert.equal(links[0].url.searchParams.get('search_query'), [psalm.referencia, psalm.refrao, psalm.texto].join(' ').replace(/\s+/g, ' ').trim());
  assert.equal(Array.from(links[0].url.searchParams).length, 1);
  assert.match(links[0].tag, /target="_blank" rel="noopener noreferrer"/);
  assert.match(links[0].tag, /aria-label="Pesquisar salmo no YouTube" title="Pesquisar salmo no YouTube"/);
  const headerStart = html.indexOf('class="liturgy-section-header liturgy-psalm-header"');
  const linkStart = html.indexOf(links[0].tag);
  assert.ok(headerStart < linkStart);
  assert.ok(linkStart < html.indexOf('class="liturgy-psalm-response"'));
  assert.equal(JSON.stringify(psalm), before);
});

test('accents, parentheses, quotes and URL punctuation are preserved in a single search query', () => {
  const psalm = { referencia: 'Sl 104(105)', refrao: 'Exulte o cora\u00e7\u00e3o dos que buscam o Senhor!', texto: '\u2013 Cantai, entoai salmos para ele! "Gl\u00f3ria" & louvor + f\u00e9? #Salmo=104' };
  const [{ url }] = searchLinks(render([psalm]));
  assert.equal(url.searchParams.get('search_query'), `${psalm.referencia} ${psalm.refrao} ${psalm.texto}`);
  assert.equal(url.hash, '');
  assert.equal(Array.from(url.searchParams).length, 1);
});

test('each Psalm gets its own query and other readings get no search control', () => {
  const psalms = [
    { referencia: 'Sl 1', refrao: 'FIRST_REFRAIN', texto: 'FIRST_PSALM' },
    { referencia: 'Sl 2', refrao: 'SECOND_REFRAIN', texto: 'SECOND_PSALM' },
  ];
  const otherReadings = {
    primeiraLeitura: [{ referencia: 'Is 1,1', texto: 'FIRST_READING' }],
    segundaLeitura: [{ referencia: 'Rm 1,1', texto: 'SECOND_READING' }],
    extras: [{ titulo: 'Extra', texto: 'EXTRA_READING' }],
  };
  const links = searchLinks(render(psalms, otherReadings));
  assert.deepEqual(links.map(link => link.url.searchParams.get('search_query')), ['Sl 1 FIRST_REFRAIN FIRST_PSALM', 'Sl 2 SECOND_REFRAIN SECOND_PSALM']);
});

test('missing optional fields use the text fallback and absent Psalms produce no empty search', () => {
  assert.equal(searchLinks(render([{ text: 'Texto alternativo do salmo' }]))[0].url.searchParams.get('search_query'), 'Texto alternativo do salmo');
  for (const psalms of [undefined, [], [{}]]) assert.equal(searchLinks(render(psalms)).length, 0);
});
