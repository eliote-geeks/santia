const STORAGE_KEY = 'santia_notifications';
const EVENT_NAME = 'santia:notifications';
const MAX_NOTIFICATIONS = 50;

const safeParse = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const dispatchUpdate = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
};

export const getNotifications = () => {
  if (typeof window === 'undefined') return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
};

const saveNotifications = (items) => {
  if (typeof window === 'undefined') return;
  const trimmed = items.slice(0, MAX_NOTIFICATIONS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  dispatchUpdate();
};

export const addNotification = ({ title, description = '', type = 'info' }) => {
  const items = getNotifications();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    title,
    description,
    type,
    read: false,
    created_at: new Date().toISOString(),
  };
  saveNotifications([entry, ...items]);
  return entry;
};

export const markAllRead = () => {
  const items = getNotifications().map((item) => ({ ...item, read: true }));
  saveNotifications(items);
};

export const markRead = (id) => {
  const items = getNotifications().map((item) =>
    item.id === id ? { ...item, read: true } : item
  );
  saveNotifications(items);
};

export const clearNotifications = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  dispatchUpdate();
};

export const subscribeNotifications = (callback) => {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback(getNotifications());
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener('storage', handler);
  };
};
