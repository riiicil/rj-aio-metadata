/**
 * RJ AIO Metadata Extension — Background Service Worker (Manifest V3)
 * Handles dynamic model fetching, active tab platform detection, navigation, overlay relay,
 * and OpenAI-compatible vision AI proxy routing with multi-key round-robin and retry handling.
 */

import { StorageService } from '../services/StorageService.js';

const PLATFORM_DESTINATIONS = {
  adobestock: {
    name: 'Adobe Stock',
    hostPattern: 'contributor.stock.adobe.com',
    url: 'https://contributor.stock.adobe.com/uploads'
  },
  shutterstock: {
    name: 'Shutterstock',
    hostPattern: 'submit.shutterstock.com',
    url: 'https://submit.shutterstock.com/dashboard'
  },
  dreamstime: {
    name: 'Dreamstime',
    hostPattern: 'dreamstime.com',
    url: 'https://www.dreamstime.com/uploadfile'
  },
  vecteezy: {
    name: 'Vecteezy',
    hostPattern: 'contributors.vecteezy.com',
    url: 'https://contributors.vecteezy.com/content'
  },
  freepik: {
    name: 'Freepik',
    hostPattern: 'contributor.freepik.com',
    url: 'https://contributor.freepik.com/files'
  },
  depositphotos: {
    name: 'Depositphotos',
    hostPattern: 'depositphotos.com',
    url: 'https://depositphotos.com/files/unfinished.html'
  },
  miricanvas: {
    name: 'MiriCanvas',
    hostPattern: 'designhub.miricanvas.com',
    url: 'https://designhub.miricanvas.com/en/element/to-do'
  }
};

/**
 * Normalizes and extracts model IDs from different API vendor responses.
 */
export function parseModelList(json) {
  const models = [];
  if (!json) return models;

  // Standard OpenAI / Mistral / OpenRouter / Groq schema: { data: [{ id: "..." }] }
  if (Array.isArray(json.data)) {
    for (const item of json.data) {
      if (item && item.id) models.push(item.id);
    }
  } 
  // Gemini native schema: { models: [{ name: "models/gemini-..." }] }
  else if (Array.isArray(json.models)) {
    for (const item of json.models) {
      const name = item.name ? item.name.replace(/^models\//, '') : item.id;
      if (name) models.push(name);
    }
  }

  // Sort models alphabetically with vision-capable models first
  return models.sort((a, b) => {
    const isVisionA = /vision|flash|pixtral|gpt-5|gpt-4o|vl|gemini/i.test(a);
    const isVisionB = /vision|flash|pixtral|gpt-5|gpt-4o|vl|gemini/i.test(b);
    if (isVisionA && !isVisionB) return -1;
    if (!isVisionA && isVisionB) return 1;
    return a.localeCompare(b);
  });
}

/**
 * Fetches available models from any OpenAI-compatible provider.
 */
export async function fetchProviderModels({ baseUrl, apiKey }) {
  if (!baseUrl) throw new Error('Base URL is required to fetch models.');
  const activeKey = StorageService.parseApiKeys(apiKey)[0] || '';
  if (!activeKey) throw new Error('API Key is required to fetch models.');

  const cleanBase = baseUrl.replace(/\/+$/, '');
  let endpoint = `${cleanBase}/models`;

  // For Google Gemini API, support both query param and header authorization
  if (cleanBase.includes('generativelanguage.googleapis.com')) {
    endpoint = `${cleanBase}/models?key=${encodeURIComponent(activeKey)}`;
  }

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${activeKey}`,
      'x-goog-api-key': activeKey,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Server returned ${response.status}: ${errText.slice(0, 150)}`);
  }

  const json = await response.json();
  const models = parseModelList(json);

  if (models.length === 0) {
    throw new Error('No models found in the provider response.');
  }

  return models;
}

/**
 * Determines whether an active tab matches a platform.
 */
