/**
 * BaseAdapter — Abstract Contract and Lifecycle Interface for Microstock Platform Adapters
 *
 * Defines the standardized interface for interacting with contributor dashboards across
 * Adobe Stock, Shutterstock, Dreamstime, Vecteezy, Freepik, Depositphotos, and MiriCanvas.
 */

import { sleep, randomDelay } from './utils/dom_helpers.js';

export class BaseAdapter {
  /**
   * Initializes the base adapter with platform identifiers.
   * @param {string} platformId - Unique platform identifier (e.g., 'adobestock', 'shutterstock').
   * @param {string} platformName - Human-readable platform name (e.g., 'Adobe Stock').
   */
  constructor(platformId, platformName) {
    this.platformId = platformId;
    this.platformName = platformName;
  }

  // =========================================================================
  // Abstract Methods (Must be implemented by platform subclasses)
  // =========================================================================

  /**
   * Evaluates whether the given URL matches this platform's contributor dashboard.
   * @param {string} url - Target URL to evaluate.
   * @returns {boolean} True if matching, false otherwise.
   */
  isMatch(url) {
    throw new Error('isMatch() must be implemented by subclass');
  }

  /**
   * Scans and retrieves all asset card elements currently present in the dashboard grid/queue.
   * @returns {HTMLElement[]} Array of asset card elements.
   */
  getAssetCards() {
    throw new Error('getAssetCards() must be implemented by subclass');
  }

  /**
   * Extracts the thumbnail image URL from an asset card element for AI Vision analysis.
   * @param {HTMLElement} cardElement - Asset card element.
   * @returns {string|null} Valid image URL or null if not found.
   */
  getThumbnailUrl(cardElement) {
    throw new Error('getThumbnailUrl() must be implemented by subclass');
  }

  /**
   * Clicks/activates an asset card in the batch view to reveal its metadata editor form.
   * @param {HTMLElement} cardElement - Asset card element to select.
   * @returns {Promise<void>|void}
   */
  selectCard(cardElement) {
    throw new Error('selectCard() must be implemented by subclass');
  }

  /**
   * Injects sanitized metadata (title, description, categories, keywords, releases, AI flags)
   * into platform form fields using single-string native value injection.
   *
   * @param {Object} metadata - Sanitized metadata payload.
   * @param {Object} [options={}] - Additional platform-specific options.
   * @returns {Promise<boolean>} True if injection succeeded, false otherwise.
   */
  async fillMetadata(metadata, options = {}) {
    throw new Error('fillMetadata() must be implemented by subclass');
  }

  // =========================================================================
  // Virtual Lifecycle Methods (Standard default behaviors, overridable)
  // =========================================================================

  /**
   * Waits for the asset editor form / sidebar to become interactive after card selection.
   * Subclasses can override to wait for platform-specific input selectors.
   *
   * @param {HTMLElement} [cardElement=null] - Selected asset card.
   * @param {number} [timeoutMs=4000] - Timeout in milliseconds.
   * @returns {Promise<boolean>} True if editor is ready, false if timeout.
   */
  async waitForEditorReady(cardElement = null, timeoutMs = 4000) {
    return true;
  }

  /**
   * Clears old pre-existing metadata fields (keywords, title, description) prior to injection.
   * Default implementation is a safe no-op.
   *
   * @returns {Promise<boolean>} True if cleared successfully.
   */
  async clearMetadata() {
    return true;
  }

  /**
   * Clears keywords/tags. Alias for clearMetadata compatibility.
   * @returns {Promise<boolean>}
   */
  async clearKeywords() {
    return this.clearMetadata();
  }

  /**
   * Saves draft changes for the currently selected asset.
   * Essential for platforms with transient state (e.g. Freepik).
   *
   * @returns {Promise<boolean>} True if saved successfully.
   */
  async saveDraft() {
    return true;
  }

  /**
   * Executes platform-specific bulk save trick (e.g. Select All -> Bulk Save).
   * Default implementation returns true.
   *
   * @returns {Promise<boolean>} True if bulk save executed.
   */
  async bulkSave() {
    return true;
  }

  /**
   * Submits selected asset(s) for final moderation review.
   * Default implementation safely returns false to prevent accidental user submissions.
   *
   * @returns {Promise<boolean>} True if submitted, false if omitted/cancelled.
   */
  async submitForReview() {
    return false;
  }

  // =========================================================================
  // Cooldown Helper
  // =========================================================================

  /**
   * Executes a randomized cooldown delay to simulate human typing/review pacing
   * and avoid microstock bot detection. Respects AbortSignal to cancel immediately.
   *
   * @param {number} [minMs=1000] - Minimum delay in milliseconds.
   * @param {number} [maxMs=5000] - Maximum delay in milliseconds.
   * @param {AbortSignal} [abortSignal=null] - Optional AbortSignal to cancel delay.
   * @returns {Promise<number>} Milliseconds delayed.
   */
  async executeCooldown(minMs = 1000, maxMs = 5000, abortSignal = null) {
    if (abortSignal?.aborted) {
      throw new Error('ABORTED');
    }

    const safeMin = Math.max(0, minMs);
    const safeMax = Math.max(safeMin, maxMs);
    const duration = Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;

    if (!abortSignal) {
      await sleep(duration);
      return duration;
    }

    await new Promise((resolve, reject) => {
      let timer = null;

      const onAbort = () => {
        if (timer) clearTimeout(timer);
        abortSignal.removeEventListener('abort', onAbort);
        reject(new Error('ABORTED'));
      };

      timer = setTimeout(() => {
        abortSignal.removeEventListener('abort', onAbort);
        resolve();
      }, duration);

      abortSignal.addEventListener('abort', onAbort);
    });

    if (abortSignal?.aborted) {
      throw new Error('ABORTED');
    }

    return duration;
  }
}
