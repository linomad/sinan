import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

function loadDeepSeekAdapter(documentStub, location = { hostname: 'chat.deepseek.com', pathname: '/a/chat/s/abc' }) {
  const baseAdapterPath = path.resolve('src/content/adapters/base-adapter.js');
  const deepSeekAdapterPath = path.resolve('src/content/adapters/deepseek-adapter.js');
  const baseAdapterCode = fs.readFileSync(baseAdapterPath, 'utf8');
  const deepSeekAdapterCode = fs.readFileSync(deepSeekAdapterPath, 'utf8');

  const sandbox = {
    window: {
      location: {
        hostname: location.hostname,
        pathname: location.pathname
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
  vm.runInContext(deepSeekAdapterCode, sandbox, { filename: deepSeekAdapterPath });
  return sandbox.window.DeepSeekAdapter;
}

function createListItemMessage({ key, kind, text, html }) {
  const listItem = {
    getAttribute(name) {
      if (name === 'data-virtual-list-item-key') return String(key);
      return null;
    }
  };

  const contentNode = {
    innerText: text,
    innerHTML: html || text
  };

  const messageElement = {
    id: '',
    innerText: text,
    innerHTML: html || text,
    firstElementChild: contentNode,
    closest(selector) {
      if (selector === '[data-virtual-list-item-key]') return listItem;
      return null;
    },
    querySelector(selector) {
      if (selector === '.ds-markdown' && kind === 'assistant') return contentNode;
      return null;
    }
  };

  listItem.children = [messageElement];
  listItem.querySelector = (selector) => {
    if (selector === '.ds-message') return messageElement;
    return null;
  };

  return { listItem, messageElement };
}

test('DeepSeekAdapter extracts user and assistant messages from virtual list items', () => {
  const user = createListItemMessage({
    key: 1,
    kind: 'user',
    text: '  请帮我写个脚本\n并给出解释  ',
    html: '<div>请帮我写个脚本</div>'
  });

  const assistant = createListItemMessage({
    key: 2,
    kind: 'assistant',
    text: '可以，下面是示例\n请先安装依赖',
    html: '<p>可以，下面是示例</p><p>请先安装依赖</p>'
  });

  const DeepSeekAdapter = loadDeepSeekAdapter({
    querySelectorAll(selector) {
      if (selector.includes('[data-virtual-list-item-key]')) {
        return [user.listItem, assistant.listItem];
      }
      return [];
    },
    querySelector() {
      return null;
    },
    documentElement: {}
  });

  const adapter = new DeepSeekAdapter();
  const userMessages = adapter.getUserMessages();
  const assistantMessages = adapter.getAssistantMessages();

  assert.equal(userMessages.length, 1);
  assert.equal(userMessages[0].id, 'chat-nav-deepseek-user-1');
  assert.equal(userMessages[0].text, '请帮我写个脚本 并给出解释');

  assert.equal(assistantMessages.length, 1);
  assert.equal(assistantMessages[0].id, 'chat-nav-deepseek-assistant-2');
  assert.equal(assistantMessages[0].text, '可以，下面是示例 请先安装依赖');
  assert.equal(assistantMessages[0].html, '<p>可以，下面是示例</p><p>请先安装依赖</p>');
});

test('DeepSeekAdapter prefers chat scroll area around printable virtual list', () => {
  const scrollArea = { id: 'deepseek-scroll-area' };
  const printableList = {
    closest(selector) {
      if (selector === '.ds-scroll-area') return scrollArea;
      return null;
    }
  };

  const DeepSeekAdapter = loadDeepSeekAdapter({
    querySelectorAll() {
      return [];
    },
    querySelector(selector) {
      if (selector === '.ds-virtual-list.ds-virtual-list--printable') return printableList;
      return null;
    },
    documentElement: { id: 'doc-root' }
  });

  const adapter = new DeepSeekAdapter();
  assert.equal(adapter.getScrollContainer(), scrollArea);
});
