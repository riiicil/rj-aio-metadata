/**
 * AiPrompt.js — Platform-Adaptive Prompt Engine & Universal OpenAI Payload Builder
 *
 * Single source of truth for:
 * 1. Official Platform Category Dictionaries (Adobe Stock 21 numeric IDs, Shutterstock 26 Image / 19 Video, Dreamstime 15 Main & Subcategories).
 * 2. Dynamic JSON Output Schemas per platform.
 * 3. Structured system prompt with flat 80-keyword instructions and microstock SEO guidelines.
 * 4. Multimodal OpenAI Chat Completion payload builder with model-safe parameter guards (omits temperature for o1, o3, gpt-5).
 */

/**
 * Prohibited / spammy keywords that must not be generated
 */
export const FORBIDDEN_KEYWORDS = [
  'best',
  'top',
  'isolated',
  'white background',
  'no people',
  'copy space',
  'copyspace',
  'trademark',
  'brand'
];

/**
 * Adobe Stock supported metadata languages and data-key mappings
 */
export const ADOBE_LANGUAGES = {
  1: { code: 'en', name: 'English' },
  2: { code: 'de', name: 'Deutsch' },
  4: { code: 'fr', name: 'Français' },
  5: { code: 'es', name: 'Español' },
  6: { code: 'it', name: 'Italiano' },
  7: { code: 'pt', name: 'Português' },
  9: { code: 'ja', name: 'Japanese' },
  10: { code: 'ko', name: 'Korean' },
  14: { code: 'zh-tw', name: 'Traditional Chinese' }
};

/**
 * Official Category Dictionaries for Supported Microstock Platforms
 */
