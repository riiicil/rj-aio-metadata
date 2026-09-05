/**
 * RJ AIO Metadata Extension — In-Page Draggable Overlay HUD Controller
 * Isolated Shadow DOM Injection & Floating Interface
 * Reference: ADR-002 (Dual UI Strategy), DESIGN.md (Raycast Dark Precision)
 */

// Platform Keyword Count Constraints & Hints
const PLATFORM_LIMITS = {
  adobestock: { min: 8, max: 49, hint: 'Min 8, Max 49' },
  dreamstime: { min: 8, max: 70, hint: 'Min 8, Max 70' },
  miricanvas: { min: 8, max: 25, hint: 'Min 8, Max 25' },
  shutterstock: { min: 8, max: 50, hint: 'Min 8, Max 50' },
  freepik: { min: 8, max: 50, hint: 'Min 8, Max 50' },
  vecteezy: { min: 8, max: 50, hint: 'Min 8, Max 50' },
  depositphotos: { min: 8, max: 50, hint: 'Min 8, Max 50' }
};

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
    this.isTransitioning = false;
    this.startX = 0;
    this.startY = 0;
    this.initialLeft = 24;
    this.initialTop = 80;
    this.mounted = false;

    // Platform & Asset Detection
    this.platformId = this.detectPlatformId();
    this.platformName = this.detectPlatform();
    this.assetCount = 0;
    this.isAutomationRunning = false;
    this.scanInterval = null;
    this.mutationObserver = null;
    this.saveDebounceTimer = null;

    // Bind event handlers
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);
    this.onStorageChanged = this.onStorageChanged.bind(this);
  }

  /**
   * Initializes and mounts the HUD in the host page DOM.
   */
  async init() {
    if (this.mounted) return;
    this.mount();
    this.setupAdaptiveQuickForm();
    await this.restorePositionAndState();
    await this.restoreAutomationState();
    await this.syncFromStorage();
    this.startAssetScanner();
  }

  /**
   * Identifies the platform ID key based on hostname.
   * @returns {string} Platform ID
   */
  detectPlatformId() {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('stock.adobe.com')) return 'adobestock';
    if (host.includes('shutterstock.com')) return 'shutterstock';
    if (host.includes('dreamstime.com')) return 'dreamstime';
    if (host.includes('vecteezy.com')) return 'vecteezy';
    if (host.includes('freepik.com')) return 'freepik';
    if (host.includes('depositphotos.com')) return 'depositphotos';
    if (host.includes('miricanvas.com')) return 'miricanvas';
    return 'unknown';
  }

  /**
   * Detects the active microstock contributor platform display name based on hostname.
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
   * Detects the number of unsubmitted asset cards currently present on the page.
   * @returns {{ count: number, selector: string }}
   */
  detectAssetCount() {
    const host = window.location.hostname.toLowerCase();
    let selector = '';

    if (host.includes('stock.adobe.com')) {
      selector = 'div.upload-tile';
    } else if (host.includes('shutterstock.com')) {
      selector = 'div[data-testid="asset-card"]';
    } else if (host.includes('freepik.com')) {
      selector = 'div.catalog__item';
    } else if (host.includes('vecteezy.com')) {
      selector = 'div[data-testid="resource-card"]';
    } else if (host.includes('dreamstime.com')) {
      selector = 'div.upload-item[id]';
    } else if (host.includes('depositphotos.com')) {
      selector = 'tr.unfinished__item';
    } else if (host.includes('miricanvas.com')) {
      selector = 'div.css-1qnaji9.e1pyeb4g3, div.panda-ehlNbj div.panda-gFNlpN';
    }

    if (!selector) return { count: 0, selector: '' };

    const elements = document.querySelectorAll(selector);
    return { count: elements.length, selector };
  }

  /**
   * Updates live asset counter labels and minimized pill status.
   */
  updateAssetCounter() {
    const { count } = this.detectAssetCount();
    this.assetCount = count;

    const countTextEl = this.shadow?.querySelector('#rjAssetCountText');
    if (countTextEl) {
      if (count > 0) {
        countTextEl.textContent = `${count} Asset${count === 1 ? '' : 's'} Found`;
      } else if (this.platformId !== 'unknown') {
        countTextEl.textContent = '0 Assets Detected';
      } else {
        countTextEl.textContent = 'Scanning assets...';
      }
    }

    // Update pill status text when idle
    if (!this.isAutomationRunning) {
      const pillStatus = this.shadow?.querySelector('#rjPillStatus');
      if (pillStatus) {
        pillStatus.textContent = count > 0 ? `${count} Assets` : 'Ready';
      }
    }
  }

  /**
   * Starts periodic and reactive asset scanner.
   */
  startAssetScanner() {
    this.updateAssetCounter();

    if (!this.scanInterval) {
      this.scanInterval = setInterval(() => {
        if (!this.isAutomationRunning) {
          this.updateAssetCounter();
        }
      }, 2500);
    }

    if (!this.mutationObserver && document.body) {
      let debounceTimer = null;
      this.mutationObserver = new MutationObserver(() => {
        if (this.isAutomationRunning) return;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.updateAssetCounter();
        }, 300);
      });
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
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
            <!-- Row 1: Live Asset Counter & Progress Indicator -->
            <div class="rj-hud-asset-bar">
              <div class="rj-hud-asset-info">
                <span class="rj-hud-asset-label" id="rjAssetCountText">Scanning assets...</span>
                <span class="rj-hud-status-badge" id="rjAutomationBadge">
                  <span class="rj-hud-status-dot" id="rjAutomationDot"></span>
                  <span id="rjAutomationStatusText">Idle</span>
                </span>
              </div>
              <!-- Mini Progress Track (Visible during automation) -->
              <div class="rj-hud-progress-track" id="rjProgressTrack" style="display: none;">
                <div class="rj-hud-progress-fill" id="rjProgressFill" style="width: 0%;"></div>
              </div>
            </div>

            <!-- Row 2: Target Keyword Count (Adaptive Stepper) -->
            <div class="rj-hud-field-group">
              <div class="rj-hud-field-header">
                <span class="rj-hud-field-label">Keyword Count</span>
                <span class="rj-hud-field-hint" id="rjKeywordLimitHint">Min 8, Max 50</span>
              </div>
              <div class="rj-hud-stepper">
                <button type="button" class="rj-hud-stepper-btn" id="rjBtnDecKeywords" title="Decrease" aria-label="Decrease">
                  <svg class="rj-hud-icon-svg" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                <input type="number" id="rjInputKeywordCount" class="rj-hud-stepper-input" min="8" max="50" value="50">
                <button type="button" class="rj-hud-stepper-btn" id="rjBtnIncKeywords" title="Increase" aria-label="Increase">
                  <svg class="rj-hud-icon-svg" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
              </div>
            </div>

            <!-- Row 3: Add Specific Keywords (Index 0 Priority) -->
            <div class="rj-hud-field-group">
              <div class="rj-hud-field-header">
                <span class="rj-hud-field-label">Specific Keywords</span>
                <span class="rj-hud-field-hint">Index 0</span>
              </div>
              <input type="text" id="rjInputSpecificKeywords" class="rj-hud-input" placeholder="e.g. train, transit (comma-separated)">
            </div>

            <!-- Row 4: AI / Generative Declaration (Adaptive: Hidden on Shutterstock & Depositphotos) -->
            <div class="rj-hud-switch-row" id="rjAiDeclarationRow">
              <div class="rj-hud-switch-info">
                <span class="rj-hud-switch-title">AI Declaration</span>
                <span class="rj-hud-switch-desc">Declare AI asset</span>
              </div>
              <label class="rj-hud-switch">
                <input type="checkbox" id="rjToggleAiDeclaration">
                <span class="rj-hud-slider"></span>
              </label>
            </div>

            <!-- Row 5: Primary Automation Action Button -->
            <button type="button" id="rjBtnToggleAutomation" class="rj-hud-btn-action rj-btn-start">
              <svg id="rjAutomationIcon" class="rj-hud-icon-svg" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              <span id="rjAutomationBtnText">Start Automation</span>
            </button>
          </div>
        </div>

        <!-- Minimized Floating Pill -->
        <div class="rj-hud-pill rj-hidden" id="rjHudPill">
          <div class="rj-hud-brand" id="rjPillBrand" style="cursor: pointer;">
            <img class="rj-hud-logo" src="${logoUrl}" alt="RJ">
            <span class="rj-hud-pill-status" id="rjPillStatus">Ready</span>
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
   * Applies platform-specific boundaries, hints, and visibility rules to the Quick Form.
   */
  setupAdaptiveQuickForm() {
    if (!this.shadow) return;

    const limits = PLATFORM_LIMITS[this.platformId] || { min: 8, max: 50, hint: 'Min 8, Max 50' };
    const inputCount = this.shadow.querySelector('#rjInputKeywordCount');
    const hintEl = this.shadow.querySelector('#rjKeywordLimitHint');
    const aiRow = this.shadow.querySelector('#rjAiDeclarationRow');

    if (inputCount) {
      inputCount.min = String(limits.min);
      inputCount.max = String(limits.max);
      inputCount.value = String(limits.max);
    }
    if (hintEl) {
      hintEl.textContent = limits.hint;
    }

    // AI Declaration is hidden on Shutterstock and Depositphotos
    if (aiRow) {
      if (this.platformId === 'shutterstock' || this.platformId === 'depositphotos') {
        aiRow.style.display = 'none';
      } else {
        aiRow.style.display = 'flex';
      }
    }
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
        this.setMinimized(true, true, true);
      });
    }

    if (btnExpand) {
      btnExpand.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setMinimized(false, true, true);
      });
    }

    if (pillBrand) {
      pillBrand.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        this.setMinimized(false, true, true);
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

    // Quick Form Stepper Controls
    const btnDec = this.shadow.querySelector('#rjBtnDecKeywords');
    const btnInc = this.shadow.querySelector('#rjBtnIncKeywords');
    const inputCount = this.shadow.querySelector('#rjInputKeywordCount');
    const limits = PLATFORM_LIMITS[this.platformId] || { min: 8, max: 50 };

    if (btnDec && inputCount) {
      btnDec.addEventListener('click', (e) => {
        e.stopPropagation();
        let val = Number(inputCount.value) || limits.min;
        if (val > limits.min) {
          inputCount.value = val - 1;
          this.saveFormStateToStorage();
        }
      });
    }

    if (btnInc && inputCount) {
      btnInc.addEventListener('click', (e) => {
        e.stopPropagation();
        let val = Number(inputCount.value) || limits.max;
        if (val < limits.max) {
          inputCount.value = val + 1;
          this.saveFormStateToStorage();
        }
      });
    }

    if (inputCount) {
      inputCount.addEventListener('change', () => {
        let val = Number(inputCount.value) || limits.min;
        if (val < limits.min) val = limits.min;
        if (val > limits.max) val = limits.max;
        inputCount.value = val;
        this.saveFormStateToStorage();
      });
    }

    // Specific Keywords Input
    const specificInput = this.shadow.querySelector('#rjInputSpecificKeywords');
    if (specificInput) {
      specificInput.addEventListener('input', () => {
        this.saveFormStateToStorage();
      });
    }

    // AI Declaration Toggle
    const aiToggle = this.shadow.querySelector('#rjToggleAiDeclaration');
    if (aiToggle) {
      aiToggle.addEventListener('change', () => {
        this.saveFormStateToStorage();
      });
    }

    // Automation Toggle Button
    const btnAutomation = this.shadow.querySelector('#rjBtnToggleAutomation');
    if (btnAutomation) {
      btnAutomation.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!this.isAutomationRunning && !this.isProviderReady(this.currentConfig)) {
          return;
        }
        this.isAutomationRunning = !this.isAutomationRunning;
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          chrome.storage.local.set({
            rj_automation_state: {
              isRunning: this.isAutomationRunning,
              platformId: this.platformId,
              timestamp: Date.now()
            }
          });
        }
        this.updateAutomationUI(this.isAutomationRunning);
      });
    }

    // Listen to chrome.storage.onChanged for bidirectional sync
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(this.onStorageChanged);
    }

    // Global drag move/up listeners on document window
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('resize', this.onWindowResize);
  }

  /**
   * Checks if the active provider has valid credentials and a selected model.
   * @param {Object} config
   * @returns {boolean}
   */
  isProviderReady(config) {
    if (!config) return false;
    const activeProvId = config.activeProvider || 'gemini';
    const provider = config.providers ? config.providers[activeProvId] : null;
    if (!provider) return false;

    const rawKey = (provider.apiKey || '').trim();
    const keys = rawKey.split(/[\r\n,\s\t]+/).filter(k => k.trim().length > 0);
    const model = (provider.selectedModel || '').trim();

    return keys.length > 0 && model.length > 0;
  }

  /**
   * Updates start button disabled status based on active provider readiness.
   */
  updateStartButtonReadiness() {
    if (this.isAutomationRunning) return;
    const btn = this.shadow?.querySelector('#rjBtnToggleAutomation');
    if (btn) {
      const ready = this.isProviderReady(this.currentConfig);
      btn.disabled = !ready;
      btn.title = ready ? 'Start Automation' : 'Please configure AI model in popup first';
    }
  }

  /**
   * Toggles disabled state on all HUD quick form controls during active automation.
   * @param {boolean} disabled
   */
  setFormControlsDisabled(disabled) {
    if (!this.shadow) return;

    const btnDec = this.shadow.querySelector('#rjBtnDecKeywords');
    const btnInc = this.shadow.querySelector('#rjBtnIncKeywords');
    const inputCount = this.shadow.querySelector('#rjInputKeywordCount');
    const specificInput = this.shadow.querySelector('#rjInputSpecificKeywords');
    const aiToggle = this.shadow.querySelector('#rjToggleAiDeclaration');
    const stepper = this.shadow.querySelector('.rj-hud-stepper');

    if (btnDec) btnDec.disabled = disabled;
    if (btnInc) btnInc.disabled = disabled;
    if (inputCount) inputCount.disabled = disabled;
    if (specificInput) specificInput.disabled = disabled;
    if (aiToggle) aiToggle.disabled = disabled;
    if (stepper) {
      if (disabled) stepper.classList.add('disabled');
      else stepper.classList.remove('disabled');
    }
  }

  /**
   * Handles chrome.storage.onChanged events for bidirectional synchronization.
   * @param {Object} changes
   * @param {string} areaName
   */
  onStorageChanged(changes, areaName) {
    // 1. Sync config / platformSettings / providers / activeProvider changes from Popup
    if (changes.platformSettings || changes.activePlatform || changes.providers || changes.activeProvider) {
      this.syncFromStorage();
    }
    // 2. Sync automation start/stop state changes
    if (changes.rj_automation_state) {
      const state = changes.rj_automation_state.newValue;
      if (state) {
        const isRunning = Boolean(state.isRunning);
        if (this.isAutomationRunning !== isRunning) {
          this.updateAutomationUI(isRunning);
        }
      }
    }
  }

  /**
   * Updates automation UI indicators (buttons, badges, progress bar, pill status) and field disabled states.
   * @param {boolean} isRunning
   */
  updateAutomationUI(isRunning) {
    this.isAutomationRunning = isRunning;
    if (!this.shadow) return;

    const btn = this.shadow.querySelector('#rjBtnToggleAutomation');
    const btnText = this.shadow.querySelector('#rjAutomationBtnText');
    const icon = this.shadow.querySelector('#rjAutomationIcon');
    const badge = this.shadow.querySelector('#rjAutomationBadge');
    const statusText = this.shadow.querySelector('#rjAutomationStatusText');
    const progressTrack = this.shadow.querySelector('#rjProgressTrack');
    const pillStatus = this.shadow.querySelector('#rjPillStatus');

    if (isRunning) {
      if (btn) {
        btn.classList.remove('rj-btn-start');
        btn.classList.add('rj-btn-stop');
        btn.disabled = false;
        btn.title = 'Stop Automation';
      }
      if (btnText) btnText.textContent = 'Stop Automation';
      if (icon) icon.innerHTML = '<rect x="6" y="6" width="12" height="12"></rect>';
      if (badge) badge.classList.add('rj-running');
      if (statusText) statusText.textContent = 'Running';
      if (progressTrack) progressTrack.style.display = 'block';
      if (pillStatus) pillStatus.textContent = 'Running...';
    } else {
      if (btn) {
        btn.classList.remove('rj-btn-stop');
        btn.classList.add('rj-btn-start');
        const ready = this.isProviderReady(this.currentConfig);
        btn.disabled = !ready;
        btn.title = ready ? 'Start Automation' : 'Please configure AI model in popup first';
      }
      if (btnText) btnText.textContent = 'Start Automation';
      if (icon) icon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
      if (badge) badge.classList.remove('rj-running');
      if (statusText) statusText.textContent = 'Idle';
      if (progressTrack) progressTrack.style.display = 'none';
      if (pillStatus) {
        pillStatus.textContent = this.assetCount > 0 ? `${this.assetCount} Assets` : 'Ready';
      }
    }

    // Disable inputs while running, re-enable when idle
    this.setFormControlsDisabled(isRunning);
  }

  /**
   * Synchronizes input values from chrome.storage.
   */
  async syncFromStorage() {
    if (!this.shadow || typeof chrome === 'undefined' || !chrome.storage) return;

    return new Promise((resolve) => {
      const getter = chrome.storage.sync ? chrome.storage.sync : chrome.storage.local;
      getter.get(null, (res) => {
        let config = res || {};
        if (chrome.runtime.lastError || !config.platformSettings) {
          if (chrome.storage.local) {
            chrome.storage.local.get(null, (localRes) => {
              this.currentConfig = localRes || {};
              this._applyConfigToInputs(this.currentConfig);
              this.updateStartButtonReadiness();
              resolve();
            });
            return;
          }
        }
        this.currentConfig = config;
        this._applyConfigToInputs(config);
        this.updateStartButtonReadiness();
        resolve();
      });
    });
  }

  /**
   * Applies loaded configuration settings to Quick Form inputs.
   * @private
   */
  _applyConfigToInputs(config) {
    if (!this.shadow || !config || !config.platformSettings) return;

    const platSettings = config.platformSettings[this.platformId];
    if (!platSettings) return;

    const limits = PLATFORM_LIMITS[this.platformId] || { min: 8, max: 50 };
    const inputCount = this.shadow.querySelector('#rjInputKeywordCount');
    const specificInput = this.shadow.querySelector('#rjInputSpecificKeywords');
    const aiToggle = this.shadow.querySelector('#rjToggleAiDeclaration');

    if (inputCount && inputCount !== this.shadow.activeElement) {
      const val = typeof platSettings.keywordCount === 'number' ? platSettings.keywordCount : limits.max;
      inputCount.value = Math.max(limits.min, Math.min(limits.max, val));
    }

    if (specificInput && specificInput !== this.shadow.activeElement) {
      specificInput.value = platSettings.specificKeywords || '';
    }

    if (aiToggle && platSettings.isAiGenerated !== undefined) {
      aiToggle.checked = Boolean(platSettings.isAiGenerated);
    }
  }

  /**
   * Debounced persistence of Quick Form inputs into chrome.storage.
   */
  saveFormStateToStorage() {
    if (this.saveDebounceTimer) clearTimeout(this.saveDebounceTimer);
    this.saveDebounceTimer = setTimeout(() => {
      if (typeof chrome === 'undefined' || !chrome.storage) return;

      const limits = PLATFORM_LIMITS[this.platformId] || { min: 8, max: 50 };
      const countInput = this.shadow?.querySelector('#rjInputKeywordCount');
      const specificInput = this.shadow?.querySelector('#rjInputSpecificKeywords');
      const aiToggle = this.shadow?.querySelector('#rjToggleAiDeclaration');

      const keywordCount = countInput ? Math.max(limits.min, Math.min(limits.max, Number(countInput.value) || limits.max)) : limits.max;
      const specificKeywords = specificInput ? specificInput.value.trim() : '';
      const isAiGenerated = aiToggle ? aiToggle.checked : false;

      const getter = chrome.storage.sync ? chrome.storage.sync : chrome.storage.local;
      getter.get(null, (res) => {
        const config = res || {};
        if (!config.platformSettings) config.platformSettings = {};
        if (!config.platformSettings[this.platformId]) config.platformSettings[this.platformId] = {};

        config.platformSettings[this.platformId].keywordCount = keywordCount;
        config.platformSettings[this.platformId].specificKeywords = specificKeywords;
        if (this.platformId !== 'shutterstock' && this.platformId !== 'depositphotos') {
          config.platformSettings[this.platformId].isAiGenerated = isAiGenerated;
        }

        if (chrome.storage.sync) {
          chrome.storage.sync.set(config, () => {
            if (chrome.runtime.lastError && chrome.storage.local) {
              chrome.storage.local.set(config);
            } else if (chrome.storage.local) {
              chrome.storage.local.set(config);
            }
          });
        } else if (chrome.storage.local) {
          chrome.storage.local.set(config);
        }
      });
    }, 300);
  }

  /**
   * Restores running automation state from chrome.storage.local.
   */
  async restoreAutomationState() {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) {
        resolve();
        return;
      }
      chrome.storage.local.get(['rj_automation_state'], (res) => {
        if (res && res.rj_automation_state) {
          const isRunning = Boolean(res.rj_automation_state.isRunning);
          this.updateAutomationUI(isRunning);
        }
        resolve();
      });
    });
  }

  /**
   * Drag initiation handler on mousedown.
   */
  onMouseDown(e) {
    // Ignore clicks on action buttons, inputs, or switch labels inside header or pill
    if (e.target.closest('button') || e.target.closest('.rj-hud-btn-icon') || e.target.closest('input') || e.target.closest('label')) {
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
   * Toggles between Expanded HUD Card and Minimized Pill states with transition animation.
   * @param {boolean} minimized
   * @param {boolean} shouldSave
   * @param {boolean} animate
   */
  setMinimized(minimized, shouldSave = true, animate = true) {
    this.isMinimized = minimized;

    if (!animate) {
      if (this.isMinimized) {
        this.cardEl.classList.add('rj-hidden');
        this.pillEl.classList.remove('rj-hidden');
      } else {
        this.cardEl.classList.remove('rj-hidden');
        this.pillEl.classList.add('rj-hidden');
      }

      requestAnimationFrame(() => {
        const rect = this.wrapper.getBoundingClientRect();
        this.clampAndSetPosition(rect.left, rect.top);
        if (shouldSave) this.savePosition();
      });
      return;
    }

    if (this.isTransitioning) return;
    this.isTransitioning = true;

    if (this.isMinimized) {
      // Animate Card out
      this.cardEl.classList.remove('rj-anim-expanding');
      this.cardEl.classList.add('rj-anim-minimizing');

      setTimeout(() => {
        this.cardEl.classList.add('rj-hidden');
        this.cardEl.classList.remove('rj-anim-minimizing');

        this.pillEl.classList.remove('rj-hidden');
        this.pillEl.classList.remove('rj-pill-exiting');
        this.pillEl.classList.add('rj-pill-entering');

        requestAnimationFrame(() => {
          const rect = this.wrapper.getBoundingClientRect();
          this.clampAndSetPosition(rect.left, rect.top);
          if (shouldSave) this.savePosition();
        });

        setTimeout(() => {
          this.pillEl.classList.remove('rj-pill-entering');
          this.isTransitioning = false;
        }, 220);
      }, 120);
    } else {
      // Animate Pill out
      this.pillEl.classList.remove('rj-pill-entering');
      this.pillEl.classList.add('rj-pill-exiting');

      setTimeout(() => {
        this.pillEl.classList.add('rj-hidden');
        this.pillEl.classList.remove('rj-pill-exiting');

        this.cardEl.classList.remove('rj-hidden');
        this.cardEl.classList.remove('rj-anim-minimizing');
        this.cardEl.classList.add('rj-anim-expanding');

        requestAnimationFrame(() => {
          const rect = this.wrapper.getBoundingClientRect();
          this.clampAndSetPosition(rect.left, rect.top);
          if (shouldSave) this.savePosition();
        });

        setTimeout(() => {
          this.cardEl.classList.remove('rj-anim-expanding');
          this.isTransitioning = false;
        }, 240);
      }, 100);
    }
  }

  /**
   * Shows the overlay HUD.
   */
  show() {
    if (!this.wrapper) return;
    this.wrapper.classList.remove('rj-hidden');
    this.isVisible = true;

    // Trigger graceful entry animation based on active state
    if (this.isMinimized && this.pillEl) {
      this.pillEl.classList.remove('rj-pill-exiting');
      this.pillEl.classList.add('rj-pill-entering');
      setTimeout(() => this.pillEl.classList.remove('rj-pill-entering'), 220);
    } else if (this.cardEl) {
      this.cardEl.classList.remove('rj-anim-minimizing');
      this.cardEl.classList.add('rj-anim-expanding');
      setTimeout(() => this.cardEl.classList.remove('rj-anim-expanding'), 240);
    }

    requestAnimationFrame(() => {
      const rect = this.wrapper.getBoundingClientRect();
      this.clampAndSetPosition(rect.left, rect.top);
    });
  }

  /**
   * Hides the overlay HUD with exit animation.
   */
  hide() {
    if (!this.wrapper) return;
    if (this.isMinimized && this.pillEl) {
      this.pillEl.classList.add('rj-pill-exiting');
      setTimeout(() => {
        this.wrapper.classList.add('rj-hidden');
        this.pillEl.classList.remove('rj-pill-exiting');
        this.isVisible = false;
      }, 120);
    } else if (this.cardEl) {
      this.cardEl.classList.add('rj-anim-minimizing');
      setTimeout(() => {
        this.wrapper.classList.add('rj-hidden');
        this.cardEl.classList.remove('rj-anim-minimizing');
        this.isVisible = false;
      }, 130);
    } else {
      this.wrapper.classList.add('rj-hidden');
      this.isVisible = false;
    }
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
      if (typeof chrome === 'undefined' || !chrome.storage?.local) {
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
            this.setMinimized(true, false, false);
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
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
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

  /**
   * Cleanup method to clear intervals and observers when tearing down.
   */
  destroy() {
    if (this.scanInterval) clearInterval(this.scanInterval);
    if (this.mutationObserver) this.mutationObserver.disconnect();
    if (this.saveDebounceTimer) clearTimeout(this.saveDebounceTimer);
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.removeListener(this.onStorageChanged);
    }
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('resize', this.onWindowResize);
    if (this.host && this.host.parentNode) {
      this.host.parentNode.removeChild(this.host);
    }
  }
}
