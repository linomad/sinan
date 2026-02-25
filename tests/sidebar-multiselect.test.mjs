import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

function loadSidebar() {
  const scriptPath = path.resolve('src/content/core/sidebar.js');
  const code = fs.readFileSync(scriptPath, 'utf8');

  const sandbox = {
    window: {
      location: { href: 'https://chat.example.com/c/abc' }
    },
    document: {}
  };

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: scriptPath });

  return {
    SidebarUI: sandbox.window.SidebarUI,
    sandbox
  };
}

test('SidebarUI exports selected turns in conversation order', () => {
  const { SidebarUI, sandbox } = loadSidebar();

  const adapter = {
    domain: 'chatgpt.com',
    getConversationTurns() {
      return [
        { user: { id: 'u1', text: 'first' }, assistantText: 'a1' },
        { user: { id: 'u2', text: 'second' }, assistantText: 'a2' },
        { user: { id: 'u3', text: 'third' }, assistantText: 'a3' }
      ];
    }
  };

  const sidebar = new SidebarUI(adapter);
  sidebar.isExportMode = true;
  sidebar.selectedIds = new Set(['u3', 'u1']);
  sidebar.showToast = () => {};

  let exportedTurns = null;
  sandbox.window.ChatNavExportService = {
    exportTurnsAsMarkdown(turns) {
      exportedTurns = turns;
      return { ok: true, fileName: 'demo.md', count: turns.length };
    }
  };

  sidebar.handleDownloadClick();

  assert.ok(exportedTurns);
  assert.deepEqual(
    exportedTurns.map(turn => turn.user.id),
    ['u1', 'u3']
  );
  assert.equal(sidebar.isExportMode, false);
  assert.equal(sidebar.selectedIds.size, 0);
});

test('SidebarUI enters export mode when header export button is clicked', () => {
  const { SidebarUI, sandbox } = loadSidebar();

  const sidebar = new SidebarUI({
    getConversationTurns() {
      return [{ user: { id: 'u1', text: 'first' }, assistantText: 'a1' }];
    }
  });
  sidebar.showToast = () => {};
  sidebar.hasMessages = true;

  let called = false;
  sandbox.window.ChatNavExportService = {
    exportTurnsAsMarkdown() {
      called = true;
      return { ok: true, fileName: 'demo.md', count: 1 };
    }
  };

  sidebar.handleExportClick();
  assert.equal(sidebar.isExportMode, true);
  assert.equal(called, false);
});

test('SidebarUI click behavior differs by mode: browse vs export select', () => {
  const { SidebarUI } = loadSidebar();

  let scrollCount = 0;
  const adapter = {
    scrollToElement() {
      scrollCount += 1;
    }
  };
  const sidebar = new SidebarUI(adapter);

  const msg = {
    id: 'u1',
    element: {
      isConnected: true
    }
  };

  sidebar.handleNavItemClick(msg, 'u1');
  assert.equal(scrollCount, 1);
  assert.equal(sidebar.selectedIds.size, 0);

  sidebar.isExportMode = true;
  sidebar.handleNavItemClick(msg, 'u1');
  assert.equal(scrollCount, 1);
  assert.equal(sidebar.selectedIds.has('u1'), true);
});

test('SidebarUI cancel exits export mode and clears selected ids', () => {
  const { SidebarUI } = loadSidebar();

  const sidebar = new SidebarUI({});
  sidebar.isExportMode = true;
  sidebar.selectedIds = new Set(['u1', 'u2']);
  sidebar.handleCancelExportClick();

  assert.equal(sidebar.isExportMode, false);
  assert.equal(sidebar.selectedIds.size, 0);
});

test('SidebarUI download in export mode requires selected ids', () => {
  const { SidebarUI } = loadSidebar();

  const sidebar = new SidebarUI({
    getConversationTurns() {
      return [{ user: { id: 'u1', text: 'first' }, assistantText: 'a1' }];
    }
  });
  sidebar.isExportMode = true;
  let message = '';
  sidebar.showToast = (value) => {
    message = value;
  };
  sidebar.handleDownloadClick();

  assert.match(message, /Select messages first/);
  assert.equal(sidebar.isExportMode, true);
  assert.equal(sidebar.selectedIds.size, 0);
});

test('SidebarUI updates footer count and download enabled when toggling selection in export mode', () => {
  const { SidebarUI } = loadSidebar();

  const sidebar = new SidebarUI({});
  sidebar.isExportMode = true;
  sidebar.hasMessages = true;

  const exportBtn = {
    disabled: false,
    title: '',
    attrs: {},
    setAttribute(key, value) {
      this.attrs[key] = value;
    }
  };
  const footer = {
    classList: {
      toggle() {}
    }
  };
  const countEl = {
    textContent: '已选 0 条'
  };
  const downloadBtn = {
    disabled: true
  };

  sidebar.shadowRoot = {
    querySelector(selector) {
      if (selector === '.export-btn') return exportBtn;
      if (selector === '.export-footer') return footer;
      if (selector === '.footer-selection-count') return countEl;
      if (selector === '.footer-download-btn') return downloadBtn;
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };

  sidebar.toggleSelectedItem('u1');
  assert.equal(countEl.textContent, '已选 1 条');
  assert.equal(downloadBtn.disabled, false);
});
