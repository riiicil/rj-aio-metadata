/**
 * RJ AIO Metadata Extension — Popup Controller
 * Manages multi-provider settings, file-based API key import, dynamic model fetching,
 * active tab platform matching, and platform-adaptive dynamic form rendering.
 */

import { StorageService, DEFAULT_CONFIG } from '../services/StorageService.js';

let currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
let activeTabInfo = null;
let isAutomationRunning = false;

// DOM Elements
const platformSelect = document.getElementById('platformSelect');
const platformStatusBadge = document.getElementById('platformStatusBadge');
const statusIcon = document.getElementById('statusIcon');
const statusText = document.getElementById('statusText');
const platformWarningBanner = document.getElementById('platformWarningBanner');
const warningMessage = document.getElementById('warningMessage');
const btnNavigatePlatform = document.getElementById('btnNavigatePlatform');
const btnLaunchOverlay = document.getElementById('btnLaunchOverlay');

const providerSelect = document.getElementById('providerSelect');
const baseUrlInput = document.getElementById('baseUrlInput');
const apiKeyInput = document.getElementById('apiKeyInput');
const btnToggleApiKey = document.getElementById('btnToggleApiKey');
const btnBrowseApiKey = document.getElementById('btnBrowseApiKey');
const apiKeyFileInput = document.getElementById('apiKeyFileInput');
const modelSelect = document.getElementById('modelSelect');
const btnFetchModels = document.getElementById('btnFetchModels');
const fetchIcon = document.getElementById('fetchIcon');
const modelCountLabel = document.getElementById('modelCountLabel');
const customModelInput = document.getElementById('customModelInput');

const platformSettingsHeaderTitle = document.getElementById('platformSettingsHeaderTitle');
const keywordCountInput = document.getElementById('keywordCountInput');
const keywordCountLimitHint = document.getElementById('keywordCountLimitHint');
const specificKeywordsInput = document.getElementById('specificKeywordsInput');
const autoSaveDraftToggle = document.getElementById('autoSaveDraftToggle');
const isAiGeneratedToggle = document.getElementById('isAiGeneratedToggle');
const platformSpecificContainer = document.getElementById('platformSpecificContainer');

const btnSaveSettings = document.getElementById('btnSaveSettings');
const btnToggleAutomation = document.getElementById('btnToggleAutomation');
const automationIcon = document.getElementById('automationIcon');
const automationBtnText = document.getElementById('automationBtnText');
const toastNotification = document.getElementById('toastNotification');
const toastMessage = document.getElementById('toastMessage');

/**
 * Toast Notification Utility
 */
function showToast(msg, isError = false) {
  toastMessage.textContent = msg;
  toastNotification.style.borderColor = isError ? 'rgba(255, 97, 97, 0.4)' : 'rgba(89, 212, 153, 0.4)';
  toastNotification.style.color = isError ? '#ff6161' : '#59d499';
  toastNotification.classList.add('rj-toast-visible');
  setTimeout(() => {
    toastNotification.classList.remove('rj-toast-visible');
  }, 2200);
}

/**
 * Checks active tab URL against the currently selected platform.
 */
function updateTabMatchStatus() {
  const selectedPlatform = platformSelect.value;
  if (!activeTabInfo || !activeTabInfo.destinations) {
    platformStatusBadge.className = 'rj-status-badge rj-status-unmatched';
    statusText.textContent = 'No tab';
    platformWarningBanner.style.display = 'none';
    return;
  }

  const targetPlatform = activeTabInfo.destinations[selectedPlatform];
  const currentUrl = activeTabInfo.url || '';
  const isMatch = targetPlatform && currentUrl.includes(targetPlatform.hostPattern);

  if (isMatch) {
    platformStatusBadge.className = 'rj-status-badge rj-status-matched';
    platformStatusBadge.title = 'Active browser tab matches this platform';
    statusText.textContent = 'Ready on Tab';
    statusIcon.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
    platformWarningBanner.style.display = 'none';
  } else {
    platformStatusBadge.className = 'rj-status-badge rj-status-unmatched';
    platformStatusBadge.title = 'Active tab is not on this platform';
    statusText.textContent = 'Not on Tab';
    statusIcon.innerHTML = '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>';
    
    warningMessage.textContent = `Active tab is not ${targetPlatform ? targetPlatform.name : 'this platform'}.`;
    platformWarningBanner.style.display = 'flex';
  }
}

