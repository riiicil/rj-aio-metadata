/**
 * RJ AIO Metadata Extension — Popup Controller
 * Manages multi-provider settings, multi-key round-robin support, dynamic model fetching,
 * active tab platform matching, and 100% modular platform-dynamic form rendering.
 */

import { StorageService, DEFAULT_CONFIG } from '../services/StorageService.js';
import { CustomSelect } from './custom_select.js';
import { DEPOSITPHOTOS_COUNTRIES } from './depositphotos_countries.js';

let currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
let activeTabInfo = null;
let currentActivePlatformId = null;
let isAutomationRunning = false;

// Platform Keyword Count Constraints & Hints
const PLATFORM_LIMITS = {
  adobestock: { min: 8, max: 49, hint: 'Min 8, Max 49 (Adobe limit)' },
  dreamstime: { min: 8, max: 70, hint: 'Min 8, Max 70 (Dreamstime limit)' },
  miricanvas: { min: 8, max: 25, hint: 'Min 8, Max 25 (MiriCanvas limit)' },
  shutterstock: { min: 8, max: 50, hint: 'Min 8, Max 50' },
  freepik: { min: 8, max: 50, hint: 'Min 8, Max 50' },
  vecteezy: { min: 8, max: 50, hint: 'Min 8, Max 50' },
  depositphotos: { min: 8, max: 50, hint: 'Min 8, Max 50' }
};

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
const apiKeyCountHint = document.getElementById('apiKeyCountHint');
const btnToggleApiKey = document.getElementById('btnToggleApiKey');
const btnBrowseApiKey = document.getElementById('btnBrowseApiKey');
const apiKeyFileInput = document.getElementById('apiKeyFileInput');
const modelSelect = document.getElementById('modelSelect');
const btnFetchModels = document.getElementById('btnFetchModels');
const fetchIcon = document.getElementById('fetchIcon');
const modelCountLabel = document.getElementById('modelCountLabel');

const platformSettingsHeaderTitle = document.getElementById('platformSettingsHeaderTitle');
const platformDynamicForm = document.getElementById('platformDynamicForm');

const btnSaveSettings = document.getElementById('btnSaveSettings');
const btnToggleAutomation = document.getElementById('btnToggleAutomation');
const automationIcon = document.getElementById('automationIcon');
const automationBtnText = document.getElementById('automationBtnText');
const toastNotification = document.getElementById('toastNotification');
const toastMessage = document.getElementById('toastMessage');

/**
 * HTML String Sanitizer for Input Values
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

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
 * Updates the Model dropdown state dynamically based on API key and model cache.
 */
function updateModelDropdownState(provider) {
  const rawKey = apiKeyInput.value.trim() || provider.apiKey || '';
  const keys = StorageService.parseApiKeys(rawKey);

  // Update API key count hint
  if (keys.length > 1) {
    apiKeyCountHint.textContent = `${keys.length} API keys loaded (round-robin)`;
  } else if (keys.length === 1) {
    apiKeyCountHint.textContent = '1 API key loaded';
  } else {
    apiKeyCountHint.textContent = 'Supports single or multi-line keys';
  }

  if (keys.length === 0) {
    modelSelect.disabled = true;
    modelSelect.innerHTML = '<option value="" disabled selected>Input API key first</option>';
    modelCountLabel.textContent = 'API key required';
    CustomSelect.enhance(modelSelect);
    CustomSelect.refresh(modelSelect);
    return;
  }

  if (!provider.models || provider.models.length === 0) {
    modelSelect.disabled = true;
    modelSelect.innerHTML = '<option value="" disabled selected>Please fetch models first</option>';
    modelCountLabel.textContent = 'Fetch models required';
    CustomSelect.enhance(modelSelect);
    CustomSelect.refresh(modelSelect);
    return;
  }

  // Populate models
  modelSelect.disabled = false;
  modelSelect.innerHTML = '';
  for (const modelId of provider.models) {
    const opt = document.createElement('option');
    opt.value = modelId;
    opt.textContent = modelId;
    if (modelId === provider.selectedModel || (!provider.selectedModel && modelId === provider.models[0])) {
      opt.selected = true;
    }
    modelSelect.appendChild(opt);
  }

  modelCountLabel.textContent = `${provider.models.length} models loaded`;
  CustomSelect.enhance(modelSelect);
  CustomSelect.refresh(modelSelect);
}

/**
 * Populates the UI with active provider data.
 */
