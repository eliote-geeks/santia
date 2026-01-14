const TOKEN_KEY = 'santia_token';
const USER_KEY = 'santia_user';
const OPENIM_KEY = 'santia_openim';

export const setAuth = (token, user) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

export const setOpenIM = (payload) => {
  if (!payload) return;
  const enriched = payload.issued_at
    ? payload
    : { ...payload, issued_at: new Date().toISOString() };
  localStorage.setItem(OPENIM_KEY, JSON.stringify(enriched));
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getUser = () => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

export const getOpenIM = () => {
  const raw = localStorage.getItem(OPENIM_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(OPENIM_KEY);
};

export const authHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