export const PLATFORM_CATEGORIES = {
  // Adobe Stock: 21 categories with official numeric IDs
  adobestock: {
    10001: 'Animals',
    10092: 'Buildings and Architecture',
    10162: 'Business',
    10209: 'Drinks',
    10235: 'The Environment',
    10255: 'States of Mind',
    10283: 'Food',
    10432: 'Graphic Resources',
    10486: 'Hobbies and Leisure',
    10556: 'Industry',
    10584: 'Landscapes',
    10631: 'Lifestyle',
    10683: 'People',
    10733: 'Plants and Flowers',
    10778: 'Culture and Religion',
    10797: 'Science',
    10834: 'Social Issues',
    10868: 'Sports',
    10927: 'Technology',
    10958: 'Transport',
    10988: 'Travel'
  },

  // Shutterstock: 26 Image categories vs 19 Video categories
  shutterstock: {
    image: [
      'Abstract',
      'Animals/Wildlife',
      'The Arts',
      'Backgrounds/Textures',
      'Beauty/Fashion',
      'Buildings/Landmarks',
      'Business/Finance',
      'Celebrities',
      'Education',
      'Food and drink',
      'Healthcare/Medical',
      'Holidays',
      'Industrial',
      'Interiors',
      'Miscellaneous',
      'Nature',
      'Objects',
      'Parks/Outdoor',
      'People',
      'Religion',
      'Science',
      'Signs/Symbols',
      'Sports/Recreation',
      'Technology',
      'Transportation',
      'Vintage'
    ],
    video: [
      'Animals/Wildlife',
      'The Arts',
      'Backgrounds/Textures',
      'Buildings/Landmarks',
      'Business/Finance',
      'Education',
      'Food and drink',
      'Healthcare/Medical',
      'Holidays',
      'Industrial',
      'Nature',
      'Objects',
      'People',
      'Religion',
      'Science',
      'Signs/Symbols',
      'Sports/Recreation',
      'Technology',
      'Transportation'
    ]
  },

  // Dreamstime: 15 Main categories & hierarchical subcategories
  dreamstime: {
    Abstract: {
      id: 38,
      subcategories: {
        211: 'Aerial',
        112: 'Backgrounds',
        39: 'Blurs',
        164: 'Colors',
        40: 'Competition',
        41: 'Craftsmanship',
        42: 'Danger',
        43: 'Exploration',
        158: 'Fun',
        44: 'Help',
        149: 'Love',
        45: 'Luxury',
        187: 'Mobile',
        46: 'Peace',
        165: 'Planetarium',
        47: 'Power',
        48: 'Purity',
        128: 'Religion',
        155: 'Seasonal & Holiday',
        49: 'Security',
        50: 'Sports',
        51: 'Stress',
        52: 'Success',
        53: 'Teamwork',
        141: 'Textures',
        54: 'Unique'
      }
    },
    Animals: {
      id: 29,
      subcategories: {
        31: 'Birds',
        33: 'Farm',
        36: 'Insects',
        32: 'Mammals',
        34: 'Marine life',
        30: 'Pets',
        35: 'Reptiles & Amphibians',
        37: 'Rodents',
        168: 'Wildlife'
      }
    },
    'Arts & Architecture': {
      id: 69,
      subcategories: {
        124: 'Details',
        71: 'Generic architecture',
        132: 'Historic buildings',
        153: 'Home',
        73: 'Indoor',
        70: 'Landmarks',
        131: 'Modern buildings',
        130: 'Night scenes',
        72: 'Outdoor',
        174: 'Ruins & Ancient',
        154: 'Work places'
      }
    },
    Business: {
      id: 74,
      subcategories: {
        79: 'Communications',
        78: 'Computers',
        80: 'Finance',
        77: 'Industries',
        83: 'Metaphors',
        84: 'Objects',
        75: 'People',
        81: 'Still-life',
        76: 'Teams',
        82: 'Transportation',
        85: 'Travel'
      }
    },
    Editorial: {
      id: 177,
      subcategories: {
        178: 'Celebrities',
        185: 'Commercial',
        179: 'Events',
        184: 'Landmarks',
        180: 'People',
        181: 'Politics',
        182: 'Sports',
        183: 'Weather & Environment'
      }
    },
    Holidays: {
      id: 188,
      subcategories: {
        204: 'Chinese New Year',
        190: 'Christmas',
        207: 'Cinco de Mayo',
        203: 'Diwali',
        193: 'Easter',
        196: 'Fathers Day',
        192: 'Halloween',
        208: 'Hanukkah',
        206: 'Mardi Gras',
        195: 'Mothers Day',
        189: 'New Years',
        205: 'Ramadan',
        191: 'Thanksgiving',
        194: 'Valentines Day',
        202: 'Other'
      }
    },
    'IT & C': {
      id: 108,
      subcategories: {
        210: 'Artificial Intelligence',
        110: 'Connectivity',
        113: 'Equipment',
        111: 'Internet',
        109: 'Networking'
      }
    },
    'Illustrations & Clipart': {
      id: 172,
      subcategories: {
        166: '3D & Computer generated',
        212: 'Generative AI',
        167: 'Hand drawn & Artistic',
        163: 'Illustrations',
        186: 'Vector'
      }
    },
    Industries: {
      id: 86,
      subcategories: {
        101: 'Agriculture',
        89: 'Architecture',
        87: 'Banking',
        93: 'Cargo & Shipping',
        94: 'Communications',
        91: 'Computers',
        90: 'Construction',
        150: 'Education',
        136: 'Entertainment',
        99: 'Environment',
        127: 'Food & Beverages',
        92: 'Healthcare & Medical',
        96: 'Insurance',
        95: 'Legal',
        100: 'Manufacturing',
        102: 'Military',
        161: 'Oil and gas',
        97: 'Power and energy',
        157: 'Sports',
        98: 'Transportation',
        88: 'Travel'
      }
    },
    Nature: {
      id: 8,
      subcategories: {
        22: 'Clouds and skies',
        17: 'Deserts',
        14: 'Details',
        27: 'Fields & Meadows',
        25: 'Flowers & Gardens',
        28: 'Food ingredients',
        18: 'Forests',
        137: 'Fruits & Vegetables',
        11: 'Generic vegetation',
        143: 'Geologic and mineral',
        16: 'Lakes and rivers',
        146: 'Landscapes',
        15: 'Mountains',
        12: 'Plants and trees',
        19: 'Sea & Ocean',
        26: 'Seasons specific',
        23: 'Sunsets & Sunrises',
        20: 'Tropical',
        171: 'Water',
        24: 'Waterfalls'
      }
    },
    Objects: {
      id: 133,
      subcategories: {
        142: 'Clothing & Accessories',
        147: 'Electronics',
        138: 'Home related',
        135: 'Isolated',
        151: 'Music and sound',
        152: 'Retro',
        156: 'Sports',
        144: 'Still life',
        140: 'Tools',
        134: 'Toys',
        145: 'Other'
      }
    },
    People: {
      id: 114,
      subcategories: {
        123: 'Active',
        139: 'Body parts',
        119: 'Children',
        175: 'Cosmetic & Makeup',
        115: 'Couples',
        122: 'Diversity',
        159: 'Expressions',
        118: 'Families',
        117: 'Men',
        173: 'Nudes',
        162: 'Portraits',
        121: 'Seniors',
        120: 'Teens',
        116: 'Women',
        160: 'Workers'
      }
    },
    Technology: {
      id: 103,
      subcategories: {
        105: 'Computers',
        106: 'Connections',
        129: 'Electronics',
        107: 'Retro',
        209: 'Science',
        104: 'Telecommunications',
        148: 'Other'
      }
    },
    Transportation: {
      id: 55,
      subcategories: {
        56: 'Africa',
        58: 'America',
        176: 'Antarctica',
        65: 'Arts & Architecture',
        57: 'Asia',
        60: 'Australasian',
        62: 'Cruise',
        63: 'Cuisine',
        67: 'Currencies',
        61: 'Destination scenics',
        59: 'Europe',
        68: 'Flags',
        64: 'Resorts',
        66: 'Tropical'
      }
    },
    Travel: {
      id: 55,
      subcategories: {
        56: 'Africa',
        58: 'America',
        176: 'Antarctica',
        65: 'Arts & Architecture',
        57: 'Asia',
        60: 'Australasian',
        62: 'Cruise',
        63: 'Cuisine',
        67: 'Currencies',
        61: 'Destination scenics',
        59: 'Europe',
        68: 'Flags',
        64: 'Resorts',
        66: 'Tropical'
      }
    },
    'Web Design Graphics': {
      id: 197,
      subcategories: {
        201: 'Banners',
        200: 'Buttons',
        199: 'Web Backgrounds & Textures',
        198: 'Web Icons'
      }
    }
  },

  depositphotos: {},
  vecteezy: {},
  freepik: {},
  miricanvas: {}
};

