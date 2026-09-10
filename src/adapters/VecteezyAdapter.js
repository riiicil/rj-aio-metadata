/**
 * VecteezyAdapter — Platform Adapter for Vecteezy Contributor
 *
 * Implements BaseAdapter interface for Vecteezy (contributors.vecteezy.com).
 * - URL matching for contributors.vecteezy.com.
 * - Pre-automation preparation: auto-collapses left filter sidebar & resets toolbar selection state.
 * - Card selection and thumbnail extraction from div[data-testid="resource-card"].
 * - Scopes all metadata editor queries strictly to right panel (div.right) to prevent collision with left filter sidebar.
 * - License radio selection (Pro, Free, Editorial).
 * - Category is 100% ignored (auto-detected from file format by Vecteezy).
 * - AI software selection (Midjourney, Stable Diffusion, DALL·E) or "Other" with custom software text input.
 * - Non-AI mode: explicitly unchecks ai_generated checkbox if active.
 * - Title single-string instant injection (max 200 characters) with X clear icon support.
 * - Keyword clearing (bulk ClearIcon or tag-remove svg icons) and comma-separated chip injection + Enter key simulation (max 50 tags).
 * - Prohibited terms warning modal dismiss guard (div[data-testid="prohibited-terms-modal"]).
 * - Bulk save strategy: "Deselect all" -> "Select all" -> "Save changes" icon button (data-testid="save-changes-icon").
 * - Full LoggerService integration across every interaction step.
 */

import { BaseAdapter } from './BaseAdapter.js';
import {
  setNativeValue,
  setNativeCheckbox,
  waitForElement,
  simulateClick,
  simulateEnterKey,
  extractThumbnailUrl,
  sleep
} from './utils/dom_helpers.js';
import { logger } from '../services/LoggerService.js';

export class VecteezyAdapter extends BaseAdapter {
  constructor() {
    super('vecteezy', 'Vecteezy');
    this.logger = logger;
  }

  /**
   * Matches Vecteezy contributor URLs.
   * @param {string} url - Target URL to evaluate.
   * @returns {boolean} True if matching, false otherwise.
   */
  isMatch(url) {
    if (typeof url !== 'string') return false;
    return url.includes('contributors.vecteezy.com');
  }

  /**
   * Pre-automation preparation hook executed once immediately after startAutomation()
   * and before beginning the sequential card processing loop.
   * 1. Closes the left filter sidebar (<aside>) if open.
   * 2. Checks if any asset cards are currently selected (toolbar button shows "Deselect all").
   *    If selected, clicks "Deselect all" to reset selection state before processing card 1.
   *    If toolbar button already shows "Select all", skips cleanly.
   *
   * @returns {Promise<boolean>} True if preparation succeeded.
   */
  async prepareAutomation() {
    if (typeof document === 'undefined') return true;

    try {
      // 1. Close filter sidebar if open
      const filterAside = document.querySelector('aside');
      const isFilterOpen = Boolean(
        filterAside && (
          filterAside.querySelector('div[data-testid="filters-sort-panel"]') ||
          filterAside.querySelector('div[data-testid="filters-category-panel"]') ||
          filterAside.textContent?.includes('Filters')
        )
      );

      if (isFilterOpen) {
        this.logger.info('Vecteezy: Filter sidebar is open, closing it');
        const collapseBtn = filterAside.querySelector(
          'div.sc-gvWNLk button, button[data-testid="button"]'
        ) || Array.from(filterAside.querySelectorAll('button')).find(
          (b) => b.querySelector('svg')
        );

        if (collapseBtn) {
          simulateClick(collapseBtn);
          await sleep(500);
        }
      } else {
        this.logger.info('Vecteezy: Filter sidebar is already closed');
      }

      // 2. Deselect all cards if any are currently selected
      const filterBar = document.querySelector('div[data-testid="filter-bar"]');
      const getToolbarButtons = () => Array.from(
        (filterBar || document).querySelectorAll('button[data-testid="button"], button')
      );
      const deselectBtn = getToolbarButtons().find(
        (b) => b.textContent && b.textContent.trim().toLowerCase().includes('deselect all')
      );

      if (deselectBtn) {
        this.logger.info('Vecteezy: Assets are currently selected, clicking "Deselect all"');
        simulateClick(deselectBtn);
        await sleep(500);
      } else {
        this.logger.info('Vecteezy: No assets currently selected ("Select all" state), proceeding directly');
      }
    } catch (err) {
      this.logger.warn('Vecteezy: Pre-automation preparation warning:', err.message);
    }

    return true;
  }

