/**
 * AiService.js — Universal OpenAI-Compatible Multimodal Vision Client & Pipeline Facade
 *
 * Core Responsibilities:
 * 1. imageToBase64: Converts URLs (HTTP/HTTPS/Blob), raw base64 strings, or Data URLs into clean Data URLs.
 * 2. generateMetadata: End-to-end pipeline connecting prompt building, payload construction,
 *    background worker proxy dispatching (bypassing CORS/CSP), response parsing, and metadata sanitization.
 * 3. Supports injectable vision dispatcher for non-extension environments (Node.js unit tests).
 */

import { buildPrompt, buildChatPayload } from './AiPrompt.js';
import { sanitizeMetadata } from './SanitizerService.js';
import { StorageService } from './StorageService.js';

let customDispatcher = null;

/**
 * Sets a custom or mock vision request dispatcher for testing or custom execution.
 * @param {Function|null} dispatcher - Async function({ payload, providerConfig, assetIndex }) => { success, rawContent, ... }
 */
export function setVisionDispatcher(dispatcher) {
  customDispatcher = dispatcher;
}

/**
 * Retrieves the currently configured vision dispatcher.
 * @returns {Function|null}
 */
export function getVisionDispatcher() {
  return customDispatcher;
}

/**
 * Converts various image representations (Data URL, raw base64, HTTP/HTTPS URL, Blob URL)
 * into a standardized base64 Data URL.
 *
 * @param {string|Blob|File} imageSource - Image source
 * @returns {Promise<string>} Standardized Data URL (data:image/...;base64,...)
 */
export async function imageToBase64(imageSource) {
  if (!imageSource) return '';

  // If already a Blob or File instance
  if (typeof Blob !== 'undefined' && imageSource instanceof Blob) {
    if (typeof FileReader !== 'undefined') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(imageSource);
      });
    } else {
      const arrayBuffer = await imageSource.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mime = imageSource.type || 'image/jpeg';
      return `data:${mime};base64,${buffer.toString('base64')}`;
    }
  }

  const str = String(imageSource).trim();

  // 1. Already a base64 Data URL
  if (str.startsWith('data:')) {
    return str;
  }

  // 2. HTTP / HTTPS / Blob URL
  if (/^(https?:\/\/|blob:)/i.test(str)) {
    const res = await fetch(str);
    if (!res.ok) {
      const err = new Error(`Failed to fetch image from URL: ${str} (Status: ${res.status})`);
      err.code = 'IMAGE_FETCH_FAILED';
      throw err;
    }
    const blob = await res.blob();
    if (typeof FileReader !== 'undefined') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      // Node.js environment fallback
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mime = blob.type || 'image/jpeg';
      return `data:${mime};base64,${buffer.toString('base64')}`;
    }
  }

  // 3. Raw base64 string
  return `data:image/jpeg;base64,${str}`;
}

/**
 * Universal Metadata Generation Pipeline
 *
 * Orchestrates:
 * 1. Image base64 conversion.
 * 2. Active provider validation (API key, model selection).
 * 3. Platform prompt & schema building via AiPrompt.
 * 4. Chat payload packaging via AiPrompt.
 * 5. Proxy dispatch to background service worker (or test dispatcher).
 * 6. Output sanitization via SanitizerService.
 *
 * @param {Object} options
 * @param {string|Blob} [options.image] - Image Data URL, raw base64, or image URL
 * @param {string} [options.platformId='adobestock'] - Target microstock platform
 * @param {'image'|'video'} [options.assetType='image'] - Media asset type
 * @param {string} [options.language='en'] - Target language
 * @param {number} [options.targetKeywordCount=50] - Desired keyword quota
 * @param {string[]|string} [options.customKeywords=[]] - Priority custom keywords
 * @param {boolean} [options.isAiGenerated=false] - Generative AI asset flag
 * @param {string} [options.editorialPrefix=''] - Editorial prefix (Shutterstock)
 * @param {number} [options.assetIndex=0] - Asset index for round-robin key rotation
 * @param {Object} [options.providerConfig=null] - Optional provider config override
 * @returns {Promise<Object>} Standardized sanitized metadata object
 */
export async function generateMetadata({
  image,
  platformId = 'adobestock',
  assetType = 'image',
  language = 'en',
  targetKeywordCount = 50,
  customKeywords = [],
  isAiGenerated = false,
  editorialPrefix = '',
  assetIndex = 0,
  providerConfig = null
} = {}) {
  // 1. Convert image to base64 Data URL
  const imageBase64 = image ? await imageToBase64(image) : '';

  // 2. Resolve configuration
  let config = providerConfig;
  if (!config) {
    config = await StorageService.loadConfig();
  }

  // 3. Validate active provider
  const activeProviderKey = config?.activeProvider || 'gemini';
  const provider = config?.providers?.[activeProviderKey];
  if (!provider) {
    const err = new Error(`Active provider '${activeProviderKey}' is not configured.`);
    err.code = 'PROVIDER_NOT_CONFIGURED';
    throw err;
  }

  if (!provider.apiKey || !String(provider.apiKey).trim()) {
    const err = new Error(`API key is required for provider: ${provider.name || activeProviderKey}`);
    err.code = 'API_KEY_REQUIRED';
    throw err;
  }

  if (!provider.selectedModel || !String(provider.selectedModel).trim()) {
    const err = new Error(`Model selection is required for provider: ${provider.name || activeProviderKey}`);
    err.code = 'MODEL_SELECTION_REQUIRED';
    throw err;
  }

  // 4. Build prompt
  const { systemPrompt, userInstruction } = buildPrompt({
    platformId,
    assetType,
    language,
    isAiGenerated
  });

  // 5. Build chat payload
  const payload = buildChatPayload({
    model: provider.selectedModel,
    systemPrompt,
    userInstruction,
    imageBase64
  });

  // 6. Dispatch request
  let rawContent = '';

  if (customDispatcher) {
    const res = await customDispatcher({ payload, providerConfig: config, assetIndex });
    if (!res || !res.success) {
      const code = res?.error?.code || res?.code || 'GENERATION_FAILED';
      const msg = res?.error?.message || res?.error || 'Vision metadata generation failed';
      const err = new Error(msg);
      err.code = code;
      throw err;
    }
    rawContent = res.rawContent || '';
  } else if (typeof chrome !== 'undefined' && chrome?.runtime?.sendMessage) {
    const res = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: 'GENERATE_VISION_METADATA', payload, providerConfig: config, assetIndex },
        response => {
          if (chrome.runtime.lastError) {
            const err = new Error(chrome.runtime.lastError.message);
            err.code = 'RUNTIME_MESSAGE_ERROR';
            reject(err);
          } else {
            resolve(response);
          }
        }
      );
    });

    if (!res || !res.success) {
      const code = res?.error?.code || res?.code || 'GENERATION_FAILED';
      const msg = res?.error?.message || res?.error || 'Vision metadata generation failed';
      const err = new Error(msg);
      err.code = code;
      throw err;
    }
    rawContent = res.rawContent || '';
  } else {
    // Non-extension environment without mock dispatcher: direct executor fallback
    const { handleGenerateVisionMetadata } = await import('../background/service_worker.js');
    const res = await handleGenerateVisionMetadata({ payload, providerConfig: config, assetIndex });
    rawContent = res.rawContent || '';
  }

  // 7. Sanitize output
  const sanitized = sanitizeMetadata(rawContent, {
    platformId,
    targetKeywordCount,
    customKeywords,
    editorialPrefix
  });

  // 8. Return sanitized metadata object
  return sanitized;
}
