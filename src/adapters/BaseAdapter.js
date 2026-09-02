/**
 * BaseAdapter — Abstract Contract for Microstock Platform Adapters
 */
export class BaseAdapter {
  /**
   * Returns true if this adapter matches the current page URL.
   * @param {string} url 
   * @returns {boolean}
   */
  static isMatch(url) {
    throw new Error('BaseAdapter.isMatch() must be implemented.');
  }

  /**
   * Retrieves all asset cards in the contributor grid.
   * @returns {HTMLElement[]}
   */
  static getAssetCards() {
    return [];
  }

  /**
   * Returns the thumbnail image URL for an asset card.
   * @param {HTMLElement} cardElement 
   * @returns {string|null}
   */
  static getThumbnailUrl(cardElement) {
    return null;
  }

  /**
   * Selects an asset card in the batch view.
   * @param {HTMLElement} cardElement 
   */
  static selectCard(cardElement) {}

  /**
   * Clears existing keywords/tags before injecting new ones.
   */
  static clearKeywords() {}

  /**
   * Injects generated metadata into the platform's form fields.
   * @param {Object} metadata 
   * @returns {Promise<boolean>}
   */
  static async fillMetadata(metadata) {
    return false;
  }

  /**
   * Saves metadata draft for the current asset.
   * @returns {boolean}
   */
  static saveDraft() {
    return false;
  }

  /**
   * Submits selected asset(s) for moderation review.
   * @returns {boolean}
   */
  static submitForReview() {
    return false;
  }
}
