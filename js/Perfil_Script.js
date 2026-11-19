

  /* ============================================================
     REGISTRO DE PANTALLAS VIVAS · Podio.irA consulta aquí antes
     de pintar una pestaña como dormida. Cada tanda inscribe su
     pantalla: T2 inscribe perfil (SISTEMA.footer perfil.dormida
     = false). T3/T5/P2 harán lo mismo con las suyas.
     ============================================================ */
  window.Pantallas = window.Pantallas || {};
  window.Pantallas.perfil = function () {
    window.Perfil.pintar();
  };

  /* ============================================================
     MÓDULO PERFIL
     ============================================================ */
  window.Perfil = (function () {

    var state = {
      cargando:   false,
      datos:      null,     /* el perfil sellado que llegó del backend */
      originales: null,     /* foto del perfil traído: contra esto se
                               mide si el formulario tiene cambios */
      guardando:  false,
      subiendo:   false,
      /* ---- Flujos sensibles (Tanda 1 · correcciones 7) ----
       correoPaso: sellado (campo inactivo con datos / registro
       si está vacío) · editando (el lápiz abrió la puerta) ·
       verificando (OTP pedida: todo lo demás bloqueado). */
      correoPaso:    'sellado',   /* sellado | editando | verificando */
      correoEnviadoA:'',            /* el correo nuevo en tránsito */
      correoEnCurso: false,
      claveVerificada: false,       /* la puerta ya pasó */
      claveEnCurso:    false,
      gpsPendiente:    '',          /* lat,lng capturado sin confirmar */
      gpsEnCurso:      false
    };

    var el = {};
    var timerExito = null;  /* el check del botón vuelve solo */

    /* ---------- Límites del perfil (CENTRALIZADOS) ----------
       La tabla vive en Validaciones_Script (window.Validaciones
       .REGLAS_PERFIL) — hoy solo eslogan y dirección (los ÚNICOS
       que el Guardar escribe). Los flujos sensibles usan los
       validadores del mismo módulo. */
    var REGLAS = window.Validaciones.REGLAS_PERFIL;

    /* Las CINCO reglas de fuerza de la clave (orden del dueño):
       se encienden bajo el campo «Nueva clave» SOLAMENTE. */
    var CHECKS_CLAVE = [
      { regla: 'longitud',  texto: 'Mínimo 8 caracteres' },
      { regla: 'mayuscula', texto: 'Mayúscula' },
      { regla: 'minuscula', texto: 'Minúscula' },
      { regla: 'numero',    texto: 'Número' },
      { regla: 'simbolo',   texto: 'Símbolo' }
    ];

    function _esc_(texto) {
      return String(texto == null ? '' : texto)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function haptic(v) {
      if (navigator.vibrate) { try { navigator.vibrate(v); } catch (e) {} }
    }

    function partner() {
      return (window.Partner && typeof window.Partner.getActual === 'function')
        ? window.Partner.getActual() : null;
    }

    function inicialDe(nombre) {
      var s = String(nombre || '').trim();
      return s ? s.charAt(0).toUpperCase() : '?';
    }

    /* La dirección VIVA del formulario (no la guardada): la
       captura GPS se activa con lo que el partner ESCRIBE —
       orden del dueño. */
    function direccionActual() {
      return el.inputs && el.inputs.direccion
        ? String(el.inputs.direccion.value || '').trim() : '';
    }

    function correoActual() {
      return String((state.datos && state.datos.correo) || '').trim();
    }

    /* ============================================================
       AVISO FLOTANTE · clase centralizada .notificacionFlotante
       del Core (voz única — cero avisos sueltos)
       ============================================================ */
    function _aviso(texto) {
      var previa = document.querySelector('.notificacionFlotante');
      if (previa) previa.parentNode.removeChild(previa);

      var d = document.createElement('div');
      d.className = 'notificacionFlotante visible';
      d.setAttribute('role', 'status');
      d.setAttribute('aria-live', 'polite');
      d.innerHTML =
        '<span class="textoPrimario">' + _esc_(texto) + '</span>' +
        '<button type="button" class="avisoCerrar" aria-label="Cerrar" data-glifo="close"></button>';
      document.body.appendChild(d);
      if (typeof window.pintarGlifos === 'function') window.pintarGlifos(d);

      var cerrar = function () {
        d.classList.remove('visible');
        setTimeout(function () {
          if (d.parentNode) d.parentNode.removeChild(d);
        }, 320);
      };
      var btn = d.querySelector('.avisoCerrar');
      if (btn) btn.addEventListener('click', cerrar);
      setTimeout(cerrar, 4000);
    }

    /* ============================================================
       ERRORES POR CAMPO (molde R131): cada mensaje vive DEBAJO
       de su campo; nada de banners arriba.
       ============================================================ */
    function errorCampo(fieldEl, texto) {
      if (!fieldEl) return;
      var slot = fieldEl.querySelector('.errorForm');
      if (!slot) return;
      slot.textContent = texto || '';
      slot.hidden = !texto;
    }

    function limpiarErrores() {
      var area = document.getElementById('pantallaArea');
      if (!area) return;
      var slots = area.querySelectorAll('.errorForm');
      for (var i = 0; i < slots.length; i++) {
        slots[i].hidden = true;
        slots[i].textContent = '';
      }
    }

    /* ============================================================
       ESTADOS DE PANTALLA · el skeleton SOLO existe para la
       primera lectura sin cache (L2): con la cache de sesión la
       pantalla nace pintada de golpe. La silueta es la del
       lienzo v2 REAL con la MISMA estructura de 4 bloques del
       formulario (correcciones 9): avatar + tarjeta sellada +
       separador + eslogan · dirección · GPS (alto) · correo ·
       OTP · clave ×2 · botón, al ritmo 28/42 que manda
       Perfil_CSS.
       ============================================================ */
    function pintarCargando() {
      var area = document.getElementById('pantallaArea');
      if (!area) return;
      area.innerHTML =
        '<div class="perfil-wrap" aria-busy="true" aria-live="polite">' +
          '<div class="perfil-hero">' +
            '<div class="skl skl-avatar"></div>' +
          '</div>' +
          '<div class="perfil-form">' +
            '<div class="skl skl-tarjeta"></div>' +
            '<div class="skl skl-separador"></div>' +
            /* BLOQUE 1 · eslogan + dirección + GPS */
            '<div class="skl-bloque">' +
              '<div class="skl skl-campo"></div>' +
              '<div class="skl skl-campo"></div>' +
              '<div class="skl skl-campo-alto"></div>' +
            '</div>' +
            /* BLOQUE 2 · correo + Solicitar + Ingresar código */
            '<div class="skl-bloque">' +
              '<div class="skl skl-campo"></div>' +
              '<div class="skl skl-campo"></div>' +
            '</div>' +
            /* BLOQUE 3 · clave actual + nueva clave */
            '<div class="skl-bloque">' +
              '<div class="skl skl-campo"></div>' +
              '<div class="skl skl-campo"></div>' +
            '</div>' +
            /* BLOQUE 4 · Guardar */
            '<div class="skl-bloque">' +
              '<div class="skl skl-boton"></div>' +
            '</div>' +
          '</div>' +
        '</div>';
    }

    function pintarError(texto) {
      var area = document.getElementById('pantallaArea');
      if (!area) return;
      area.innerHTML =
        '<div class="perfil-estado">' +
          '<p class="textoSecundario">' + _esc_(texto) + '</p>' +
          '<button type="button" class="perfil-reintentar" id="btnPerfilReintentar">Reintentar</button>' +
        '</div>';
      var btn = document.getElementById('btnPerfilReintentar');
      if (btn) {
        btn.addEventListener('click', function () { pintar(); });
      }
    }

    /* ============================================================
       PINTAR · L2: primero la cache de sesión, después la red.
       · Cache FRESCA (< 5 min): pinta al instante — cero skeleton,
         cero lectura de BD, cero cuota gastada.
       · Cache VENCIDA: pinta lo cacheado al instante y revalida
         MUDO en segundo plano (sin pisar una edición en curso).
       · SIN cache (primera vez en esta sesión): skeleton + lectura.
       La cache la administra Core_Script (window.Partner
       .cachePerfil); guardar y los flujos la actualizan al cerrar.
       ============================================================ */
    function pintar() {
      var p = partner();
      if (!p || !p.id) return;

      if (timerExito) { clearTimeout(timerExito); timerExito = null; }

      /* El lienzo vuelve nacer en su estado base: los flujos
         sensibles no sobreviven a una re-entrada a la pestaña. */
      state.correoPaso = 'sellado';
      state.correoEnviadoA = '';
      state.correoEnCurso = false;
      state.claveVerificada = false;
      state.claveEnCurso = false;
      state.gpsPendiente = '';
      state.gpsEnCurso = false;

      var cache = (window.Partner && window.Partner.cachePerfil)
        ? window.Partner.cachePerfil.leer(p.id) : null;

      if (cache && cache.datos) {
        state.datos = cache.datos;
        guardarOriginales(cache.datos);
        render(cache.datos);
        if (!cache.fresca) revalidarMudo(p);
        return;
      }

      state.cargando = true;
      pintarCargando();
      leerDelServidor(p);
    }

    function leerDelServidor(p) {
      postBackend('perfil', { idPartner: String(p.id) }, { mudo: true })
        .then(function (data) {
          state.cargando = false;
          state.datos = (data && data.perfil) || {};
          pintarDesde(state.datos, p);
        })
        .catch(function (err) {
          state.cargando = false;
          var msg = (err && err.message) || '';
          /* SESION_SIN_PARTNER (Tanda 2): el módulo de sesión YA
             se hizo cargo — pintó el ACCESO y limpió la sesión.
             Este catch NO repinta nada encima. */
          if (msg === 'SESION_SIN_PARTNER') return;
          if (msg === 'PARTNER_NO_ENCONTRADO') {
            pintarError('No encontramos tus datos. Cambia de partner e intenta de nuevo.');
          } else {
            pintarError('No pudimos cargar tu perfil. Revisa tu conexión e intenta de nuevo.');
          }
          console.error('[Perfil] lectura falló:', msg);
        });
    }

    /* Éxito de lectura: cache + render. */
    function pintarDesde(perfil, p) {
      if (p && window.Partner && window.Partner.cachePerfil) {
        window.Partner.cachePerfil.guardar(p.id, perfil);
      }
      render(perfil);
    }

    /* REVALIDACIÓN MUDA (cache vencida): pide el perfil al
       servidor sin tocar la pantalla salvo para refrescar la
       cache. Si el formulario NO tiene edición del partner en
       curso, el render también se refresca con lo que llegó. */
    function revalidarMudo(p) {
      postBackend('perfil', { idPartner: String(p.id) }, { mudo: true })
        .then(function (data) {
          var fresco = (data && data.perfil) || {};
          if (p && window.Partner && window.Partner.cachePerfil) {
            window.Partner.cachePerfil.guardar(p.id, fresco);
          }

          /* Con edición en curso o foco dentro del formulario,
             solo actualiza la cache — el texto que el partner
             escribe JAMÁS se pisa desde un refresco. */
          if (state.guardando || hayCambios()) return;
          var activo = document.activeElement;
          if (activo && el.form && el.form.contains(activo) &&
              activo.tagName === 'INPUT') return;

          state.datos = fresco;
          guardarOriginales(fresco);
          repoblar(fresco);
          if (state.correoPaso === 'sellado') ponerCorreoGuardado();
          actualizarCorreoFlujo();
          renderGps();
        })
        .catch(function (err) {
          /* Silencio: la pantalla ya está pintada con la cache.
             Salvo SESION_SIN_PARTNER (Tanda 2): ahí el ACCESO ya
             vive en el área — tampoco se repinta nada. */
        });
    }

    /* ============================================================
       RENDER · héroe + tarjeta sellada + separador + formulario
       (molde Reserva). La tarjeta muestra la información que
       SOLO la central escribe; el partner no la toca.
       ============================================================ */
    function render(perfil) {
      var area = document.getElementById('pantallaArea');
      if (!area) return;

      var avatar = perfil.avatar
        ? '<img src="' + _esc_(perfil.avatar) + '" alt="Foto del partner">'
        : '<span class="perfil-avatar-inicial">' + _esc_(inicialDe(perfil.nombre)) + '</span>';

      /* CAMPO DEL MOLDE RESERVA (vestidura del dueño): 45px
         (.campoEditable del Core — la altura del campo preguntas
         del original), título ENCIMA del borde, error DEBAJO.
         Hoy solo eslogan y dirección — la tarjeta sellada no
         lleva inputs. */
      var campo = function (id, etiqueta, valor, atributos) {
        return '<div class="form-field" id="field' + id + '">' +
                 '<input type="text" id="input' + id + '" placeholder=" " class="form-input campoEditable" value="' +
                   _esc_(valor || '') + '"' + (atributos || '') + '>' +
                 '<label for="input' + id + '" class="form-label">' + _esc_(etiqueta) + '</label>' +
                 '<div class="errorForm" hidden></div>' +
               '</div>';
      };

      /* FILA DE LA TARJETA SELLADA: etiqueta-chica + valor. */
      var filaTarjeta = function (etiqueta, valor) {
        var v = String(valor == null ? '' : valor).trim();
        return '<div class="tarjeta-fila">' +
                 '<span class="tarjeta-label">' + _esc_(etiqueta) + '</span>' +
                 '<span class="tarjeta-valor' + (v ? '' : ' vacio') + '">' +
                   _esc_(v || '—') + '</span>' +
               '</div>';
      };

      var lugar = [String(perfil.ciudad || '').trim(),
                   String(perfil.municipio || '').trim(),
                   String(perfil.estado || '').trim()]
        .filter(function (t) { return t; }).join(' / ');

      var whatsapp = String(perfil.telefonoWhatsapp || '').trim();

      /* Los CINCO checks de la clave nacen apagados; render-
         ClaveChecks() los enciende en vivo mientras se teclea. */
      var checkHtml = CHECKS_CLAVE.map(function (c) {
        return '<span class="clave-check" data-regla="' + c.regla + '">' +
                 '<span class="ck" data-glifo="check" aria-hidden="true"></span>' +
                 c.texto + '</span>';
      }).join('');

      area.innerHTML =
        '<div class="perfil-wrap">' +

          /* SIN el nombre bajo el avatar (orden del dueño): es
             redundante — la tarjeta sellada lo muestra. */
          '<div class="perfil-hero">' +
            '<div class="perfil-avatar-zona">' +
              '<div class="perfil-avatar" id="perfilAvatar">' + avatar + '</div>' +
              '<button type="button" class="perfil-foto-btn" id="btnPerfilFoto" aria-label="Cambiar foto" data-glifo="camera"></button>' +
              '<input type="file" accept="image/*" class="perfil-input-foto" id="inputPerfilFoto">' +
            '</div>' +
            '<div class="perfil-foto-estado" id="perfilFotoEstado"></div>' +
          '</div>' +

          /* TARJETA SELLADA · solo la central escribe aquí. */
          '<div class="perfil-tarjeta" aria-label="Datos sellados — solo la central puede editarlos">' +
            '<span class="tarjeta-sello" data-glifo="candado" aria-hidden="true"></span>' +
            filaTarjeta('Nombre o Razón Social', perfil.nombre) +
            filaTarjeta('Ciudad / Municipio / Estado', lugar) +
            filaTarjeta('WhatsApp de contacto', whatsapp ? '+58 ' + whatsapp : '') +
          '</div>' +

          /* SEPARADOR · el lápiz abre la zona editable. */
          '<div class="perfil-separador">' +
            '<span class="sep-icono" data-glifo="lapiz" aria-hidden="true"></span>' +
            '<span class="sep-texto">Datos editables</span>' +
          '</div>' +

          '<form class="perfil-form" id="formPerfil" novalidate>' +

            /* BLOQUE 1 · Eslogan + Dirección Local (los ÚNICOS
               que el Guardar escribe; títulos SIN «(Opcional)»
               — orden del dueño) + UBICACIÓN GPS: el botón
               «Capturar ubicación GPS» es PARTE de este bloque
               de dirección — NO va separado (orden del dueño,
               correcciones 8) — y se viste con .botonCampo.
               Sin título de campo; su cuerpo lo pinta
               renderGps() según la dirección. */
            '<div class="form-bloque">' +
              campo('Eslogan', 'Eslogan', perfil.esloganPartner,
                    ' maxlength="120"') +
              campo('Direccion', 'Dirección Local', perfil.direccion,
                    ' maxlength="200" autocomplete="street-address"') +
              '<div class="form-field" id="fieldUbicacion">' +
                '<div class="gps-caja" id="gpsCaja"></div>' +
                '<div class="errorForm" hidden></div>' +
              '</div>' +
            '</div>' +

            /* BLOQUE 2 · Correo Electrónico — LÁPIZ (orden del
               dueño, correcciones 7): con datos el campo queda
               INACTIVO y el lápiz CUADRADO activo a la derecha;
               vacío se escribe directo y el lápiz duerme. Debajo,
               EN UNA FILA A PARTES IGUALES (correcciones 8),
               «Solicitar código» (.botonCampo, INACTIVO al nacer)
               + el campo «Ingresar Código» del OTP (INACTIVO al
               nacer). Editar = verificar, SIEMPRE: los estados
               los manda actualizarCorreoFlujo(). */
            '<div class="form-bloque">' +
              '<div class="correo-fila">' +
                '<div class="form-field" id="fieldCorreo">' +
                  '<input type="email" id="inputCorreo" placeholder=" " class="form-input campoEditable" maxlength="100" autocomplete="email" value="' +
                    _esc_(correoActual()) + '">' +
                  '<label for="inputCorreo" class="form-label">Correo Electrónico</label>' +
                  '<div class="errorForm" hidden></div>' +
                '</div>' +
                '<button type="button" class="perfil-btn-send" id="btnCorreoEditar" data-glifo="lapiz" aria-label="Editar correo" disabled></button>' +
              '</div>' +
              '<div class="correo-otp-fila">' +
                '<button type="button" class="correo-solicitar botonCampo" id="btnCorreoSolicitar" disabled>Solicitar código</button>' +
                '<div class="form-field otp-campo" id="fieldOtp">' +
                  '<input type="text" id="inputOtp" placeholder=" " class="form-input campoEditable" disabled maxlength="6" inputmode="numeric" autocomplete="one-time-code">' +
                  '<label for="inputOtp" class="form-label">Ingresar Código</label>' +
                  '<div class="errorForm" hidden></div>' +
                '</div>' +
              '</div>' +
            '</div>' +

            /* BLOQUE 3 · Clave de Usuario — write-only: la clave
               guardada JAMÁS viaja al teléfono. Puerta de
               identidad + nueva clave UNA vez + checks vivos
               debajo del campo (solamente ahí) + ojito sostenido.
               SIN botones secundarios abajo (orden del dueño,
               correcciones 7): cada campo lleva a su derecha el
               botón CUADRADO con el glifo enviar — el mismo de la
               sección «Preguntas y respuestas» del original — a
               la MISMA altura del campo (correcciones 8). */
            '<div class="form-bloque">' +
              '<div class="clave-fila">' +
                '<div class="form-field" id="fieldClaveActual">' +
                  '<input type="password" id="inputClaveActual" placeholder=" " class="form-input campoEditable con-ojo" autocomplete="current-password">' +
                  '<label for="inputClaveActual" class="form-label">Clave actual</label>' +
                  '<button type="button" class="ojito" id="ojitoClaveActual" data-glifo="ojo" aria-label="Mostrar la clave mientras se mantiene presionado"></button>' +
                  '<div class="errorForm" hidden></div>' +
                '</div>' +
                '<button type="button" class="perfil-btn-send" id="btnClaveVerificar" disabled aria-label="Verificar clave actual"><span data-glifo="enviar" aria-hidden="true"></span></button>' +
              '</div>' +
              '<div class="clave-fila">' +
                '<div class="form-field" id="fieldClaveNueva">' +
                  '<input type="password" id="inputClaveNueva" placeholder=" " class="form-input campoEditable con-ojo" disabled autocomplete="new-password">' +
                  '<label for="inputClaveNueva" class="form-label">Nueva clave</label>' +
                  '<button type="button" class="ojito" id="ojitoClaveNueva" data-glifo="ojo" disabled aria-label="Mostrar la nueva clave mientras se mantiene presionado"></button>' +
                  '<div class="clave-checks" id="claveChecks">' + checkHtml + '</div>' +
                  '<div class="errorForm" hidden></div>' +
                '</div>' +
                '<button type="button" class="perfil-btn-send" id="btnClaveGuardar" disabled aria-label="Guardar nueva clave"><span data-glifo="enviar" aria-hidden="true"></span></button>' +
              '</div>' +
            '</div>' +

            /* BLOQUE 4 · Guardar cambios (eslogan + dirección) —
               nace INACTIVO: solo despierta con cambios reales.
               El correo, la clave y el punto GPS NO pasan por
               aquí: son acciones sensibles que se comprometen
               dentro de su propio flujo. */
            '<div class="form-bloque">' +
              '<button type="submit" class="form-submit botonPrimario" id="btnPerfilGuardar" disabled>' +
                '<span class="form-submit-spinner" aria-hidden="true"></span>' +
                '<span class="form-submit-texto">Guardar cambios</span>' +
                '<span class="form-submit-check" data-glifo="check" aria-hidden="true" hidden></span>' +
              '</button>' +
            '</div>' +

          '</form>' +
        '</div>';

      if (typeof window.pintarGlifos === 'function') window.pintarGlifos(area);

      recogerEl();
      enganchar();
      repoblar(perfil);

      renderGps();
      actualizarCorreoFlujo();
      renderClaveChecks();

      /* El botón nace INACTIVO: el formulario acaba de llegar y
         aún no hay nada que asegurar (orden del dueño). */
      guardarOriginales(perfil);
      pintarBotonInactivo();
    }

    function recogerEl() {
      var area = document.getElementById('pantallaArea');
      if (!area) return;
      el = {
        avatar:        area.querySelector('#perfilAvatar'),
        fotoEstado:    area.querySelector('#perfilFotoEstado'),
        btnFoto:       area.querySelector('#btnPerfilFoto'),
        inputFoto:     area.querySelector('#inputPerfilFoto'),
        form:          area.querySelector('#formPerfil'),
        btnGuardar:    area.querySelector('#btnPerfilGuardar'),
        campos: {
          esloganPartner: area.querySelector('#fieldEslogan'),
          direccion:      area.querySelector('#fieldDireccion')
        },
        inputs: {
          esloganPartner: area.querySelector('#inputEslogan'),
          direccion:      area.querySelector('#inputDireccion')
        },
        /* Flujos sensibles */
        fieldUbicacion:    area.querySelector('#fieldUbicacion'),
        gpsCaja:           area.querySelector('#gpsCaja'),
        fieldCorreo:       area.querySelector('#fieldCorreo'),
        inputCorreo:       area.querySelector('#inputCorreo'),
        btnCorreoEditar:   area.querySelector('#btnCorreoEditar'),
        btnCorreoSolicitar:area.querySelector('#btnCorreoSolicitar'),
        fieldOtp:          area.querySelector('#fieldOtp'),
        inputOtp:          area.querySelector('#inputOtp'),
        fieldClaveActual: area.querySelector('#fieldClaveActual'),
        inputClaveActual: area.querySelector('#inputClaveActual'),
        ojitoClaveActual: area.querySelector('#ojitoClaveActual'),
        btnClaveVerificar: area.querySelector('#btnClaveVerificar'),
        fieldClaveNueva:  area.querySelector('#fieldClaveNueva'),
        inputClaveNueva:  area.querySelector('#inputClaveNueva'),
        ojitoClaveNueva:  area.querySelector('#ojitoClaveNueva'),
        claveChecks:      area.querySelector('#claveChecks'),
        btnClaveGuardar:  area.querySelector('#btnClaveGuardar')
      };
    }

    /* ============================================================
       CICLO DEL BOTÓN GUARDAR · orden del dueño:
       · INACTIVO al nacer y al quedar igual que el servidor.
       · ACTIVO cuando el formulario difiere de lo traído — el
         usuario SABE que debe guardar para asegurar su cambio.
       · PROCESANDO: spinner dentro del botón mientras viaja.
       · ÉXITO: check unos segundos y vuelve inactivo.
       ============================================================ */
    function guardarOriginales(perfil) {
      state.originales = {};
      Object.keys(REGLAS).forEach(function (clave) {
        var v = String((perfil && perfil[clave] != null) ? perfil[clave] : '').trim();
        state.originales[clave] = v;
      });
    }

    function hayCambios() {
      if (!state.originales) return false;
      for (var clave in REGLAS) {
        if (!Object.prototype.hasOwnProperty.call(REGLAS, clave)) continue;
        var input = el.inputs[clave];
        if (!input) continue;
        var v = String(input.value || '').trim();
        if (v !== state.originales[clave]) return true;
      }
      return false;
    }

    function _textoBoton(t) {
      var span = el.btnGuardar && el.btnGuardar.querySelector('.form-submit-texto');
      if (span) span.textContent = t;
    }

    function _checkBoton(mostrar) {
      var span = el.btnGuardar && el.btnGuardar.querySelector('.form-submit-check');
      if (span) span.hidden = !mostrar;
    }

    function pintarBotonInactivo() {
      if (!el.btnGuardar) return;
      el.btnGuardar.classList.remove('procesando', 'exito');
      el.btnGuardar.disabled = true;
      _checkBoton(false);
      _textoBoton('Guardar cambios');
    }

    function pintarBotonActivo() {
      if (!el.btnGuardar) return;
      el.btnGuardar.classList.remove('procesando', 'exito');
      el.btnGuardar.disabled = false;
      _checkBoton(false);
      _textoBoton('Guardar cambios');
    }

    function pintarBotonProcesando() {
      if (!el.btnGuardar) return;
      el.btnGuardar.classList.remove('exito');
      el.btnGuardar.classList.add('procesando');
      el.btnGuardar.disabled = true;
      _checkBoton(false);
      _textoBoton('Guardando…');
    }

    function pintarBotonExito() {
      if (!el.btnGuardar) return;
      el.btnGuardar.classList.remove('procesando');
      el.btnGuardar.classList.add('exito');
      el.btnGuardar.disabled = true;
      _checkBoton(true);
      _textoBoton('Guardado');
    }

    function refrescarBoton() {
      if (!el.btnGuardar || state.guardando) return;
      if (hayCambios()) pintarBotonActivo();
      else pintarBotonInactivo();
    }

    /* ============================================================
       ENGANCHAR · flotantes + validación viva (molde Reserva).
       El validador es EL CENTRAL (Validaciones.validarPerfil-
       Campo — mismo contrato { ok · vacio|largo|corto }).
       ============================================================ */
    function refrescarCampo(clave) {
      var field = el.campos[clave];
      var input = el.inputs[clave];
      if (!field || !input) return;

      if (String(input.value || '').trim() || document.activeElement === input) {
        field.classList.add('activo');
      } else {
        field.classList.remove('activo');
      }

      var res = window.Validaciones.validarPerfilCampo(clave, input.value);
      if (!String(input.value).trim()) {
        field.classList.remove('invalido');
      } else if (!res.ok) {
        if (res.largo) {
          field.classList.add('invalido');
        } else if (!res.vacio) {
          field.classList.add('invalido');
        } else {
          field.classList.remove('invalido');
        }
      } else {
        field.classList.remove('invalido');
      }
    }

    function enganchar() {
      Object.keys(el.inputs).forEach(function (clave) {
        var input = el.inputs[clave];
        if (!input || input.dataset.bound === '1') return;
        input.dataset.bound = '1';

        input.addEventListener('focus', function () { refrescarCampo(clave); });
        input.addEventListener('blur',  function () { refrescarCampo(clave); });
        input.addEventListener('input', function () {
          refrescarCampo(clave);
          refrescarBoton();
          /* La captura GPS se activa con lo que el partner
             ESCRIBE — la dirección vive en vivo (orden del
             dueño). */
          if (clave === 'direccion') renderGps();
        });
      });

      if (el.form && el.form.dataset.bound !== '1') {
        el.form.dataset.bound = '1';
        el.form.addEventListener('submit', function (e) {
          e.preventDefault();
          onGuardar();
        });
      }

      if (el.btnFoto && el.btnFoto.dataset.bound !== '1') {
        el.btnFoto.dataset.bound = '1';
        el.btnFoto.addEventListener('click', function () {
          if (state.subiendo) return;
          if (el.inputFoto) el.inputFoto.click();
        });
      }

      if (el.inputFoto && el.inputFoto.dataset.bound !== '1') {
        el.inputFoto.dataset.bound = '1';
        el.inputFoto.addEventListener('change', function () {
          var file = el.inputFoto.files && el.inputFoto.files[0];
          el.inputFoto.value = '';
          if (file) convertirYSubir(file);
        });
      }

      /* ---- OJITO · click sostenido (mostrar mientras se
         presiona, ocultar al soltar — orden del dueño). ---- */
      engancharOjito(el.ojitoClaveActual, el.inputClaveActual);
      engancharOjito(el.ojitoClaveNueva,  el.inputClaveNueva);

      /* ---- Correo: lápiz · solicitar · OTP auto-verificada ---- */
      if (el.inputCorreo && el.inputCorreo.dataset.bound !== '1') {
        el.inputCorreo.dataset.bound = '1';
        el.inputCorreo.addEventListener('focus', function () {
          el.fieldCorreo.classList.add('activo');
        });
        el.inputCorreo.addEventListener('blur', function () {
          actualizarCorreoFlujo();
        });
        el.inputCorreo.addEventListener('input', function () {
          errorCampo(el.fieldCorreo, '');
          actualizarCorreoFlujo();
        });
      }
      if (el.btnCorreoEditar && el.btnCorreoEditar.dataset.bound !== '1') {
        el.btnCorreoEditar.dataset.bound = '1';
        el.btnCorreoEditar.addEventListener('click', onCorreoEditar);
      }
      if (el.btnCorreoSolicitar && el.btnCorreoSolicitar.dataset.bound !== '1') {
        el.btnCorreoSolicitar.dataset.bound = '1';
        el.btnCorreoSolicitar.addEventListener('click', onCorreoSolicitar);
      }
      if (el.inputOtp && el.inputOtp.dataset.bound !== '1') {
        el.inputOtp.dataset.bound = '1';
        el.inputOtp.addEventListener('focus', function () {
          el.fieldOtp.classList.add('activo');
        });
        el.inputOtp.addEventListener('input', function () {
          var limpio = el.inputOtp.value.replace(/\D/g, '').slice(0, 6);
          if (limpio !== el.inputOtp.value) el.inputOtp.value = limpio;
          errorCampo(el.fieldOtp, '');
          /* AUTO-VERIFICAR al sexto dígito (sin botón: la fila es
             solicitar + campo — orden del dueño). */
          if (limpio.length === 6) onCorreoVerificar();
        });
      }

      /* ---- Clave: la puerta + la nueva ---- */
      if (el.inputClaveActual && el.inputClaveActual.dataset.bound !== '1') {
        el.inputClaveActual.dataset.bound = '1';
        el.inputClaveActual.addEventListener('focus', function () {
          el.fieldClaveActual.classList.add('activo');
        });
        el.inputClaveActual.addEventListener('blur', function () {
          if (!String(el.inputClaveActual.value || '').trim()) {
            el.fieldClaveActual.classList.remove('activo');
          }
        });
        el.inputClaveActual.addEventListener('input', function () {
          errorCampo(el.fieldClaveActual, '');
          /* Editar la clave actual CIERRA la puerta verificada:
             el check no puede quedar encendido si la clave que lo
             abrió cambió — la identidad se vuelve a verificar. */
          if (state.claveVerificada) {
            cerrarPuertaClave();
          }
          el.btnClaveVerificar.disabled =
            !String(el.inputClaveActual.value || '').trim();
        });
      }
      if (el.btnClaveVerificar && el.btnClaveVerificar.dataset.bound !== '1') {
        el.btnClaveVerificar.dataset.bound = '1';
        el.btnClaveVerificar.addEventListener('click', onClaveVerificar);
      }
      if (el.inputClaveNueva && el.inputClaveNueva.dataset.bound !== '1') {
        el.inputClaveNueva.dataset.bound = '1';
        el.inputClaveNueva.addEventListener('focus', function () {
          el.fieldClaveNueva.classList.add('activo');
        });
        el.inputClaveNueva.addEventListener('blur', function () {
          if (!String(el.inputClaveNueva.value || '').trim()) {
            el.fieldClaveNueva.classList.remove('activo');
          }
        });
        el.inputClaveNueva.addEventListener('input', function () {
          errorCampo(el.fieldClaveNueva, '');
          renderClaveChecks();
        });
      }
      if (el.btnClaveGuardar && el.btnClaveGuardar.dataset.bound !== '1') {
        el.btnClaveGuardar.dataset.bound = '1';
        el.btnClaveGuardar.addEventListener('click', onClaveGuardar);
      }
    }

    /* OJITO SOSTENIDO: pointerdown muestra, soltar/salir/cancelar
       oculta. Sin toggle: ver mientras presionas (orden del
       dueño). El long-press del móvil no abre menú ni selección. */
    function engancharOjito(btn, input) {
      if (!btn || !input || btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';

      var mostrar = function (e) {
        e.preventDefault();
        if (input.disabled) return;
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

    function repoblar(perfil) {
      Object.keys(el.inputs).forEach(function (clave) {
        var input = el.inputs[clave];
        if (input) {
          /* El valor del SERVIDOR manda SIEMPRE (también el
             vacío: si el partner limpió un campo opcional, el
             input nace limpio — igual que la BD). */
          input.value = String(perfil && perfil[clave] != null ? perfil[clave] : '').trim();
          if (input.value) {
            el.campos[clave].classList.add('activo');
          }
        }
        refrescarCampo(clave);
      });
    }

    /* ============================================================
       GUARDAR · guardarPerfil (el backend revalida y hace el
       MERGE de eslogan y dirección — SOLO esas dos llaves; la
       tarjeta sellada es de la central).
       ============================================================ */
    function onGuardar() {
      if (state.guardando) return;
      /* Sin cambios reales no hay guardado (el botón está
         inactivo; esta guardia cubre también el Enter suelto
         dentro del formulario). */
      if (!hayCambios()) return;
      limpiarErrores();

      var primerInvalido = null;
      var datos = {};

      Object.keys(REGLAS).forEach(function (clave) {
        var res = window.Validaciones.validarPerfilCampo(clave, el.inputs[clave].value);
        if (res.ok) {
          datos[clave] = res.valor;
          return;
        }
        var field = el.campos[clave];
        field.classList.add('invalido');

        var mensaje;
        if (res.vacio)    mensaje = 'Este dato es obligatorio.';
        else if (res.largo) mensaje = 'Demasiado largo (máximo ' + REGLAS[clave].max + ' caracteres).';
        else              mensaje = 'Revisa este dato.';
        errorCampo(field, mensaje);

        if (!primerInvalido) primerInvalido = el.inputs[clave];
      });

      if (primerInvalido) {
        haptic([30, 20, 30]);
        try { primerInvalido.focus(); } catch (_) {}
        return;
      }

      var p = partner();
      if (!p || !p.id) return;

      state.guardando = true;
      pintarBotonProcesando();

      postBackend('guardarPerfil', {
        idPartner: String(p.id),
        perfil:    datos
      })
        .then(function (data) {
          state.guardando = false;

          /* El servidor manda el perfil FRESCO: la foto de
             referencia se actualiza, el formulario queda igual
             que la BD — sin cambios pendientes que asegurar — y
             la LLAVE DE SESIÓN se refresca (próximo click a
             Perfil pinta instantáneo con el dato nuevo). Si la
             dirección quedó vacía, el punto GPS murió con ella
             (backend) y renderGps lo refleja. */
          var fresco = (data && data.perfil) || {};
          state.datos = fresco;
          guardarOriginales(fresco);
          repoblar(fresco);

          var pCache = partner();
          if (pCache && window.Partner && window.Partner.cachePerfil) {
            window.Partner.cachePerfil.guardar(pCache.id, fresco);
          }
          renderGps();

          /* ÉXITO VISIBLE (orden del dueño): el botón muestra el
             check unos segundos y vuelve solo a su estado
             inactivo. Sin aviso flotante: el feedback es EL
             BOTÓN. */
          haptic([30, 20, 30]);
          pintarBotonExito();
          if (timerExito) clearTimeout(timerExito);
          timerExito = setTimeout(function () {
            timerExito = null;
            if (el.btnGuardar) pintarBotonInactivo();
          }, 2600);
        })
        .catch(function (err) {
          state.guardando = false;
          haptic([30, 20, 30]);

          var msg = (err && err.message) || '';
          var m = /^(CAMPO_VACIO|CAMPO_INVALIDO|LONGITUD_INVALIDA|RANGO_INVALIDO|ID_INVALIDO):(.+)$/.exec(msg);
          if (m) {
            var clave = String(m[2]);
            if (/^[A-Z0-9_]+$/.test(clave)) clave = clave.toLowerCase();
            var field = el.campos[clave];
            if (field) {
              field.classList.add('invalido');
              errorCampo(field, m[1] === 'CAMPO_VACIO'
                ? 'Este dato es obligatorio.'
                : 'Revisa este dato.');
              try { field.querySelector('.form-input').focus(); } catch (_) {}
              refrescarBoton();
              return;
            }
            errorFlujo('Revisa los datos e intenta de nuevo.');
            refrescarBoton();
            return;
          }
          if (msg.indexOf('RATE_LIMIT') === 0) {
            errorFlujo('Demasiados intentos seguidos. Espera un momento.');
            refrescarBoton();
            return;
          }
          if (msg === 'SISTEMA_OCUPADO') {
            errorFlujo('El sistema está ocupado. Intenta de nuevo en unos segundos.');
            refrescarBoton();
            return;
          }
          if (msg === 'TOKEN_INVALIDO') {
            refrescarBoton();
            return; /* el puente ya repuso la sesión */
          }
          errorFlujo('No se pudo guardar. Intenta de nuevo.');
          refrescarBoton();
          console.error('[Perfil] guardar falló:', msg);
        });
    }

    function errorFlujo(texto) {
      if (!el.form) return;
      var slot = el.form.querySelector('#errorFlujoPerfil');
      if (!slot) {
        slot = document.createElement('div');
        slot.className = 'errorForm';
        slot.id = 'errorFlujoPerfil';
        el.form.insertBefore(slot, el.btnGuardar);
      }
      slot.textContent = texto || '';
      slot.hidden = !texto;
    }

    /* ============================================================
       UBICACIÓN EN EL MAPA (Tanda 1) · nace BLOQUEADA y SOLO se
       activa con dirección escrita (orden del dueño). Captura el
       GPS DEL TELÉFONO con el partner en su local; el punto se
       confirma DENTRO de su propio flujo (mini mapa + botón) y
       muere si la dirección queda vacía (backend).
       ============================================================ */
    function renderGps() {
      if (!el.gpsCaja) return;
      var tieneDireccion = direccionActual().length > 0;
      el.fieldUbicacion.classList.toggle('activo', tieneDireccion);

      /* Sin dirección: bloqueado (y cualquier captura pendiente
         muere — sin ancla no hay punto). */
      if (!tieneDireccion) {
        state.gpsPendiente = '';
        el.gpsCaja.innerHTML =
          '<div class="gps-inactivo">Escribe tu Dirección Local para activar la captura de tu punto en el mapa.</div>';
        return;
      }

      var guardado = String((state.datos && state.datos.ubicacionGps) || '').trim();

      /* PREVIEW · punto capturado sin confirmar. */
      if (state.gpsPendiente) {
        el.gpsCaja.innerHTML =
          '<iframe class="gps-mapa" src="https://maps.google.com/maps?q=' +
            encodeURIComponent(state.gpsPendiente) +
            '&z=17&output=embed" loading="lazy" title="Ubicación capturada"></iframe>' +
          '<div class="gps-coords">' + _esc_(state.gpsPendiente) + '</div>' +
          '<div class="gps-acciones">' +
            '<button type="button" class="perfil-btn-flujo" id="btnGpsConfirmar">Confirmar punto</button>' +
            '<button type="button" class="perfil-btn-fantasma" id="btnGpsReintentar">Volver a capturar</button>' +
          '</div>';
        var conf = document.getElementById('btnGpsConfirmar');
        var rei  = document.getElementById('btnGpsReintentar');
        if (conf) conf.addEventListener('click', function () { guardarGps(state.gpsPendiente); });
        if (rei)  rei.addEventListener('click', capturarGps);
        return;
      }

      /* LISTO · punto guardado: check + coords + mapa + recaptura. */
      if (guardado) {
        el.gpsCaja.innerHTML =
          '<div class="gps-listo-linea">' +
            '<span class="correo-check" data-glifo="check" aria-hidden="true"></span>' +
            '<span class="gps-coords gps-coords-listo">' + _esc_(guardado) + '</span>' +
          '</div>' +
          '<iframe class="gps-mapa" src="https://maps.google.com/maps?q=' +
            encodeURIComponent(guardado) +
            '&z=17&output=embed" loading="lazy" title="Ubicación guardada"></iframe>' +
          '<div class="gps-acciones">' +
            '<button type="button" class="perfil-btn-fantasma" id="btnGpsRecapturar">Volver a capturar</button>' +
          '</div>';
        var rec = document.getElementById('btnGpsRecapturar');
        if (rec) rec.addEventListener('click', capturarGps);
        if (typeof window.pintarGlifos === 'function') window.pintarGlifos(el.gpsCaja);
        return;
      }

      /* ACTIVO · sin punto aún: el botón «Capturar ubicación
         GPS» PARTE del bloque de dirección (correcciones 8) y
         vestido con la tipografía central .botonCampo. */
      el.gpsCaja.innerHTML =
        '<button type="button" class="gps-btn-capturar botonCampo" id="btnGpsCapturar">Capturar ubicación GPS</button>';
      var cap = document.getElementById('btnGpsCapturar');
      if (cap) cap.addEventListener('click', capturarGps);
    }

    function capturarGps() {
      errorCampo(el.fieldUbicacion, '');

      if (!navigator.geolocation) {
        errorCampo(el.fieldUbicacion, 'Tu dispositivo no puede compartir ubicación.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        function (pos) {
          var lat = Number(pos.coords.latitude).toFixed(6);
          var lng = Number(pos.coords.longitude).toFixed(6);
          state.gpsPendiente = lat + ',' + lng;
          renderGps();
        },
        function () {
          errorCampo(el.fieldUbicacion,
            'No pudimos leer tu ubicación. Revisa el permiso, póntete en el local e intenta de nuevo.');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }

    function guardarGps(valor) {
      if (state.gpsEnCurso) return;
      var p = partner();
      if (!p || !p.id) return;

      var res = window.Validaciones.validarUbicacionGps(valor);
      if (!res.ok || !res.valor) {
        errorCampo(el.fieldUbicacion, 'El punto no tiene el formato correcto.');
        return;
      }

      state.gpsEnCurso = true;
      var btn = document.getElementById('btnGpsConfirmar');
      if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }

      postBackend('guardarUbicacionGps', {
        idPartner:    String(p.id),
        ubicacionGps: res.valor
      })
        .then(function (data) {
          state.gpsEnCurso = false;
          state.gpsPendiente = '';
          aplicarFresco((data && data.perfil) || {});
          haptic([30, 20, 30]);
          _aviso('Punto de ubicación guardado');
        })
        .catch(function (err) {
          state.gpsEnCurso = false;
          renderGps();

          var msg = (err && err.message) || '';
          if (msg === 'DIRECCION_REQUERIDA') {
            errorCampo(el.fieldUbicacion, 'Primero guarda tu Dirección Local.');
          } else if (msg === 'GPS_FORMATO_INVALIDO') {
            errorCampo(el.fieldUbicacion, 'El punto no tiene el formato correcto.');
          } else if (msg.indexOf('RATE_LIMIT') === 0) {
            errorCampo(el.fieldUbicacion, 'Espera un momento e intenta de nuevo.');
          } else if (msg === 'SISTEMA_OCUPADO') {
            errorCampo(el.fieldUbicacion, 'El sistema está ocupado. Intenta en unos segundos.');
          } else if (msg === 'TOKEN_INVALIDO') {
            /* el puente ya repuso la sesión */
          } else {
            errorCampo(el.fieldUbicacion, 'No se pudo guardar el punto. Intenta de nuevo.');
            console.error('[Perfil] GPS falló:', msg);
          }
        });
    }

    /* ============================================================
       CORREO · LÁPIZ (correcciones 7, orden del dueño). Una sola
       tela sin pasos: el campo con su lápiz CUADRADO a la derecha
       y debajo, EN UNA FILA A PARTES IGUALES (correcciones 8),
       «Solicitar código» + «Ingresar Código».
       · Con datos: campo INACTIVO, lápiz ACTIVO (tocarlo entra a
         edición; tocarlo de nuevo regresa al sellado — sin botón
         cancelar).
       · Vacío: se escribe directo y el lápiz duerme.
       · «Solicitar…» solo despierta con correo válido EN MODO
         EDICIÓN. Al pedir código: lápiz INACTIVO, correo
         bloqueado y «Ingresar Código» DESPIERTA (si y solo si se
         solicitó un código).
       · El OTP se auto-verifica al sexto dígito; el éxito sella
         el correo, el lápiz vuelve y los otros dos quedan
         bloqueados.
       ============================================================ */
    function correoGuardado() {
      return String((state.datos && state.datos.correo) || '').trim();
    }

    function ponerCorreoGuardado() {
      if (el.inputCorreo) el.inputCorreo.value = correoGuardado();
    }

    function actualizarCorreoFlujo() {
      if (!el.inputCorreo || !el.fieldCorreo) return;

      var guardado = correoGuardado();
      var enFlujo = state.correoPaso === 'verificando';

      /* CAMPO · INACTIVO sellado con datos o con OTP en proceso;
         ACTIVO para escribir en registro (vacío) y en edición. */
      var bloqueado = enFlujo ||
        (state.correoPaso === 'sellado' && !!guardado);
      el.inputCorreo.disabled = bloqueado;

      var valor = String(el.inputCorreo.value || '').trim();
      el.fieldCorreo.classList.toggle('activo',
        !!valor || document.activeElement === el.inputCorreo);

      /* LÁPIZ · activo SOLO si hay correo guardado que editar y
         el OTP está quieto (orden del dueño). */
      el.btnCorreoEditar.disabled =
        enFlujo || (state.correoPaso === 'sellado' && !guardado);

      /* SOLICITAR · vivo SOLO con correo válido EN MODO EDICIÓN. */
      var modoEdicion = (state.correoPaso === 'editando') ||
        (state.correoPaso === 'sellado' && !guardado);
      var activo = modoEdicion && !state.correoEnCurso &&
        window.Validaciones.validarCorreoNuevo(
          String(el.inputCorreo.value || ''), correoActual()).ok;
      el.btnCorreoSolicitar.disabled = !activo;
      if (!state.correoEnCurso) {
        el.btnCorreoSolicitar.textContent = 'Solicitar código';
      }

      /* INGRESAR CÓDIGO · vivo SI Y SOLO SI se solicitó un
         código y la validación OTP está en proceso. */
      el.inputOtp.disabled = !enFlujo;
      if (!enFlujo && !state.correoEnCurso) el.inputOtp.value = '';
      el.fieldOtp.classList.toggle('activo', enFlujo);
    }

    /* El lápiz: entra y sale de la edición (el vaivén sustituye
       al botón cancelar que murió — orden del dueño). */
    function onCorreoEditar() {
      if (state.correoPaso === 'verificando') return;
      errorCampo(el.fieldCorreo, '');

      if (state.correoPaso === 'sellado') {
        state.correoPaso = 'editando';
        el.inputCorreo.value = '';          /* el nuevo se escribe de cero */
        try { el.inputCorreo.focus(); } catch (_) {}
      } else {
        state.correoPaso = 'sellado';       /* regreso al sellado */
        state.correoEnviadoA = '';
        ponerCorreoGuardado();
      }
      actualizarCorreoFlujo();
    }

    function _mensajeCorreo(res) {
      if (res.vacio)   return 'Escribe el correo nuevo.';
      if (res.largo)   return 'Demasiado largo (máximo 100 caracteres).';
      if (res.formato) return 'Revisa el formato del correo.';
      if (res.igual)   return 'Es el mismo correo que ya tienes.';
      return 'Revisa este dato.';
    }

    function onCorreoSolicitar() {
      if (state.correoEnCurso) return;
      var p = partner();
      if (!p || !p.id) return;

      var res = window.Validaciones.validarCorreoNuevo(
        el.inputCorreo.value, correoActual());
      if (!res.ok) {
        errorCampo(el.fieldCorreo, _mensajeCorreo(res));
        if (res.vacio) { try { el.inputCorreo.focus(); } catch (_) {} }
        return;
      }

      state.correoEnviadoA = res.valor;
      state.correoEnCurso = true;
      el.btnCorreoSolicitar.disabled = true;
      el.btnCorreoSolicitar.textContent = 'Enviando…';
      errorCampo(el.fieldCorreo, '');

      postBackend('otpCorreoSolicitar', {
        idPartner:  String(p.id),
        correoNuevo: res.valor
      })
        .then(function () {
          state.correoEnCurso = false;
          state.correoPaso = 'verificando';
          actualizarCorreoFlujo();
          try { el.inputOtp.focus(); } catch (_) {}
        })
        .catch(function (err) {
          state.correoEnCurso = false;
          state.correoPaso = correoGuardado() ? 'editando' : 'sellado';
          actualizarCorreoFlujo();

          var msg = (err && err.message) || '';
          if (msg === 'CORREO_EN_USO') {
            errorCampo(el.fieldCorreo, 'Ese correo ya pertenece a otro partner.');
          } else if (msg === 'CORREO_IGUAL_ACTUAL') {
            errorCampo(el.fieldCorreo, 'Es el mismo correo que ya tienes.');
          } else if (msg === 'CORREO_NO_ENVIADO') {
            errorCampo(el.fieldCorreo, 'No pudimos enviar el correo. Intenta de nuevo.');
          } else if (msg.indexOf('RATE_LIMIT') === 0) {
            errorCampo(el.fieldCorreo, 'Espera un momento para pedir otro código.');
          } else if (msg === 'TOKEN_INVALIDO' || msg === 'SISTEMA_OCUPADO') {
            /* el puente repuso la sesión / ocupado momentáneo */
          } else {
            errorCampo(el.fieldCorreo, 'No se pudo iniciar la verificación. Intenta de nuevo.');
            console.error('[Perfil] OTP correo falló:', msg);
          }
        });
    }

    function onCorreoVerificar() {
      if (!el.inputOtp || state.correoEnCurso) return;
      var p = partner();
      if (!p || !p.id) return;

      var res = window.Validaciones.validarCodigoOtp(el.inputOtp.value);
      if (!res.ok) {
        errorCampo(el.fieldOtp, res.vacio
          ? 'Escribe el código de 6 dígitos.'
          : 'El código son exactamente 6 dígitos.');
        return;
      }

      state.correoEnCurso = true;
      el.inputOtp.disabled = true;
      errorCampo(el.fieldOtp, '');

      /* Verificar deja la MARCA (30 min) y el cambio la CONSUME:
         sin verificación fresca, el correo no se escribe — ni
         manipulando la pantalla (guardia del backend). */
      postBackend('otpCorreoVerificar', {
        idPartner:   String(p.id),
        correoNuevo: state.correoEnviadoA,
        codigo:      res.valor
      })
        .then(function () {
          return postBackend('cambiarCorreo', {
            idPartner:   String(p.id),
            correoNuevo: state.correoEnviadoA
          });
        })
        .then(function (data) {
          state.correoEnCurso = false;
          state.correoPaso = 'sellado';
          state.correoEnviadoA = '';
          aplicarFresco((data && data.perfil) || {});
          haptic([30, 20, 30]);
          _aviso('Correo actualizado');
        })
        .catch(function (err) {
          state.correoEnCurso = false;

          var msg = (err && err.message) || '';
          if (msg === 'OTP_EXPIRADO' || msg === 'OTP_INTENTOS_AGOTADOS' ||
              msg === 'SIN_VERIFICACION_OTP' || msg === 'CORREO_EN_USO') {
            /* La verificación MURIÓ: el campo OTP se bloquea y
               queda el correo en edición para pedir otro código. */
            state.correoPaso = correoGuardado() ? 'editando' : 'sellado';
            actualizarCorreoFlujo();
            errorCampo(el.fieldOtp, msg === 'CORREO_EN_USO'
              ? 'Ese correo ya pertenece a otro partner.'
              : 'El código venció o se agotó. Pide uno nuevo.');
            return;
          }

          /* Código equivocado o tropiezo pasajero: el OTP sigue
             vivo — se limpia y se puede reintentar. */
          el.inputOtp.disabled = false;
          el.inputOtp.value = '';
          try { el.inputOtp.focus(); } catch (_) {}

          if (msg === 'OTP_INCORRECTO' || msg === 'OTP_INVALIDO') {
            errorCampo(el.fieldOtp, 'El código no coincide. Revisa e intenta de nuevo.');
          } else if (msg.indexOf('RATE_LIMIT') === 0) {
            errorCampo(el.fieldOtp, 'Demasiados intentos. Espera un momento.');
          } else if (msg === 'SISTEMA_OCUPADO') {
            errorCampo(el.fieldOtp, 'El sistema está ocupado. Intenta en unos segundos.');
          } else if (msg === 'TOKEN_INVALIDO') {
            /* el puente ya repuso la sesión */
          } else {
            errorCampo(el.fieldOtp, 'No se pudo confirmar el cambio. Intenta de nuevo.');
            console.error('[Perfil] cambio de correo falló:', msg);
          }
        });
    }

    /* ============================================================
       CLAVE (Tanda 1) · write-only: la clave guardada JAMÁS viaja
       al teléfono. La puerta: la clave ACTUAL se verifica primero
       y la «Nueva clave» nace BLOQUEADA (orden del dueño). La
       nueva se pide UNA sola vez, con los checks vivos debajo del
       campo. El backend RE-verifica la actual y escribe el hash.
       ============================================================ */
    function renderClaveChecks() {
      if (!el.claveChecks || !el.inputClaveNueva) return;

      var res = window.Validaciones.validarClaveNueva(
        el.inputClaveNueva.value, correoActual());

      var items = el.claveChecks.querySelectorAll('.clave-check');
      for (var i = 0; i < items.length; i++) {
        var regla = items[i].getAttribute('data-regla');
        items[i].classList.toggle('cumple', !!res.checks[regla]);
      }

      /* El botón solo despierta con la puerta abierta Y la clave
         pasando las cinco reglas. */
      if (el.btnClaveGuardar && !state.claveEnCurso) {
        el.btnClaveGuardar.disabled = !(state.claveVerificada && res.ok);
      }
    }

    /* Glifo del botón de campo: enviar (espera) · check (verificado). */
    function _glifoBoton(btn, clave) {
      if (!btn) return;
      btn.innerHTML = '<span data-glifo="' + clave + '" aria-hidden="true"></span>';
      if (typeof window.pintarGlifos === 'function') window.pintarGlifos(btn);
    }

    /* La puerta de identidad se CIERRA: la nueva clave vuelve a
       nacer bloqueada y el botón vuelve al glifo enviar. */
    function cerrarPuertaClave() {
      state.claveVerificada = false;
      if (el.inputClaveNueva) {
        el.inputClaveNueva.value = '';
        el.inputClaveNueva.disabled = true;
      }
      if (el.ojitoClaveNueva) el.ojitoClaveNueva.disabled = true;
      if (el.fieldClaveNueva) el.fieldClaveNueva.classList.remove('activo');
      el.btnClaveVerificar.classList.remove('verificada');
      _glifoBoton(el.btnClaveVerificar, 'enviar');
      errorCampo(el.fieldClaveNueva, '');
      renderClaveChecks();
    }

    function onClaveVerificar() {
      if (state.claveEnCurso) return;
      var p = partner();
      if (!p || !p.id) return;

      var res = window.Validaciones.validarClaveActual(
        el.inputClaveActual ? el.inputClaveActual.value : '');
      if (!res.ok) {
        errorCampo(el.fieldClaveActual, res.vacio
          ? 'Escribe tu clave actual.'
          : 'Demasiado larga (máximo 40 caracteres).');
        if (el.inputClaveActual && res.vacio) {
          try { el.inputClaveActual.focus(); } catch (_) {}
        }
        return;
      }

      state.claveEnCurso = true;
      el.btnClaveVerificar.disabled = true;

      postBackend('verificarClaveActual', {
        idPartner:   String(p.id),
        claveActual: res.valor
      })
        .then(function () {
          state.claveEnCurso = false;
          state.claveVerificada = true;

          /* La puerta ABRE: el check verde marca la identidad
             verificada y la nueva clave DESPIERTA (orden del
             dueño). El botón queda sellado — ya no hay nada que
             verificar. */
          el.btnClaveVerificar.classList.add('verificada');
          el.btnClaveVerificar.disabled = true;
          _glifoBoton(el.btnClaveVerificar, 'check');

          el.inputClaveNueva.disabled = false;
          el.ojitoClaveNueva.disabled = false;
          errorCampo(el.fieldClaveActual, '');
          renderClaveChecks();
          try { el.inputClaveNueva.focus(); } catch (_) {}
        })
        .catch(function (err) {
          state.claveEnCurso = false;
          el.btnClaveVerificar.disabled =
            !String((el.inputClaveActual && el.inputClaveActual.value) || '').trim();
          _glifoBoton(el.btnClaveVerificar, 'enviar');

          var msg = (err && err.message) || '';
          if (msg === 'CLAVE_ACTUAL_INVALIDA') {
            errorCampo(el.fieldClaveActual, 'La clave actual no coincide.');
          } else if (msg.indexOf('RATE_LIMIT') === 0) {
            errorCampo(el.fieldClaveActual, 'Demasiados intentos. Espera un momento.');
          } else if (msg === 'SISTEMA_OCUPADO') {
            errorCampo(el.fieldClaveActual, 'El sistema está ocupado. Intenta en unos segundos.');
          } else if (msg === 'TOKEN_INVALIDO') {
            /* el puente ya repuso la sesión */
          } else {
            errorCampo(el.fieldClaveActual, 'No se pudo verificar. Intenta de nuevo.');
            console.error('[Perfil] verificación de clave falló:', msg);
          }
        });
    }

    function onClaveGuardar() {
      if (state.claveEnCurso || !state.claveVerificada) return;
      var p = partner();
      if (!p || !p.id) return;

      var res = window.Validaciones.validarClaveNueva(
        el.inputClaveNueva.value, correoActual());
      if (!res.ok) {
        errorCampo(el.fieldClaveNueva, _mensajeClave(res));
        return;
      }

      state.claveEnCurso = true;
      el.btnClaveGuardar.disabled = true;

      /* El backend RE-verifica la clave actual DENTRO del lock:
         la puerta no es solo visual. */
      postBackend('cambiarClave', {
        idPartner:   String(p.id),
        claveActual: String(el.inputClaveActual.value || ''),
        claveNueva:  res.valor
      })
        .then(function () {
          state.claveEnCurso = false;

          /* El flujo vuelve a nacer: sin claves escritas, puerta
             cerrada, checks apagados. */
          if (el.inputClaveActual) el.inputClaveActual.value = '';
          if (el.fieldClaveActual) el.fieldClaveActual.classList.remove('activo');
          el.btnClaveVerificar.disabled = true;
          cerrarPuertaClave();
          errorCampo(el.fieldClaveActual, '');

          haptic([30, 20, 30]);
          _aviso('Clave actualizada');
        })
        .catch(function (err) {
          state.claveEnCurso = false;
          renderClaveChecks();

          var msg = (err && err.message) || '';
          if (msg === 'CLAVE_ACTUAL_INVALIDA') {
            errorCampo(el.fieldClaveActual, 'La clave actual ya no coincide. Verifícala de nuevo.');
            /* La puerta se cierra de verdad: la identidad debe
               re-verificarse antes del siguiente intento. */
            cerrarPuertaClave();
            el.btnClaveVerificar.disabled = false;
          } else if (msg.indexOf('CLAVE_DEBIL:') === 0) {
            errorCampo(el.fieldClaveNueva,
              'Falta: ' + _textoRegla(msg.substring('CLAVE_DEBIL:'.length)));
          } else if (msg === 'CLAVE_IGUAL_CORREO') {
            errorCampo(el.fieldClaveNueva, 'No puede ser igual a tu correo.');
          } else if (msg === 'CLAVE_PROHIBIDA') {
            errorCampo(el.fieldClaveNueva, 'Esa clave es demasiado común. Elige otra.');
          } else if (msg === 'LONGITUD_INVALIDA:claveNueva') {
            errorCampo(el.fieldClaveNueva, 'Demasiado larga (máximo 40 caracteres).');
          } else if (msg.indexOf('RATE_LIMIT') === 0) {
            errorCampo(el.fieldClaveNueva, 'Llegaste al tope de cambios de hoy. Intenta mañana.');
          } else if (msg === 'SISTEMA_OCUPADO') {
            errorCampo(el.fieldClaveNueva, 'El sistema está ocupado. Intenta en unos segundos.');
          } else if (msg === 'TOKEN_INVALIDO') {
            /* el puente ya repuso la sesión */
          } else {
            errorCampo(el.fieldClaveNueva, 'No se pudo guardar la clave. Intenta de nuevo.');
            console.error('[Perfil] cambio de clave falló:', msg);
          }
        });
    }

    function _textoRegla(regla) {
      for (var i = 0; i < CHECKS_CLAVE.length; i++) {
        if (CHECKS_CLAVE[i].regla === regla) return CHECKS_CLAVE[i].texto;
      }
      return 'una regla de fuerza';
    }

    function _mensajeClave(res) {
      if (res.vacio)       return 'Escribe la nueva clave.';
      if (res.largo)       return 'Demasiado larga (máximo 40 caracteres).';
      if (res.corta)       return 'Al menos 8 caracteres.';
      if (res.igualCorreo) return 'No puede ser igual a tu correo.';
      if (res.prohibida)   return 'Esa clave es demasiado común. Elige otra.';
      if (res.falta)       return 'Falta: ' + _textoRegla(res.falta);
      return 'Revisa este dato.';
    }

    /* ============================================================
       FRESCO PARCIAL · tras correo/clave/GPS: la cache de sesión
       se actualiza y los flujos propios se repintan con el dato
       nuevo SIN pisar lo que el partner escribe en eslogan y
       dirección.
       ============================================================ */
    function aplicarFresco(fresco) {
      if (!fresco) return;
      state.datos = fresco;
      var p = partner();
      if (p && window.Partner && window.Partner.cachePerfil) {
        window.Partner.cachePerfil.guardar(p.id, fresco);
      }
      /* Si una revalidación muda trajo un correo nuevo sin que
         nadie lo cambiara aquí, el flujo cerrado lo refleja. */
      if (state.correoPaso === 'sellado') ponerCorreoGuardado();
      actualizarCorreoFlujo();
      renderGps();
    }

    /* ============================================================
       AVATAR · C2: el WebP nace EN EL TELÉFONO. Recorte cuadrado
       centrado a 512px, calidad 0.82 — el original pesado jamás
       viaja ni llega a Drive.
       ============================================================ */
    function convertirYSubir(file) {
      if (!/^image\//.test(String(file.type || ''))) {
        estadoFoto('Elige una foto válida.', 'error');
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        estadoFoto('La foto es demasiado grande.', 'error');
        return;
      }

      estadoFoto('Preparando la foto…', '');
      var url = URL.createObjectURL(file);
      var img = new Image();

      img.onload = function () {
        try {
          var lado = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
          if (!lado) { throw new Error('SIN_DIMENSIONES'); }

          var canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          var cx = canvas.getContext('2d');
          cx.drawImage(img,
            ((img.naturalWidth || img.width)  - lado) / 2,
            ((img.naturalHeight || img.height) - lado) / 2,
            lado, lado, 0, 0, 512, 512);
          URL.revokeObjectURL(url);

          canvas.toBlob(function (blob) {
            if (!blob) { estadoFoto('No se pudo convertir la foto.', 'error'); return; }
            var lector = new FileReader();
            lector.onload = function () {
              subirFoto(String(lector.result || ''));
            };
            lector.onerror = function () { estadoFoto('No se pudo preparar la foto.', 'error'); };
            lector.readAsDataURL(blob);
          }, 'image/webp', 0.82);
        } catch (e) {
          URL.revokeObjectURL(url);
          estadoFoto('No se pudo preparar la foto.', 'error');
        }
      };

      img.onerror = function () {
        URL.revokeObjectURL(url);
        estadoFoto('No se pudo abrir la foto.', 'error');
      };
      img.src = url;
    }

    function estadoFoto(texto, clase) {
      if (!el.fotoEstado) return;
      el.fotoEstado.textContent = texto || '';
      el.fotoEstado.className = 'perfil-foto-estado' + (clase ? ' ' + clase : '');
    }

    function subirFoto(dataUrl) {
      var p = partner();
      if (!p || !p.id) return;

      state.subiendo = true;
      if (el.btnFoto) el.btnFoto.disabled = true;
      estadoFoto('Subiendo la foto…', '');

      postBackend('subirAvatar', {
        idPartner: String(p.id),
        imagenB64: dataUrl
      })
        .then(function (data) {
          state.subiendo = false;
          if (el.btnFoto) el.btnFoto.disabled = false;
          haptic([30, 20, 30]);

          var nueva = (data && data.avatar) || '';
          if (nueva && el.avatar) {
            el.avatar.innerHTML = '<img src="' + _esc_(nueva) + '" alt="Foto del partner">';
          }
          if (state.datos) {
            state.datos.avatar = nueva;
            var pAvatar = partner();
            if (pAvatar && window.Partner && window.Partner.cachePerfil) {
              window.Partner.cachePerfil.guardar(pAvatar.id, state.datos);
            }
          }
          estadoFoto('Foto actualizada.', 'ok');
          _aviso('Foto actualizada');
        })
        .catch(function (err) {
          state.subiendo = false;
          if (el.btnFoto) el.btnFoto.disabled = false;

          var msg = (err && err.message) || '';
          if (msg === 'IMAGEN_GRANDE')   estadoFoto('La foto resultó demasiado grande. Prueba con otra.', 'error');
          else if (msg === 'IMAGEN_INVALIDA') estadoFoto('Esa imagen no se pudo procesar. Prueba con otra.', 'error');
          else if (msg.indexOf('RATE_LIMIT') === 0) estadoFoto('Espera un momento para cambiar la foto otra vez.', 'error');
          else estadoFoto('No se pudo subir la foto. Intenta de nuevo.', 'error');
          console.error('[Perfil] avatar falló:', msg);
        });
    }

    return {
      pintar: pintar
    };

  })();