/**
 * Returns the exact JSON output schema definition for a target platform
 *
 * @param {string} platformId - Target platform identifier
 * @param {Object} [options]
 * @param {boolean} [options.isAiGenerated=false] - For Dreamstime 2 vs 3 category pairs
 * @returns {Object} Target schema definition
 */
export function getPlatformOutputSchema(platformId = 'adobestock', { isAiGenerated = false } = {}) {
  const normalizedId = String(platformId).toLowerCase();

  switch (normalizedId) {
    case 'adobestock':
      return {
        title: 'string, 6-15 words, <=185 characters, descriptive title without keyword stuffing',
        category: 'string, exactly one category chosen from official Adobe Stock categories list',
        keywords: ['string, 80 highly relevant microstock tags ordered from specific to general']
      };

    case 'shutterstock':
      return {
        description: 'string, 6-25 words, <=230 characters, detailed description describing subject, setting, context',
        category_1: 'string, primary category chosen from official Shutterstock category list',
        category_2: 'string, secondary distinct category chosen from official Shutterstock category list',
        keywords: ['string, 80 highly relevant microstock tags ordered from specific to general']
      };

    case 'dreamstime':
      return {
        title: 'string, 5-10 words, <=200 characters, concise descriptive title',
        description: 'string, 15-30 words, <=230 characters, detailed comprehensive description',
        categories: isAiGenerated
          ? [
              { main: 'Main Category Name', sub: 'Subcategory Name' },
              { main: 'Main Category Name', sub: 'Subcategory Name' }
            ]
          : [
              { main: 'Main Category Name', sub: 'Subcategory Name' },
              { main: 'Main Category Name', sub: 'Subcategory Name' },
              { main: 'Main Category Name', sub: 'Subcategory Name' }
            ],
        keywords: ['string, 80 highly relevant microstock tags ordered from specific to general']
      };

    case 'depositphotos':
      return {
        description: 'string, 6-20 words, <=230 characters, concise accurate description',
        keywords: ['string, 80 highly relevant microstock tags ordered from specific to general']
      };

    case 'vecteezy':
      return {
        title: 'string, 6-15 words, <=185 characters, descriptive title without keyword stuffing',
        keywords: ['string, 80 highly relevant microstock tags ordered from specific to general']
      };

    case 'freepik':
      return {
        title: 'string, 6-12 words, <=90 characters, descriptive title',
        keywords: ['string, 80 highly relevant microstock tags ordered from specific to general']
      };

    case 'miricanvas':
      return {
        title: 'string, 6-12 words, <=90 characters, descriptive title',
        keywords: ['string, 80 highly relevant microstock tags ordered from specific to general']
      };

    default:
      return {
        title: 'string, 6-15 words, <=185 characters, descriptive title',
        description: 'string, 10-25 words, <=230 characters, clear description',
        keywords: ['string, 80 highly relevant microstock tags ordered from specific to general']
      };
  }
}

/**
 * Resolves Adobe Stock metadata language configuration
 * @param {string|number} lang - Language code or numeric key
 * @returns {{code: string, name: string}}
 */
