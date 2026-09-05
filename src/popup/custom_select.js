/**
 * CustomSelect — Zero-dependency progressive enhancement for <select> elements.
 * Replaces native OS select popups with Raycast Dark Precision styled custom dropdowns.
 */

export class CustomSelect {
  static instances = new Map();

  /**
   * Enhances a native <select> with a custom Raycast dropdown menu.
   * @param {HTMLSelectElement} selectEl 
   */
  static enhance(selectEl) {
    if (!selectEl || selectEl.tagName !== 'SELECT') return null;

    if (CustomSelect.instances.has(selectEl)) {
      CustomSelect.refresh(selectEl);
      return CustomSelect.instances.get(selectEl);
    }

    // Hide native select visually but keep accessible
    selectEl.style.display = 'none';

    // Wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'rj-select-wrapper';
    if (selectEl.disabled) wrapper.classList.add('disabled');

    // Trigger
    const trigger = document.createElement('div');
    trigger.className = 'rj-select-trigger';
    trigger.tabIndex = 0;

    const triggerText = document.createElement('span');
    triggerText.className = 'rj-select-trigger-text';
    triggerText.textContent = selectEl.options[selectEl.selectedIndex]?.text || selectEl.value || 'Select...';

    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrow.setAttribute('class', 'rj-select-arrow');
    arrow.setAttribute('viewBox', '0 0 24 24');
    arrow.setAttribute('fill', 'none');
    arrow.setAttribute('stroke', 'currentColor');
    arrow.setAttribute('stroke-width', '2');
    arrow.setAttribute('stroke-linecap', 'round');
    arrow.setAttribute('stroke-linejoin', 'round');
    arrow.innerHTML = '<polyline points="6 9 12 15 18 9"></polyline>';

    trigger.appendChild(triggerText);
    trigger.appendChild(arrow);
    wrapper.appendChild(trigger);

    // Dropdown Menu
    const dropdown = document.createElement('div');
    dropdown.className = 'rj-select-dropdown';
    wrapper.appendChild(dropdown);

    // Insert wrapper before select in DOM
    selectEl.parentNode.insertBefore(wrapper, selectEl);

    // Instance definition
    const instance = {
      selectEl,
      wrapper,
      trigger,
      triggerText,
      dropdown,
      isOpen: false
    };

    CustomSelect.instances.set(selectEl, instance);

    // Build options
    CustomSelect._buildOptions(instance);

    // Trigger click listener
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (selectEl.disabled) return;
      CustomSelect.toggle(selectEl);
    });

    // Keyboard accessibility
    trigger.addEventListener('keydown', (e) => {
      if (selectEl.disabled) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        CustomSelect.toggle(selectEl);
      } else if (e.key === 'Escape') {
        CustomSelect.close(selectEl);
      }
    });

    return instance;
  }

  /**
   * Rebuilds option items inside the custom dropdown.
   * @private
   */
  static _buildOptions(instance) {
    const { selectEl, dropdown, triggerText, trigger } = instance;
    dropdown.innerHTML = '';

    const selectedIndex = selectEl.selectedIndex;

    Array.from(selectEl.options).forEach((opt, idx) => {
      const optEl = document.createElement('div');
      optEl.className = 'rj-select-option';
      optEl.title = opt.text;
      if (idx === selectedIndex) optEl.classList.add('selected');
      if (opt.disabled) optEl.classList.add('disabled');

      const label = document.createElement('span');
      label.className = 'rj-select-option-label';
      label.textContent = opt.text;
      optEl.appendChild(label);

      const checkSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      checkSvg.setAttribute('viewBox', '0 0 24 24');
      checkSvg.setAttribute('fill', 'none');
      checkSvg.setAttribute('stroke', 'currentColor');
      checkSvg.setAttribute('stroke-width', '2');
      checkSvg.setAttribute('stroke-linecap', 'round');
      checkSvg.setAttribute('stroke-linejoin', 'round');
      checkSvg.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
      optEl.appendChild(checkSvg);

      if (!opt.disabled) {
        optEl.addEventListener('click', (e) => {
          e.stopPropagation();
          selectEl.selectedIndex = idx;
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          CustomSelect.refresh(selectEl);
          CustomSelect.close(selectEl);
        });
      }

      dropdown.appendChild(optEl);
    });

    const activeText = selectEl.options[selectEl.selectedIndex]?.text || 'Select...';
    triggerText.textContent = activeText;
    trigger.title = activeText;
  }

  /**
   * Synchronizes custom dropdown state with the native <select>.
   * @param {HTMLSelectElement} selectEl 
   */
  static refresh(selectEl) {
    const instance = CustomSelect.instances.get(selectEl);
    if (!instance) return;

    if (selectEl.disabled) {
      instance.wrapper.classList.add('disabled');
      CustomSelect.close(selectEl);
    } else {
      instance.wrapper.classList.remove('disabled');
    }

    CustomSelect._buildOptions(instance);
  }

  static toggle(selectEl) {
    const instance = CustomSelect.instances.get(selectEl);
    if (!instance) return;
    if (instance.isOpen) {
      CustomSelect.close(selectEl);
    } else {
      CustomSelect.open(selectEl);
    }
  }

  static open(selectEl) {
    CustomSelect.closeAll();
    const instance = CustomSelect.instances.get(selectEl);
    if (!instance || selectEl.disabled) return;

    const { trigger, dropdown } = instance;

    // Smart viewport bounds check
    if (typeof window !== 'undefined' && trigger && dropdown) {
      const rect = trigger.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 590;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      // If space below is less than 200px and space above is greater, flip to dropup
      if (spaceBelow < 200 && spaceAbove > spaceBelow) {
        dropdown.classList.add('dropup');
        const maxH = Math.min(220, Math.max(100, Math.floor(spaceAbove - 16)));
        dropdown.style.maxHeight = `${maxH}px`;
      } else {
        dropdown.classList.remove('dropup');
        const maxH = Math.min(220, Math.max(100, Math.floor(spaceBelow - 16)));
        dropdown.style.maxHeight = `${maxH}px`;
      }
    }

    instance.isOpen = true;
    instance.wrapper.classList.add('open');

    // Scroll active item into view
    const selectedOpt = dropdown.querySelector('.rj-select-option.selected');
    if (selectedOpt) {
      setTimeout(() => {
        selectedOpt.scrollIntoView({ block: 'nearest' });
      }, 0);
    }
  }

  static close(selectEl) {
    const instance = CustomSelect.instances.get(selectEl);
    if (!instance) return;
    instance.isOpen = false;
    instance.wrapper.classList.remove('open');
    if (instance.dropdown) {
      instance.dropdown.classList.remove('dropup');
    }
  }

  static closeAll() {
    CustomSelect.instances.forEach(inst => {
      inst.isOpen = false;
      inst.wrapper.classList.remove('open');
      if (inst.dropdown) {
        inst.dropdown.classList.remove('dropup');
      }
    });
  }

  /**
   * Automatically enhances all .rj-select elements in the document.
   */
  static initAll(container = document) {
    container.querySelectorAll('.rj-select').forEach(sel => {
      CustomSelect.enhance(sel);
    });
  }
}

// Close dropdowns on outside click
if (typeof document !== 'undefined') {
  document.addEventListener('click', () => {
    CustomSelect.closeAll();
  });
}
