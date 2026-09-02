/**
 * SanitizerService — Prohibited Terms & Formatting Sanitizer
 */
export class SanitizerService {
  static PROHIBITED_WORDS = ['vector', 'isolated', 'photo', 'video', 'footage', 'clipart', 'image', 'background'];

  static sanitizeTitle(title) {
    return (title || '').trim().replace(/[<>"{}]/g, '');
  }

  static sanitizeKeywords(keywords, bannedList = SanitizerService.PROHIBITED_WORDS) {
    const bannedSet = new Set(bannedList.map(w => w.toLowerCase()));
    return (Array.isArray(keywords) ? keywords : (keywords || '').split(','))
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 1 && !bannedSet.has(k));
  }
}
