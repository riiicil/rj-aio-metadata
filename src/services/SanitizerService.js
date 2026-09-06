/**
 * SanitizerService.js — Microstock Metadata Validation, Sanitization & Repair Engine
 *
 * Core Responsibilities:
 * 1. extractAndParseJson: Resilient extraction of JSON from raw LLM responses (markdown code blocks, conversational filler, trailing commas).
 * 2. sanitizeKeywords: Microstock keyword pipeline (word count limits <=2, punctuation stripping, prohibited terms filtering, user custom keywords priority at Index 0, case-insensitive deduplication, platform quota clamping).
 * 3. sanitizeTitle: Smart boundary clamping (sentence boundary, word boundary without mid-word cuts, mandatory trailing period, platform character limits).
 * 4. sanitizeDescription: Unified 250-character limit, sentence/word boundary clamping, Shutterstock editorial prefix normalization.
 * 5. sanitizeMetadata: Unified facade returning standardized clean metadata payload.
 */

import { PLATFORM_CATEGORIES } from './AiPrompt.js';

/**
 * Hard keyword count limits per platform
 */
export const PLATFORM_KEYWORD_LIMITS = {
  adobestock: 49,
  miricanvas: 25,
  dreamstime: 70,
  shutterstock: 50,
  vecteezy: 50,
  freepik: 50,
  depositphotos: 50,
  default: 50
};

/**
 * Hard title character limits per platform
 */
export const PLATFORM_TITLE_LIMITS = {
  miricanvas: 100,
  freepik: 100,
  adobestock: 200,
  vecteezy: 200,
  dreamstime: 200,
  default: 200
};

/**
 * Uniform description character limit across all supported platforms
 */
export const DESCRIPTION_CHAR_LIMIT = 250;

/**
 * Forbidden file formats and media types (strictly prohibited on Vecteezy and general microstock)
 */
export const BANNED_FILETYPE_KEYWORDS = [
  'vector',
  'vectors',
  'eps',
  'svg',
  'jpg',
  'jpeg',
  'png',
  'video',
  'footage',
  'photo',
  'image',
  'images',
  'clipart',
  'illustration'
];

/**
 * Prominent trademark brand names strictly prohibited on commercial microstock
 */
export const BANNED_TRADEMARK_KEYWORDS = [
  'apple',
  'iphone',
  'ipad',
  'nike',
  'adidas',
  'disney',
  'lego',
  'coca-cola',
  'coca cola',
  'pepsi',
  'google',
  'microsoft'
];

/**
 * Generic spammy buzzwords prohibited across microstock platforms
 */
export const BANNED_GENERAL_KEYWORDS = [
  'isolated',
  'white background',
  'no people',
  'copy space',
  'copyspace',
  'best',
  'top',
  'high quality',
  'trademark',
  'brand'
];

/**
 * Extracts and repairs valid JSON from raw AI text responses
 *
 * @param {string} rawText - Raw LLM output string
 * @returns {Object} Parsed JSON object
 * @throws {Error} Structured error with code MALFORMED_JSON_RESPONSE if parsing fails
 */
export function extractAndParseJson(rawText) {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    const err = new Error('MALFORMED_JSON_RESPONSE: Empty or non-string response');
    err.name = 'MALFORMED_JSON_RESPONSE';
    err.code = 'MALFORMED_JSON_RESPONSE';
    err.snippet = String(rawText || '');
    throw err;
  }

  const firstBrace = rawText.indexOf('{');
  const lastBrace = rawText.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    const err = new Error('MALFORMED_JSON_RESPONSE: No JSON object found in response');
    err.name = 'MALFORMED_JSON_RESPONSE';
    err.code = 'MALFORMED_JSON_RESPONSE';
    err.snippet = rawText.slice(0, 200);
    throw err;
  }

  let snippet = rawText.slice(firstBrace, lastBrace + 1);

  // Sanitize trailing commas before closing braces or brackets (e.g. `,\s*}` or `,\s*]`)
  snippet = snippet.replace(/,\s*([}\]])/g, '$1');

  try {
    return JSON.parse(snippet);
  } catch (parseErr) {
    const err = new Error(`MALFORMED_JSON_RESPONSE: ${parseErr.message}`);
    err.name = 'MALFORMED_JSON_RESPONSE';
    err.code = 'MALFORMED_JSON_RESPONSE';
    err.snippet = snippet;
    err.cause = parseErr;
    throw err;
  }
}