function resolveAdobeLanguage(lang) {
  if (!lang) return { code: 'en', name: 'English' };
  const str = String(lang).toLowerCase();
  if (ADOBE_LANGUAGES[str]) return ADOBE_LANGUAGES[str];
  for (const item of Object.values(ADOBE_LANGUAGES)) {
    if (item.code.toLowerCase() === str || item.name.toLowerCase() === str) {
      return item;
    }
  }
  return { code: str, name: str };
}

/**
 * Builds platform-tailored system prompt and user instruction
 *
 * @param {Object} params
 * @param {string} [params.platformId='adobestock'] - Target platform
 * @param {'image'|'video'} [params.assetType='image'] - Media asset type
 * @param {string} [params.language='en'] - Target language
 * @param {boolean} [params.isAiGenerated=false] - AI generation flag
 * @returns {{systemPrompt: string, userInstruction: string}}
 */
export function buildPrompt({
  platformId = 'adobestock',
  assetType = 'image',
  language = 'en',
  isAiGenerated = false
} = {}) {
  const normPlatform = String(platformId).toLowerCase();
  const normAssetType = assetType === 'video' ? 'video' : 'image';

  const resolvedLang = resolveAdobeLanguage(language);
  const langPromptRule = (normPlatform === 'adobestock' && resolvedLang && resolvedLang.code !== 'en')
    ? `\n6. TARGET LANGUAGE: All title and keyword fields MUST be strictly generated in ${resolvedLang.name} (${resolvedLang.code}). Do not use English.`
    : '';

  // 1. Universal System Prompt
  const systemPrompt = `You are a world-class microstock contributor SEO specialist and commercial metadata optimizer.
Your objective is to generate accurate, commercially viable, and high-converting metadata for microstock contributor platforms.

Universal Microstock Rules:
1. COMMERCIAL VIABILITY: Focus on commercial buyers, searchable concepts, and industry-standard stock photography terminology.
2. KEYWORDS COUNT: You MUST generate EXACTLY 80 keywords. Order keywords strictly by relevance from most specific primary subject (first 10 tags) to broader contextual, atmospheric, and conceptual tags (tags 11-80).
3. KEYWORD STRUCTURE: Each keyword must be a single word or a maximum 2-word phrase (e.g. "coffee cup", "digital nomad"). No full sentences, no special characters, and no punctuation inside tags.
4. FORBIDDEN KEYWORDS: NEVER include spammy or prohibited terms such as: "best", "top", "isolated", "white background", "no people", "copy space", "copyspace", or registered trademarks and brand names.
5. FORMATTING: Return strictly valid JSON matching the requested schema. Do not enclose the output in markdown code blocks (\`\`\`json ... \`\`\`), do not provide explanations, notes, or commentary.${langPromptRule}`;

  // 2. Platform Specific Guidelines & Category Injections
  let categorySection = '';
  let languageSection = '';

  if (normPlatform === 'adobestock') {
    const categoriesList = Object.values(PLATFORM_CATEGORIES.adobestock)
      .map(c => `- ${c}`)
      .join('\n');
    categorySection = `Official Adobe Stock Categories (select exactly one that best fits):\n${categoriesList}\n\nCategory Requirement: You must choose exactly one category from the list above and assign it to the 'category' field.`;

    const adobeLang = resolveAdobeLanguage(language);
    if (adobeLang.code !== 'en') {
      languageSection = `CRITICAL LANGUAGE REQUIREMENT: All generated metadata (title and keywords) MUST be strictly written in ${adobeLang.name} (language code: ${adobeLang.code}). Do not use English under any circumstance.`;
    } else {
      languageSection = 'Language: English.';
    }
  } else if (normPlatform === 'shutterstock') {
    const list = PLATFORM_CATEGORIES.shutterstock[normAssetType] || PLATFORM_CATEGORIES.shutterstock.image;
    const categoriesList = list.map(c => `- ${c}`).join('\n');
    categorySection = `Official Shutterstock Categories for ${normAssetType.toUpperCase()} (select 2 distinct categories):\n${categoriesList}\n\nCategory Requirement:\n- 'category_1': Primary category most relevant to the asset.\n- 'category_2': Secondary distinct category providing additional context.\nBoth categories must be chosen from the official list above and must not be identical.`;
    languageSection = 'Language: English (microstock standard).';
  } else if (normPlatform === 'dreamstime') {
    const mainCategories = [
      'Abstract',
      'Animals',
      'Arts & Architecture',
      'Business',
      'Editorial',
      'Holidays',
      'IT & C',
      'Illustrations & Clipart',
      'Industries',
      'Nature',
      'Objects',
      'People',
      'Technology',
      'Transportation',
      'Web Design Graphics'
    ];

    const taxonomyList = mainCategories
      .map(main => {
        const cat = PLATFORM_CATEGORIES.dreamstime[main];
        const subs = cat ? Object.values(cat.subcategories).join(', ') : '';
        return `- ${main}: ${subs}`;
      })
      .join('\n');

    categorySection = `Official Dreamstime Taxonomy (Main Categories and Subcategories):\n${taxonomyList}\n\nCategory Requirement:\n${
      isAiGenerated
        ? 'Since this asset is AI-generated, Dreamstime automatically reserves the 3rd category slot. You must select EXACTLY 2 distinct category pairs from the taxonomy above (e.g. [{"main": "Nature", "sub": "Landscapes"}, {"main": "Abstract", "sub": "Backgrounds"}]).'
        : 'You must select EXACTLY 3 distinct category pairs from the taxonomy above (e.g. [{"main": "Nature", "sub": "Landscapes"}, {"main": "Abstract", "sub": "Backgrounds"}, {"main": "Transportation", "sub": "Destination scenics"}]).'
    }`;
    languageSection = 'Language: English (microstock standard).';
  } else {
    // depositphotos, vecteezy, freepik, miricanvas
    categorySection = 'Categories: Not required for this platform. Do NOT include any category fields in the output.';
    languageSection = 'Language: English (microstock standard).';
  }

  // 3. Output Schema Injection
  const schema = getPlatformOutputSchema(normPlatform, { isAiGenerated });
  const schemaString = JSON.stringify(schema, null, 2);

  const userInstruction = `Analyze the provided image and generate metadata specifically tailored for ${normPlatform.toUpperCase()} (${normAssetType.toUpperCase()} asset).

${categorySection}

${languageSection}

Required JSON Output Schema:
${schemaString}

Return ONLY the valid JSON object adhering strictly to the schema above. All text fields (title and keywords) must strictly adhere to the required language.`;

  return {
    systemPrompt,
    userInstruction
  };
}

