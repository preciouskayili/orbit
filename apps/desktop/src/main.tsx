async function start() {
  if (window.orbitDesktop?.getApiConnection) window.orbitConnection = await window.orbitDesktop.getApiConnection();
  await import('./render-app');
}
void start().catch(() => {
  const root = document.getElementById('root');
  if (root) root.textContent = 'Orbit could not start its local API. Close and reopen the app to retry.';
});
export {};