/**
 * Cleans a single keyword candidate according to microstock rules
 *
 * @param {string} rawTag
 * @param {boolean} [isVecteezy=false]
 * @returns {string|null} Sanitized tag or null if discarded
 */
function cleanSingleKeyword(rawTag, isVecteezy = false) {
  if (!rawTag) return null;
  let tag = String(rawTag).toLowerCase().trim();

  // Strip all special characters and emojis, converting punctuation to spaces
  // Allows letters (all Unicode alphabets) and numbers
  tag = tag.replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

  // Minimum length check (must be at least 2 characters, e.g. "3d" concept)
  if (tag.length < 2) return null;

  // Word count check: single word or maximum 2 words (discard > 2 words)
  const words = tag.split(' ').filter(Boolean);
  if (words.length === 0 || words.length > 2) return null;

  // Trademark filtering (across all platforms)
  const isTrademark = BANNED_TRADEMARK_KEYWORDS.some(brand => {
    const pattern = new RegExp(`\\b${brand.replace('-', '[-\\s]')}\\b`, 'i');
    return pattern.test(tag);
  });
  if (isTrademark) return null;

  // General spammy terms filtering
  const isGeneralBanned = BANNED_GENERAL_KEYWORDS.some(banned => {
    const pattern = new RegExp(`\\b${banned}\\b`, 'i');
    return pattern.test(tag);
  });
  if (isGeneralBanned) return null;

  // Vecteezy-specific filetype/format filtering
  if (isVecteezy) {
    const isFileType = BANNED_FILETYPE_KEYWORDS.some(ft => {
      const pattern = new RegExp(`\\b${ft}\\b`, 'i');
      return pattern.test(tag);
    });
    if (isFileType) return null;
  }

  return tag;
}

/**
 * Sanitizes, deduplicates, and clamps microstock keywords
 *
 * @param {string[]|string} rawKeywords - Array of keywords or comma-separated string
 * @param {Object} [options]
 * @param {number} [options.targetCount=50] - Desired keyword count
 * @param {string[]|string} [options.customKeywords=[]] - User custom keywords to prioritize at Index 0
 * @param {string} [options.platformId='default'] - Platform identifier for quota clamping
 * @returns {string[]} Sanitized keywords array
 */
export function sanitizeKeywords(rawKeywords, {
  targetCount = 50,
  customKeywords = [],
  platformId = 'default'
} = {}) {
  const normPlatform = String(platformId || 'default').toLowerCase();
  const isVecteezy = normPlatform === 'vecteezy';

  // 1. Normalize custom keywords
  const customList = Array.isArray(customKeywords)
    ? customKeywords
    : typeof customKeywords === 'string'
      ? customKeywords.split(',')
      : [];

  const cleanedCustom = [];
  for (const item of customList) {
    const cleaned = cleanSingleKeyword(item, isVecteezy);
    if (cleaned) cleanedCustom.push(cleaned);
  }

  // 2. Normalize raw keywords
  const rawList = Array.isArray(rawKeywords)
    ? rawKeywords
    : typeof rawKeywords === 'string'
      ? rawKeywords.split(',')
      : [];

  const cleanedRaw = [];
  for (const item of rawList) {
    const cleaned = cleanSingleKeyword(item, isVecteezy);
    if (cleaned) cleanedRaw.push(cleaned);
  }

  // 3. Assemble with custom keywords at Index 0 and deduplicate case-insensitively preserving order
  const seen = new Set();
  const uniqueKeywords = [];

  for (const tag of [...cleanedCustom, ...cleanedRaw]) {
    if (!seen.has(tag)) {
      seen.add(tag);
      uniqueKeywords.push(tag);
    }
  }

  // 4. Platform Limit Clamping
  let effectiveLimit = targetCount;
  if (normPlatform in PLATFORM_KEYWORD_LIMITS && normPlatform !== 'default') {
    effectiveLimit = Math.min(targetCount, PLATFORM_KEYWORD_LIMITS[normPlatform]);
  }

  return uniqueKeywords.slice(0, effectiveLimit);
}

