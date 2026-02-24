# Sinan 导出 Markdown 功能设计与完成情况

## 1. 背景与目标

目标：在侧边栏选择某条用户消息后，可一键导出该条目及对应 AI 回复为 Markdown 文件。

约束：
- 与当前 UI 风格协调，低侵入。
- 保持架构分层清晰，不把站点 DOM 细节泄漏到 UI 层。
- 优先保证可维护性与可扩展性。

## 2. 最终方案（已落地）

### 2.1 UI 集成

采用 Header 右上角导出按钮（推荐方案）：
- 未选中条目时按钮 disabled。
- 选中条目后按钮激活。
- 导出后以轻量 toast 显示结果。

优势：
- 不改变列表行高与信息密度。
- 与现有折叠按钮位置一致，认知成本低。
- 交互路径明确（先选中再导出）。

### 2.2 分层设计

- Adapter 层：新增 `getAssistantMessages()`，并由 `BaseAdapter` 提供 `getConversationTurns()` 进行 user/assistant turn 配对。
- Core 层：新增 `ExportService`（Markdown 组装、文件名规范化、下载触发）。
- UI 层：只负责选中态、点击导出、反馈提示，不处理站点选择器。

### 2.3 数据流

1. 用户点击侧边栏条目 -> 设置 `selectedId`。
2. 用户点击导出按钮 -> `SidebarUI` 调用 `adapter.getConversationTurns()`。
3. 找到 selected turn -> `ChatNavExportService.exportTurnAsMarkdown(turn, meta)`。
4. `ExportService` 生成 markdown + 安全文件名 -> 触发浏览器下载。

## 3. 已完成实现

### 3.1 新增/修改模块

- 新增导出服务：`src/content/core/export-service.js`
- 新增转换依赖（npm）：`turndown` + `turndown-plugin-gfm`
- 新增运行时 vendor：`src/content/vendor/turndown.js`、`src/content/vendor/turndown-plugin-gfm.js`
- 扩展抽象：`src/content/adapters/base-adapter.js`
- 适配器支持 assistant 抽取：
  - `src/content/adapters/chatgpt-adapter.js`
  - `src/content/adapters/gemini-adapter.js`
  - `src/content/adapters/doubao-adapter.js`
  - `src/content/adapters/qwen-adapter.js`
  - `src/content/adapters/perplexity-adapter.js`
  - `src/content/adapters/yuanbao-adapter.js`
- 侧边栏导出入口与状态管理：`src/content/core/sidebar.js`
- 注入顺序更新：`manifest.json`

### 3.2 稳定性优化（顺带重构）

- `SidebarUI` 增加 `destroy()`，清理 observer/timer，避免 SPA 路由切换泄漏。
- `content.js` 中 runtime message listener 改为单次注册，避免重复监听。
- adapter 的 `observeMutations()` 统一返回 observer，支持统一销毁。
- `background.js` 支持域名列表补齐 `yuanbao.tencent.com`，与 manifest 一致。

## 4. 验证情况

已执行：
- `node --test tests/*.test.mjs` -> 5 passed, 0 failed
- 各变更 JS `node --check` 语法检查通过
- `manifest.json` 结构校验通过（可被 JSON.parse）

测试文件：
- `tests/base-adapter.test.mjs`
- `tests/export-service.test.mjs`
- `tests/export-service-rich.test.mjs`

## 5. 已知边界

当前已替换为 `turndown`（含 GFM 插件）进行 HTML -> Markdown 转换，保真度与一致性优于手写转换逻辑。
仍有边界：不同平台的私有组件（如某些 citation/callout）仍需按平台补充 rule 才能 1:1 还原。

## 6. 下一步（已完成）

已完成“高保真 Markdown 导出”迭代：
- `ExportService` 增加 `htmlToMarkdown()` 与 `buildAssistantMarkdown()`。
- 导出时优先使用 assistant 的结构化内容（`markdown` / `html` 字段），无结构化内容回退纯文本。
- TDD 流程：先新增失败测试，再实现并转绿。

## 7. V2 需求（已实现）

新增需求：
- 需求 A：导出结构调整为“每个用户消息一个区块（block）”。用户消息作为二级标题，标题可截断；完整用户消息放在区块首段，assistant 回复放在同一区块。
- 需求 B：支持先选择多条消息，再一次性导出为单个 Markdown 文件。

### 7.1 导出结构改造设计

推荐的单条 turn 输出模板：

```markdown
## <用户消息摘要（截断）>

<完整用户消息>

<assistant markdown 内容>
```

约定：
- 二级标题仅用于“导航可读性”，使用用户消息前 N 字符（建议 48~72）+ 省略号。
- 区块正文第一段固定为用户完整输入，避免标题截断导致信息丢失。
- assistant 内容紧随其后，保持 rich markdown（代码块、列表、表格等）原始结构。
- 区块之间用空行分隔，不再使用“## User / ## Assistant”全局分段。

### 7.2 多选导出交互设计

目标：不显著增加 UI 复杂度，同时支持批量导出。

推荐方案（低侵入）：
- 将当前 `selectedId` 升级为 `selectedIds: Set<string>`。
- 列表项点击行为：
  - 单击：导航到该消息并切换其选中状态（再次点击可取消）。
  - active（滚动高亮）与 selected（导出选中）继续解耦。
