import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

function loadGeminiAdapter(documentStub) {
  const baseAdapterPath = path.resolve('src/content/adapters/base-adapter.js');
  const geminiAdapterPath = path.resolve('src/content/adapters/gemini-adapter.js');
  const baseAdapterCode = fs.readFileSync(baseAdapterPath, 'utf8');
  const geminiAdapterCode = fs.readFileSync(geminiAdapterPath, 'utf8');

  const sandbox = {
    window: {
      location: {
        hostname: 'gemini.google.com'
      }
    },
    document: documentStub,
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    setTimeout: () => 0,
    clearTimeout() {},
    console: {
      log() {},
      warn() {},
      error() {}
    },
    Node: { DOCUMENT_POSITION_FOLLOWING: 4 }
  };

  vm.createContext(sandbox);
  vm.runInContext(baseAdapterCode, sandbox, { filename: baseAdapterPath });
  vm.runInContext(geminiAdapterCode, sandbox, { filename: geminiAdapterPath });
  return sandbox.window.GeminiAdapter;
}

function createSanitizableNode({ text, html, hiddenTexts = [] }) {
  return {
    innerText: text,
    innerHTML: html,
    cloneNode() {
      const state = { text, html };
      const hiddenNodes = hiddenTexts.map((hiddenText) => ({
        remove() {
          state.text = state.text.split(hiddenText).join(' ');
          state.html = state.html.split(hiddenText).join('');
        }
      }));

      return {
        querySelectorAll(selector) {
          if (
            selector.includes('.cdk-visually-hidden')
            || selector.includes('.visually-hidden')
            || selector.includes('.sr-only')
            || selector.includes('.screen-reader-only')
            || selector.includes('[aria-hidden="true"]')
            || selector.includes('[hidden]')
          ) {
            return hiddenNodes;
          }
          return [];
        },
        get innerText() {
          return state.text;
        },
        get innerHTML() {
          return state.html;
        }
      };
    }
  };
}

test('GeminiAdapter strips hidden speaker labels from extracted user message text', () => {
  const userQueryNode = createSanitizableNode({
    text: '你说   帮我起个项目名字',
    html: '<span class="cdk-visually-hidden">你说</span><p>帮我起个项目名字</p>',
    hiddenTexts: ['你说']
  });
  const userElement = {
    id: '',
    querySelector(selector) {
      if (selector === '.query-text') return userQueryNode;
      return null;
    }
  };

  const GeminiAdapter = loadGeminiAdapter({
    querySelectorAll(selector) {
      if (selector === 'user-query') return [userElement];
      if (selector === '[data-test-id="user-query"]') return [];
      if (selector === 'model-response') return [];
      if (selector === '[data-test-id="model-response"]') return [];
      return [];
    },
    querySelector() {
      return null;
    },
    documentElement: {}
  });

  const adapter = new GeminiAdapter();
  const messages = adapter.getUserMessages();

  assert.equal(messages.length, 1);
  assert.equal(messages[0].text, '帮我起个项目名字');
  assert.doesNotMatch(messages[0].html, /你说/);
});
