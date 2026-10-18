const env = import.meta.env;

export const ADMIN_URL = (env.VITE_ADMIN_URL || 'http://localhost:5173').replace(/\/$/, '');
export const SIGNUP_URL = `${ADMIN_URL}/signup`;
export const PLAY_STORE_URL = env.VITE_PLAY_STORE_URL || '';
export const CONTACT_EMAIL = 'hello@steerly.app';
export const DEMO_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Steerly demo request')}`;