/**
 * Populates the UI with active provider data.
 */
function renderProviderFields(providerId) {
  const provider = currentConfig.providers[providerId] || currentConfig.providers.gemini;
  
  baseUrlInput.value = provider.baseUrl || '';
  apiKeyInput.value = provider.apiKey || '';
  customModelInput.value = provider.customModel || '';

  // Populate model dropdown
  modelSelect.innerHTML = '';
  const models = provider.models && provider.models.length > 0
    ? provider.models
    : [provider.defaultModel || 'default'];

  for (const modelId of models) {
    const opt = document.createElement('option');
    opt.value = modelId;
    opt.textContent = modelId;
    if (modelId === (provider.defaultModel || provider.models[0])) {
      opt.selected = true;
    }
    modelSelect.appendChild(opt);
  }

  modelCountLabel.textContent = `${models.length} models available`;
}

/**
 * Renders platform-specific dynamic form fields.
 */
function renderPlatformSpecificFields(platformId) {
  const settings = currentConfig.platformSettings[platformId] || {};
  platformSettingsHeaderTitle.textContent = `${platformSelect.options[platformSelect.selectedIndex].text} Settings`;

  // Keyword count limits
  if (platformId === 'adobestock') {
    keywordCountInput.max = 49;
    keywordCountLimitHint.textContent = 'Min 8, Max 49 (Adobe limit)';
    if (Number(keywordCountInput.value) > 49) keywordCountInput.value = 49;
  } else if (platformId === 'miricanvas') {
    keywordCountInput.max = 30;
    keywordCountLimitHint.textContent = 'Min 8, Max 30 (MiriCanvas limit)';
    if (Number(keywordCountInput.value) > 30) keywordCountInput.value = 30;
  } else {
    keywordCountInput.max = 50;
    keywordCountLimitHint.textContent = 'Min 8, Max 50';
  }

  keywordCountInput.value = settings.keywordCount || (platformId === 'adobestock' ? 49 : platformId === 'miricanvas' ? 30 : 50);
  specificKeywordsInput.value = settings.specificKeywords || '';
  autoSaveDraftToggle.checked = settings.autoSaveDraft !== false;
  isAiGeneratedToggle.checked = Boolean(settings.isAiGenerated);

  // Platform specific HTML inject
  let html = '';

  if (platformId === 'adobestock') {
    html = `
      <div class="rj-field-group">
        <label class="rj-field-label">Metadata Language</label>
        <select id="adobestock_language" class="rj-select">
          <option value="en" ${settings.language === 'en' ? 'selected' : ''}>English (Recommended)</option>
          <option value="ja" ${settings.language === 'ja' ? 'selected' : ''}>Japanese (日本語)</option>
          <option value="de" ${settings.language === 'de' ? 'selected' : ''}>German (Deutsch)</option>
          <option value="fr" ${settings.language === 'fr' ? 'selected' : ''}>French (Français)</option>
          <option value="es" ${settings.language === 'es' ? 'selected' : ''}>Spanish (Español)</option>
          <option value="ko" ${settings.language === 'ko' ? 'selected' : ''}>Korean (한국어)</option>
        </select>
      </div>
    `;
  } else if (platformId === 'shutterstock') {
    html = `
      <div class="rj-field-group">
        <label class="rj-field-label">Media Format Category Mapping</label>
        <select id="shutterstock_mediaType" class="rj-select">
          <option value="image" ${settings.mediaType === 'image' ? 'selected' : ''}>Image (Photo / Vector — 26 Categories)</option>
          <option value="video" ${settings.mediaType === 'video' ? 'selected' : ''}>Footage / Video (19 Categories)</option>
        </select>
      </div>
      <div class="rj-field-group">
        <label class="rj-field-label">
          <span>Editorial Caption Prefix</span>
          <span class="rj-field-hint">e.g. CITY, COUNTRY - DATE:</span>
        </label>
        <input type="text" id="shutterstock_editorialPrefix" class="rj-input" placeholder="JAKARTA, INDONESIA - SEPTEMBER 2, 2026:" value="${settings.editorialPrefix || ''}">
      </div>
    `;
  } else if (platformId === 'dreamstime') {
    html = `
      <div class="rj-field-group">
        <label class="rj-field-label">Submission Workflow Mode</label>
        <select id="dreamstime_mode" class="rj-select">
          <option value="save_draft" ${settings.mode === 'save_draft' ? 'selected' : ''}>Mode A: Save Draft (With Loop Protection)</option>
          <option value="submit_direct" ${settings.mode === 'submit_direct' ? 'selected' : ''}>Mode B: Submit Immediately</option>
        </select>
      </div>
    `;
  } else if (platformId === 'vecteezy') {
    html = `
      <div class="rj-field-group">
        <label class="rj-field-label">License Type</label>
        <select id="vecteezy_licenseType" class="rj-select">
          <option value="free" ${settings.licenseType === 'free' ? 'selected' : ''}>Free License</option>
          <option value="pro" ${settings.licenseType === 'pro' ? 'selected' : ''}>Pro (Subscriber Only)</option>
          <option value="editorial" ${settings.licenseType === 'editorial' ? 'selected' : ''}>Editorial</option>
        </select>
      </div>
      <div class="rj-field-group">
        <label class="rj-field-label">AI Tool / Generator Name</label>
        <input type="text" id="vecteezy_aiToolName" class="rj-input" placeholder="e.g. Midjourney v6, Flux.1" value="${settings.aiToolName || ''}">
      </div>
    `;
  } else if (platformId === 'freepik') {
    html = `
      <div class="rj-field-group">
        <label class="rj-field-label">AI Base Model</label>
        <select id="freepik_aiModel" class="rj-select">
          <option value="Adobe Firefly" ${settings.aiModel === 'Adobe Firefly' ? 'selected' : ''}>Adobe Firefly</option>
          <option value="Flux 1.0 Fast" ${settings.aiModel === 'Flux 1.0 Fast' ? 'selected' : ''}>Flux 1.0 Fast</option>
          <option value="Midjourney" ${settings.aiModel === 'Midjourney' ? 'selected' : ''}>Midjourney</option>
          <option value="Stable Diffusion" ${settings.aiModel === 'Stable Diffusion' ? 'selected' : ''}>Stable Diffusion</option>
          <option value="DALL-E 3" ${settings.aiModel === 'DALL-E 3' ? 'selected' : ''}>DALL-E 3</option>
          <option value="Ideogram" ${settings.aiModel === 'Ideogram' ? 'selected' : ''}>Ideogram</option>
          <option value="Custom" ${settings.aiModel === 'Custom' ? 'selected' : ''}>Other / Custom</option>
        </select>
      </div>
    `;
  } else if (platformId === 'depositphotos') {
    html = `
      <div class="rj-field-group">
        <label class="rj-field-label">Editorial Location (Country)</label>
        <select id="depositphotos_countryCode" class="rj-select">
          <option value="">None (Commercial)</option>
          <option value="ID" ${settings.countryCode === 'ID' ? 'selected' : ''}>ID - Indonesia</option>
          <option value="US" ${settings.countryCode === 'US' ? 'selected' : ''}>US - United States</option>
          <option value="GB" ${settings.countryCode === 'GB' ? 'selected' : ''}>GB - United Kingdom</option>
          <option value="JP" ${settings.countryCode === 'JP' ? 'selected' : ''}>JP - Japan</option>
          <option value="DE" ${settings.countryCode === 'DE' ? 'selected' : ''}>DE - Germany</option>
          <option value="FR" ${settings.countryCode === 'FR' ? 'selected' : ''}>FR - France</option>
          <option value="CA" ${settings.countryCode === 'CA' ? 'selected' : ''}>CA - Canada</option>
          <option value="AU" ${settings.countryCode === 'AU' ? 'selected' : ''}>AU - Australia</option>
        </select>
      </div>
      <div class="rj-field-group">
        <label class="rj-field-label">City Name (Optional)</label>
        <input type="text" id="depositphotos_cityName" class="rj-input" placeholder="e.g. Jakarta, New York" value="${settings.cityName || ''}">
      </div>
    `;
  } else if (platformId === 'miricanvas') {
    html = `
      <div class="rj-field-group">
        <label class="rj-field-label">Content Format Type</label>
        <select id="miricanvas_contentType" class="rj-select">
          <option value="BITMAP" ${settings.contentType === 'BITMAP' ? 'selected' : ''}>PNG element (BITMAP)</option>
          <option value="PICTURE" ${settings.contentType === 'PICTURE' ? 'selected' : ''}>Photo (PICTURE)</option>
          <option value="REMOVE_BACKGROUND_PICTURE" ${settings.contentType === 'REMOVE_BACKGROUND_PICTURE' ? 'selected' : ''}>Photo Cut-out (Isolated)</option>
          <option value="BACKGROUND_PICTURE" ${settings.contentType === 'BACKGROUND_PICTURE' ? 'selected' : ''}>Background (Wallpaper)</option>
          <option value="VECTOR" ${settings.contentType === 'VECTOR' ? 'selected' : ''}>SVG element (VECTOR)</option>
          <option value="GIF" ${settings.contentType === 'GIF' ? 'selected' : ''}>GIF Animation</option>
        </select>
      </div>
      <div class="rj-field-group">
        <label class="rj-field-label">Pricing Tier</label>
        <select id="miricanvas_contentTier" class="rj-select">
          <option value="PREMIUM" ${settings.contentTier === 'PREMIUM' ? 'selected' : ''}>Premium (Paid / Pro)</option>
          <option value="STANDARD" ${settings.contentTier === 'STANDARD' ? 'selected' : ''}>Standard (Free)</option>
        </select>
      </div>
    `;
  }

  platformSpecificContainer.innerHTML = html;
}

