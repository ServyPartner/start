

  window.Validaciones = (function () {

    /* ---------- Patrones (los mismos del backend) ---------- */
    var REGEX = {
      NO_DIGITO: /\D/g,
      CORREO:    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
      NOMBRE:    /^[A-Za-zÀ-ÿ\s'\-]+$/,
      CODIGO6:   /^\d{6}$/,
      /* Punto GPS "lat,lng" — 6 decimales fijos (precisión
         ~11 cm), tal como lo captura el GPS del teléfono. */
      GPS:       /^-?\d{1,2}\.\d{6},-?\d{1,3}\.\d{6}$/
    };

    /* ---------- REGLAS DEL PERFIL (tabla sellada) ----------
       Solo los campos que el botón GUARDAR escribe. Ambos son
       OPCIONALES (orden del dueño, Tanda 1: el «(Opcional)»
       muere del título — la regla queda igual). La tarjeta
       sellada (nombre · ciudad · municipio · estado · whatsapp)
       no se edita desde aquí: sin regla, sin input. */
    var REGLAS_PERFIL = {
      direccion:      { min: 0, max: 200, obligatorio: false },
      esloganPartner: { min: 0, max: 120, obligatorio: false }
    };

    /* ---------- REGLAS DE LOS FLUJOS SENSIBLES (Tanda 1) ----
       Correo y clave son OBLIGATORIOS (orden del dueño). La
       fuerza de la clave: las CINCO reglas que encienden los
       checks bajo el campo «Nueva clave». Lista de prohibidas:
       espejo exacto de 02 Seguridad.gs. */
    var CLAVE_MIN       = 8;
    var CLAVE_MAX       = 40;
    var CLAVE_PROHIBIDAS = [
      '12345678', '123456789', '1234567890', 'password',
      'contrasena', 'contraseña', 'clave123', 'partner123',
      'qwerty123', 'abc12345', 'servycloud', 'servypartner',
      'ingcloud', 'ingcloud2024'
    ];

    /* ---------- CHECKS_CLAVE · FUENTE ÚNICA (correcciones 12) --
       Las cinco reglas de fuerza CON SU TEXTO: la lista la
       pintan el Perfil (campo «Nueva clave») y la recuperación
       del LOGIN — el mismo componente (.clave-checks del Core
       + este array), cero duplicado (orden del dueño). */
    var CHECKS_CLAVE = [
      { regla: 'longitud',  texto: 'Mínimo 8 caracteres' },
      { regla: 'mayuscula', texto: 'Mayúscula' },
      { regla: 'minuscula', texto: 'Minúscula' },
      { regla: 'numero',    texto: 'Número' },
      { regla: 'simbolo',   texto: 'Símbolo' }
    ];

    /* ---------- Limpiadores puros ---------- */
    function limpiarTelefono(v) {
      return String(v == null ? '' : v).replace(REGEX.NO_DIGITO, '');
    }

    function limpiarTexto(str, max) {
      if (typeof str !== 'string') return '';
      return str.trim().slice(0, max).replace(/[<>]/g, '');
    }

    /* ---------- Validadores sueltos (espejo Seguridad.gs) --- */
    function email(correo) {
      if (typeof correo !== 'string' || correo.length > 100) return false;
      return REGEX.CORREO.test(correo);
    }

    function nombre(valor) {
      if (typeof valor !== 'string') return false;
      var s = valor.trim();
      if (s.length < 3 || s.length > 60) return false;
      return REGEX.NOMBRE.test(s);
    }

    /* ---------- VALIDADOR DE PERFIL · contrato único ----------
       Devuelve { ok:true, valor } cuando el campo pasa, o
       { ok:false, vacio|largo|corto } con el MOTIVO para que la
       pantalla pinte su mensaje bajo el campo (molde R131). */
    function validarPerfilCampo(clave, valorCrudo) {
      var r = REGLAS_PERFIL[clave];
      if (!r) return { ok: false, vacio: true };

      var v = String(valorCrudo == null ? '' : valorCrudo).trim();
      if (r.telefono) {
        v = limpiarTelefono(v);
        if (v.charAt(0) === '0') v = v.substring(1);
      }

      if (r.telefono && v.length && v.length < r.min) {
        return { ok: false, corto: true };
      }
      if (r.obligatorio && v.length < r.min) return { ok: false, vacio: true };
      if (v.length > r.max) return { ok: false, largo: true };

      return { ok: true, valor: v };
    }

    /* ============================================================
       FLUJO CORREO (Tanda 1) · el correo es OBLIGATORIO y es la
       credencial: formato válido, no puede quedar vacío y no
       puede ser EL MISMO que ya vive sellado en el perfil.
       ============================================================ */
    function validarCorreoNuevo(valorCrudo, correoActual) {
      var v = String(valorCrudo == null ? '' : valorCrudo).trim();
      if (!v) return { ok: false, vacio: true };
      if (v.length > 100) return { ok: false, largo: true };
      if (!REGEX.CORREO.test(v)) return { ok: false, formato: true };
      if (correoActual &&
          v.toLowerCase() === String(correoActual).toLowerCase()) {
        return { ok: false, igual: true };
      }
      return { ok: true, valor: v };
    }

    /* Código OTP de 6 dígitos (molde del original: formato
       EXACTO o nada — el backend igualmente lo exige). */
    function validarCodigoOtp(valorCrudo) {
      var v = String(valorCrudo == null ? '' : valorCrudo).trim();
      if (!v) return { ok: false, vacio: true };
      if (!REGEX.CODIGO6.test(v)) return { ok: false, formato: true };
      return { ok: true, valor: v };
    }

    /* ============================================================
       FLUJO CLAVE (Tanda 1) · write-only: la clave guardada
       JAMÁS viaja al teléfono. La nueva se pide UNA sola vez
       (orden del dueño) y las CINCO REGLAS DE FUERZA encienden
       los checks debajo del campo. El resultado lleva SIEMPRE
       las checks para que la pantalla las pinte en vivo.
       ============================================================ */
    function validarClaveNueva(valorCrudo, correo) {
      var v = String(valorCrudo == null ? '' : valorCrudo).trim();
      var checks = {
        longitud:  v.length >= CLAVE_MIN,
        mayuscula: /[A-Z]/.test(v),
        minuscula: /[a-z]/.test(v),
        numero:    /[0-9]/.test(v),
        simbolo:   /[^A-Za-z0-9]/.test(v)
      };
      var res = { ok: true, valor: v, checks: checks };

      if (!v) { res.ok = false; res.vacio = true; return res; }
      if (v.length > CLAVE_MAX) { res.ok = false; res.largo = true; return res; }
      if (v.length < CLAVE_MIN) { res.ok = false; res.corta = true; return res; }
      if (correo &&
          v.toLowerCase() === String(correo).toLowerCase()) {
        res.ok = false; res.igualCorreo = true; return res;
      }
      if (CLAVE_PROHIBIDAS.indexOf(v.toLowerCase()) !== -1) {
        res.ok = false; res.prohibida = true; return res;
      }
      for (var k in checks) {
        if (Object.prototype.hasOwnProperty.call(checks, k) && !checks[k]) {
          res.ok = false; res.falta = k; return res;
        }
      }
      return res;
    }

    /* Clave ACTUAL (la puerta de identidad): obligatoria en su
       paso, sin reglas de fuerza (es la que ya existe). */
    function validarClaveActual(valorCrudo) {
      var v = String(valorCrudo == null ? '' : valorCrudo);
      if (!v.trim()) return { ok: false, vacio: true };
      if (v.length > CLAVE_MAX) return { ok: false, largo: true };
      return { ok: true, valor: v };
    }

    /* Punto GPS: opcional; si trae algo, formato EXACTO
       lat,lng a 6 decimales (lo genera el GPS del teléfono). */
    function validarUbicacionGps(valorCrudo) {
      var v = String(valorCrudo == null ? '' : valorCrudo).trim();
      if (!v) return { ok: true, valor: '' };
      if (!REGEX.GPS.test(v)) return { ok: false, formato: true };
      return { ok: true, valor: v };
    }

    return {
      REGLAS_PERFIL:      REGLAS_PERFIL,
      CLAVE_MIN:          CLAVE_MIN,
      CLAVE_MAX:          CLAVE_MAX,
      CLAVE_PROHIBIDAS:   CLAVE_PROHIBIDAS,
      CHECKS_CLAVE:       CHECKS_CLAVE,
      limpiarTelefono:    limpiarTelefono,
      limpiarTexto:       limpiarTexto,
      email:              email,
      nombre:             nombre,
      validarPerfilCampo: validarPerfilCampo,
      validarCorreoNuevo: validarCorreoNuevo,
      validarCodigoOtp:   validarCodigoOtp,
      validarClaveActual: validarClaveActual,
      validarClaveNueva:  validarClaveNueva,
      validarUbicacionGps: validarUbicacionGps
    };

  })();

