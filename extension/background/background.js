// Background Service Worker for Restok Recipe Importer

// Cache for supported sites
let supportedSitesCache = null;
let supportedSitesCacheTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Message handlers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch(error => {
    console.error('Message handler error:', error);
    sendResponse({ error: error.message });
  });
  return true; // Keep channel open for async response
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case 'CHECK_AUTH':
      return checkAuth();

    case 'CHECK_SUPPORTED':
      return checkSupported(message.domain);

    case 'GET_SUPPORTED_SITES':
      return getSupportedSites();

    case 'PREVIEW_RECIPE':
      return previewRecipe(message.url);

    case 'IMPORT_RECIPE':
      return importRecipe(message.data);

    case 'LOGIN_SUCCESS':
      // Clear supported sites cache to refetch with new auth
      supportedSitesCache = null;
      return { success: true };

    case 'LOGOUT':
      supportedSitesCache = null;
      return { success: true };

    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

// Check if user is authenticated
async function checkAuth() {
  const data = await chrome.storage.local.get(['serverUrl', 'accessToken']);

  if (!data.serverUrl || !data.accessToken) {
    return { authenticated: false };
  }

  try {
    const response = await fetch(`${data.serverUrl}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${data.accessToken}`,
      },
    });

    if (response.ok) {
      return { authenticated: true, serverUrl: data.serverUrl };
    }

    // Try to refresh token
    const refreshed = await refreshToken();
    return { authenticated: refreshed, serverUrl: data.serverUrl };
  } catch (error) {
    console.error('Auth check error:', error);
    return { authenticated: false };
  }
}

// Refresh access token
async function refreshToken() {
  const data = await chrome.storage.local.get(['serverUrl', 'refreshToken']);

  if (!data.serverUrl || !data.refreshToken) {
    return false;
  }

  try {
    const response = await fetch(`${data.serverUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: data.refreshToken }),
    });

    if (response.ok) {
      const result = await response.json();
      await chrome.storage.local.set({
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error('Token refresh error:', error);
    return false;
  }
}

// Get supported sites from server
async function getSupportedSites() {
  // Check cache
  if (supportedSitesCache && Date.now() - supportedSitesCacheTime < CACHE_DURATION) {
    return supportedSitesCache;
  }

  const data = await chrome.storage.local.get(['serverUrl', 'accessToken']);

  if (!data.serverUrl || !data.accessToken) {
    throw new Error('Not authenticated');
  }

  try {
    const response = await fetch(`${data.serverUrl}/api/recipes/supported-sites`, {
      headers: {
        'Authorization': `Bearer ${data.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch supported sites');
    }

    const result = await response.json();

    // Cache the result
    supportedSitesCache = result;
    supportedSitesCacheTime = Date.now();

    return result;
  } catch (error) {
    console.error('Get supported sites error:', error);
    throw error;
  }
}

// Check if a domain is supported
async function checkSupported(domain) {
  try {
    const sites = await getSupportedSites();

    // Normalize domain (remove www.)
    const normalizedDomain = domain.replace(/^www\./, '').toLowerCase();

    // Check library sites
    const isLibrarySupported = sites.library_sites.some(site => {
      const normalizedSite = site.replace(/^www\./, '').toLowerCase();
      return normalizedDomain === normalizedSite || normalizedDomain.endsWith('.' + normalizedSite);
    });

    // Check custom sites
    const isCustomSupported = sites.custom_sites.some(site => {
      const normalizedSite = site.replace(/^www\./, '').toLowerCase();
      return normalizedDomain === normalizedSite || normalizedDomain.endsWith('.' + normalizedSite);
    });

    return {
      supported: isLibrarySupported || isCustomSupported,
      aiAvailable: sites.ai_extraction_available,
    };
  } catch (error) {
    console.error('Check supported error:', error);
    return { supported: false, aiAvailable: false };
  }
}

// Preview recipe before importing
async function previewRecipe(url) {
  const data = await chrome.storage.local.get(['serverUrl', 'accessToken']);

  if (!data.serverUrl || !data.accessToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${data.serverUrl}/api/recipes/preview`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${data.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to preview recipe');
  }

  return response.json();
}

// Import (confirm) recipe
async function importRecipe(recipeData) {
  const data = await chrome.storage.local.get(['serverUrl', 'accessToken']);

  if (!data.serverUrl || !data.accessToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${data.serverUrl}/api/recipes/confirm`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${data.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(recipeData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to import recipe');
  }

  const result = await response.json();

  // Return the recipe URL for opening
  return {
    ...result,
    recipeUrl: `${data.serverUrl}/recipes/${result.id}`,
  };
}

// Update extension icon based on auth state
async function updateIcon() {
  const auth = await checkAuth();

  // Could update icon badge here if needed
  if (auth.authenticated) {
    chrome.action.setBadgeText({ text: '' });
  } else {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
  }
}

// Check auth on startup
chrome.runtime.onStartup.addListener(updateIcon);
chrome.runtime.onInstalled.addListener(updateIcon);
