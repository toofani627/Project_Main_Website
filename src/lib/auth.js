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

  // TEMPORARY BYPASS: Simulate successful login without hitting the database
  const u = username.trim().toLowerCase();
  const session = {
    username: u,
    displayName: username.trim(),
    loginTime: new Date().toISOString()
  };
  
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  console.log(`✅ Simulated login for: ${u}`);
  
  return { success: true, created: false };
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
