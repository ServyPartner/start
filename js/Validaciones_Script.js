

  window.Validaciones = (function () {

    /* ---------- Patrones (los mismos del backend) ---------- */
    var REGEX = {
      NO_DIGITO: /\D/g,
      CORREO:    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
      NOMBRE:    /^[A-Za-zÀ-ÿ\s'\-]+$/
    };

    /* ---------- REGLAS DEL PERFIL (tabla sellada) ----------
       telefonWhatsapp con las constantes del sheet de reserva
       del original (Reserva_Valida: MIN 10 · MAX 11 números
       locales — el +58 va fijo como prefijo visual). Obligatorio
       y opcionales: los mismos que el backend exige en
       accionGuardarPerfil (00 DoGet.gs). */
    var REGLAS_PERFIL = {
      nombre:           { min: 2,   max: 80,  obligatorio: true  },
      direccion:        { min: 0,   max: 200, obligatorio: false },
      ciudad:           { min: 2,   max: 80,  obligatorio: true  },
      municipio:        { min: 2,   max: 80,  obligatorio: true  },
      estado:           { min: 2,   max: 80,  obligatorio: true  },
      esloganPartner:   { min: 0,   max: 120, obligatorio: false },
      telefonoWhatsapp: { min: 10,  max: 11,  obligatorio: true,  telefono: true }
    };

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
       pantalla pinte su mensaje bajo el campo (molde R131).
       El teléfono se mide SOLO en dígitos locales, sin el 0
       inicial (una cifra de 7 números es «corto», no «vacío»). */
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

    return {
      REGLAS_PERFIL:     REGLAS_PERFIL,
      limpiarTelefono:   limpiarTelefono,
      limpiarTexto:      limpiarTexto,
      email:             email,
      nombre:            nombre,
      validarPerfilCampo: validarPerfilCampo
    };

  })();
