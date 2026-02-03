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

3.  **Content Script Entry (`src/content/main.js`)**:
    *   Detects the current URL.
    *   Instantiates the correct Adapter (e.g., `ChatGPTAdapter`).
    *   Initializes the Core Engine with that adapter.

## 3. Implementation Phases & Tasks

### Phase 1: Infrastructure & Architecture Setup
*   [ ] **Task 1.1: Project Restructuring**
    *   Refactor `src/content` to have `adapters/` and `core/` directories.
    *   Create a base `ChatAdapter` class/interface.
*   [ ] **Task 1.2: URL Detection & Router**
    *   Implement logic in `content.js` to check `window.location.hostname` and select the correct adapter.

### Phase 2: ChatGPT Adapter (The "Parser")
*   [ ] **Task 2.1: DOM Analysis (ChatGPT)**
    *   Identify stable selectors for "User" message blocks (e.g., `[data-message-author-role="user"]`).
    *   Identify the text container within the message block.
*   [ ] **Task 2.2: Data Extraction**
    *   Implement `ChatGPTAdapter.getUserMessages()` to return a list of DOM elements and their text preview.
*   [ ] **Task 2.3: Real-time Monitoring**
    *   Implement `MutationObserver` in the adapter to detect when a new message is sent/generated and trigger a UI update.

### Phase 3: UI & Core Logic (The "Navigator")
*   [ ] **Task 3.1: Sidebar Container Injection**
    *   Create a Shadow DOM (to avoid CSS conflicts) or a container `div` for the sidebar.
    *   Position it fixed on the right side.
*   [ ] **Task 3.2: Message Rendering**
    *   Render the list of user messages extracted by the adapter.
    *   **Truncation Logic**: Implement CSS text-overflow or JS-based truncation (e.g., first 50 chars).
*   [ ] **Task 3.3: Scroll Interaction**
    *   Implement `scrollToMessage(element)` using `element.scrollIntoView({ behavior: 'smooth', block: 'center' })`.
*   [ ] **Task 3.4: Auto-Highlighting (Scroll Spy)**
    *   Use `IntersectionObserver` to detect which message is currently in the viewport and highlight the corresponding dot/text in the sidebar.

### Phase 4: Refinement & Styling
*   [ ] **Task 4.1: Styling (CSS)**
    *   Design a "Glassmorphism" or clean minimalist look (Translucent background, rounded corners).
    *   Ensure it doesn't overlap critical ChatGPT UI buttons (like the input box or history).
*   [ ] **Task 4.2: Toggle Visibility**
    *   Add a minimize/collapse button to the sidebar.
*   [ ] **Task 4.3: Smoothness Optimization**
    *   Debounce the MutationObserver updates to prevent UI flickering during generation.

### Phase 5: Future Expansion (Gemini & Doubao)
*   [ ] Create `GeminiAdapter`.
*   [ ] Create `DoubaoAdapter`.
*   [ ] (No changes needed to Core Engine).

## 4. Technical Constraints & Risks
*   **DOM Fragility**: ChatGPT changes class names often (e.g., tailwind classes). We must rely on stable attributes like `data-message-author-role` or structural hierarchy where possible.
*   **SPA Navigation**: When switching chats in ChatGPT, the page doesn't reload. We need to listen to URL changes or major DOM resets to re-initialize the list.

## 5. Next Step
Proceed to **Phase 1: Infrastructure & Architecture Setup**.
