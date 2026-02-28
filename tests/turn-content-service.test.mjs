import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const TurndownService = require('turndown');
const turndownPluginGfm = require('turndown-plugin-gfm');

function loadTurnContentService() {
  const scriptPath = path.resolve('src/content/core/turn-content-service.js');
  const code = fs.readFileSync(scriptPath, 'utf8');

  const sandbox = {
    window: {
      TurndownService,
      turndownPluginGfm
    },
    DOMParser: globalThis.DOMParser,
    document: {}
  };

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: scriptPath });
  return sandbox.window.ChatNavTurnContentService;
}

test('TurnContentService converts rich HTML to markdown with code fences and list items', () => {
  const TurnContentService = loadTurnContentService();

  const markdown = TurnContentService.htmlToMarkdown(
    '<h2>Plan</h2><p>Hello <strong>World</strong></p><ul><li>One</li><li>Two</li></ul><pre><code class="language-js">const x = 1;\\nconsole.log(x);</code></pre>'
  );

  assert.match(markdown, /## Plan/);
  assert.match(markdown, /Hello \*\*World\*\*/);
  assert.match(markdown, /-\s+One/);
  assert.match(markdown, /-\s+Two/);
  assert.match(markdown, /```js/);
  assert.match(markdown, /const x = 1;/);
});

test('TurnContentService prefers assistant rich segments over flattened assistantText', () => {
  const TurnContentService = loadTurnContentService();

  const assistantMarkdown = TurnContentService.buildAssistantMarkdown({
    assistantText: 'flattened text fallback',
    assistantSegments: [
      {
        html: '<p>Structured <strong>answer</strong></p>'
      }
    ]
  });

  assert.match(assistantMarkdown, /Structured \*\*answer\*\*/);
  assert.doesNotMatch(assistantMarkdown, /flattened text fallback/);
});
