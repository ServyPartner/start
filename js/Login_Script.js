

  /* ============================================================
     LOGIN · pantalla de ACCESO + recuperación de clave
     La pintura y el flujo viven AQUÍ (correcciones 12); la
     SESIÓN vive en window.Partner (Core_Script): el éxito del
     login le entrega el token ligado y él abre el esqueleto.
     ============================================================ */
  window.Login = (function () {

    var el = {};
    var accesoEnCurso = false;
    var recupEnCurso  = false;
    var recupCorreo   = '';   /* el correo del flujo de recuperación */

    function _esc_(texto) {
      return String(texto == null ? '' : texto)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    /* ============================================================
       EL TÍTULO · el wordmark .tituloApp del Core (Servy azul +
       cola gris), pintado desde SISTEMA.identidad (cero texto
       duro). Misma partida que la cabecera: «Servy» + cola.
       ============================================================ */
    function _marcaTitulo_() {
      var identidad = (window.SISTEMA && window.SISTEMA.identidad) || {};
      var marca = String(identidad.nombreApp || 'ServyPartner');
      var idxCola  = marca.lastIndexOf('Partner');
      var idxCloud = marca.lastIndexOf('Cloud');

      var html = '<span class="tituloApp-servy">' +
        _esc_(marca.substring(0, idxCola > 0 ? idxCola : (idxCloud > 0 ? idxCloud : marca.length))) +
        '</span>';
      if (idxCola > 0) {
        html += '<span class="tituloApp-cola">' + _esc_(marca.substring(idxCola)) + '</span>';
      } else if (idxCola <= 0 && idxCloud > 0) {
        html += '<span class="tituloApp-cola">' + _esc_(marca.substring(idxCloud)) + '</span>';
      }
      return html;
    }

    /* ============================================================
       VISTAS · acceso · rec1 (correo) · rec2 (código) · rec3
       (clave nueva). Una sola visible; «Volver al acceso» regresa.
       ============================================================ */
    var VISTAS = ['vistaAcceso', 'vistaRecup1', 'vistaRecup2', 'vistaRecup3'];

    function mostrarVista(id) {
      for (var i = 0; i < VISTAS.length; i++) {
        var v = document.getElementById(VISTAS[i]);
        if (v) v.hidden = (VISTAS[i] !== id);
      }
    }

    /* Error del login — CORRECCIONES 17: el aviso DEBAJO del
       campo MURIÓ en esta pantalla (la caja .errorForm sigue
       viva SOLO en el Perfil, que la pinta con su propio
       módulo). Los errores del acceso y de la recuperación
       viajan TODOS en la píldora de alerta .avisoError
       (Global_Script.html — window.avisoError, con tiempo de
       expiración). */

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

    /* Ciclo del botón principal: .procesando con spinner →
       volver; el check de éxito solo lo usa la clave nueva. */
    function _ciclo_(btn, encender) {
      if (!btn) return;
      if (encender) {
        btn.disabled = true;
        btn.classList.add('procesando');
      } else {
        btn.classList.remove('procesando', 'exito');
        var check = btn.querySelector('.form-submit-check');
        if (check) check.hidden = true;
      }
    }

    function _textoBoton_(btn, texto) {
      var span = btn && btn.querySelector('.form-submit-texto');
      if (span) span.textContent = texto;
    }

    /* ============================================================
       PINTAR EL ACCESO · DOS BLOQUES FIJOS (correcciones 16):
       título al 20% + caja de vistas al 30% — anclas porcentuales
       que no dependen del contenido (sin movimientos al alternar
       vistas) — campos del acta (correo = el usuario · clave con
       ojito sostenido) + enlace «¿Olvidaste tu clave?» + botón
       Entrar. FUERA la cabecera (body.en-acceso — Login_CSS) y
       SIN la pregunta (orden del dueño: murió). Textos de
       SISTEMA.arranque — cero texto suelto.
       ============================================================ */
    function pintarAcceso() {
      var area = document.getElementById('pantallaArea');
      if (!area) return;

      /* El modo login se ENCIENDE aquí y lo apaga finAcceso()
         cuando la sesión abre: la cabecera no existe en un
         login (orden del dueño). */
      document.body.classList.add('en-acceso');

      var arranque = (window.SISTEMA && window.SISTEMA.arranque) || {};
      var rec = arranque.recuperar || {};

      /* Los CINCO checks de la clave — el MISMO componente del
         Perfil y LA MISMA PLANTILLA ÚNICA (correcciones 14:
         window.Validaciones.checksClaveHtml — el HTML de los
         checks se fabrica UNA sola vez para el acceso, la
         recuperación y el Perfil; el cambio de glifo lo pinta
         el CSS central del componente). */
      var checkHtml = window.Validaciones.checksClaveHtml();

      area.innerHTML =
        '<div class="acceso-wrap">' +

          /* EL BLOQUE 1 · título AL 20% de la pantalla, FIJO
             (correcciones 16, orden del dueño): el ancla es
             porcentual y NO depende del contenido — al alternar
             vistas NADA se re-centra y el título NO se mueve. */
          '<div class="acceso-marca tituloApp" id="accesoMarca" role="heading" aria-level="1">' +
            _marcaTitulo_() +
          '</div>' +

          '<div class="acceso-caja">' +

            /* ---------- VISTA ACCESO · correo + clave ---------- */
            '<form class="acceso-vista" id="vistaAcceso" novalidate>' +
              '<div class="form-bloque">' +

                '<div class="form-field" id="fieldAccesoCorreo">' +
                  '<input type="email" id="inputAccesoCorreo" placeholder=" " class="form-input campoEditable" maxlength="100" autocomplete="email">' +
                  '<label for="inputAccesoCorreo" class="tituloCampo">' + _esc_(arranque.correo || 'Correo Electrónico') + '</label>' +
                '</div>' +

                /* LA CLAVE nace INACTIVA (correcciones 14): la
                   puerta la abre _puertaClave_() si y solo si el
                   correo es válido — el input nace disabled. */
                '<div class="form-field" id="fieldAccesoClave">' +
                  '<input type="password" id="inputAccesoClave" placeholder=" " class="form-input campoEditable con-ojo" autocomplete="current-password" disabled>' +
                  '<label for="inputAccesoClave" class="tituloCampo">' + _esc_(arranque.clave || 'Clave') + '</label>' +
                  '<button type="button" class="ojito" id="ojitoAcceso" data-glifo="ojo" aria-label="' + _esc_(arranque.ojo || 'Mostrar la clave mientras se mantiene presionado') + '"></button>' +
                  /* CHECKS DE FUERZA bajo la CLAVE del acceso (orden
                     del dueño, correcciones 13): el MISMO componente
                     central — .clave-checks del Core + la fuente
                     única CHECKS_CLAVE — que el Perfil y la
                     recuperación. Marca en vivo y GOBIERNA Entrar
                     (correcciones 17: el botón nace INACTIVO y solo
                     despierta con las CINCO reglas pasando). */
                  '<div class="clave-checks" id="accesoChecks">' + checkHtml + '</div>' +
                '</div>' +

                /* RECUPERACIÓN (bitácora: «¿Olvidaste tu clave?»
                   por OTP al correo registrado — definido desde
                   la Tanda 1). Tipografía .enlacesOpciones del
                   Core. */
                '<div class="acceso-enlace-fila">' +
                  '<button type="button" class="enlacesOpciones" id="btnRecuperar">' +
                    _esc_(rec.enlace || '¿Olvidaste tu clave?') +
                  '</button>' +
                '</div>' +

                '<button type="submit" class="form-submit botonPrimario" id="btnAccesoEntrar" disabled>' +
                  '<span class="form-submit-spinner" aria-hidden="true"></span>' +
                  '<span class="form-submit-texto">' + _esc_(arranque.entrar || 'Entrar') + '</span>' +
                '</button>' +

              '</div>' +
            '</form>' +

            /* ---------- PASO 1 · pedir el código ---------- */
            '<form class="acceso-vista" id="vistaRecup1" hidden novalidate>' +
              '<div class="form-bloque">' +
                '<h2 class="acceso-paso-titulo titulo">' + _esc_(rec.titulo1 || 'Recuperar clave') + '</h2>' +
                '<div class="form-field" id="fieldRecupCorreo">' +
                  '<input type="email" id="inputRecupCorreo" placeholder=" " class="form-input campoEditable" maxlength="100" autocomplete="email">' +
                  '<label for="inputRecupCorreo" class="tituloCampo">' + _esc_(arranque.correo || 'Correo Electrónico') + '</label>' +
                '</div>' +
                '<button type="submit" class="form-submit botonPrimario" id="btnRecupEnviar" disabled>' +
                  '<span class="form-submit-spinner" aria-hidden="true"></span>' +
                  '<span class="form-submit-texto">' + _esc_(rec.enviarCodigo || 'Enviar código') + '</span>' +
                '</button>' +
                '<div class="acceso-enlace-fila">' +
                  '<button type="button" class="enlacesOpciones" data-volver="1">' +
                    _esc_(rec.volver || 'Volver al acceso') +
                  '</button>' +
                '</div>' +
              '</div>' +
            '</form>' +

            /* ---------- PASO 2 · verificar el código ---------- */
            '<form class="acceso-vista" id="vistaRecup2" hidden novalidate>' +
              '<div class="form-bloque">' +
                '<h2 class="acceso-paso-titulo titulo">' + _esc_(rec.titulo2 || 'Código enviado') + '</h2>' +
                '<p class="acceso-paso-nota textoSecundario" id="recupNota"></p>' +
                '<div class="form-field" id="fieldRecupCodigo">' +
                  '<input type="text" id="inputRecupCodigo" placeholder=" " class="form-input campoEditable" maxlength="6" inputmode="numeric" autocomplete="one-time-code">' +
                  '<label for="inputRecupCodigo" class="tituloCampo">' + _esc_(rec.codigo || 'Ingresar Código') + '</label>' +
                '</div>' +
                '<button type="submit" class="form-submit botonPrimario" id="btnRecupVerificar" disabled>' +
                  '<span class="form-submit-spinner" aria-hidden="true"></span>' +
                  '<span class="form-submit-texto">' + _esc_(rec.verificar || 'Verificar código') + '</span>' +
                '</button>' +
                '<div class="acceso-enlace-fila">' +
                  '<button type="button" class="enlacesOpciones" data-volver="1">' +
                    _esc_(rec.volver || 'Volver al acceso') +
                  '</button>' +
                '</div>' +
              '</div>' +
            '</form>' +

            /* ---------- PASO 3 · clave nueva (checks del
               Perfil REUTILIZADOS — .clave-checks del Core) ---- */
            '<form class="acceso-vista" id="vistaRecup3" hidden novalidate>' +
              '<div class="form-bloque">' +
                '<h2 class="acceso-paso-titulo titulo">' + _esc_(rec.titulo3 || 'Nueva clave') + '</h2>' +
                '<div class="form-field" id="fieldRecupClave">' +
                  '<input type="password" id="inputRecupClave" placeholder=" " class="form-input campoEditable con-ojo" autocomplete="new-password">' +
                  '<label for="inputRecupClave" class="tituloCampo">' + _esc_(rec.nuevaClave || 'Nueva clave') + '</label>' +
                  '<button type="button" class="ojito" id="ojitoRecupClave" data-glifo="ojo" aria-label="' + _esc_(arranque.ojo || 'Mostrar la clave mientras se mantiene presionado') + '"></button>' +
                  '<div class="clave-checks" id="recupChecks">' + checkHtml + '</div>' +
                '</div>' +
                '<button type="submit" class="form-submit botonPrimario" id="btnRecupGuardar" disabled>' +
                  '<span class="form-submit-spinner" aria-hidden="true"></span>' +
                  '<span class="form-submit-texto">' + _esc_(rec.guardar || 'Guardar clave') + '</span>' +
                  '<span class="form-submit-check" data-glifo="check" aria-hidden="true" hidden></span>' +
                '</button>' +
                '<div class="acceso-enlace-fila">' +
                  '<button type="button" class="enlacesOpciones" data-volver="1">' +
                    _esc_(rec.volver || 'Volver al acceso') +
                  '</button>' +
                '</div>' +
              '</div>' +
            '</form>' +

          '</div>' +
        '</div>';

      if (typeof window.pintarGlifos === 'function') window.pintarGlifos(area);
      enganchar();
      renderChecksAcceso();
    }

    /* ============================================================
       ENGANCHES · un solo pase para las cuatro vistas.
       ============================================================ */
    function enganchar() {
      var area = document.getElementById('pantallaArea');
      if (!area) return;

      el = {
        vistaAcceso: area.querySelector('#vistaAcceso'),
        fCorreo:  area.querySelector('#fieldAccesoCorreo'),
        fClave:   area.querySelector('#fieldAccesoClave'),
        iCorreo:  area.querySelector('#inputAccesoCorreo'),
        iClave:   area.querySelector('#inputAccesoClave'),
        ojitoAcceso: area.querySelector('#ojitoAcceso'),
        btnEntrar:area.querySelector('#btnAccesoEntrar'),
        accesoChecks: area.querySelector('#accesoChecks'),
        btnRecuperar: area.querySelector('#btnRecuperar'),
        formRec1: area.querySelector('#vistaRecup1'),
        fRecCorreo:  area.querySelector('#fieldRecupCorreo'),
        iRecCorreo:  area.querySelector('#inputRecupCorreo'),
        btnRecEnviar:area.querySelector('#btnRecupEnviar'),
        formRec2: area.querySelector('#vistaRecup2'),
        fRecCodigo:  area.querySelector('#fieldRecupCodigo'),
        iRecCodigo:  area.querySelector('#inputRecupCodigo'),
        btnRecVerificar: area.querySelector('#btnRecupVerificar'),
        formRec3: area.querySelector('#vistaRecup3'),
        fRecClave:   area.querySelector('#fieldRecupClave'),
        iRecClave:   area.querySelector('#inputRecupClave'),
        btnRecGuardar: area.querySelector('#btnRecupGuardar'),
        recupChecks: area.querySelector('#recupChecks'),
        recupNota:   area.querySelector('#recupNota')
      };

      /* La letra del campo habla por estados: .activo cuando
         vive escrito (el CSS de Login_CSS viste los colores del
         Core). Los errores ya NO se limpian aquí: viajan en la
         píldora .avisoError que muere sola (correcciones 17). */
      var vigiar = function (input, field, extra) {
        input.addEventListener('input', function () {
          field.classList.toggle('activo', !!String(input.value || '').trim());
          if (extra) extra();
        });
      };

      /* ---------- ACCESO ---------- */
      /* LA PUERTA (correcciones 14): cada tecla del CORREO abre
         o cierra la CLAVE; nace cerrada (correo vacío). Cada
         tecla reevalúa TAMBIÉN EL GOBIERNO del botón Entrar
         (_puertaEntrar_ — correcciones 17). */
      vigiar(el.iCorreo, el.fCorreo, function () {
        _puertaClave_();
        _puertaEntrar_();
      });
      vigiar(el.iClave, el.fClave, function () {
        renderChecksAcceso();
        _puertaEntrar_();
      });
      _engancharOjito_(el.ojitoAcceso, el.iClave);
      _puertaClave_();   /* estado inicial: correo vacío → CERRADA */
      _puertaEntrar_();  /* estado inicial: botón INACTIVO */

      el.vistaAcceso.addEventListener('submit', function (e) {
        e.preventDefault();
        iniciarSesion();
      });

      /* ---------- RECUPERACIÓN ---------- */
      el.btnRecuperar.addEventListener('click', function () {
        /* El correo ya escrito en el login viaja al paso 1. */
        el.iRecCorreo.value = String(el.iCorreo.value || '').trim();
        el.fRecCorreo.classList.toggle('activo', !!el.iRecCorreo.value);
        el.btnRecEnviar.disabled = !_correoValido_(el.iRecCorreo.value);
        mostrarVista('vistaRecup1');
        try { el.iRecCorreo.focus(); } catch (_) {}
      });

      vigiar(el.iRecCorreo, el.fRecCorreo, function () {
        el.btnRecEnviar.disabled = !_correoValido_(el.iRecCorreo.value);
      });
      vigiar(el.iRecCodigo, el.fRecCodigo, function () {
        el.btnRecVerificar.disabled = !String(el.iRecCodigo.value || '').trim();
      });
      vigiar(el.iRecClave, el.fRecClave, renderChecksRecup);

      _engancharOjito_(area.querySelector('#ojitoRecupClave'), el.iRecClave);

      el.formRec1.addEventListener('submit', function (e) {
        e.preventDefault();
        recupSolicitar();
      });
      el.formRec2.addEventListener('submit', function (e) {
        e.preventDefault();
        recupVerificar();
      });
      el.formRec3.addEventListener('submit', function (e) {
        e.preventDefault();
        recupGuardar();
      });

      /* «Volver al acceso» en los tres pasos. */
      var volverBtns = area.querySelectorAll('[data-volver]');
      for (var i = 0; i < volverBtns.length; i++) {
        volverBtns[i].addEventListener('click', function () {
          _ciclo_(el.btnRecGuardar, false);
          recupEnCurso = false;
          mostrarVista('vistaAcceso');
        });
      }
    }

    /* El correo pasa por el MISMO validador del backend
       (validarEmail de Seguridad.gs — vive en el módulo
       centralizado Validaciones_Script). */
    function _correoValido_(correo) {
      return !!(window.Validaciones && window.Validaciones.email(correo));
    }

    /* LA PUERTA DE LA CLAVE (correcciones 14, orden del dueño):
       el campo CLAVE está INACTIVO hasta que el CORREO es
       válido — si y solo si. Si el correo vuelve a invalidarse,
       la puerta se cierra (el campo conserva lo escrito). El
       OJITO acompaña a la puerta: inactivo mientras esté
       cerrada. */
    function _puertaClave_() {
      if (!el.iClave || !el.ojitoAcceso) return;
      var abierta = _correoValido_(String(el.iCorreo.value || '').trim());
      el.iClave.disabled = !abierta;
      el.ojitoAcceso.disabled = !abierta;
    }

    /* EL GOBIERNO DEL BOTÓN ENTRAR (correcciones 17, orden del
       dueño: «el boton entrar inicia inactivo, y para que se
       active debe tener la 5 validaciones que estan abajo del
       campo clave activadas»). Vive a nivel del módulo: las
       teclas lo llaman y los retornos de error lo REEVALÚAN —
       el botón nunca despierta más de la cuenta. Solo despierta
       con el correo válido, la PUERTA abierta y LAS CINCO
       REGLAS DE FUERZA pasando (las mismas que marcan en vivo
       los checks). */
    function _puertaEntrar_() {
      if (!el.btnEntrar || !el.iClave) return;
      var res = window.Validaciones.validarClaveNueva(el.iClave.value);
      el.btnEntrar.disabled = !(_correoValido_(el.iCorreo.value) &&
                                !el.iClave.disabled &&
                                String(el.iClave.value || '').length > 0 &&
                                res.ok);
    }

    /* El POOL ÚNICO de avisos de clave (SISTEMA.claves — 03
       Constantes.gs): el MISMO texto que pinta el Perfil. */
    function _claves_() {
      return (window.SISTEMA && window.SISTEMA.claves) || {};
    }

    /* ============================================================
       CHECKS DE FUERZA (reutilizados del Perfil): el validador
       central enciende los checks en vivo mientras se teclea;
       el botón despierta SOLO con las cinco reglas pasando.
       ============================================================ */
    function renderChecksRecup() {
      if (!el.recupChecks || !el.iRecClave) return;

      var res = window.Validaciones.validarClaveNueva(
        el.iRecClave.value, recupCorreo);

      var items = el.recupChecks.querySelectorAll('.checkClave');
      for (var i = 0; i < items.length; i++) {
        var regla = items[i].getAttribute('data-regla');
        items[i].classList.toggle('cumple', !!res.checks[regla]);
      }

      if (el.btnRecGuardar && !recupEnCurso) {
        el.btnRecGuardar.disabled = !res.ok;
      }
    }

    /* CHECKS DEL ACCESO (el MISMO componente, correcciones 13):
       encienden en vivo mientras se teclea la clave del acceso.
       Desde correcciones 17 GOBIERNAN Entrar (orden del dueño):
       la reevaluación vive en _puertaEntrar_ — el botón solo
       despierta con las CINCO reglas pasando. */
    function renderChecksAcceso() {
      if (!el.accesoChecks || !el.iClave) return;

      var res = window.Validaciones.validarClaveNueva(el.iClave.value);
      var items = el.accesoChecks.querySelectorAll('.checkClave');
      for (var i = 0; i < items.length; i++) {
        items[i].classList.toggle('cumple',
          !!res.checks[items[i].getAttribute('data-regla')]);
      }
    }

    /* ============================================================
       EL LOGIN · correo + clave → iniciarSesion. El backend
       verifica (02 Datos.gs) y devuelve el TOKEN LIGADO + la
       identidad; el éxito delega en window.Partner: guardarSesion
       (sesión + cache limpia) y abrirEsqueleto (footer + modo
       login apagado — la cabecera vuelve).
       ============================================================ */
    function iniciarSesion() {
      if (accesoEnCurso) return;
      var correo = String(el.iCorreo.value || '').trim();
      var clave  = String(el.iClave.value || '');

      /* El botón solo despierta con datos válidos (correo +
         clave + LAS CINCO REGLAS — correcciones 17); si igual
         llegara un submit raro, muere aquí sin texto suelto. */
      var resPuerta = window.Validaciones.validarClaveNueva(clave);
      if (!_correoValido_(correo) || !clave || !resPuerta.ok) return;

      accesoEnCurso = true;
      _ciclo_(el.btnEntrar, true);

      postBackend('iniciarSesion', { correo: correo, clave: clave })
        .then(function (data) {
          accesoEnCurso = false;
          _ciclo_(el.btnEntrar, false);

          var p = (data && data.partner) || {};
          if (!data || !data.token || !p.id) {
            throw new Error('ACCESO_INVALIDO');
          }

          window.Partner.guardarSesion(data);
          window.Partner.abrirEsqueleto();
        })
        .catch(function (err) {
          accesoEnCurso = false;
          _ciclo_(el.btnEntrar, false);
          _puertaEntrar_();   /* el botón vuelve SOLO si las cinco reglas siguen pasando (c17) */

          var arranque = (window.SISTEMA && window.SISTEMA.arranque) || {};
          var msg = String((err && err.message) || '');

          /* Los errores del login viajan TODOS en la píldora de
             alerta .avisoError (correcciones 17) — con tiempo de
             expiración; nada queda escrito bajo el campo. */
          if (msg === 'ACCESO_BLOQUEADO' || msg.indexOf('RATE_LIMIT') === 0) {
            window.avisoError(arranque.accesoBloqueado ||
              'Demasiados intentos fallidos. Espera unos minutos y prueba de nuevo.');
          } else if (msg === 'ACCESO_INVALIDO' || msg === 'CORREO_INVALIDO' ||
                     msg === 'CAMPO_VACIO:clave' || msg === 'LONGITUD_INVALIDA:clave') {
            /* UN SOLO error para correo ausente y clave mala —
               sin pistas de reconocimiento (capa del kit). */
            window.avisoError(arranque.accesoInvalido ||
              'Correo o clave incorrectos. Vuelve a intentarlo.');
          } else {
            window.avisoError(arranque.accesoRed ||
              'No se pudo conectar. Revisa tu conexión e intenta de nuevo.');
          }
        });
    }

    /* ============================================================
       RECUPERACIÓN · PASO 1 · pedir el código al correo
       registrado. Respuesta NEUTRA del backend (sin pistas de
       reconocimiento): el éxito solo abre el paso 2.
       ============================================================ */
    function recupSolicitar() {
      if (recupEnCurso) return;
      var arranque = (window.SISTEMA && window.SISTEMA.arranque) || {};
      var rec = arranque.recuperar || {};

      recupCorreo = String(el.iRecCorreo.value || '').trim().toLowerCase();
      if (!_correoValido_(recupCorreo)) {
        window.avisoError(rec.errCorreo || 'Escribe un correo válido.');
        return;
      }

      recupEnCurso = true;
      _ciclo_(el.btnRecEnviar, true);

      postBackend('recuperarClaveSolicitar', { correo: recupCorreo })
        .then(function () {
          recupEnCurso = false;
          _ciclo_(el.btnRecEnviar, false);

          /* El paso 2 habla del correo al que viajó el código. */
          var nota = String(rec.nota2 || 'Enviamos un código de 6 dígitos a {correo}.')
            .replace('{correo}', recupCorreo);
          if (el.recupNota) el.recupNota.textContent = nota;

          el.iRecCodigo.value = '';
          el.fRecCodigo.classList.remove('activo');
          el.btnRecVerificar.disabled = true;
          mostrarVista('vistaRecup2');
          try { el.iRecCodigo.focus(); } catch (_) {}
        })
        .catch(function (err) {
          recupEnCurso = false;
          _ciclo_(el.btnRecEnviar, false);
          el.btnRecEnviar.disabled = false;
          window.avisoError(_errorRecuperacion_(err, rec));
        });
    }

    /* PASO 2 · verificar el código. El éxito abre el paso 3
       (clave nueva con los checks vivos). */
    function recupVerificar() {
      if (recupEnCurso) return;
      var arranque = (window.SISTEMA && window.SISTEMA.arranque) || {};
      var rec = arranque.recuperar || {};

      var res = window.Validaciones.validarCodigoOtp(el.iRecCodigo.value);
      if (!res.ok) {
        window.avisoError(res.vacio
          ? (rec.errCodigoVacio || 'Escribe el código de 6 dígitos.')
          : (rec.errCodigoFormato || 'El código son 6 dígitos numéricos.'));
        return;
      }

      recupEnCurso = true;
      _ciclo_(el.btnRecVerificar, true);

      postBackend('recuperarClaveVerificar', { correo: recupCorreo, codigo: res.valor })
        .then(function () {
          recupEnCurso = false;
          _ciclo_(el.btnRecVerificar, false);

          el.iRecClave.value = '';
          el.fRecClave.classList.remove('activo');
          el.btnRecGuardar.disabled = true;
          renderChecksRecup();
          mostrarVista('vistaRecup3');
          try { el.iRecClave.focus(); } catch (_) {}
        })
        .catch(function (err) {
          recupEnCurso = false;
          _ciclo_(el.btnRecVerificar, false);
          el.btnRecVerificar.disabled = false;
          window.avisoError(_errorRecuperacion_(err, rec));
        });
    }

    /* PASO 3 · la clave nueva (checks del Perfil en vivo). El
       backend la valida OTRA vez (espejo exacto), escribe el
       hash con sal nueva y avisa al correo registrado. El éxito
       vuelve al acceso con el aviso central. */
    function recupGuardar() {
      if (recupEnCurso) return;
      var arranque = (window.SISTEMA && window.SISTEMA.arranque) || {};
      var rec = arranque.recuperar || {};

      var res = window.Validaciones.validarClaveNueva(el.iRecClave.value, recupCorreo);
      renderChecksRecup();
      if (!res.ok) {
        window.avisoError(
          window.Validaciones.mensajeClave(res, _claves_()));
        return;
      }

      recupEnCurso = true;
      _ciclo_(el.btnRecGuardar, true);

      postBackend('recuperarClaveGuardar', { correo: recupCorreo, claveNueva: res.valor })
        .then(function () {
          recupEnCurso = false;

          /* El correo del flujo se conserva para devolverlo al
             campo del acceso; el estado de recuperación muere. */
          var correoListo = recupCorreo;
          recupCorreo = '';

          /* El ciclo de éxito del botón central: píldora verde
             con check (clase del Core) — luego, el acceso. */
          el.btnRecGuardar.classList.remove('procesando');
          el.btnRecGuardar.classList.add('exito');
          var check = el.btnRecGuardar.querySelector('.form-submit-check');
          if (check) check.hidden = false;

          setTimeout(function () {
            _ciclo_(el.btnRecGuardar, false);

            /* De vuelta al acceso: el correo queda escrito y la
               clave vacía — el partner entra con su clave nueva.
               La PUERTA se reevalúa (correo válido → CLAVE
               abierta, correcciones 14). */
            el.iCorreo.value = correoListo;
            el.fCorreo.classList.add('activo');
            _puertaClave_();
            el.iClave.value = '';
            el.fClave.classList.remove('activo');
            el.btnEntrar.disabled = true;
            mostrarVista('vistaAcceso');

            if (typeof window.avisoFlotante === 'function') {
              window.avisoFlotante(rec.exito || 'Tu clave fue actualizada. Entra con tu clave nueva.');
            }
            try { el.iClave.focus(); } catch (_) {}
          }, 1300);
        })
        .catch(function (err) {
          recupEnCurso = false;
          _ciclo_(el.btnRecGuardar, false);
          renderChecksRecup();
          window.avisoError(_errorRecuperacion_(err, rec));
        });
    }

    /* Los errores del flujo de recuperación: los textos propios
       del OTP salen de SISTEMA.arranque.recuperar y los avisos
       de CLAVE del POOL ÚNICO SISTEMA.claves — el mismo que
       pinta el Perfil (cero texto suelto, cero duplicado). */
    function _errorRecuperacion_(err, rec) {
      var msg = String((err && err.message) || '');
      var arranque = (window.SISTEMA && window.SISTEMA.arranque) || {};
      var claves = _claves_();
      if (msg === 'OTP_INCORRECTO')        return rec.errCodigo;
      if (msg === 'OTP_EXPIRADO')          return rec.errExpirado;
      if (msg === 'OTP_INTENTOS_AGOTADOS') return rec.errIntentos;
      if (msg.indexOf('RATE_LIMIT') === 0) return rec.errLimite;
      if (msg === 'SIN_VERIFICACION_OTP')  return rec.errExpirado;
      if (msg.indexOf('CLAVE_DEBIL:') === 0) {
        return claves.errFalta
          ? String(claves.errFalta).replace('{regla}',
              window.Validaciones.textoRegla(
                msg.substring('CLAVE_DEBIL:'.length)))
          : 'Falta: ' + window.Validaciones.textoRegla(
              msg.substring('CLAVE_DEBIL:'.length));
      }
      if (msg === 'CLAVE_IGUAL_CORREO')    return claves.errIgualCorreo;
      if (msg === 'CLAVE_PROHIBIDA')       return claves.errProhibida;
      if (msg === 'SISTEMA_OCUPADO')       return claves.errOcupado;
      return arranque.accesoRed;
    }

    /* ============================================================
       FIN DEL MODO LOGIN · la cabecera vuelve (footer, marca y
       menú de siempre). Lo llama window.Partner.abrirEsqueleto.
       ============================================================ */
    function finAcceso() {
      document.body.classList.remove('en-acceso');
    }

    return {
      pintarAcceso: pintarAcceso,
      finAcceso:    finAcceso
    };

  })();

