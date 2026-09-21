/**
 * RJ AIO Metadata Extension — In-Page Draggable Overlay HUD Controller
 * Isolated Shadow DOM Injection & Floating Interface
 * Reference: ADR-002 (Dual UI Strategy), DESIGN.md (Raycast Dark Precision)
 */

import { getAdapterForUrl } from '../adapters/index.js';
import { logger } from '../services/LoggerService.js';
import { AutomationOrchestrator } from './AutomationOrchestrator.js';

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

export const DONATION_URL = 'https://s.id/rjsupport'; // Ganti dengan URL donasi Anda (Saweria, Trakteer, Buy Me a Coffee, dll)

export const HUD_DONATION_VARIANTS = [
  {
    label: 'Send a coffee',
    iconSvg: `<svg class="rj-hud-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>`,
    title: 'Send a coffee to support development'
  },
  {
    label: 'Donate a coin',
    iconSvg: `<svg class="rj-hud-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"></circle><path d="M18.09 10.37A6 6 0 1 1 10.34 18"></path><path d="M7 6h1v4"></path></svg>`,
    title: 'Donate a coin to support development'
  },
  {
    label: 'Support dev',
    iconSvg: `<svg class="rj-hud-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>`,
    title: 'Support extension development'
  },
  {
    label: 'Gift a pizza',
    iconSvg: `<svg class="rj-hud-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 11h.01"></path><path d="M11 15h.01"></path><path d="M16 16h.01"></path><path d="m2 2 20 7-9 13Z"></path><path d="M16 11a4 4 0 0 1-4 4"></path></svg>`,
    title: 'Gift a pizza to support development'
  },
  {
    label: 'Sponsor dev',
    iconSvg: `<svg class="rj-hud-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>`,
    title: 'Sponsor the development of RJ AIO Metadata'
  }
];

export const hudCoffeeSvg = HUD_DONATION_VARIANTS[0].iconSvg;

export const hudSpinnerSvg = `
  <svg class="rj-hud-icon-svg rj-rotating rj-status-icon-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
  </svg>
`;

export const pillSpinnerSvg = `
  <svg class="rj-hud-icon-svg rj-status-icon-spinner" viewBox="0 0 24 24" fill="none" stroke="#079183" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="2" x2="12" y2="6"></line>
    <line x1="12" y1="18" x2="12" y2="22"></line>
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
    <line x1="2" y1="12" x2="6" y2="12"></line>
    <line x1="18" y1="12" x2="22" y2="12"></line>
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
  </svg>
`;

export const pillReadySvg = `
  <svg class="rj-hud-icon-svg rj-status-icon-ready" viewBox="0 0 24 24" fill="none" stroke="#59d499" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
`;

