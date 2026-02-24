import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

function loadExportService() {
  const scriptPath = path.resolve('src/content/core/export-service.js');
  const code = fs.readFileSync(scriptPath, 'utf8');

  const sandbox = {
    window: {},
    document: {
      body: {
        appendChild() {},
        removeChild() {}
      },
      createElement() {
        return {
          click() {},
          setAttribute() {},
          remove() {}
        };
      }
    },
    URL: {
      createObjectURL() { return 'blob:test'; },
      revokeObjectURL() {}
    },
    Blob,
    location: { href: 'https://chat.example.com/c/abc' }
  };

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: scriptPath });
  return sandbox.window.ChatNavExportService;
}

test('ExportService builds markdown in turn-block format', () => {
  const ExportService = loadExportService();

  const markdown = ExportService.buildTurnsMarkdown(
    [
      {
        id: 'u1',
        user: {
          id: 'u1',
          text: 'This is a very long user question about export markdown fidelity that should be truncated in heading but preserved in body.'
        },
        assistantText: 'I am fine.'
      }
    ],
    {
      source: 'chatgpt.com',
      url: 'https://chatgpt.com/c/123',
      exportedAt: new Date('2026-02-24T12:00:00Z')
    }
  );

  assert.match(markdown, /# Sinan Export/);
  assert.match(markdown, /- Selected Count: 1/);
  assert.match(markdown, /^## .+\.\.\.$/m);
  assert.doesNotMatch(markdown, /## User/);
  assert.doesNotMatch(markdown, /## Assistant/);
  assert.match(markdown, /This is a very long user question about export markdown fidelity that should be truncated in heading but preserved in body\./);
  assert.match(markdown, /I am fine\./);
});

test('ExportService truncates turn heading but preserves full body text', () => {
  const ExportService = loadExportService();

  const heading = ExportService.buildTurnHeading('12345678901234567890ABCDE', 20);
  assert.equal(heading, '12345678901234567...');

  const longText = '1234567890123456789012345678901234567890123456789012345678901234567890ABCDE';
  const block = ExportService.buildTurnBlock({
    id: 'u1',
    user: { id: 'u1', text: longText },
    assistantText: 'assistant'
  });

  assert.match(block, /^## 1234567890123456789012345678901234567890123456789012345678901\.\.\.$/m);
  assert.match(block, new RegExp(longText));
  assert.match(block, /assistant/);
});

test('ExportService keeps DOM order for multiple turn blocks', () => {
  const ExportService = loadExportService();

  const markdown = ExportService.buildTurnsMarkdown(
    [
      {
        id: 'u1',
        user: { id: 'u1', text: 'First question' },
        assistantText: 'First answer'
      },
      {
        id: 'u2',
        user: { id: 'u2', text: 'Second question' },
        assistantText: 'Second answer'
      }
    ],
    {
      source: 'chatgpt.com',
      url: 'https://chatgpt.com/c/123',
      exportedAt: new Date('2026-02-24T12:00:00Z')
    }
  );

  const firstIndex = markdown.indexOf('## First question');
  const secondIndex = markdown.indexOf('## Second question');
  assert.ok(firstIndex > -1);
  assert.ok(secondIndex > -1);
  assert.ok(firstIndex < secondIndex);
});

test('ExportService builds safe markdown filename', () => {
  const ExportService = loadExportService();

  const name = ExportService.buildFileName(
    {
      user: { text: 'What is <bad>:name? / please' }
    },
    {
      source: 'chatgpt.com',
      exportedAt: new Date('2026-02-24T12:00:00Z')
    }
  );

  assert.match(name, /^sinan-chatgpt\.com-20260224-\d{4}-/);
  assert.match(name, /\.md$/);
  assert.doesNotMatch(name, /[<>:"/\\|?*]/);
});

test('ExportService uses selected-count filename for batch export', () => {
  const ExportService = loadExportService();

  const name = ExportService.buildFileNameForTurns(
    [
      { user: { text: 'first' } },
      { user: { text: 'second' } }
    ],
    {
      source: 'chatgpt.com',
      exportedAt: new Date('2026-02-24T12:00:00Z')
    }
  );

  assert.match(name, /^sinan-chatgpt\.com-20260224-\d{4}-selected-2\.md$/);
});