  /**
   * Resolves the right-hand metadata editor sidebar container.
   * Scopes strictly to MuiGrid-grid-xs-3 (.right) and guards against colliding
   * with the 9-column asset grid container (which also carries class "right").
   *
   * @returns {HTMLElement|Document} Right-hand editor form container or document fallback.
   */
  getEditorForm() {
    if (typeof document === 'undefined') return null;

    // 1. Target the 3-column grid container specifically (right-hand sidebar)
    const panel = document.querySelector('div.MuiGrid-grid-xs-3.right, div.MuiGrid-grid-xs-3, .MuiGrid-grid-xs-3');
    if (panel) return panel;

    // 2. Target via the "Files selected" header
    const header = Array.from(document.querySelectorAll('h6')).find(
      (h) => h.textContent && h.textContent.toLowerCase().includes('files selected')
    );
    if (header) {
      const container = header.closest('div.right') ||
        header.closest('div[class*="MuiGrid-grid-xs-3"]') ||
        header.closest('div.MuiGrid-item');
      if (container) return container;
    }

    // 3. Fallback: if multiple div.right exist on page, the editor sidebar is the last one (xs-9 is first, xs-3 is last)
    const rightDivs = document.querySelectorAll('div.right');
    if (rightDivs.length > 1) {
      return rightDivs[rightDivs.length - 1];
    }

    return rightDivs[0] || document;
  }

  /**
   * Scans and retrieves all resource cards in the batch list.
   * @returns {HTMLElement[]} Array of resource card elements.
   */
  getAssetCards() {
    if (typeof document === 'undefined') return [];
    return Array.from(document.querySelectorAll('div[data-testid="resource-card"], div.sc-dhNZpn'));
  }

  /**
   * Extracts the thumbnail image URL from a resource card.
   * @param {HTMLElement} cardElement - Asset card element.
   * @returns {string|null} Image URL or null.
   */
  getThumbnailUrl(cardElement) {
    if (!cardElement) return null;
    const img = cardElement.querySelector?.(
      'div[data-testid="resource-card-preview"] img, div[data-testid="resource-card"] img, img'
    );
    return extractThumbnailUrl(img || cardElement);
  }

  /**
   * Selects a resource card in the grid to open its sidebar editor.
   * If card is already selected (carries 'is-selected' class), skips click to avoid toggling off.
   * Targets the card's <img> directly, which reliably triggers Vecteezy's selection handler.
   *
   * @param {HTMLElement} cardElement - Card element to select.
   */
  selectCard(cardElement) {
    if (!cardElement) return;

    // Guard: Do not click if already selected (clicking toggles selection off!)
    if (cardElement.classList?.contains('is-selected')) {
      this.logger.info('Vecteezy: Asset card is already selected');
      return;
    }

    this.logger.step('Vecteezy: Selecting asset card');

    // Prioritize direct <img> element as proven in user recordings
    const clickTarget = cardElement.querySelector?.('img') ||
      cardElement.querySelector?.('div.sc-dkYedM img') ||
      cardElement.querySelector?.('div[data-testid="resource-card-preview"]') ||
      cardElement;

    simulateClick(clickTarget);
  }

  /**
   * Waits for the editor sidebar to become interactive.
   * Requires that an asset is actively selected (header shows "(N) Files selected"
   * and NOT "No Files selected", or card has "is-selected" class) and title input is ready.
   *
   * @param {HTMLElement} [cardElement=null] - Selected asset card.
   * @param {number} [timeoutMs=4000] - Timeout in milliseconds.
   * @returns {Promise<boolean>} True if ready, false on timeout.
   */
  async waitForEditorReady(cardElement = null, timeoutMs = 4000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const editorForm = this.getEditorForm() || document;
      const header = editorForm.querySelector('h6');
      const headerText = header?.textContent?.trim().toLowerCase() || '';

      const isCardSelected = Boolean(cardElement?.classList?.contains('is-selected'));
      const hasFilesSelected = Boolean(
        headerText && !headerText.includes('no files') && headerText.includes('files selected')
      );

      const titleInput = editorForm.querySelector('input#title-input');
      const isReady = (hasFilesSelected || isCardSelected) && Boolean(titleInput);

      if (isReady) {
        return true;
      }

      // If not yet selected and > 800ms elapsed, retry clicking the card's img
      if (cardElement && Date.now() - startTime > 800 && !isCardSelected && !hasFilesSelected) {
        this.logger.info('Vecteezy: Retrying card click to activate editor form');
        const img = cardElement.querySelector?.('img') || cardElement;
        simulateClick(img);
        await sleep(300);
      }

      await sleep(150);
    }

