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

  refreshNavItemStates(shouldScrollActiveIntoView) {
    if (!this.shadowRoot) return;
    const items = this.shadowRoot.querySelectorAll('.nav-item');
    items.forEach(item => {
      const itemId = item.getAttribute('data-id');
      const isActive = itemId === this.activeId;
      const isSelected = this.isExportMode && this.selectedIds.has(itemId);

      item.classList.toggle('active', isActive);
      item.classList.toggle('selected', isSelected);

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

    this.setActiveItem(id);

    // Prioritize the element reference if valid and connected
    const target = msg.element && msg.element.isConnected ? msg.element : document.getElementById(id);
    if (target) {
      this.adapter.scrollToElement(target);
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
  }

  updateMessages() {
    const messages = this.adapter.getUserMessages();
    const listContainer = this.shadowRoot.querySelector('.nav-list');
    if (!listContainer) return;

    this.hasMessages = messages.length > 0;
    const messageIds = new Set(messages.map(message => message.id));
    if (this.selectedIds.size > 0) {
      this.selectedIds = new Set(
        Array.from(this.selectedIds).filter(id => messageIds.has(id))
      );
    }
    if (this.activeId && !messageIds.has(this.activeId)) {
      this.activeId = null;
    }

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

    listContainer.innerHTML = messages.map(msg => `
      <div class="nav-item ${msg.id === this.activeId ? 'active' : ''} ${this.selectedIds.has(msg.id) ? 'selected' : ''}" data-id="${msg.id}" title="${SidebarUI.escapeHtml(msg.text)}">
        <span class="nav-bullet"></span>
        <span class="nav-text">${SidebarUI.escapeHtml(msg.text)}</span>
      </div>
    `).join('');

    this.shadowRoot.querySelectorAll('.nav-item').forEach((item, index) => {
      item.onclick = () => {
        const msg = messages[index];
        const id = item.getAttribute('data-id');
        this.handleNavItemClick(msg, id);
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
          --bullet-color: #D1D5DB;
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
          --bullet-color: #4B5563;
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
          padding: 8px 12px;
          margin-bottom: 2px;
          border-radius: 8px;
          font-size: 13px;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          transition: all 0.2s;
          position: relative;
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

        .nav-item.active .nav-bullet {
          background: var(--primary-color);
          transform: scale(1.2);
          box-shadow: 0 0 8px rgba(16, 163, 127, 0.4);
        }

        .nav-bullet {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--bullet-color);
          margin-top: 7px;
          flex-shrink: 0;
          transition: all 0.3s;
        }

        .nav-text {
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: break-word;
        }

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
