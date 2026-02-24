import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

function loadBaseAdapter() {
  const scriptPath = path.resolve('src/content/adapters/base-adapter.js');
  const code = fs.readFileSync(scriptPath, 'utf8');

  const sandbox = {
    window: {},
    document: {},
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    Node: { DOCUMENT_POSITION_FOLLOWING: 4 }
  };

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: scriptPath });
  return sandbox.window.BaseAdapter;
}

test('BaseAdapter pairs user messages with assistant messages between turns', () => {
  const BaseAdapter = loadBaseAdapter();

  const userMessages = [
    { id: 'u1', text: 'Q1', order: 1 },
    { id: 'u2', text: 'Q2', order: 4 },
    { id: 'u3', text: 'Q3', order: 8 }
  ];

  const assistantMessages = [
    { id: 'a1', text: 'A1', order: 2 },
    { id: 'a2', text: 'A2', order: 3 },
    { id: 'a3', text: 'A3', order: 6 }
  ];

  const turns = BaseAdapter.pairMessagesByOrder(userMessages, assistantMessages);

  assert.equal(turns.length, 3);
  assert.equal(turns[0].assistantText, 'A1\n\nA2');
  assert.equal(turns[1].assistantText, 'A3');
  assert.equal(turns[2].assistantText, '');
});
