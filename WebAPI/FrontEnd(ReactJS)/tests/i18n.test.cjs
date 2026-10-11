const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '../src/i18n');
const additions = fs.readFileSync(path.join(root, 'legacyAdditions.js'), 'utf8').replace('export const', 'const');
const bridge = fs.readFileSync(path.join(root, 'LegacyI18nBridge.jsx'), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace('export function', 'function').replace('export default function', 'function');

// Deterministic DOM/observer harness: exercise the real bridge effect through language switches.
function harness() {
  let language = 'vi', cleanup, hookIndex = 0, observer;
  const refs = [], elements = [], texts = [];
  class Element {
    constructor(tag = 'div', attrs = {}, parent = null) {
      this.tag = tag; this.attrs = { ...attrs }; this.parentElement = parent; this.isConnected = true; this.nodeType = 1;
      elements.push(this);
    }
    closest(selector) {
      const match = selector.split(',').some(part => {
        const term = part.trim();
        if (term === '[translate="no"]') return this.attrs.translate === 'no';
        if (term === '[data-i18n-ignore="true"]') return this.attrs['data-i18n-ignore'] === 'true';
        return this.tag === term;
      });
      return match ? this : this.parentElement?.closest(selector) || null;
    }
    hasAttribute(name) { return name in this.attrs; }
    getAttribute(name) { return this.attrs[name] ?? null; }
    setAttribute(name, value) { this.attrs[name] = value; }
  }
  const body = new Element('body');
  const context = {
    Element, HTMLElement: Element, Node: { TEXT_NODE: 3 }, NodeFilter: { SHOW_ELEMENT: 1, SHOW_TEXT: 4 },
    document: { body, createTreeWalker: () => {
      const nodes = [...elements, ...texts].filter(node => node.isConnected); let index = 0;
      return { nextNode: () => nodes[index++] || null };
    } },
    MutationObserver: class { constructor(callback) { this.callback = callback; observer = this; } observe() {} disconnect() {} },
    useRef: initial => refs[hookIndex++] ||= { current: initial },
    useTranslation: () => ({ i18n: { language, resolvedLanguage: language } }),
    useEffect: callback => { cleanup = callback(); },
  };
  vm.runInNewContext(additions + '\n' + bridge + '\nglobalThis.api = { LegacyI18nBridge, translateUiText, additionalEnglishUiText };', context);
  return {
    ...context.api, Element,
    text(value, parent = new Element()) { const node = { nodeType: 3, nodeValue: value, parentElement: parent, isConnected: true }; texts.push(node); return node; },
    switchTo(value) { cleanup?.(); language = value; hookIndex = 0; context.api.LegacyI18nBridge(); },
    mutate(target, type = 'characterData') { observer.callback([{ target, type, addedNodes: [] }]); },
    refs,
  };
}
test('all locale namespaces have matching keys and interpolation placeholders', () => {
  const flatten = (value, prefix = '') => Object.entries(value).flatMap(([key, item]) =>
    typeof item === 'object' ? flatten(item, `${prefix}${key}.`) : [[`${prefix}${key}`, item]]);
  for (const name of ['auth', 'common', 'navigation']) {
    const vi = Object.fromEntries(flatten(JSON.parse(fs.readFileSync(path.join(root, `locales/vi/${name}.json`)))));
    const en = Object.fromEntries(flatten(JSON.parse(fs.readFileSync(path.join(root, `locales/en/${name}.json`)))));
    assert.deepEqual(Object.keys(vi).sort(), Object.keys(en).sort(), name);
    for (const key of Object.keys(vi)) {
      assert.ok(en[key]?.trim(), `${name}:${key}`);
      assert.deepEqual(vi[key].match(/\{\{[^}]+\}\}/g) || [], en[key].match(/\{\{[^}]+\}\}/g) || [], `${name}:${key}`);
    }
  }
});
test('supplemental translations are unique and preserve whitespace and variable IDs', () => {
  const h = harness();
  const keys = h.additionalEnglishUiText.map(([key]) => key);
  assert.equal(new Set(keys).size, keys.length);
  for (const [source, target] of h.additionalEnglishUiText) assert.equal(h.translateUiText(source), target);
  assert.equal(h.translateUiText('  Đổi ảnh  '), '  Change photo  ');
  assert.equal(h.translateUiText('Phiên sess-abc đã được lưu trên máy chủ.'), 'Session sess-abc has been saved on the server.');
  assert.equal(h.translateUiText('/scan'), '/scan');
  assert.equal(h.translateUiText('Nguyễn Văn A'), 'Nguyễn Văn A');
});
test('VI → EN → VI restores labels and accessibility attributes repeatedly', () => {
  const h = harness(), input = new h.Element('input', { placeholder: 'Ít nhất 6 ký tự', 'aria-label': 'Đổi ảnh' });
  const label = h.text('Bảo mật & Mật khẩu');
  for (let i = 0; i < 3; i++) {
    h.switchTo('en');
    assert.equal(label.nodeValue, 'Security & password');
    assert.equal(input.getAttribute('placeholder'), 'At least 6 characters');
    assert.equal(input.getAttribute('aria-label'), 'Change photo');
    h.switchTo('vi');
    assert.equal(label.nodeValue, 'Bảo mật & Mật khẩu');
    assert.equal(input.getAttribute('placeholder'), 'Ít nhất 6 ký tự');
  }
});
test('language switch never restores stale text over a React update', () => {
  const h = harness(), label = h.text('Đổi ảnh'), input = new h.Element('input', { title: 'Đổi ảnh' });
  h.switchTo('en');
  label.nodeValue = 'Xóa ảnh'; input.setAttribute('title', 'Xóa ảnh');
  h.switchTo('vi');
  assert.equal(label.nodeValue, 'Xóa ảnh');
  assert.equal(input.getAttribute('title'), 'Xóa ảnh');
});
test('dynamic UI updates in English restore their latest source, not the first one', () => {
  const h = harness(), label = h.text('Đang xử lý');
  h.switchTo('en'); label.nodeValue = 'Phân tích hoàn tất'; h.mutate(label);
  assert.equal(label.nodeValue, 'Analysis complete');
  h.switchTo('vi'); assert.equal(label.nodeValue, 'Phân tích hoàn tất');
});
test('user content, prompts, names, code and ignored attributes stay untouched', () => {
  const h = harness();
  const parents = [new h.Element('p', { translate: 'no', title: 'Đổi ảnh' }),
    new h.Element('div', { 'data-i18n-ignore': 'true' }), new h.Element('textarea'), new h.Element('pre'), new h.Element('code')];
  const nodes = parents.map(parent => h.text('Đổi ảnh', parent));
  h.switchTo('en');
  nodes.forEach(node => assert.equal(node.nodeValue, 'Đổi ảnh'));
  assert.equal(parents[0].getAttribute('title'), 'Đổi ảnh');
  h.switchTo('vi'); nodes.forEach(node => assert.equal(node.nodeValue, 'Đổi ảnh'));
});
test('removed screens are released from translation records', () => {
  const h = harness(), label = h.text('Đổi ảnh'); h.switchTo('en');
  assert.equal(h.refs[0].current.size, 1);
  label.isConnected = false; h.mutate(new h.Element(), 'childList');
  assert.equal(h.refs[0].current.size, 0);
});
