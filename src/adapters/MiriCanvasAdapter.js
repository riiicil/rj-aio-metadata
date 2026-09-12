/**
 * MiriCanvasAdapter — Platform Adapter for MiriCanvas DesignHub
 *
 * Implements BaseAdapter interface for MiriCanvas (designhub.miricanvas.com):
 * - URL matching for designhub.miricanvas.com.
 * - Element card extraction from batch grid (article[data-f="CA-d943"], ul > li > article, article.er317d30, article.css-3q5rav).
 * - Thumbnail extraction (img.css-l67sxu.er317d31, div[data-f="DT-1ecb"] img, img).
 * - Pre-automation preparation:
 *   1. Check left navigation sidebar: if open, collapse via button[data-f="SB-82b8"].
 *   2. Navbar select all checkbox (CI-66e5): reset selection state (if unchecked: check -> uncheck; if checked: uncheck).
 * - Card selection: clicks thumbnail/card body to open right inspector panel.
 * - Editor readiness wait (textarea[data-f="DT-9450"], textarea[placeholder*="Element Name"], div[data-f="SD-e6c2"]).
 * - Title clearing via trash button (div[data-f="SD-e6c2"] button[data-f="TT-c273"]) and single-string injection clamped <= 100 chars.
 * - Keywords clearing via trash button (div[data-f="SD-e7b2"] button[data-f="TT-c273"]) and tag entry clamped <= 25 tags.
 * - Content Tier (Pricing) selection: STANDARD (Free) vs PREMIUM (Paid).
 * - AI Generated Declaration: checkbox toggle in AI image generator container (div[data-f="AD-8705"] span[data-f="CC-bb45"][role="checkbox"]).
 * - Bulk Save Strategy:
 *   1. Select all elements via navbar checkbox (input[data-f="CI-66e5"]).
 *   2. Click Save Metadata button (button[data-f="SG-8f01"]).
 *   3. Wait for save confirmation (button disabled or toast section[data-f="SL-2fb0"]).
 *   4. Uncheck navbar select all checkbox to restore clean state.
 * - Submit for review: clicks Submit button.
 */

import { BaseAdapter } from './BaseAdapter.js';
import {
  setNativeValue,
  waitForElement,
  simulateClick,
  simulateEnterKey,
  extractThumbnailUrl,
  sleep
} from './utils/dom_helpers.js';
import { logger } from '../services/LoggerService.js';

export class MiriCanvasAdapter extends BaseAdapter {
  constructor() {
    super('miricanvas', 'MiriCanvas');
    this.logger = logger;
  }

  /**
   * Matches MiriCanvas DesignHub URLs.
   * @param {string} url - Target URL to evaluate.
   * @returns {boolean} True if matching, false otherwise.
   */
  isMatch(url) {
    if (typeof url !== 'string') return false;
    return url.includes('designhub.miricanvas.com');
  }

  /**
   * Performs pre-automation initialization:
   * 1. Checks left navigation sidebar: collapses if open via button[data-f="SB-82b8"].
   * 2. Resets navbar Select All checkbox (input[data-f="CI-66e5"]):
   *    if unchecked: checks then unchecks to flush active grid selection;
   *    if checked: unchecks.
   * @returns {Promise<void>}
   */
  async prepareAutomation() {
    if (typeof document === 'undefined') return;

    (this.logger || logger).banner('MiriCanvas: Initializing automation pre-flight checks...');

    // 1. Check left navigation sidebar
    try {
      const navDrawer = document.querySelector('nav[data-f="MN-02f2"], nav.panda-cAaCsB');
      const isSidebarOpen = navDrawer && (
        navDrawer.classList?.contains('panda-mVcIL') ||
        (typeof navDrawer.offsetWidth === 'number' && navDrawer.offsetWidth > 100)
      );

      if (isSidebarOpen) {
        (this.logger || logger).step('sidebar', 'Left sidebar is open. Collapsing sidebar...');
        const sidebarToggle = document.querySelector('button[data-f="SB-82b8"], header button');
        if (sidebarToggle) {
          simulateClick(sidebarToggle);
          await sleep(300);
        }
      }
    } catch (err) {
      (this.logger || logger).warn('Failed to check/collapse sidebar:', err);
    }

    // 2. Reset navbar Select All checkbox state
    try {
      const selectAllCheckbox = document.querySelector(
        'nav[data-f="CT-a2b2"] input[data-f="CI-66e5"], nav input[type="checkbox"][data-f="CI-66e5"], nav input[type="checkbox"]'
      );

      if (selectAllCheckbox) {
        if (!selectAllCheckbox.checked) {
          (this.logger || logger).step('Select All', 'Resetting navbar Select All checkbox (check -> uncheck)...');
          simulateClick(selectAllCheckbox);
          await sleep(150);
          simulateClick(selectAllCheckbox);
          await sleep(150);
        } else {
          (this.logger || logger).step('Select All', 'Navbar Select All checkbox is already checked. Unchecking...');
          simulateClick(selectAllCheckbox);
          await sleep(150);
        }
      }
    } catch (err) {
      (this.logger || logger).warn('Failed to toggle initial navbar Select All checkbox:', err);
    }

    (this.logger || logger).success('MiriCanvas pre-flight checks completed');
  }

