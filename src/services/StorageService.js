/**
 * StorageService — Comprehensive Persistent Storage Engine
 * Manages configuration, multi-provider credentials, platform-adaptive preferences, and file-based API key import.
 */

export const DEFAULT_CONFIG = {
  activeProvider: 'gemini',
  providers: {
    gemini: {
      name: 'Google Gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      apiKey: '',
      defaultModel: 'gemini-2.5-flash-lite',
      customModel: '',
      models: [
        'gemini-2.5-flash-lite',
        'gemini-2.5-flash',
        'gemini-2.5-pro',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-pro'
      ]
    },
    mistral: {
      name: 'Mistral AI',
      baseUrl: 'https://api.mistral.ai/v1',
      apiKey: '',
      defaultModel: 'mistral-small-latest',
      customModel: '',
      models: [
        'mistral-small-latest',
        'pixtral-12b-2409',
        'pixtral-large-latest',
        'mistral-large-latest'
      ]
    },
    openai: {
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      defaultModel: 'gpt-5-nano',
      customModel: '',
      models: [
        'gpt-5-nano',
        'gpt-5-mini',
        'gpt-5',
        'gpt-4o',
        'gpt-4o-mini'
      ]
    },
    openrouter: {
      name: 'OpenRouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: '',
      defaultModel: 'openai/gpt-5-nano',
      customModel: '',
      models: [
        'openai/gpt-5-nano',
        'google/gemini-2.5-flash-lite',
        'google/gemini-flash-1.5',
        'anthropic/claude-3.5-sonnet',
        'meta-llama/llama-3.2-11b-vision-instruct'
      ]
    },
    custom: {
      name: 'Custom OpenAI-Compatible Endpoint',
      baseUrl: '',
      apiKey: '',
      defaultModel: '',
      customModel: '',
      models: []
    }
  },
  activePlatform: 'adobestock',
  platformSettings: {
    adobestock: {
      keywordCount: 49,
      specificKeywords: '',
      language: 'en',
      autoSaveDraft: true,
      isAiGenerated: false
    },
    shutterstock: {
      keywordCount: 50,
      specificKeywords: '',
      mediaType: 'image',
      isEditorial: false,
      editorialPrefix: '',
      autoSaveDraft: true,
      isAiGenerated: false
    },
    dreamstime: {
      keywordCount: 50,
      specificKeywords: '',
      mode: 'save_draft',
      autoSaveDraft: true,
      isAiGenerated: false
    },
    vecteezy: {
      keywordCount: 50,
      specificKeywords: '',
      licenseType: 'free',
      aiToolName: '',
      autoSaveDraft: true,
      isAiGenerated: false
    },
    freepik: {
      keywordCount: 50,
      specificKeywords: '',
      aiModel: 'Adobe Firefly',
      autoSaveDraft: true,
      isAiGenerated: false
    },
    depositphotos: {
      keywordCount: 50,
      specificKeywords: '',
      isEditorial: false,
      countryCode: '',
      cityName: '',
      autoSaveDraft: true,
      isAiGenerated: false
    },
    miricanvas: {
      keywordCount: 30,
      specificKeywords: '',
      contentType: 'BITMAP',
      contentTier: 'PREMIUM',
      autoSaveDraft: true,
      isAiGenerated: false
    }
  },
  preferences: {
    enableOverlayOnLoad: true,
    autoSanitizeKeywords: true
  }
};

export class StorageService {
  /**
   * Retrieves full configuration merged with defaults.
   * @returns {Promise<typeof DEFAULT_CONFIG>}
   */
  static async getConfig() {
    return new Promise(resolve => {
      chrome.storage.sync.get(null, stored => {
        if (chrome.runtime.lastError || !stored || Object.keys(stored).length === 0) {
          // Fallback to local storage if sync is empty or failed
          chrome.storage.local.get(null, localStored => {
            resolve(StorageService._deepMerge(DEFAULT_CONFIG, localStored || {}));
          });
          return;
        }
        resolve(StorageService._deepMerge(DEFAULT_CONFIG, stored));
      });
    });
  }

  /**
   * Saves partial or complete configuration to chrome.storage.
   * @param {Object} data 
   * @returns {Promise<boolean>}
   */
  static async saveConfig(data) {
    return new Promise(resolve => {
      chrome.storage.sync.set(data, () => {
        if (chrome.runtime.lastError) {
          // Fallback to local if sync quota exceeded
          chrome.storage.local.set(data, () => resolve(true));
        } else {
          // Keep local in sync
          chrome.storage.local.set(data, () => resolve(true));
        }
      });
    });
  }

  /**
   * Reads API key from an uploaded .txt file.
   * @param {File} file 
   * @returns {Promise<string>}
   */
  static async readApiKeyFromFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      const reader = new FileReader();
      reader.onload = event => {
        const rawKey = event.target?.result || '';
        // Trim whitespace, newlines, and potential trailing tokens
        const cleanKey = String(rawKey).trim().replace(/[\r\n\t]/g, '');
        resolve(cleanKey);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Prioritizes specific custom keywords at index 0 and trims excess AI keywords.
   * @param {string[]} aiKeywords 
   * @param {string} specificKeywordsStr 
   * @param {number} maxCount 
   * @returns {string[]}
   */
  static prioritizeKeywords(aiKeywords = [], specificKeywordsStr = '', maxCount = 50) {
    const specificList = (specificKeywordsStr || '')
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    const seen = new Set();
    const result = [];

    // 1. Add specific keywords first
    for (const tag of specificList) {
      const lower = tag.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(tag);
      }
    }

    // 2. Add AI keywords if not already in list
    for (const tag of (aiKeywords || [])) {
      const clean = (tag || '').trim();
      if (clean.length > 0) {
        const lower = clean.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          result.push(clean);
        }
      }
    }

    // 3. Trim to maxCount
    return result.slice(0, Math.max(8, maxCount));
  }

  /**
   * Deep object merge utility.
   * @private
   */
  static _deepMerge(target, source) {
    const output = Object.assign({}, target);
    if (StorageService._isObject(target) && StorageService._isObject(source)) {
      Object.keys(source).forEach(key => {
        if (StorageService._isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = StorageService._deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  static _isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}
