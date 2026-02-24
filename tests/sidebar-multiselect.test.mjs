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
  sidebar.selectedIds = new Set(['u3', 'u1']);
  sidebar.showToast = () => {};

  let exportedTurns = null;
  sandbox.window.ChatNavExportService = {
    exportTurnsAsMarkdown(turns) {
      exportedTurns = turns;
      return { ok: true, fileName: 'demo.md', count: turns.length };
    }
  };

  sidebar.handleExportClick();

  assert.ok(exportedTurns);
  assert.deepEqual(
    exportedTurns.map(turn => turn.user.id),
    ['u1', 'u3']
  );
});

test('SidebarUI export button state follows selected count', () => {
  const { SidebarUI } = loadSidebar();

  const sidebar = new SidebarUI({});
  const exportBtn = {
    disabled: true,
    title: '',
    attrs: {},
    setAttribute(key, value) {
      this.attrs[key] = value;
    }
  };

  sidebar.shadowRoot = {
    querySelector(selector) {
      return selector === '.export-btn' ? exportBtn : null;
    }
  };

  sidebar.updateExportButtonState();
  assert.equal(exportBtn.disabled, true);
  assert.match(exportBtn.title, /Select messages to export/);
  assert.equal(exportBtn.attrs['aria-label'], exportBtn.title);

  sidebar.selectedIds.add('u1');
  sidebar.updateExportButtonState();
  assert.equal(exportBtn.disabled, false);
  assert.match(exportBtn.title, /Export 1 selected message as Markdown/);

  sidebar.selectedIds.add('u2');
  sidebar.updateExportButtonState();
  assert.equal(exportBtn.disabled, false);
  assert.match(exportBtn.title, /Export 2 selected messages as Markdown/);
});
