
  /* ============================================================
     HELPERS GLOBALES · Backend
     ============================================================ */

  function getDeviceId() {
    var KEY = 'app_deviceid_partner';
    var id = null;
    try { id = localStorage.getItem(KEY); } catch (_) {}
    if (id) return id;

    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var nuevo = '';
    for (var i = 0; i < 12; i++) {
      nuevo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    try { localStorage.setItem(KEY, nuevo); } catch (_) {}
    return nuevo;
  }

  /* ============================================================
     SESIÓN POR DATOS
     La página de GAS inyecta TOKEN_SESION al servirse; la página
     de GitHub Pages no puede: lo pide POR DATOS con abrirSesion
     (la única acción que no exige token). Devuelve token (1h)
     + SISTEMA (Tanda 2: SIN la lista de partners — el acceso es
     con credenciales; lo que doGet inyecta en el HTML).
     Un solo vuelo: las llamadas concurrentes comparten la promesa.
     ============================================================ */
  var _promesaSesion = null;
  var _sesionDeEstaPagina = false;

  function _pedirSesion() {
    var url = window.URL_EXEC;
    if (!url) return Promise.reject(new Error('SIN_URL_EXEC'));

    return _fetchConTimeout(url, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body:    JSON.stringify({
        accion:        'abrirSesion',
        dispositivoId: getDeviceId()
      })
    }, TIMEOUT_MS)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP_' + r.status);
        return r.text();
      })
      .then(function (txt) {
        var res;
        try { res = JSON.parse(txt); } catch (e) {
          throw new Error('RESPUESTA_NO_JSON');
        }
        if (!res.ok) throw new Error(res.error || 'ERROR_SESION');
        return res.data;
      })
      .then(function (data) {
        if (data && data.token) {
          window.TOKEN_SESION = data.token;
          if (!_sesionDeEstaPagina) {
            _limpiarContadorToken();
            _sesionDeEstaPagina = true;
          }
        }
        if (data && data.sistema && !window.SISTEMA) {
          window.SISTEMA = data.sistema;
        }
        return data;
      });
  }

  function asegurarSesion() {
    /* Página de GAS: el token llegó inyectado → no-op. */
    if (window.TOKEN_SESION) return Promise.resolve();

    if (!_promesaSesion) {
      _promesaSesion = _pedirSesion().then(
        function (data) { _promesaSesion = null; return data; },
        function (err)  { _promesaSesion = null; throw err; }
      );
    }
    return _promesaSesion;
  }

  window.asegurarSesion = asegurarSesion;

  /* ============================================================
     GUARDIA ANTI-LOOP DE TOKEN
     ============================================================ */
  var MAX_RELOADS_TOKEN = 3;

  function _contarReloadToken() {
    var intentos = 0;
    try { intentos = parseInt(sessionStorage.getItem('partnerTokenReloads') || '0', 10); } catch (_) {}
    intentos++;
    try { sessionStorage.setItem('partnerTokenReloads', String(intentos)); } catch (_) {}
    return intentos;
  }

  function _limpiarContadorToken() {
    try { sessionStorage.removeItem('partnerTokenReloads'); } catch (_) {}
  }

  /* Pantalla de error de token: solo la invitación amable a
     cerrar y reabrir la app (molde R95 de la pública). Las
     clases viven en Core_CSS (.pantallaError — tipografía
     centralizada). */
  function _mostrarErrorToken() {
    var html = '' +
      '<div class="pantallaError">' +
        '<div class="pantallaError-caja">' +
          '<div class="pantallaError-icono">⚠️</div>' +
          '<h1 class="pantallaError-titulo">Algo salió mal</h1>' +
          '<p class="pantallaError-texto">' +
            'No pudimos conectar con el servidor. Cerrá la app y volvé a abrirla.' +
          '</p>' +
        '</div>' +
      '</div>';

    document.body.innerHTML = html;
  }

  /* ============================================================
     PANTALLA DE ERROR DE RED · la acción inicial falló del todo
     (clases centralizadas .pantallaError del Core)
     ============================================================ */
  function _mostrarErrorRed() {
    if (document.getElementById('errorRedPantalla')) return;

    var html = '' +
      '<div id="errorRedPantalla" class="pantallaError" style="z-index:999998;">' +
        '<div class="pantallaError-caja">' +
          '<div class="pantallaError-icono">📡</div>' +
          '<h1 class="pantallaError-titulo">Sin conexión</h1>' +
          '<p class="pantallaError-texto">' +
            'No pudimos cargar la información. Revisá tu conexión e intentá de nuevo.' +
          '</p>' +
          '<button type="button" id="btnReintentarRed" class="pantallaError-boton">' +
            'Reintentar' +
          '</button>' +
        '</div>' +
      '</div>';

    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    document.body.appendChild(wrap.firstChild);

    var btn = document.getElementById('btnReintentarRed');
    if (btn) {
      btn.addEventListener('click', function () {
        window.location.reload();
      });
    }
  }

  /* ============================================================
     PÍLDORA "RECONECTANDO…" (molde R14) · clase centralizada
     .pildoraReconectando del Core (tipografía de tokens).
     ============================================================ */
  var _pillReconectando = null;

  function _mostrarReconectando() {
    try {
      if (_pillReconectando) return;
      if (!document.body) return;

      var p = document.createElement('div');
      p.id = 'pillReconectando';
      p.className = 'pildoraReconectando';
      p.setAttribute('role', 'status');
      p.setAttribute('aria-live', 'polite');
      p.innerHTML =
        '<span aria-hidden="true" class="pildora-giro"></span>' +
        'Reconectando\u2026';

      document.body.appendChild(p);
      _pillReconectando = p;
      requestAnimationFrame(function () { p.style.opacity = '1'; });
    } catch (_) {}
  }

  function _ocultarReconectando() {
    try {
      if (!_pillReconectando) return;
      var p = _pillReconectando;
      _pillReconectando = null;
      p.style.opacity = '0';
      setTimeout(function () {
        if (p.parentNode) p.parentNode.removeChild(p);
      }, 260);
    } catch (_) { _pillReconectando = null; }
  }

  /* ============================================================
     FETCH CON TIMEOUT
     ============================================================ */
  var TIMEOUT_MS = 12000;
  var MAX_REINTENTOS = 3;
  var BACKOFF_BASE_MS = 500;

  /* A partir de este reintento se muestra la píldora. */
  var PILDORA_DESDE_REINTENTO = 2;

  var ACCIONES_IDEMPOTENTES = {
    perfil:   true   /* lectura; el guardar y el upload NO reintentan solos */
  };

  function _fetchConTimeout(url, options, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var terminado = false;
      var timer = setTimeout(function () {
        if (terminado) return;
        terminado = true;
        reject(new Error('TIMEOUT'));
      }, timeoutMs);

      fetch(url, options)
        .then(function (r) {
          if (terminado) return;
          terminado = true;
          clearTimeout(timer);
          resolve(r);
        })
        .catch(function (err) {
          if (terminado) return;
          terminado = true;
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  function _esErrorReintentable(msg, err) {
    if (msg === 'TOKEN_INVALIDO')       return false;
    if (msg === 'TIMEOUT')              return true;
    if (msg === 'RESPUESTA_NO_JSON')    return true;
    if (/^HTTP_5/.test(msg))            return true;
    if (/^HTTP_4/.test(msg))            return false;
    if (/^HTTP_/.test(msg))             return true;
    if (err && (err.name === 'TypeError' || err.name === 'AbortError')) return true;
    return false;
  }

  /* ============================================================
     POST BACKEND
     ============================================================ */
  function postBackend(accion, params, opciones) {
    var mudo = !!(opciones && opciones.mudo);

    var url = window.URL_EXEC || window.location.href;
    var esIdempotente = ACCIONES_IDEMPOTENTES[accion] === true;
    var maxIntentos = esIdempotente ? MAX_REINTENTOS : 1;

    /* El cuerpo nace EN CADA INTENTO: el token se lee de
       window.TOKEN_SESION al disparar la llamada, no al invocar
       postBackend (molde R189 de la pública — el auto-saneo
       viaja con el token FRESCO). */
    function _cuerpoLlamada() {
      return Object.assign({
        token:         window.TOKEN_SESION || '',
        dispositivoId: getDeviceId(),
        accion:        accion
      }, params || {});
    }

    function intentar(n) {
      return _fetchConTimeout(url, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body:    JSON.stringify(_cuerpoLlamada())
      }, TIMEOUT_MS)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP_' + r.status);
        return r.text();
      })
      .then(function (txt) {
        try {
          return JSON.parse(txt);
        } catch (e) {
          console.error('[postBackend] Respuesta no-JSON:', txt.substring(0, 200));
          throw new Error('RESPUESTA_NO_JSON');
        }
      })
      .then(function (res) {
        _ocultarReconectando();
        if (!res.ok) throw new Error(res.error || 'ERROR_DESCONOCIDO');
        _limpiarContadorToken();
        return res.data;
      })
      .catch(function (err) {
        var msg = (err && err.message) || 'ERROR_DESCONOCIDO';

        if (msg === 'SESION_SIN_PARTNER') {
          /* Tanda 2 · la puerta respondió que el token ya no
             lleva ligazón (expiró la sesión ligada o el token
             es anónimo tras el guardia de TOKEN_INVALIDO): el
             partner vuelve AL ACCESO — sin reintento ni
             pantalla de error. El token muere aquí: el próximo
             asegurarSesion trae uno anónimo fresco. */
          window.TOKEN_SESION = '';
          if (window.Partner &&
              typeof window.Partner.sesionExpirada === 'function') {
            window.Partner.sesionExpirada();
          }
          _ocultarReconectando();
          throw err;
        }

        if (msg === 'TOKEN_INVALIDO') {
          var intentos = _contarReloadToken();

          if (intentos >= MAX_RELOADS_TOKEN) {
            console.error('[postBackend] Token inválido ' + intentos +
                          ' veces. Mostrando pantalla de error.');
            _mostrarErrorToken();
            throw err;
          }

          /* Sesión nueva POR DATOS (sin recargar la página) y
             reintento de la MISMA acción. */
          console.warn('[postBackend] Token inválido · sesión nueva por datos (intento ' +
                       intentos + '/' + MAX_RELOADS_TOKEN + ')');
          window.TOKEN_SESION = '';
          return asegurarSesion()
            .then(function () {
              return intentar(n);
            })
            .catch(function (err2) {
              var msg2 = (err2 && err2.message) || 'ERROR_DESCONOCIDO';
              if (msg2 === 'TOKEN_INVALIDO') {
                _mostrarErrorToken();
                throw err2;
              }
              _ocultarReconectando();
              throw err2;
            });
        }

        var puedeReintentar = esIdempotente &&
                              n < maxIntentos &&
                              _esErrorReintentable(msg, err);

        if (puedeReintentar) {
          var espera = BACKOFF_BASE_MS * Math.pow(2, n - 1);
          console.warn('[postBackend] ' + accion + ' falló (' + msg +
                       '). Reintentando en ' + espera + 'ms · ' +
                       n + '/' + maxIntentos);
          if (!mudo && n >= PILDORA_DESDE_REINTENTO) {
            _mostrarReconectando();
          }
          return new Promise(function (res) {
            setTimeout(res, espera);
          }).then(function () {
            return intentar(n + 1);
          });
        }

        console.error('[postBackend] ' + accion + ' falló definitivamente: ' + msg);
        _ocultarReconectando();
        throw err;
      });
    }

    return intentar(1);
  }

  /* ============================================================
     HELPERS GLOBALES · WhatsApp (Soporte → canal de la central)
     ============================================================ */

  function limpiarTelefono(numero) {
    var soloDigitos = String(numero || '').replace(/\D/g, '');
    if (!soloDigitos) return '';

    if (soloDigitos.charAt(0) === '0') {
      soloDigitos = soloDigitos.substring(1);
    }
    if (soloDigitos.indexOf('58') === 0) return soloDigitos;
    return '58' + soloDigitos;
  }

  function abrirWhatsapp(numero, mensaje) {
    var numeroLimpio = limpiarTelefono(numero);
    if (!numeroLimpio || numeroLimpio.length < 10) return false;

    var url = 'https://wa.me/' + numeroLimpio +
              '?text=' + encodeURIComponent(mensaje || '');

    var a = document.createElement('a');
    a.href = url;
    a.target = '_top';
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  }

  /* ============================================================
     PUNTERO TOUCH SIMULADO (PC) — el círculo que viste
     Global_CSS. Nace SOLO donde hay puntero fino real (PC): el
     teléfono no tiene cursor y jamás ejecuta nada de esto.
     ============================================================ */
  (function () {
    try {
      if (!window.matchMedia('(pointer: fine) and (hover: hover)').matches) return;

      var circulo = document.createElement('div');
      circulo.className = 'puntero-touch-circulo';
      circulo.style.opacity = '0';
      document.body.appendChild(circulo);
      document.body.classList.add('puntero-touch');

      var visible = false;
      document.addEventListener('mousemove', function (e) {
        circulo.style.transform = 'translate3d(' + e.clientX + 'px, ' + e.clientY + 'px, 0)';
        if (!visible) { visible = true; circulo.style.opacity = '1'; }
      }, { passive: true });

      document.documentElement.addEventListener('mouseleave', function () {
        visible = false;
        circulo.style.opacity = '0';
      });
    } catch (_) {}
  })();
