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

