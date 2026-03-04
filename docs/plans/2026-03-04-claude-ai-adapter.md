# Claude.ai Adapter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 Sinan 增加 `claude.ai` 会话页支持，确保侧边栏导航、TOC 与 Markdown 导出在 Claude 对话中可用。

**Architecture:** 沿用现有 `BaseAdapter -> SiteAdapter -> Sidebar/Core` 分层，不在 UI 层引入站点选择器。Claude 适配器仅负责 DOM 抽取与消息归一化；配对、导出、TOC 继续复用 core 服务，避免新增横切实体。

**Tech Stack:** Chrome Extension MV3, Vanilla JS, Node test runner (`node:test`), Turndown-based export pipeline.

---

## 功能分析（Claude.ai 支持范围）

1. 平台识别与注入
- 在 `manifest.json` 增加 `https://claude.ai/*` 的 `host_permissions` 与 `content_scripts.matches`。
- 在内容脚本注册 `ClaudeAdapter`，并在 background 的支持域名列表增加 `claude.ai`。

2. 用户消息抽取
- 以 `data-testid="user-message"` 作为主选择器。
- 提取可见文本作为导航标题源，绑定稳定 `id` 供滚动定位。

3. 助手消息抽取
- 以 `.font-claude-response` 作为主容器，优先抽取内部 `.standard-markdown` 的 `html/text`。
- 保留 `html` 供 Turndown 转 markdown，保障导出结构化内容质量。

4. 对话 turn 配对与导航
- 复用 `BaseAdapter.pairMessagesByOrder`，确保用户消息与其后 Claude 响应正确配对。
- 复用现有 Sidebar / TOC / Export，不新增业务层实体。

5. 稳定性与回归
- 增加 Claude adapter 单测（用户抽取、助手抽取、结构化 html 保留）。
- 回归全量测试，保证不破坏已支持站点。

### Task 1: Claude 用户消息抽取（TDD）

**Files:**
- Create: `tests/claude-adapter.test.mjs`
- Modify: `src/content/adapters/claude-adapter.js`

**Step 1: Write the failing test**
- 在 `tests/claude-adapter.test.mjs` 增加：`getUserMessages()` 能从 `data-testid="user-message"` 提取文本并生成可滚动 `id`。

**Step 2: Run test to verify it fails**
Run: `node --test tests/claude-adapter.test.mjs`
Expected: FAIL（`ClaudeAdapter` 未定义或提取为空）

**Step 3: Write minimal implementation**
- 新建 `ClaudeAdapter`，实现：
  - `domain -> "claude.ai"`
  - `getUserMessages()`：选择器提取 + 文本归一化 + id 注入

**Step 4: Run test to verify it passes**
Run: `node --test tests/claude-adapter.test.mjs`
Expected: PASS

**Step 5: Commit**
```bash
git add tests/claude-adapter.test.mjs src/content/adapters/claude-adapter.js
git commit -m "feat: add claude user message extraction"
```

### Task 2: Claude 助手消息抽取与富文本保留（TDD）

**Files:**
- Modify: `tests/claude-adapter.test.mjs`
- Modify: `src/content/adapters/claude-adapter.js`

**Step 1: Write the failing test**
- 补充断言：`getAssistantMessages()` 能抽取 `.font-claude-response`，并优先输出 `.standard-markdown` 的 `html` 与 `text`。

**Step 2: Run test to verify it fails**
Run: `node --test tests/claude-adapter.test.mjs`
Expected: FAIL（缺少 assistant 抽取/`html` 字段）

**Step 3: Write minimal implementation**
- 在 `ClaudeAdapter` 增加：
  - `getAssistantMessages()`
  - `getScrollContainer()`（Claude 主内容滚动容器回退 `document.documentElement`）
  - `observeMutations()`（沿用站点通用 debounce 模式）

**Step 4: Run test to verify it passes**
Run: `node --test tests/claude-adapter.test.mjs`
Expected: PASS

**Step 5: Commit**
```bash
git add tests/claude-adapter.test.mjs src/content/adapters/claude-adapter.js
git commit -m "feat: add claude assistant extraction and rich payload"
```

### Task 3: 平台接入 wiring（Manifest / Content / Background）

**Files:**
- Modify: `manifest.json`
- Modify: `src/content/content.js`
- Modify: `src/background/background.js`

**Step 1: Write the failing test/check**
- 先运行全量测试确认现状。

**Step 2: Run baseline check**
Run: `npm test`
Expected: PASS（作为改动前基线）

**Step 3: Write minimal implementation**
- `manifest.json`：新增 `claude.ai` match + script `src/content/adapters/claude-adapter.js`
- `content.js`：注册 `new window.ClaudeAdapter()`
- `background.js`：`supportedDomains` 增加 `claude.ai`

**Step 4: Run regression test**
Run: `npm test`
Expected: PASS

**Step 5: Commit**
```bash
git add manifest.json src/content/content.js src/background/background.js
git commit -m "feat: wire claude domain into extension entrypoints"
```

### Task 4: 导出与 TOC 回归验证

**Files:**
- Optional Modify: `tests/export-service-rich.test.mjs`（仅在发现 Claude 特殊结构导致回归时）

**Step 1: Verify targeted adapter test**
Run: `node --test tests/claude-adapter.test.mjs`
Expected: PASS

**Step 2: Verify full test suite**
Run: `npm test`
Expected: PASS（全量）

**Step 3: Manual smoke checklist（Claude.ai 实页）**
- 打开 Claude 对话页，验证侧边栏出现。
- 点击用户条目可定位对应 turn。
- 点击下载导出，检查 markdown 保留标题/列表/代码块。

**Step 4: Commit (if any test/doc adjustments)**
```bash
git add tests
git commit -m "test: cover claude adapter extraction and regressions"
```

### Task 5: 文档与交付收尾

**Files:**
- Optional Modify: `README.md`
- Optional Modify: `docs/WEBSTORE_LISTING.md`

**Step 1: Update supported platforms text（如需要）**
- 将 Claude 纳入已支持平台文案（避免运行能力与文档描述不一致）。

**Step 2: Final verification**
Run: `npm test`
Expected: PASS

**Step 3: Commit**
```bash
git add README.md docs/WEBSTORE_LISTING.md
# 仅当文档确有变更时提交
git commit -m "docs: add claude to supported platforms"
```