/**
 * Clamps text to maxLimit using sentence boundary or word boundary without mid-word cuts,
 * ensuring mandatory trailing period.
 *
 * @param {string} text - Clean text with collapsed spaces
 * @param {number} maxLimit - Maximum character limit
 * @returns {string} Clamped string ending with period
 */
function smartClamp(text, maxLimit) {
  if (!text) return '';

  // If already within limit with trailing period
  if (text.endsWith('.')) {
    if (text.length <= maxLimit) return text;
  } else {
    if (text.length + 1 <= maxLimit) return text + '.';
  }

  // Sentence Boundary Cut:
  // If the text contains multiple sentences delimited by ". " and the first sentence fits
  if (text.includes('. ')) {
    const firstDotSpace = text.indexOf('. ');
    const firstSentence = text.slice(0, firstDotSpace + 1).trim();

    if (firstSentence.length <= maxLimit) {
      let bestSentence = firstSentence;
      let nextIdx = text.indexOf('. ', firstDotSpace + 2);
      while (nextIdx !== -1) {
        const candidate = text.slice(0, nextIdx + 1).trim();
        if (candidate.length <= maxLimit) {
          bestSentence = candidate;
          nextIdx = text.indexOf('. ', nextIdx + 2);
        } else {
          break;
        }
      }
      return bestSentence;
    }
  }

  // Word Boundary Cut:
  // Cut at the last full word before the limit, remove trailing punctuation, and append period
  const avail = maxLimit - 1; // 1 character reserved for trailing period
  let candidate = text.slice(0, avail);
  const lastSpace = candidate.lastIndexOf(' ');

  if (lastSpace !== -1) {
    candidate = candidate.slice(0, lastSpace);
  }

  candidate = candidate.replace(/[\s,.:\-]+$/, '');
  return candidate + '.';
}

/**
 * Sanitizes title according to microstock rules and platform bounds
 *
 * @param {string} rawTitle - Raw title string
 * @param {string} [platformId='default'] - Platform identifier
 * @returns {string} Clean title ending with a period
 */
