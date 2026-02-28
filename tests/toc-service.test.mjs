import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

function loadTocService() {
  const turnContentPath = path.resolve('src/content/core/turn-content-service.js');
  const tocPath = path.resolve('src/content/core/toc-service.js');
  const turnContentCode = fs.readFileSync(turnContentPath, 'utf8');
  const tocCode = fs.readFileSync(tocPath, 'utf8');

  const sandbox = {
    window: {},
    DOMParser: globalThis.DOMParser,
    document: {}
  };

  vm.createContext(sandbox);
  vm.runInContext(turnContentCode, sandbox, { filename: turnContentPath });
  vm.runInContext(tocCode, sandbox, { filename: tocPath });

  return sandbox.window.ChatNavTocService;
}

test('TocService extracts ATX headings and ignores fenced code block headings', () => {
  const TocService = loadTocService();

  const toc = TocService.extractMarkdownToc(`
# Title

## Step 1

\`\`\`md
### this should not be included
\`\`\`

### Step 1.1
`);

  const plainToc = JSON.parse(JSON.stringify(toc));
  assert.deepEqual(plainToc, [
    { level: 1, text: 'Title' },
    { level: 2, text: 'Step 1' },
    { level: 3, text: 'Step 1.1' }
  ]);
});

test('TocService extracts turn toc from assistant markdown content', () => {
  const TocService = loadTocService();

  const toc = TocService.extractTurnToc({
    assistantSegments: [
      {
        markdown: '# Overview\n\n## Details\n\ntext'
      }
    ]
  });

  const plainToc = JSON.parse(JSON.stringify(toc));
  assert.deepEqual(plainToc, [
    { level: 1, text: 'Overview' },
    { level: 2, text: 'Details' }
  ]);
});

test('TocService extracts only standard h1-h6 headings from assistant DOM segments', () => {
  const TocService = loadTocService();

  const headingH2 = { tagName: 'H2', textContent: ' Overview ' };
  const headingH4 = { tagName: 'H4', textContent: ' Deep Dive ' };
  const segmentEl = {
    querySelectorAll(selector) {
      if (selector !== 'h1,h2,h3,h4,h5,h6') {
        throw new Error('unexpected selector');
      }
      return [headingH2, headingH4];
    }
  };
  const nonStandardSegmentEl = {
    querySelectorAll() {
      return [];
    }
  };

  const toc = TocService.extractTurnDomHeadings({
    assistantSegments: [
      { element: segmentEl },
      { element: nonStandardSegmentEl }
    ]
  });

  const plainToc = JSON.parse(JSON.stringify(
    toc.map(item => ({
      level: item.level,
      text: item.text,
      segmentIndex: item.segmentIndex,
      headingIndex: item.headingIndex
    }))
  ));

  assert.deepEqual(plainToc, [
    { level: 2, text: 'Overview', segmentIndex: 0, headingIndex: 0 },
    { level: 4, text: 'Deep Dive', segmentIndex: 0, headingIndex: 1 }
  ]);
});