/**
 * Strips data URI prefixes and cleans base64 image strings
 * @param {string} base64Str - Raw or data-prefixed base64 string
 * @returns {string} Pure base64 data string
 */
export function normalizeBase64Image(base64Str) {
  if (!base64Str) return '';
  const trimmed = String(base64Str).trim();
  const commaIndex = trimmed.indexOf(',');
  if (trimmed.startsWith('data:') && commaIndex !== -1) {
    return trimmed.slice(commaIndex + 1).trim();
  }
  return trimmed;
}

/**
 * Builds OpenAI-compatible multimodal Chat Completion request payload
 *
 * @param {Object} params
 * @param {string} params.model - AI model identifier
 * @param {string} params.systemPrompt - System instruction
 * @param {string} params.userInstruction - Structured user prompt
 * @param {string} [params.imageBase64] - Base64 encoded image string
 * @param {number} [params.temperature=0.7] - Sampling temperature (omitted for strict models)
 * @param {number} [params.maxTokens=1200] - Max tokens / completion tokens
 * @returns {Object} Valid OpenAI POST /v1/chat/completions payload
 */
export function buildChatPayload({
  model,
  systemPrompt,
  userInstruction,
  imageBase64,
  temperature = 0.7,
  maxTokens = null
}) {
  const modelStr = model || '';

  // Reasoning models (o1, o3, o4) and GPT-5 family strictly prohibit custom temperature (or only default 1.0)
  const isStrictTemperatureModel = /^(o1|o3|o4|gpt-5)/i.test(modelStr);

  // Models that require max_completion_tokens (reject max_tokens)
  const isCompletionTokenModel = /^(o1|o3|o4|gpt-5)/i.test(modelStr);

  // Allocate sufficient token budget: reasoning models consume completion tokens for thinking
  const effectiveMaxTokens = maxTokens !== null
    ? maxTokens
    : (isCompletionTokenModel ? 16384 : 4096);

  // Base legacy GPT-4 models reject response_format: { type: 'json_object' }
  const supportsResponseFormat = !/^gpt-4(-0613)?$/i.test(modelStr);

  const userContent = [{ type: 'text', text: userInstruction }];

  if (imageBase64) {
    const cleanBase64 = normalizeBase64Image(imageBase64);
    userContent.push({
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${cleanBase64}`,
        detail: 'low'
      }
    });
  }

  const payload = {
    model: modelStr,
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userContent
      }
    ]
  };

  if (supportsResponseFormat) {
    payload.response_format = { type: 'json_object' };
  }

  if (isCompletionTokenModel) {
    payload.max_completion_tokens = effectiveMaxTokens;
  } else {
    payload.max_tokens = effectiveMaxTokens;
  }

  if (!isStrictTemperatureModel) {
    payload.temperature = temperature;
  }

  return payload;
}