- Header 导出按钮始终复用，按钮文案/tooltip 动态显示选中数量：
  - `0` 条：disabled
  - `1` 条：导出 1 条
  - `N` 条：导出 N 条

导出执行：
- `SidebarUI` 收集 `selectedIds`。
- `adapter.getConversationTurns()` 过滤出命中的 turns。
- `ExportService` 生成单文件 markdown（按统一顺序拼接多个 block）并下载。

### 7.3 排序与一致性规则

排序候选：
- A. 按用户点击选择的顺序导出。
- B. 按对话时间/DOM 顺序导出（推荐）。

推荐 B 的原因：
- 导出文件语义稳定，便于复盘与检索。
- 不受用户临时点击顺序影响，减少误解。
- 与阅读顺序一致，适合后续二次处理。

确认结论：
- 已确认采用 B：多选导出按对话/DOM 顺序导出。

### 7.4 分层改造点

- UI 层（`sidebar.js`）：
  - 单选状态 -> 多选集合状态
  - 导出按钮状态与计数展示
  - 选中态视觉强化（不影响 active 态）
- Core 层（`export-service.js`）：
  - 新增 `buildTurnsMarkdown(turns, meta)` 聚合多个 turn
  - 新增 `buildTurnBlock(turn)` 输出区块模板
  - 文件名支持多条导出（如 `sinan-<source>-<timestamp>-selected-<count>.md`）
- Adapter 层（保持不变）：
  - 继续提供 `getConversationTurns()`，由上层过滤/排序

### 7.5 风险与验证

风险：
- 多选状态在 DOM 重渲染后丢失（需基于稳定 ID 保持）。
- 长会话下一次导出过大（需考虑体积与浏览器下载稳定性）。

验证建议：
- 单条导出与多条导出分别覆盖。
- 覆盖“标题截断 + 正文保留完整用户消息”。
- 覆盖“选择顺序与导出顺序一致性（按 DOM 顺序）”。
- 跨站点回归（ChatGPT/Gemini/Doubao/Qwen/Perplexity/Yuanbao）。

### 7.6 分步实施结果

Step 1：导出结构 V2（单条 block 化）
- `ExportService` 增加：
  - `buildTurnHeading(text, maxLen)`（标题截断）
  - `buildTurnBlock(turn)`（单 turn block 生成）
  - `buildTurnsMarkdown(turns, meta)`（统一拼装入口）
- 保持 `buildAssistantMarkdown` 与 turndown 转换链不变。
- 兼容旧入口：`exportTurnAsMarkdown` 内部调用多 turn 入口（数组长度 1）。
- 完成状态：已完成。

Step 2：侧边栏多选状态
- `SidebarUI`：
  - `selectedId` -> `selectedIds: Set<string>`
  - 点击条目改为 toggle 选中
  - 导出按钮按选中数量启停并更新 tooltip
- 刷新消息列表时保留仍有效的选中项，失效项自动清理。
- 完成状态：已完成。

Step 3：批量导出动作
- 导出点击时：
  - 从 `getConversationTurns()` 取全量 turns
  - 过滤选中项
  - 按 turns 原顺序导出（DOM 顺序）
- 输出单文件名格式：`sinan-<source>-<timestamp>-selected-<count>.md`
- 完成状态：已完成。

Step 4：测试与回归
- 单元测试：
  - turn block 格式/标题截断
  - 多条拼装顺序
  - 多条导出文件名
- 冒烟回归：
  - 单选导出
  - 多选导出（2~5 条）
  - 空选中/部分无 assistant 的处理
- 完成状态：单元测试已覆盖并通过，冒烟回归待浏览器侧手动验证。

## 8. 本次代码完成情况（新增）

### 8.1 导出服务

- 文件：`src/content/core/export-service.js`
- 关键变化：
  - 新增 `exportTurnsAsMarkdown()` 作为批量导出主入口。
  - `buildMarkdown()` 调整为复用 `buildTurnsMarkdown()`。
  - 导出正文改为 turn block 结构，不再使用全局 `## User / ## Assistant`。
  - 多条导出文件名采用 `selected-<count>` 规则。

### 8.2 侧边栏交互

- 文件：`src/content/core/sidebar.js`
- 关键变化：
  - 选中状态升级为 `selectedIds` 多选集合。
  - 条目点击为 toggle 选中，同时保持 active（滚动定位）逻辑。
  - 导出按钮按选中数量动态启停与提示。
  - 导出时按 `getConversationTurns()` 顺序过滤选中项，确保 DOM 顺序一致。

### 8.3 测试更新

- 文件：`tests/export-service.test.mjs`
- 新增/调整：
  - turn block 格式断言
  - 标题截断与正文完整保留断言
  - 多 turn 顺序断言
  - 批量文件名断言
- 文件：`tests/sidebar-multiselect.test.mjs`
- 新增：
  - 多选导出按会话顺序过滤断言
  - 导出按钮随选中数量变更状态/提示断言

测试结果：
- `node --test tests/*.test.mjs`：10 passed, 0 failed
