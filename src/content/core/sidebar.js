/**
 * Manages the Sidebar UI using Shadow DOM.
 * Includes Scroll Spy, Collapse, and Auto-Theming (Dark/Light).
 */
class SidebarUI {
  constructor(adapter) {
    this.adapter = adapter;
    this.container = null;
    this.shadowRoot = null;
    this.isCollapsed = false;
    this.isVisible = true;
    this.isExportMode = false;
    this.hasMessages = false;
    this.activeId = null;
    this.selectedIds = new Set();
    this.turnMap = new Map();
    this.tocCache = new Map();
    this.expandedTocId = null;
    this.intersectionObserver = null;
    this.themeObserver = null;
    this.mutationObserver = null;
    this.toastTimer = null;
  }

  mount() {
    this.container = document.createElement('div');
    this.container.id = 'chat-navigator-root';
    document.body.appendChild(this.container);
    this.shadowRoot = this.container.attachShadow({ mode: 'open' });

    this.render();
    this.setupListeners();
    this.initScrollSpy();
    this.initThemeAutoSwitch();
  }

  setupListeners() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }

    // Listen for DOM changes to update list
    this.mutationObserver = this.adapter.observeMutations(() => {
      this.updateMessages();
      this.initScrollSpy(); // Re-init scroll spy for new elements
    });
  }

  /**
   * Detects the current site's theme and applies it to the sidebar.
   */
  initThemeAutoSwitch() {
    const updateTheme = () => {
      const isDark = this.detectDarkMode();
      const sidebar = this.shadowRoot.querySelector('#sidebar');
      if (sidebar) {
        if (isDark) {
          sidebar.classList.add('dark');
        } else {
          sidebar.classList.remove('dark');
        }
      }
    };

    // 1. Initial check
    updateTheme();

    // 2. Observer for theme attribute changes on <html> or <body>
    this.themeObserver = new MutationObserver(() => {
      updateTheme();
    });

    this.themeObserver.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class', 'data-theme', 'style'] 
    });
    this.themeObserver.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['class', 'data-theme', 'style'] 
    });
  }

  detectDarkMode() {
    const docEl = document.documentElement;
    const bodyEl = document.body;

    // 1. Check standard dark classes
    if (docEl.classList.contains('dark') || 
        bodyEl.classList.contains('dark') ||
        docEl.classList.contains('dark-theme') || 
        bodyEl.classList.contains('dark-theme')) {
      return true;
    }
    
    // 2. Check standard light classes (If explicitly light, don't fallback to system dark)
    if (docEl.classList.contains('light') || 
        bodyEl.classList.contains('light') ||
        docEl.classList.contains('light-theme') || 
        bodyEl.classList.contains('light-theme')) {
      return false;
    }

    // 3. Check data-theme or data-color-scheme attributes
    const htmlTheme = docEl.getAttribute('data-theme');
    const bodyTheme = bodyEl.getAttribute('data-theme');
    const colorScheme = docEl.getAttribute('data-color-scheme') || bodyEl.getAttribute('data-color-scheme');
    
    // If any theme attribute exists, respect it and skip fallback
    if (htmlTheme || bodyTheme || colorScheme) {
      return htmlTheme === 'dark' || bodyTheme === 'dark' || colorScheme === 'dark';
    }

    // 4. Fallback: System preference (only if no explicit page theme indicators found)
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  initScrollSpy() {
    if (this.intersectionObserver) {
        this.intersectionObserver.disconnect();
    }

    this.intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                this.setActiveItem(entry.target.id);
            }
        });
    }, {
        root: null, 
        rootMargin: '-10% 0px -50% 0px', 
        threshold: 0
    });

    const messages = this.adapter.getUserMessages();
    messages.forEach(msg => {
        if (msg.element) {
            this.intersectionObserver.observe(msg.element);
        }
    });
  }

  setActiveItem(id) {
    if (!id || this.activeId === id) return;
    this.activeId = id;
    this.refreshNavItemStates(true);
  }

  toggleSelectedItem(id) {
    if (!id) return;

    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }

    this.refreshNavItemStates(false);
    this.updateExportFooterState();
    this.updateExportButtonState();
  }

  toggleTocItem(id) {
    if (!id) return;

    if (this.expandedTocId === id) {
      this.expandedTocId = null;
    } else {
      this.expandedTocId = id;
      this.resolveTocItems(id);
    }

    this.updateMessages();
  }

  syncTurnMap(turns) {
    const nextTurnMap = new Map();
    const list = Array.isArray(turns) ? turns : [];

    list.forEach((turn) => {
      const userId = turn && turn.user && turn.user.id;
      if (userId) {
        nextTurnMap.set(userId, turn);
      }
    });

    this.turnMap = nextTurnMap;
  }

  syncTransientState(messageIds) {
    if (this.selectedIds.size > 0) {
      this.selectedIds = new Set(
        Array.from(this.selectedIds).filter(id => messageIds.has(id))
      );
    }

    if (this.expandedTocId && !messageIds.has(this.expandedTocId)) {
      this.expandedTocId = null;
    }

    if (this.tocCache.size > 0) {
      this.tocCache = new Map(
        Array.from(this.tocCache.entries()).filter(([id]) => messageIds.has(id))
      );
    }

    if (this.activeId && !messageIds.has(this.activeId)) {
      this.activeId = null;
    }
  }

  hasTocCandidate(turn) {
    if (!turn) return false;

    const segments = Array.isArray(turn.assistantSegments) ? turn.assistantSegments : [];
    return segments.some((segment) => {
      const root = segment && segment.element;
      if (!root || typeof root.querySelector !== 'function') return false;
      return !!root.querySelector('h1,h2,h3,h4,h5,h6');
    });
  }

  resolveTocItems(id) {
    if (!id) return [];
    const turn = this.turnMap.get(id);
    const signature = this.buildTurnTocSignature(turn);
    const cached = this.tocCache.get(id);
    if (cached && cached.signature === signature) {
      return cached.items;
    }

    const tocService = window.ChatNavTocService;
    const rawItems = (turn && tocService && typeof tocService.extractTurnDomHeadings === 'function')
      ? tocService.extractTurnDomHeadings(turn)
      : [];

    const normalizedItems = Array.isArray(rawItems)
      ? rawItems
        .filter(item => item && typeof item.text === 'string' && item.text.trim())
        .map(item => ({
          level: Math.max(1, Math.min(6, Number(item.level) || 1)),
          text: item.text.trim(),
          segmentIndex: Number(item.segmentIndex) || 0,
          headingIndex: Number(item.headingIndex) || 0,
          targetElement: item.targetElement || null
        }))
      : [];

    this.tocCache.set(id, {
      signature,
      items: normalizedItems
    });
    return normalizedItems;
  }

  buildTurnTocSignature(turn) {
    if (!turn) return 'turn:missing';
    const tocService = window.ChatNavTocService;
    if (tocService && typeof tocService.buildTurnDomSignature === 'function') {
      return tocService.buildTurnDomSignature(turn);
    }

    const segments = Array.isArray(turn.assistantSegments) ? turn.assistantSegments : [];
    const segmentSignature = segments.map((segment, index) => {
      const id = String(segment?.id || index);
      const markdownLength = String(segment?.markdown || '').trim().length;
      const htmlLength = String(segment?.html || '').trim().length;
      const textLength = String(segment?.text || '').trim().length;
      const root = segment && segment.element && typeof segment.element.querySelectorAll === 'function'
        ? segment.element
        : null;
      const headingSignature = root
        ? Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6'))
          .map((headingElement) => {
            const level = String(headingElement?.tagName || '').toUpperCase();
            const text = String(headingElement?.textContent || headingElement?.innerText || '')
              .replace(/\s+/g, ' ')
              .trim();
            if (!text) return '';
            return `${level}:${text}`;
          })
          .filter(Boolean)
          .join(',')
        : 'none';
      return `${id}:${markdownLength}:${htmlLength}:${textLength}:${headingSignature}`;
    }).join('|');
    const assistantTextLength = String(turn?.assistantText || '').trim().length;
    return `segments:${segments.length};assistant:${assistantTextLength};${segmentSignature}`;
  }

  buildTocListMarkup(id) {
    const items = this.resolveTocItems(id);
    if (items.length === 0) {
      return '<div class="nav-toc-empty">No sections</div>';
    }

    return items.map((item, index) => `
      <button class="nav-toc-item toc-entry-btn level-${item.level}" type="button" data-id="${SidebarUI.escapeHtml(id)}" data-index="${index}" title="${SidebarUI.escapeHtml(item.text)}">
        ${SidebarUI.escapeHtml(item.text)}
      </button>
    `).join('');
  }

  getTocToggleIconMarkup(isExpanded) {
    if (isExpanded) {
      return `
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="m18 15-6-6-6 6"></path>
        </svg>
      `;
    }

    return `
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="m6 9 6 6 6-6"></path>
      </svg>
    `;
  }

  buildTocToggleButtonMarkup(messageId, isExpanded) {
    return `
      <button class="toc-toggle-btn" type="button" data-id="${SidebarUI.escapeHtml(messageId)}" title="Toggle response outline" aria-label="Toggle response outline">
        <span class="toc-icon" aria-hidden="true">
          ${this.getTocToggleIconMarkup(isExpanded)}
        </span>
      </button>
    `;
  }

  buildNavItemMarkup(msg) {
    const turn = this.turnMap.get(msg.id);
    const isActive = msg.id === this.activeId;
    const isSelected = this.isExportMode && this.selectedIds.has(msg.id);
    const isExpanded = this.expandedTocId === msg.id;
    const hasToc = this.hasTocCandidate(turn);

    const tocButtonMarkup = hasToc
      ? this.buildTocToggleButtonMarkup(msg.id, isExpanded)
      : '';
    const tocMarkup = hasToc && isExpanded
      ? `
        <div class="nav-toc">
          ${this.buildTocListMarkup(msg.id)}
        </div>
      `
      : '';

    return `
      <div class="nav-item ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''} ${isExpanded ? 'toc-expanded' : ''}" data-id="${SidebarUI.escapeHtml(msg.id)}" title="${SidebarUI.escapeHtml(msg.text)}">
        <div class="nav-main">
          <span class="nav-text">${SidebarUI.escapeHtml(msg.text)}</span>
          ${tocButtonMarkup}
        </div>
        ${tocMarkup}
      </div>
    `;
  }

  refreshNavItemStates(shouldScrollActiveIntoView) {
    if (!this.shadowRoot) return;
    const items = this.shadowRoot.querySelectorAll('.nav-item');
    items.forEach(item => {
      const itemId = item.getAttribute('data-id');
      const isActive = itemId === this.activeId;
      const isSelected = this.isExportMode && this.selectedIds.has(itemId);

      item.classList.toggle('active', isActive);
      item.classList.toggle('selected', isSelected);

      if ((isActive || isSelected) && itemId) {
        this.resolveTocItems(itemId);
      }

      if (isActive && shouldScrollActiveIntoView) {
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  getExportButtonIconMarkup() {
    if (this.isExportMode) {
      return `
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M3 7v6h6"></path>
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
        </svg>
      `;
    }

    return `
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M12 4v10"></path>
        <path d="m7.5 10.5 4.5 4.5 4.5-4.5"></path>
        <path d="M5 19h14"></path>
      </svg>
    `;
  }

  getExportButtonLabel() {
    if (!this.hasMessages) return 'No messages to export';
    if (this.isExportMode) return 'Undo export mode';
    return 'Select messages to export';
  }

  updateExportButtonState() {
    if (!this.shadowRoot) return;
    const exportBtn = this.shadowRoot.querySelector('.export-btn');
    if (!exportBtn) return;

    exportBtn.disabled = !this.hasMessages;
    const label = this.getExportButtonLabel();
    exportBtn.title = label;
    exportBtn.setAttribute('aria-label', label);

    const iconEl = typeof exportBtn.querySelector === 'function'
      ? exportBtn.querySelector('.header-icon')
      : null;
    if (iconEl) {
      iconEl.innerHTML = this.getExportButtonIconMarkup();
    }
  }

  updateExportFooterState() {
    if (!this.shadowRoot) return;
    const footer = this.shadowRoot.querySelector('.export-footer');
    const countEl = this.shadowRoot.querySelector('.footer-selection-count');
    const downloadBtn = this.shadowRoot.querySelector('.footer-download-btn');
    if (!footer || !countEl || !downloadBtn) return;

    footer.classList.toggle('visible', this.isExportMode);
    const count = this.selectedIds.size;
    countEl.textContent = `Selected ${count}`;
    downloadBtn.disabled = count === 0;
  }

  syncSidebarInteractionState() {
    if (!this.shadowRoot) return;
    const sidebar = this.shadowRoot.querySelector('#sidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('export-mode', this.isExportMode);
  }

  enterExportMode() {
    if (this.isExportMode) return;
    this.isExportMode = true;
    this.syncSidebarInteractionState();
    this.refreshNavItemStates(false);
    this.updateExportButtonState();
    this.updateExportFooterState();
  }

  exitExportMode() {
    this.isExportMode = false;
    this.selectedIds.clear();
    this.syncSidebarInteractionState();
    this.refreshNavItemStates(false);
    this.updateExportButtonState();
    this.updateExportFooterState();
  }

  handleExportClick() {
    if (!this.hasMessages) {
      this.showToast('No messages to export.');
      return;
    }

    if (this.isExportMode) {
      this.exitExportMode();
      return;
    }

    this.enterExportMode();
  }

  handleDownloadClick() {
    if (!this.isExportMode) return;

    if (this.selectedIds.size === 0) {
      this.showToast('Select messages first.');
      return;
    }

    if (!window.ChatNavExportService) {
      this.showToast('Export service unavailable.');
      return;
    }

    const turns = this.adapter.getConversationTurns();
    const selectedTurns = turns.filter(
      turn => turn && turn.user && this.selectedIds.has(turn.user.id)
    );

    if (selectedTurns.length === 0) {
      this.showToast('Selected messages not found. Please retry.');
      return;
    }

    const result = window.ChatNavExportService.exportTurnsAsMarkdown(selectedTurns, {
      source: this.adapter.domain,
      url: window.location.href
    });

    if (!result.ok) {
      this.showToast('Export failed.');
      return;
    }

    const count = result.count || selectedTurns.length;
    const noun = count === 1 ? 'item' : 'items';
    this.showToast(`Exported ${count} ${noun}: ${result.fileName}`);
    this.exitExportMode();
  }

  handleCancelExportClick() {
    if (!this.isExportMode) return;
    this.exitExportMode();
  }

  handleNavItemClick(msg, id) {
    if (this.isExportMode) {
      this.toggleSelectedItem(id);
      return;
    }

    if (this.expandedTocId && this.expandedTocId !== id) {
      this.expandedTocId = null;
      this.updateMessages();
    }

    this.setActiveItem(id);

    // Prioritize the element reference if valid and connected
    const target = msg.element && msg.element.isConnected ? msg.element : document.getElementById(id);
    if (target) {
      this.adapter.scrollToElement(target);
    }
  }

  handleTocItemClick(id, indexValue) {
    const index = Number(indexValue);
    if (!id || !Number.isInteger(index) || index < 0) return;

    const items = this.resolveTocItems(id);
    const item = items[index];
    if (!item) return;

    const headingTarget = item.targetElement && item.targetElement.isConnected !== false
      ? item.targetElement
      : null;
    if (headingTarget) {
      this.adapter.scrollToElement(headingTarget);
      return;
    }

    const turn = this.turnMap.get(id);
    const segments = Array.isArray(turn?.assistantSegments) ? turn.assistantSegments : [];
    const fallback = segments
      .map(segment => segment && segment.element)
      .find(element => element && element.isConnected !== false);

    if (fallback) {
      this.adapter.scrollToElement(fallback);
    }
  }

  showToast(message) {
    const toast = this.shadowRoot && this.shadowRoot.querySelector('.toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('visible');
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
    }, 1800);
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    const sidebar = this.shadowRoot.querySelector('#sidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('collapsed', this.isCollapsed);
  }

  toggleVisibility() {
    this.isVisible = !this.isVisible;
    if (this.container) {
      this.container.style.display = this.isVisible ? 'block' : 'none';
    }
  }

  destroy() {
    if (this.intersectionObserver) this.intersectionObserver.disconnect();
    if (this.themeObserver) this.themeObserver.disconnect();
    if (this.mutationObserver) this.mutationObserver.disconnect();
    if (this.toastTimer) clearTimeout(this.toastTimer);

    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    this.container = null;
    this.shadowRoot = null;
    this.intersectionObserver = null;
    this.themeObserver = null;
    this.mutationObserver = null;
    this.toastTimer = null;
    this.turnMap.clear();
    this.tocCache.clear();
    this.expandedTocId = null;
  }

  updateMessages() {
    const messages = this.adapter.getUserMessages();
    const turns = typeof this.adapter.getConversationTurns === 'function'
      ? this.adapter.getConversationTurns()
      : [];
    this.syncTurnMap(turns);

    const listContainer = this.shadowRoot.querySelector('.nav-list');
    if (!listContainer) return;

    this.hasMessages = messages.length > 0;
    const messageIds = new Set(messages.map(message => message.id));
    this.syncTransientState(messageIds);

    if (messages.length === 0) {
      listContainer.innerHTML = '<div class="empty-state">No user messages found</div>';
      if (this.isExportMode) {
        this.exitExportMode();
      } else {
        this.updateExportFooterState();
      }
      this.updateExportButtonState();
      return;
    }

    listContainer.innerHTML = messages.map(msg => this.buildNavItemMarkup(msg)).join('');

    this.shadowRoot.querySelectorAll('.nav-item').forEach((item, index) => {
      item.onclick = () => {
        const msg = messages[index];
        const id = item.getAttribute('data-id');
        this.handleNavItemClick(msg, id);
      };
    });

    this.shadowRoot.querySelectorAll('.toc-toggle-btn').forEach((button) => {
      button.onclick = (event) => {
        event.stopPropagation();
        const id = button.getAttribute('data-id');
        this.toggleTocItem(id);
      };
    });

    this.shadowRoot.querySelectorAll('.toc-entry-btn').forEach((button) => {
      button.onclick = (event) => {
        event.stopPropagation();
        const id = button.getAttribute('data-id');
        const index = button.getAttribute('data-index');
        this.handleTocItemClick(id, index);
      };
    });

    this.refreshNavItemStates(false);
    this.updateExportFooterState();
    this.updateExportButtonState();
  }

  static escapeHtml(value) {
    return (value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          /* Light Mode Defaults (Elegant, Soft) */
          --bg-color: rgba(255, 255, 255, 0.75);
          --text-color: #374151; /* Gray-700 */
          --text-muted: #9CA3AF; /* Gray-400 */
          --border-color: rgba(0, 0, 0, 0.06);
          --primary-color: #10a37f; /* OpenAI Green */
          --item-hover-bg: rgba(0, 0, 0, 0.04);
          --item-active-bg: rgba(16, 163, 127, 0.08);
          --shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          --secondary-btn-hover-bg: rgba(15, 23, 42, 0.08);
        }

        /* Dark Mode Overrides (Deep, Contrast) */
        #sidebar.dark {
          --bg-color: rgba(32, 33, 35, 0.75); /* Deep Gray */
          --text-color: #ECECF1; /* Gray-100 */
          --text-muted: #8E8EA0; /* Gray-500 */
          --border-color: rgba(255, 255, 255, 0.08);
          --item-hover-bg: rgba(255, 255, 255, 0.06);
          --item-active-bg: rgba(16, 163, 127, 0.15);
          --shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
          --secondary-btn-hover-bg: rgba(255, 255, 255, 0.12);
        }

        #sidebar {
          position: fixed;
          right: 20px;
          top: 15%;
          width: 260px;
          max-height: 70vh;
          
          /* Glassmorphism Core */
          background: var(--bg-color);
          backdrop-filter: blur(12px) saturate(150%);
          -webkit-backdrop-filter: blur(12px) saturate(150%);
          
          border: 1px solid var(--border-color);
          border-radius: 16px;
          box-shadow: var(--shadow);
          
          z-index: 999999;
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
          
          /* Smooth Theme Transition */
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                      width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                      background-color 0.3s ease,
                      border-color 0.3s ease,
                      box-shadow 0.3s ease,
                      opacity 0.2s ease;
                      
          overflow: hidden;
          transform-origin: right center;
          opacity: 0.38;
        }

        #sidebar:hover,
        #sidebar:focus-within,
        #sidebar.export-mode {
          opacity: 1;
        }

        #sidebar.collapsed {
          width: 40px;
          height: 40px;
          border-radius: 20px;
          transform: translateX(10px);
          cursor: pointer;
        }
        
        #sidebar.collapsed:hover {
           background: var(--primary-color);
           --text-muted: #fff; /* Make arrow white on hover */
        }

        #sidebar.collapsed .header-title,
        #sidebar.collapsed .nav-list,
        #sidebar.collapsed .export-btn,
        #sidebar.collapsed .export-footer,
        #sidebar.collapsed .toast {
          display: none;
        }

        #sidebar.collapsed .header {
          padding: 0;
          height: 100%;
          justify-content: center;
          border-bottom: none;
        }

        .header {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
          user-select: none;
          transition: border-color 0.3s ease;
        }

        .header-title {
          font-weight: 600;
          font-size: 13px;
          color: var(--text-color);
          letter-spacing: 0.02em;
          text-transform: uppercase;
          opacity: 0.9;
        }

        .header-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 24px;
          gap: 6px;
        }

        .header-actions .reveal-on-engage {
          opacity: 0;
          visibility: hidden;
          transform: translateX(3px);
          pointer-events: none;
          transition: opacity 0.2s ease, visibility 0.2s ease, transform 0.2s ease;
        }

        #sidebar:hover .header-actions .reveal-on-engage,
        #sidebar:focus-within .header-actions .reveal-on-engage,
        #sidebar.export-mode .header-actions .reveal-on-engage {
          opacity: 1;
          visibility: visible;
          transform: translateX(0);
          pointer-events: auto;
        }

        .export-footer {
          border-top: 1px solid var(--border-color);
          padding: 14px 16px;
          display: none;
          justify-content: space-between;
          align-items: center;
          user-select: none;
          transition: border-color 0.3s ease;
          gap: 8px;
        }

        .export-footer.visible {
          display: flex;
        }

        .footer-selection-count {
          font-weight: 600;
          font-size: 12px;
          color: var(--text-color);
          letter-spacing: 0.01em;
          opacity: 0.9;
        }

        .footer-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .footer-download-btn,
        .footer-cancel-btn {
          height: 24px;
          border-radius: 6px;
          border: none;
          padding: 0 10px;
          font-size: 12px;
          line-height: 1;
          cursor: pointer;
          transition: all 0.2s;
        }

        .footer-download-btn {
          background: var(--primary-color);
          color: #ffffff;
        }

        .footer-download-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .footer-download-btn:hover:not(:disabled) {
          filter: brightness(1.05);
        }

        .footer-cancel-btn {
          background: var(--item-hover-bg);
          color: var(--text-color);
        }

        .footer-cancel-btn:hover {
          background: var(--secondary-btn-hover-bg);
          color: var(--text-color);
        }

        .export-btn,
        .toggle-btn {
          width: 24px;
          height: 24px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s;
          line-height: 1;
          padding: 0;
          border: none;
          background: transparent;
          color: var(--text-muted);
        }

        .header-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          pointer-events: none;
        }

        .header-icon svg {
          width: 100%;
          height: 100%;
          display: block;
          stroke: currentColor;
          fill: none;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .export-btn {
          cursor: pointer;
        }

        .export-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .toggle-btn {
          cursor: pointer;
        }

        .toggle-btn .header-icon {
          width: 14px;
          height: 14px;
          transition: transform 0.2s ease;
        }

        #sidebar.collapsed .toggle-btn .header-icon {
          transform: rotate(180deg);
        }

        .export-btn:hover:not(:disabled),
        .toggle-btn:hover {
          background: var(--item-hover-bg);
          color: var(--primary-color);
        }

        /* Fix: Don't change toggle btn background when sidebar is collapsed and hovered */
        #sidebar.collapsed .toggle-btn:hover {
          background: transparent;
          color: #fff;
        }

        .nav-list {
          overflow-y: overlay;
          padding: 8px;
          flex: 1;
        }

        .nav-item {
          padding: 8px 10px;
          margin-bottom: 2px;
          border-radius: 8px;
          font-size: 13px;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .nav-main {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }

        .nav-item:hover {
          background: var(--item-hover-bg);
          color: var(--text-color);
        }

        .nav-item.active {
          background: var(--item-active-bg);
          color: var(--primary-color);
          font-weight: 500;
        }

        .nav-item.selected {
          box-shadow: inset 0 0 0 1px rgba(16, 163, 127, 0.35);
        }

        .nav-item.active.selected {
          box-shadow: inset 0 0 0 1px rgba(16, 163, 127, 0.6);
        }

        .nav-text {
          flex: 1;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: break-word;
        }

        .toc-toggle-btn {
          width: 18px;
          height: 18px;
          border: none;
          border-radius: 4px;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: currentColor;
          cursor: pointer;
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          flex-shrink: 0;
          transition: opacity 0.15s ease, visibility 0.15s ease, background 0.2s ease, color 0.2s ease;
        }

        .nav-item.active .toc-toggle-btn {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
        }

        .toc-toggle-btn:hover {
          background: var(--item-hover-bg);
          color: var(--primary-color);
        }

        .toc-icon {
          display: inline-flex;
          width: 14px;
          height: 14px;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .toc-icon svg {
          width: 100%;
          height: 100%;
          display: block;
          stroke: currentColor;
          fill: none;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .nav-toc {
          margin-top: 6px;
          padding: 6px 8px;
          border-radius: 6px;
        }

        .nav-toc-item,
        .nav-toc-empty {
          font-size: 11px;
          line-height: 1.45;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .nav-toc-item {
          width: 100%;
          border: none;
          background: transparent;
          text-align: left;
          cursor: pointer;
          padding: 1px 0;
          margin: 0;
          display: block;
          font: inherit;
          color: var(--text-muted);
        }

        .nav-toc-item:hover {
          color: var(--text-color);
        }

        .nav-toc-item:focus-visible,
        .nav-toc-item:active {
          color: var(--text-color);
        }

        .nav-toc-empty {
          padding: 1px 0;
        }

        .nav-toc-item.level-2 { padding-left: 10px; }
        .nav-toc-item.level-3 { padding-left: 20px; }
        .nav-toc-item.level-4 { padding-left: 30px; }
        .nav-toc-item.level-5 { padding-left: 40px; }
        .nav-toc-item.level-6 { padding-left: 50px; }

        .empty-state {
          padding: 30px 20px;
          text-align: center;
          color: var(--text-muted);
          font-size: 12px;
          opacity: 0.8;
        }

        .toast {
          position: absolute;
          left: 50%;
          bottom: 8px;
          transform: translate(-50%, 8px);
          background: rgba(17, 24, 39, 0.92);
          color: #f9fafb;
          font-size: 11px;
          line-height: 1.3;
          padding: 6px 10px;
          border-radius: 8px;
          max-width: 220px;
          text-overflow: ellipsis;
          white-space: nowrap;
          overflow: hidden;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        .toast.visible {
          opacity: 1;
          transform: translate(-50%, 0);
        }

        /* Scrollbar */
        .nav-list::-webkit-scrollbar {
          width: 4px;
        }
        .nav-list::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.1);
          border-radius: 10px;
        }
        .dark .nav-list::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
        }
      </style>
      <div id="sidebar">
        <div class="header">
          <span class="header-title">Sinan</span>
          <div class="header-actions">
            <button class="export-btn reveal-on-engage" type="button" title="Select messages to export" aria-label="Select messages to export" disabled>
              <span class="header-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M12 4v10"></path>
                  <path d="m7.5 10.5 4.5 4.5 4.5-4.5"></path>
                  <path d="M5 19h14"></path>
                </svg>
              </span>
            </button>
            <button class="toggle-btn" type="button" title="Toggle Sidebar" aria-label="Toggle Sidebar">
              <span class="header-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="m9 6 6 6-6 6"></path>
                </svg>
              </span>
            </button>
          </div>
        </div>
        <div class="nav-list">
          <div class="empty-state">No messages yet...</div>
        </div>
        <div class="export-footer">
          <span class="footer-selection-count">Selected 0</span>
          <div class="footer-actions">
            <button class="footer-download-btn" disabled>Download</button>
            <button class="footer-cancel-btn">Cancel</button>
          </div>
        </div>
        <div class="toast" aria-live="polite"></div>
      </div>
    `;
    
    this.shadowRoot.querySelector('.toggle-btn').onclick = () => this.toggleCollapse();
    this.shadowRoot.querySelector('.export-btn').onclick = (event) => {
      event.stopPropagation();
      this.handleExportClick();
    };
    this.shadowRoot.querySelector('.footer-download-btn').onclick = (event) => {
      event.stopPropagation();
      this.handleDownloadClick();
    };
    this.shadowRoot.querySelector('.footer-cancel-btn').onclick = (event) => {
      event.stopPropagation();
      this.handleCancelExportClick();
    };
    // Also allow clicking the collapsed sidebar bubble to expand
    this.shadowRoot.querySelector('#sidebar').onclick = (e) => {
        if (this.isCollapsed && !e.target.closest('.toggle-btn')) {
            this.toggleCollapse();
        }
    };
    this.syncSidebarInteractionState();
    
    this.updateMessages();
  }
}

window.SidebarUI = SidebarUI;
