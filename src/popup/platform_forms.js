/**
 * RJ AIO Metadata Extension — Platform Dynamic Form Templates
 * Pure HTML template generators for all 7 supported microstock contributor platforms.
 */

import { FREEPIK_BASE_MODELS, VECTEEZY_AI_SOFTWARE } from '../services/StorageService.js';
import { DEPOSITPHOTOS_COUNTRIES } from './depositphotos_countries.js';

// Platform Keyword Count Constraints & Hints
export const PLATFORM_LIMITS = {
  adobestock: { min: 8, max: 49, hint: 'Min 8, Max 49 (Adobe limit)' },
  dreamstime: { min: 8, max: 70, hint: 'Min 8, Max 70 (Dreamstime limit)' },
  miricanvas: { min: 8, max: 25, hint: 'Min 8, Max 25 (MiriCanvas limit)' },
  shutterstock: { min: 8, max: 50, hint: 'Min 8, Max 50' },
  freepik: { min: 8, max: 50, hint: 'Min 8, Max 50' },
  vecteezy: { min: 8, max: 50, hint: 'Min 8, Max 50' },
  depositphotos: { min: 8, max: 50, hint: 'Min 8, Max 50' }
};

/**
 * Escapes unsafe characters for HTML attribute and content injection.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates the universal stepper and specific keywords controls.
 * @param {string} platformId
 * @param {Object} settings
 * @returns {{ html: string, limits: Object, currentCount: number }}
 */
export function getUniversalControlsHtml(platformId, settings = {}) {
  let limits = PLATFORM_LIMITS[platformId] || { min: 8, max: 50, hint: 'Min 8, Max 50' };
  if (platformId === 'freepik' && settings.isAiGenerated) {
    limits = { min: 8, max: 49, hint: 'Min 8, Max 49 (Freepik AI limit)' };
  }
  let currentCount = (typeof settings.keywordCount === 'number') ? settings.keywordCount : limits.max;
  if (platformId === 'freepik' && settings.isAiGenerated && currentCount > 49) {
    currentCount = 49;
    settings.keywordCount = 49;
  }

  const html = `
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

  return { html, limits, currentCount };
}

/**
 * Individual platform form fragment generators.
 */
export function getAdobeStockFormHtml(settings = {}) {
  const lang = settings.language || 'en';
  return `
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
}

export function getShutterstockFormHtml(settings = {}) {
  const isEditorial = Boolean(settings.isEditorial);
  return `
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
}

export function getFreepikFormHtml(settings = {}) {
  const isAi = Boolean(settings.isAiGenerated);
  const aiModel = settings.aiModel || 'Midjourney 6';
  return `
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
        ${FREEPIK_BASE_MODELS.map(m => `
          <option value="${escapeHtml(m)}" ${aiModel === m ? 'selected' : ''}>${escapeHtml(m)}</option>
        `).join('')}
      </select>
    </div>
  `;
}

export function getVecteezyFormHtml(settings = {}) {
  const license = settings.licenseType || 'free';
  const isAi = Boolean(settings.isAiGenerated);
  const aiSoftware = settings.aiSoftware || 'Midjourney';
  const customAiSoftware = settings.customAiSoftware || '';
  const showCustom = isAi && (aiSoftware === 'Other');
  return `
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
        <span class="rj-switch-desc">Declare AI generation &amp; select software</span>
      </div>
      <label class="rj-switch">
        <input type="checkbox" id="vecteezy_isAiGenerated" ${isAi ? 'checked' : ''}>
        <span class="rj-slider"></span>
      </label>
    </div>

    <div id="vecteezy_aiSoftwareGroup" class="rj-field-group rj-conditional-field ${isAi ? 'rj-visible' : ''}">
      <select id="vecteezy_aiSoftware" class="rj-select">
        ${VECTEEZY_AI_SOFTWARE.map(s => `
          <option value="${escapeHtml(s)}" ${aiSoftware === s ? 'selected' : ''}>${escapeHtml(s)}</option>
        `).join('')}
      </select>
    </div>

    <div id="vecteezy_customAiSoftwareGroup" class="rj-field-group rj-conditional-field ${showCustom ? 'rj-visible' : ''}">
      <input type="text" id="vecteezy_customAiSoftware" class="rj-input" placeholder="e.g. Flux.1, Adobe Firefly, Leonardo.ai" value="${escapeHtml(customAiSoftware)}">
    </div>
  `;
}

export function getDreamstimeFormHtml(settings = {}) {
  const mode = settings.mode || 'save_draft';
  const isEditorial = Boolean(settings.isEditorial);
  const isAi = Boolean(settings.isAiGenerated);
  return `
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
}

export function getDepositphotosFormHtml(settings = {}) {
  const isEditorial = Boolean(settings.isEditorial);
  const countryCode = settings.countryCode || '';
  return `
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
}

export function getMiriCanvasFormHtml(settings = {}) {
  const tier = settings.contentTier || 'PREMIUM';
  const isAi = Boolean(settings.isAiGenerated);
  return `
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

/**
 * Master generator for assembling the full dynamic form HTML for any platform.
 * @param {string} platformId
 * @param {Object} settings
 * @returns {string} Complete HTML string to inject into platformDynamicForm.innerHTML
 */
export function generatePlatformFormHtml(platformId, settings = {}) {
  const { html: universalHtml } = getUniversalControlsHtml(platformId, settings);
  let specificHtml = '';

  switch (platformId) {
    case 'adobestock':
      specificHtml = getAdobeStockFormHtml(settings);
      break;
    case 'shutterstock':
      specificHtml = getShutterstockFormHtml(settings);
      break;
    case 'freepik':
      specificHtml = getFreepikFormHtml(settings);
      break;
    case 'vecteezy':
      specificHtml = getVecteezyFormHtml(settings);
      break;
    case 'dreamstime':
      specificHtml = getDreamstimeFormHtml(settings);
      break;
    case 'depositphotos':
      specificHtml = getDepositphotosFormHtml(settings);
      break;
    case 'miricanvas':
      specificHtml = getMiriCanvasFormHtml(settings);
      break;
    default:
      specificHtml = '';
      break;
  }

  return universalHtml + specificHtml;
}
