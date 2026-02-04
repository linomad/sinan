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
    this.activeId = null;
    this.intersectionObserver = null;
    this.themeObserver = null;
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
    // Listen for DOM changes to update list
    this.adapter.observeMutations(() => {
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

    // Strategy 1: Check standard classes "dark" or "dark-theme" (Gemini uses dark-theme)
    if (docEl.classList.contains('dark') || 
        bodyEl.classList.contains('dark') ||
        docEl.classList.contains('dark-theme') || 
        bodyEl.classList.contains('dark-theme')) {
      return true;
    }
    
    // Strategy 2: Check data-theme attributes
    const htmlTheme = docEl.getAttribute('data-theme');
    const bodyTheme = bodyEl.getAttribute('data-theme');
    if (htmlTheme === 'dark' || bodyTheme === 'dark') return true;

    // Fallback: System preference
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
    if (this.activeId === id) return;
    this.activeId = id;
    
    const items = this.shadowRoot.querySelectorAll('.nav-item');
    items.forEach(item => {
        if (item.getAttribute('data-id') === id) {
            item.classList.add('active');
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            item.classList.remove('active');
        }
    });
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    const sidebar = this.shadowRoot.querySelector('#sidebar');
    const toggleBtn = this.shadowRoot.querySelector('.toggle-btn');
    
    if (this.isCollapsed) {
        sidebar.classList.add('collapsed');
        toggleBtn.innerHTML = '‹'; 
    } else {
        sidebar.classList.remove('collapsed');
        toggleBtn.innerHTML = '›'; 
    }
  }

  toggleVisibility() {
    this.isVisible = !this.isVisible;
    if (this.container) {
      this.container.style.display = this.isVisible ? 'block' : 'none';
    }
  }

  updateMessages() {
    const messages = this.adapter.getUserMessages();
    const listContainer = this.shadowRoot.querySelector('.nav-list');
    if (!listContainer) return;

    if (messages.length === 0) {
      listContainer.innerHTML = '<div class="empty-state">No user messages found</div>';
      return;
    }

    listContainer.innerHTML = messages.map(msg => `
      <div class="nav-item ${msg.id === this.activeId ? 'active' : ''}" data-id="${msg.id}" title="${msg.text.replace(/"/g, '&quot;')}">
        <span class="nav-bullet"></span>
        <span class="nav-text">${msg.text}</span>
      </div>
    `).join('');

    this.shadowRoot.querySelectorAll('.nav-item').forEach(item => {
      item.onclick = () => {
        const id = item.getAttribute('data-id');
        this.setActiveItem(id);
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      };
    });
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
                      box-shadow 0.3s ease;
                      
          overflow: hidden;
          transform-origin: right center;
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

        #sidebar.collapsed .header span, 
        #sidebar.collapsed .nav-list {
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

        .header span {
          font-weight: 600;
          font-size: 13px;
          color: var(--text-color);
          letter-spacing: 0.02em;
          text-transform: uppercase;
          opacity: 0.9;
        }

        .toggle-btn {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.2s;
          font-size: 18px;
          color: var(--text-muted);
          line-height: 1;
        }

        .toggle-btn:hover {
          background: var(--item-hover-bg);
          color: var(--primary-color);
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
          <span>Sinan</span>
          <div class="toggle-btn" title="Toggle Sidebar">›</div>
        </div>
        <div class="nav-list">
          <div class="empty-state">No messages yet...</div>
        </div>
      </div>
    `;
    
    this.shadowRoot.querySelector('.toggle-btn').onclick = () => this.toggleCollapse();
    // Also allow clicking the collapsed sidebar bubble to expand
    this.shadowRoot.querySelector('#sidebar').onclick = (e) => {
        if (this.isCollapsed && !e.target.closest('.toggle-btn')) {
            this.toggleCollapse();
        }
    };
    
    this.updateMessages();
  }
}

window.SidebarUI = SidebarUI;
