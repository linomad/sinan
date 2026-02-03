/**
 * Manages the Sidebar UI using Shadow DOM.
 * Includes Scroll Spy and Collapse functionality.
 */
class SidebarUI {
  constructor(adapter) {
    this.adapter = adapter;
    this.container = null;
    this.shadowRoot = null;
    this.isCollapsed = false;
    this.activeId = null;
    this.intersectionObserver = null;
  }

  mount() {
    this.container = document.createElement('div');
    this.container.id = 'chat-navigator-root';
    document.body.appendChild(this.container);
    this.shadowRoot = this.container.attachShadow({ mode: 'open' }); // Changed to open for easier debugging if needed

    this.render();
    this.setupListeners();
    this.initScrollSpy();
  }

  setupListeners() {
    // Listen for DOM changes to update list
    this.adapter.observeMutations(() => {
      this.updateMessages();
      this.initScrollSpy(); // Re-init scroll spy for new elements
    });
  }

  /**
   * IntersectionObserver detects which message is currently in viewport
   */
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
        root: null, // Use viewport
        rootMargin: '-10% 0px -70% 0px', // Trigger when item is in the upper part of screen
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
            // Auto-scroll the sidebar list to keep active item in view
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
        toggleBtn.innerHTML = '‹'; // Arrow pointing left
    } else {
        sidebar.classList.remove('collapsed');
        toggleBtn.innerHTML = '›'; // Arrow pointing right (to close)
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
          --primary-color: #10a37f;
          --primary-hover: #1a7f64;
          --bg-color: rgba(255, 255, 255, 0.8);
          --text-color: #333;
          --text-muted: #666;
          --border-color: rgba(0,0,0,0.08);
          --shadow: 0 8px 32px rgba(0,0,0,0.12);
          --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        #sidebar {
          position: fixed;
          right: 20px;
          top: 15%;
          width: 260px;
          max-height: 70vh;
          background: var(--bg-color);
          backdrop-filter: blur(12px) saturate(180%);
          -webkit-backdrop-filter: blur(12px) saturate(180%);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          box-shadow: var(--shadow);
          z-index: 999999;
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
          transition: var(--transition);
          overflow: hidden;
          transform-origin: right center;
        }

        #sidebar.collapsed {
          width: 40px;
          height: 40px;
          border-radius: 20px;
          transform: translateX(10px);
        }

        #sidebar.collapsed .header span, 
        #sidebar.collapsed .nav-list {
          display: none;
        }

        .header {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
          user-select: none;
        }

        .header span {
          font-weight: 600;
          font-size: 14px;
          color: var(--text-color);
          letter-spacing: -0.01em;
        }

        .toggle-btn {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border-radius: 6px;
          transition: background 0.2s;
          font-size: 18px;
          color: var(--text-muted);
          line-height: 1;
        }

        .toggle-btn:hover {
          background: rgba(0,0,0,0.05);
          color: var(--primary-color);
        }

        .nav-list {
          overflow-y: overlay;
          padding: 10px 0;
          flex: 1;
        }

        .nav-item {
          padding: 8px 16px;
          margin: 2px 8px;
          border-radius: 8px;
          font-size: 13px;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          transition: var(--transition);
          position: relative;
        }

        .nav-item:hover {
          background: rgba(0,0,0,0.03);
          color: var(--text-color);
        }

        .nav-item.active {
          background: rgba(16, 163, 127, 0.08);
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
          background: #ccc;
          margin-top: 6px;
          flex-shrink: 0;
          transition: var(--transition);
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
          color: #999;
          font-size: 12px;
        }

        /* Scrollbar */
        .nav-list::-webkit-scrollbar {
          width: 5px;
        }
        .nav-list::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.1);
          border-radius: 10px;
        }
      </style>
      <div id="sidebar">
        <div class="header">
          <span>Chat Navigator</span>
          <div class="toggle-btn" title="Toggle Sidebar">›</div>
        </div>
        <div class="nav-list">
          <div class="empty-state">No messages yet...</div>
        </div>
      </div>
    `;
    
    this.shadowRoot.querySelector('.toggle-btn').onclick = () => this.toggleCollapse();
    this.updateMessages();
  }
}

window.SidebarUI = SidebarUI;