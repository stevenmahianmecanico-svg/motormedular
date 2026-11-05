/// <reference types="vite-plugin-pwa/client" />

export function rechazarServiceWorker(hostname: string, produccion: boolean, iframe: boolean, desactivar: boolean) {
  const host = hostname.toLowerCase();
  return !produccion || iframe || desactivar ||
    /(^|\.)(lovableproject(?:-dev)?\.com|beta\.lovable\.dev)$/.test(host) ||
    (/\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(host) &&
      (/^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(host.split(".")[0] ?? "") ||
       /^project--.+-dev$/.test(host.split(".")[0] ?? "")));
}
export async function registrarPwa() {
  if (!("serviceWorker" in navigator)) return;
  const rechazado = rechazarServiceWorker(window.location.hostname, import.meta.env.PROD, window.self !== window.top, new URLSearchParams(window.location.search).get("sw") === "off");
  if (rechazado) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter(r => [r.active, r.waiting, r.installing].some(w => w && new URL(w.scriptURL).pathname === "/sw.js")).map(r => r.unregister()));
    return;
  }
  const { registerSW } = await import("virtual:pwa-register");
  registerSW({ immediate: true });
}