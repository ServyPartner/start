/*
════════════════════════════════════════════════════════════════════
ARCHIVO:         GitHub_Cromo.js
ESPEJO GITHUB:   js/GitHub_Cromo.js (SOLO-GitHub: no existe en GAS)
PROYECTO:        ServyPartner | App en GitHub Pages
RESPONSABILIDAD: Cromo de la página estática: preloader orbital
                 azul, píldora "Instalar app" (Android, con modo
                 manual para Androids sin boleto) y registro del
                 service worker. Molde del cromo de la app pública.
                 SIN GA4 (la Partner P1 no lleva analítica propia;
                 el módulo Analitica nace cuando el dueño lo
                 ordene) y SIN puente de estado (la Partner no
                 guarda ciudad/vista: su único estado local es la
                 sesión del partner, que muere en cada carga —
                 acta). Claves de storage con prefijo propio.
VERSIÓN:         1.0
CAMBIOS:         P1 (Tanda 1 — cimientos): nace del molde.
DEPENDENCIAS:    Global_Script.js (asegurarSesion) · css/
                 GitHub_Cromo.css · sw.js · manifest.json.
                 Debe cargarse ÚLTIMO.
════════════════════════════════════════════════════════════════════
*/
      (function () {

          // ═══ 1 · PRELOADER ORBITAL AZUL ═══
          // Se retira con la señal app-lista, que Core_Script
          // emite como evento DOM (pantalla de selección pintada).
          let preloaderRetirado = false;
          let timerFallback = null;

          function crearPreloader(textoCentralTxt, textoEstado) {
              var wrap = document.createElement('div');
              wrap.className = 'preloader-overlay';
              wrap.innerHTML =
                  '<div class="carga-preloader" role="status" aria-live="polite">' +
                      '<div class="carga-loader">' +
                          '<div class="carga-orbital carga-orbital-1"></div>' +
                          '<div class="carga-orbital carga-orbital-2"></div>' +
                          '<div class="carga-core"><span></span></div>' +
                      '</div>' +
                      '<div class="carga-brand">' +
                          '<span class="carga-brand-servy">Servy</span>' +
                          '<span class="carga-brand-cloud">Cloud</span>' +
                          '<span class="carga-brand-partner">Partner</span>' +
                      '</div>' +
                      '<div class="carga-status">' +
                          '<span class="carga-status-texto"></span>' +
                          '<span class="carga-puntos"><span></span><span></span><span></span></span>' +
                      '</div>' +
                  '</div>';

              wrap.querySelector('.carga-core span').textContent = textoCentralTxt || 'S';
              wrap.querySelector('.carga-status-texto').textContent = textoEstado || 'Cargando';

              return wrap;
          }

          const preloader = crearPreloader('S', 'Cargando');
          document.body.appendChild(preloader);

          /* FRANJA DEL TELÉFONO: el fondo del DOCUMENTO viste el
             mismo degradado azul del preloader mientras viva. */
          document.documentElement.classList.add('preloader-activo');

          function retirarPreloader() {
              if (preloaderRetirado) return;
              preloaderRetirado = true;
              if (timerFallback) { clearTimeout(timerFallback); timerFallback = null; }

              document.documentElement.classList.remove('preloader-activo');

              // Aviso para el botón "Instalar app": aquí arranca su
              // cuenta de 2.5 seg antes de evaluarse.
              document.dispatchEvent(new Event('preloader-retirado'));

              preloader.classList.add('saliendo');
              setTimeout(function () {
                  if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
              }, 340);
          }

          document.addEventListener('app-lista', retirarPreloader);

          // Red de seguridad (12 s): si la app no avisó (error de
          // JS interno, por ejemplo), el preloader se retira igual.
          timerFallback = setTimeout(retirarPreloader, 12000);

          // ═══ 2 · PÍLDORA "INSTALAR APP" (PWA · SOLO ANDROID) ═══
          // Solo Android + no instalada + preloader retirado + 2ª
          // visita. Si Chrome NUNCA manda el boleto
          // (beforeinstallprompt — Android Go/básicos sin WebAPK),
          // la píldora entra en MODO MANUAL: "¿Cómo instalar?" abre
          // un panel con los 3 pasos del menú de Chrome.
          (function () {
              const zonaInstalar = document.getElementById('zona-instalar');
              if (!zonaInstalar) return;

              const btnPrincipal = document.getElementById('btn-instalar');
              const btnTexto = btnPrincipal ? btnPrincipal.querySelector('span') : null;

              let eventoInstalacion = null;
              let preloaderCerro = false;
              let modoManual = false;
              let graciaManual = null;
              const esAndroid = /android/i.test(navigator.userAgent);
              let yaInstalada = window.matchMedia('(display-mode: standalone)').matches;

              const visitas = parseInt(localStorage.getItem('scPartner_visitas') || '0', 10) + 1;
              try { localStorage.setItem('scPartner_visitas', String(visitas)); } catch (_) {}

              const descarte = parseInt(localStorage.getItem('scPartner_descarte') || '0', 10);
              const descartadoReciente = descarte && (Date.now() - descarte) < 3 * 24 * 60 * 60 * 1000;

              const TXT_NATIVO = 'Instalar app';
              const TXT_MANUAL = '¿Cómo instalar?';

              let panel = null;
              function panelPasos() {
                  if (panel) return panel;
                  panel = document.createElement('div');
                  panel.id = 'zona-instalar-pasos';
                  panel.hidden = true;
                  panel.setAttribute('role', 'dialog');
                  panel.setAttribute('aria-label', 'Cómo instalar la aplicación');
                  panel.innerHTML =
                      '<p class="zona-pasos-titulo">Instala la app en 3 pasos</p>' +
                      '<ol class="zona-pasos-lista">' +
                          '<li>Abre el menú de Chrome (⋮ arriba a la derecha).</li>' +
                          '<li>Toca <b>Añadir a pantalla de inicio</b>.</li>' +
                          '<li>Confirma con <b>Añadir</b> o <b>Instalar</b>.</li>' +
                      '</ol>';
                  document.body.appendChild(panel);
                  return panel;
              }
              function mostrarPanel(mostrar) {
                  panelPasos().hidden = !mostrar;
                  if (btnPrincipal) btnPrincipal.setAttribute('aria-expanded', String(mostrar));
              }

              function activarModoManual() {
                  if (modoManual || yaInstalada || eventoInstalacion) return;
                  modoManual = true;
                  if (btnTexto) btnTexto.textContent = TXT_MANUAL;
                  zonaInstalar.hidden = false;
              }
              function desactivarModoManual() {
                  if (!modoManual) return;
                  modoManual = false;
                  mostrarPanel(false);
                  if (btnTexto) btnTexto.textContent = TXT_NATIVO;
              }

              function decidirSiMostrar() {
                  if (yaInstalada || !esAndroid || !preloaderCerro) return;
                  if (descartadoReciente || visitas < 2) return;
                  if (eventoInstalacion) {
                      desactivarModoManual();
                      zonaInstalar.hidden = false;
                      return;
                  }
                  if (modoManual) { zonaInstalar.hidden = false; return; }
                  if (graciaManual) return;
                  graciaManual = setTimeout(function () {
                      graciaManual = null;
                      if (!eventoInstalacion && !yaInstalada) activarModoManual();
                  }, 4000);
              }

              window.addEventListener('beforeinstallprompt', function (e) {
                  e.preventDefault();
                  eventoInstalacion = e;
                  window.__servyBoleto = e;   // compartido con el menú
                  decidirSiMostrar();
              });

              document.addEventListener('preloader-retirado', function () {
                  preloaderCerro = true;
                  setTimeout(decidirSiMostrar, 2500);
              });

              btnPrincipal.addEventListener('click', function () {
                  if (modoManual) { mostrarPanel(panel === null || panel.hidden); return; }
                  if (!eventoInstalacion) return;
                  zonaInstalar.hidden = true;
                  window.__servyBoleto = null;   // consumido
                  try {
                      eventoInstalacion.prompt();
                      eventoInstalacion.userChoice.then(function () { eventoInstalacion = null; });
                  } catch (err) {
                      eventoInstalacion = null;  // boleto ya canjeado por el menú
                  }
              });

              document.getElementById('btn-instalar-cerrar').addEventListener('click', function () {
                  zonaInstalar.hidden = true;
                  mostrarPanel(false);
                  try { localStorage.setItem('scPartner_descarte', String(Date.now())); } catch (_) {}
              });

              window.addEventListener('appinstalled', function () {
                  zonaInstalar.hidden = true;
                  yaInstalada = true;
                  desactivarModoManual();
                  window.__servyBoleto = null;   // ya no hay nada que canjear
              });

              // Service worker de paso puro (instalabilidad; sin caché).
              if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function () {
                      navigator.serviceWorker.register('./sw.js').catch(function () {});
                  });
              }
          })();

      })();