    // Final fallback check
    const editorForm = this.getEditorForm() || document;
    return Boolean(editorForm.querySelector('input#title-input'));
  }

  /**
   * Clears old metadata fields (title, keywords) prior to new injection.
   * Uses clear X button on title field and clear X button on keywords section.
   * @returns {Promise<boolean>} True if cleared.
   */
  async clearMetadata() {
    if (typeof document === 'undefined') return true;
    this.logger.step('Vecteezy: Checking and clearing existing title and keywords');

    const editorForm = this.getEditorForm() || document;

    // 1. Clear title using X button on field if present
    const titleInput = editorForm.querySelector('input#title-input');
    const titleClearIcon = editorForm.querySelector(
      'input#title-input ~ svg, input#title-input + svg, div[data-testid="text-input"]:has(input#title-input) svg[position="end"], div[data-testid="text-input"] svg[position="end"]'
    );

    if (titleClearIcon && titleInput && titleInput.value) {
      this.logger.info('Vecteezy: Clicking title clear X icon');
      simulateClick(titleClearIcon);
      await sleep(150);
    } else if (titleInput && titleInput.value) {
      this.logger.info('Vecteezy: Clearing title input via native value');
      setNativeValue(titleInput, '');
      await sleep(100);
    }

    // 2. Clear keywords using X button on keywords section
    await this.clearKeywords();

    return true;
  }

  /**
   * Clears active keyword chips.
   * Targets data-testid="ClearIcon" on keywords section and any remaining tag remove icons.
   * @returns {Promise<boolean>} True if cleared.
   */
  async clearKeywords() {
    if (typeof document === 'undefined') return true;

    const editorForm = this.getEditorForm() || document;

    // 1. Try the bulk ClearIcon in the keywords section
    const keywordClearIcon = editorForm.querySelector(
      'div[data-testid="tagger-input"] ~ div svg[data-testid="ClearIcon"], div.sc-irCEUn svg[data-testid="ClearIcon"], svg[data-testid="ClearIcon"]'
    );

    if (keywordClearIcon) {
      this.logger.info('Vecteezy: Clicking keywords ClearIcon to clear all tags');
      simulateClick(keywordClearIcon);
      await sleep(200);
    }

    // 2. Secondary sweep: remove any individual tag chips or error tags that remain
    const removeIcons = Array.from(editorForm.querySelectorAll(
      'svg[data-testid="tag-remove"], div[data-testid="tag"] svg, div[data-testid="tag"] polygon'
    ));
    if (removeIcons.length > 0) {
      this.logger.info(`Vecteezy: Removing ${removeIcons.length} remaining keyword tags`);
      for (const icon of removeIcons) {
        simulateClick(icon);
      }
      await sleep(150);
    }

    // 3. Clear any residual text in tagger input
    const taggerInput = editorForm.querySelector(
      'div[data-testid="tagger-input"] input, input[placeholder*="keyword"]'
    );
    if (taggerInput && taggerInput.value) {
      setNativeValue(taggerInput, '');
    }

    return true;
  }

  /**
   * Dismisses prohibited terms warning modal if present.
   * @returns {boolean} True if modal was detected and dismissed.
   */
  dismissProhibitedModal() {
    if (typeof document === 'undefined') return false;

    const modal = document.querySelector('div[data-testid="prohibited-terms-modal"]');
    if (modal) {
      const dismissBtn = modal.querySelector('div[data-testid="modal-actions"] button, button') ||
        document.querySelector('div[data-testid="modal-actions"] button') ||
        Array.from(document.querySelectorAll('button')).find(
          (b) => b.textContent && b.textContent.includes('Close')
        );

      if (dismissBtn) {
        this.logger.info('Vecteezy: Dismissing prohibited terms modal');
        simulateClick(dismissBtn);
        return true;
      }
    }

    return false;
  }

  /**
   * Injects sanitized metadata into Vecteezy sidebar editor.
   * Scopes all queries strictly to the right editor form (MuiGrid-grid-xs-3).
   * - License radio selection (Pro, Free, Editorial).
   * - Category: 100% ignored (auto-detected from file format by Vecteezy).
   * - AI declaration & software selection (Midjourney, Stable Diffusion, DALL·E) or "Other" with custom text input.
   * - Non-AI mode: explicitly unchecks ai_generated checkbox if active.
   * - Title single-string injection (max 200 characters) after clearing old title with X button.
   * - Keyword sequential injection (one tag at a time with Enter/comma) to avoid single-string comma errors.
   * - Prohibited terms modal dismiss guard.
   *
   * @param {Object} metadata - Sanitized metadata payload.
   * @param {Object} [options={}] - Options (licenseType, isAiGenerated, aiSoftware, customAiSoftware, etc.).
   * @returns {Promise<boolean>} True if injection succeeded.
   */
  async fillMetadata(metadata, options = {}) {
    if (typeof document === 'undefined' || !metadata) return false;

    // Scope queries strictly to the right metadata editor form (MuiGrid-grid-xs-3)
    const editorForm = this.getEditorForm() || document;

    // 1. Prohibited terms modal dismiss guard (check upfront)
    this.dismissProhibitedModal();

    this.logger.step('Vecteezy: Injecting metadata into editor form');

    // 2. License Selection Radio (Pro, Free, Editorial)
    const rawLicense = options.licenseType || options.license || metadata.licenseType || 'free';
    const normLicense = String(rawLicense).trim().toLowerCase();

    let targetLicenseVal = 'free';
    if (normLicense === 'pro') targetLicenseVal = 'pro';
    else if (normLicense === 'editorial') targetLicenseVal = 'editorial';

    // Target radio input strictly inside editorForm's radio group
    const licenseRadio = editorForm.querySelector(
      `div[data-testid="radio-group"] input[value="${targetLicenseVal}"]`
    ) || Array.from(editorForm.querySelectorAll('label[data-testid="radio-input"]')).find(
      (lbl) => lbl.textContent && lbl.textContent.trim().toLowerCase().includes(normLicense)
    )?.querySelector('input[type="radio"]');

    if (licenseRadio) {
      this.logger.step('License', targetLicenseVal.toUpperCase());
      if (!licenseRadio.checked) {
        const clickTarget = licenseRadio.closest?.('label') || licenseRadio;
        simulateClick(clickTarget);
        licenseRadio.checked = true;
        await sleep(200);
      }
    } else {
      this.logger.warn(`Vecteezy: License radio for "${targetLicenseVal}" not found in editor form`);
    }

    // 3. Category: Strictly ignored (Vecteezy auto-detects category from uploaded file format)

    // 4. Generative AI Declaration & Software Selection
    const isAi = Boolean(options.isAiGenerated ?? metadata.isAiGenerated);
    const aiSection = editorForm.querySelector('div[data-testid="ai-generated-section"]') ||
      Array.from(editorForm.querySelectorAll('div')).find((el) => el.textContent && el.textContent.includes('AI-Generated'));

    const aiCheckbox = aiSection?.querySelector(
      'input[type="checkbox"], input[value="ai_generated"], input.PrivateSwitchBase-input'
    );

    if (aiCheckbox || aiSection) {
      // Check MUI wrapper classes, software dropdown, and input.checked for robust state detection
      const isSectionChecked = () => Boolean(
        aiSection?.querySelector('.Mui-checked') ||
        aiSection?.querySelector('.checkbox-checked') ||
        aiSection?.querySelector('div[data-testid="ai-software-dropdown"]') ||
        aiCheckbox?.checked
      );

      const isCurrentlyChecked = isSectionChecked();

      // Target MUST be the native input element directly (not the wrapper span)
      const toggleTarget = aiCheckbox || aiSection?.querySelector(
        'input[type="checkbox"], input[value="ai_generated"], input.PrivateSwitchBase-input'
      ) || aiSection?.querySelector('span[data-testid="checkbox-no-label"]');

      if (isAi && !isCurrentlyChecked) {
        this.logger.step('Generative AI', 'Checked');
        if (toggleTarget) {
          simulateClick(toggleTarget);
        }
        await sleep(300);

        // Resilient fallback: If still unchecked, use native checkbox setter directly on the input element
        if (!isSectionChecked() && aiCheckbox) {
          this.logger.info('Vecteezy: Using native checkbox setter to check AI declaration');
          setNativeCheckbox(aiCheckbox, true);
          await sleep(300);
        }
      } else if (!isAi && isCurrentlyChecked) {
        this.logger.step('Generative AI', 'Unchecked');
        if (toggleTarget) {
          simulateClick(toggleTarget);
        }
        await sleep(300);

        // Resilient fallback: If still checked, use native checkbox setter directly on the input element
        if (isSectionChecked() && aiCheckbox) {
          this.logger.info('Vecteezy: Using native checkbox setter to uncheck AI declaration');
          setNativeCheckbox(aiCheckbox, false);
          await sleep(300);
        }
      }

      if (isAi) {
        const software = options.aiSoftware || metadata.aiSoftware || 'Midjourney';
        const customTool = options.customAiSoftware || metadata.customAiSoftware || '';
        const normSoftware = String(software).trim().toLowerCase();

        this.logger.step('AI Software', software);

        // Open MUI Select dropdown trigger inside ai-generated-section
        const dropdownTrigger = editorForm.querySelector(
          'div[data-testid="ai-software-dropdown"] div[role="button"], div[data-testid="ai-software-dropdown"], div[data-testid="ai-generated-section"] div[role="button"], div[data-testid="ai-generated-section"] div.MuiSelect-select'
        );
        if (dropdownTrigger) {
          simulateClick(dropdownTrigger);
          await sleep(200);
        }

        const isOther = normSoftware === 'other' || Boolean(customTool) ||
          (!normSoftware.includes('midjourney') && !normSoftware.includes('stable') && !normSoftware.includes('dall'));

        if (!isOther) {
          // Standard generator selection: midjourney, stable_diffusion, dall_e
          let targetDataVal = 'midjourney';
          if (normSoftware.includes('stable')) {
            targetDataVal = 'stable_diffusion';
          } else if (normSoftware.includes('dall')) {
            targetDataVal = 'dall_e';
          }

          const optionEl = document.querySelector(`li[data-value="${targetDataVal}"]`) ||
            Array.from(document.querySelectorAll('li.MuiMenuItem-root, ul[role="listbox"] li, li')).find(
              (li) => li.textContent && li.textContent.trim().toLowerCase().includes(normSoftware)
            );

          if (optionEl) {
            simulateClick(optionEl);
            await sleep(200);
          }
        } else {
          // "Other" workflow: select "other" option then inject custom software name
          const otherOption = document.querySelector('li[data-value="other"]') ||
            Array.from(document.querySelectorAll('li.MuiMenuItem-root, ul[role="listbox"] li, li')).find(
              (li) => li.textContent && li.textContent.trim().toLowerCase().includes('other')
            );

          if (otherOption) {
            simulateClick(otherOption);
            await sleep(200);
          }

          const customSoftwareName = customTool || (normSoftware === 'other' ? '' : software) || 'Custom AI';
          if (customSoftwareName) {
            this.logger.step('Custom Software', customSoftwareName);
            const customInput = document.querySelector(
              'div[data-testid="other-text-input"] input, div.MuiPopover-paper input#undefined-input, div.MuiPopover-paper input[type="text"]'
            ) || editorForm.querySelector(
              'div[data-testid="ai-generated-section"] input#undefined-input, div[data-testid="ai-generated-section"] input[type="text"], div[data-testid="ai-generated-section"] input[required]'
            );
            if (customInput) {
              setNativeValue(customInput, customSoftwareName);
              await sleep(100);
            }
          }
        }
      }
    }

    // 5. Clear old title & keywords before injecting new ones
    await this.clearMetadata();
    await sleep(150);

    // 6. Title (Single-string instant injection, clamped to max 200 characters)
    if (metadata.title) {
      const titleInput = editorForm.querySelector('input#title-input');
      if (titleInput) {
        const cleanTitle = String(metadata.title).slice(0, 200);
        this.logger.step('Title', cleanTitle);
        setNativeValue(titleInput, cleanTitle);
        await sleep(100);
      } else {
        this.logger.warn('Vecteezy: Title input (input#title-input) not found in editor form');
      }
    }

    // 7. Keywords (Sequential chip injection clamped to max 50 tags + Enter/Comma key per tag)
    if (metadata.keywords && Array.isArray(metadata.keywords) && metadata.keywords.length > 0) {
      const taggerInput = editorForm.querySelector(
        'div[data-testid="tagger-input"] input, input[placeholder*="keyword"]'
      );
      if (taggerInput) {
        const tags = metadata.keywords.slice(0, 50);
        this.logger.step('Keywords', `Injecting ${tags.length} tags sequentially`);

        for (let i = 0; i < tags.length; i++) {
          const rawTag = String(tags[i]).trim().replace(/,/g, '');
          if (!rawTag) continue;

          setNativeValue(taggerInput, rawTag);
          await sleep(15);
          simulateEnterKey(taggerInput);

          // Also dispatch comma key event for robust tagger chip triggering
          const commaInit = { key: ',', code: 'Comma', keyCode: 188, which: 188, bubbles: true, cancelable: true };
          const createEv = (type) => {
            if (typeof KeyboardEvent !== 'undefined') {
              try { return new KeyboardEvent(type, commaInit); } catch {}
            }
            if (typeof Event !== 'undefined') {
              const ev = new Event(type, { bubbles: true, cancelable: true });
              Object.assign(ev, commaInit);
              return ev;
            }
            return { type, ...commaInit };
          };
          taggerInput.dispatchEvent(createEv('keydown'));
          taggerInput.dispatchEvent(createEv('keyup'));

          await sleep(25);
        }

        this.logger.step('Keywords', `${tags.length} tags injected`);
      } else {
        this.logger.warn('Vecteezy: Keywords tagger input not found in editor form');
      }
    }

    // 8. Dismiss prohibited terms modal if triggered by title/keyword content
    await sleep(50);
    this.dismissProhibitedModal();

    return true;
  }

  /**
   * Bulk save strategy for Vecteezy:
   * 1. Clicks "Deselect all" button if present.
   * 2. Waits 200ms.
   * 3. Clicks "Select all" button.
   * 4. Waits 200ms.
   * 5. Clicks "Save changes" icon button (data-testid="save-changes-icon").
   * 6. Waits 500ms.
   * 7. Clicks "Deselect all" button to finish.
   *
   * @returns {Promise<boolean>} True if bulk save triggered.
   */
  async bulkSave() {
    if (typeof document === 'undefined') return true;
    this.logger.step('Vecteezy: Initiating bulk save');

    const filterBar = document.querySelector('div[data-testid="filter-bar"]');
    const getButtons = () => Array.from((filterBar || document).querySelectorAll('button[data-testid="button"], button'));

    // 1. Click "Deselect all" if present
    const deselectBtn = getButtons().find(
      (b) => b.textContent && b.textContent.trim().toLowerCase().includes('deselect all')
    );
    if (deselectBtn) {
      this.logger.info('Vecteezy: Bulk save clicking "Deselect all"');
      simulateClick(deselectBtn);
      await sleep(200);
    }

    // 2. Click "Select all"
    const selectAllBtn = getButtons().find(
      (b) => b.textContent &&
             !b.textContent.trim().toLowerCase().includes('deselect') &&
             b.textContent.trim().toLowerCase().includes('select all')
    );
    if (selectAllBtn) {
      this.logger.info('Vecteezy: Bulk save clicking "Select all"');
      simulateClick(selectAllBtn);
      await sleep(300);
    }

    // 3. Click "Save changes"
    const saveIcon = document.querySelector(
      'div[data-testid="save-changes-icon"], button[data-testid="save-changes-icon"], [data-testid="save-changes-icon"]'
    );
    if (saveIcon) {
      this.logger.info('Vecteezy: Clicking "Save changes" icon');
      simulateClick(saveIcon);
      await sleep(500);
    }

    // 4. Clean up: click "Deselect all"
    const finalDeselectBtn = getButtons().find(
      (b) => b.textContent && b.textContent.trim().toLowerCase().includes('deselect all')
    );
    if (finalDeselectBtn) {
      this.logger.info('Vecteezy: Bulk save final clicking "Deselect all"');
      simulateClick(finalDeselectBtn);
      await sleep(200);
    }

    this.logger.success('Vecteezy: Bulk save completed');
    return true;
  }

  /**
   * Saves draft changes for currently selected asset.
   * @returns {Promise<boolean>} True if save clicked.
   */
  async saveDraft() {
    if (typeof document === 'undefined') return true;
    const saveIcon = document.querySelector(
      'div[data-testid="save-changes-icon"], button[data-testid="save-changes-icon"], [data-testid="save-changes-icon"]'
    );
    if (saveIcon) {
      simulateClick(saveIcon);
      return true;
    }
    return false;
  }

  /**
   * Submits selected assets for moderation review.
   * @returns {Promise<boolean>} True if submit clicked.
   */
  async submitForReview() {
    if (typeof document === 'undefined') return false;
    this.logger.step('Vecteezy: Submitting assets for review');
    const submitBtn = document.querySelector('button[data-testid="submit-button"]') ||
      Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('Submit')
      );

    if (submitBtn && !submitBtn.disabled) {
      simulateClick(submitBtn);
      this.logger.success('Vecteezy: Assets submitted for review');
      return true;
    }

    return false;
  }
}
