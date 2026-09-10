export const apiConnection = () => window.orbitConnection ?? {
  url: import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000',
  token: import.meta.env.VITE_ORBIT_API_TOKEN || '',
};
