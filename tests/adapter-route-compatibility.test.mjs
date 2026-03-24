import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

function loadAdapterClass({ adapterScript, adapterClassName, location }) {
  const baseAdapterPath = path.resolve('src/content/adapters/base-adapter.js');
  const adapterPath = path.resolve(adapterScript);
  const baseAdapterCode = fs.readFileSync(baseAdapterPath, 'utf8');
  const adapterCode = fs.readFileSync(adapterPath, 'utf8');

  const sandbox = {
    window: {
      location: {
        hostname: location.hostname,
        pathname: location.pathname
      }
    },
    document: {
      querySelector() { return null; },
      querySelectorAll() { return []; },
      documentElement: {}
    },
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
  vm.runInContext(adapterCode, sandbox, { filename: adapterPath });

  return sandbox.window[adapterClassName];
}

test('ChatGPTAdapter excludes /codex routes but keeps chat routes compatible', () => {
  const ChatGPTAdapterBlocked = loadAdapterClass({
    adapterScript: 'src/content/adapters/chatgpt-adapter.js',
    adapterClassName: 'ChatGPTAdapter',
    location: {
      hostname: 'chatgpt.com',
      pathname: '/codex/workspace'
    }
  });

  const blockedAdapter = new ChatGPTAdapterBlocked();
  assert.equal(blockedAdapter.isCompatible(), false);

  const ChatGPTAdapterAllowed = loadAdapterClass({
    adapterScript: 'src/content/adapters/chatgpt-adapter.js',
    adapterClassName: 'ChatGPTAdapter',
    location: {
      hostname: 'chatgpt.com',
      pathname: '/c/abc123'
    }
  });

  const allowedAdapter = new ChatGPTAdapterAllowed();
  assert.equal(allowedAdapter.isCompatible(), true);
});

test('DoubaoAdapter excludes /chat/settings routes but keeps conversation routes compatible', () => {
  const DoubaoAdapterBlocked = loadAdapterClass({
    adapterScript: 'src/content/adapters/doubao-adapter.js',
    adapterClassName: 'DoubaoAdapter',
    location: {
      hostname: 'www.doubao.com',
      pathname: '/chat/settings/profile'
    }
  });

  const blockedAdapter = new DoubaoAdapterBlocked();
  assert.equal(blockedAdapter.isCompatible(), false);

  const DoubaoAdapterAllowed = loadAdapterClass({
    adapterScript: 'src/content/adapters/doubao-adapter.js',
    adapterClassName: 'DoubaoAdapter',
    location: {
      hostname: 'www.doubao.com',
      pathname: '/chat/123456'
    }
  });

  const allowedAdapter = new DoubaoAdapterAllowed();
  assert.equal(allowedAdapter.isCompatible(), true);
});

test('DeepSeekAdapter keeps /a/chat routes compatible but excludes non-chat routes', () => {
  const DeepSeekAdapterBlocked = loadAdapterClass({
    adapterScript: 'src/content/adapters/deepseek-adapter.js',
    adapterClassName: 'DeepSeekAdapter',
    location: {
      hostname: 'chat.deepseek.com',
      pathname: '/pricing'
    }
  });

  const blockedAdapter = new DeepSeekAdapterBlocked();
  assert.equal(blockedAdapter.isCompatible(), false);

  const DeepSeekAdapterAllowed = loadAdapterClass({
    adapterScript: 'src/content/adapters/deepseek-adapter.js',
    adapterClassName: 'DeepSeekAdapter',
    location: {
      hostname: 'chat.deepseek.com',
      pathname: '/a/chat/s/abc123'
    }
  });

  const allowedAdapter = new DeepSeekAdapterAllowed();
  assert.equal(allowedAdapter.isCompatible(), true);
});