export function evaluateTabPlatform(url = '') {
  if (!url) return { detectedPlatform: null, isMatched: false };

  try {
    const urlObj = new URL(url);
    for (const [platformId, def] of Object.entries(PLATFORM_DESTINATIONS)) {
      if (urlObj.hostname.includes(def.hostPattern)) {
        return { detectedPlatform: platformId, platformDef: def, isMatched: true };
      }
    }
  } catch (e) {
    // Ignore invalid URL protocols (e.g. chrome://)
  }

  return { detectedPlatform: null, isMatched: false };
}

/**
 * Calculates exponential backoff delay in milliseconds.
 * Formula: delay = baseDelay * (2 ** attempt) (e.g. 1000ms, 2000ms, 4000ms).
 *
 * @param {number} attempt - Zero-based retry attempt number
 * @param {number} [baseDelay=1000] - Base delay in milliseconds
 * @returns {number} Delay in milliseconds
 */
export function calculateBackoffDelay(attempt, baseDelay = 1000) {
  return baseDelay * (2 ** attempt);
}

/**
 * Constructs provider-specific endpoint URL and authentication headers.
 * Supported providers: Gemini, OpenRouter, OpenAI, Mistral, and Custom.
 *
 * @param {Object} params
 * @param {Object} params.provider - Provider configuration object
 * @param {string} params.activeKey - Resolved API key for this request
 * @param {Object} [params.payload] - Request payload
 * @returns {{endpointUrl: string, headers: Object}}
 */
export function buildProviderRequestParams({ provider, activeKey, payload }) {
  const cleanBase = (provider.baseUrl || '').replace(/\/+$/, '');
  let endpointUrl = `${cleanBase}/chat/completions`;
  const headers = { 'Content-Type': 'application/json' };

  const providerKey = (provider.key || provider.id || '').toLowerCase();
  const providerName = (provider.name || '').toLowerCase();
  const isGemini = providerKey === 'gemini' || providerName.includes('gemini') || cleanBase.includes('generativelanguage.googleapis.com');
  const isOpenRouter = providerKey === 'openrouter' || providerName.includes('openrouter') || cleanBase.includes('openrouter.ai');

  if (isGemini) {
    endpointUrl += `${endpointUrl.includes('?') ? '&' : '?'}key=${encodeURIComponent(activeKey)}`;
    headers['x-goog-api-key'] = activeKey;
  } else if (isOpenRouter) {
    headers['Authorization'] = `Bearer ${activeKey}`;
    headers['HTTP-Referer'] = 'https://github.com/riiicil/rj-aio-metadata';
    headers['X-Title'] = 'RJ AIO Metadata';
  } else {
    // OpenAI, Mistral, Custom
    headers['Authorization'] = `Bearer ${activeKey}`;
  }

  return { endpointUrl, headers };
}

/**
 * Executes a vision AI request with retry logic and exponential backoff.
 *
 * @param {Object} options
 * @param {string} options.endpointUrl - API endpoint URL
 * @param {Object} options.headers - HTTP request headers
 * @param {Object} options.payload - Request body payload
 * @param {Function} [options.fetchFn=fetch] - Fetch function (injectable for testing)
 * @param {Function} [options.sleepFn] - Sleep function (injectable for testing)
 * @param {number} [options.maxRetries=3] - Maximum retry attempts
 * @param {number} [options.baseDelay=1000] - Base delay in milliseconds
 * @returns {Promise<Object>} Provider response JSON
 */
