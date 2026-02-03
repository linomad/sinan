# Chrome Extension Development Plan: Chat Navigator

## 1. Project Overview
**Goal:** Create a Chrome extension that generates a floating navigation sidebar for AI chat interfaces (starting with ChatGPT). This sidebar extracts "User" messages, creating a clickable table of contents to quickly scroll to specific parts of a long conversation.

**Core Value:** Efficient navigation in long context windows.

## 2. Architecture Design (Scalability Focus)
To support multiple AI platforms (ChatGPT, Gemini, Doubao) in the future, the codebase will be split into:

1.  **Core Engine (`src/core/`)**:
    *   Responsible for rendering the Sidebar UI.
    *   Handling user interactions (clicks, scrolling).
    *   Managing the active state (highlighting the current section).
    *   Independent of the specific website being viewed.

2.  **Adapters (`src/adapters/`)**:
    *   Site-specific logic.
    *   **Interface**: `ChatAdapter`
        *   `getName()`: Returns site name (e.g., 'ChatGPT').
        *   `getUserMessages()`: Returns an array of message objects `{ id, text, element }`.
        *   `monitorChanges(callback)`: Sets up `MutationObserver` to detect new messages.
        *   `getScrollContainer()`: Identifies the scrollable element (document vs specific div).

3.  **Content Script Entry (`src/content/content.js`)**:
    *   Detects the current URL.
    *   Instantiates the correct Adapter (e.g., `ChatGPTAdapter`).
    *   Initializes the Core Engine with that adapter.

## 3. Implementation Phases & Tasks

### Phase 1: Infrastructure & Architecture Setup
*   [x] **Task 1.1: Project Restructuring**
    *   Refactor `src/content` to have `adapters/` and `core/` directories.
    *   Create a base `ChatAdapter` class/interface.
*   [x] **Task 1.2: URL Detection & Router**
    *   Implement logic in `content.js` to check `window.location.hostname` and select the correct adapter.

### Phase 2: ChatGPT Adapter (The "Parser")
*   [x] **Task 2.1: DOM Analysis (ChatGPT)**
    *   Identify stable selectors for "User" message blocks (`[data-message-author-role="user"]`).
*   [x] **Task 2.2: Data Extraction**
    *   Implement `ChatGPTAdapter.getUserMessages()` to return a list of DOM elements and their text preview.
*   [x] **Task 2.3: Real-time Monitoring**
    *   Implement `MutationObserver` in the adapter to detect when a new message is sent/generated and trigger a UI update.

### Phase 3: UI & Core Logic (The "Navigator")
*   [x] **Task 3.1: Sidebar Container Injection**
    *   Create a Shadow DOM to isolate styles for the sidebar.
    *   Position it fixed on the right side.
*   [x] **Task 3.2: Message Rendering**
    *   Render the list of user messages extracted by the adapter.
    *   **Truncation Logic**: Use CSS line-clamp for smooth multi-line previews.
*   [x] **Task 3.3: Scroll Interaction**
    *   Implement `scrollToMessage(element)` using `element.scrollIntoView({ behavior: 'smooth', block: 'center' })`.
*   [x] **Task 3.4: Auto-Highlighting (Scroll Spy)**
    *   Use `IntersectionObserver` to detect which message is currently in the viewport and highlight the corresponding item in the sidebar.

### Phase 4: Refinement & Styling
*   [x] **Task 4.1: Styling (CSS)**
    *   Design a "Glassmorphism" look (Translucent background, blur effect, rounded corners).
*   [x] **Task 4.2: Toggle Visibility**
    *   Add a minimize/collapse button to the sidebar.
*   [x] **Task 4.3: Smoothness Optimization**
    *   Debounce the MutationObserver updates.
    *   Refine Scroll Spy triggering thresholds.

### Phase 5: Multi-site Support (Gemini & Doubao)
*   [ ] Create `GeminiAdapter`.
*   [x] Create `DoubaoAdapter`.
    *   [x] Implemented using `[data-testid="send_message"]`.
    *   [x] Solved lazy-loading ID stability using `data-message-id`.

## 4. Technical Constraints & Risks
*   **DOM Fragility**: Sites change class names often. We rely on stable attributes like `data-message-author-role` or `data-testid`.
*   **SPA Navigation**: ChatGPT/Doubao change URLs without a full reload. We listen to URL changes to re-initialize.
*   **Virtual Lists**: Sites like Doubao only render visible items. We handle this by using stable unique IDs from the data attributes.

## 5. Current Status
Completed Phase 4 and added support for Doubao in Phase 5.
Proceeding to **Phase 5: Gemini Support** or further UX polish.