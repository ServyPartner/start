

  /* ============================================================
     PARTNER · pantalla de ACCESO + sesión del partner (Tanda 2)
     Cada carga abre en el ACCESO (acta): marca + pregunta + el
     formulario que el acta §1 prometió — donde estaba la lista
     de partners entran CORREO + CLAVE + Entrar. El correo ES el
     usuario de la Partner (columna CORREO de la tabla). El
     éxito del login trae el TOKEN LIGADO (partner+dispositivo)
     y la identidad del partner; desde ahí el idPartner lo pone
     la puerta del backend DESDE EL TOKEN (nunca el cliente).
     La sesión vive en sessionStorage y NO sobrevive al cierre
     (acta). El IDPARTNER es interno: jamás se muestra (acta).
     ============================================================ */
  window.Partner = (function () {

    var KEY_SESION = 'partner_sesion';
    var actual = null;
    var accesoEnCurso = false;

    /* ============================================================
       LLAVE DE SESIÓN · CACHE DEL PERFIL (L2)
       Orden del dueño: los datos del partner NO se releen de la
       BD en cada click a Perfil — llegan de la caché local y la
       carga es ágil sin gastar cuota GAS. La bolsa vive en
       sessionStorage (muere al cerrar la app, acta) con una
       entrada por idPartner sellada con su timestamp. El TTL es
       de REVALIDACIÓN, no de existencia: vencido, Perfil pinta
       lo cacheado y refresca mudo en segundo plano.
       ============================================================ */
    var KEY_PERFIL_CACHE = 'partner_perfil_cache';
    var PERFIL_TTL_MS    = 5 * 60 * 1000;   /* 5 minutos */

    function cachePerfilLeer(id) {
      try {
        var bolsa = JSON.parse(
          sessionStorage.getItem(KEY_PERFIL_CACHE) || '{}');
        var entrada = bolsa[String(id)];
        if (!entrada || !entrada.datos) return null;
        var edad = Date.now() - (entrada.ts || 0);
        return {
          datos:  entrada.datos,
          edad:   edad,
          fresca: edad <= PERFIL_TTL_MS
        };
      } catch (_) { return null; }
    }

    function cachePerfilGuardar(id, datos) {
      try {
        var bolsa = {};
        try {
          bolsa = JSON.parse(
            sessionStorage.getItem(KEY_PERFIL_CACHE) || '{}');
        } catch (_) {}
        bolsa[String(id)] = { datos: datos, ts: Date.now() };
        sessionStorage.setItem(KEY_PERFIL_CACHE,
                               JSON.stringify(bolsa));
      } catch (_) {}
    }

    function cachePerfilLimpiar() {
      try { sessionStorage.removeItem(KEY_PERFIL_CACHE); }
      catch (_) {}
    }

    function _esc_(texto) {
      return String(texto == null ? '' : texto)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    /* ============================================================
       MARCA DE LA CABECERA · «ServyPartner» con los colores
       oficiales del «Acerca de» (Servy azul + Partner gris).
       El texto sale de SISTEMA.identidad (03 Constantes.gs —
       cero hardcodeado); se pinta UNA vez tras inyectar el
       lienzo y ya nadie lo toca: la cabecera no lleva título
       de pestaña (orden del dueño).
       ============================================================ */
    function pintarMarcaHeader() {
      var caja = document.getElementById('headerMarca');
      if (!caja) return;

      var identidad = (window.SISTEMA && window.SISTEMA.identidad) || {};
      var marca = String(identidad.nombreApp || '').trim();
      if (!marca) return;

      var idxCola = marca.indexOf('Partner');
      var parte1 = (idxCola > 0) ? marca.substring(0, idxCola).trim() : marca;
      var cola   = (idxCola > 0) ? marca.substring(idxCola).trim() : '';

      caja.innerHTML =
        '<span class="header-marca-servy">' + _esc_(parte1) + '</span>' +
        (cola ? '<span class="header-marca-partner">' + _esc_(cola) + '</span>' : '');
    }

    /* ============================================================
       PANTALLA DE ACCESO · la pintura del acta §1 intacta (marca
       arriba, caja central, botón principal abajo): donde estaba
       la LISTA de partners entran los CAMPOS del acta — correo
       (el usuario) + clave (con ojito sostenido) + botón Entrar.
       Las clases viven CENTRALES en el Core (anatomía genérica
       de la Tanda 2): el formulario hereda el reglamento del
       dueño completo — 45px, título encima del borde justo con
       el borde izquierdo, 16px de aire input→etiqueta. Cero
       texto suelto: todo sale de SISTEMA.arranque.
       ============================================================ */
    function pintarAcceso() {
      var area = document.getElementById('pantallaArea');
      if (!area) return;

      var identidad = (window.SISTEMA && window.SISTEMA.identidad) || {};
      var arranque  = (window.SISTEMA && window.SISTEMA.arranque) || {};
      var marca     = identidad.nombreApp || 'ServyPartner';
      var pregunta  = arranque.pregunta || '¿Quién está gestionando hoy?';

      /* Marca partida: «Servy» azul + cola en gris (T2 — el
         renombre trajo «ServyPartner»; la cola «Partner» viste
         .marca-partner del Global_CSS). */
      var idxCola = marca.lastIndexOf('Partner');
      var idxCloud = marca.lastIndexOf('Cloud');
      var html = '<div class="seleccion-wrap">' +
        '<div class="seleccion-marca">' +
          '<span class="marca-servy">' + _esc_(marca.substring(0, idxCola > 0 ? idxCola : (idxCloud > 0 ? idxCloud : marca.length))) + '</span>' +
          (idxCola > 0 ? '<span class="marca-partner">' + _esc_(marca.substring(idxCola)) + '</span>' : '') +
          (idxCola <= 0 && idxCloud > 0 ? '<span class="marca-cloud">' + _esc_(marca.substring(idxCloud)) + '</span>' : '') +
        '</div>' +
        '<p class="seleccion-pregunta subtitulo">' + _esc_(pregunta) + '</p>' +
        '<form class="acceso-form" id="formAcceso" novalidate>' +
          '<div class="form-bloque">' +

            '<div class="form-field" id="fieldAccesoCorreo">' +
              '<input type="email" id="inputAccesoCorreo" placeholder=" " class="form-input campoEditable" maxlength="100" autocomplete="email">' +
              '<label for="inputAccesoCorreo" class="form-label">' + _esc_(arranque.correo || 'Correo Electrónico') + '</label>' +
              '<div class="errorForm" hidden></div>' +
            '</div>' +

            '<div class="form-field" id="fieldAccesoClave">' +
              '<input type="password" id="inputAccesoClave" placeholder=" " class="form-input campoEditable con-ojo" autocomplete="current-password">' +
              '<label for="inputAccesoClave" class="form-label">' + _esc_(arranque.clave || 'Clave') + '</label>' +
              '<button type="button" class="ojito" id="ojitoAcceso" data-glifo="ojo" aria-label="' + _esc_(arranque.ojo || 'Mostrar la clave mientras se mantiene presionado') + '"></button>' +
              '<div class="errorForm" hidden></div>' +
            '</div>' +

            /* El botón principal del acta (píldora abajo) nace
               INACTIVO: despierta con correo válido + clave. */
            '<button type="submit" class="form-submit" id="btnAccesoEntrar" disabled>' +
              '<span class="form-submit-spinner" aria-hidden="true"></span>' +
              '<span class="form-submit-texto">' + _esc_(arranque.entrar || 'Entrar') + '</span>' +
            '</button>' +

          '</div>' +
        '</form>' +
      '</div>';

      area.innerHTML = html;
      if (typeof window.pintarGlifos === 'function') window.pintarGlifos(area);
      engancharAcceso();
    }

    /* Error DEBAJO del campo (molde del errorForm del Perfil):
       texto + marca inválida; vacío = limpiar. */
    function _errorCampo_(field, texto) {
      if (!field) return;
      var caja = field.querySelector('.errorForm');
      if (caja) {
        caja.textContent = texto || '';
        caja.hidden = !texto;
      }
      field.classList.toggle('invalido', !!texto);
    }

    /* El correo pasa por la MISMA regla del backend
       (validarEmail de Seguridad.gs). */
    function _correoValido_(correo) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(correo || '').trim());
    }

    function engancharAcceso() {
      var area = document.getElementById('pantallaArea');
      if (!area) return;

      var form    = area.querySelector('#formAcceso');
      var fCorreo = area.querySelector('#fieldAccesoCorreo');
      var fClave  = area.querySelector('#fieldAccesoClave');
      var iCorreo = area.querySelector('#inputAccesoCorreo');
      var iClave  = area.querySelector('#inputAccesoClave');
      var btn     = area.querySelector('#btnAccesoEntrar');
      if (!form || !iCorreo || !iClave || !btn) return;

      /* El título azul «activo» cuando el campo vive escrito
         (molde del Perfil); cada tecla limpia el error propio. */
      var vigiar = function (input, field) {
        input.addEventListener('input', function () {
          field.classList.toggle('activo', !!String(input.value || '').trim());
          _errorCampo_(field, '');
          despertar();
        });
      };

      /* El botón nace INACTIVO: despierta SOLO con correo
         válido + clave escrita. */
      var despertar = function () {
        btn.disabled = !(_correoValido_(iCorreo.value) &&
                         String(iClave.value || '').length > 0);
      };

      vigiar(iCorreo, fCorreo);
      vigiar(iClave, fClave);
      _engancharOjito_(area.querySelector('#ojitoAcceso'), iClave);

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        iniciarSesion(iCorreo, iClave, fClave, btn);
      });
    }

    /* OJITO SOSTENIDO (orden del dueño, molde del Perfil):
       pointerdown muestra, soltar/salir/cancelar oculta. Sin
       toggle: ver mientras presionas. El long-press del móvil
       no abre menú ni selección. */
    function _engancharOjito_(btn, input) {
      if (!btn || !input || btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';

      var mostrar = function (e) {
        e.preventDefault();
        btn.classList.add('presionado');
        input.setAttribute('type', 'text');
      };
      var ocultar = function () {
        btn.classList.remove('presionado');
        input.setAttribute('type', 'password');
      };

      btn.addEventListener('pointerdown', mostrar);
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
        btn.addEventListener(ev, ocultar);
      });
      btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    }

    /* ============================================================
       EL LOGIN (Tanda 2): correo + clave → iniciarSesion. El
       backend verifica contra la columna CLAVE (migrando el
       sembrado a mano al hash), aplica el bloqueo y devuelve el
       TOKEN LIGADO + la identidad (id · nombre · avatar — capa
       7: nada más viaja). El botón hace su ciclo: .procesando
       con spinner → al error vuelve despertado; al éxito, la
       app abre el esqueleto con el footer.
       ============================================================ */
    function iniciarSesion(iCorreo, iClave, fClave, btn) {
      if (accesoEnCurso) return;
      var correo = String(iCorreo.value || '').trim();
      var clave  = String(iClave.value || '');

      /* El botón solo despierta con datos válidos; si igual
         llegara un submit raro, muere aquí sin texto suelto. */
      if (!_correoValido_(correo) || !clave) return;

      accesoEnCurso = true;
      btn.disabled = true;
      btn.classList.add('procesando');
      _errorCampo_(fClave, '');

      postBackend('iniciarSesion', { correo: correo, clave: clave })
        .then(function (data) {
          accesoEnCurso = false;
          btn.classList.remove('procesando');

          var p = (data && data.partner) || {};
          if (!data || !data.token || !p.id) {
            throw new Error('ACCESO_INVALIDO');
          }

          /* EL TOKEN LIGADO manda desde ahora: el idPartner de
             todas las acciones lo pone la puerta del backend
             DESDE el token (nunca el cliente). */
          window.TOKEN_SESION = data.token;

          actual = {
            id:     String(p.id),
            nombre: String(p.nombre || '').trim(),
            avatar: String(p.avatar || '').trim()
          };
          try { sessionStorage.setItem(KEY_SESION, JSON.stringify(actual)); } catch (_) {}

          try {
            document.dispatchEvent(new CustomEvent('partner:sesion', { detail: { partner: actual } }));
          } catch (_) {}

          /* La cache del perfil nace limpia: los datos que
             llegan son de ESTA sesión (otro partner en este
             dispositivo no hereda nada). */
          cachePerfilLimpiar();

          abrirEsqueleto();
        })
        .catch(function (err) {
          accesoEnCurso = false;
          btn.classList.remove('procesando');
          btn.disabled = false;

          var arranque = (window.SISTEMA && window.SISTEMA.arranque) || {};
          var msg = String((err && err.message) || '');

          if (msg === 'ACCESO_BLOQUEADO' || msg.indexOf('RATE_LIMIT') === 0) {
            _errorCampo_(fClave, arranque.accesoBloqueado ||
              'Demasiados intentos fallidos. Espera unos minutos y prueba de nuevo.');
          } else if (msg === 'ACCESO_INVALIDO' || msg === 'CORREO_INVALIDO' ||
                     msg === 'CAMPO_VACIO:clave' || msg === 'LONGITUD_INVALIDA:clave') {
            /* UN SOLO error para correo ausente y clave mala —
               sin pistas de reconocimiento (capa del kit). */
            _errorCampo_(fClave, arranque.accesoInvalido ||
              'Correo o clave incorrectos. Vuelve a intentarlo.');
          } else {
            _errorCampo_(fClave, arranque.accesoRed ||
              'No se pudo conectar. Revisa tu conexión e intenta de nuevo.');
          }
        });
    }

    /* ============================================================
       SESIÓN EXPIRADA / CERRAR SESIÓN (Tanda 2)
       SESION_SIN_PARTNER (la puerta respondió que el token ya
       no lleva ligazón) y el «Cambiar de partner» del menú
       vuelven AQUÍ: la pantalla de acceso, limpia. cerrarSesion
       además MATA el token ligado en el servidor (fire-and-
       forget: si falla, el token expira solo). La cache del
       perfil muere con la sesión: otro partner en este
       dispositivo no hereda datos que no son suyos.
       ============================================================ */
    function sesionExpirada() {
      actual = null;
      window.TOKEN_SESION = '';
      try { sessionStorage.removeItem(KEY_SESION); } catch (_) {}
      cachePerfilLimpiar();

      var footer = document.getElementById('podioFooter');
      if (footer) footer.hidden = true;

      if (window.Podio) window.Podio.reiniciar();

      pintarAcceso();
    }

    function cerrarSesion() {
      /* Solo si HUBO sesión ligada: en el arranque el token es
         el anónimo de doGet y NO se toca (es el que la app usa). */
      if (actual && window.TOKEN_SESION) {
        try {
          postBackend('cerrarSesion', {}, { mudo: true })
            .catch(function () {});
        } catch (_) {}
      }
      sesionExpirada();
    }

    /* ============================================================
       ESQUELETO · footer visible + pestaña inicial
       ============================================================ */
    function abrirEsqueleto() {
      var footer = document.getElementById('podioFooter');
      if (footer) footer.hidden = false;

      if (window.Podio) {
        window.Podio.pintar();
        window.Podio.irA('inicio');
      }
    }

    return {
      cerrarSesion:     cerrarSesion,
      sesionExpirada:   sesionExpirada,
      pintarMarcaHeader: pintarMarcaHeader,
      cachePerfil: {
        leer:    cachePerfilLeer,
        guardar: cachePerfilGuardar,
        limpiar: cachePerfilLimpiar
      },
      getActual:        function () { return actual; }
    };
  })();

  /* ============================================================
     PODIO · el footer de 5 (se pinta desde SISTEMA.footer)
     ============================================================ */
  window.Podio = (function () {

    var pestañaActual = null;

    function pestanas() {
      var footer = (window.SISTEMA && window.SISTEMA.footer) || {};
      return Array.isArray(footer.pestanas) ? footer.pestanas : [];
    }

    function buscar(id) {
      var lista = pestanas();
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === id) return lista[i];
      }
      return null;
    }

    function pintar() {
      var footer = document.getElementById('podioFooter');
      if (!footer) return;

      var fila = footer.querySelector('.podio-fila');
      if (!fila) {
        fila = document.createElement('div');
        fila.className = 'podio-fila';
        footer.appendChild(fila);
      }

      var html = '';
      pestanas().forEach(function (p) {
        var esEstrella = (p.id === 'publicaciones');
        html +=
          '<button type="button" class="podio-item' + (esEstrella ? ' podio-estrella' : '') + '" ' +
                  'data-tab="' + p.id + '" aria-label="' + p.titulo + '">' +
            (esEstrella
              ? '<span class="podio-foso"><span data-glifo="' + p.glifo + '"></span></span>'
              : '<span data-glifo="' + p.glifo + '"></span>') +
            '<span class="podio-etiqueta">' + p.etiqueta + '</span>' +
          '</button>';
      });

      fila.innerHTML = html;

      var items = fila.querySelectorAll('.podio-item');
      for (var i = 0; i < items.length; i++) {
        if (items[i].dataset.bound === '1') continue;
        items[i].dataset.bound = '1';
        items[i].addEventListener('click', function () {
          irA(this.getAttribute('data-tab'));
        });
      }

      if (typeof window.pintarGlifos === 'function') {
        window.pintarGlifos(footer);
      }
    }

    /* Pantalla dormida de P1: la pestaña pinta su título, su
       píldora «Pronto» y su texto (SISTEMA.footer — cero
       textos sueltos en el código). */
    function pintarDormida(p) {
      var area = document.getElementById('pantallaArea');
      if (!area) return;

      var etiquetaPronto = (window.SISTEMA && window.SISTEMA.footer &&
                            window.SISTEMA.footer.etiquetaActivaDurmiente) || 'Pronto';

      area.innerHTML =
        '<div class="dormida-wrap">' +
          '<span class="dormida-pronto">' + etiquetaPronto + '</span>' +
          '<h2 class="dormida-titulo titulo">' + p.titulo + '</h2>' +
          '<p class="dormida-texto textoSecundario">' + p.texto + '</p>' +
        '</div>';
    }

    function irA(id) {
      var p = buscar(id);
      if (!p) return;

      pestañaActual = id;

      var footer = document.getElementById('podioFooter');
      if (footer) {
        var items = footer.querySelectorAll('.podio-item');
        for (var i = 0; i < items.length; i++) {
          items[i].classList.toggle('activa',
            items[i].getAttribute('data-tab') === id);
        }
      }

      /* La cabecera NO lleva título de pestaña (orden del dueño):
         siempre viste la marca — el item del podio activo ya
         indica al usuario dónde está. */

      /* REGISTRO DE PANTALLAS (T2): si la pestaña tiene módulo
         vivo inscrito (window.Pantallas), él pinta la pantalla;
         si no, sigue el camino dormido de siempre. Las tandas
         nuevas inscriben sin rewirear nada de aquí. */
      var modulo = (window.Pantallas && typeof window.Pantallas[id] === 'function')
        ? window.Pantallas[id] : null;
      if (modulo) {
        modulo(p);
      } else {
        pintarDormida(p);
      }

      try {
        document.dispatchEvent(new CustomEvent('podio:change', { detail: { pestana: id } }));
      } catch (_) {}
    }

    function reiniciar() {
      pestañaActual = null;
      var area = document.getElementById('pantallaArea');
      if (area) area.innerHTML = '';
    }

    return {
      pintar:  pintar,
      irA:     irA,
      getActual: function () { return pestañaActual; },
      reiniciar: reiniciar
    };
  })();

  /* ============================================================
     NÚCLEO · arranque
     ============================================================ */
  (function () {

    /* ============================================================
       LIENZO · inyección del template (molde del original)
       El template #canvas-content se clona dentro de #lienzo una
       sola vez: cabecera + área de pantallas + footer podio.
       ============================================================ */
    function inyectarLienzo() {
      var lienzo = document.getElementById('lienzo');
      var plantilla = document.getElementById('canvas-content');
      if (!lienzo || !plantilla) return;

      if (lienzo.dataset.pintado === '1') return;

      var fragmento = plantilla.content.cloneNode(true);
      lienzo.appendChild(fragmento);
      lienzo.dataset.pintado = '1';

      if (typeof window.pintarGlifos === 'function') {
        window.pintarGlifos(lienzo);
      }
    }

    function avisarAlPadre() {
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ tipo: 'app-lista' }, '*');
        }
      } catch (_) {}
      try { document.dispatchEvent(new Event('app-lista')); } catch (_) {}
    }

    function arranque() {
      var pre = (typeof window.asegurarSesion === 'function')
        ? window.asegurarSesion()
        : Promise.resolve();

      pre.then(function () {
        /* CADA carga abre en la pantalla de ACCESO (acta):
           el lienzo entra primero (cabecera + área + footer),
           se pinta la MARCA de la cabecera (ServyPartner con
           los colores oficiales), cerrarSesion limpia cualquier
           sesión local y monta el ACCESO (correo + clave). */
        inyectarLienzo();
        if (window.Partner &&
            typeof window.Partner.pintarMarcaHeader === 'function') {
          window.Partner.pintarMarcaHeader();
        }
        if (window.Partner &&
            typeof window.Partner.cerrarSesion === 'function') {
          window.Partner.cerrarSesion();
        }
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            avisarAlPadre();
          });
        });
      });

      pre.catch(function (err) {
        console.warn('[Core] Sesión inicial falló:', err && err.message);
        if (typeof _mostrarErrorRed === 'function') _mostrarErrorRed();
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', arranque);
    } else {
      arranque();
    }

  })();

