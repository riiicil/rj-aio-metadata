/**
 * RJ AIO Metadata Extension — Background Service Worker (Manifest V3)
 * Handles dynamic model fetching, active tab platform detection, navigation, and overlay relay.
 */

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
function parseModelList(json) {
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
async function fetchProviderModels({ baseUrl, apiKey }) {
  if (!baseUrl) throw new Error('Base URL is required to fetch models.');
  const keys = String(apiKey || '')
    .split(/[\r\n,\s\t]+/)
    .map(k => k.trim().replace(/^['\"]|['\"]$/g, ''))
    .filter(Boolean);
  const activeKey = keys[0];
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
function evaluateTabPlatform(url = '') {
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

// Runtime message dispatcher
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