/**
 * Saves current UI states to StorageService.
 */
async function saveCurrentSettings() {
  const activeProvId = providerSelect.value;
  const activePlatId = platformSelect.value;

  // 1. Update Provider info
  if (!currentConfig.providers[activeProvId]) {
    currentConfig.providers[activeProvId] = {};
  }
  currentConfig.activeProvider = activeProvId;
  currentConfig.providers[activeProvId].baseUrl = baseUrlInput.value.trim();
  currentConfig.providers[activeProvId].apiKey = apiKeyInput.value.trim();
  currentConfig.providers[activeProvId].defaultModel = modelSelect.value;
  currentConfig.providers[activeProvId].customModel = customModelInput.value.trim();

  // 2. Update Platform settings
  currentConfig.activePlatform = activePlatId;
  if (!currentConfig.platformSettings[activePlatId]) {
    currentConfig.platformSettings[activePlatId] = {};
  }
  const platSettings = currentConfig.platformSettings[activePlatId];
  platSettings.keywordCount = Number(keywordCountInput.value) || 50;
  platSettings.specificKeywords = specificKeywordsInput.value.trim();
  platSettings.autoSaveDraft = autoSaveDraftToggle.checked;
  platSettings.isAiGenerated = isAiGeneratedToggle.checked;

  // Read platform specific form inputs
  if (activePlatId === 'adobestock') {
    const lang = document.getElementById('adobestock_language');
    if (lang) platSettings.language = lang.value;
  } else if (activePlatId === 'shutterstock') {
    const mt = document.getElementById('shutterstock_mediaType');
    const ep = document.getElementById('shutterstock_editorialPrefix');
    if (mt) platSettings.mediaType = mt.value;
    if (ep) platSettings.editorialPrefix = ep.value.trim();
  } else if (activePlatId === 'dreamstime') {
    const dm = document.getElementById('dreamstime_mode');
    if (dm) platSettings.mode = dm.value;
  } else if (activePlatId === 'vecteezy') {
    const lt = document.getElementById('vecteezy_licenseType');
    const at = document.getElementById('vecteezy_aiToolName');
    if (lt) platSettings.licenseType = lt.value;
    if (at) platSettings.aiToolName = at.value.trim();
  } else if (activePlatId === 'freepik') {
    const fm = document.getElementById('freepik_aiModel');
    if (fm) platSettings.aiModel = fm.value;
  } else if (activePlatId === 'depositphotos') {
    const cc = document.getElementById('depositphotos_countryCode');
    const cn = document.getElementById('depositphotos_cityName');
    if (cc) platSettings.countryCode = cc.value;
    if (cn) platSettings.cityName = cn.value.trim();
  } else if (activePlatId === 'miricanvas') {
    const ct = document.getElementById('miricanvas_contentType');
    const tr = document.getElementById('miricanvas_contentTier');
    if (ct) platSettings.contentType = ct.value;
    if (tr) platSettings.contentTier = tr.value;
  }

  // 3. Persist to storage
  await StorageService.saveConfig(currentConfig);
  showToast('Settings saved successfully');
}

