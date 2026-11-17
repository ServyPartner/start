/*
* ════════════════════════════════════════════════════════════════════
* ARCHIVO:         sw.js (service worker de la página estática)
* PROYECTO:        ServyPartner | GitHub Pages
* RESPONSABILIDAD: Service worker mínimo de PASO PURO: solo registra
*                  los listeners que Chrome exige para considerar la
*                  página INSTALABLE (botón "Instalar app"). NO guarda
*                  nada en caché: todas las peticiones siguen su curso
*                  normal, así la app de GAS (ServyPartner) y
*                  sus actualizaciones nunca quedan viejas.
* VERSIÓN:         1.1
* CAMBIOS:         T2 (Tanda 2 — perfil): renombre alineado (la app
*                  de GAS es ServyPartner). Sigue paso puro: la
*                  regla transversal del acta (cache del shell para
*                  trabajo offline) se construye con el dueño
*                  cuando el espejo se despliegue (T6): hoy paso
*                  puro, igual que la pública.
* DEPENDENCIAS:    Vive en la MISMA carpeta del repositorio que
*                  index.html, manifest.json y los iconos. Se
*                  registra desde GitHub_Cromo.js con
*                  navigator.serviceWorker.register('./sw.js').
* ════════════════════════════════════════════════════════════════════
*/
// Al instalarme, tomo el control de la página enseguida (sin esperar
// a que el usuario cierre y reabra la pestaña).
self.addEventListener('install', function () {
    self.skipWaiting();
});

self.addEventListener('activate', function (evento) {
    evento.waitUntil(self.clients.claim());
});

// Listener de fetch requerido por Chrome para la instalabilidad.
// Deliberadamente NO llama a respondWith ni usa caches: cada petición
// va a la red tal cual, sin interferencias. Sin este listener, Chrome
// no ofrecería instalar.
self.addEventListener('fetch', function () {
    // Paso puro: sin caché, sin intercepción.
});