function renderProviderFields(providerId) {
  const provider = currentConfig.providers[providerId] || currentConfig.providers.gemini;
  
  baseUrlInput.value = provider.baseUrl || '';
  // Preset providers have disabled baseUrl; Custom endpoint is editable
  baseUrlInput.disabled = (providerId !== 'custom');

  const keys = StorageService.parseApiKeys(provider.apiKey || '');
  apiKeyInput.value = keys.join(', ');

  CustomSelect.enhance(providerSelect);
  CustomSelect.refresh(providerSelect);

  updateModelDropdownState(provider);
}

/**
 * Saves active dynamic form inputs into in-memory state.
 * @param {string} platformId
 */
function saveActiveFormStateToMemory(platformId) {
  if (!platformId || !platformDynamicForm) return;
  if (!currentConfig.platformSettings[platformId]) {
    currentConfig.platformSettings[platformId] = {};
  }
  const settings = currentConfig.platformSettings[platformId];
  const limits = PLATFORM_LIMITS[platformId] || { min: 8, max: 50 };

  // 1. Universal Target Keyword Count
  const countInput = platformDynamicForm.querySelector('#keywordCountInput');
  if (countInput) {
    const parsedVal = Number(countInput.value) || limits.max;
    settings.keywordCount = Math.max(limits.min, Math.min(limits.max, parsedVal));
  }

  // 2. Universal Specific Keywords
  const specificInput = platformDynamicForm.querySelector('#specificKeywordsInput');
  if (specificInput) {
    settings.specificKeywords = specificInput.value.trim();
  }

  // 3. Platform-Specific Controls
  if (platformId === 'adobestock') {
    const lang = platformDynamicForm.querySelector('#adobestock_language');
    const ai = platformDynamicForm.querySelector('#adobestock_isAiGenerated');
    if (lang) settings.language = lang.value;
    if (ai) settings.isAiGenerated = ai.checked;
  } else if (platformId === 'shutterstock') {
    const isEd = platformDynamicForm.querySelector('#shutterstock_isEditorial');
    const ep = platformDynamicForm.querySelector('#shutterstock_editorialPrefix');
    if (isEd) settings.isEditorial = isEd.checked;
    if (ep) settings.editorialPrefix = ep.value.trim();
  } else if (platformId === 'freepik') {
    const ai = platformDynamicForm.querySelector('#freepik_isAiGenerated');
    const model = platformDynamicForm.querySelector('#freepik_aiModel');
    const customModel = platformDynamicForm.querySelector('#freepik_customAiModel');
    if (ai) settings.isAiGenerated = ai.checked;
    if (model) settings.aiModel = model.value;
    if (customModel) settings.customAiModel = customModel.value.trim();
  } else if (platformId === 'vecteezy') {
    const lt = platformDynamicForm.querySelector('#vecteezy_licenseType');
    const ai = platformDynamicForm.querySelector('#vecteezy_isAiGenerated');
    const tool = platformDynamicForm.querySelector('#vecteezy_aiToolName');
    if (lt) settings.licenseType = lt.value;
    if (ai) settings.isAiGenerated = ai.checked;
    if (tool) settings.aiToolName = tool.value.trim();
  } else if (platformId === 'dreamstime') {
    const mode = platformDynamicForm.querySelector('#dreamstime_mode');
    const isEd = platformDynamicForm.querySelector('#dreamstime_isEditorial');
    const ai = platformDynamicForm.querySelector('#dreamstime_isAiGenerated');
    if (mode) settings.mode = mode.value;
    if (isEd) settings.isEditorial = isEd.checked;
    if (ai) settings.isAiGenerated = ai.checked;
  } else if (platformId === 'depositphotos') {
    const isEd = platformDynamicForm.querySelector('#depositphotos_isEditorial');
    const cc = platformDynamicForm.querySelector('#depositphotos_countryCode');
    if (isEd) settings.isEditorial = isEd.checked;
    if (cc) settings.countryCode = cc.value;
  } else if (platformId === 'miricanvas') {
    const tier = platformDynamicForm.querySelector('#miricanvas_contentTier');
    const ai = platformDynamicForm.querySelector('#miricanvas_isAiGenerated');
    if (tier) settings.contentTier = tier.value;
    if (ai) settings.isAiGenerated = ai.checked;
  }
}
const collectActiveFormValues = saveActiveFormStateToMemory;

/**
 * 100% Modular Platform-Dynamic Form Renderer
 * Injects platform-adaptive inputs with specific limits, layout order, and conditional visibility.
 * @param {string} platformId
 */