export async function executeVisionRequestWithRetry({
  endpointUrl,
  headers,
  payload,
  fetchFn = fetch,
  sleepFn = (ms) => new Promise(r => setTimeout(r, ms)),
  maxRetries = 3,
  baseDelay = 1000
}) {
  let attempt = 0;

  while (attempt <= maxRetries) {
    let response;
    try {
      response = await fetchFn(endpointUrl, {
        method: 'POST',
        headers,
        body: typeof payload === 'string' ? payload : JSON.stringify(payload)
      });
    } catch (networkErr) {
      if (attempt < maxRetries) {
        const delay = calculateBackoffDelay(attempt, baseDelay);
        await sleepFn(delay);
        attempt++;
        continue;
      }
      const err = new Error(`Network error: ${networkErr.message}`);
      err.code = 'NETWORK_ERROR';
      throw err;
    }

    if (response.ok) {
      const json = await response.json();
      return json;
    }

    const status = response.status;
    let errText = '';
    try {
      errText = await response.text();
    } catch (e) {
      errText = '';
    }

    // 401 / 403: Invalid API Key -> Do NOT retry
    if (status === 401 || status === 403) {
      const err = new Error('Unauthorized or invalid API key.');
      err.code = 'API_KEY_INVALID';
      err.status = status;
      err.details = errText;
      throw err;
    }

    // 404: Model Not Found -> Do NOT retry
    if (status === 404) {
      const err = new Error(`Model not found on provider endpoint: ${payload?.model || ''}`);
      err.code = 'MODEL_NOT_FOUND';
      err.status = status;
      err.details = errText;
      throw err;
    }

    // Retryable status codes: 429 (rate limit), 500, 502, 503, 504 (server errors)
    const isRetryable = status === 429 || [500, 502, 503, 504].includes(status);
    if (isRetryable && attempt < maxRetries) {
      const delay = calculateBackoffDelay(attempt, baseDelay);
      await sleepFn(delay);
      attempt++;
      continue;
    }

    // Retries exhausted or unrecoverable error
    if (status === 429) {
      const err = new Error('Rate limit exceeded. Try adding multiple API keys in settings for round-robin rotation.');
      err.code = 'RATE_LIMIT_EXCEEDED';
      err.status = status;
      err.details = errText;
      throw err;
    }

    if (status >= 500 && status < 600) {
      const err = new Error('Provider server encountered an error.');
      err.code = 'PROVIDER_SERVER_ERROR';
      err.status = status;
      err.details = errText;
      throw err;
    }

    const err = new Error(`Provider API error (${status}): ${errText.slice(0, 150)}`);
    err.code = 'API_REQUEST_FAILED';
    err.status = status;
    err.details = errText;
    throw err;
  }
}

/**
 * Handles GENERATE_VISION_METADATA message requests.
 *
 * @param {Object} request
 * @param {Object} request.payload - Multimodal chat completions payload
 * @param {Object} [request.providerConfig] - Optional provider configuration
 * @param {number} [request.assetIndex=0] - Asset index for round-robin key selection
 * @param {Object} [options]
 * @param {Function} [options.fetchFn] - Custom fetch function
 * @param {Function} [options.sleepFn] - Custom sleep function
 * @param {number} [options.baseDelay] - Custom base delay
 * @param {number} [options.maxRetries] - Custom max retries
 * @returns {Promise<Object>} Result with success, rawContent, provider, model, usedKeyIndex
 */
export async function handleGenerateVisionMetadata(request, { fetchFn, sleepFn, baseDelay, maxRetries } = {}) {
  const payload = request?.payload;
  let providerConfig = request?.providerConfig;
  const assetIndex = typeof request?.assetIndex === 'number' ? request.assetIndex : 0;

  if (!payload) {
    const err = new Error('Request payload is required.');
    err.code = 'INVALID_REQUEST';
    throw err;
  }

  if (!providerConfig) {
    providerConfig = await StorageService.loadConfig();
  }

  const activeProviderKey = providerConfig?.activeProvider || 'gemini';
  const provider = providerConfig?.providers?.[activeProviderKey];
  if (!provider) {
    const err = new Error(`Provider configuration not found for: ${activeProviderKey}`);
    err.code = 'PROVIDER_NOT_CONFIGURED';
    throw err;
  }

  const activeKey = StorageService.getRoundRobinApiKey(provider.apiKey, assetIndex);
  if (!activeKey) {
    const err = new Error(`API key is not configured for provider: ${provider.name || activeProviderKey}`);
    err.code = 'API_KEY_MISSING';
    throw err;
  }

  const { endpointUrl, headers } = buildProviderRequestParams({
    provider: { ...provider, key: activeProviderKey },
    activeKey,
    payload
  });

  const json = await executeVisionRequestWithRetry({
    endpointUrl,
    headers,
    payload,
    fetchFn,
    sleepFn,
    baseDelay,
    maxRetries
  });

  const rawContent = json?.choices?.[0]?.message?.content || '';

  return {
    success: true,
    rawContent,
    provider: activeProviderKey,
    model: payload.model,
    usedKeyIndex: assetIndex
  };
}

