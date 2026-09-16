/**
 * RJ AIO Metadata Extension — Automation Batch Orchestrator
 * Encapsulates the multi-platform automation execution loop, per-card metadata injection,
 * Dreamstime carousel workflows, bulk saving, and graceful stop coordination.
 * Reference: ADR-002, ADR-007
 */

import { getAdapterForUrl, getAdapterForPlatform } from '../adapters/index.js';
import { generateMetadata } from '../services/AiService.js';
import { sleep } from '../adapters/utils/dom_helpers.js';
import { logger } from '../services/LoggerService.js';
import { pillSpinnerSvg, pillReadySvg } from './overlay.js';

export class AutomationOrchestrator {
  /**
   * @param {import('./overlay.js').OverlayHUD} hud
   */
  constructor(hud) {
    this.hud = hud;
    this.abortController = null;
    this.isCardProcessing = false;
  }

  /**
   * Checks if the orchestrator is currently executing automation.
   * @returns {boolean}
   */
  get isRunning() {
    return Boolean(this.hud?.isAutomationRunning);
  }

  /**
   * Checks if the orchestrator is in the graceful stop phase.
   * @returns {boolean}
   */
  get isStopping() {
    return Boolean(this.hud?.isStopping);
  }

  /**
   * Checks if the orchestrator is processing cards or in active execution.
   * @returns {boolean}
   */
  get isProcessing() {
    return Boolean(this.hud?.isAutomationRunning || this.isCardProcessing);
  }

