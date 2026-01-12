// Content Script for Restok Recipe Importer
// Detects recipe pages and injects import UI

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.restokInjected) return;
  window.restokInjected = true;

  let importButton = null;
  let previewModal = null;
  let currentPreview = null;

  // Helper to create elements safely
  function createElement(tag, attributes = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'textContent') {
        el.textContent = value;
      } else if (key === 'className') {
        el.className = value;
      } else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else {
        el.setAttribute(key, value);
      }
    });
    children.forEach(child => {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else if (child) {
        el.appendChild(child);
      }
    });
    return el;
  }

  // Create SVG icon
  function createSvgIcon(pathD, size = 20) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    svg.appendChild(path);
    return svg;
  }

  // Check if current page is a recipe page
  function isRecipePage() {
    // Check for JSON-LD structured data with Recipe type
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item['@type'] === 'Recipe' ||
              (item['@graph'] && item['@graph'].some(g => g['@type'] === 'Recipe'))) {
            return true;
          }
        }
      } catch (e) {
        // Invalid JSON, continue
      }
    }

    // Check for microdata
    const recipeSchema = document.querySelector('[itemtype*="schema.org/Recipe"]');
    if (recipeSchema) return true;

    // Check URL patterns
    const url = window.location.href.toLowerCase();
    const recipePatterns = ['/recipe/', '/recipes/', '/reteta/', '/retete/'];
    if (recipePatterns.some(pattern => url.includes(pattern))) {
      return true;
    }

    return false;
  }

  // Create import button
  function createImportButton() {
    const plusIcon = createSvgIcon('M11 9V5H13V9H17V11H13V15H11V11H7V9H11ZM12 2C17.52 2 22 6.48 22 12C22 17.52 17.52 22 12 22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2ZM12 20C16.42 20 20 16.42 20 12C20 7.58 16.42 4 12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20Z');

    const button = createElement('div', { id: 'restok-import-button' }, [
      plusIcon,
      createElement('span', { textContent: 'Import to Restok' })
    ]);

    button.addEventListener('click', handleImportClick);
    document.body.appendChild(button);
    return button;
  }

  // Create preview modal
  function createPreviewModal() {
    const checkIcon = createSvgIcon('M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z');

    const backdrop = createElement('div', { className: 'restok-modal-backdrop' });

    const closeBtn = createElement('button', {
      className: 'restok-modal-close',
      'aria-label': 'Close',
      textContent: '×'
    });

    const header = createElement('div', { className: 'restok-modal-header' }, [
      createElement('h2', { textContent: 'Import Recipe' }),
      closeBtn
    ]);

    const spinner = createElement('div', { className: 'restok-spinner' });
    const loadingText = createElement('p', { textContent: 'Loading recipe preview...' });
    const loading = createElement('div', { className: 'restok-loading' }, [spinner, loadingText]);

    const previewImage = createElement('div', { className: 'restok-preview-image' });
    const previewTitle = createElement('h3', { className: 'restok-preview-title' });
    const previewMeta = createElement('div', { className: 'restok-preview-meta' });
    const previewDetails = createElement('div', { className: 'restok-preview-details' });
    const preview = createElement('div', { className: 'restok-preview hidden' }, [
      previewImage, previewTitle, previewMeta, previewDetails
    ]);

    const errorMessage = createElement('p', { className: 'restok-error-message' });
    const error = createElement('div', { className: 'restok-error hidden' }, [errorMessage]);

    const body = createElement('div', { className: 'restok-modal-body' }, [loading, preview, error]);

    const cancelBtn = createElement('button', {
      className: 'restok-btn restok-btn-secondary restok-cancel',
      textContent: 'Cancel'
    });
    const saveBtn = createElement('button', {
      className: 'restok-btn restok-btn-primary restok-save',
      textContent: 'Save to Restok'
    });
    const footer = createElement('div', { className: 'restok-modal-footer hidden' }, [cancelBtn, saveBtn]);

    const content = createElement('div', { className: 'restok-modal-content' }, [header, body, footer]);

    const modal = createElement('div', { id: 'restok-modal' }, [backdrop, content]);

    // Event listeners
    backdrop.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    saveBtn.addEventListener('click', handleSave);

    document.body.appendChild(modal);
    return modal;
  }

  // Handle import button click
  async function handleImportClick() {
    if (!previewModal) {
      previewModal = createPreviewModal();
    }

    // Show modal with loading state
    previewModal.classList.add('restok-visible');
    showLoading();

    try {
      // Check authentication first
      const authResult = await chrome.runtime.sendMessage({ type: 'CHECK_AUTH' });

      if (!authResult.authenticated) {
        showError('Please login to Restok first. Click the extension icon to login.');
        return;
      }

      // Preview the recipe
      const preview = await chrome.runtime.sendMessage({
        type: 'PREVIEW_RECIPE',
        url: window.location.href,
      });

      if (preview.error) {
        showError(preview.error);
        return;
      }

      currentPreview = preview;
      showPreview(preview);
    } catch (error) {
      console.error('Import error:', error);
      showError(error.message || 'Failed to load recipe preview');
    }
  }

  // Handle save button click
  async function handleSave() {
    if (!currentPreview) return;

    const saveBtn = previewModal.querySelector('.restok-save');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const result = await chrome.runtime.sendMessage({
        type: 'IMPORT_RECIPE',
        data: {
          url: currentPreview.url,
          language: currentPreview.detected_language || 'en',
          title: currentPreview.title,
          description: currentPreview.description,
          ingredients: currentPreview.ingredients,
          instructions: currentPreview.instructions,
          prep_time_minutes: currentPreview.prep_time_minutes,
          cook_time_minutes: currentPreview.cook_time_minutes,
          servings: currentPreview.servings,
          image_url: currentPreview.image_url,
          tags: currentPreview.tags,
          nutrition: currentPreview.nutrition,
        },
      });

      if (result.error) {
        showError(result.error);
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save to Restok';
        return;
      }

      // Success! Show notification and close modal
      closeModal();
      showSuccessNotification(result.recipeUrl);
    } catch (error) {
      console.error('Save error:', error);
      showError(error.message || 'Failed to save recipe');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save to Restok';
    }
  }

  // Show loading state
  function showLoading() {
    previewModal.querySelector('.restok-loading').classList.remove('hidden');
    previewModal.querySelector('.restok-preview').classList.add('hidden');
    previewModal.querySelector('.restok-error').classList.add('hidden');
    previewModal.querySelector('.restok-modal-footer').classList.add('hidden');
  }

  // Show preview
  function showPreview(data) {
    previewModal.querySelector('.restok-loading').classList.add('hidden');
    previewModal.querySelector('.restok-error').classList.add('hidden');

    const preview = previewModal.querySelector('.restok-preview');
    preview.classList.remove('hidden');

    // Image - create safely
    const imageContainer = preview.querySelector('.restok-preview-image');
    imageContainer.textContent = ''; // Clear previous content
    if (data.image_url) {
      const img = createElement('img', {
        src: data.image_url,
        alt: data.title || 'Recipe'
      });
      imageContainer.appendChild(img);
      imageContainer.classList.remove('hidden');
    } else {
      imageContainer.classList.add('hidden');
    }

    // Title - use textContent for safety
    preview.querySelector('.restok-preview-title').textContent = data.title || 'Untitled Recipe';

    // Meta (time, servings)
    const meta = [];
    if (data.total_time_minutes || data.prep_time_minutes || data.cook_time_minutes) {
      const totalTime = data.total_time_minutes ||
        ((data.prep_time_minutes || 0) + (data.cook_time_minutes || 0));
      if (totalTime) meta.push(`${totalTime} min`);
    }
    if (data.servings) {
      meta.push(`${data.servings} servings`);
    }
    preview.querySelector('.restok-preview-meta').textContent = meta.join(' • ');

    // Details
    const details = [];
    if (data.ingredients?.length) {
      details.push(`${data.ingredients.length} ingredients`);
    }
    if (data.instructions?.length) {
      details.push(`${data.instructions.length} steps`);
    }
    preview.querySelector('.restok-preview-details').textContent = details.join(' • ');

    // Show footer
    previewModal.querySelector('.restok-modal-footer').classList.remove('hidden');

    // Reset save button
    const saveBtn = previewModal.querySelector('.restok-save');
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save to Restok';
  }

  // Show error
  function showError(message) {
    previewModal.querySelector('.restok-loading').classList.add('hidden');
    previewModal.querySelector('.restok-preview').classList.add('hidden');

    const error = previewModal.querySelector('.restok-error');
    error.classList.remove('hidden');
    error.querySelector('.restok-error-message').textContent = message;

    previewModal.querySelector('.restok-modal-footer').classList.add('hidden');
  }

  // Close modal
  function closeModal() {
    if (previewModal) {
      previewModal.classList.remove('restok-visible');
    }
    currentPreview = null;
  }

  // Show success notification
  function showSuccessNotification(recipeUrl) {
    const checkIcon = createSvgIcon('M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z');

    const link = createElement('a', {
      href: recipeUrl,
      target: '_blank',
      textContent: 'Open in Restok'
    });

    const content = createElement('div', { className: 'restok-notification-content' }, [
      checkIcon,
      createElement('span', { textContent: 'Recipe saved!' }),
      link
    ]);

    const notification = createElement('div', { id: 'restok-notification' }, [content]);
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => notification.classList.add('restok-visible'), 10);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      notification.classList.remove('restok-visible');
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  // Initialize
  async function init() {
    try {
      // Check if user is authenticated
      const authResult = await chrome.runtime.sendMessage({ type: 'CHECK_AUTH' });

      if (!authResult || !authResult.authenticated) {
        console.log('[Restok] Not authenticated');
        return;
      }

      // Check if this is a recipe page first (fast check)
      if (!isRecipePage()) {
        console.log('[Restok] Not a recipe page');
        return;
      }

      // Check if domain is supported
      const domain = window.location.hostname;
      const supportResult = await chrome.runtime.sendMessage({
        type: 'CHECK_SUPPORTED',
        domain,
      });

      if (!supportResult.supported && !supportResult.aiAvailable) {
        console.log('[Restok] Domain not supported:', domain);
        return;
      }

      // Show import button
      console.log('[Restok] Showing import button');
      importButton = createImportButton();
    } catch (error) {
      console.error('[Restok] Init error:', error);
    }
  }

  // Wait for page to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
