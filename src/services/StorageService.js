/**
 * StorageService — Comprehensive Persistent Storage Engine
 * Manages configuration, multi-provider credentials (single/multi-line round-robin),
 * dynamic model lists, and platform-adaptive preferences.
 */

export const DEFAULT_CONFIG = {
  activeProvider: 'gemini',
  providers: {
    gemini: {
      name: 'Google Gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      apiKey: '',
      selectedModel: '',
      models: []
    },
    mistral: {
      name: 'Mistral AI',
      baseUrl: 'https://api.mistral.ai/v1',
      apiKey: '',
      selectedModel: '',
      models: []
    },
    openai: {
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      selectedModel: '',
      models: []
    },
    openrouter: {
      name: 'OpenRouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: '',
      selectedModel: '',
      models: []
    },
    custom: {
      name: 'Custom Endpoint',
      baseUrl: '',
      apiKey: '',
      selectedModel: '',
      models: []
    }
  },
  activePlatform: 'adobestock',
  platformSettings: {
    adobestock: {
      keywordCount: 49,
      specificKeywords: '',
      language: 'en',
      isAiGenerated: false
    },
    shutterstock: {
      keywordCount: 50,
      specificKeywords: '',
      isEditorial: false,
      editorialPrefix: ''
    },
    freepik: {
      keywordCount: 50,
      specificKeywords: '',
      isAiGenerated: false,
      aiModel: 'Adobe Firefly',
      customAiModel: ''
    },
    vecteezy: {
      keywordCount: 50,
      specificKeywords: '',
      licenseType: 'free',
      isAiGenerated: false,
      aiToolName: ''
    },
    dreamstime: {
      keywordCount: 70,
      specificKeywords: '',
      mode: 'save_draft',
      isEditorial: false,
      isAiGenerated: false
    },
    depositphotos: {
      keywordCount: 50,
      specificKeywords: '',
      isEditorial: false,
      countryCode: ''
    },
    miricanvas: {
      keywordCount: 25,
      specificKeywords: '',
      contentTier: 'PREMIUM',
      isAiGenerated: false
    }
  },
  preferences: {
    enableOverlayOnLoad: true,
    autoSanitizeKeywords: true
  },
  _schemaVersion: 3
};

export class StorageService {
  /**
   * Retrieves full configuration merged with defaults.
   * Resets legacy pre-cached hardcoded models if schema version is older.
   * @returns {Promise<typeof DEFAULT_CONFIG>}
   */
  static async getConfig() {
    return new Promise(resolve => {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        resolve(StorageService._deepMerge(DEFAULT_CONFIG, {}));
        return;
      }
      chrome.storage.sync.get(null, stored => {
        let rawData = stored;
        if (chrome.runtime.lastError || !rawData || Object.keys(rawData).length === 0) {
          chrome.storage.local.get(null, localStored => {
            rawData = localStored || {};
            const config = StorageService._processLoadedConfig(rawData);
            resolve(config);
          });
          return;
        }
        const config = StorageService._processLoadedConfig(rawData);
        resolve(config);
      });
    });
  }

  /**
   * Alias for getConfig()
   * @returns {Promise<typeof DEFAULT_CONFIG>}
   */
  static async loadConfig() {
    return StorageService.getConfig();
  }

  /**
   * Processes and migrates loaded configuration.
   * @private
   */
  static _processLoadedConfig(rawData) {
    let merged = StorageService._deepMerge(DEFAULT_CONFIG, rawData);
    const loadedSchema = Number(rawData._schemaVersion) || 1;

    // Schema < 2: reset legacy pre-populated models
    if (loadedSchema < 2) {
      if (merged.providers) {
        Object.keys(merged.providers).forEach(provKey => {
          merged.providers[provKey].models = [];
          merged.providers[provKey].selectedModel = '';
        });
      }
    }

    // Schema < 3: clean legacy platform settings and clamp keyword counts
    if (loadedSchema < 3) {
      const obsoleteKeys = ['autoSaveDraft', 'mediaType', 'contentType', 'cityName'];
      const limits = {
        adobestock: { min: 8, max: 49 },
        dreamstime: { min: 8, max: 70 },
        miricanvas: { min: 8, max: 25 },
        shutterstock: { min: 8, max: 50 },
        freepik: { min: 8, max: 50 },
        vecteezy: { min: 8, max: 50 },
        depositphotos: { min: 8, max: 50 }
      };

      if (merged.platformSettings) {
        Object.keys(merged.platformSettings).forEach(platKey => {
          const plat = merged.platformSettings[platKey];
          if (plat && typeof plat === 'object') {
            // Purge deleted keys
            obsoleteKeys.forEach(obKey => {
              delete plat[obKey];
            });

            // Clamp existing keywordCount to new limits
            const limit = limits[platKey] || { min: 8, max: 50 };
            const currentVal = Number(plat.keywordCount) || limit.max;
            plat.keywordCount = Math.max(limit.min, Math.min(limit.max, currentVal));
          }
        });
      }
    }

    // Always ensure obsolete keys are stripped from platformSettings
    if (merged.platformSettings) {
      const obsoleteKeys = ['autoSaveDraft', 'mediaType', 'contentType', 'cityName'];
      Object.keys(merged.platformSettings).forEach(platKey => {
        const plat = merged.platformSettings[platKey];
        if (plat && typeof plat === 'object') {
          obsoleteKeys.forEach(obKey => {
            delete plat[obKey];
          });
        }
      });
    }

    if (merged._schemaVersion !== DEFAULT_CONFIG._schemaVersion) {
      merged._schemaVersion = DEFAULT_CONFIG._schemaVersion;
      // Persist migrated clean config
      StorageService.saveConfig(merged);
    }

    return merged;
  }

  /**
   * Saves partial or complete configuration to chrome.storage.
   * @param {Object} data 
   * @returns {Promise<boolean>}
   */
  static async saveConfig(data) {
    return new Promise(resolve => {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        resolve(true);
        return;
      }
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
   * Splits multi-line or comma-separated API key string into clean array of individual keys.
   * @param {string} rawKeyStr 
   * @returns {string[]}
   */
  static parseApiKeys(rawKeyStr = '') {
    if (!rawKeyStr) return [];
    return String(rawKeyStr)
      .split(/[\r\n,\s\t]+/)
      .map(k => k.trim().replace(/^['"]|['"]$/g, ''))
      .filter(k => k.length > 0);
  }

  /**
   * Returns a round-robin API key based on the asset processing index.
   * @param {string} rawKeyStr 
   * @param {number} assetIndex 
   * @returns {string}
   */
  static getRoundRobinApiKey(rawKeyStr = '', assetIndex = 0) {
    const keys = StorageService.parseApiKeys(rawKeyStr);
    if (keys.length === 0) return '';
    const index = Math.abs(assetIndex) % keys.length;
    return keys[index];
  }

  /**
   * Reads API keys from an uploaded .txt file (supports single or multi-line keys).
   * @param {File} file 
   * @returns {Promise<string>} Clean newline-delimited keys string
   */
  static async readApiKeyFromFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      const reader = new FileReader();
      reader.onload = event => {
        const rawText = event.target?.result || '';
        const keys = StorageService.parseApiKeys(rawText);
        if (keys.length === 0) {
          reject(new Error('No valid API keys found in file'));
          return;
        }
        resolve(keys.join(', '));
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
