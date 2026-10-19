# Guía del proyecto

Esta guía es para quienes quieran ejecutar MasterDex en su computadora, colaborar con el código o publicar una instancia propia.

## Requisitos

- Node.js `22.13.0` o posterior.
- npm.
- Conexión a internet para obtener datos e imágenes que todavía no estén en caché.

## Instalar y ejecutar localmente

Clona el repositorio, instala sus dependencias e inicia la aplicación:

```bash
git clone <URL_DEL_REPOSITORIO>
cd MasterDex
npm ci
npm run dev
```

Abre en el navegador la dirección local que muestra Vite en la terminal. El comando inicia la interfaz y el backend local; SQLite se crea automáticamente en `data/masterdex.sqlite`. Cuando hace falta un dato, el backend puede consultarlo a PokéAPI y guardarlo para reutilizarlo.

Si necesitas una copia local completa de los datos antes de trabajar sin conexión, ejecuta:

```bash
npm run sync:pokeapi -- --only-missing
```

La sincronización completa consulta varios miles de recursos y puede tardar unos minutos. Para actualizar también los datos que ya existen, omite `--only-missing`. Luego puedes iniciar el backend en modo sin conexión con `MASTERDEX_OFFLINE=true`; en ese modo, los recursos ausentes producen un error en vez de consultarse a PokéAPI.

## Comandos disponibles

| Comando | Uso |
| --- | --- |
| `npm run dev` | Inicia el backend local y Vite para desarrollar. |
| `npm run build` | Compila la aplicación en `dist/`. |
| `npm run preview` | Sirve localmente una compilación existente. |
| `npm run start` | Sirve `dist/` con el backend Node y SQLite. |
| `npm run sync:pokeapi -- --only-missing` | Añade a SQLite los recursos que faltan. |
| `npm run sync:pokeapi` | Actualiza los recursos guardados en SQLite. |
| `npm run test:e2e` | Ejecuta las pruebas de navegador con Playwright. |
| `npm run test:e2e:ui` | Abre Playwright en modo interactivo. |

Para ejecutar las pruebas por primera vez, instala Chromium:

```bash
npx playwright install chromium
npm run test:e2e
```

Los casos E2E usan datos simulados y servidores aislados. No necesitan una base SQLite completa ni consultan PokéAPI para cada prueba.

## Publicar en Vercel con Turso

La instancia pública utiliza Vercel para servir la aplicación y sus funciones de API, y Turso para conservar la caché de datos. En producción la caché no depende del disco local efímero de las funciones.

### 1. Crear y conectar la base de datos

Desde Vercel, crea una base Turso usando la integración disponible y conéctala al proyecto. Confirma que las variables `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` estén configuradas para el entorno **Production**.

### 2. Conectar el repositorio

Importa el repositorio de GitHub en Vercel. La configuración de [vercel.json](vercel.json) define el comando de build (`npm run build`), la carpeta de salida (`dist`) y las rutas de la API y de las fichas. No hace falta agregar configuración de backend en el navegador.

### 3. Copiar los datos locales a Turso

La migración copia a Turso los recursos que ya están guardados en `data/masterdex.sqlite`. Si quieres preparar una caché completa, sincronízala antes:

```bash
npm run sync:pokeapi -- --only-missing
```

Vincula el directorio local con el proyecto de Vercel y descarga las variables de Production:

```bash
npx vercel link
npx vercel env pull .env.local --environment=production --yes
npm run migrate:sqlite-to-turso
```

Si el archivo `.env.local` contiene `[SENSITIVE]` en lugar de las credenciales, reemplaza esos dos valores localmente con los datos de Turso antes de ejecutar la migración. No publiques ni compartas el archivo: está excluido de Git y contiene secretos. La migración puede repetirse para actualizar recursos ya copiados.

### 4. Verificar la publicación

Haz push de los cambios al repositorio conectado y espera a que Vercel termine el despliegue. Comprueba la ruta `/api/health`: una respuesta correcta indica que la función puede consultar Turso. Después abre la lista y una ficha de Pokémon.

## Configuración local opcional

| Variable | Función |
| --- | --- |
| `MASTERDEX_DB_PATH` | Cambia la ubicación de `data/masterdex.sqlite`. |
| `MASTERDEX_OFFLINE` | Evita consultas a PokéAPI cuando un recurso no está en SQLite. |
| `MASTERDEX_HOST` | Dirección donde escucha el backend local; por defecto `127.0.0.1`. |
| `MASTERDEX_API_PORT` / `PORT` | Puerto del backend local; por defecto `3001`. |
| `MASTERDEX_UPSTREAM_CONCURRENCY` | Máximo de consultas simultáneas a PokéAPI; por defecto `6`. |
| `MASTERDEX_SYNC_CONCURRENCY` | Consultas simultáneas al sincronizar; por defecto `3`. |

En Vercel, configura `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` como variables de entorno del servidor. No uses prefijos `VITE_` para secretos: Vite puede incluir esas variables en el código público del navegador.

## Estructura breve

- `src/`: interfaz, pantallas, componentes y funciones de dominio.
- `server/`: backend local, caché SQLite y lógica compartida de PokéAPI.
- `api/`: funciones de Vercel para la API y el estado de salud.
- `scripts/`: sincronización de datos, migración a Turso y arranque local.
- `tests/e2e/`: pruebas de navegador con Playwright.
- `styles.css`: estilos y adaptación a distintos tamaños de pantalla.