function renderPlatformDynamicForm(platformId) {
  if (!platformDynamicForm) return;

  const platOption = platformSelect.options[platformSelect.selectedIndex];
  const platName = platOption ? platOption.text : 'Platform';
  platformSettingsHeaderTitle.textContent = `${platName} Settings`;

  const settings = currentConfig.platformSettings[platformId] || {};
  const limits = PLATFORM_LIMITS[platformId] || { min: 8, max: 50 };
  const currentCount = (typeof settings.keywordCount === 'number') ? settings.keywordCount : limits.max;

  // Universal Controls: Stepper (1) & Specific Keywords (2)
  let html = `
    <!-- Target Keyword Count (Stepper) -->
    <div class="rj-field-group">
      <label class="rj-field-label" for="keywordCountInput">
        <span>Target Keyword Count</span>
        <span class="rj-field-hint" id="keywordCountLimitHint">${limits.hint}</span>
      </label>
      <div class="rj-stepper-control">
        <button type="button" class="rj-stepper-btn" id="btnDecKeywordCount" title="Decrease keyword count">
          <svg class="rj-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <input type="number" id="keywordCountInput" class="rj-input rj-stepper-input" min="${limits.min}" max="${limits.max}" value="${currentCount}">
        <button type="button" class="rj-stepper-btn" id="btnIncKeywordCount" title="Increase keyword count">
          <svg class="rj-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
    </div>

    <!-- Add Specific Keywords -->
    <div class="rj-field-group">
      <label class="rj-field-label" for="specificKeywordsInput">
        <span>Add Specific Keywords (Mandatory)</span>
        <span class="rj-field-hint">Placed at index 0</span>
      </label>
      <input type="text" id="specificKeywordsInput" class="rj-input" placeholder="e.g. train, station, transit (comma-separated)" value="${escapeHtml(settings.specificKeywords || '')}">
    </div>
  `;

  // Platform-Specific Layout Order & Field Injections
  if (platformId === 'adobestock') {
    const lang = settings.language || 'en';
    html += `
      <div class="rj-field-group">
        <label class="rj-field-label" for="adobestock_language">
          <span>Metadata Language</span>
        </label>
        <select id="adobestock_language" class="rj-select">
          <option value="en" ${lang === 'en' ? 'selected' : ''}>English (Recommended)</option>
          <option value="ja" ${lang === 'ja' ? 'selected' : ''}>Japanese (日本語)</option>
          <option value="de" ${lang === 'de' ? 'selected' : ''}>German (Deutsch)</option>
          <option value="fr" ${lang === 'fr' ? 'selected' : ''}>French (Français)</option>
          <option value="es" ${lang === 'es' ? 'selected' : ''}>Spanish (Español)</option>
          <option value="ko" ${lang === 'ko' ? 'selected' : ''}>Korean (한국어)</option>
        </select>
      </div>

      <div class="rj-switch-row">
        <div class="rj-switch-info">
          <span class="rj-switch-title">AI / Generative Declaration</span>
          <span class="rj-switch-desc">Declare asset created with AI tool</span>
        </div>
        <label class="rj-switch">
          <input type="checkbox" id="adobestock_isAiGenerated" ${settings.isAiGenerated ? 'checked' : ''}>
          <span class="rj-slider"></span>
        </label>
      </div>
    `;
  } else if (platformId === 'shutterstock') {
    const isEditorial = Boolean(settings.isEditorial);
    html += `
      <div class="rj-switch-row">
        <div class="rj-switch-info">
          <span class="rj-switch-title">Editorial Content Asset</span>
          <span class="rj-switch-desc">Mark as editorial &amp; set caption prefix</span>
        </div>
        <label class="rj-switch">
          <input type="checkbox" id="shutterstock_isEditorial" ${isEditorial ? 'checked' : ''}>
          <span class="rj-slider"></span>
        </label>
      </div>

      <div id="shutterstock_editorialGroup" class="rj-field-group rj-conditional-field ${isEditorial ? 'rj-visible' : ''}">
        <input type="text" id="shutterstock_editorialPrefix" class="rj-input" placeholder="JAKARTA, INDONESIA - SEPTEMBER 2, 2026:" value="${escapeHtml(settings.editorialPrefix || '')}">
      </div>
    `;
  } else if (platformId === 'freepik') {
    const isAi = Boolean(settings.isAiGenerated);
    const aiModel = settings.aiModel || 'Adobe Firefly';
    const showCustom = isAi && (aiModel === 'Custom');
    html += `
      <div class="rj-switch-row">
        <div class="rj-switch-info">
          <span class="rj-switch-title">AI / Generative Declaration</span>
          <span class="rj-switch-desc">Declare AI generation &amp; select base model</span>
        </div>
        <label class="rj-switch">
          <input type="checkbox" id="freepik_isAiGenerated" ${isAi ? 'checked' : ''}>
          <span class="rj-slider"></span>
        </label>
      </div>

      <div id="freepik_aiModelGroup" class="rj-field-group rj-conditional-field ${isAi ? 'rj-visible' : ''}">
        <select id="freepik_aiModel" class="rj-select">
          <option value="Adobe Firefly" ${aiModel === 'Adobe Firefly' ? 'selected' : ''}>Adobe Firefly</option>
          <option value="Flux 1.0 Fast" ${aiModel === 'Flux 1.0 Fast' ? 'selected' : ''}>Flux 1.0 Fast</option>
          <option value="Midjourney" ${aiModel === 'Midjourney' ? 'selected' : ''}>Midjourney</option>
          <option value="Stable Diffusion" ${aiModel === 'Stable Diffusion' ? 'selected' : ''}>Stable Diffusion</option>
          <option value="DALL-E 3" ${aiModel === 'DALL-E 3' ? 'selected' : ''}>DALL-E 3</option>
          <option value="Ideogram" ${aiModel === 'Ideogram' ? 'selected' : ''}>Ideogram</option>
          <option value="Custom" ${aiModel === 'Custom' ? 'selected' : ''}>Other / Custom</option>
        </select>
      </div>

      <div id="freepik_customAiModelGroup" class="rj-field-group rj-conditional-field ${showCustom ? 'rj-visible' : ''}">
        <input type="text" id="freepik_customAiModel" class="rj-input" placeholder="Enter custom AI model name..." value="${escapeHtml(settings.customAiModel || '')}">
      </div>
    `;
  } else if (platformId === 'vecteezy') {
    const license = settings.licenseType || 'free';
    const isAi = Boolean(settings.isAiGenerated);
    html += `
      <div class="rj-field-group">
        <label class="rj-field-label" for="vecteezy_licenseType">
          <span>License Type</span>
        </label>
        <select id="vecteezy_licenseType" class="rj-select">
          <option value="free" ${license === 'free' ? 'selected' : ''}>Free License</option>
          <option value="pro" ${license === 'pro' ? 'selected' : ''}>Pro (Subscriber Only)</option>
          <option value="editorial" ${license === 'editorial' ? 'selected' : ''}>Editorial</option>
        </select>
      </div>

      <div class="rj-switch-row">
        <div class="rj-switch-info">
          <span class="rj-switch-title">AI / Generative Declaration</span>
          <span class="rj-switch-desc">Declare AI generation &amp; specify tool name</span>
        </div>
        <label class="rj-switch">
          <input type="checkbox" id="vecteezy_isAiGenerated" ${isAi ? 'checked' : ''}>
          <span class="rj-slider"></span>
        </label>
      </div>

      <div id="vecteezy_aiToolGroup" class="rj-field-group rj-conditional-field ${isAi ? 'rj-visible' : ''}">
        <input type="text" id="vecteezy_aiToolName" class="rj-input" placeholder="e.g. Midjourney v6, Flux.1" value="${escapeHtml(settings.aiToolName || '')}">
      </div>
    `;
  } else if (platformId === 'dreamstime') {
    const mode = settings.mode || 'save_draft';
    const isEditorial = Boolean(settings.isEditorial);
    const isAi = Boolean(settings.isAiGenerated);
    html += `
      <div class="rj-field-group">
        <label class="rj-field-label" for="dreamstime_mode">
          <span>Submission Workflow Mode</span>
        </label>
        <select id="dreamstime_mode" class="rj-select">
          <option value="save_draft" ${mode === 'save_draft' ? 'selected' : ''}>Mode A: Only Save Draft</option>
          <option value="submit_direct" ${mode === 'submit_direct' ? 'selected' : ''}>Mode B: Submit Immediately</option>
        </select>
      </div>

      <div class="rj-switch-row">
        <div class="rj-switch-info">
          <span class="rj-switch-title">Editorial Content Asset</span>
          <span class="rj-switch-desc">Mark asset as documentary editorial</span>
        </div>
        <label class="rj-switch">
          <input type="checkbox" id="dreamstime_isEditorial" ${isEditorial ? 'checked' : ''}>
          <span class="rj-slider"></span>
        </label>
      </div>

      <div class="rj-switch-row">
        <div class="rj-switch-info">
          <span class="rj-switch-title">AI / Generative Declaration</span>
          <span class="rj-switch-desc">Declare asset created with AI tool</span>
        </div>
        <label class="rj-switch">
          <input type="checkbox" id="dreamstime_isAiGenerated" ${isAi ? 'checked' : ''}>
          <span class="rj-slider"></span>
        </label>
      </div>
    `;
  } else if (platformId === 'depositphotos') {
    const isEditorial = Boolean(settings.isEditorial);
    const countryCode = settings.countryCode || '';
    html += `
      <div class="rj-switch-row">
        <div class="rj-switch-info">
          <span class="rj-switch-title">Editorial Content Asset</span>
          <span class="rj-switch-desc">Flag as editorial &amp; select country location</span>
        </div>
        <label class="rj-switch">
          <input type="checkbox" id="depositphotos_isEditorial" ${isEditorial ? 'checked' : ''}>
          <span class="rj-slider"></span>
        </label>
      </div>

      <div id="depositphotos_countryGroup" class="rj-field-group rj-conditional-field ${isEditorial ? 'rj-visible' : ''}">
        <select id="depositphotos_countryCode" class="rj-select">
          ${DEPOSITPHOTOS_COUNTRIES.map(c => `
            <option value="${c.code}" ${(countryCode === c.code || (!countryCode && c.code === 'US')) ? 'selected' : ''}>${c.code} - ${c.name}</option>
          `).join('')}
        </select>
      </div>
    `;
  } else if (platformId === 'miricanvas') {
    const tier = settings.contentTier || 'PREMIUM';
    const isAi = Boolean(settings.isAiGenerated);
    html += `
      <div class="rj-field-group">
        <label class="rj-field-label" for="miricanvas_contentTier">
          <span>Pricing Tier</span>
        </label>
        <select id="miricanvas_contentTier" class="rj-select">
          <option value="PREMIUM" ${tier === 'PREMIUM' ? 'selected' : ''}>Premium (Paid / Pro)</option>
          <option value="STANDARD" ${tier === 'STANDARD' ? 'selected' : ''}>Standard (Free)</option>
        </select>
      </div>

      <div class="rj-switch-row">
        <div class="rj-switch-info">
          <span class="rj-switch-title">AI / Generative Declaration</span>
          <span class="rj-switch-desc">Declare asset created with AI tool</span>
        </div>
        <label class="rj-switch">
          <input type="checkbox" id="miricanvas_isAiGenerated" ${isAi ? 'checked' : ''}>
          <span class="rj-slider"></span>
        </label>
      </div>
    `;
  }

  // Inject into dynamic container
  platformDynamicForm.innerHTML = html;

  // Bind Custom Stepper Controls
  const btnDec = platformDynamicForm.querySelector('#btnDecKeywordCount');
  const btnInc = platformDynamicForm.querySelector('#btnIncKeywordCount');
  const countInput = platformDynamicForm.querySelector('#keywordCountInput');

  if (btnDec && countInput) {
    btnDec.addEventListener('click', () => {
      let val = Number(countInput.value) || limits.min;
      if (val > limits.min) {
        countInput.value = val - 1;
      }
    });
  }

  if (btnInc && countInput) {
    btnInc.addEventListener('click', () => {
      let val = Number(countInput.value) || limits.max;
      if (val < limits.max) {
        countInput.value = val + 1;
      }
    });
  }

  if (countInput) {
    countInput.addEventListener('change', () => {
      let val = Number(countInput.value) || limits.min;
      if (val < limits.min) val = limits.min;
      if (val > limits.max) val = limits.max;
      countInput.value = val;
    });
  }

  // Bind Conditional Show/Hide Controls
  if (platformId === 'shutterstock') {
    const isEd = platformDynamicForm.querySelector('#shutterstock_isEditorial');
    const group = platformDynamicForm.querySelector('#shutterstock_editorialGroup');
    if (isEd && group) {
      isEd.addEventListener('change', () => {
        if (isEd.checked) {
          group.classList.add('rj-visible');
        } else {
          group.classList.remove('rj-visible');
        }
      });
    }
  } else if (platformId === 'freepik') {
    const aiToggle = platformDynamicForm.querySelector('#freepik_isAiGenerated');
    const modelGroup = platformDynamicForm.querySelector('#freepik_aiModelGroup');
    const modelSelect = platformDynamicForm.querySelector('#freepik_aiModel');
    const customGroup = platformDynamicForm.querySelector('#freepik_customAiModelGroup');

    if (aiToggle && modelGroup && modelSelect && customGroup) {
      aiToggle.addEventListener('change', () => {
        const checked = aiToggle.checked;
        if (checked) {
          modelGroup.classList.add('rj-visible');
          CustomSelect.refresh(modelSelect);
          if (modelSelect.value === 'Custom') {
            customGroup.classList.add('rj-visible');
          } else {
            customGroup.classList.remove('rj-visible');
          }
        } else {
          modelGroup.classList.remove('rj-visible');
          customGroup.classList.remove('rj-visible');
        }
      });

      modelSelect.addEventListener('change', () => {
        if (aiToggle.checked) {
          if (modelSelect.value === 'Custom') {
            customGroup.classList.add('rj-visible');
          } else {
            customGroup.classList.remove('rj-visible');
          }
        }
      });
    }
  } else if (platformId === 'vecteezy') {
    const aiToggle = platformDynamicForm.querySelector('#vecteezy_isAiGenerated');
    const toolGroup = platformDynamicForm.querySelector('#vecteezy_aiToolGroup');
    if (aiToggle && toolGroup) {
      aiToggle.addEventListener('change', () => {
        if (aiToggle.checked) {
          toolGroup.classList.add('rj-visible');
        } else {
          toolGroup.classList.remove('rj-visible');
        }
      });
    }
  } else if (platformId === 'depositphotos') {
    const isEd = platformDynamicForm.querySelector('#depositphotos_isEditorial');
    const countryGroup = platformDynamicForm.querySelector('#depositphotos_countryGroup');
    const countrySelect = platformDynamicForm.querySelector('#depositphotos_countryCode');

    if (isEd && countryGroup && countrySelect) {
      isEd.addEventListener('change', () => {
        if (isEd.checked) {
          countryGroup.classList.add('rj-visible');
          CustomSelect.refresh(countrySelect);
        } else {
          countryGroup.classList.remove('rj-visible');
        }
      });
    }
  }

  // Initialize Custom Selects for Newly Rendered Elements
  CustomSelect.initAll(platformDynamicForm);

  if (isAutomationRunning) {
    setFormDisabledState(true);
  }
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
  if (activeProvId === 'custom') {
    currentConfig.providers[activeProvId].baseUrl = baseUrlInput.value.trim();
  }
  const keys = StorageService.parseApiKeys(apiKeyInput.value.trim());
  currentConfig.providers[activeProvId].apiKey = keys.join(', ');
  currentConfig.providers[activeProvId].selectedModel = modelSelect.value || '';

  // 2. Collect current dynamic form values into config
  currentConfig.activePlatform = activePlatId;
  collectActiveFormValues(activePlatId);

  // 3. Persist to storage
  await StorageService.saveConfig(currentConfig);
  showToast('Settings saved successfully');
  updateAutomationButtonUI(isAutomationRunning);
}