  /**
   * Scans and retrieves all element cards in the grid.
   * Prioritizes top-level article elements to avoid duplicate child containers.
   * @returns {HTMLElement[]} Array of element card containers.
   */
  getAssetCards() {
    if (typeof document === 'undefined') return [];
    const articles = Array.from(
      document.querySelectorAll(
        'article[data-f="CA-d943"], ul > li > article, article.er317d30, article.css-3q5rav, article'
      )
    );
    if (articles.length > 0) return articles;

    return Array.from(
      document.querySelectorAll('div.css-1qnaji9.e1pyeb4g3, div.css-1qnaji9')
    );
  }

  /**
   * Extracts the thumbnail image URL from an element card.
   * @param {HTMLElement} cardElement - Element card container.
   * @returns {string|null} Image URL or null.
   */
  getThumbnailUrl(cardElement) {
    if (!cardElement) return null;
    const img = cardElement.querySelector?.(
      'img.css-l67sxu.er317d31, div[data-f="DT-1ecb"] img, img.css-l67sxu, div.panda-ehlNbj img, img'
    );
    return extractThumbnailUrl(img || cardElement);
  }

  /**
   * Selects an element card in the grid to open the sidebar editor.
   * Scrolls into view and clicks the thumbnail image (avoids clicking the card checkbox).
   * @param {HTMLElement} cardElement - Element card to select.
   */
  selectCard(cardElement) {
    if (!cardElement) return;
    try {
      cardElement.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    } catch {
      // Ignore scroll errors in mock environments
    }
    const clickTarget =
      cardElement.querySelector?.('img.css-l67sxu.er317d31, img, div[data-f="DT-1ecb"], .er317d31') || cardElement;
    simulateClick(clickTarget);
  }