// Runtime message dispatcher
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'GENERATE_VISION_METADATA') {
      handleGenerateVisionMetadata(message)
        .then(result => sendResponse(result))
        .catch(err => {
          sendResponse({
            success: false,
            error: {
              code: err.code || 'UNKNOWN_ERROR',
              message: err.message || 'An error occurred during vision metadata generation.'
            }
          });
        });
      return true; // Keep message channel open for async response
    }

    if (message.action === 'FETCH_PROVIDER_MODELS') {
      fetchProviderModels(message.payload)
        .then(models => sendResponse({ success: true, models }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true; // Keep message channel open for async response
    }

    if (message.action === 'GET_ACTIVE_TAB_INFO') {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const activeTab = tabs && tabs[0];
        const url = activeTab ? activeTab.url : '';
        const evalResult = evaluateTabPlatform(url);
        sendResponse({
          tabId: activeTab ? activeTab.id : null,
          url,
          ...evalResult,
          destinations: PLATFORM_DESTINATIONS
        });
      });
      return true;
    }

    if (message.action === 'NAVIGATE_TO_PLATFORM') {
      const target = PLATFORM_DESTINATIONS[message.platformId];
      if (target && target.url) {
        chrome.tabs.create({ url: target.url }, newTab => {
          sendResponse({ success: true, tabId: newTab.id });
        });
      } else {
        sendResponse({ success: false, error: 'Unknown platform ID.' });
      }
      return true;
    }

    if (message.action === 'TOGGLE_OVERLAY_HUD') {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const activeTab = tabs && tabs[0];
        if (!activeTab || !activeTab.id) {
          sendResponse({ success: false, error: 'No active tab found.' });
          return;
        }

        const sendToggle = () => {
          chrome.tabs.sendMessage(activeTab.id, { action: 'TOGGLE_OVERLAY' }, res => {
            if (chrome.runtime.lastError) {
              sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
              sendResponse({ success: true, isVisible: Boolean(res?.isVisible) });
            }
          });
        };

        // Check if content script is active via ping
        chrome.tabs.sendMessage(activeTab.id, { action: 'PING_HUD' }, res => {
          if (chrome.runtime.lastError) {
            // Content script not yet injected on this tab, inject dynamically
            if (chrome.scripting && chrome.scripting.executeScript) {
              chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: ['content/content_main.js']
              }).then(() => {
                setTimeout(sendToggle, 120);
              }).catch(err => {
                sendResponse({ success: false, error: err.message });
              });
            } else {
              sendResponse({ success: false, error: chrome.runtime.lastError.message });
            }
          } else {
            sendToggle();
          }
        });
      });
      return true;
    }

    if (message.action === 'GET_OVERLAY_STATUS') {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const activeTab = tabs && tabs[0];
        if (!activeTab || !activeTab.id) {
          sendResponse({ isVisible: false });
          return;
        }
        chrome.tabs.sendMessage(activeTab.id, { action: 'GET_OVERLAY_STATE' }, res => {
          if (chrome.runtime.lastError || !res) {
            sendResponse({ isVisible: false });
          } else {
            sendResponse({ isVisible: Boolean(res.isVisible) });
          }
        });
      });
      return true;
    }
  });
}
