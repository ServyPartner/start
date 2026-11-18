

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
      subiendo:   false
    };

    var el = {};
    var timerExito = null;  /* el check del botón vuelve solo */

    /* ---------- Límites del perfil (CENTRALIZADOS) ----------
       La tabla vive en Validaciones_Script (window.Validaciones
       .REGLAS_PERFIL) — el mismo patrón del sistema viejo: un
       solo archivo de validaciones reutilizable. Aquí solo se
       consume. */
    var REGLAS = window.Validaciones.REGLAS_PERFIL;

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
       pantalla nace pintada de golpe — ni skeleton ni lectura
       (orden del dueño: entrar a Perfil no puede sentirse como
       recargar). El sistema .skl queda vivo en el Core para
       primera carga y para las pantallas de las tandas futuras.
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
            '<div class="form-bloque">' +
              '<div class="skl skl-campo"></div>' +
              '<div class="skl skl-campo"></div>' +
            '</div>' +
            '<div class="form-bloque">' +
              '<div class="skl skl-campo"></div>' +
              '<div class="skl skl-campo"></div>' +
              '<div class="skl skl-campo"></div>' +
            '</div>' +
            '<div class="form-bloque">' +
              '<div class="skl skl-campo"></div>' +
            '</div>' +
            '<div class="form-bloque">' +
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
       .cachePerfil); guardar y avatar la actualizan al cerrar.
       ============================================================ */
    function pintar() {
      var p = partner();
      if (!p || !p.id) return;

      if (timerExito) { clearTimeout(timerExito); timerExito = null; }

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
        })
        .catch(function () {
          /* Silencio: la pantalla ya está pintada con la cache. */
        });
    }

    /* ============================================================
       RENDER · héroe + formulario (molde Reserva)
       ============================================================ */
    function render(perfil) {
      var area = document.getElementById('pantallaArea');
      if (!area) return;

      var avatar = perfil.avatar
        ? '<img src="' + _esc_(perfil.avatar) + '" alt="Foto del partner">'
        : '<span class="perfil-avatar-inicial">' + _esc_(inicialDe(perfil.nombre)) + '</span>';

      var campo = function (id, etiqueta, valor, tipo, atributos) {
        return '<div class="form-field" id="field' + id + '">' +
                 '<input type="' + (tipo || 'text') + '" id="input' + id + '" placeholder=" " class="form-input" value="' +
                   _esc_(valor || '') + '"' + (atributos || '') + '>' +
                 '<label for="input' + id + '" class="form-label">' + _esc_(etiqueta) + '</label>' +
                 '<div class="errorForm" hidden></div>' +
               '</div>';
      };

      /* Campo telefónico del molde Reserva (Reserva_Dato): el
         +58 va FIJO como prefijo visual y el input recibe SOLO
         el número local (10-11 números, sin el 0 inicial). */
      var campoTel = function (id, etiqueta, valor, atributos) {
        return '<div class="form-field" id="field' + id + '">' +
                 '<div class="form-input-tel">' +
                   '<span class="form-prefijo">+58</span>' +
                   '<input type="tel" id="input' + id + '" placeholder=" " class="form-input-tel-input" value="' +
                     _esc_(valor || '') + '"' + (atributos || '') + '>' +
                 '</div>' +
                 '<label for="input' + id + '" class="form-label">' + _esc_(etiqueta) + '</label>' +
                 '<div class="errorForm" hidden></div>' +
               '</div>';
      };

      area.innerHTML =
        '<div class="perfil-wrap">' +

          /* SIN el nombre bajo el avatar (orden del dueño): es
             redundante — el partner sabe quién es y la marca de
             la cabecera ya viste la fila de arriba. */
          '<div class="perfil-hero">' +
            '<div class="perfil-avatar-zona">' +
              '<div class="perfil-avatar" id="perfilAvatar">' + avatar + '</div>' +
              '<button type="button" class="perfil-foto-btn" id="btnPerfilFoto" aria-label="Cambiar foto" data-glifo="camera"></button>' +
              '<input type="file" accept="image/*" class="perfil-input-foto" id="inputPerfilFoto">' +
            '</div>' +
            '<div class="perfil-foto-estado" id="perfilFotoEstado"></div>' +
          '</div>' +

          '<form class="perfil-form" id="formPerfil" novalidate>' +

            /* BLOQUE 1 · Nombre o Razón Social + Eslogan (opcional) */
            '<div class="form-bloque">' +
              campo('Nombre', 'Nombre o Razón Social', perfil.nombre, 'text',
                    ' autocomplete="organization" maxlength="80"') +
              campo('Eslogan', 'Eslogan (Opcional)', perfil.esloganPartner, 'text',
                    ' maxlength="120"') +
            '</div>' +

            /* BLOQUE 2 · Dirección + ciudad/municipio/estado */
            '<div class="form-bloque">' +
              campo('Direccion', 'Dirección (Opcional)', perfil.direccion, 'text',
                    ' maxlength="200" autocomplete="street-address"') +
              campo('Ciudad', 'Ciudad', perfil.ciudad, 'text', ' maxlength="80"') +
              /* FILA DOBLE (orden del dueño, correcciones 5):
                 Municipio y Estado viven EN LA MISMA fila — cada
                 uno la mitad, misma altura y ritmo de siempre. */
              '<div class="form-fila">' +
                campo('Municipio', 'Municipio', perfil.municipio, 'text', ' maxlength="80"') +
                campo('Estado', 'Estado', perfil.estado, 'text', ' maxlength="80"') +
              '</div>' +
            '</div>' +

            /* BLOQUE 3 · WhatsApp de contacto (prefijo +58 fijo) */
            '<div class="form-bloque">' +
              campoTel('TelefonoWhatsapp', 'WhatsApp de contacto', perfil.telefonoWhatsapp,
                       ' inputmode="numeric" maxlength="11" autocomplete="tel-national"') +
            '</div>' +

            /* BLOQUE 4 · Guardar cambios — nace INACTIVO (orden
               del dueño): solo despierta cuando el formulario
               tenga cambios reales. El SPINNER del procesamiento
               y el CHECK del éxito viven DENTRO del botón. */
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
          nombre:           area.querySelector('#fieldNombre'),
          esloganPartner:   area.querySelector('#fieldEslogan'),
          direccion:        area.querySelector('#fieldDireccion'),
          ciudad:           area.querySelector('#fieldCiudad'),
          municipio:        area.querySelector('#fieldMunicipio'),
          estado:           area.querySelector('#fieldEstado'),
          telefonoWhatsapp: area.querySelector('#fieldTelefonoWhatsapp')
        },
        inputs: {
          nombre:           area.querySelector('#inputNombre'),
          esloganPartner:   area.querySelector('#inputEslogan'),
          direccion:        area.querySelector('#inputDireccion'),
          ciudad:           area.querySelector('#inputCiudad'),
          municipio:        area.querySelector('#inputMunicipio'),
          estado:           area.querySelector('#inputEstado'),
          telefonoWhatsapp: area.querySelector('#inputTelefonoWhatsapp')
        }
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
        if (REGLAS[clave].telefono) v = v.replace(/\D/g, '');
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
        if (REGLAS[clave].telefono) v = v.replace(/\D/g, '');
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
        if (REGLAS[clave] && REGLAS[clave].telefono && res.corto) {
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
          if (REGLAS[clave] && REGLAS[clave].telefono) {
            var limpio = input.value.replace(/\D/g, '').slice(0, REGLAS[clave].max + 1);
            if (limpio !== input.value) input.value = limpio;
          }
          refrescarCampo(clave);
          refrescarBoton();
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
       MERGE del PARTNERJSON)
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
        field.classList.remove('validado');

        var mensaje;
        if (res.vacio)    mensaje = 'Este dato es obligatorio.';
        else if (res.largo) mensaje = 'Demasiado largo (máximo ' + REGLAS[clave].max + ' caracteres).';
        else if (res.corto) mensaje = 'Parece incompleto: al menos ' + REGLAS[clave].min + ' números.';
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
             Perfil pinta instantáneo con el dato nuevo). */
          var fresco = (data && data.perfil) || {};
          state.datos = fresco;
          guardarOriginales(fresco);
          repoblar(fresco);
          refrescarSesion(fresco);

          var pCache = partner();
          if (pCache && window.Partner && window.Partner.cachePerfil) {
            window.Partner.cachePerfil.guardar(pCache.id, fresco);
          }

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
            /* El backend nombra NOMBRE en mayúsculas (así se llama
               la columna); el resto viaja tal cual. Se normaliza
               a la clave del formulario. */
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

    function refrescarSesion(fresco) {
      /* La lista de selección se repinta en cada carga con datos
         del servidor; aquí solo se alivia la copia local. */
      try {
        if (Array.isArray(window.PARTNERS)) {
          var p = partner();
          for (var i = 0; i < window.PARTNERS.length; i++) {
            if (String(window.PARTNERS[i].id) === String(p.id)) {
              window.PARTNERS[i].nombre = fresco.nombre || window.PARTNERS[i].nombre;
              break;
            }
          }
        }
      } catch (_) {}
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
          refrescarSesionAvatar(nueva);
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

    function refrescarSesionAvatar(nueva) {
      try {
        if (Array.isArray(window.PARTNERS)) {
          var p = partner();
          for (var i = 0; i < window.PARTNERS.length; i++) {
            if (String(window.PARTNERS[i].id) === String(p.id)) {
              window.PARTNERS[i].avatar = nueva || window.PARTNERS[i].avatar;
              break;
            }
          }
        }
      } catch (_) {}
    }

    return {
      pintar: pintar
    };

  })();