/**
 * Event Listeners Initialization
 */
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Load Stored Config
  currentConfig = await StorageService.getConfig();

  // 2. Query Background for Active Tab Info
  chrome.runtime.sendMessage({ action: 'GET_ACTIVE_TAB_INFO' }, response => {
    activeTabInfo = response;
    // Auto-select platform if active tab matches a known microstock platform
    if (activeTabInfo && activeTabInfo.detectedPlatform) {
      platformSelect.value = activeTabInfo.detectedPlatform;
    } else {
      platformSelect.value = currentConfig.activePlatform || 'adobestock';
    }
    updateTabMatchStatus();
    renderPlatformSpecificFields(platformSelect.value);
  });

  // 3. Set Initial Provider UI
  providerSelect.value = currentConfig.activeProvider || 'gemini';
  renderProviderFields(providerSelect.value);

  // Event: Platform dropdown changed
  platformSelect.addEventListener('change', () => {
    updateTabMatchStatus();
    renderPlatformSpecificFields(platformSelect.value);
  });

  // Event: Navigate helper clicked
  btnNavigatePlatform.addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: 'NAVIGATE_TO_PLATFORM',
      platformId: platformSelect.value
    });
  });

  // Event: Provider dropdown changed
  providerSelect.addEventListener('change', () => {
    renderProviderFields(providerSelect.value);
  });

  // Event: Toggle API Key Visibility (Show/Hide)
  btnToggleApiKey.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      btnToggleApiKey.innerHTML = `
        <svg class="rj-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
      `;
    } else {
      apiKeyInput.type = 'password';
      btnToggleApiKey.innerHTML = `
        <svg class="rj-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      `;
    }
  });

  // Event: Browse .txt API key file
  btnBrowseApiKey.addEventListener('click', () => {
    apiKeyFileInput.click();
  });

  apiKeyFileInput.addEventListener('change', async event => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      try {
        const key = await StorageService.readApiKeyFromFile(file);
        apiKeyInput.value = key;
        showToast('API key imported from file');
        saveCurrentSettings();
      } catch (err) {
        showToast(`Failed to read key: ${err.message}`, true);
      }
    }
  });

  // Event: Fetch models from provider (/v1/models)
  btnFetchModels.addEventListener('click', () => {
    const baseUrl = baseUrlInput.value.trim();
    const apiKey = apiKeyInput.value.trim();
    const activeProvId = providerSelect.value;

    if (!baseUrl || !apiKey) {
      showToast('Please enter Base URL & API Key first', true);
      return;
    }

    fetchIcon.classList.add('rj-rotating');

    chrome.runtime.sendMessage({
      action: 'FETCH_PROVIDER_MODELS',
      payload: { baseUrl, apiKey, providerId: activeProvId }
    }, response => {
      fetchIcon.classList.remove('rj-rotating');
      if (response && response.success && response.models) {
        // Save to current config
        currentConfig.providers[activeProvId].models = response.models;
        // Re-render select
        modelSelect.innerHTML = '';
        response.models.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m;
          opt.textContent = m;
          modelSelect.appendChild(opt);
        });
        modelCountLabel.textContent = `${response.models.length} models fetched`;
        showToast(`Fetched ${response.models.length} models successfully`);
        saveCurrentSettings();
      } else {
        showToast(response?.error || 'Failed to fetch models', true);
      }
    });
  });

  // Event: Save Settings
  btnSaveSettings.addEventListener('click', () => {
    saveCurrentSettings();
  });

  // Event: Start / Stop Automation Toggle
  btnToggleAutomation.addEventListener('click', () => {
    isAutomationRunning = !isAutomationRunning;
    if (isAutomationRunning) {
      btnToggleAutomation.className = 'rj-btn rj-btn-danger';
      automationBtnText.textContent = 'Stop Automation';
      automationIcon.innerHTML = '<rect x="6" y="6" width="12" height="12"></rect>';
      showToast('Automation started');
    } else {
      btnToggleAutomation.className = 'rj-btn rj-btn-accent';
      automationBtnText.textContent = 'Start Automation';
      automationIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
      showToast('Automation stopped');
    }
  });

  // Event: Launch In-Page Overlay HUD
  btnLaunchOverlay.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'TOGGLE_OVERLAY_HUD' }, () => {
      showToast('Overlay HUD activated');
      window.close(); // Close popup so user interacts with in-page HUD
    });
  });
});
