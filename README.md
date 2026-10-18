# MasterDex

**Explora la Pokédex Nacional en una experiencia visual, interactiva y en español.**

MasterDex es una Pokédex web para buscar Pokémon, recorrer sus formas y consultar sus datos en una ficha detallada. Combina información de [PokéAPI](https://pokeapi.co/) con una interfaz propia inspirada en las Pokédex de los videojuegos, con una estética tecnológica basada en la quinta generación.

![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite 8](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES_Modules-F7DF1E?logo=javascript&logoColor=black)

## Contenido

- [Funciones principales](#funciones-principales)
- [Tecnologías y datos](#tecnologías-y-datos)
- [Backend y base de datos](#backend-y-base-de-datos)
- [Primeros pasos](#primeros-pasos)
- [Comandos disponibles](#comandos-disponibles)
- [Pruebas de navegador](#pruebas-de-navegador)
- [Organización del proyecto](#organización-del-proyecto)
- [Notas sobre los datos](#notas-sobre-los-datos)

## Funciones principales

### Explorar la Pokédex

- Recorre los **1.025 registros** de la Pokédex Nacional con carga progresiva.
- Busca por nombre o número nacional y ordena por número de Pokédex o alfabéticamente. Cada criterio alterna entre ascendente y descendente al volver a seleccionarlo.
- Combina filtros de **región** y **tipo**. Dentro de cada grupo puedes seleccionar varias opciones.
- Consulta una vista previa al enfocar o señalar un Pokémon; abre su ficha para ver más información.

### Consultar la ficha de cada Pokémon

- Cambia entre las formas y variantes disponibles mediante pestañas con iconos.
- Alterna entre recursos gráficos **2D** y **3D** cuando están disponibles, y activa la vista **Shiny**.
- Consulta tipos, altura, peso, grupos huevo, hábitat, habilidades normales y ocultas, y estadísticas base.
- Pulsa una habilidad para consultar su descripción en una tarjeta flotante con título propio; se prioriza el texto en español y, si solo existe en inglés, puedes pedir la traducción y alternar entre ambos textos. El resultado se conserva en la caché local. El menú se cierra al hacer clic fuera o pulsar Escape.
- Compara las estadísticas con barras de color e iconos propios.
- Recorre cadenas evolutivas lineales y ramificadas, con requisitos resumidos por alternativa; agrupa los métodos de Leafeon y Glaceon, y unifica los requisitos generacionales de Sylveon.
- Revisa los movimientos que aprende por nivel, con su tipo y clase (Físico, Especial o Estado).
- Lee la descripción en español cuando existe. Si solo hay una descripción en inglés, puedes solicitar su traducción y volver al original.

La disponibilidad de imágenes, formas y datos depende de los recursos publicados por PokéAPI y su repositorio de sprites.

## Tecnologías y datos

- **React 19** para construir la interfaz y manejar su estado.
- **Vite 8** para el servidor de desarrollo y la compilación.
- **Playwright Test** para preparar pruebas end-to-end en Chromium.
- **JavaScript con módulos ES** y **CSS** para la lógica y el diseño adaptable.
- **Node.js** para servir el frontend, exponer la API local y sincronizar datos.
- **SQLite** integrado en Node para conservar respuestas de datos de PokéAPI.
- **PokéAPI v2** para los datos de Pokémon, especies, tipos, habilidades, evoluciones y movimientos.
- **Recursos públicos de sprites de PokeAPI** para iconos, sprites e ilustraciones.

El navegador consulta el backend de MasterDex. Este responde desde SQLite y, si falta un recurso, puede obtenerlo de PokéAPI y guardarlo para las siguientes visitas. La aplicación no tiene cuentas ni datos personales.

## Backend y base de datos

- El archivo SQLite se crea automáticamente en `data/masterdex.sqlite`; las respuestas JSON se guardan comprimidas y se comparten entre las visitas al mismo servidor.
- El comando de sincronización precarga los catálogos y recursos consultados por la interfaz: Pokémon y formas, especies, habilidades, movimientos, tipos y cadenas evolutivas.
- Una vez sincronizada la base, `MASTERDEX_OFFLINE=true` hace que el backend use exclusivamente SQLite. Si un recurso falta, responde con error en lugar de consultar PokéAPI.
- Las imágenes no se copian a SQLite: el catálogo conserva sus URLs de sprite, que siguen dependiendo del repositorio de recursos de PokeAPI. La traducción solicitada por el usuario y las fuentes tipográficas también usan servicios externos.
- `data/masterdex.sqlite` no se incluye en Git. En un despliegue, hay que mantener ese archivo en almacenamiento persistente y sincronizarlo antes de activar el modo sin conexión.

Variables de configuración (todas opcionales):

| Variable | Propósito |
| --- | --- |
| `MASTERDEX_DB_PATH` | Ruta del archivo SQLite; por defecto `data/masterdex.sqlite`. |
| `MASTERDEX_OFFLINE` | Con `true`, impide que el backend consulte PokéAPI si falta un recurso. |
| `MASTERDEX_HOST` | Dirección de escucha del backend; por defecto `127.0.0.1`. En un contenedor público suele configurarse como `0.0.0.0`. |
| `MASTERDEX_API_PORT` / `PORT` | Puerto del backend; por defecto `3001`. `MASTERDEX_API_PORT` también configura el proxy local de Vite. |
| `MASTERDEX_UPSTREAM_CONCURRENCY` | Máximo de consultas simultáneas a PokéAPI; por defecto `6`. |
| `MASTERDEX_SYNC_CONCURRENCY` | Consultas simultáneas durante la precarga; por defecto `3`. |

## Primeros pasos

### Requisitos

- Node.js `>=22.13.0` (el backend usa el módulo SQLite integrado de Node).
- npm.
- Conexión a internet.

### Instalación y ejecución

```bash
git clone <URL_DEL_REPOSITORIO>
cd MasterDex
npm ci
npx playwright install chromium
npm run dev
```

El comando de desarrollo inicia el backend Node y Vite. Vite mostrará en la terminal la dirección local para abrir MasterDex en el navegador. Los recursos faltantes se cachean a medida que se consultan.

La instalación de Chromium es necesaria para ejecutar las pruebas de navegador y normalmente se hace una sola vez por equipo.

Para precargar la base completa y luego poder usarla sin consultar PokéAPI:

```bash
npm run sync:pokeapi -- --only-missing
```

La sincronización inicial recorre varios miles de recursos y puede tardar unos minutos. Para actualizar los datos ya guardados, ejecuta `npm run sync:pokeapi` sin `--only-missing`.

## Deploy en Vercel con Turso

El frontend se compila como sitio Vite y las rutas `/api/pokeapi/v2/*` y `/api/health` se atienden mediante Vercel Functions. Dos rewrites cubren rutas con y sin `/` final y pasan la ruta solicitada como `__resourcePath` a la función estática `/api/pokeapi/v2`; el handler descarta el parámetro auxiliar `path` que agrega Vercel y normaliza la ruta antes de consultar la caché. En producción esas funciones usan Turso; el servidor de desarrollo local conserva la caché SQLite de `data/masterdex.sqlite`.

1. Conecta la integración Turso al proyecto de Vercel y confirma que `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` estén habilitadas para Production.
2. Vincula este repositorio a Vercel. `vercel.json` define `npm run build`, `dist` y la ruta SPA `/pokemon/*`.
3. Para copiar la caché local a Turso, vincula el directorio con Vercel CLI (elige el equipo y el proyecto `masterdex`) y descarga las variables de Production:

   ```bash
   npx vercel link
   npx vercel env pull .env.local --environment=production --yes
   npm run migrate:sqlite-to-turso
   ```

   `.env.local` está excluido de Git. Vercel puede escribir `[SENSITIVE]` en lugar de los valores secretos; si ocurre, reemplaza localmente `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` con los valores de la integración Turso antes de ejecutar la migración. No compartas esos valores. El importador abre `data/masterdex.sqlite` en modo de solo lectura y conserva las respuestas comprimidas. La migración puede ejecutarse de nuevo sin duplicar recursos.
4. Haz push para que Vercel publique los cambios. Comprueba `/api/health` —debe indicar `"database":"turso"`— y luego la lista de la Pokédex.

No uses las credenciales `TURSO_*` en variables `VITE_*` ni en código del navegador: deben permanecer del lado de las funciones.

## Comandos disponibles

| Comando | Acción |
| --- | --- |
| `npm run dev` | Inicia el backend y el servidor de desarrollo de Vite. |
| `npm run build` | Compila la aplicación de producción en `dist/`. |
| `npm run preview` | Inicia el backend y sirve el build existente para revisarlo. |
| `npm run start` | Inicia el backend y sirve el build en producción; ejecuta `npm run build` primero. |
| `npm run sync:pokeapi` | Actualiza en SQLite los recursos usados por MasterDex. |
| `npm run migrate:sqlite-to-turso` | Copia la caché local a Turso usando `.env.local`. |
| `npm run test:e2e` | Ejecuta la suite end-to-end de Playwright en Chromium. |
| `npm run test:e2e:ui` | Abre el modo interactivo de Playwright. |

Playwright está configurado en `playwright.config.js`; la suite en `tests/e2e/` cubre búsqueda, filtros múltiples, orden ascendente/descendente, navegación, formas, datos de especie, traducciones, habilidades, fallbacks visuales, Shiny, errores/reintentos y uso móvil/teclado. El servidor de pruebas usa puertos separados (`4173` para Vite y `3101` para la API) y activa el modo offline. Las respuestas de PokéAPI y los recursos gráficos se simulan para que los casos sean repetibles y no dependan de servicios externos ni de una base local poblada. No hay scripts de lint o formato.

## Pruebas de navegador

La configuración inicial apunta a Chromium de escritorio y levanta una instancia aislada del servidor de desarrollo. Si el puerto `4173` ya está ocupado, detén el proceso que lo usa antes de ejecutar las pruebas. Los resultados, capturas e informes se guardan en directorios ignorados por Git (`test-results/` y `playwright-report/`). `npm run test:e2e` ejecuta actualmente 22 casos.

Para agregar un caso, crea un archivo `*.spec.js` dentro de `tests/e2e/`. Usa `page.route()` para simular la API local y mantener cada prueba reproducible y sin llamadas a servicios externos.

## Organización del proyecto

```text
src/
├── App.jsx                  # Estado compartido, carga inicial y navegación
├── main.jsx                 # Entrada de React
├── components/              # Elementos reutilizables de la interfaz
├── screens/
│   ├── DexScreen.jsx        # Lista, búsqueda, filtros y vista previa
│   └── PokemonDetailPage.jsx # Ficha y carga de sus datos
├── data/
│   └── constants.js         # Endpoints, catálogos, iconos y cachés
├── utils/
│   └── pokemon.js           # Selección de recursos y helpers de Pokémon
└── assets/
    ├── moves/               # Iconos de clase de movimiento
    ├── pkmn-types/          # Iconos de tipos
    └── stats/               # Iconos de estadísticas

server/
├── database.js              # SQLite, compresión y lectura/escritura de caché
├── index.js                 # API local y servidor del build
└── pokeapi.js               # Proxy, límite de concurrencia y persistencia

scripts/
├── run-app.js               # Inicia backend con Vite en dev/preview
└── sync-pokeapi.js          # Precarga o actualiza los datos en SQLite

playwright.config.js         # Configuración de pruebas end-to-end
tests/e2e/                   # Casos E2E de búsqueda, filtros y sprites

data/masterdex.sqlite        # Base local generada; ignorada por Git
styles.css                  # Estilos globales y reglas responsivas
index.html                  # Documento de entrada
vite.config.js              # Configuración de Vite
```

## Notas sobre los datos

- Los registros JSON de PokéAPI se sirven desde SQLite una vez cacheados; `MASTERDEX_OFFLINE=true` necesita que la sincronización haya terminado correctamente.
- Las imágenes de Pokémon siguen cargándose desde URLs externas y algunas formas no cuentan con recursos para todos los modos.
- La elección de recursos gráficos tiene alternativas por generación y juego; algunas formas no cuentan con imágenes para todos los modos.
- La traducción de descripciones se solicita desde la ficha mediante un endpoint web de Google Translate. El resultado se conserva en `localStorage` del navegador para reutilizarlo; depende de la disponibilidad del servicio.
- Las regiones del filtro se asignan mediante rangos de números nacionales definidos por el proyecto.

---

MasterDex es un proyecto de fans y no está afiliado, respaldado ni aprobado por Nintendo, Game Freak o The Pokémon Company. Pokémon y los nombres relacionados son marcas de sus respectivos propietarios.