  /**
   * Updates rj_automation_state in chrome.storage.local with tabId and platformId scoping.
   * @param {Object} patch
   */
  _setAutomationState(patch) {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({
        rj_automation_state: {
          isRunning: Boolean(patch.isRunning),
          isStopping: Boolean(patch.isStopping),
          status: patch.status || 'idle',
          platformId: this.hud?.platformId || null,
          tabId: this.hud?.tabId || null,
          progressText: patch.progressText || '',
          timestamp: Date.now()
        }
      });
    }
  }

  /**
   * Main automation entry point.
   * Executes provider verification, card scanning, batch loop iteration, and bulk saving.
   * @returns {Promise<void>}
   */
  async start() {
    if (this.hud.isAutomationRunning || this.hud.isStopping) return;

    // 1. Resolve active platform adapter
    const currentUrl = typeof window !== 'undefined' ? window.location?.href : '';
    let adapter = getAdapterForUrl(currentUrl);
    if (!adapter && this.hud.platformId && this.hud.platformId !== 'unknown') {
      adapter = getAdapterForPlatform(this.hud.platformId);
    }
    if (adapter && (!this.hud.platformId || this.hud.platformId === 'unknown')) {
      this.hud.platformId = adapter.platformId;
    }

    if (!adapter) {
      logger.warn('No platform adapter matched for URL:', currentUrl);
      this.hud.setStatusBadge('Unsupported Page');
      return;
    }

    // 2. Validate active provider credentials
    if (!this.hud.currentConfig) {
      await this.hud.syncFromStorage();
    }
    if (!this.hud.isProviderReady(this.hud.currentConfig)) {
      logger.warn('AI Provider is not ready. Configure in popup first.');
      this.hud.setStatusBadge('Setup Model');
      return;
    }

    // 3. Initialize AbortController
    this.abortController = new AbortController();
    this.hud.abortController = this.abortController;
    const signal = this.abortController.signal;

    // 4. Update HUD UI state to Running
    this.hud.isAutomationRunning = true;
    this.hud.isStopping = false;
    this.hud.updateAutomationUI(true);

    this._setAutomationState({ isRunning: true, isStopping: false, status: 'running' });

    const progressFill = this.hud.shadow?.querySelector('#rjProgressFill');
    const countText = this.hud.shadow?.querySelector('#rjAssetCountText');
    const pillStatus = this.hud.shadow?.querySelector('#rjPillStatus');
    const badge = this.hud.shadow?.querySelector('#rjAutomationBadge');

    const setStatusBadge = (text, tooltip = text) => {
      this.hud.setStatusBadge(text, tooltip);
    };

    try {
      // 5. Query asset cards on the page
      const rawCards = adapter.getAssetCards();
      const cards = Array.isArray(rawCards) ? rawCards : (rawCards ? Array.from(rawCards) : []);
      const total = cards.length;

      if (total === 0) {
        this.hud.isStopping = false;
        this.hud.isAutomationRunning = false;
        this.hud.updateAutomationUI(false);
        if (countText) countText.textContent = '0 Assets Detected';
        setStatusBadge('0 Assets Detected');
        this._setAutomationState({ isRunning: false, isStopping: false, status: 'idle' });
        return;
      }

      logger.banner(`Automation started on ${this.hud.platformId} with ${total} assets`);

      // Pre-automation initialization (e.g. deselecting header select-all checkboxes)
      if (typeof adapter.prepareAutomation === 'function') {
        await adapter.prepareAutomation();
        if (signal.aborted || this.hud.isStopping) return;
        await sleep(300);
      }

      this.hud.isStopping = false;
      this.hud.isCardProcessing = false;
      this.isCardProcessing = false;
      let processedCount = 0;

      // 6A. Dreamstime In-Page Carousel Loop
      if (this.hud.platformId === 'dreamstime') {
        let assetIdx = 0;
        while (!signal.aborted && !this.hud.isStopping) {
          const currentCards = adapter.getAssetCards();
          const card = currentCards && currentCards.length > 0 ? currentCards[0] : null;
          if (!card) break;

          const currentId = adapter.getCurrentAssetId();
          const progressStr = currentId ? `#${currentId}` : `Asset ${assetIdx + 1}`;
          if (countText) countText.textContent = `Asset ${assetIdx + 1}${currentId ? ` (ID ${currentId})` : ''}`;
          setStatusBadge(this.hud.isStopping ? 'Stopping...' : 'Processing...');
          if (pillStatus) {
            pillStatus.innerHTML = `${pillSpinnerSvg}<span>Asset ${assetIdx + 1}</span>`;
            pillStatus.title = `Processing Asset ${assetIdx + 1}`;
          }
          if (this.hud.updateHudSupportProgress) {
            this.hud.updateHudSupportProgress(progressStr);
          }
          this._setAutomationState({
            isRunning: true,
            isStopping: Boolean(this.hud.isStopping),
            status: this.hud.isStopping ? 'stopping' : 'running',
            progressText: progressStr
          });

          logger.asset(assetIdx + 1, 'Carousel');

          this.hud.isCardProcessing = true;
          this.isCardProcessing = true;
          try {
            // Step 1: Wait for Editor Ready
            await adapter.waitForEditorReady(card, 4000);
            if (signal.aborted) break;
            await sleep(300);

            // Step 2: Extract preview thumbnail
            const thumb = adapter.getThumbnailUrl(card);

            // Step 3: AI Metadata Generation
            setStatusBadge(this.hud.isStopping ? 'Stopping...' : 'Generating...', this.hud.isStopping ? 'Stopping automation (saving work)...' : 'Generating AI metadata...');

            let keywordCount = Number(this.hud.shadow?.querySelector('#rjInputKeywordCount')?.value) || 70;
            const specificKeywordsRaw = this.hud.shadow?.querySelector('#rjInputSpecificKeywords')?.value || '';
            const customKeywords = specificKeywordsRaw.split(',').map(s => s.trim()).filter(Boolean);
            const isAiGenerated = Boolean(this.hud.shadow?.querySelector('#rjToggleAiDeclaration')?.checked);
            const language = this.hud.currentConfig?.platformSettings?.dreamstime?.language || 'en';

            const sanitizedData = await generateMetadata({
              image: thumb,
              platformId: 'dreamstime',
              assetType: 'image',
              targetKeywordCount: keywordCount,
              customKeywords,
              isAiGenerated,
              editorialPrefix: '',
              language,
              assetIndex: assetIdx,
              providerConfig: this.hud.currentConfig
            });

            if (signal.aborted) break;
            await sleep(400);

            // Step 4: Inject sanitized metadata
            setStatusBadge(this.hud.isStopping ? 'Stopping...' : 'Injecting...', this.hud.isStopping ? 'Stopping automation (saving work)...' : 'Injecting metadata...');

            const platformSettings = this.hud.currentConfig?.platformSettings?.dreamstime || {};
            const isEditorial = Boolean(platformSettings.isEditorial);
            const platformOptions = {
              ...platformSettings,
              isAiGenerated,
              isEditorial,
              language
            };

            await adapter.fillMetadata(sanitizedData, platformOptions);
            processedCount++;

            // Step 5: Save edits (waits for toast appear & disappear)
            setStatusBadge('Saving...', 'Saving edits...');
            await adapter.saveDraft();

            // Step 6: If Mode B (submit_direct), submit for review
            if (platformSettings.mode === 'submit_direct') {
              setStatusBadge('Submitting...', 'Submitting file for review...');
              await adapter.submitForReview(isEditorial);
            }

            logger.success(`Completed asset ${assetIdx + 1}${currentId ? ` (ID: ${currentId})` : ''}`);
          } catch (assetErr) {
            if (signal.aborted || assetErr?.message === 'ABORTED') break;
            logger.warn(`Error processing asset ${assetIdx + 1}:`, assetErr);
          } finally {
            this.hud.isCardProcessing = false;
            this.isCardProcessing = false;
          }

          if (signal.aborted || this.hud.isStopping) break;

          // Step 7: Navigate to Next Asset
          setStatusBadge('Next asset...');
          const navResult = await adapter.navigateToNext();
          if (navResult?.done) {
            break;
          }

          assetIdx++;
          await sleep(500);
        }

        if (this.hud.isStopping || signal.aborted) {
          logger.banner('Dreamstime automation stopped.');
          this.hud.isStopping = false;
          this.hud.isAutomationRunning = false;
          this.hud.updateAutomationUI(false);
          this.hud.updateHudSupportProgress?.('');
          setStatusBadge('Stopped');
          this._setAutomationState({ isRunning: false, isStopping: false, status: 'idle', progressText: '' });
        } else {
          logger.success(`Dreamstime automation finished ${processedCount} assets.`);
          if (progressFill) progressFill.style.width = '100%';
          if (countText) countText.textContent = `Finished ${processedCount} assets`;
          this.hud.lastCompletedAssetLabel = `Finished ${processedCount} assets`;
          if (badge) badge.classList.remove('rj-running');
          setStatusBadge('Completed');
          if (pillStatus) {
            pillStatus.innerHTML = `${pillReadySvg}<span>Finished</span>`;
            pillStatus.title = 'Automation completed';
          }

          const finishWait = this.hud._completionWait ?? 3000;
          await sleep(finishWait);
          this.hud.isStopping = false;
          this.hud.isAutomationRunning = false;
          this.hud.updateAutomationUI(false);
          this.hud.updateHudSupportProgress?.('');
          this._setAutomationState({ isRunning: false, isStopping: false, status: 'idle', progressText: '' });
        }

        return;
      }

      // 6B. Standard Microstock Grid Loop (Adobe Stock, Shutterstock, Freepik, Vecteezy, Depositphotos, MiriCanvas)
      for (let i = 0; i < total; i++) {
        if (signal.aborted || this.hud.isStopping) break;

        const card = cards[i];

        // Update HUD progress
        const pct = Math.round((i / total) * 100);
        const progressStr = `${i + 1}/${total} (${pct}%)`;
        if (progressFill) progressFill.style.width = `${pct}%`;
        if (countText) countText.textContent = `Asset ${i + 1} of ${total}`;
        setStatusBadge(this.hud.isStopping ? 'Stopping...' : 'Processing...');
        if (pillStatus) {
          pillStatus.innerHTML = `${pillSpinnerSvg}<span>${progressStr}</span>`;
          pillStatus.title = `Processing ${i + 1} of ${total} (${pct}%)`;
        }
        if (this.hud.updateHudSupportProgress) {
          this.hud.updateHudSupportProgress(progressStr);
        }
        this._setAutomationState({
          isRunning: true,
          isStopping: Boolean(this.hud.isStopping),
          status: this.hud.isStopping ? 'stopping' : 'running',
          progressText: progressStr
        });

        logger.asset(i + 1, total);

        this.hud.isCardProcessing = true;
        this.isCardProcessing = true;
        try {
          // Step 1: Select Card
          await adapter.selectCard(card);
          if (signal.aborted) break;
          await sleep(600);

          // Step 2: Wait for Editor Ready
          const isEditorReady = await adapter.waitForEditorReady(card, 4000);
          if (signal.aborted) break;
          if (!isEditorReady && this.hud.platformId === 'miricanvas') {
            logger.warn(`Editor not ready for asset ${i + 1}, retrying card selection...`);
            await adapter.selectCard(card);
            await adapter.waitForEditorReady(card, 2000);
          }
          await sleep(300);

          // Step 3: Extract preview thumbnail
          const thumb = adapter.getThumbnailUrl(card);

          // Step 4: AI Metadata Generation
          setStatusBadge(this.hud.isStopping ? 'Stopping...' : 'Generating...', this.hud.isStopping ? 'Stopping automation (saving work)...' : 'Generating AI metadata...');

          let keywordCount = Number(this.hud.shadow?.querySelector('#rjInputKeywordCount')?.value) || 50;
          const specificKeywordsRaw = this.hud.shadow?.querySelector('#rjInputSpecificKeywords')?.value || '';
          const customKeywords = specificKeywordsRaw.split(',').map(s => s.trim()).filter(Boolean);
          const isAiGenerated = (this.hud.platformId !== 'shutterstock' && this.hud.platformId !== 'depositphotos')
            ? Boolean(this.hud.shadow?.querySelector('#rjToggleAiDeclaration')?.checked)
            : false;
          if (this.hud.platformId === 'freepik' && isAiGenerated) {
            keywordCount = Math.min(keywordCount, 49);
          }
          const isShutterstockEditorial = this.hud.platformId === 'shutterstock' && Boolean(this.hud.currentConfig?.platformSettings?.shutterstock?.isEditorial);
          const editorialPrefix = isShutterstockEditorial ? (this.hud.currentConfig?.platformSettings?.shutterstock?.editorialPrefix || '') : '';
          const language = this.hud.currentConfig?.platformSettings?.[this.hud.platformId]?.language || 'en';
          const isVideo = this.hud.platformId === 'shutterstock' && typeof window !== 'undefined' && window.location?.pathname?.includes('/video');
          const assetType = isVideo ? 'video' : 'image';

          const sanitizedData = await generateMetadata({
            image: thumb,
            platformId: this.hud.platformId,
            assetType,
            targetKeywordCount: keywordCount,
            customKeywords,
            isAiGenerated,
            editorialPrefix,
            language,
            assetIndex: i,
            providerConfig: this.hud.currentConfig
          });

          if (signal.aborted) break;
          await sleep(500);

          // Step 5: Inject sanitized metadata
          setStatusBadge(this.hud.isStopping ? 'Stopping...' : 'Injecting...', this.hud.isStopping ? 'Stopping automation (saving work)...' : 'Injecting metadata...');

          const platformSettings = this.hud.currentConfig?.platformSettings?.[this.hud.platformId] || {};
          const platformOptions = {
            ...platformSettings,
            isAiGenerated,
            language
          };

          await adapter.fillMetadata(sanitizedData, platformOptions, card);
          processedCount++;

          // Step 6: Per-item save (for Freepik)
          if (this.hud.platformId === 'freepik') {
            await adapter.saveDraft();
          }

          logger.success(`Completed asset ${i + 1} of ${total}`);
        } catch (assetErr) {
          if (signal.aborted || assetErr?.message === 'ABORTED') {
            break;
          }
          if (total === 1) {
            throw assetErr;
          }
          logger.warn(`Error processing asset ${i + 1}/${total}:`, assetErr);
        } finally {
          this.hud.isCardProcessing = false;
          this.isCardProcessing = false;
        }

        // Platform-specific card cooldown
        if (i < total - 1 && !signal.aborted && !this.hud.isStopping) {
          const cooldown = (this.hud._cooldownMin !== undefined)
            ? this.hud._cooldownMin
            : (this.hud.platformId === 'miricanvas' ? 1200 : (this.hud.platformId === 'adobestock' ? 800 : 500));
          setStatusBadge('Cooldown...');
          await sleep(cooldown);
        }
      }

      // Step 7: Post-loop Bulk Save (Triggered on completion or graceful stop)
      if (typeof adapter.bulkSave === 'function' && processedCount > 0) {
        const saveLabel = 'Saving...';
        const saveTooltip = this.hud.isStopping ? 'Stopping automation (saving work)...' : `Saving all assets (${processedCount} processed)...`;
        logger.banner(
          `${this.hud.isStopping ? 'Stop requested. Triggering bulk save' : 'All assets processed. Triggering bulk save'} for ${this.hud.platformId} (${processedCount} processed assets)...`
        );
        setStatusBadge(saveLabel, saveTooltip);
        await sleep(1000);
        await adapter.bulkSave();
        await sleep(1000);
      }

      if (this.hud.isStopping || signal.aborted) {
        logger.banner('Automation gracefully saved and stopped.');
        this.hud.isStopping = false;
        this.hud.isAutomationRunning = false;
        this.hud.updateAutomationUI(false);
        this.hud.updateHudSupportProgress?.('');
        setStatusBadge('Stopped');
        this._setAutomationState({ isRunning: false, isStopping: false, status: 'idle', progressText: '' });
      } else {
        logger.success('Automation completed successfully!');

        // Completion status
        if (progressFill) progressFill.style.width = '100%';
        if (countText) countText.textContent = `Finished ${total} assets`;
        this.hud.lastCompletedAssetLabel = `Finished ${total} assets`;
        if (badge) badge.classList.remove('rj-running');
        setStatusBadge('Completed');
        if (pillStatus) {
          pillStatus.innerHTML = `${pillReadySvg}<span>Finished</span>`;
          pillStatus.title = 'Automation completed';
        }

        const finishWait = this.hud._completionWait ?? 3000;
        await sleep(finishWait);
        this.hud.isStopping = false;
        this.hud.isAutomationRunning = false;
        this.hud.updateAutomationUI(false);
        this.hud.updateHudSupportProgress?.('');
        this._setAutomationState({ isRunning: false, isStopping: false, status: 'idle', progressText: '' });
      }
    } catch (err) {
      this.hud.isStopping = false;
      this.hud.isAutomationRunning = false;
      this.hud.updateAutomationUI(false);
      this.hud.updateHudSupportProgress?.('');
      this._setAutomationState({ isRunning: false, isStopping: false, status: 'idle', progressText: '' });
      if (err.message === 'ABORTED' || signal.aborted) {
        logger.info('Automation stopped.');
        setStatusBadge('Stopped');
      } else {
        logger.error('Automation error:', err);
        const fullErr = 'Error: ' + (err.message || 'Failed');
        const conciseErr = (err.message && err.message.toLowerCase().includes('api')) ? 'API Error' : 'Failed';
        setStatusBadge(conciseErr, fullErr);
      }
    } finally {
      this.hud.isStopping = false;
      this.hud.isCardProcessing = false;
      this.isCardProcessing = false;
      this.abortController = null;
      this.hud.abortController = null;
      this.hud.isAutomationRunning = false;
      this._setAutomationState({ isRunning: false, isStopping: false, status: 'idle' });
    }
  }

  /**
   * Stops automation gracefully with saving, or force aborts if clicked again.
   * @param {boolean} [force=false]
   */
  stop(force = false) {
    if (!this.hud.isAutomationRunning && !this.hud.isStopping) {
      this.hud.updateAutomationUI(false);
      return;
    }

    if (this.hud.isStopping && !force) {
      return; // Already in graceful stopping process; button is disabled to prevent double-clicks
    }

    if (force) {
      logger.warn('Force stop requested. Aborting immediately...');
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
      this.hud.abortController = null;
      this.hud.isStopping = false;
      this.hud.isCardProcessing = false;
      this.isCardProcessing = false;
      this.hud.isAutomationRunning = false;
      this.hud.updateAutomationUI(false);
      this.hud.setStatusBadge('Stopped');
      this._setAutomationState({ isRunning: false, isStopping: false, status: 'idle' });
    } else {
      this.hud.isStopping = true;
      this.hud.isAutomationRunning = true;
      const btn = this.hud.shadow?.querySelector('#rjBtnToggleAutomation');
      const btnText = this.hud.shadow?.querySelector('#rjAutomationBtnText');

      if (btn) {
        btn.classList.remove('rj-btn-start', 'rj-btn-stop', 'rj-btn-accent');
        btn.classList.add('rj-btn-stopping', 'rj-btn-disabled');
        btn.disabled = true;
        btn.title = 'Stopping automation (saving work)...';
      }
      if (btnText) btnText.textContent = 'Stopping...';
      this.hud.setStatusBadge('Stopping...');

      const badge = this.hud.shadow?.querySelector('#rjAutomationBadge');
      if (badge) {
        badge.classList.add('rj-running');
      }
      const pillStatus = this.hud.shadow?.querySelector('#rjPillStatus');
      if (pillStatus) {
        pillStatus.innerHTML = `${pillSpinnerSvg}<span>Stopping...</span>`;
        pillStatus.title = 'Stopping automation (saving work)...';
      }
      logger.warn('Stop requested. Waiting for active card to finish then saving work...');
      this._setAutomationState({ isRunning: true, isStopping: true, status: 'stopping' });
    }
  }
}
