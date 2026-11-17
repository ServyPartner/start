<!--
════════════════════════════════════════════════════════════════════
ARCHIVO:         README.md (repositorio GitHub Pages)
PROYECTO:        ServyPartner | App en GitHub Pages
RESPONSABILIDAD: Mapa del repositorio de producción y guía de
                 mantenimiento para el dueño. Molde del README de
                 la app pública (ServyCloud).
VERSIÓN:         1.0
CAMBIOS:         P1/T2: nace el espejo multi-archivo de la Partner
                 (mismos nombres espejo de GAS, css/ + js/). Sin
                 GA4 y sin cadena OG (decisiones del acta: la
                 Partner no comparte enlaces ni lleva analítica
                 propia; los enlaces compartidos son obra de la
                 app pública). La carpeta e/ del original NO vive
                 aquí.
DEPENDENCIAS:    Todos los archivos de esta carpeta.
════════════════════════════════════════════════════════════════════
-->

# ServyPartner

> **La aplicación:** [Ir a la App](https://ingeniuscloud.github.io/ServyCloud-Partner/)

App **multi-archivo** en GitHub Pages: la misma cocina de Apps Script,
servida como archivos independientes. **Los nombres son espejo de GAS**:
lo que pruebas en GAS se paga en el archivo gemelo de GitHub.

---

## Contenido del repositorio (23 archivos)

**En la raíz (11):**

| Archivo                 | Qué es |
|-------------------------|--------|
| `index.html`            | Estructura de la página (espejo del `Index.html` de GAS) + píldora instalar + `URL_EXEC` |
| `manifest.json`         | Identidad de instalación: **ServyPartner** (azul #2563EB) |
| `sw.js`                 | Service worker de paso puro (instalabilidad; no guarda caché) |
| `404.html`              | Página de paso: cualquier ruta rota aterriza al INSTANTE en el inicio de la app |
| `README.md`             | Este archivo |
| `icon-192.png`          | Icono PWA 192×192 — "Servy" + Cloud + Partner sobre azul |
| `icon-512.png`          | Icono PWA 512×512 (mismo arte) |
| `icon-maskable-192.png` | Icono adaptativo 192×192 |
| `icon-maskable-512.png` | Icono adaptativo 512×512 |
| `apple-touch-icon.png`  | Icono para iOS (180×180) |
| `favicon-48.png`        | Favicon del navegador |

**Carpeta `css/` (5):** Core_CSS, Global_CSS, Perfil_CSS (los 3
existe en GAS como .html) + `GitHub_Cromo.css` y `Telefono.css`
(espejo del CSS interno de `Telefono.html` de GAS).

**Carpeta `js/` (7):** Iconos, Global_Script, Global_Menu_Script,
Core_Script, Perfil_Script (gemelos de GAS) + `GitHub_Cromo.js`
(preloader, píldora y registro del SW; solo-GitHub, cargar SIEMPRE
último) + `Telefono.js` (reloj dinámico).

`Telefono.html` (el marco del iPhone) viaja **dentro** de
`index.html` porque es HTML del cuerpo, no un archivo css/js.

---

## Procedimiento del dueño (probar en GAS → pagar en GitHub)

1. Editas el archivo en **Apps Script** (cuenta
   ingenius.servypartner@gmail.com) y pruebas.
2. Si queda bien, abres el **gemelo** en GitHub:
   `Global_CSS.html` → `css/Global_CSS.css` ·
   `Core_Script.html` → `js/Core_Script.js` ·
   `Perfil_Script.html` → `js/Perfil_Script.js`.
3. Pegas el **contenido interior** del fragmento (lo que está dentro
   del envoltorio de estilo o de script; el encabezado ya vive como
   comentario en el archivo de GitHub).
4. Commit. Los cambios tardan ~10 minutos en propagarse (caché de
   GitHub Pages, igual que siempre).

**Excepciones:**
- `URL_EXEC` (la URL del motor GAS) se cambia en `index.html`, una
  sola línea al inicio del cuerpo (`window.URL_EXEC`). Sin ella la
  app muestra "Sin conexión" y el simulacro queda tapado por esa
  pantalla.
- `GitHub_Cromo.css` / `GitHub_Cromo.js` / `manifest.json` / `sw.js` /
  `404.html` / `README.md`: no existen en GAS; rara vez se tocan.

---

## El simulacro (carcasa del teléfono)

- En una **PC** (ventana ancha) la app vive DENTRO de la carcasa del
  teléfono: notch, barra de estado, botones laterales y barra de
  Safari — fiel al simulacro de GAS.
- En un **teléfono real** (o ventana de menos de 768px) la carcasa
  desaparece y la app ocupa TODA la pantalla: eso es lo que ve el
  partner de verdad.
- La decisión la toma el detector temprano de `index.html` (agente
  de usuario móvil o pantalla pequeña): la misma regla de la app
  pública. Si abres la app en una PC con la ventana angosta (o las
  herramientas de desarrollo acopladas), verás la pantalla completa
  sin carcasa — no es un error.

---

## Publicar (primera vez o reemplace completo)

1. Subir **TODA esta carpeta a la raíz** del repositorio
   (ServyCloud-Partner), respetando las subcarpetas `css/` y `js/`.
2. Settings → Pages: *Deploy from a branch* → `main` / `(root)`.
3. Esperar ~1 minuto y abrir la URL. Listo.
4. Verificación rápida: F12 → Network/Consola sin ningún 404. Un
   404 = ese archivo no está en el repositorio.

Todos los enlaces son relativos: funciona igual en sitio de usuario
que en sitio de proyecto.

---

## Instalar en el teléfono (Android)

- Entrar al sitio **2 veces**; desde la 2ª, abajo a la izquierda
  aparece la píldora **"Instalar app"** (calla 3 días si se cierra).
- En iPhone no aparece: Safari no permite instalar por código
  (decisión del dueño).

### Si Google Play Protect muestra un aviso al instalar

*"Se bloqueó la app no segura…"*: lo provoca el **WebAPK** que fabrica
el navegador, no este repositorio. Es seguro pulsar **"Instalar de
todas formas"**: el paquete no lleva código nativo ni permisos. Para
evitarlo, instalar desde **Chrome actualizado** en vez de Samsung
Internet.

---

## Mantenimiento

| Quiero…                        | Dónde se cambia |
|--------------------------------|-----------------|
| Cambiar un estilo              | Su archivo en `css/` (mismo nombre que en GAS) |
| Cambiar lógica de la app       | Su archivo en `js/` (mismo nombre que en GAS) |
| Cambiar la URL del motor GAS   | `index.html` → línea `window.URL_EXEC` |
| Cambiar nombre de instalación  | `manifest.json` → `name` / `short_name` |
| Cambiar los iconos             | Reemplazar los `icon-*.png` (mismos nombres y medidas) |

Notas:

- `js/Perfil_Script.js` y `js/Global_Menu_Script.js` van antes de
  `js/Core_Script.js`, y `js/GitHub_Cromo.js` SIEMPRE al final de
  todos (el orden del `index.html` ya lo cuida).
- El nombre y el icono de la app **ya instalada** quedan congelados:
  para verlos nuevos, desinstalar y reinstalar.
- Este espejo NO lleva la carpeta `e/`, ni GA4, ni metas OG: la
  cadena de enlaces compartidos es obra de la app pública y la
  Partner no comparte nada (acta del proyecto).
