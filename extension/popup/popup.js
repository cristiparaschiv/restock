// UI Elements
const states = {
  loading: document.getElementById('loading'),
  config: document.getElementById('config-state'),
  login: document.getElementById('login-state'),
  loggedIn: document.getElementById('logged-in-state'),
};

const elements = {
  configForm: document.getElementById('config-form'),
  serverUrl: document.getElementById('server-url'),
  loginForm: document.getElementById('login-form'),
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  loginBtn: document.getElementById('login-btn'),
  loginError: document.getElementById('login-error'),
  serverDisplay: document.getElementById('server-display'),
  changeServerBtn: document.getElementById('change-server'),
  logoutBtn: document.getElementById('logout-btn'),
  userEmail: document.getElementById('user-email'),
  userServer: document.getElementById('user-server'),
};

// State management
function showState(stateName) {
  Object.values(states).forEach(el => el.classList.add('hidden'));
  if (states[stateName]) {
    states[stateName].classList.remove('hidden');
  }
}

function showError(message) {
  elements.loginError.textContent = message;
  elements.loginError.classList.remove('hidden');
}

function hideError() {
  elements.loginError.classList.add('hidden');
}

function setLoading(loading) {
  elements.loginBtn.disabled = loading;
}

function formatServerUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.host;
  } catch {
    return url;
  }
}

// Initialize popup
async function init() {
  showState('loading');

  try {
    const data = await chrome.storage.local.get(['serverUrl', 'accessToken', 'userEmail']);

    if (!data.serverUrl) {
      showState('config');
      return;
    }

    if (!data.accessToken) {
      elements.serverDisplay.textContent = formatServerUrl(data.serverUrl);
      showState('login');
      return;
    }

    // Verify token is still valid
    const isValid = await verifyToken(data.serverUrl, data.accessToken);

    if (isValid) {
      elements.userEmail.textContent = data.userEmail || 'User';
      elements.userServer.textContent = formatServerUrl(data.serverUrl);
      showState('loggedIn');
    } else {
      // Token expired, show login
      await chrome.storage.local.remove(['accessToken', 'refreshToken']);
      elements.serverDisplay.textContent = formatServerUrl(data.serverUrl);
      showState('login');
    }
  } catch (error) {
    console.error('Init error:', error);
    showState('config');
  }
}

// Verify token with server
async function verifyToken(serverUrl, token) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${serverUrl}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

// Login to server
async function login(serverUrl, email, password) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${serverUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Login failed');
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Connection timed out. Check server URL.');
    }
    throw error;
  }
}

// Event Handlers
elements.configForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  let serverUrl = elements.serverUrl.value.trim();

  // Ensure URL has protocol (use http for localhost, https for others)
  if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
    if (serverUrl.startsWith('localhost') || serverUrl.startsWith('127.0.0.1')) {
      serverUrl = 'http://' + serverUrl;
    } else {
      serverUrl = 'https://' + serverUrl;
    }
  }

  // Remove trailing slash
  serverUrl = serverUrl.replace(/\/+$/, '');

  // Validate URL
  try {
    new URL(serverUrl);
  } catch {
    alert('Please enter a valid URL');
    return;
  }

  await chrome.storage.local.set({ serverUrl });
  elements.serverDisplay.textContent = formatServerUrl(serverUrl);
  showState('login');
});

elements.loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();
  setLoading(true);

  const email = elements.email.value.trim();
  const password = elements.password.value;

  try {
    const data = await chrome.storage.local.get(['serverUrl']);
    const result = await login(data.serverUrl, email, password);

    await chrome.storage.local.set({
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      userEmail: email,
    });

    // Notify background script
    chrome.runtime.sendMessage({ type: 'LOGIN_SUCCESS' });

    elements.userEmail.textContent = email;
    elements.userServer.textContent = formatServerUrl(data.serverUrl);
    showState('loggedIn');
  } catch (error) {
    showError(error.message || 'Login failed. Please check your credentials.');
  } finally {
    setLoading(false);
  }
});

elements.changeServerBtn.addEventListener('click', async () => {
  await chrome.storage.local.remove(['serverUrl', 'accessToken', 'refreshToken', 'userEmail']);
  elements.serverUrl.value = '';
  elements.email.value = '';
  elements.password.value = '';
  showState('config');
});

elements.logoutBtn.addEventListener('click', async () => {
  await chrome.storage.local.remove(['accessToken', 'refreshToken', 'userEmail']);

  // Notify background script
  chrome.runtime.sendMessage({ type: 'LOGOUT' });

  const data = await chrome.storage.local.get(['serverUrl']);
  elements.serverDisplay.textContent = formatServerUrl(data.serverUrl);
  elements.email.value = '';
  elements.password.value = '';
  showState('login');
});

// Initialize on load
init();
