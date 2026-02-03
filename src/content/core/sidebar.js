/**
 * Manages the Sidebar UI using Shadow DOM.
 */
class SidebarUI {
  constructor(adapter) {
    this.adapter = adapter;
    this.container = null;
    this.shadowRoot = null;
    this.isVisible = true;
  }

  mount() {
    // Create container and Shadow DOM to isolate styles
    this.container = document.createElement('div');
    this.container.id = 'chat-navigator-root';
    document.body.appendChild(this.container);
    this.shadowRoot = this.container.attachShadow({ mode: 'closed' });

    this.render();
    this.setupListeners();
  }

  setupListeners() {
    // Listen for DOM changes from adapter
    this.adapter.observeMutations(() => {
      this.updateMessages();
    });
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
      <div class="nav-item" data-id="${msg.id}" title="${msg.text.replace(/"/g, '&quot;')}">
        <span class="nav-bullet"></span>
        <span class="nav-text">${this.truncate(msg.text, 40)}</span>
      </div>
    `).join('');

    // Add click events
    this.shadowRoot.querySelectorAll('.nav-item').forEach(item => {
      item.onclick = () => {
        const id = item.getAttribute('data-id');
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Flash effect on the target element
          target.style.transition = 'background-color 0.5s';
          const originalBg = target.style.backgroundColor;
          target.style.backgroundColor = 'rgba(255, 255, 0, 0.2)';
          setTimeout(() => target.style.backgroundColor = originalBg, 1000);
        }
      };
    });
  }

  truncate(str, n) {
    return (str.length > n) ? str.substr(0, n - 1) + '&hellip;' : str;
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --primary-color: #10a37f;
          --bg-color: rgba(255, 255, 255, 0.85);
          --text-color: #333;
          --border-color: rgba(0,0,0,0.1);
        }

        #sidebar {
          position: fixed;
          right: 20px;
          top: 80px;
          width: 240px;
          max-height: 70vh;
          background: var(--bg-color);
          backdrop-filter: blur(10px);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          z-index: 999999;
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          transition: transform 0.3s ease;
          overflow: hidden;
        }

        .header {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color);
          font-weight: 600;
          font-size: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255,255,255,0.5);
        }

        .nav-list {
          overflow-y: auto;
          padding: 8px 0;
          flex: 1;
        }

        .nav-item {
          padding: 10px 16px;
          font-size: 13px;
          color: var(--text-color);
          cursor: pointer;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          transition: background 0.2s;
          border-left: 3px solid transparent;
        }

        .nav-item:hover {
          background: rgba(16, 163, 127, 0.1);
          color: var(--primary-color);
        }

        .nav-bullet {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--primary-color);
          margin-top: 6px;
          flex-shrink: 0;
        }

        .nav-text {
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .empty-state {
          padding: 20px;
          text-align: center;
          color: #888;
          font-size: 13px;
        }

        /* Scrollbar styling */
        .nav-list::-webkit-scrollbar {
          width: 4px;
        }
        .nav-list::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.1);
          border-radius: 2px;
        }
      </style>
      <div id="sidebar">
        <div class="header">
          <span>Chat Navigator</span>
          <span style="font-size: 10px; color: #888;">User Only</span>
        </div>
        <div class="nav-list">
          <div class="empty-state">Loading messages...</div>
        </div>
      </div>
    `;
    this.updateMessages();
  }
}

window.SidebarUI = SidebarUI;