/**
 * Checks if the currently active provider has valid credentials and a selected model.
 * @returns {boolean}
 */
function isCurrentProviderReady() {
  const activeProvId = providerSelect ? providerSelect.value : (currentConfig.activeProvider || 'gemini');
  const provider = currentConfig.providers ? currentConfig.providers[activeProvId] : null;
  if (!provider) return false;

  const rawKey = (apiKeyInput ? apiKeyInput.value.trim() : '') || provider.apiKey || '';
  const keys = StorageService.parseApiKeys(rawKey);
  const selectedModel = (modelSelect ? modelSelect.value : '') || provider.selectedModel || '';

  return keys.length > 0 && Boolean(selectedModel) && (modelSelect ? !modelSelect.disabled : true);
}

/**
 * Toggles disabled state on all settings fields during active automation.
 * @param {boolean} disabled
 */
function setFormDisabledState(disabled) {
  // 1. Target Platform Card
  if (platformSelect) {
    platformSelect.disabled = disabled;
    CustomSelect.refresh(platformSelect);
  }
  if (btnNavigatePlatform) {
    btnNavigatePlatform.disabled = disabled;
    btnNavigatePlatform.style.pointerEvents = disabled ? 'none' : '';
    btnNavigatePlatform.style.opacity = disabled ? '0.4' : '';
  }

  // 2. AI Provider Card
  if (providerSelect) {
    providerSelect.disabled = disabled;
    CustomSelect.refresh(providerSelect);
  }
  if (baseUrlInput) {
    baseUrlInput.disabled = disabled || (providerSelect.value !== 'custom');
  }
  if (apiKeyInput) {
    apiKeyInput.disabled = disabled;
  }
  if (btnToggleApiKey) {
    btnToggleApiKey.disabled = disabled;
  }
  if (btnBrowseApiKey) {
    btnBrowseApiKey.disabled = disabled;
  }
  if (btnFetchModels) {
    btnFetchModels.disabled = disabled;
  }
  if (modelSelect) {
    if (disabled) {
      modelSelect.disabled = true;
      CustomSelect.refresh(modelSelect);
    } else {
      const activeProvId = providerSelect ? providerSelect.value : currentConfig.activeProvider;
      if (currentConfig.providers && currentConfig.providers[activeProvId]) {
        updateModelDropdownState(currentConfig.providers[activeProvId]);
      }
    }
  }

  // 3. Platform Dynamic Form
  if (platformDynamicForm) {
    const formControls = platformDynamicForm.querySelectorAll('input, select, button');
    formControls.forEach(ctrl => {
      ctrl.disabled = disabled;
      if (ctrl.tagName === 'SELECT') {
        CustomSelect.refresh(ctrl);
      }
    });

    const steppers = platformDynamicForm.querySelectorAll('.rj-stepper-control');
    steppers.forEach(st => {
      if (disabled) st.classList.add('disabled');
      else st.classList.remove('disabled');
    });
  }

  // 4. Action Buttons
  if (btnSaveSettings) {
    btnSaveSettings.disabled = disabled;
  }
  if (btnLaunchOverlay) {
    btnLaunchOverlay.disabled = disabled;
  }
}

