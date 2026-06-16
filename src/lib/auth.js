const SESSION_KEY = 'agri_session';

const API_URL = "";

/**
 * Attempt login / registration via the server.
 * - If username doesn't exist → auto-registers and logs in.
 * - If username exists + correct password → logs in.
 * - If username exists + wrong password → returns error.
 * Returns { success, error? }
 */
export async function login(username, password) {
  if (!username || !username.trim()) {
    return { success: false, error: 'Please enter a username.' };
  }
  if (!password) {
    return { success: false, error: 'Please enter a password.' };
  }

  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password })
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error || 'Login failed.' };
    }

    // Store a lightweight session token in localStorage
    const session = {
      username: data.username,           // normalized (lowercase)
      displayName: username.trim(),      // original casing for display
      loginTime: new Date().toISOString()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { success: true, created: data.created };

  } catch (err) {
    console.error('Login network error:', err);
    return { success: false, error: 'Cannot reach server. Check your connection.' };
  }
}

/**
 * Returns the session object or null if not logged in.
 */
export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Clears the session (logout).
 */
export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Helper to get the current user's localStorage cache key.
 */
export function getProfileKey() {
  const session = getSession();
  if (!session) return 'farmerProfile';
  return `farmerProfile_${session.username}`;
}
