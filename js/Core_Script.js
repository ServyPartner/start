

  /* ============================================================
     PARTNER · sesión del partner (pantalla de selección CADA carga)
     ============================================================ */
  window.Partner = (function () {

    var KEY_SESION = 'partner_sesion';
    var actual = null;

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

    function lista() {
      return Array.isArray(window.PARTNERS) ? window.PARTNERS : [];
    }

    function buscar(id) {
      var listaP = lista();
      for (var i = 0; i < listaP.length; i++) {
        if (String(listaP[i].id) === String(id)) return listaP[i];
      }
      return null;
    }

    function inicialDe(nombre) {
      var s = String(nombre || '').trim();
      return s ? s.charAt(0).toUpperCase() : '?';
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

    /* La lista de selección: marca arriba, pregunta y tarjetas.
       El ID viaja en data-id para la app (interno, jamás texto
       visible). Sin partners: pantalla vacía con reintentar. */
    function pintarSeleccion() {
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
        '<div class="seleccion-lista">';

      var partners = lista();
      if (!partners.length) {
        html += '<div class="seleccion-vacia">' +
                  '<p class="textoPrimario">' + _esc_(arranque.sinPartners || 'No hay partners registrados en la base de datos.') + '</p>' +
                  '<p class="textoSecundario" style="margin:6px 0 0">' + _esc_(arranque.sinPartnersSub || 'Revisa la conexión e intenta de nuevo.') + '</p>' +
                  '<button type="button" class="seleccion-reintentar" id="btnReintentarSeleccion">' +
                    _esc_(arranque.reintentar || 'Reintentar') +
                  '</button>' +
                '</div>';
      } else {
        partners.forEach(function (p) {
          var avatar = '';
          if (p.avatar) {
            avatar = '<img src="' + _esc_(p.avatar) + '" alt="" loading="lazy">';
          } else {
            avatar = '<span class="partner-avatar-inicial">' + _esc_(inicialDe(p.nombre)) + '</span>';
          }
          html +=
            '<button type="button" class="partner-card" data-id="' + _esc_(p.id) + '">' +
              '<span class="partner-avatar">' + avatar + '</span>' +
              '<span class="partner-nombre textoPrimario">' + _esc_(String(p.nombre || '').trim() || '—') + '</span>' +
            '</button>';
        });
      }

      html += '</div></div>';

      area.innerHTML = html;
      engancharSeleccion();
    }

    function engancharSeleccion() {
      var area = document.getElementById('pantallaArea');
      if (!area) return;

      var cards = area.querySelectorAll('.partner-card');
      for (var i = 0; i < cards.length; i++) {
        if (cards[i].dataset.bound === '1') continue;
        cards[i].dataset.bound = '1';
        cards[i].addEventListener('click', function () {
          var id = this.getAttribute('data-id');
          if (!id) return;
          seleccionar(id);
        });
      }

      var btn = document.getElementById('btnReintentarSeleccion');
      if (btn && btn.dataset.bound !== '1') {
        btn.dataset.bound = '1';
        btn.addEventListener('click', function () {
          recargarPartners();
        });
      }
    }

    /* Sin partners: la lista se pide POR DATOS de nuevo (fresca,
       saltando el caché de arranque de la página). */
    function recargarPartners() {
      postBackend('partners')
        .then(function (data) {
          if (data && Array.isArray(data.partners)) {
            window.PARTNERS = data.partners;
          }
          pintarSeleccion();
        })
        .catch(function () {});
    }

    function _esc_(texto) {
      return String(texto == null ? '' : texto)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function seleccionar(id) {
      var p = buscar(id);
      if (!p) return;

      actual = {
        id:     String(p.id),
        nombre: String(p.nombre || '').trim(),
        avatar: String(p.avatar || '').trim()
      };

      try { sessionStorage.setItem(KEY_SESION, JSON.stringify(actual)); } catch (_) {}

      try {
        document.dispatchEvent(new CustomEvent('partner:sesion', { detail: { partner: actual } }));
      } catch (_) {}

      abrirEsqueleto();
    }

    /* El menú global la llama: la elección muere aquí y la app
       vuelve a la pantalla de selección (CADA carga, acta).
       La cabecera queda intacta: siempre viste la marca. */
    function cerrarSesion() {
      actual = null;
      try { sessionStorage.removeItem(KEY_SESION); } catch (_) {}

      /* La cache del perfil muere con la sesión: otro partner
         en este dispositivo no hereda datos que no son suyos. */
      cachePerfilLimpiar();

      var footer = document.getElementById('podioFooter');
      if (footer) footer.hidden = true;

      if (window.Podio) window.Podio.reiniciar();

      pintarSeleccion();
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
      lista:            lista,
      seleccionar:      seleccionar,
      cerrarSesion:     cerrarSesion,
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
        /* CADA carga abre en la pantalla de selección (acta):
           el lienzo entra primero (cabecera + área + footer),
           se pinta la MARCA de la cabecera (ServyPartner con
           los colores oficiales), cerrarSesion limpia cualquier
           sesión local y monta la lista de partners. */
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
