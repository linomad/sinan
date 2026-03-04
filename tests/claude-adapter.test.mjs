import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

function loadClaudeAdapter(documentStub) {
  const baseAdapterPath = path.resolve('src/content/adapters/base-adapter.js');
  const claudeAdapterPath = path.resolve('src/content/adapters/claude-adapter.js');
  const baseAdapterCode = fs.readFileSync(baseAdapterPath, 'utf8');
  const claudeAdapterCode = fs.readFileSync(claudeAdapterPath, 'utf8');

  const sandbox = {
    window: {
      location: {
        hostname: 'claude.ai'
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
  vm.runInContext(claudeAdapterCode, sandbox, { filename: claudeAdapterPath });
  return sandbox.window.ClaudeAdapter;
}

test('ClaudeAdapter extracts user messages from data-testid user nodes', () => {
  const userElements = [
    {
      id: '',
      innerText: 'First question\nwith line break'
    },
    {
      id: '',
      innerText: '   '
    },
    {
      id: 'existing-user-id',
      innerText: 'Second question'
    }
  ];

  const ClaudeAdapter = loadClaudeAdapter({
    querySelectorAll(selector) {
      if (selector === '[data-testid="user-message"]') return userElements;
      return [];
    },
    querySelector() {
      return null;
    },
    documentElement: {}
  });

  const adapter = new ClaudeAdapter();
  const messages = adapter.getUserMessages();

  assert.equal(messages.length, 2);
  assert.equal(messages[0].id, 'chat-nav-claude-user-0');
  assert.equal(messages[0].text, 'First question with line break');
  assert.equal(messages[1].id, 'existing-user-id');
  assert.equal(messages[1].text, 'Second question');
});

test('ClaudeAdapter extracts assistant messages and preserves rich html payload', () => {
  const markdownNode = {
    innerText: 'Section title\nDetailed answer',
    innerHTML: '<h2>Section title</h2><p>Detailed answer</p>'
  };

  const assistantElements = [
    {
      id: '',
      innerText: 'status line\nSection title\nDetailed answer',
      innerHTML: '<div>outer assistant html</div>',
      querySelector(selector) {
        if (selector === '.standard-markdown') return markdownNode;
        if (selector === '.progressive-markdown') return null;
        return null;
      }
    },
    {
      id: 'existing-assistant-id',
      innerText: 'Fallback answer',
      innerHTML: '<p>Fallback answer</p>',
      querySelector() {
        return null;
      }
    }
  ];

  const ClaudeAdapter = loadClaudeAdapter({
    querySelectorAll(selector) {
      if (selector === '[data-testid="user-message"]') return [];
      if (selector === 'div.font-claude-response') return assistantElements;
      return [];
    },
    querySelector() {
      return null;
    },
    documentElement: {}
  });

  const adapter = new ClaudeAdapter();
  const messages = adapter.getAssistantMessages();

  assert.equal(messages.length, 2);
  assert.equal(messages[0].id, 'chat-nav-claude-assistant-0');
  assert.equal(messages[0].text, 'Section title Detailed answer');
  assert.equal(messages[0].html, '<h2>Section title</h2><p>Detailed answer</p>');
  assert.equal(messages[1].id, 'existing-assistant-id');
  assert.equal(messages[1].text, 'Fallback answer');
  assert.equal(messages[1].html, '<p>Fallback answer</p>');
});

test('ClaudeAdapter prefers Claude chat scroll container when available', () => {
  const scrollContainer = { id: 'claude-scroll-container' };

  const ClaudeAdapter = loadClaudeAdapter({
    querySelectorAll() {
      return [];
    },
    querySelector(selector) {
      if (selector === 'div.overflow-y-scroll.overflow-x-hidden.pt-6.flex-1') {
        return scrollContainer;
      }
      return null;
    },
    documentElement: { id: 'doc-root' }
  });

  const adapter = new ClaudeAdapter();
  assert.equal(adapter.getScrollContainer(), scrollContainer);
});