  /**
   * Waits for the sidebar editor form to become interactive.
   * @param {HTMLElement} [cardElement=null] - Selected element card.
   * @param {number} [timeoutMs=4000] - Timeout in milliseconds.
   * @returns {Promise<boolean>} True if ready, false on timeout.
   */
  async waitForEditorReady(cardElement = null, timeoutMs = 4000) {
    try {
      await waitForElement(
        'textarea[data-f="DT-9450"], textarea[placeholder*="Element Name"], textarea[placeholder*="Multiple names"], div[data-f="SD-e6c2"]',
        typeof document !== 'undefined' ? document : null,
        timeoutMs
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clears old metadata fields (title textarea and keyword chips) prior to injection.
   * Uses trash buttons as mandated by platform design.
   * @returns {Promise<boolean>} True if cleared.
   */
  async clearMetadata() {
    if (typeof document === 'undefined') return true;

    await this.clearTitle();
    await this.clearKeywords();

    await sleep(60);
    return true;
  }

  /**
   * Clears the title field using the trash button if present.
   * @returns {Promise<boolean>}
   */
  async clearTitle() {
    if (typeof document === 'undefined') return true;

    const titleSection = document.querySelector('div[data-f="SD-e6c2"]');
    const titleInput = document.querySelector(
      'div[data-f="SD-e6c2"] textarea, textarea[data-f="DT-9450"], textarea[placeholder*="Element Name"], textarea[placeholder*="Multiple names"]'
    );

    const trashBtn = titleSection?.querySelector('button[data-f="TT-c273"]') ||
      document.querySelector('div[data-f="FA-93a1"] button, div[data-f="SD-e6c2"] button');

    if (trashBtn && !trashBtn.disabled) {
      (this.logger || logger).step('title', 'Clearing pre-existing title via trash button...');
      simulateClick(trashBtn);
      await sleep(80);
    }

    if (titleInput && titleInput.value) {
      setNativeValue(titleInput, '');
    }

    return true;
  }

  /**
   * Clears existing keyword chips using the section trash button or individual remove icons.
   * @returns {Promise<boolean>}
   */
  async clearKeywords() {
    if (typeof document === 'undefined') return true;

    const kwSection = document.querySelector('div[data-f="SD-e7b2"]');
    const trashBtn = kwSection?.querySelector('button[data-f="TT-c273"]') ||
      document.querySelector('div[data-f="IA-61ae"] button, div[data-f="SD-e7b2"] button');

    if (trashBtn && !trashBtn.disabled) {
      (this.logger || logger).step('keywords', 'Clearing pre-existing keywords via trash button...');
      simulateClick(trashBtn);
      await sleep(100);
    }

    // Fallback: click individual chip delete icons if any remain
    const remainingRemoveSvgs = Array.from(
      document.querySelectorAll(
        'span[data-f="CL-67aa"] svg[data-f="CD-213b"], span[data-f="CL-67aa"] svg, div.panda-ebDdrq svg'
      )
    );

    for (const btn of remainingRemoveSvgs) {
      simulateClick(btn);
    }

    return true;
  }

  /**
   * Injects sanitized metadata into MiriCanvas sidebar editor.
   * - AI Generated Declaration: checkbox toggle.
   * - Content Tier: Standard (STANDARD) vs Premium (PREMIUM).
   * - Element Name (Title): single-string instant injection clamped <= 100 chars.
   * - Keywords: comma-separated injection clamped <= 25 tags max + Enter key simulation.
   *
   * @param {Object} metadata - Sanitized metadata payload.
   * @param {Object} [options={}] - Options (contentTier, isAiGenerated, licenseType, contentType, clearExisting).
   * @returns {Promise<boolean>} True if injection succeeded.
   */
  async fillMetadata(metadata, options = {}) {
    if (typeof document === 'undefined' || !metadata) return false;

    if (options.clearExisting !== false) {
      await this.clearMetadata();
    }

    // 1. AI Generated Content Checkbox Toggle
    try {
      const aiContainer = document.querySelector('div[data-f="AD-8705"]') ||
        Array.from(document.querySelectorAll('div, label')).find(
          (el) => el.textContent && el.textContent.includes('AI image generator')
        );

      if (aiContainer) {
        const checkboxSpan = aiContainer.querySelector(
          'span[data-f="CC-bb45"][role="checkbox"], span[role="checkbox"]'
        );
        const checkboxInput = aiContainer.querySelector('input[type="checkbox"]');

        const isCurrentlyChecked = checkboxSpan
          ? checkboxSpan.getAttribute('aria-checked') === 'true'
          : Boolean(checkboxInput?.checked);

        const shouldBeChecked = Boolean(options.isAiGenerated);
        if (isCurrentlyChecked !== shouldBeChecked) {
          (this.logger || logger).step(
            'AI declaration',
            `Setting AI declaration to ${shouldBeChecked ? 'checked' : 'unchecked'}...`
          );
          simulateClick(checkboxSpan || checkboxInput);
          await sleep(120);
        }
      }
    } catch (err) {
      (this.logger || logger).warn('Failed to set AI generated checkbox:', err);
    }

    // 2. Content Tier (Pricing) Radio Selection
    try {
      const wantPremium = options.contentTier === 'PREMIUM' ||
        options.licenseType === 'paid' ||
        options.isPremium === true;
      const targetTier = wantPremium ? 'PREMIUM' : 'STANDARD';

      const tierRadio =
        document.querySelector(`input[name="contentTier"][value="${targetTier}"]`) ||
        Array.from(document.querySelectorAll('label')).find(
          (l) => l.textContent && l.textContent.toLowerCase().includes(wantPremium ? 'premium' : 'standard')
        )?.querySelector('input');

      if (tierRadio && !tierRadio.checked) {
        (this.logger || logger).step('Content Tier', `Setting Content Tier to ${targetTier}...`);
        simulateClick(tierRadio);
        await sleep(100);
      }
    } catch (err) {
      (this.logger || logger).warn('Failed to set Content Tier:', err);
    }

    // 3. Content Type Radio Selection (Optional)
    if (options.contentType) {
      try {
        const typeRadio = document.querySelector(
          `input[name="contentType"][value="${options.contentType}"]`
        );
        if (typeRadio && !typeRadio.checked) {
          simulateClick(typeRadio);
          await sleep(100);
        }
      } catch (err) {
        (this.logger || logger).warn('Failed to set content type:', err);
      }
    }

    // 4. Element Name (Title): Clamped to <= 100 characters
    if (metadata.title) {
      const nameTextarea = document.querySelector(
        'div[data-f="SD-e6c2"] textarea, textarea[data-f="DT-9450"], textarea[placeholder*="Element Name"], textarea[placeholder*="Multiple names"], textarea.panda-eDQUvt'
      );
      if (nameTextarea) {
        const clampedTitle = String(metadata.title).trim().slice(0, 100);
        (this.logger || logger).step('title', `Injecting Title (${clampedTitle.length} chars): "${clampedTitle.slice(0, 40)}..."`);
        setNativeValue(nameTextarea, clampedTitle);
        await sleep(100);
      }
    }

    // 5. Keywords: Clamped to <= 25 tags max, entered and committed via sequential Enter/Comma events
    if (metadata.keywords && metadata.keywords.length > 0) {
      const kwInput = document.querySelector(
        'div[data-f="SD-e7b2"] input, input[data-f="II-b5a4"], input[placeholder*="Separate multiple keywords"], input.panda-eNrFAg'
      );
      if (kwInput) {
        const rawKeywords = Array.isArray(metadata.keywords)
          ? metadata.keywords
          : String(metadata.keywords).split(',');

        const cleanTags = rawKeywords
          .map((k) => (typeof k === 'string' ? k.trim() : ''))
          .filter((k) => k.length > 0)
          .slice(0, 25);

        (this.logger || logger).step('keywords', `Injecting ${cleanTags.length} keywords...`);

        // A. Fast-path: Attempt clipboard paste event with comma-separated tags
        try {
          if (typeof ClipboardEvent !== 'undefined' && typeof DataTransfer !== 'undefined') {
            const dt = new DataTransfer();
            dt.setData('text/plain', cleanTags.join(', '));
            const pasteEvt = new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              clipboardData: dt
            });
            kwInput.dispatchEvent(pasteEvt);
            await sleep(50);
          }
        } catch {
          // Ignore clipboard errors in restricted browser contexts
        }

        // B. Sequential Tag Entry: Type each tag and simulate Enter + Comma key events
        for (const tag of cleanTags) {
          if (typeof kwInput.focus === 'function') {
            kwInput.focus();
          }

          setNativeValue(kwInput, tag);
          kwInput.dispatchEvent(new Event('input', { bubbles: true }));

          // Simulate Enter key sequence (keydown -> change -> keyup)
          const enterKd = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          });
          kwInput.dispatchEvent(enterKd);

          kwInput.dispatchEvent(new Event('change', { bubbles: true }));

          const enterKu = new KeyboardEvent('keyup', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          });
          kwInput.dispatchEvent(enterKu);

          // Fallback: If tag was not cleared by Enter, simulate Comma key sequence
          if (kwInput.value) {
            setNativeValue(kwInput, tag + ',');
            kwInput.dispatchEvent(new Event('input', { bubbles: true }));

            const commaKd = new KeyboardEvent('keydown', {
              key: ',',
              code: 'Comma',
              keyCode: 188,
              which: 188,
              bubbles: true,
              cancelable: true
            });
            kwInput.dispatchEvent(commaKd);

            kwInput.dispatchEvent(new Event('change', { bubbles: true }));

            const commaKu = new KeyboardEvent('keyup', {
              key: ',',
              code: 'Comma',
              keyCode: 188,
              which: 188,
              bubbles: true,
              cancelable: true
            });
            kwInput.dispatchEvent(commaKu);
          }

          await sleep(35);
        }

        // C. Clean up leftover text in input if any
        if (kwInput.value && !document.querySelector?.('span[data-f="CL-67aa"]')) {
          // Fallback for mock environments where React state is absent
          simulateEnterKey(kwInput);
        } else if (kwInput.value) {
          setNativeValue(kwInput, '');
        }

        if (typeof kwInput.blur === 'function') {
          kwInput.blur();
        }
        await sleep(60);
      }
    }

    return true;
  }

  /**
   * Bulk Save Strategy:
   * 1. Checks navbar Select All checkbox (CI-66e5).
   * 2. Clicks Save Metadata button (SG-8f01).
   * 3. Waits until Save Metadata button becomes disabled or toast notification appears.
   * 4. Unchecks navbar Select All checkbox to restore clean state.
   *
   * @returns {Promise<boolean>} True if bulk save executed successfully.
   */
  async bulkSave() {
    if (typeof document === 'undefined') return false;

    (this.logger || logger).banner('MiriCanvas: Initiating bulk save...');

    // 1. Check top navbar "Select all" checkbox
    const selectAllCheckbox = document.querySelector(
      'nav[data-f="CT-a2b2"] input[data-f="CI-66e5"], nav input[type="checkbox"][data-f="CI-66e5"], nav div.panda-cVAOOe input[type="checkbox"], nav input[type="checkbox"]'
    );

    if (selectAllCheckbox && !selectAllCheckbox.checked) {
      (this.logger || logger).step('bulkSave', 'Checking navbar Select All checkbox...');
      simulateClick(selectAllCheckbox);
      await sleep(250);
    }

    // 2. Click "Save Metadata" button
    const saveBtn =
      document.querySelector('button[data-f="SG-8f01"]') ||
      Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('Save Metadata')
      ) ||
      document.querySelector('button.panda-YJgQP');

    if (!saveBtn) {
      (this.logger || logger).warn('Save Metadata button not found');
      return false;
    }

    (this.logger || logger).step('bulkSave', 'Clicking Save Metadata button...');
    simulateClick(saveBtn);

    // 3. Wait until button becomes disabled or toast notification appears (max 6000ms)
    const startTime = Date.now();
    while (Date.now() - startTime < 6000) {
      await sleep(200);
      const toast = document.querySelector(
        'section[data-f="SL-2fb0"], div[role="alert"], section.panda-HgOzd'
      );
      if (saveBtn.disabled || toast) {
        break;
      }
    }

    await sleep(200);

    // 4. Uncheck navbar Select All checkbox to restore clean unselected state
    if (selectAllCheckbox && selectAllCheckbox.checked) {
      (this.logger || logger).step('bulkSave', 'Unchecking navbar Select All checkbox...');
      simulateClick(selectAllCheckbox);
      await sleep(150);
    }

    (this.logger || logger).success('MiriCanvas bulk save completed');
    return true;
  }

  /**
   * Saves draft metadata changes.
   * @returns {Promise<boolean>} True if saved.
   */
  async saveDraft() {
    return this.bulkSave();
  }

  /**
   * Submits selected elements for moderation review.
   * @returns {Promise<boolean>} True if submitted.
   */
  async submitForReview() {
    if (typeof document === 'undefined') return false;

    const submitBtn =
      Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && (b.textContent.trim() === 'Submit' || b.textContent.includes('Submit'))
      ) || document.querySelector('button.panda-YJgQP');

    if (submitBtn && !submitBtn.disabled) {
      (this.logger || logger).step('submit', 'Clicking Submit button...');
      simulateClick(submitBtn);
      return true;
    }
    return false;
  }
}
