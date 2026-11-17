(function() {
    function actualizarHora() {
      var ahora = new Date();
      var horas = ahora.getHours();
      var minutos = ahora.getMinutes();

      // Convertir a formato de 12 horas (1 a 12)
      horas = horas % 12;
      horas = horas ? horas : 12; // Si es 0 (medianoche), mostrar 12

      // Formatear a 2 dígitos (ej. 9:05 -> 09:05)
      horas = horas < 10 ? '0' + horas : horas;
      minutos = minutos < 10 ? '0' + minutos : minutos;

      var reloj = document.getElementById('reloj-estado');
      if (reloj) {
        reloj.textContent = horas + ':' + minutos;
      }
    }

    // Ejecutar al cargar
    actualizarHora();

    // Actualizar cada segundo para mantener la precisión
    setInterval(actualizarHora, 1000);
  })();
