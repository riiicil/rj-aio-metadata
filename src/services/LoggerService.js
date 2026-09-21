/**
 * LoggerService — Centralized Logging Engine for RJ AIO Metadata
 *
 * Provides unified, beautifully formatted console logging with consistent styling,
 * brand color tokens, and extensible log sinks across all platform adapters and UI components.
 * Strictly compliant with Zero Native Emoji policy.
 */

export class LoggerService {
  /**
   * @param {string} [prefix='[RJ AIO Metadata]'] - Default log namespace prefix.
   */
  constructor(prefix = '[RJ AIO Metadata]') {
    this.prefix = prefix;
    this.enabled = true;
    this.colors = {
      brand: '#57c1ff',    // Cyan accent
      step: '#079183',     // Emerald teal action
      success: '#59d499',  // Precision green
      warn: '#e5a93c',     // Amber warning
      error: '#ff5555',    // Coral error
      dim: '#8a99a8'       // Muted gray
    };
  }

  /**
   * Sets whether console output is active.
   * @param {boolean} isEnabled
   */
  setEnabled(isEnabled) {
    this.enabled = Boolean(isEnabled);
  }

  /**
   * Logs an announcement or banner with bold brand styling.
   * @param {string} message - Banner text.
   * @param {...any} args - Additional arguments.
   */
  banner(message, ...args) {
    if (!this.enabled) return;
    console.log(
      `%c${this.prefix} ${message}`,
      `color: ${this.colors.brand}; font-weight: bold;`,
      ...args
    );
  }

  /**
   * Logs an asset loop progress header.
   * Format: [RJ AIO Metadata] --- Processing asset X of Y ---
   *
   * @param {number} current - 1-indexed asset number.
   * @param {number} total - Total asset count.
   */
  asset(current, total) {
    if (!this.enabled) return;
    if (typeof total === 'number' && !isNaN(total)) {
      console.log(
        `%c${this.prefix} --- Processing asset %d of %d ---`,
        `color: ${this.colors.brand}; font-weight: bold;`,
        current,
        total
      );
    } else {
      console.log(
        `%c${this.prefix} --- Processing asset %s ---`,
        `color: ${this.colors.brand}; font-weight: bold;`,
        total ? `${current} (${total})` : String(current)
      );
    }
  }

  /**
   * Logs a specific form field or DOM interaction step.
   * Format: [RJ AIO Metadata] Setting <action>: <details>
   *
   * @param {string} action - Field or action name (e.g. 'category', 'title', 'keywords', 'Generative AI').
   * @param {string|number} [details=''] - Detailed parameter or value.
   */
  step(action, details = '') {
    if (!this.enabled) return;
    if (details !== undefined && details !== null && details !== '') {
      console.log(
        `%c${this.prefix} Setting ${action}: %s`,
        `color: ${this.colors.step};`,
        String(details)
      );
    } else {
      console.log(
        `%c${this.prefix} Setting ${action}`,
        `color: ${this.colors.step};`
      );
    }
  }

  /**
   * General info log with custom message.
   * @param {string} message - Message text.
   * @param {...any} args - Additional arguments passed to console.log.
   */
  info(message, ...args) {
    if (!this.enabled) return;
    console.log(
      `%c${this.prefix} ${message}`,
      `color: ${this.colors.brand};`,
      ...args
    );
  }

  /**
   * Success notification log.
   * @param {string} message - Message text.
   * @param {...any} args - Additional arguments passed to console.log.
   */
  success(message, ...args) {
    if (!this.enabled) return;
    console.log(
      `%c${this.prefix} ${message}`,
      `color: ${this.colors.success}; font-weight: bold;`,
      ...args
    );
  }

  /**
   * Warning notification log.
   * @param {string} message - Warning message.
   * @param {...any} args - Additional arguments passed to console.warn.
   */
  warn(message, ...args) {
    if (!this.enabled) return;
    console.warn(
      `%c${this.prefix} ${message}`,
      `color: ${this.colors.warn}; font-weight: bold;`,
      ...args
    );
  }

  /**
   * Error notification log.
   * @param {string} message - Error message.
   * @param {...any} args - Additional arguments passed to console.error.
   */
  error(message, ...args) {
    if (!this.enabled) return;
    console.error(
      `%c${this.prefix} ${message}`,
      `color: ${this.colors.error}; font-weight: bold;`,
      ...args
    );
  }
}

export const logger = new LoggerService();
