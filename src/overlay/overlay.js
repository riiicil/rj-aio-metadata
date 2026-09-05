/**
 * RJ AIO Metadata Extension — In-Page Draggable Overlay HUD Controller
 * Isolated Shadow DOM Injection & Floating Interface
 * Reference: ADR-002 (Dual UI Strategy), DESIGN.md (Raycast Dark Precision)
 */

export class OverlayHUD {
  constructor() {
    this.hostId = 'rj-overlay-host';
    this.host = null;
    this.shadow = null;
    this.wrapper = null;
    this.cardEl = null;
    this.pillEl = null;
    this.isMinimized = false;
    this.isVisible = true;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.initialLeft = 24;
    this.initialTop = 80;
    this.mounted = false;

    // Bind event handlers
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);
  }

  /**
   * Initializes and mounts the HUD in the host page DOM.
   */
  async init() {
    if (this.mounted) return;
    this.mount();
    await this.restorePositionAndState();
  }

  /**
   * Detects the active microstock contributor platform based on hostname.
   * @returns {string} Platform display name
   */
  detectPlatform() {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('stock.adobe.com')) return 'Adobe Stock';
    if (host.includes('shutterstock.com')) return 'Shutterstock';
    if (host.includes('dreamstime.com')) return 'Dreamstime';
    if (host.includes('vecteezy.com')) return 'Vecteezy';
    if (host.includes('freepik.com')) return 'Freepik';
    if (host.includes('depositphotos.com')) return 'Depositphotos';
    if (host.includes('miricanvas.com')) return 'MiriCanvas';
    return 'Microstock Contributor';
  }

  /**
   * Creates the host container, attaches Shadow Root, and renders HUD template.
   */
  mount() {
    // Avoid duplicate mount
    let existingHost = document.getElementById(this.hostId);
    if (existingHost && existingHost.shadowRoot) {
      this.host = existingHost;
      this.shadow = existingHost.shadowRoot;
      this.wrapper = this.shadow.querySelector('#rjHudWrapper');
      this.cardEl = this.shadow.querySelector('#rjHudCard');
      this.pillEl = this.shadow.querySelector('#rjHudPill');
      this.mounted = true;
      return;
    }

    // 1. Create Host Element
    this.host = document.createElement('div');
    this.host.id = this.hostId;
    const mountParent = document.body || document.documentElement;
    mountParent.appendChild(this.host);

    // 2. Attach Isolated Shadow DOM
    this.shadow = this.host.attachShadow({ mode: 'open' });

    // 3. Inject Scoped CSS
    const cssUrl = chrome.runtime.getURL('overlay/overlay.css');
    const linkEl = document.createElement('link');
    linkEl.rel = 'stylesheet';
    linkEl.href = cssUrl;
    this.shadow.appendChild(linkEl);

    // 4. Render HUD Template
    const logoUrl = chrome.runtime.getURL('icons/logo_rj.png');
    const platformName = this.detectPlatform();

    const template = document.createElement('template');
    template.innerHTML = `
      <div class="rj-hud-wrapper" id="rjHudWrapper" style="top: 80px; left: 24px;">
        <!-- Expanded HUD Card -->
        <div class="rj-hud-card" id="rjHudCard">
          <header class="rj-hud-header" id="rjHudHeader">
            <div class="rj-hud-brand">
              <img class="rj-hud-logo" src="${logoUrl}" alt="RJ">
              <span class="rj-hud-platform-tag" title="${platformName}">${platformName}</span>
            </div>
            <div class="rj-hud-actions">
              <button class="rj-hud-btn-icon" id="rjBtnMinimize" title="Minimize to pill" type="button" aria-label="Minimize">
                <svg class="rj-hud-icon-svg" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
              <button class="rj-hud-btn-icon rj-close" id="rjBtnCloseCard" title="Close HUD" type="button" aria-label="Close">
                <svg class="rj-hud-icon-svg" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </header>
          <div class="rj-hud-body" id="rjHudBody">
            <div class="rj-hud-status-row">
              <span style="color: #9c9c9d; font-size: 11px;">Status</span>
              <span class="rj-hud-status-badge">
                <span class="rj-hud-status-dot"></span>
                <span>Connected</span>
              </span>
            </div>
            <div style="font-size: 11px; color: #8e8f90; line-height: 1.4; border-top: 1px solid #1a1b1c; padding-top: 8px;">
              Overlay HUD active on <strong style="color: #ffffff;">${platformName}</strong>. Ready for batch automation.
            </div>
          </div>
        </div>

        <!-- Minimized Floating Pill -->
        <div class="rj-hud-pill rj-hidden" id="rjHudPill">
          <div class="rj-hud-brand" id="rjPillBrand" style="cursor: pointer;">
            <img class="rj-hud-logo" src="${logoUrl}" alt="RJ">
            <span class="rj-hud-pill-title">RJ AIO</span>
            <span class="rj-hud-pill-status">Ready</span>
          </div>
          <div class="rj-hud-actions">
            <button class="rj-hud-btn-icon" id="rjBtnExpand" title="Expand HUD" type="button" aria-label="Expand">
              <svg class="rj-hud-icon-svg" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg>
            </button>
            <button class="rj-hud-btn-icon rj-close" id="rjBtnClosePill" title="Close HUD" type="button" aria-label="Close">
              <svg class="rj-hud-icon-svg" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
      </div>
    `;

    this.shadow.appendChild(template.content.cloneNode(true));

    // Cache elements
    this.wrapper = this.shadow.querySelector('#rjHudWrapper');
    this.cardEl = this.shadow.querySelector('#rjHudCard');
    this.pillEl = this.shadow.querySelector('#rjHudPill');

    // Attach listeners
    this.attachEventListeners();
    this.mounted = true;
  }

  /**
   * Attaches UI event listeners for dragging, state toggling, and controls.
   */
  attachEventListeners() {
    const header = this.shadow.querySelector('#rjHudHeader');
    const pill = this.shadow.querySelector('#rjHudPill');
    const btnMinimize = this.shadow.querySelector('#rjBtnMinimize');
    const btnExpand = this.shadow.querySelector('#rjBtnExpand');
    const btnCloseCard = this.shadow.querySelector('#rjBtnCloseCard');
    const btnClosePill = this.shadow.querySelector('#rjBtnClosePill');
    const pillBrand = this.shadow.querySelector('#rjPillBrand');

    // Drag handlers
    if (header) header.addEventListener('mousedown', this.onMouseDown);
    if (pill) pill.addEventListener('mousedown', this.onMouseDown);

    // Minimize / Expand controls
    if (btnMinimize) {
      btnMinimize.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setMinimized(true);
      });
    }

    if (btnExpand) {
      btnExpand.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setMinimized(false);
      });
    }

    if (pillBrand) {
      pillBrand.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        this.setMinimized(false);
      });
    }

    // Close controls
    if (btnCloseCard) {
      btnCloseCard.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hide();
      });
    }

    if (btnClosePill) {
      btnClosePill.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hide();
      });
    }

    // Global drag move/up listeners on document window
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('resize', this.onWindowResize);
  }

  /**
   * Drag initiation handler on mousedown.
   */
  onMouseDown(e) {
    // Ignore clicks on action buttons inside header or pill
    if (e.target.closest('button') || e.target.closest('.rj-hud-btn-icon')) {
      return;
    }

    e.preventDefault();
    this.isDragging = true;
    this.startX = e.clientX;
    this.startY = e.clientY;

    const rect = this.wrapper.getBoundingClientRect();
    this.initialLeft = rect.left;
    this.initialTop = rect.top;
  }

  /**
   * Drag tracking handler on mousemove with bounds clamping.
   */
  onMouseMove(e) {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.startX;
    const deltaY = e.clientY - this.startY;
    const rawX = this.initialLeft + deltaX;
    const rawY = this.initialTop + deltaY;

    this.clampAndSetPosition(rawX, rawY);
  }

  /**
   * Drag termination handler on mouseup.
   */
  onMouseUp() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.savePosition();
  }

  /**
   * Re-clamps position on window resize to prevent off-screen overflow.
   */
  onWindowResize() {
    if (!this.wrapper) return;
    const rect = this.wrapper.getBoundingClientRect();
    this.clampAndSetPosition(rect.left, rect.top);
  }

  /**
   * Clamps coordinates within viewport boundaries and applies to wrapper style.
   * @param {number} rawX
   * @param {number} rawY
   * @returns {{x: number, y: number}}
   */
  clampAndSetPosition(rawX, rawY) {
    if (!this.wrapper) return { x: rawX, y: rawY };

    const minX = 10;
    const maxX = Math.max(minX, window.innerWidth - this.wrapper.offsetWidth - 10);
    const minY = 10;
    const maxY = Math.max(minY, window.innerHeight - this.wrapper.offsetHeight - 10);

    const clampedX = Math.max(minX, Math.min(maxX, rawX));
    const clampedY = Math.max(minY, Math.min(maxY, rawY));

    this.wrapper.style.left = `${clampedX}px`;
    this.wrapper.style.top = `${clampedY}px`;

    return { x: clampedX, y: clampedY };
  }

  /**
   * Toggles between Expanded HUD Card and Minimized Pill states.
   * @param {boolean} minimized
   * @param {boolean} shouldSave
   */
  setMinimized(minimized, shouldSave = true) {
    this.isMinimized = minimized;

    if (this.isMinimized) {
      this.cardEl.classList.add('rj-hidden');
      this.pillEl.classList.remove('rj-hidden');
    } else {
      this.cardEl.classList.remove('rj-hidden');
      this.pillEl.classList.add('rj-hidden');
    }

    // Re-clamp position after dimensions shift
    requestAnimationFrame(() => {
      const rect = this.wrapper.getBoundingClientRect();
      this.clampAndSetPosition(rect.left, rect.top);
      if (shouldSave) {
        this.savePosition();
      }
    });
  }

  /**
   * Shows the overlay HUD.
   */
  show() {
    if (!this.wrapper) return;
    this.wrapper.classList.remove('rj-hidden');
    this.isVisible = true;
    requestAnimationFrame(() => {
      const rect = this.wrapper.getBoundingClientRect();
      this.clampAndSetPosition(rect.left, rect.top);
    });
  }

  /**
   * Hides the overlay HUD.
   */
  hide() {
    if (!this.wrapper) return;
    this.wrapper.classList.add('rj-hidden');
    this.isVisible = false;
  }

  /**
   * Toggles overlay HUD visibility.
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Restores persistent position and minimized state from chrome.storage.local.
   */
  async restorePositionAndState() {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
        resolve();
        return;
      }

      chrome.storage.local.get(['rj_hud_pos'], (res) => {
        if (chrome.runtime.lastError) {
          console.warn('[RJ AIO Metadata] Storage load error:', chrome.runtime.lastError);
          resolve();
          return;
        }

        if (res && res.rj_hud_pos) {
          const { top, left, isMinimized } = res.rj_hud_pos;
          if (typeof left === 'number' && typeof top === 'number') {
            this.clampAndSetPosition(left, top);
          }
          if (typeof isMinimized === 'boolean' && isMinimized) {
            this.setMinimized(true, false);
          }
        }
        resolve();
      });
    });
  }

  /**
   * Saves current position and minimized state to chrome.storage.local.
   */
  savePosition() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      return;
    }

    const rect = this.wrapper ? this.wrapper.getBoundingClientRect() : { left: 24, top: 80 };
    const left = rect.left;
    const top = rect.top;

    chrome.storage.local.set({
      rj_hud_pos: {
        top,
        left,
        isMinimized: this.isMinimized
      }
    }, () => {
      if (chrome.runtime.lastError) {
        console.warn('[RJ AIO Metadata] Failed to persist HUD position:', chrome.runtime.lastError);
      }
    });
  }
}