export const PLATFORM_NAMES = {
  adobestock: 'Adobe Stock',
  shutterstock: 'Shutterstock',
  dreamstime: 'Dreamstime',
  vecteezy: 'Vecteezy',
  freepik: 'Freepik',
  depositphotos: 'Depositphotos',
  miricanvas: 'MiriCanvas'
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
    this.currentTab = 'general';
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
    this.tabId = null;
    this.isLockedByOtherPlatform = false;
    this.assetCount = 0;
    this.isAutomationRunning = false;
    this.isStopping = false;
    this.isCardProcessing = false;
    this.abortController = null;
    this.scanInterval = null;
    this.mutationObserver = null;
    this.saveDebounceTimer = null;
    this.isSyncingFromStorage = false;
    this.orchestrator = new AutomationOrchestrator(this);

    // Support & Live Progress Ticker state
    this.hudSupportTickerInterval = null;
    this.hudSupportTickerPhase = 'progress';
    this.hudLatestProgressText = '';
    this.hudDonationVariantIndex = 0;

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
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        chrome.runtime.sendMessage({ action: 'GET_SENDER_TAB_ID' }, (res) => {
          if (res && res.tabId) {
            this.tabId = res.tabId;
          }
        });
      } catch {
        // Non-fatal if runtime message fails
      }
    }
    this.mount();
    this.setupAdaptiveQuickForm();
    await this.restorePositionAndState();
    await this.restoreAutomationState();
    await this.syncFromStorage();
    this.startAssetScanner();
  }

  /**
   * Identifies the platform ID key based on active URL adapter.
   * @returns {string} Platform ID
   */
  detectPlatformId() {
    const url = typeof window !== 'undefined' ? window.location?.href : '';
    const adapter = getAdapterForUrl(url);
    if (adapter) return adapter.platformId;
    return 'unknown';
  }

  /**
   * Detects the active microstock contributor platform display name based on active URL adapter.
   * @returns {string} Platform display name
   */
  detectPlatform() {
    const url = typeof window !== 'undefined' ? window.location?.href : '';
    const adapter = getAdapterForUrl(url);
    if (adapter) return adapter.platformName;
    return 'Unknown Page';
  }

  /**
   * Detects the number of unsubmitted asset cards or active asset ID currently present on the page.
   * @returns {{ count: number, mediaType?: string, isSingleAsset?: boolean, assetId?: string, label: string, selector: string }}
   */
  detectAssetCount() {
    const host = typeof window !== 'undefined' ? (window.location?.hostname?.toLowerCase() || '') : '';

    // 1. Adobe Stock
    if (host.includes('stock.adobe.com')) {
      const elements = document.querySelectorAll('div.upload-tile');
      const count = elements.length;
      return {
        count,
        label: count > 0 ? `${count} Asset${count === 1 ? '' : 's'} Found` : '0 Assets Detected',
        selector: 'div.upload-tile'
      };
    }

    // 2. Shutterstock
    if (host.includes('shutterstock.com')) {
      const isVideoPath = window.location.pathname.includes('/video');
      const isPhotoPath = window.location.pathname.includes('/photo');
      const btnPhoto = document.querySelector('button[data-testid="media-type-photo-button"]');
      const btnVideo = document.querySelector('button[data-testid="media-type-video-button"]');
      const cards = document.querySelectorAll('div[data-testid="asset-card"]');

      // Determine active media type: check path or button attributes
      let isVideo = isVideoPath;
      if (!isVideoPath && !isPhotoPath) {
        if (btnVideo && (
          btnVideo.getAttribute('aria-pressed') === 'true' ||
          btnVideo.getAttribute('aria-selected') === 'true' ||
          btnVideo.getAttribute('data-selected') === 'true' ||
          btnVideo.classList.contains('active') ||
          btnVideo.classList.contains('selected')
        )) {
          isVideo = true;
        }
      }

      const mediaType = isVideo ? 'Videos' : 'Images';
      const targetBtn = isVideo ? btnVideo : (btnPhoto || btnVideo);

      let count = cards.length;
      if (targetBtn) {
        const text = targetBtn.textContent.trim();
        const match = text.match(/(?:Images?|Videos?|Photos?)\s*\(\s*(\d+)\s*\)/i);
        if (match) {
          const parsed = parseInt(match[1], 10);
          if (!isNaN(parsed)) {
            count = parsed;
          }
        }
      }

      // Format media-specific label (e.g. "0 Images Detected", "1 Image Detected", "5 Videos Detected")
      const pluralLabel = (count === 1 && mediaType.endsWith('s')) ? mediaType.slice(0, -1) : mediaType;
      return {
        count,
        mediaType,
        label: `${count} ${pluralLabel} Detected`,
        selector: 'div[data-testid="asset-card"]'
      };
    }

    // 3. Freepik / Magnific
    if (host.includes('freepik.com') || host.includes('magnific.com')) {
      const allElements = Array.from(document.querySelectorAll('div.catalog__item, div[data-testid*="catalog-item"]'));
      const elements = allElements.filter(
        (el) => !el.classList?.contains('catalog__item--fake') && !(el.getAttribute?.('class') || '').includes('catalog__item--fake')
      );
      const count = elements.length;
      return {
        count,
        label: count > 0 ? `${count} Asset${count === 1 ? '' : 's'} Found` : '0 Assets Detected',
        selector: 'div.catalog__item:not(.catalog__item--fake)'
      };
    }

    // 4. Vecteezy
    if (host.includes('vecteezy.com')) {
      const elements = document.querySelectorAll('div[data-testid="resource-card"]');
      const count = elements.length;
      return {
        count,
        label: count > 0 ? `${count} Asset${count === 1 ? '' : 's'} Found` : '0 Assets Detected',
        selector: 'div[data-testid="resource-card"]'
      };
    }

    // 5. Dreamstime
    if (host.includes('dreamstime.com')) {
      // Check for single asset edit mode (e.g. /upload/edit473814624)
      const editMatch = window.location.pathname.match(/\/upload\/edit(\d+)/i);
      let assetId = editMatch ? editMatch[1] : null;
      if (!assetId) {
        const headingEl = document.querySelector('h1, .upload-title, .breadcrumb, div.breadcrumbs');
        const headingMatch = headingEl?.textContent.match(/Submit file\s*(\d+)/i);
        if (headingMatch) assetId = headingMatch[1];
      }

      if (assetId) {
        return {
          count: 1,
          isSingleAsset: true,
          assetId,
          label: `In ID ${assetId}`,
          selector: 'window.location.pathname'
        };
      }

      // Multi-asset upload list mode (/upload)
      const elements = document.querySelectorAll('div.upload-item[id]');
      const count = elements.length;
      return {
        count,
        label: count > 0 ? `${count} Asset${count === 1 ? '' : 's'} Found` : '0 Assets Detected',
        selector: 'div.upload-item[id]'
      };
    }

    // 6. Depositphotos
    if (host.includes('depositphotos.com')) {
      // A. Check active subtab: Images (32), Vectors (3), PNG (1), Videos (1), Audio (0)
      const activeTabEl = document.querySelector(
        '.cmp-tabs__tab_active a.cmp-tabs__link, li.cmp-tabs__tab_active a, .cmp-tabs__tab.cmp-tabs__tab_active, .seller-menu-files-counts li.active a, .cmp-tabs__tab_active'
      );
      if (activeTabEl) {
        const text = activeTabEl.textContent.trim();
        const match = text.match(/^([a-zA-Z]+)\s*\((\d+)\)/i);
        if (match) {
          const mediaType = match[1];
          const count = parseInt(match[2], 10);
          const pluralLabel = (count === 1 && mediaType.endsWith('s')) ? mediaType.slice(0, -1) : mediaType;
          return {
            count,
            mediaType,
            label: `${count} ${pluralLabel} Detected`,
            selector: '.cmp-tabs__tab_active'
          };
        }
      }

      // B. Fallback: match URL query param ?type= against tabs
      const urlType = new URLSearchParams(window.location.search).get('type') || 'image';
      const allTabs = document.querySelectorAll('.cmp-tabs__link, .cmp-tabs__tab a, .seller-menu-files-counts a');
      for (const tab of allTabs) {
        const tabText = tab.textContent.trim();
        const match = tabText.match(/^([a-zA-Z]+)\s*\((\d+)\)/i);
        if (match) {
          const tabMedia = match[1].toLowerCase();
          if (tabMedia.startsWith(urlType) || (urlType === 'image' && tabMedia.startsWith('image'))) {
            const count = parseInt(match[2], 10);
            const pluralLabel = (count === 1 && match[1].endsWith('s')) ? match[1].slice(0, -1) : match[1];
            return {
              count,
              mediaType: match[1],
              label: `${count} ${pluralLabel} Detected`,
              selector: '.cmp-tabs__link'
            };
          }
        }
      }

      // C. Fallback: modern item cards or table rows on page
      const rows = document.querySelectorAll(
        '.itemslist > div.itemeditor, div._unfinished__section_items table tbody tr, table.unfinished-files tbody tr, tr.unfinished__item'
      );
      if (rows.length > 0) {
        return {
          count: rows.length,
          mediaType: 'Assets',
          label: `${rows.length} Asset${rows.length === 1 ? '' : 's'} Detected`,
          selector: '.itemslist > div.itemeditor'
        };
      }

      // D. Fallback: counter badge
      const counterBadge = document.querySelector('span._counter-unfinished, .sub-menu__info._counter-unfinished');
      if (counterBadge) {
        const total = parseInt(counterBadge.textContent.trim(), 10);
        if (!isNaN(total)) {
          return {
            count: total,
            mediaType: 'Assets',
            label: `${total} Asset${total === 1 ? '' : 's'} Detected`,
            selector: 'span._counter-unfinished'
          };
        }
      }

      return { count: 0, mediaType: 'Assets', label: '0 Assets Detected', selector: '' };
    }

    // 7. MiriCanvas
    if (host.includes('miricanvas.com')) {
      const realListArticles = Array.from(
        document.querySelectorAll(
          'ul[data-f="TU-5eb5"] article[data-f="CA-d943"], ul[data-f="TU-5eb5"] > li > article, ul[data-f="TU-5eb5"] article'
        )
      );
      const validArticles = realListArticles.length > 0
        ? realListArticles
        : Array.from(
          document.querySelectorAll(
            'article[data-f="CA-d943"], ul > li > article, article.er317d30, article.css-3q5rav, article'
          )
        ).filter((a) => !a.closest?.('ul[data-f="GU-fa4b"], ul.panda-ecnXzs'));

      const count = validArticles.length;
      return {
        count,
        label: count > 0 ? `${count} Asset${count === 1 ? '' : 's'} Found` : '0 Assets Detected',
        selector: 'ul[data-f="TU-5eb5"] article, article[data-f="CA-d943"]'
      };
    }

    // 8. Unknown / Non-microstock platform
    return {
      count: 0,
      label: 'Assets Not Detected',
      selector: ''
    };
  }

  /**
   * Updates live asset counter labels and minimized pill status.
   */
  updateAssetCounter() {
    const res = this.detectAssetCount();
    this.assetCount = res.count;

    const countTextEl = this.shadow?.querySelector('#rjAssetCountText');
    if (countTextEl) {
      countTextEl.textContent = res.label;
    }

    // Update pill status text/icon when idle
    if (!this.isAutomationRunning) {
      const pillStatus = this.shadow?.querySelector('#rjPillStatus');
      if (pillStatus) {
        if (this.platformId === 'unknown') {
          pillStatus.innerHTML = `
            <svg class="rj-hud-icon-svg rj-status-icon-not-ready" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          `;
          pillStatus.title = 'Not on a supported microstock tab';
        } else {
          const readySvg = `
            <svg class="rj-hud-icon-svg rj-status-icon-ready" viewBox="0 0 24 24" fill="none" stroke="#59d499" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          `;
          const layersSvg = `
            <svg class="rj-hud-icon-svg rj-status-icon-layers" viewBox="0 0 24 24" fill="none" stroke="#59d499" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
          `;
          if (res.isSingleAsset && res.assetId) {
            pillStatus.innerHTML = `${layersSvg}<span>ID: ${res.assetId}</span>`;
            pillStatus.title = `In ID ${res.assetId}`;
          } else if (res.count > 0) {
            const badgeText = res.mediaType && res.mediaType !== 'Assets' ? `${res.count} ${res.mediaType}` : `${res.count} Assets`;
            pillStatus.innerHTML = `${layersSvg}<span>${badgeText}</span>`;
            pillStatus.title = res.label;
          } else {
            pillStatus.innerHTML = readySvg;
            pillStatus.title = `Ready on Tab (${this.platformName})`;
          }
        }
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
            <!-- Warning Banner for Non-Microstock Tabs -->
            <div class="rj-hud-warning-banner" id="rjHudWarningBanner" style="display: none;">
              <svg class="rj-hud-icon-svg" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>Not a supported microstock page.</span>
            </div>

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

            <!-- Row 5: Primary Automation Actions -->
            <div class="rj-hud-actions-row">
              <button type="button" id="rjBtnHudSupportProgress" class="rj-hud-btn-action rj-btn-support" style="display: none;" title="Send a coffee to support development">
                <span id="rjHudSupportProgressIcon"></span>
                <span id="rjHudSupportProgressText">Send a coffee</span>
              </button>
              <button type="button" id="rjBtnToggleAutomation" class="rj-hud-btn-action rj-btn-start">
                <svg id="rjAutomationIcon" class="rj-hud-icon-svg" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                <span id="rjAutomationBtnText">Start Automation</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Minimized Floating Pill -->
        <div class="rj-hud-pill rj-hidden" id="rjHudPill">
          <div class="rj-hud-brand" id="rjPillBrand" style="cursor: pointer;">
            <img class="rj-hud-logo" src="${logoUrl}" alt="RJ">
            <span class="rj-hud-pill-status" id="rjPillStatus"></span>
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

    if (!this.isVisible && this.wrapper) {
      this.wrapper.classList.add('rj-hidden');
    }

    // Attach listeners
    this.attachEventListeners();
    this.mounted = true;
  }

  /**
   * Applies platform-specific boundaries, hints, and visibility rules to the Quick Form.
   */
  setupAdaptiveQuickForm() {
    if (!this.shadow) return;

    const warningBanner = this.shadow.querySelector('#rjHudWarningBanner');
    if (warningBanner) {
      warningBanner.style.display = (this.platformId === 'unknown') ? 'flex' : 'none';
    }

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
        if (this.platformId === 'freepik') {
          if (aiToggle.checked && inputCount && Number(inputCount.value) >= 50) {
            inputCount.value = 49;
          } else if (!aiToggle.checked && inputCount && Number(inputCount.value) === 49) {
            inputCount.value = 50;
          }
        }
        this.saveFormStateToStorage();
      });
    }

    // Support / Donate Button Click Listener
    const btnHudSupport = this.shadow.querySelector('#rjBtnHudSupportProgress');
    if (btnHudSupport) {
      btnHudSupport.addEventListener('click', (e) => {
        e.stopPropagation();
        try {
          window.open(DONATION_URL, '_blank');
        } catch (err) {
          console.error('Failed to open donation link:', err);
        }
      });
    }

    // Automation Toggle Button
    const btnAutomation = this.shadow.querySelector('#rjBtnToggleAutomation');
    if (btnAutomation) {
      btnAutomation.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isLockedByOtherPlatform || btnAutomation.disabled) {
          return;
        }
        if (this.isStopping) {
          return; // Already in graceful stopping process; button is disabled to prevent double-clicks
        } else if (this.isAutomationRunning) {
          this.stopAutomation();
        } else {
          this.startAutomation();
        }
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
   * @returns {boolean} True if ready
   */
  isProviderReady(config) {
    if (!config || !config.providers) return false;
    const activeProvId = config.activeProvider || 'gemini';
    const provider = config.providers ? config.providers[activeProvId] : null;
    if (!provider) return false;

    const rawKey = (provider.apiKey || '').trim();
    const keys = rawKey.split(/[\r\n,\s\t]+/).filter(k => k.trim().length > 0);
    const model = (provider.selectedModel || '').trim();

    return keys.length > 0 && model.length > 0;
  }

  /**
   * Locks HUD controls when automation is active on another platform tab.
   * @param {string} runnerPlatformId
   */
  setLockedByOtherPlatformUI(runnerPlatformId) {
    this.isLockedByOtherPlatform = true;
    if (!this.shadow) return;

    this.stopHudSupportTicker();
    const btnSupport = this.shadow.querySelector('#rjBtnHudSupportProgress');
    if (btnSupport) {
      btnSupport.style.display = 'none';
    }

    const runnerName = PLATFORM_NAMES[runnerPlatformId] || runnerPlatformId || 'another platform';
    const btn = this.shadow.querySelector('#rjBtnToggleAutomation');
    const btnText = this.shadow.querySelector('#rjAutomationBtnText');
    const icon = this.shadow.querySelector('#rjAutomationIcon');
    const badge = this.shadow.querySelector('#rjAutomationBadge');

    if (btn) {
      btn.classList.remove('rj-btn-start', 'rj-btn-stop', 'rj-btn-stopping', 'rj-btn-accent');
      btn.classList.add('rj-btn-disabled', 'rj-btn-locked');
      btn.disabled = true;
      btn.title = `Automation is currently running on ${runnerName}. Stop it on that tab or wait until finished.`;
    }
    if (btnText) {
      btnText.textContent = `Running on ${runnerName}`;
    }
    if (icon) {
      // SVG Lock icon (Phosphor / Lucide 14x14)
      icon.innerHTML = '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>';
    }
    if (badge) {
      badge.classList.remove('rj-running');
    }
    this.setStatusBadge(`Busy (${runnerName})`, `Automation is currently running on ${runnerName}. Only one platform can run at a time.`);
  }

  /**
   * Unlocks HUD controls when automation on another platform stops.
   */
  clearLockedByOtherPlatformUI() {
    this.isLockedByOtherPlatform = false;
    if (!this.shadow) return;
    this.updateAutomationUI(false);
    this.updateStartButtonReadiness();
  }

  /**
   * Updates start button disabled status based on active provider readiness.
   */
  updateStartButtonReadiness() {
    if (this.isAutomationRunning || this.isStopping || this.isLockedByOtherPlatform) return;
    const btn = this.shadow?.querySelector('#rjBtnToggleAutomation');
    if (btn) {
      if (this.platformId === 'unknown') {
        btn.disabled = true;
        btn.title = 'Open a supported microstock contributor page to run automation';
        return;
      }
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
        const isStopping = Boolean(state.isStopping || state.status === 'stopping');

        // Exclusive automation lock: check if state belongs to another platform
        if (state.platformId && state.platformId !== this.platformId) {
          if (isRunning || isStopping) {
            this.setLockedByOtherPlatformUI(state.platformId);
          } else if (this.isLockedByOtherPlatform) {
            this.clearLockedByOtherPlatformUI();
          }
          return;
        }

        // State belongs to this platform (or global reset)
        if (this.isLockedByOtherPlatform) {
          this.clearLockedByOtherPlatformUI();
        }

        if (state.progressText) {
          this.updateHudSupportProgress(state.progressText);
        }

        if (isStopping && !this.isStopping && this.isAutomationRunning) {
          // External graceful stop triggered from popup
          this.stopAutomation();
        } else if (!isRunning && !isStopping && (this.isAutomationRunning || this.isStopping)) {
          // External stop triggered
          this.stopAutomation(true);
        } else if (isRunning && !isStopping && !this.isAutomationRunning && !this.isStopping) {
          // External start triggered from popup
          this.startAutomation();
        }
      }
    }
  }

  /**
   * Sets text and tooltip title on the automation status badge.
   * @param {string} text
   * @param {string} [tooltip]
   */
  setStatusBadge(text, tooltip = text) {
    if (!this.shadow) return;
    const statusText = this.shadow.querySelector('#rjAutomationStatusText');
    const badge = this.shadow.querySelector('#rjAutomationBadge');
    if (statusText) {
      statusText.textContent = text;
      statusText.title = tooltip;
    }
    if (badge) {
      badge.title = tooltip;
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
    const btnSupport = this.shadow.querySelector('#rjBtnHudSupportProgress');
    const btnText = this.shadow.querySelector('#rjAutomationBtnText');
    const icon = this.shadow.querySelector('#rjAutomationIcon');
    const badge = this.shadow.querySelector('#rjAutomationBadge');
    const progressTrack = this.shadow.querySelector('#rjProgressTrack');
    const pillStatus = this.shadow.querySelector('#rjPillStatus');

    if (this.isStopping) {
      if (btnSupport) {
        btnSupport.style.display = 'flex';
        btnSupport.classList?.add('rj-visible');
        this.startHudSupportTicker();
      }
      if (btn) {
        btn.classList.remove('rj-btn-start', 'rj-btn-stop', 'rj-btn-accent');
        btn.classList.add('rj-btn-stopping', 'rj-btn-disabled');
        btn.disabled = true;
        btn.title = 'Stopping automation (saving work)...';
      }
      if (btnText) btnText.textContent = 'Stopping...';
      if (icon) icon.innerHTML = '<rect x="6" y="6" width="12" height="12"></rect>';
      if (badge) badge.classList.add('rj-running');
      this.setStatusBadge('Stopping...');
      if (progressTrack) progressTrack.style.display = 'block';
      if (pillStatus) {
        pillStatus.innerHTML = `${pillSpinnerSvg}<span>Stopping...</span>`;
        pillStatus.title = 'Stopping automation (saving work)...';
      }
      this.setFormControlsDisabled(true);
      return;
    }

    if (isRunning) {
      if (btnSupport) {
        btnSupport.style.display = 'flex';
        btnSupport.classList?.add('rj-visible');
        this.startHudSupportTicker();
      }
      if (btn) {
        btn.classList.remove('rj-btn-start', 'rj-btn-stopping', 'rj-btn-disabled', 'rj-btn-locked');
        btn.classList.add('rj-btn-stop');
        btn.disabled = false;
        btn.title = 'Stop';
      }
      if (btnText) btnText.textContent = 'Stop';
      if (icon) icon.innerHTML = '<rect x="6" y="6" width="12" height="12"></rect>';
      if (badge) badge.classList.add('rj-running');
      this.setStatusBadge('Running');
      if (progressTrack) progressTrack.style.display = 'block';
      if (pillStatus) {
        pillStatus.innerHTML = `${pillSpinnerSvg}<span>Running...</span>`;
        pillStatus.title = 'Automation running...';
      }
    } else {
      this.stopHudSupportTicker();
      if (btnSupport) {
        btnSupport.style.display = 'none';
        btnSupport.classList?.remove('rj-visible');
      }
      if (this.isLockedByOtherPlatform) {
        this.setFormControlsDisabled(false);
        return;
      }
      if (btn) {
        btn.classList.remove('rj-btn-stop', 'rj-btn-stopping', 'rj-btn-disabled', 'rj-btn-locked');
        btn.classList.add('rj-btn-start');
        if (this.platformId === 'unknown') {
          btn.disabled = true;
          btn.title = 'Open a supported microstock contributor page to run automation';
        } else {
          const ready = this.isProviderReady(this.currentConfig);
          btn.disabled = !ready;
          btn.title = ready ? 'Start Automation' : 'Please configure AI model in popup first';
        }
      }
      if (btnText) btnText.textContent = 'Start Automation';
      if (icon) icon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
      if (badge) badge.classList.remove('rj-running');
      this.setStatusBadge('Idle');
      if (progressTrack) progressTrack.style.display = 'none';
      this.updateAssetCounter();
    }

    // Disable inputs while running, re-enable when idle
    this.setFormControlsDisabled(isRunning);
  }

  /**
   * Renders the current phase (progress or donation) into HUD support button.
   * @param {boolean} [triggerAnimation=false]
   */
  renderHudSupportTickerContent(triggerAnimation = false) {
    if (!this.shadow) return;
    const btn = this.shadow.querySelector('#rjBtnHudSupportProgress');
    const iconEl = this.shadow.querySelector('#rjHudSupportProgressIcon');
    const textEl = this.shadow.querySelector('#rjHudSupportProgressText');
    if (!btn) return;

    if (this.hudSupportTickerPhase === 'progress') {
      if (iconEl) iconEl.innerHTML = hudSpinnerSvg;
      if (textEl) textEl.textContent = this.hudLatestProgressText || 'Processing...';
      btn.title = this.hudLatestProgressText ? `Progress: ${this.hudLatestProgressText} — Click to support development` : 'Processing... Click to support development';
    } else {
      const variant = HUD_DONATION_VARIANTS[this.hudDonationVariantIndex] || HUD_DONATION_VARIANTS[0];
      if (iconEl) iconEl.innerHTML = variant.iconSvg;
      if (textEl) textEl.textContent = variant.label;
      btn.title = variant.title;
    }

    if (triggerAnimation && btn.classList) {
      btn.classList.remove('rj-ticker-animating');
      if (typeof btn.offsetWidth === 'number') {
        void btn.offsetWidth;
      }
      btn.classList.add('rj-ticker-animating');
    }
  }

  /**
   * Starts rotating HUD ticker between live progress and rotating donation variations.
   */
  startHudSupportTicker() {
    if (this.hudSupportTickerInterval) return;
    this.renderHudSupportTickerContent(false);
    this.hudSupportTickerInterval = setInterval(() => {
      if (this.hudSupportTickerPhase === 'progress') {
        this.hudSupportTickerPhase = 'donate';
        this.hudDonationVariantIndex = (this.hudDonationVariantIndex + 1) % HUD_DONATION_VARIANTS.length;
      } else {
        this.hudSupportTickerPhase = 'progress';
      }
      this.renderHudSupportTickerContent(true);
    }, 3500);
  }

  /**
   * Stops HUD ticker and resets to progress phase.
   */
  stopHudSupportTicker() {
    if (this.hudSupportTickerInterval) {
      clearInterval(this.hudSupportTickerInterval);
      this.hudSupportTickerInterval = null;
    }
    this.hudSupportTickerPhase = 'progress';
    this.hudDonationVariantIndex = 0;
    if (this.shadow) {
      const btn = this.shadow.querySelector('#rjBtnHudSupportProgress');
      if (btn?.classList) {
        btn.classList.remove('rj-ticker-animating');
      }
    }
  }

  /**
   * Updates progress text displayed by HUD support ticker.
   * @param {string} text
   */
  updateHudSupportProgress(text) {
    if (!text) return;
    this.hudLatestProgressText = text;
    if (this.hudSupportTickerPhase === 'progress' && this.shadow) {
      const textEl = this.shadow.querySelector('#rjHudSupportProgressText');
      const btn = this.shadow.querySelector('#rjBtnHudSupportProgress');
      if (textEl) textEl.textContent = text;
      if (btn) btn.title = `Progress: ${text} — Click to support development`;
    }
  }

  /**
   * Starts the batch automation sequence via AutomationOrchestrator.
   * @param {number} [initialCount=0]
   */
  async startAutomation(initialCount = 0) {
    return this.orchestrator.start(initialCount);
  }

  /**
   * Stops automation gracefully with saving, or force aborts if clicked again.
   * @param {boolean} [force=false]
   */
  stopAutomation(force = false) {
    return this.orchestrator.stop(force);
  }

  /**
   * Synchronizes input values from chrome.storage.
   */
  async syncFromStorage() {
    if (!this.shadow || typeof chrome === 'undefined' || !chrome.storage) return;

    this.isSyncingFromStorage = true;
    return new Promise((resolve) => {
      const localStore = chrome.storage.local;
      const syncStore = chrome.storage.sync;

      const applyAndResolve = (config) => {
        this.currentConfig = config || {};
        try {
          this._applyConfigToInputs(this.currentConfig);
          this.updateStartButtonReadiness();
        } finally {
          this.isSyncingFromStorage = false;
        }
        resolve();
      };

      if (localStore) {
        localStore.get(null, (localRes) => {
          if (!chrome.runtime.lastError && localRes && Object.keys(localRes).length > 0 && localRes.platformSettings) {
            applyAndResolve(localRes);
            return;
          }
          if (syncStore) {
            syncStore.get(null, (syncRes) => {
              applyAndResolve(syncRes || localRes || {});
            });
          } else {
            applyAndResolve(localRes || {});
          }
        });
        return;
      }

      if (syncStore) {
        syncStore.get(null, (syncRes) => {
          applyAndResolve(syncRes || {});
        });
        return;
      }

      this.isSyncingFromStorage = false;
      resolve();
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

    if (inputCount && inputCount !== this.shadow.activeElement) {
      let val = typeof platSettings.keywordCount === 'number' ? platSettings.keywordCount : limits.max;
      if (this.platformId === 'freepik' && aiToggle?.checked && val > 49) {
        val = 49;
      }
      inputCount.value = Math.max(limits.min, Math.min(limits.max, val));
    }
  }

  /**
   * Debounced persistence of Quick Form inputs into chrome.storage.
   */
  saveFormStateToStorage() {
    if (this.isSyncingFromStorage) return;
    if (this.saveDebounceTimer) clearTimeout(this.saveDebounceTimer);
    this.saveDebounceTimer = setTimeout(() => {
      if (this.isSyncingFromStorage) return;
      if (typeof chrome === 'undefined' || !chrome.storage) return;

      const limits = PLATFORM_LIMITS[this.platformId] || { min: 8, max: 50 };
      const countInput = this.shadow?.querySelector('#rjInputKeywordCount');
      const specificInput = this.shadow?.querySelector('#rjInputSpecificKeywords');
      const aiToggle = this.shadow?.querySelector('#rjToggleAiDeclaration');

      let keywordCount = countInput ? Math.max(limits.min, Math.min(limits.max, Number(countInput.value) || limits.max)) : limits.max;
      const specificKeywords = specificInput ? specificInput.value.trim() : '';
      const isAiGenerated = aiToggle ? aiToggle.checked : false;
      if (this.platformId === 'freepik' && isAiGenerated && keywordCount > 49) {
        keywordCount = 49;
      }

      const localStore = chrome.storage.local;
      const syncStore = chrome.storage.sync;
      const getter = localStore || syncStore;

      getter.get(null, (res) => {
        const config = res || {};
        if (!config.platformSettings) config.platformSettings = {};
        if (!config.platformSettings[this.platformId]) config.platformSettings[this.platformId] = {};

        config.platformSettings[this.platformId].keywordCount = keywordCount;
        config.platformSettings[this.platformId].specificKeywords = specificKeywords;
        if (this.platformId !== 'shutterstock' && this.platformId !== 'depositphotos') {
          config.platformSettings[this.platformId].isAiGenerated = isAiGenerated;
        }

        if (localStore) {
          localStore.set(config, () => {
            if (syncStore) {
              try {
                const syncConfig = JSON.parse(JSON.stringify(config));
                if (syncConfig.providers) {
                  Object.keys(syncConfig.providers).forEach(k => {
                    if (Array.isArray(syncConfig.providers[k]?.models)) {
                      syncConfig.providers[k].models = syncConfig.providers[k].models.slice(0, 5);
                    }
                  });
                }
                syncStore.set(syncConfig, () => { });
              } catch { }
            }
          });
        } else if (syncStore) {
          syncStore.set(config);
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
          const state = res.rj_automation_state;

          // Exclusive lock check on page load: If another platform is actively running, lock this HUD
          if (state.platformId && state.platformId !== this.platformId) {
            if (state.isRunning || state.isStopping) {
              this.setLockedByOtherPlatformUI(state.platformId);
            }
            resolve();
            return;
          }

          const isRunning = Boolean(state.isRunning);
          const isStopping = Boolean(state.isStopping || state.status === 'stopping');

          // Cross-page continuation for Dreamstime:
          // Dreamstime redirects/reloads between assets (/upload/edit?item_id=...).
          // If the batch was running on Dreamstime and not stopping, maintain running UI
          // and auto-resume orchestrator with the persisted processedCount after DOM settles.
          const isDreamstimeContinuation = this.platformId === 'dreamstime' &&
            state.platformId === 'dreamstime' &&
            isRunning &&
            !isStopping;

          if (isDreamstimeContinuation) {
            this.isAutomationRunning = true;
            this.isStopping = false;
            this.updateAutomationUI(true);
            if (state.progressText) {
              this.updateHudSupportProgress(state.progressText);
            }
            setTimeout(() => {
              if (this.isAutomationRunning && !this.isStopping && !this.orchestrator?.isExecutionLoopActive) {
                this.startAutomation(state.processedCount || 0);
              }
            }, 1000);
            resolve();
            return;
          }

          // Auto-heal on page mount: A newly mounted overlay instance on page reload is never
          // actively stopping an old batch from a dead JS execution context.
          if (isStopping || (isRunning && !this.orchestrator?.isProcessing)) {
            this.isAutomationRunning = false;
            this.isStopping = false;
            this.updateAutomationUI(false);
            chrome.storage.local.set({
              rj_automation_state: {
                isRunning: false,
                isStopping: false,
                status: 'idle',
                platformId: this.platformId || null,
                tabId: this.tabId || null,
                progressText: '',
                processedCount: 0,
                timestamp: Date.now()
              }
            });
            resolve();
            return;
          }

          this.isAutomationRunning = isRunning;
          this.isStopping = isStopping;
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

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ rj_overlay_visible: true });
    }

    // Trigger graceful entry animation based on active state
    if (this.isMinimized && this.pillEl) {
      this.pillEl.classList.remove('rj-hidden');
      this.pillEl.classList.remove('rj-pill-exiting');
      this.pillEl.classList.add('rj-pill-entering');
      setTimeout(() => this.pillEl.classList.remove('rj-pill-entering'), 220);
    } else if (this.cardEl) {
      this.cardEl.classList.remove('rj-hidden');
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
   * @param {boolean} [animate=true]
   */
  hide(animate = true) {
    if (!this.wrapper) return;
    this.isVisible = false;

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ rj_overlay_visible: false });
    }

    if (!animate) {
      this.wrapper.classList.add('rj-hidden');
      if (this.isMinimized && this.pillEl) {
        this.pillEl.classList.add('rj-hidden');
      }
      return;
    }

    if (this.isMinimized && this.pillEl) {
      this.pillEl.classList.add('rj-pill-exiting');
      setTimeout(() => {
        this.wrapper.classList.add('rj-hidden');
        this.pillEl.classList.add('rj-hidden');
        this.pillEl.classList.remove('rj-pill-exiting');
      }, 120);
    } else if (this.cardEl) {
      this.cardEl.classList.add('rj-anim-minimizing');
      setTimeout(() => {
        this.wrapper.classList.add('rj-hidden');
        this.cardEl.classList.remove('rj-anim-minimizing');
      }, 130);
    } else {
      this.wrapper.classList.add('rj-hidden');
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

      chrome.storage.local.get(['rj_hud_pos', 'rj_overlay_visible'], (res) => {
        if (chrome.runtime.lastError) {
          logger.warn('Storage load error:', chrome.runtime.lastError);
          resolve();
          return;
        }

        if (res) {
          if (res.rj_hud_pos) {
            const { top, left, isMinimized } = res.rj_hud_pos;
            if (typeof left === 'number' && typeof top === 'number') {
              this.clampAndSetPosition(left, top);
            }
            if (typeof isMinimized === 'boolean' && isMinimized) {
              this.setMinimized(true, false, false);
            }
          }

          if (res.rj_overlay_visible === false) {
            this.isVisible = false;
            if (this.wrapper) {
              this.wrapper.classList.add('rj-hidden');
            }
            if (this.isMinimized && this.pillEl) {
              this.pillEl.classList.add('rj-hidden');
            }
          } else {
            this.isVisible = true;
            if (this.wrapper) {
              this.wrapper.classList.remove('rj-hidden');
            }
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
        logger.warn('Failed to persist HUD position:', chrome.runtime.lastError);
      }
    });
  }

  /**
   * Cleanup method to clear intervals and observers when tearing down.
   */
  destroy() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
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