/**
 * Updates the Start / Stop Automation button UI and toggles input field disabling in the toolbar popup.
 * @param {boolean} running
 */
function updateAutomationButtonUI(running) {
  isAutomationRunning = Boolean(running);
  if (isAutomationRunning) {
    btnToggleAutomation.className = 'rj-btn rj-btn-danger';
    automationBtnText.textContent = 'Stop Automation';
    automationIcon.innerHTML = '<rect x="6" y="6" width="12" height="12"></rect>';
    btnToggleAutomation.disabled = false;
    btnToggleAutomation.title = 'Stop Automation';
  } else {
    btnToggleAutomation.className = 'rj-btn rj-btn-accent';
    automationBtnText.textContent = 'Start Automation';
    automationIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';

    const ready = isCurrentProviderReady();
    btnToggleAutomation.disabled = !ready;
    btnToggleAutomation.title = ready ? 'Start Automation' : 'Please input API key and select an AI model first';
  }

  // Disable all fields when processing, enable when idle
  setFormDisabledState(isAutomationRunning);
}

/**
 * Event Listeners Initialization
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Restore running automation state if active in overlay
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(['rj_automation_state'], (res) => {
      if (res && res.rj_automation_state) {
        updateAutomationButtonUI(Boolean(res.rj_automation_state.isRunning));
      }
    });
  }
  // 1. Load Stored Config
  currentConfig = await StorageService.getConfig();

  // 2. Set Initial Platform & Dynamic Form
  currentActivePlatformId = currentConfig.activePlatform || 'adobestock';
  platformSelect.value = currentActivePlatformId;
  renderPlatformDynamicForm(currentActivePlatformId);

  // 3. Query Background for Active Tab Info
  chrome.runtime.sendMessage({ action: 'GET_ACTIVE_TAB_INFO' }, response => {
    activeTabInfo = response;
    // Auto-select platform if active tab matches a known microstock platform
    if (activeTabInfo && activeTabInfo.detectedPlatform) {
      if (currentActivePlatformId !== activeTabInfo.detectedPlatform) {
        collectActiveFormValues(currentActivePlatformId);
        currentActivePlatformId = activeTabInfo.detectedPlatform;
        platformSelect.value = currentActivePlatformId;
        renderPlatformDynamicForm(currentActivePlatformId);
      }
    }
    updateTabMatchStatus();
    CustomSelect.enhance(platformSelect);
    CustomSelect.refresh(platformSelect);
  });

  // 4. Set Initial Provider UI
  providerSelect.value = currentConfig.activeProvider || 'gemini';
  renderProviderFields(providerSelect.value);
  updateAutomationButtonUI(isAutomationRunning);

  // Initialize all custom selects outside dynamic form
  CustomSelect.initAll();

  // Event: Platform dropdown changed (persists in-memory state before switching)
  platformSelect.addEventListener('change', () => {
    if (currentActivePlatformId) {
      collectActiveFormValues(currentActivePlatformId);
    }
    currentActivePlatformId = platformSelect.value;
    updateTabMatchStatus();
    renderPlatformDynamicForm(currentActivePlatformId);
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
    currentConfig.activeProvider = providerSelect.value;
    renderProviderFields(providerSelect.value);
    StorageService.saveConfig(currentConfig);
    updateAutomationButtonUI(isAutomationRunning);
  });

  // Event: API Key typing listener
  apiKeyInput.addEventListener('input', () => {
    const activeProvId = providerSelect.value;
    const provider = currentConfig.providers[activeProvId] || {};
    provider.apiKey = apiKeyInput.value;
    updateModelDropdownState(provider);
    updateAutomationButtonUI(isAutomationRunning);
  });

  // Event: Model selection changed
  modelSelect.addEventListener('change', () => {
    const activeProvId = providerSelect.value;
    if (currentConfig.providers[activeProvId]) {
      currentConfig.providers[activeProvId].selectedModel = modelSelect.value || '';
    }
    saveCurrentSettings();
    updateAutomationButtonUI(isAutomationRunning);
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
        const rawKeys = await StorageService.readApiKeyFromFile(file);
        apiKeyInput.value = rawKeys;
        const activeProvId = providerSelect.value;
        const provider = currentConfig.providers[activeProvId] || {};
        provider.apiKey = rawKeys;
        updateModelDropdownState(provider);
        const parsed = StorageService.parseApiKeys(rawKeys);
        showToast(`Imported ${parsed.length} API key(s) from file`);
        saveCurrentSettings();
      } catch (err) {
        showToast(`Failed to read key: ${err.message}`, true);
      }
    }
  });

  // Event: Fetch models from provider (/v1/models)
  btnFetchModels.addEventListener('click', () => {
    const activeProvId = providerSelect.value;
    const provider = currentConfig.providers[activeProvId] || {};
    const baseUrl = baseUrlInput.value.trim();
    const apiKey = (apiKeyInput.value.trim() || provider.apiKey || '').trim();

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
        currentConfig.providers[activeProvId].selectedModel = response.models[0];
        // Re-render select
        updateModelDropdownState(currentConfig.providers[activeProvId]);
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
    const nextRunningState = !isAutomationRunning;
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({
        rj_automation_state: {
          isRunning: nextRunningState,
          platformId: currentActivePlatformId,
          timestamp: Date.now()
        }
      });
    }
    updateAutomationButtonUI(nextRunningState);
    showToast(nextRunningState ? 'Automation started' : 'Automation stopped');
  });

  // Listen to chrome.storage.onChanged for bidirectional sync
  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      // 1. Sync automation state from overlay HUD
      if (changes.rj_automation_state) {
        const state = changes.rj_automation_state.newValue;
        if (state) {
          updateAutomationButtonUI(Boolean(state.isRunning));
        }
      }
      // 2. Sync platformSettings changes from overlay HUD
      if (changes.platformSettings) {
        const newSettings = changes.platformSettings.newValue;
        if (newSettings) {
          currentConfig.platformSettings = newSettings;
          if (currentActivePlatformId && newSettings[currentActivePlatformId]) {
            const platSettings = newSettings[currentActivePlatformId];
            const countInput = platformDynamicForm.querySelector('#keywordCountInput');
            const specificInput = platformDynamicForm.querySelector('#specificKeywordsInput');
            if (countInput && countInput !== document.activeElement && typeof platSettings.keywordCount === 'number') {
              countInput.value = platSettings.keywordCount;
            }
            if (specificInput && specificInput !== document.activeElement && platSettings.specificKeywords !== undefined) {
              specificInput.value = platSettings.specificKeywords;
            }
            const aiToggle = platformDynamicForm.querySelector(`#${currentActivePlatformId}_isAiGenerated`);
            if (aiToggle && platSettings.isAiGenerated !== undefined) {
              aiToggle.checked = Boolean(platSettings.isAiGenerated);
            }
          }
        }
      }
    });
  }

  // Event: Launch In-Page Overlay HUD
  btnLaunchOverlay.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'TOGGLE_OVERLAY_HUD' }, () => {
      showToast('Overlay HUD activated');
      window.close(); // Close popup so user interacts with in-page HUD
    });
  });
});
