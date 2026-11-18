
  /* ============================================================
     MÓDULO GLOBAL · Menú (bottom sheet)
     ============================================================ */
  window.Global = (function () {

    var UMBRAL_VELOCIDAD = 0.5;
    var UMBRAL_DRAG      = 6;

    var base   = 'menu';
    var abierto = false;

    var raiz       = null;
    var backdrop   = null;
    var sheet      = null;
    var handleArea = null;
    var content    = null;
    var btnClose   = null;
    var btnBack    = null;
    var btnTop     = null;

    var dragActivo = false;
    var dragMoved = false;
    var dragPointerId = null;
    var dragStartY = 0;
    var dragUltimoY = 0;
    var dragUltimoT = 0;
    var dragVelocidad = 0;
    var dragDesdeHandle = false;

    var avisoPwaTimer = null;
    var pwaTab = null;

    /* Marca de la Partner: Servy (azul) + Cloud (oscuro) +
       Partner (gris). Solo pintado — los textos salen de
       SISTEMA.identidad (03 Constantes.gs). */
    function _renderMarcaPartner(marca) {
      var s = String(marca || '').trim();
      var idx = s.indexOf('Partner');
      var base2 = (idx > 0) ? s.substring(0, idx).trim() : s;
      var cola  = (idx > 0) ? s.substring(idx).trim()  : '';

      var idxCloud = base2.lastIndexOf('Cloud');
      var parte1 = (idxCloud > 0) ? base2.substring(0, idxCloud) : base2;
      var parte2 = (idxCloud > 0) ? base2.substring(idxCloud)   : '';

      var html = '<span class="marca-servy">' + _esc_(parte1) + '</span>' +
                 '<span class="marca-cloud">' + _esc_(parte2) + '</span>';
      if (cola) html += '<span class="marca-partner">' + _esc_(cola) + '</span>';
      return html;
    }

    function _esc_(texto) {
      return String(texto == null ? '' : texto)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    /* Marca de la EMPRESA (INGeniusCloud), mismo reparto de
       colores del original: IN · Genius · Cloud. El texto sale
       de SISTEMA.root.main.marca (Setup — datos ágiles). */
    function _renderMarcaMain(marca) {
      var s = String(marca || '').trim();
      if (!s) return '';

      var idxGenius = s.indexOf('Genius');
      var idxCloud  = s.lastIndexOf('Cloud');

      if (idxGenius > 0 && idxCloud > idxGenius) {
        return '<span class="in">'     + _esc_(s.substring(0, idxGenius))         + '</span>' +
               '<span class="genius">' + _esc_(s.substring(idxGenius, idxCloud))  + '</span>' +
               '<span class="cloud">'  + _esc_(s.substring(idxCloud))             + '</span>';
      }

      return _esc_(s);
    }

    function _whatsappHrefSoporte() {
      var root  = (window.SISTEMA && window.SISTEMA.root)  || {};
      var admin = root.admin || {};
      var numero  = limpiarTelefono(admin.whatsapp);
      if (!numero) return '#';
      var mensaje = admin.mensajeWhatsapp || '';
      return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(mensaje);
    }

    function getMenuHTML() {
      var pwaTitulo = (window.SISTEMA && window.SISTEMA.pwa && window.SISTEMA.pwa.titulo) || 'Instalar la app';
      var txtCambiar = (window.SISTEMA && window.SISTEMA.arranque && window.SISTEMA.arranque.cambiar) || 'Cambiar de partner';

      return '' +
        '<h2 class="sheet-titulo titulo">Menú</h2>' +
        '<div class="sheet-menu-lista">' +

          '<a class="sheet-menu-item" data-accion="soporte" ' +
             'href="' + _whatsappHrefSoporte() + '" target="_top" rel="noopener">' +
            '<span class="sheet-menu-icon"><span data-glifo="soporte"></span></span>' +
            '<span class="sheet-menu-texto">' +
              '<span class="sheet-menu-titulo subtitulo">Soporte</span>' +
              '<span class="sheet-menu-sub textoPrimario">Escríbele a la central por WhatsApp</span>' +
            '</span>' +
            '<span class="sheet-menu-chevron">›</span>' +
          '</a>' +

          '<div class="sheet-menu-sep"></div>' +

          '<button class="sheet-menu-item" data-accion="terminos">' +
            '<span class="sheet-menu-icon"><span data-glifo="book"></span></span>' +
            '<span class="sheet-menu-texto subtitulo">Términos y condiciones</span>' +
            '<span class="sheet-menu-chevron">›</span>' +
          '</button>' +

          '<button class="sheet-menu-item" data-accion="privacidad">' +
            '<span class="sheet-menu-icon"><span data-glifo="candado"></span></span>' +
            '<span class="sheet-menu-texto subtitulo">Política de privacidad</span>' +
            '<span class="sheet-menu-chevron">›</span>' +
          '</button>' +

          '<button class="sheet-menu-item" data-accion="cookies">' +
            '<span class="sheet-menu-icon"><span data-glifo="cookie"></span></span>' +
            '<span class="sheet-menu-texto subtitulo">Política de cookies</span>' +
            '<span class="sheet-menu-chevron">›</span>' +
          '</button>' +

          '<button class="sheet-menu-item" data-accion="pwa">' +
            '<span class="sheet-menu-icon"><span data-glifo="download"></span></span>' +
            '<span class="sheet-menu-texto subtitulo">' + _esc_(pwaTitulo) + '</span>' +
            '<span class="sheet-menu-chevron">›</span>' +
          '</button>' +

          '<button class="sheet-menu-item" data-accion="acerca">' +
            '<span class="sheet-menu-icon"><span data-glifo="info"></span></span>' +
            '<span class="sheet-menu-texto subtitulo">Acerca de</span>' +
            '<span class="sheet-menu-chevron">›</span>' +
          '</button>' +

          '<div class="sheet-menu-sep"></div>' +

          '<button class="sheet-menu-item" data-accion="cambiar">' +
            '<span class="sheet-menu-icon"><span data-glifo="cambiar"></span></span>' +
            '<span class="sheet-menu-texto subtitulo">' + _esc_(txtCambiar) + '</span>' +
            '<span class="sheet-menu-chevron">›</span>' +
          '</button>' +

        '</div>';
    }

    function getAcercaHTML() {
      /* Estructura del original: marca + eslogan + versión
         arriba, «una creación de» + marca de la empresa + su
         eslogan abajo, © año al pie. Todos los textos salen de
         SISTEMA (identidad de la Partner + root.main del Setup
         compartido): cero marcas pintadas a mano. */
      var identidad = (window.SISTEMA && window.SISTEMA.identidad) || {};
      var root      = (window.SISTEMA && window.SISTEMA.root)  || {};
      var main      = root.main || {};

      var anioActual  = new Date().getFullYear();
      var marcaApp    = identidad.nombreApp || 'ServyPartner';
      var esloganApp  = identidad.eslogan   || '';
      var versionApp  = identidad.version   || '';
      var marcaMain   = main.marca   || '';
      var esloganMain = main.eslogan || '';

      return '' +
        '<div class="sheet-acerca">' +

          '<div class="sheet-acerca-app">' +
            '<h3 class="sheet-acerca-app-nombre">' + _renderMarcaPartner(marcaApp) + '</h3>' +
            (esloganApp
              ? '<p class="sheet-acerca-app-eslogan">' + _esc_(esloganApp) + '</p>'
              : '') +
            (versionApp
              ? '<span class="sheet-acerca-app-version">Versión ' + _esc_(versionApp) + ' · ' +
                _esc_(identidad.plataforma || 'Web App') + '</span>'
              : '') +
          '</div>' +

          '<div class="sheet-acerca-divisor"></div>' +

          '<div class="sheet-acerca-empresa">' +
            '<p class="sheet-acerca-credito">una creación de</p>' +
            (marcaMain
              ? '<div class="carga-brand">' + _renderMarcaMain(marcaMain) + '</div>'
              : '') +
            (esloganMain
              ? '<p class="sheet-acerca-empresa-eslogan">' + _esc_(esloganMain) + '</p>'
              : '') +
          '</div>' +

          '<p class="sheet-acerca-footer">' +
            '© ' + anioActual + ' · Todos los derechos reservados' +
          '</p>' +

        '</div>';
    }

    /* ============================================================
       SUBVISTAS LEGALES · interpolación de placeholders
       (molde del original): el contenido vive en
       SISTEMA.contenidoLegal (03 Constantes.gs) y los textos
       llevan {marcaApp}·{marcaEmpresa}·{correo}·{whatsapp}.
       ============================================================ */
    function getLegalHTML(clave) {
      var contenido = window.SISTEMA &&
                      window.SISTEMA.contenidoLegal &&
                      window.SISTEMA.contenidoLegal[clave];

      if (!contenido) {
        return '<h2 class="sheet-titulo titulo">Próximamente</h2>';
      }

      var root  = (window.SISTEMA && window.SISTEMA.root) || {};
      var app   = root.app   || {};
      var main  = root.main  || {};
      var admin = root.admin || {};

      var datos = {
        marcaApp:     String((window.SISTEMA && window.SISTEMA.identidad &&
                              window.SISTEMA.identidad.nombreApp) || 'ServyPartner').trim(),
        marcaEmpresa: String(main.marca  || '').trim() || String((window.SISTEMA && window.SISTEMA.identidad &&
                              window.SISTEMA.identidad.nombreApp) || 'ServyPartner').trim(),
        correo:       String(app.correo    || '').trim() || '—',
        whatsapp:     String(admin.whatsapp || '').trim() || '—'
      };

      function interpolar(texto) {
        if (texto == null) return '';
        return String(texto)
          .replace(/\{marcaApp\}/g,     datos.marcaApp)
          .replace(/\{marcaEmpresa\}/g, datos.marcaEmpresa)
          .replace(/\{correo\}/g,       datos.correo)
          .replace(/\{whatsapp\}/g,     datos.whatsapp);
      }

      var html = '<div class="sheet-privacidad textoPrimario">';

      html += '<div class="sheet-titulo-con-icono">';
      if (contenido.icono) {
        html += '<span class="icono"><span data-glifo="' + contenido.icono + '"></span></span>';
      }
      html += '<span class="titulo">' + interpolar(contenido.titulo) + '</span>';
      html += '</div>';

      if (contenido.ultimaActualizacion) {
        html += '<p class="fecha">Última actualización · ' +
                interpolar(contenido.ultimaActualizacion) + '</p>';
      }

      var secciones = contenido.secciones || [];
      secciones.forEach(function (s) {
        html += '<h3>' + interpolar(s.titulo) + '</h3>';

        if (s.intro) {
          html += '<p>' + interpolar(s.intro) + '</p>';
        }

        if (s.parrafos && s.parrafos.length > 0) {
          s.parrafos.forEach(function (p) {
            html += '<p>' + interpolar(p) + '</p>';
          });
        }

        if (s.items && s.items.length > 0) {
          html += '<ul>';
          s.items.forEach(function (item) {
            html += '<li>' + interpolar(item) + '</li>';
          });
          html += '</ul>';
        }
      });

      html += '</div>';
      return html;
    }

    function getPlataformaUsuario() {
      var ua = navigator.userAgent || '';
      var esIOS = /iPad|iPhone|iPod/.test(ua) ||
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (esIOS) return 'ios';
      if (/Android/i.test(ua)) return 'android';
      return 'android';
    }

    function pwaYaInstalada() {
      try {
        if (window.matchMedia &&
            window.matchMedia('(display-mode: standalone)').matches) {
          return true;
        }
        if (window.navigator && window.navigator.standalone === true) {
          return true;
        }
      } catch (err) {}
      return false;
    }

    function pwaTextoAviso() {
      var m = window.SISTEMA && window.SISTEMA.pwa && window.SISTEMA.pwa.mensajes;
      return (m && m.yaInstalada) ||
             'Ya tienes la app instalada en este dispositivo';
    }

    function avisoPwa(texto) {
      var t = document.getElementById('aviso-pwa-global');
      if (!t) {
        t = document.createElement('div');
        t.id = 'aviso-pwa-global';
        t.setAttribute('role', 'status');
        t.setAttribute('style',
          'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);' +
          'z-index:1400;max-width:calc(100vw - 32px);background:#1f2937;' +
          'color:#ffffff;font-size:14px;font-weight:600;padding:11px 18px;' +
          'border-radius:999px;text-align:center;box-shadow:' +
          '0 10px 30px rgba(15,23,42,0.25);opacity:0;pointer-events:none;' +
          'transition:opacity .22s ease;');
        document.body.appendChild(t);
      }
      t.textContent = texto;
      t.style.opacity = '1';
      if (avisoPwaTimer) clearTimeout(avisoPwaTimer);
      avisoPwaTimer = setTimeout(function () { t.style.opacity = '0'; }, 2600);
    }

    function hayPadreParaPwa() {
      try {
        return !!(window.parent && window.parent !== window);
      } catch (err) { return false; }
    }

    function pedirBoletoAlPadre() {
      var resuelto = false;

      function avisoManual() {
        if (resuelto) return;
        resuelto = true;
        window.removeEventListener('message', receptor);
        avisoPwa('Abre el menú de tu navegador y elige "Añadir a pantalla de inicio"');
      }

      function receptor(e) {
        if (e.source !== window.parent) return;
        if (!e.data || e.data.tipo !== 'pwa-respuesta') return;
        if (e.data.boleto) {
          resuelto = true;
          window.removeEventListener('message', receptor);
          return;
        }
        avisoManual();
      }

      window.addEventListener('message', receptor);
      try {
        window.parent.postMessage({ tipo: 'pwa-instalar' }, '*');
      } catch (err) {
        avisoManual();
        return;
      }
      setTimeout(avisoManual, 1200);
    }

    function intentarInstalar() {
      if (pwaYaInstalada()) {
        avisoPwa(pwaTextoAviso());
        return;
      }

      var boleto = null;
      try { boleto = window.__servyBoleto || null; } catch (err) { boleto = null; }
      if (boleto && typeof boleto.prompt === 'function') {
        window.__servyBoleto = null;
        try {
          boleto.prompt();
          if (boleto.userChoice && boleto.userChoice.then) {
            boleto.userChoice.then(function () {}, function () {});
          }
          return;
        } catch (err) { /* boleto vencido: sigue abajo */ }
      }

      if (hayPadreParaPwa()) {
        pedirBoletoAlPadre();
        return;
      }

      avisoPwa('Abre el menú de tu navegador y elige "Añadir a pantalla de inicio"');
    }

    function pwaPlataformas() {
      var cfg = window.SISTEMA && window.SISTEMA.pwa;
      var lista = [];
      if (cfg && cfg.android) lista.push('android');
      if (cfg && cfg.ios)     lista.push('ios');
      return lista;
    }

    function pwaCuerpoHTML(plataforma) {
      var cfg = window.SISTEMA && window.SISTEMA.pwa;
      if (!cfg) return '';

      var data = cfg[plataforma] || null;
      if (!data) return '';

      var html = '<ol class="pwa-timeline">';

      var pasos = data.pasos || [];
      pasos.forEach(function (p, i) {
        html +=
          '<li class="pwa-paso" style="--i:' + i + '">' +
            '<span class="pwa-paso-punto" aria-hidden="true">' + (i + 1) + '</span>' +
            '<span class="pwa-paso-contenido">' +
              '<span class="pwa-paso-titulo subtitulo">' + _esc_(p.titulo || '') + '</span>' +
              (p.detalle
                ? '<span class="pwa-paso-detalle textoPrimario">' + _esc_(p.detalle) + '</span>'
                : '') +
            '</span>' +
          '</li>';
      });

      html += '</ol>';

      if (plataforma === 'android') {
        html += '<button type="button" class="pwa-instalar">' +
                '<span class="pwa-instalar-icono" data-glifo="download" aria-hidden="true"></span>' +
                'Instalar la app</button>';
      }

      if (data.nota) {
        html += '<p class="pwa-nota">' + _esc_(data.nota) + '</p>';
      }

      return html;
    }

    function getPWAHTML() {
      var cfg = window.SISTEMA && window.SISTEMA.pwa;
      if (!cfg) return '<h2 class="sheet-titulo titulo">Próximamente</h2>';

      var plataformas = pwaPlataformas();
      if (!plataformas.length) {
        return '<h2 class="sheet-titulo titulo">Próximamente</h2>';
      }

      var delEquipo = getPlataformaUsuario();
      pwaTab = (plataformas.indexOf(delEquipo) !== -1)
        ? delEquipo : plataformas[0];

      var html = '<div class="sheet-pwa">';

      html += '<div class="sheet-titulo-con-icono">';
      if (cfg.icono) {
        html += '<span class="icono"><span data-glifo="' + cfg.icono + '"></span></span>';
      }
      html += '<span class="titulo">' + _esc_(cfg.titulo || 'Instalar la app') + '</span>';
      html += '</div>';

      if (pwaYaInstalada()) {
        html += '<div class="pwa-instalada-aviso" role="status">' +
                '<span class="pwa-instalada-glifo" data-glifo="verificado" aria-hidden="true"></span>' +
                '<span class="pwa-instalada-texto">' + _esc_(pwaTextoAviso()) + '</span>' +
                '</div>';
      }

      if (cfg.subtitulo) {
        html += '<p class="pwa-sub textoPrimario">' + _esc_(cfg.subtitulo) + '</p>';
      }

      if (plataformas.length > 1) {
        html += '<div class="pwa-tabs" role="tablist" ' +
                'aria-label="Elegir tu teléfono">';
        plataformas.forEach(function (p) {
          var esIOS = (p === 'ios');
          html +=
            '<button type="button" role="tab" ' +
              'class="pwa-tab chipsFormulario' + (p === pwaTab ? ' activa' : '') + '" ' +
              'data-tab="' + p + '" ' +
              'aria-selected="' + (p === pwaTab ? 'true' : 'false') + '">' +
              '<span class="pwa-tab-icono" data-glifo="' +
                (esIOS ? 'apple' : 'android') + '" aria-hidden="true"></span>' +
              '<span>' + (esIOS ? 'iPhone' : 'Android') + '</span>' +
            '</button>';
        });
        html += '</div>';
      }

      html += '<div class="pwa-cuerpo">' +
              pwaCuerpoHTML(pwaTab) + '</div>';

      html += '</div>';
      return html;
    }

    function engancharPWA() {
      if (!content) return;

      var tabs = content.querySelectorAll('.pwa-tab');
      for (var i = 0; i < tabs.length; i++) {
        tabs[i].addEventListener('click', function () {
          var nueva = this.getAttribute('data-tab');
          if (!nueva || nueva === pwaTab) return;
          pwaTab = nueva;

          var activos = content.querySelectorAll('.pwa-tab');
          for (var j = 0; j < activos.length; j++) {
            var esEsta = activos[j].getAttribute('data-tab') === nueva;
            activos[j].classList.toggle('activa', esEsta);
            activos[j].setAttribute('aria-selected', esEsta ? 'true' : 'false');
          }

          var cuerpo = content.querySelector('.pwa-cuerpo');
          if (!cuerpo) return;
          cuerpo.innerHTML = pwaCuerpoHTML(nueva);
          if (typeof window.pintarGlifos === 'function') {
            window.pintarGlifos(cuerpo);
          }
          engancharInstalar();
        });
      }

      engancharInstalar();
    }

    function engancharInstalar() {
      var btn = content && content.querySelector('.pwa-instalar');
      if (!btn || btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        haptic(10);
        intentarInstalar();
      });
    }

    function getContenido(k) {
      if (k === 'menu')       return getMenuHTML();
      if (k === 'acerca')     return getAcercaHTML();
      if (k === 'terminos')   return getLegalHTML('terminos');
      if (k === 'privacidad') return getLegalHTML('privacidad');
      if (k === 'cookies')    return getLegalHTML('cookies');
      if (k === 'pwa')        return getPWAHTML();
      return '';
    }

    function actualizarGradientePrivacidad() {
      if (!sheet || !content) return;
      if (!sheet.classList.contains('con-privacidad')) {
        sheet.classList.remove('scroll-mas');
        return;
      }
      var hayMas = (content.scrollTop + content.clientHeight) < (content.scrollHeight - 8);
      sheet.classList.toggle('scroll-mas', hayMas);
    }

    function construirDOM() {
      if (raiz) return;

      var area = document.querySelector('.area-contenido');
      if (!area) return;

      raiz = document.createElement('div');
      raiz.className = 'global-sheet-root';
      raiz.innerHTML =
        '<div class="sheet-backdrop"></div>' +
        '<div class="sheet">' +
          '<div class="sheet-handle-area"><div class="sheet-handle"></div></div>' +
          '<button class="sheet-close" type="button" aria-label="Cerrar" data-glifo="close"></button>' +
          '<button class="sheet-back" type="button" aria-label="Volver" data-glifo="volver"></button>' +
          '<button class="mk-sheet-top" type="button" id="sheetTop" aria-label="Volver arriba" data-glifo="flechaArriba"></button>' +
          '<div class="sheet-content"></div>' +
        '</div>';

      area.appendChild(raiz);

      backdrop   = raiz.querySelector('.sheet-backdrop');
      sheet      = raiz.querySelector('.sheet');
      handleArea = raiz.querySelector('.sheet-handle-area');
      content    = raiz.querySelector('.sheet-content');
      btnClose   = raiz.querySelector('.sheet-close');
      btnBack    = raiz.querySelector('.sheet-back');
      btnTop     = raiz.querySelector('#sheetTop');

      backdrop.addEventListener('click', cerrar);
      btnClose.addEventListener('click', cerrar);
      btnBack.addEventListener('click', volverAlMenu);

      btnTop.addEventListener('click', function () {
        haptic(8);
        content.scrollTo({ top: 0, behavior: 'smooth' });
      });

      handleArea.addEventListener('pointerdown', onHandleDown);
      content.addEventListener('pointerdown', onContentDown);
      content.addEventListener('scroll', actualizarGradientePrivacidad);
      content.addEventListener('scroll', actualizarVolverArriba, { passive: true });

      if (typeof window.pintarGlifos === 'function') {
        window.pintarGlifos(raiz);
      }
    }

    function actualizarVolverArriba() {
      if (!sheet || !content) return;
      var abajo = content.scrollTop > 120;
      if (btnTop) btnTop.classList.toggle('visible', abajo);
    }

    function inyectarDirecto(k) {
      content.classList.remove('saliendo', 'entrando');
      content.innerHTML = getContenido(k);
      content.scrollTop = 0;

      if (typeof window.pintarGlifos === 'function') {
        window.pintarGlifos(content);
      }
      if (k === 'menu') engancharMenu();
      if (k === 'pwa')  engancharPWA();

      actualizarGradientePrivacidad();
      actualizarVolverArriba();
    }

    function inyectarConFade(k) {
      content.classList.add('saliendo');

      setTimeout(function () {
        content.innerHTML = getContenido(k);
        content.classList.add('entrando');
        content.scrollTop = 0;

        if (typeof window.pintarGlifos === 'function') {
          window.pintarGlifos(content);
        }
        if (k === 'menu') engancharMenu();
        if (k === 'pwa')  engancharPWA();

        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            content.classList.remove('saliendo', 'entrando');
            actualizarGradientePrivacidad();
            actualizarVolverArriba();
          });
        });
      }, 140);
    }

    function abrir() {
      construirDOM();
      if (!raiz) return;

      haptic(10);

      base    = 'menu';
      abierto = true;

      sheet.classList.remove('con-privacidad', 'scroll-mas');

      inyectarDirecto('menu');
      sheet.classList.remove('subvista');

      sheet.classList.add('sin-transicion');
      sheet.style.transform = 'translateY(100%)';

      raiz.classList.add('abierto');
      sheet.classList.add('abierto');

      void sheet.offsetHeight;
      sheet.classList.remove('sin-transicion');

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          sheet.style.transform = 'translateY(0)';
          backdrop.classList.add('visible');
        });
      });
    }

    function cerrar() {
      if (!abierto) return;

      abierto = false;
      backdrop.classList.remove('visible');
      sheet.style.transform = 'translateY(100%)';
      sheet.classList.remove('con-privacidad', 'scroll-mas');

      setTimeout(function () {
        if (!abierto) {
          sheet.classList.remove('abierto');
          raiz.classList.remove('abierto');
          if (content) content.innerHTML = '';
        }
      }, 420);
    }

    function navegar(subvista) {
      sheet.classList.add('subvista');

      /* Las legales llevan el degradado de «sigue hay más» del
         original (mismo gesto de scroll). */
      if (subvista === 'privacidad' ||
          subvista === 'terminos'   ||
          subvista === 'cookies') {
        sheet.classList.add('con-privacidad');
      } else {
        sheet.classList.remove('con-privacidad', 'scroll-mas');
      }

      inyectarConFade(subvista);
    }

    function volverAlMenu() {
      if (base !== 'menu') return;

      sheet.classList.remove('subvista');
      sheet.classList.remove('con-privacidad', 'scroll-mas');

      inyectarConFade('menu');
    }

    function engancharMenu() {
      var items = content.querySelectorAll('.sheet-menu-item');
      for (var i = 0; i < items.length; i++) {
        if (items[i].dataset.bound === '1') continue;
        items[i].dataset.bound = '1';
        items[i].addEventListener('click', onItemClick);
      }
    }

    function onItemClick(e) {
      var accion = this.getAttribute('data-accion');
      if (!accion) return;

      /* Soporte: sale por WhatsApp de la central (enlace real) —
         el sheet se cierra y el navegador abre el canal. */
      if (accion === 'soporte') {
        haptic(10);
        setTimeout(function () { cerrar(); }, 120);
        return;
      }

      haptic(8);

      /* Subvistas heredadas del original: legales + Acerca. */
      if (accion === 'terminos'    ||
          accion === 'privacidad'  ||
          accion === 'cookies'     ||
          accion === 'acerca') {
        navegar(accion);
        return;
      }

      if (accion === 'pwa') {
        navegar('pwa');
        return;
      }

      /* Cambiar de partner: cierra la sesión local y vuelve a la
         pantalla de selección (la elección no sobrevive — acta). */
      if (accion === 'cambiar') {
        cerrar();
        setTimeout(function () {
          if (window.Partner &&
              typeof window.Partner.cerrarSesion === 'function') {
            window.Partner.cerrarSesion();
          }
        }, 160);
        return;
      }

      console.log('[Global] acción pendiente:', accion);
    }

    function onHandleDown(e) { iniciarDrag(e, true); }
    function onContentDown(e) {
      if (content.scrollTop > 0) return;
      iniciarDrag(e, false);
    }

    function iniciarDrag(e, desdeHandle) {
      if (!abierto) return;
      if (e.button !== undefined && e.button !== 0) return;

      dragActivo = true;
      dragMoved = false;
      dragDesdeHandle = desdeHandle;
      dragPointerId = e.pointerId;
      dragStartY = e.clientY;
      dragUltimoY = e.clientY;
      dragUltimoT = performance.now();
      dragVelocidad = 0;

      if (desdeHandle) {
        handleArea.addEventListener('pointermove', onDragMove);
        handleArea.addEventListener('pointerup', onDragEnd);
        handleArea.addEventListener('pointercancel', onDragEnd);
      } else {
        content.addEventListener('pointermove', onDragMove);
        content.addEventListener('pointerup', onDragEnd);
        content.addEventListener('pointercancel', onDragEnd);
      }
    }

    function onDragMove(e) {
      if (!dragActivo) return;
      if (e.pointerId !== dragPointerId) return;

      var dy = e.clientY - dragStartY;

      if (!dragMoved) {
        if (Math.abs(dy) < UMBRAL_DRAG) return;
        dragMoved = true;
        sheet.classList.add('sin-transicion');
        if (dragDesdeHandle) {
          try { handleArea.setPointerCapture(e.pointerId); } catch (err) {}
        } else {
          if (dy < 0) { cancelarDrag(); return; }
          try { content.setPointerCapture(e.pointerId); } catch (err) {}
        }
      }

      var alturaSheet = sheet.offsetHeight;
      var pct = (dy / alturaSheet) * 100;
      if (pct < 0) pct = 0;
      if (pct > 100) pct = 100;

      e.preventDefault();
      sheet.style.transform = 'translateY(' + pct + '%)';

      var ahora = performance.now();
      var dt = ahora - dragUltimoT;
      if (dt > 0) {
        var v = (e.clientY - dragUltimoY) / dt;
        dragVelocidad = dragVelocidad * 0.7 + v * 0.3;
        dragUltimoY = e.clientY;
        dragUltimoT = ahora;
      }
    }

    function onDragEnd(e) {
      if (!dragActivo) return;
      if (e.pointerId !== dragPointerId) return;

      dragActivo = false;
      dragPointerId = null;

      if (!dragMoved) { limpiarListenersDrag(); return; }

      dragMoved = false;
      sheet.classList.remove('sin-transicion');

      var transform = sheet.style.transform || '';
      var match = transform.match(/translateY\(([\d.]+)%\)/);
      var pct = match ? parseFloat(match[1]) : 0;

      var destino = decidirDestino(pct);
      if (destino === 'cerrado') {
        cerrar();
      } else {
        sheet.style.transform = 'translateY(0)';
      }

      limpiarListenersDrag();
    }

    function cancelarDrag() {
      dragActivo = false;
      dragMoved = false;
      dragPointerId = null;
      sheet.classList.remove('sin-transicion');
      sheet.style.transform = 'translateY(0)';
      limpiarListenersDrag();
    }

    function limpiarListenersDrag() {
      handleArea.removeEventListener('pointermove', onDragMove);
      handleArea.removeEventListener('pointerup', onDragEnd);
      handleArea.removeEventListener('pointercancel', onDragEnd);
      content.removeEventListener('pointermove', onDragMove);
      content.removeEventListener('pointerup', onDragEnd);
      content.removeEventListener('pointercancel', onDragEnd);
    }

    function decidirDestino(pct) {
      if (dragVelocidad > UMBRAL_VELOCIDAD) return 'cerrado';
      if (dragVelocidad < -UMBRAL_VELOCIDAD) return 'abierto';
      if (pct > 30) return 'cerrado';
      return 'abierto';
    }

    function haptic(ms) {
      if (navigator.vibrate) {
        try { navigator.vibrate(ms); } catch (err) {}
      }
    }

    function initDelegacionMenuGlobal() {
      if (document.__globalDelegado === '1') return;
      document.__globalDelegado = '1';

      document.addEventListener('click', function (e) {
        var objetivo = e.target;
        if (!objetivo || !objetivo.closest) return;

        var btn = objetivo.closest('.menu-global');
        if (!btn) return;

        e.preventDefault();
        if (abierto) cerrar();
        else abrir();
      });
    }

    function pintar() {
      construirDOM();
      initDelegacionMenuGlobal();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', pintar);
    } else {
      pintar();
    }

    return {
      pintar: pintar,
      abrir:  abrir,
      cerrar: cerrar
    };

  })();
