import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

function loadYuanbaoAdapter(documentStub) {
  const baseAdapterPath = path.resolve('src/content/adapters/base-adapter.js');
  const yuanbaoAdapterPath = path.resolve('src/content/adapters/yuanbao-adapter.js');
  const baseAdapterCode = fs.readFileSync(baseAdapterPath, 'utf8');
  const yuanbaoAdapterCode = fs.readFileSync(yuanbaoAdapterPath, 'utf8');

  const observerInstances = [];
  class MutationObserverStub {
    constructor(callback) {
      this.callback = callback;
      this.observed = [];
      observerInstances.push(this);
    }

    observe(target, options) {
      this.observed.push({ target, options });
    }

    disconnect() {}
  }

  const sandbox = {
    window: {
      location: {
        hostname: 'yuanbao.tencent.com',
        pathname: '/'
      },
      ChatNavUtils: {
        hashCode(input) {
          return String(input || '').length;
        }
      }
    },
    document: documentStub,
    MutationObserver: MutationObserverStub,
    setTimeout: () => 1,
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
  vm.runInContext(yuanbaoAdapterCode, sandbox, { filename: yuanbaoAdapterPath });

  return {
    YuanbaoAdapter: sandbox.window.YuanbaoAdapter,
    observerInstances
  };
}

test('YuanbaoAdapter observeMutations watches stable chat-content container first', () => {
  const chatContentNode = { id: 'chat-content' };
  const chatListNode = { className: 'agent-chat__list__content' };
  const bodyNode = { tagName: 'BODY' };

  const { YuanbaoAdapter, observerInstances } = loadYuanbaoAdapter({
    querySelector(selector) {
      if (selector === '#chat-content') return chatContentNode;
      if (selector === '.agent-chat__list__content') return chatListNode;
      return null;
    },
    querySelectorAll() {
      return [];
    },
    body: bodyNode,
    documentElement: {}
  });

  const adapter = new YuanbaoAdapter();
  adapter.observeMutations(() => {});

  assert.equal(observerInstances.length, 1);
  assert.equal(observerInstances[0].observed.length, 1);
  assert.equal(observerInstances[0].observed[0].target, chatContentNode);
  assert.equal(observerInstances[0].observed[0].options.childList, true);
  assert.equal(observerInstances[0].observed[0].options.subtree, true);
});

test('YuanbaoAdapter observeMutations falls back to body when chat-content is unavailable', () => {
  const bodyNode = { tagName: 'BODY' };

  const { YuanbaoAdapter, observerInstances } = loadYuanbaoAdapter({
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    body: bodyNode,
    documentElement: {}
  });

  const adapter = new YuanbaoAdapter();
  adapter.observeMutations(() => {});

  assert.equal(observerInstances.length, 1);
  assert.equal(observerInstances[0].observed.length, 1);
  assert.equal(observerInstances[0].observed[0].target, bodyNode);
});

test('YuanbaoAdapter extracts assistant markdown from reasoner final text block', () => {
  const answerMarkdownNode = {
    innerText: '一、工作流程\n二、技术原理',
    innerHTML: '<h3>一、工作流程</h3><h3>二、技术原理</h3>'
  };
  const thinkMarkdownNode = {
    innerText: '这是思考过程，不应作为最终回答',
    innerHTML: '<p>这是思考过程，不应作为最终回答</p>'
  };
  const assistantElement = {
    id: '',
    querySelector(selector) {
      if (selector === '.hyc-component-reasoner__text .hyc-common-markdown') return answerMarkdownNode;
      if (selector === '.hyc-content-md .hyc-common-markdown') return thinkMarkdownNode;
      if (selector === '.hyc-content-text') return null;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.hyc-component-reasoner__text .hyc-common-markdown') return [answerMarkdownNode];
      if (selector === '.hyc-content-md .hyc-common-markdown') return [thinkMarkdownNode, answerMarkdownNode];
      return [];
    }
  };

  const { YuanbaoAdapter } = loadYuanbaoAdapter({
    querySelector() {
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.agent-chat__list__item--ai, .agent-chat__list__item--bot') {
        return [assistantElement];
      }
      return [];
    },
    body: { tagName: 'BODY' },
    documentElement: {}
  });

  const adapter = new YuanbaoAdapter();
  const messages = adapter.getAssistantMessages();

  assert.equal(messages.length, 1);
  assert.equal(messages[0].text, '一、工作流程 二、技术原理');
  assert.equal(messages[0].html, '<h3>一、工作流程</h3><h3>二、技术原理</h3>');
  assert.equal(messages[0].element, answerMarkdownNode);
});