export function sanitizeTitle(rawTitle, platformId = 'default') {
  if (!rawTitle) return '';
  const normPlatform = String(platformId || 'default').toLowerCase();
  const maxLimit = PLATFORM_TITLE_LIMITS[normPlatform] ?? PLATFORM_TITLE_LIMITS.default;

  // Strip all special characters EXCEPT commas (,) and hyphens/dashes (-) and periods (.)
  // Disallow: _!?:;@#$%^&*()[]{}"'~+= and backticks
  let clean = String(rawTitle)
    .replace(/[^\p{L}\p{N}\s,.\-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) return '';
  return smartClamp(clean, maxLimit);
}

/**
 * Sanitizes description, normalizes editorial prefixes, and enforces character bounds
 *
 * @param {string} rawDescription - Raw description string
 * @param {Object} [options]
 * @param {string} [options.platformId='default'] - Platform identifier
 * @param {string} [options.editorialPrefix=''] - Editorial caption prefix (e.g. for Shutterstock)
 * @returns {string} Clean description ending with a period
 */
export function sanitizeDescription(rawDescription, {
  platformId = 'default',
  editorialPrefix = ''
} = {}) {
  if (!rawDescription && !editorialPrefix) return '';
  const normPlatform = String(platformId || 'default').toLowerCase();

  // Strip all special characters EXCEPT hyphens (-), commas (,), colons (:), and periods (.)
  let clean = String(rawDescription || '')
    .replace(/[^\p{L}\p{N}\s,.\-:]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Shutterstock Editorial Prefix Normalization
  if (normPlatform === 'shutterstock' && editorialPrefix && String(editorialPrefix).trim()) {
    let cleanPrefix = String(editorialPrefix)
      .replace(/[^\p{L}\p{N}\s,.\-:]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanPrefix) {
      if (cleanPrefix.endsWith(':')) {
        cleanPrefix = cleanPrefix + ' ';
      } else {
        cleanPrefix = cleanPrefix + ': ';
      }

      // Avoid double-prefixing if description already starts with the prefix
      const core = cleanPrefix.slice(0, -2).trim().toLowerCase();
      if (clean.toLowerCase().startsWith(core)) {
        clean = clean.slice(core.length).replace(/^[:\s]+/, '');
      }
      clean = `${cleanPrefix}${clean}`;
    }
  }

  if (!clean) return '';
  return smartClamp(clean, DESCRIPTION_CHAR_LIMIT);
}

/**
 * Unified metadata sanitizer facade returning a clean, standardized metadata object
 *
 * @param {Object|string} rawMetadata - Raw metadata object or JSON string
 * @param {Object} [options]
 * @param {string} [options.platformId='default'] - Platform identifier
 * @param {number} [options.targetKeywordCount=50] - Target keyword quota
 * @param {string[]|string} [options.customKeywords=[]] - User custom keywords
 * @param {string} [options.editorialPrefix=''] - Editorial caption prefix
 * @returns {Object} Standardized sanitized metadata object
 */
export function sanitizeMetadata(rawMetadata, {
  platformId = 'default',
  targetKeywordCount = 50,
  customKeywords = [],
  editorialPrefix = ''
} = {}) {
  let raw = rawMetadata;
  if (typeof raw === 'string') {
    raw = extractAndParseJson(raw);
  } else if (!raw || typeof raw !== 'object') {
    raw = {};
  }

  const normPlatform = String(platformId || 'default').toLowerCase();
  const result = {};

  const usesDescription = ['shutterstock', 'depositphotos', 'dreamstime', 'default'].includes(normPlatform);
  const usesTitle = ['adobestock', 'dreamstime', 'vecteezy', 'freepik', 'miricanvas', 'default'].includes(normPlatform);

  if (usesTitle) {
    result.title = sanitizeTitle(raw.title || raw.description || '', normPlatform);
  }

  if (usesDescription) {
    result.description = sanitizeDescription(raw.description || raw.title || '', {
      platformId: normPlatform,
      editorialPrefix
    });
  }

  // Keywords
  result.keywords = sanitizeKeywords(raw.keywords, {
    targetCount: targetKeywordCount,
    customKeywords,
    platformId: normPlatform
  });

  // Category Preservation & Mapping
  if (normPlatform === 'adobestock') {
    const rawCat = raw.category || '';
    let categoryName = String(rawCat).trim();
    let categoryId = null;

    for (const [id, name] of Object.entries(PLATFORM_CATEGORIES.adobestock)) {
      if (name.toLowerCase() === categoryName.toLowerCase() || id === categoryName) {
        categoryName = name;
        categoryId = Number(id);
        break;
      }
    }

    result.category = categoryName;
    result.categoryId = categoryId;
  } else if (normPlatform === 'shutterstock') {
    result.category_1 = raw.category_1 || '';
    result.category_2 = raw.category_2 || '';
  } else if (normPlatform === 'dreamstime') {
    result.categories = Array.isArray(raw.categories) ? raw.categories : [];
  }

  return result;
}
