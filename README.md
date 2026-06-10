# Porra Mundial 2026 — Guía de publicación online

Esta guía te lleva de cero a una web pública donde tus compañeros entran desde
cualquier dispositivo y se guardan de verdad sus perfiles, contraseñas, selecciones
y la clasificación compartida. **No necesitas instalar nada en tu ordenador**: todo
se hace en el navegador, en tres webs gratuitas.

- **Supabase** → la base de datos (guarda los datos)
- **GitHub** → aloja el código
- **Vercel** → publica la web y la conecta con la base de datos

PIN del organizador: **2605** (puedes cambiarlo en `src/App.jsx`, constante `ADMIN_PIN`).

---

## PARTE 1 · Supabase (base de datos)

1. Entra en https://supabase.com y crea una cuenta (botón *Start your project*; puedes
   registrarte con tu cuenta de GitHub).
2. Pulsa **New project**. Ponle un nombre (p. ej. `porra-mundial`), genera/elige una
   contraseña de base de datos (guárdala por si acaso) y elige la región más cercana
   (Europe West). Pulsa **Create new project** y espera ~1 minuto a que se cree.
3. En el menú lateral abre **SQL Editor** → **New query**.
4. Abre el archivo `supabase_setup.sql` de este proyecto, copia **todo** su contenido,
   pégalo en el editor y pulsa **Run** (abajo a la derecha). Debe decir *Success*.
   Esto crea la tabla `kv` y sus permisos.
5. En el menú lateral abre **Project Settings** (el engranaje) → **API**. Apunta dos cosas:
   - **Project URL** (algo como `https://abcdefgh.supabase.co`)
   - **anon public** key (una cadena larga). Es pública y segura para el navegador.

Deja esos dos valores a mano; los usarás en la PARTE 3.

---

## PARTE 2 · GitHub (subir el código)

1. Entra en https://github.com y crea una cuenta si no tienes.
2. Arriba a la derecha, **+** → **New repository**. Nombre: `porra-mundial-2026`.
   Déjalo **Public** (o privado, da igual) y pulsa **Create repository**.
3. Ahora sube los archivos del proyecto **sin usar la terminal**:
   - En la página del repo recién creado, pulsa el enlace **uploading an existing file**
     (o ve a **Add file** → **Upload files**).
   - Arrastra TODO el contenido de la carpeta del proyecto (los archivos y la carpeta
     `src/`). **Importante:** sube los archivos y carpetas, no un .zip.
     - Truco: descomprime el proyecto en tu ordenador y arrastra `index.html`,
       `package.json`, `vite.config.js`, `.gitignore`, `.env.example`,
       `supabase_setup.sql`, `README.md` y la carpeta `src` entera.
   - Abajo pulsa **Commit changes**.

> No subas la carpeta `node_modules` ni ningún archivo `.env` (el `.gitignore` ya los excluye).

---

## PARTE 3 · Vercel (publicar la web)

1. Entra en https://vercel.com y regístrate **con tu cuenta de GitHub** (*Continue with GitHub*).
2. Pulsa **Add New…** → **Project**. Vercel te mostrará tus repositorios de GitHub.
   Busca `porra-mundial-2026` y pulsa **Import**.
3. Vercel detecta que es un proyecto **Vite** automáticamente. No cambies nada de
   *Build & Output*.
4. Abre la sección **Environment Variables** y añade estas dos (las de la PARTE 1):
   - Nombre: `VITE_SUPABASE_URL`  ·  Valor: tu Project URL
   - Nombre: `VITE_SUPABASE_ANON_KEY`  ·  Valor: tu anon public key
   Pulsa **Add** en cada una.
5. Pulsa **Deploy**. Espera ~1 minuto.
6. Cuando termine, Vercel te da una URL pública del tipo
   `https://porra-mundial-2026.vercel.app`. ¡Esa es la web! Compártela con tu clase.

> Si cambias el código en GitHub más adelante, Vercel vuelve a publicar solo.
> Si añades o cambias variables de entorno, ve a **Settings → Environment Variables**
> y luego **Deployments → … → Redeploy** para aplicarlas.

---

## Cómo se usa

- Cada compañero abre la URL, pulsa **Crear un perfil nuevo**, elige nombre, un emoji
  de avatar (cualquiera de su teclado), color y contraseña. A partir de ahí entra con
  **Acceder a mi perfil**.
- Desde la pestaña **Perfil** puede cambiar su emoji, nombre, color (incluidos blanco
  y negro) y su contraseña cuando quiera.
- Las selecciones se pueden editar hasta **1 h antes del primer partido** (11 jun, 20:00);
  luego quedan bloqueadas automáticamente.
- Está optimizada para **móvil**: navegación inferior tipo app y botones grandes para el pulgar.
- Tú, como organizador, entras desde **Entrar como organizador** con el PIN **2605** para:
  ir marcando resultados oficiales (se **autoguardan** y recalculan la clasificación en vivo),
  editar la selección de alguien en una urgencia, restablecer contraseñas y borrar perfiles.

## Personalizar el logo y los iconos

Abre `src/App.jsx` y busca el bloque **`const IMAGES`** (al principio del archivo).
Cambia `LOGO_URL: null` por la URL pública de tu imagen, p. ej.
`LOGO_URL: "https://i.imgur.com/tuLogo.png"`. Lo mismo para los iconos de cada sección.

- **Imagen de fondo de la cabecera**: pon una URL en `HERO_BG_URL` y se usará como fondo
  del bloque "El Mundial está al caer", con una capa oscura automática para que el texto
  blanco se siga leyendo.
- **Escudos de federación en vez de banderas**: en el bloque **`FLAG_OVERRIDES`** (justo
  debajo) tienes ya preparadas las selecciones cuyo escudo es más conocido que su bandera
  (España, Brasil, Inglaterra, Alemania, Argentina, Francia…). Cambia el `null` de cada una
  por la URL de la imagen que quieras usar, p. ej. `ESP: "https://misitio.com/escudo.png"`.
  La imagen se recorta en círculo, así que van bien logos cuadrados o circulares.

> Nota legal: los escudos oficiales de las federaciones son marcas registradas. La app no
> los incluye; eres tú quien decide qué imágenes usar en tu copia mediante estas URLs.

---

## Nota de seguridad (para que lo sepas)

Para que sea sencillo, la base de datos permite lectura/escritura a cualquiera que
tenga la web (no hay login de Supabase). Las contraseñas de los perfiles se guardan
cifradas (SHA-256), no en texto plano. Es un planteamiento perfecto para una porra
entre amigos/clase. Si algún día quisieras blindarlo (que nadie pueda tocar datos
ajenos saltándose la app), habría que añadir autenticación de Supabase y políticas
por usuario; dímelo y te explico cómo.

## Probar en local (opcional, solo si quisieras)

No es necesario para publicar. Si aun así quieres verlo en tu ordenador:
`npm install` y `npm run dev`, habiendo creado antes un archivo `.env` a partir de
`.env.example` con tus credenciales de Supabase.
