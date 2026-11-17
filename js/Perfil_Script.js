

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
      cargando:  false,
      datos:     null,     /* el perfil sellado que llegó del backend */
      guardando: false,
      subiendo:  false
    };

    var el = {};

    /* ---------- Validadores (espejo del backend) ---------- */
    var REGLAS = {
      nombre:         { min: 2,   max: 80,  obligatorio: true  },
      direccion:      { min: 0,   max: 200, obligatorio: false },
      ciudad:         { min: 2,   max: 80,  obligatorio: true  },
      municipio:      { min: 2,   max: 80,  obligatorio: true  },
      estado:         { min: 2,   max: 80,  obligatorio: true  },
      esloganPartner: { min: 0,   max: 120, obligatorio: false },
      whatsapp:       { min: 10,  max: 15,  obligatorio: true,  telefono: true }
    };

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
       ESTADOS DE PANTALLA · cargando / error de lectura
       ============================================================ */
    function pintarCargando() {
      var area = document.getElementById('pantallaArea');
      if (!area) return;
      area.innerHTML =
        '<div class="perfil-estado">' +
          '<div class="perfil-cargador" aria-hidden="true"></div>' +
          '<p class="textoSecundario">Cargando tu perfil…</p>' +
        '</div>';
    }

    function pintarError(texto) {
      var area = document.getElementById('pantallaArea');
      if (!area) return;
      area.innerHTML =
        '<div class="perfil-estado">' +
          '<h2 class="titulo">Perfil</h2>' +
          '<p class="textoSecundario">' + _esc_(texto) + '</p>' +
          '<button type="button" class="perfil-reintentar" id="btnPerfilReintentar">Reintentar</button>' +
        '</div>';
      var btn = document.getElementById('btnPerfilReintentar');
      if (btn) {
        btn.addEventListener('click', function () { pintar(); });
      }
    }

    /* ============================================================
       PINTAR · la acción perfil trae SOLO los campos sellados
       ============================================================ */
    function pintar() {
      var p = partner();
      if (!p || !p.id) return;

      /* CADA entrada a la pestaña nace del servidor (los datos
         son suyos y pueden haber cambiado): lectura fresca,
         rate limit generoso (30/min) en 02 Seguridad.gs. */
      state.cargando = true;
      pintarCargando();

      postBackend('perfil', { idPartner: String(p.id) }, { mudo: true })
        .then(function (data) {
          state.cargando = false;
          state.datos = (data && data.perfil) || {};
          render(state.datos);
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
                 '<span class="field-check" data-glifo="check"></span>' +
                 '<div class="errorForm" hidden></div>' +
               '</div>';
      };

      area.innerHTML =
        '<div class="perfil-wrap">' +

          '<div class="perfil-hero">' +
            '<div class="perfil-avatar-zona">' +
              '<div class="perfil-avatar" id="perfilAvatar">' + avatar + '</div>' +
              '<button type="button" class="perfil-foto-btn" id="btnPerfilFoto" aria-label="Cambiar foto" data-glifo="camera"></button>' +
              '<input type="file" accept="image/*" class="perfil-input-foto" id="inputPerfilFoto">' +
            '</div>' +
            '<div class="perfil-foto-estado" id="perfilFotoEstado"></div>' +
            '<h2 class="titulo perfil-titulo-hero" id="perfilHeroNombre">' + _esc_(perfil.nombre || '') + '</h2>' +
          '</div>' +

          '<p class="perfil-hint">Estos son los datos que ve el público en tus publicaciones. Guárdalos con tu mejor letra.</p>' +

          '<form class="perfil-form" id="formPerfil" novalidate>' +

            campo('Nombre', 'Nombre del partner', perfil.nombre, 'text',
                  ' autocomplete="organization" maxlength="80"') +

            campo('Eslogan', 'Eslogan (opcional)', perfil.esloganPartner, 'text',
                  ' maxlength="120"') +

            '<fieldset class="form-fieldset" id="fieldsetUbicacion">' +
              '<legend>Ubicación</legend>' +
              campo('Direccion', 'Dirección (opcional)', perfil.direccion, 'text',
                    ' maxlength="200" autocomplete="street-address"') +
              campo('Ciudad', 'Ciudad', perfil.ciudad, 'text', ' maxlength="80"') +
              campo('Municipio', 'Municipio', perfil.municipio, 'text', ' maxlength="80"') +
              campo('Estado', 'Estado', perfil.estado, 'text', ' maxlength="80"') +
            '</fieldset>' +

            campo('Whatsapp', 'WhatsApp de contacto', perfil.whatsapp, 'tel',
                  ' inputmode="numeric" maxlength="15" autocomplete="tel-national"') +

            '<p class="perfil-hint">Con o sin código de país — con números, sin espacios ni símbolos.</p>' +

            '<button type="submit" class="form-submit botonPrimario" id="btnPerfilGuardar">' +
              '<span class="form-submit-texto">Guardar cambios</span>' +
              '<span class="form-submit-flecha" data-glifo="enviar"></span>' +
            '</button>' +

          '</form>' +
        '</div>';

      if (typeof window.pintarGlifos === 'function') window.pintarGlifos(area);

      recogerEl();
      enganchar();
      repoblar(perfil);
    }

    function recogerEl() {
      var area = document.getElementById('pantallaArea');
      if (!area) return;
      el = {
        avatar:        area.querySelector('#perfilAvatar'),
        heroNombre:    area.querySelector('#perfilHeroNombre'),
        fotoEstado:    area.querySelector('#perfilFotoEstado'),
        btnFoto:       area.querySelector('#btnPerfilFoto'),
        inputFoto:     area.querySelector('#inputPerfilFoto'),
        form:          area.querySelector('#formPerfil'),
        btnGuardar:    area.querySelector('#btnPerfilGuardar'),
        campos: {
          nombre:         area.querySelector('#fieldNombre'),
          esloganPartner: area.querySelector('#fieldEslogan'),
          direccion:      area.querySelector('#fieldDireccion'),
          ciudad:         area.querySelector('#fieldCiudad'),
          municipio:      area.querySelector('#fieldMunicipio'),
          estado:         area.querySelector('#fieldEstado'),
          whatsapp:       area.querySelector('#fieldWhatsapp')
        },
        inputs: {
          nombre:         area.querySelector('#inputNombre'),
          esloganPartner: area.querySelector('#inputEslogan'),
          direccion:      area.querySelector('#inputDireccion'),
          ciudad:         area.querySelector('#inputCiudad'),
          municipio:      area.querySelector('#inputMunicipio'),
          estado:         area.querySelector('#inputEstado'),
          whatsapp:       area.querySelector('#inputWhatsapp')
        }
      };
    }

    /* ============================================================
       ENGANCHAR · flotantes + validación viva (molde Reserva)
       ============================================================ */
    function validarCampo_(clave, valorCrudo) {
      var r = REGLAS[clave];
      var v = String(valorCrudo == null ? '' : valorCrudo).trim();
      if (clave === 'whatsapp') v = v.replace(/\D/g, '');
      if (r.obligatorio && v.length < r.min) return { ok: false, vacio: true };
      if (v.length > r.max) return { ok: false, largo: true };
      if (clave === 'whatsapp' && v.length && v.length < r.min) {
        return { ok: false, corto: true };
      }
      return { ok: true, valor: v };
    }

    function refrescarCampo(clave) {
      var field = el.campos[clave];
      var input = el.inputs[clave];
      if (!field || !input) return;

      if (String(input.value || '').trim() || document.activeElement === input) {
        field.classList.add('activo');
      } else {
        field.classList.remove('activo');
      }

      var res = validarCampo_(clave, input.value);
      if (res.ok && String(input.value).trim()) {
        field.classList.add('validado');
        field.classList.remove('invalido');
      } else if (String(input.value).trim()) {
        field.classList.remove('validado');
        if (clave === 'whatsapp' && res.corto) {
          field.classList.add('invalido');
        } else if (!res.vacio) {
          field.classList.add('invalido');
        } else {
          field.classList.remove('invalido');
        }
      } else {
        field.classList.remove('validado');
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
          if (clave === 'whatsapp') {
            var limpio = input.value.replace(/\D/g, '').slice(0, 15);
            if (limpio !== input.value) input.value = limpio;
          }
          refrescarCampo(clave);
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
        if (input && String(perfil[clave] || '').trim()) {
          input.value = String(perfil[clave]).trim();
          el.campos[clave].classList.add('activo');
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
      limpiarErrores();

      var primerInvalido = null;
      var datos = {};

      Object.keys(REGLAS).forEach(function (clave) {
        var res = validarCampo_(clave, el.inputs[clave].value);
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
      el.btnGuardar.disabled = true;
      el.btnGuardar.querySelector('.form-submit-texto').textContent = 'Guardando…';

      postBackend('guardarPerfil', {
        idPartner: String(p.id),
        perfil:    datos
      })
        .then(function (data) {
          state.guardando = false;
          el.btnGuardar.disabled = false;
          el.btnGuardar.querySelector('.form-submit-texto').textContent = 'Guardar cambios';
          haptic([30, 20, 30]);

          var fresco = (data && data.perfil) || {};
          state.datos = fresco;
          if (el.heroNombre) el.heroNombre.textContent = fresco.nombre || '';
          refrescarSesion(fresco);
          _aviso('Perfil guardado');
        })
        .catch(function (err) {
          state.guardando = false;
          el.btnGuardar.disabled = false;
          el.btnGuardar.querySelector('.form-submit-texto').textContent = 'Guardar cambios';
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
              return;
            }
            errorFlujo('Revisa los datos e intenta de nuevo.');
            return;
          }
          if (msg.indexOf('RATE_LIMIT') === 0) {
            errorFlujo('Demasiados intentos seguidos. Espera un momento.');
            return;
          }
          if (msg === 'SISTEMA_OCUPADO') {
            errorFlujo('El sistema está ocupado. Intenta de nuevo en unos segundos.');
            return;
          }
          if (msg === 'TOKEN_INVALIDO') return; /* el puente ya repuso la sesión */
          errorFlujo('No se pudo guardar. Intenta de nuevo.');
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
          if (state.datos) state.datos.avatar = nueva;
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
