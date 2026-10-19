# MasterDex — contexto del proyecto y guía para agentes

Este documento resume el estado comprobable del repositorio y las reglas para continuarlo. La fuente principal es el código actual; las conversaciones disponibles en esta sesión se usan solo para registrar decisiones recientes que no aparecen en el historial de Git. Si una afirmación es una inferencia, se señala como tal.

## 1. Identidad y propósito de MasterDex

**Comprobado:** MasterDex es una Pokédex web en español. Permite recorrer especies de la Pokédex Nacional, buscar y filtrar registros, y consultar una ficha con datos, formas, sprites, estadísticas, evoluciones y movimientos. El `README.md` y `index.html` describen una estética inspirada especialmente en la quinta generación de los juegos Pokémon.

**Propósito inferido de la interfaz:** ofrecer una consulta visual más completa que una lista de nombres, combinando datos de la PokéAPI con una presentación propia y consistente.

**Público objetivo:** personas que quieran explorar información Pokémon desde el navegador. No hay requisitos de usuario, perfiles ni públicos adicionales documentados.

## 2. Estado actual del proyecto

El repositorio contiene un frontend React/Vite, un backend Node local con SQLite para desarrollo y Vercel Functions que usan Turso en producción. La caché local está en `data/masterdex.sqlite`; `npm run migrate:sqlite-to-turso` copia su contenido a Turso. No hay autenticación ni perfiles de usuario. Playwright está configurado para Chromium y contiene 28 pruebas E2E para búsqueda, filtros, orden, ficha, navegación y comportamientos responsive. La conversación confirma el despliegue en `https://masterdex-pk.vercel.app/` y que el usuario verificó la web en escritorio y móvil.

### Implementado en el código

- Lista nacional limitada a los primeros 1.025 registros, con búsqueda, orden y carga incremental.
- Un único componente `src/components/Header.jsx` se comparte entre Lista Pokédex y ficha. La ficha oculta los controles de catálogo, conservando la misma marca y estructura del encabezado.
- En la lista, ↑/↓ mueve el foco entre filas y actualiza la previsualización. Si esas flechas se pulsan fuera de un control interactivo, ↓ entra por la primera fila visible y ↑ por la última fila visible. En escritorio, clic, Enter o Espacio abre la ficha; en móvil y con puntero táctil, la primera activación selecciona el Pokémon para previsualizar su artwork y la segunda activación de esa misma fila abre la ficha. El botón «Ver detalles» también la abre. En tablets de 701–900 px en orientación vertical, la lista apila la previsualización sobre los registros; en horizontal mantiene las dos columnas de escritorio y muestra el botón «Ver detalles» debajo de los tipos, sin la leyenda inferior.
- Filtros combinables por región y tipo.
- Panel de vista previa y ficha por especie con pestañas de formas y variantes.
- Datos de altura, peso, grupos huevo, hábitat, tipos, habilidades, estadísticas, evoluciones, movimientos aprendidos por nivel y efectividad defensiva de tipos.
- Descripciones de habilidades en un popover flotante con encabezado “Descripción” y resaltado turquesa de la habilidad activa; prioriza el español y, si recurre a inglés, ofrece traducción bajo demanda, caché y alternancia entre traducción y original; cierra al hacer clic fuera o pulsar Escape.
- Selección separada de imágenes 2D y recursos gráficos 3D disponibles.
- Selector Shiny en la imagen principal, que cambia el recurso de la forma elegida sin cambiar entre los modos 2D/3D.
- Descripción en español cuando existe; si no, texto en inglés con traducción solicitada por el usuario y alternativa para volver al original.
- Estados de carga y error para la lista y la ficha; la lista ofrece reintento.
- Backend HTTP local con caché persistente SQLite de respuestas PokéAPI, respuestas comprimidas con gzip y límite de solicitudes upstream simultáneas.
- Script de sincronización completa para los catálogos y recursos consultados por la interfaz; el modo `MASTERDEX_OFFLINE=true` sirve solo desde SQLite y falla explícitamente ante un recurso faltante.

### Parcial o dependiente de terceros

- La traducción se solicita al endpoint web de Google Translate al pulsar el botón. El resultado se guarda en `localStorage`; el servicio no tiene garantía ni integración formal configurada.
- La cobertura y calidad de datos, formas, iconos, sprites e ilustraciones dependen de PokéAPI y del repositorio de sprites público de PokeAPI.
- El fallback dinámico del backend consulta PokéAPI cuando la respuesta no está en la base, salvo que `MASTERDEX_OFFLINE` esté activo. La sincronización completa local actualiza el conjunto de recursos espejado, pero no incorpora imágenes binarias.
- Algunos Pokémon o formas no tienen un sprite 2D o 3D para el modo seleccionado. La ficha muestra un mensaje de recurso no disponible en lugar de fingir que la imagen del otro modo es la solicitada.
- Las reglas de deduplicación y orden especial de formas de Zygarde son una excepción visual implementada en la ficha.

### No encontrado / pendiente de confirmación

- No hay historias de usuario, roadmap formal ni backlog dentro del repositorio.
- El usuario confirmó que producción está publicada en `https://masterdex-pk.vercel.app/` y funciona en escritorio y móvil. El flujo de configuración está documentado en `GUIDE.md`; el estado del último deploy debe verificarse en Vercel cuando sea relevante.
- No existe script `test`, `lint` o `format` en `package.json`.

## 3. Stack tecnológico

| Tecnología | Versión comprobada | Uso |
|---|---:|---|
| JavaScript con módulos ES | — | Lógica de interfaz y servidor Node |
| React | 19.3.0 en `package-lock.json` | Componentes y estado |
| React DOM | 19.3.0 en `package-lock.json` | Montaje en el navegador |
| Vite | 8.3.4 en `package-lock.json` | Servidor de desarrollo y build |
| `@vitejs/plugin-react` | 6.1.2 en `package-lock.json` | Transformación React en Vite |
| `@playwright/test` | 1.64.1 en `package-lock.json` | Runner de pruebas end-to-end; configuración en `playwright.config.js` |
| `@libsql/client` | `^0.18.0` en `package.json` | Cliente Turso/libSQL utilizado por las funciones de Vercel |
| `node:sqlite` | Integrado en Node.js 22.13+ | SQLite síncrono para el caché local de respuestas |
| CSS | — | Estilos globales, diseño responsivo y algunos SVG como máscaras |

`package.json` declara las dependencias con el rango `latest`; el lockfile contiene las versiones exactas anteriores. `package.json` ahora requiere Node `>=22.13.0`: Vite 8 lo necesita y la migración SQLite usa `StatementSync.iterate()` desde esa versión. El módulo SQLite integrado aún puede imprimir una advertencia experimental según la versión concreta de Node. En el entorno inspeccionado se observó Node 25.2.1 y npm 11.19.0.

No se usan librerías adicionales de UI, router, estado global ni iconos. Playwright está instalado como dependencia de desarrollo y cuenta con pruebas E2E en `tests/e2e/`.

## 4. Arquitectura

La interfaz está separada en orquestación, pantallas, componentes reutilizables, constantes y helpers; las consultas de datos pasan por el backend local:

1. `src/main.jsx` monta `<App />` con `React.StrictMode` e importa `styles.css`.
2. `src/App.jsx` consulta `/api/pokeapi/v2/pokemon?limit=1025`, mantiene el estado compartido de registros y detalles consultados, y coordina navegación entre las dos pantallas.
3. `src/screens/DexScreen.jsx` muestra la lista, búsqueda, filtros, orden y carga incremental; delega encabezado, filas y panel de vista previa a componentes separados.
4. `src/screens/PokemonDetailPage.jsx` presenta la ficha y obtiene Pokémon, especie, variedades, cadena evolutiva, traducciones de habilidades y movimientos. Las variedades se consultan en paralelo; los detalles de movimientos usan hasta seis trabajadores concurrentes.
5. `src/components/` contiene elementos reutilizables como encabezado, filas, paneles, etiquetas de tipo, clases de movimiento, estadísticas y ramas evolutivas.
6. `src/data/constants.js` centraliza recursos, catálogos y cachés en memoria; `src/utils/pokemon.js` contiene funciones de dominio para seleccionar sprites, normalizar etiquetas y textos, y preparar movimientos.
7. En desarrollo, las solicitudes `/api/pokeapi/v2/*` llegan a `server/index.js`, que consulta SQLite; ante un miss, `server/pokeapi.js` obtiene el recurso remoto y lo guarda comprimido. En Vercel, `api/pokeapi/v2.js` hace lo mismo mediante Turso y `server/pokeapi-service.js`. `api/health.js` informa el estado de la función y la base activa. Las URL internas de PokéAPI siguen apuntando al endpoint de la aplicación.
8. Abrir una especie cambia la URL de interfaz a `/pokemon/{id}` con History API; `popstate` sincroniza el botón Atrás del navegador. No hay router externo. En desarrollo, Vite hace proxy de `/api`; en producción `vercel.json` dirige la API a Vercel Functions y mantiene `/pokemon/*` como ruta SPA.

Los detalles consultados por React se mantienen también en memoria durante la sesión. En desarrollo SQLite persiste recursos JSON entre reinicios del servidor local; en producción Turso comparte la caché entre invocaciones serverless. Ambas guardan JSON comprimido por ruta de API, con `cached_at`, no un esquema relacional específico por entidad.

## 5. Estructura del repositorio

- `AGENTS.md`: esta guía central de contexto y desarrollo.
- `README.md`: presentación pública de MasterDex, sus funciones y el enlace para probar el sitio.
- `GUIDE.md`: instalación, desarrollo local, pruebas y publicación del proyecto.
- `docs/screenshots/`: capturas de escritorio, ficha, evoluciones y vista mobile incluidas en el README.
- `package.json`, `package-lock.json`: dependencias y scripts; conservar el lockfile sincronizado con cualquier cambio de dependencias.
- `index.html`: documento HTML, idioma `es`, metadatos, fuentes remotas y entrada del módulo.
- `vite.config.js`: configuración mínima de Vite con `@vitejs/plugin-react`.
- `vercel.json`: build de Vite, salida `dist/` y rewrites de API y rutas SPA.
- `api/health.js`, `api/pokeapi/v2.js`: funciones serverless para salud y recursos de PokéAPI, con caché en Turso.
- `server/database.js`: crea el archivo SQLite, comprime/descomprime respuestas y mantiene la tabla `api_cache`; migra una tabla JSON anterior a BLOB gzip.
- `server/pokeapi.js`: normaliza rutas, limita y deduplica fetches, cachea respuestas y redirige enlaces API dentro del JSON.
- `server/pokeapi-service.js`, `server/pokeapi-shared.js`, `server/turso-database.js`: lógica compartida entre el backend SQLite local y la API de producción con Turso.
- `server/index.js`: endpoint de salud, API local, modo sin conexión y servidor del build con fallback SPA.
- `scripts/run-app.js`: inicia el backend y Vite juntos para dev/preview, y cierra ambos procesos coordinadamente.
- `scripts/sync-pokeapi.js`: recorre catálogos, Pokémon/formas, especies, habilidades, movimientos, cadenas evolutivas y tipos para llenar/actualizar SQLite.
- `scripts/migrate-sqlite-to-turso.js`: copia recursos comprimidos de la caché local a Turso.
- `playwright.config.js`: configura Chromium, el servidor aislado de E2E en Vite `4173` y backend `3101`, modo offline, trazas/capturas ante fallos y descubrimiento en `tests/e2e/`.
- `tests/e2e/dex-search-filters.spec.js`: búsqueda por nombre/número y filtros por región, tipo y combinación.
- `tests/e2e/dex-controls.spec.js`: orden ascendente/descendente, filtros múltiples/limpieza, cierre de menús y uso móvil/teclado.
- `tests/e2e/pokemon-detail-data.spec.js`: datos de especie, formas, traducción de descripciones y habilidades, evoluciones y navegación.
- `tests/e2e/resilience.spec.js`: error temporal de carga y reintento.
- `tests/e2e/pokemon-sprites.spec.js`: sprites normales 2D/3D y activación/restauración de Shiny en ambos modos.
- `tests/e2e/responsive-detail.spec.js`: orden móvil de secciones, desplazamiento de cadenas lineales/ramificadas, efectividades y formas, layout de escritorio/tablet y selección por toque en tablet.
- `tests/e2e/helpers/pokeapi-mocks.js`: fixtures con IDs nacionales y respuestas API/imágenes simuladas para no depender de red o SQLite poblada.
- `data/masterdex.sqlite`: base local generada y excluida de Git; ruta configurable con `MASTERDEX_DB_PATH`.
- `public/favicon.svg`: favicon SVG de Poké Ball cian.
- `styles.css`: hoja global. Contiene estilos de ambas pantallas, breakpoints y reglas añadidas como overrides; también hay reglas antiguas que podrían ya no corresponder a componentes actuales.
- `src/main.jsx`: punto de entrada React, Strict Mode e importación de estilos.
- `src/App.jsx`: estado compartido, carga inicial del catálogo y navegación entre pantallas.
- `src/components/`: componentes de interfaz reutilizables, en módulos individuales: `Brand.jsx`, `FilterGroup.jsx`, `Header.jsx`, `MoveClassIcon.jsx`, `PokemonRow.jsx`, `PreviewPanel.jsx`, `SparkleIcon.jsx`, `StatIcon.jsx`, `TypeBadge.jsx` y `EvolutionBranch.jsx`.
- `src/components/TypeEffectiveness.jsx`: tabla que agrupa los tipos de ataque según el multiplicador de daño recibido por la forma seleccionada.
- `src/screens/DexScreen.jsx`: interfaz de lista, búsqueda, filtrado regional y por tipo, orden, selección móvil para la previsualización y paginación incremental.
- `src/screens/PokemonDetailPage.jsx`: interfaz y carga de datos de la ficha, sus formas, habilidades, descripción, estadísticas, evoluciones y movimientos.
- `src/data/constants.js`: URLs de API/recursos, nombres y colores de tipos, regiones, etiquetas estadísticas y cachés compartidas.
- `src/utils/pokemon.js`: funciones de dominio para rutas, iconos y sprites, traducción genérica de textos descriptivos con caché, etiquetas de formas, grupos huevo/hábitats, movimientos y requisitos evolutivos.
- `src/utils/typeEffectiveness.js`: tabla local del chart moderno de tipos y cálculo de multiplicadores defensivos; combina ambos tipos sin solicitudes adicionales a PokéAPI.
- `src/assets/pkmn-types/`: iconos SVG de los 18 tipos usados en el filtro. El archivo `fight.svg` corresponde al tipo `fighting`.
- `src/assets/moves/`: imágenes PNG de las clases Físico, Especial y Estado.
- `src/assets/stats/`: iconos SVG de PS, Ataque, Defensa, Ataque Especial, Defensa Especial y Velocidad.
- `src/assets/ability-info.svg`: icono SVG local que acompaña el encabezado de las descripciones de habilidades.
- `node_modules/`: dependencias instaladas, ignoradas por Git.
- `dist/`: salida generada de Vite, ignorada por Git; no editarla manualmente.
- `data/`: datos SQLite persistentes generados localmente; no commitear el archivo de base ni sus WAL.

Las capturas del README viven en `docs/screenshots/`. La suite Playwright vive en `tests/e2e/` y actualmente tiene 28 pruebas.

## 6. Funcionalidades

### Catálogo

- Carga 1.025 registros de `/pokemon?limit=1025`. El ID nacional de cada fila se infiere del índice de la respuesta más uno.
- La búsqueda compara nombre parcial, número exacto y número rellenado a cuatro dígitos; se elimina un `#` inicial.
- Orden desde un menú flotante: número de Pokédex o alfabético. El criterio nuevo empieza ascendente; volver a elegir el criterio activo invierte la dirección. Los valores internos son `id-asc`, `id-desc`, `name-asc` y `name-desc`.
- El botón `ALEATORIO` del encabezado elige una especie aleatoria del catálogo nacional completo y la abre con la navegación de ficha normal; no limita el sorteo a la búsqueda ni a los filtros activos. Está deshabilitado mientras el catálogo no está disponible.
- La lista muestra 60 entradas inicialmente y agrega más cerca del final del contenedor.
- Al pasar el cursor o enfocar una fila, se carga una ficha en memoria para mostrar ilustración oficial y tipos en el panel de vista previa.
- En móvil (hasta 700 px) y dispositivos táctiles, la primera activación de una fila actualiza la previsualización sin navegar; volver a activar esa misma fila abre su ficha. El panel muestra una instrucción táctil y presenta el botón «Ver detalles» cuando hay un Pokémon seleccionado. En un dispositivo híbrido, un clic con mouse mantiene la navegación directa. Cambiar búsqueda, filtros u orden limpia la selección.

### Filtros

- Los filtros de región usan rangos nacionales definidos en `DEX_REGIONS` (Kanto 1–151 … Paldea 906–1025); no consultan una propiedad de región en cada Pokémon.
- El filtro de tipo carga `/type/{type}` y guarda sus miembros en `TYPE_MEMBER_CACHE`.
- Seleccionar varias regiones o tipos aplica semántica **OR dentro del grupo**: coincide con cualquiera de las opciones seleccionadas. Si se seleccionan región y tipo, ambos grupos restringen el resultado.
- Los iconos de tipo se cargan desde `src/assets/pkmn-types/` mediante `import.meta.glob`.
- En móvil (hasta 700 px), tanto regiones como tipos se presentan en tres columnas; para el grupo de tipos se anula el flujo por columnas de escritorio y se vuelve a ordenar por filas.

**Iconos Pokémon:** una única función, `latestPokemonIcon`, compartida por filas de la lista y pestañas de formas. Orden de prioridad: icono específico Sword/Shield Gen VIII, icono general Gen VIII, icono Gen VII, icono Gen VI y finalmente Scarlet/Violet Gen IX. No selecciona iconos de Brilliant Diamond/Shining Pearl ni Legends: Arceus. En la lista debe recibir el detalle completo consultado desde el backend local (`details[id]`), ya que los registros del endpoint de catálogo contienen solo nombre y URL y no incluyen `sprites`. La lista intenta cada icono compatible si falla el anterior, pero nunca sustituye iconos ausentes o fallidos por sprites 2D; si no hay un icono disponible en esas generaciones, la miniatura queda vacía.

### Ficha

- Ruta cliente `/pokemon/{id}`; permite volver por botón de la ficha, marca del sitio o historial del navegador.
- Formas desde `pokemon-species.varieties`; etiquetas construidas por `formLabel` para megaevoluciones, Gigamax, formas regionales y otros sufijos. Si la fila horizontal desborda, muestra flechas contextuales, oculta la scrollbar y mantiene visible la opción activa al cambiar.
- En Zygarde se omiten de las pestañas los nombres terminados en `-power-construct`, que repetían visualmente las formas 10% y 50%; las pestañas visibles se ordenan como habitual, 10%, completa y Mega. Esta excepción solo afecta el selector.
- Los sprites normales y Shiny 2D priorizan `generation-v/black-white/front_default` o `front_shiny`, y después `sprites.front_default` o `front_shiny`. Los recursos 3D priorizan sprites de generaciones VI–VIII, después `generation-ix/legends-za`, `scarlet-violet` y otros juegos de la IX, usando `front_shiny` cuando Shiny está activo. El recurso es una imagen/render estático, no un modelo 3D interactivo. Si falta el recurso Shiny en el modo seleccionado, se informa que no está disponible y no se muestra la versión normal como sustituto.
- La preferencia 2D/3D se mantiene en `App` y se persiste en `localStorage` con la clave `masterdex-view-mode`; sobrevive al cambio de especie, a volver a la lista y a recargar la aplicación. El selector completo es un único botón: cualquier clic alterna el modo y el indicador cian se desliza entre las etiquetas. Usa `aria-pressed`; solo se acepta `2d` o `3d`, y ante almacenamiento bloqueado o valor inválido se usa 2D.
- La imagen principal de la ficha y el arte de la vista previa muestran una Poké Ball CSS giratoria con banda cian mientras sus imágenes remotas se cargan. El estado está asociado a la URL activa para evitar que una carga tardía de otra forma o Pokémon quite el indicador actual; al fallar, se oculta el indicador y la ficha conserva su mensaje de recurso ausente. La animación respeta `prefers-reduced-motion`.
- El control `SHINY`, compacto y con un icono de destello, está en la esquina inferior izquierda del panel principal y alterna la variante activa; cambiar de Pokémon o forma vuelve a Normal.
- En miniaturas de formas se usa la función compartida `latestPokemonIcon`; las pestañas aún tienen fallback visual a sprite 2D/render si no hay icono.
- Los textos descriptivos priorizan entradas españolas (`es`, `es-419`); si no hay ninguna, usan inglés y muestran controles para solicitar traducción o volver al original. El texto traducido se almacena en `localStorage` por contenido.
- Habilidades y movimientos prefieren nombres localizados `es`/`es-419`, con nombre derivado del slug como fallback. Al abrir una habilidad, se muestra primero `effect_entries` en español si existe; de lo contrario, el texto descriptivo más reciente de `flavor_text_entries` en español. Si faltan ambos, se usa el efecto breve en inglés y se etiqueta como tal; si no hay texto en ningún idioma, se informa que la descripción no está disponible. El texto inglés puede traducirse bajo demanda con el mismo endpoint y caché local de las descripciones de especie. La ficha consulta el recurso de habilidad una sola vez para localizar el nombre y obtener la descripción. La descripción se almacena como `abilityInfo.text` y la interfaz debe leer esa misma propiedad.
- Estadísticas: barras escaladas sobre 255. Categorías de color según valor: `<20`, `<50`, `<90`, `<150` y `>=150`. Los seis iconos están en `src/assets/stats/` y sus colores son diferentes.
- Altura y peso vienen del detalle de cada forma; los grupos huevo y el hábitat se leen del recurso de especie ya cargado y aparecen como metadatos en texto simple debajo de la descripción. Los slugs conocidos se presentan en español mediante mapas locales en `src/utils/pokemon.js`, sin llamadas extra. PokéAPI puede no asignar hábitat a algunas especies y en ese caso se ve “No especificado”.
- Evoluciones: representa el árbol completo de PokéAPI. Los tramos lineales muestran la condición y una flecha SVG entre tarjetas. Las bifurcaciones conectan cada alternativa a un raíl común, sin paneles ni títulos visibles; las líneas llegan hasta las tarjetas y la punta conserva su proporción. El raíl une los centros de la primera y última alternativa. Los destinos conservan el mismo tamaño que las demás tarjetas y se alinean por columna independientemente del largo del requisito. Eevee mantiene las evoluciones con piedra a la izquierda y las de amistad/afecto a la derecha. En pantallas angostas la cadena puede desplazarse horizontalmente. Las ubicaciones históricas repetidas de Leafeon/Glaceon se resumen en una sola condición de roca musgo/hielo, junto con la piedra alternativa; Sylveon unifica afecto 2 corazones o amistad 160+ con el requisito común de movimiento Hada. Se conserva el arte oficial y la navegación a cada ficha.
- En mobile, la cadena evolutiva muestra flechas izquierda/derecha cuando existe contenido fuera de vista; cada clic desplaza un tramo. Las flechas se actualizan con el scroll y el cambio de tamaño. Cuando aparecen, la scrollbar horizontal se oculta.
- Movimientos por nivel: selecciona el grupo de versiones más reciente encontrado entre los datos de aprendizaje por nivel; los iconos de clase son PNG locales y el tipo usa las cápsulas de tipo reutilizadas.
- Debilidades y resistencias: combina los tipos defensores de la forma activa con el chart moderno y muestra ataques ×4, ×2, ×1, ×½, ×¼ o ×0. Cada fila mantiene sus cápsulas en una sola línea desplazable; cuando quedan tipos fuera de vista muestra flechas izquierda/derecha y oculta la scrollbar para desplazar esa fila. Es un cálculo por tipos; deliberadamente no modela habilidades, objetos ni estados de batalla.

## 7. Diseño y experiencia de usuario

- Estética de Pokédex tecnológica, con grilla de fondo, encabezado oscuro, acento turquesa, paneles claros, tablas y estados visuales de selección. En la ficha, los paneles de Cadena Evolutiva y Movimientos ocupan filas completas: la cadena usa el ancho disponible y Movimientos aparece debajo.
- `Inter` para texto general y `Barlow Condensed` para encabezados técnicos; ambas se cargan desde Google Fonts en `index.html`.
- Componentes reutilizables en `src/components/`: `Brand`, `FilterGroup`, `TypeBadge`, `MoveClassIcon`, `SparkleIcon`, `PokemonRow`, `PreviewPanel`, `StatIcon` y `EvolutionBranch`.
- `styles.css` incluye reglas para escritorio y móvil (`max-width: 900px`, `700px` y otras heredadas), y diseños distintos para lista y ficha.
- Las filas de la Pokédex conservan el contorno trapezoidal; el icono está separado en un panel carbón medio y una franja cian cuya inclinación coincide con el borde oblicuo del panel. El bloque se reduce en móvil.
- Hay etiquetas ARIA en filtros, navegación de formas, tabla de características y selector de vista. Las filas abren la ficha con mouse en escritorio; en pantallas móviles y al usar toque se activan como previsualización y el botón «Ver detalles» abre la ficha. No se encontró una auditoría formal WCAG. Las animaciones de interfaz actuales respetan `prefers-reduced-motion`.
- La lista escalona suavemente la entrada de filas nuevas y resalta el foco de teclado; los cambios de imagen, popovers, filtros/orden y secciones de ficha usan transiciones cortas. El botón de volver responde al hover y a la activación. Todas estas animaciones se desactivan con `prefers-reduced-motion`.
- La hoja CSS está compactada en reglas muy largas y contiene capas de estilos anteriores y overrides. Al modificarla, inspeccionar reglas existentes y breakpoints antes de agregar otra excepción.

## 8. Backend, datos e integraciones

En desarrollo, el backend Node mantiene la caché en SQLite local. En Vercel, las funciones API leen y escriben la caché comprimida en Turso. No se encontró autenticación, cuentas de usuario ni almacenamiento de datos personales.

Servicios externos comprobados:

- **PokéAPI v2** (`https://pokeapi.co/api/v2`): el backend la consulta ante misses o durante sincronización. El navegador consume el endpoint local `/api/pokeapi/v2`; los enlaces API dentro del JSON se reescriben a rutas locales.
- **Turso/libSQL**: almacenamiento de caché JSON gzip para Vercel Functions, configurado con `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`. La copia inicial se hace con `npm run migrate:sqlite-to-turso` desde `.env.local`; los secretos nunca deben ir a variables `VITE_*` ni al navegador.
- **Repositorio de sprites de PokeAPI en GitHub raw** (`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon`): iconos, sprites normales y variantes Shiny. Los recursos se solicitan directamente desde el navegador.
- **Google Translate** (`https://translate.googleapis.com/translate_a/single`): se llama solo cuando se pide traducción. Usa el parámetro `client=gtx`; no se observa API key. Tratarlo como endpoint web no formal/no garantizado, no como integración comercial estable.
- **Google Fonts**: entrega Inter y Barlow Condensed.

`node:sqlite` conserva JSON gzip por ruta en `data/masterdex.sqlite` para desarrollo local; en producción, `server/turso-database.js` conserva el formato equivalente en Turso. La sincronización local guardó 4.084 respuestas: catálogos, 1.351 Pokémon/formas, 1.025 especies, 313 habilidades, 833 movimientos, 540 cadenas evolutivas y 18 tipos. No se almacenan imágenes binarias. Variables locales: `MASTERDEX_DB_PATH`, `MASTERDEX_OFFLINE`, `MASTERDEX_HOST`, `MASTERDEX_API_PORT`, `PORT`, `MASTERDEX_UPSTREAM_CONCURRENCY` y `MASTERDEX_SYNC_CONCURRENCY`. Producción requiere `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` en las variables de entorno de Vercel.

## 9. Configuración y ejecución

Requisitos de desarrollo: Node `>=22.13.0` (por `node:sqlite` y `StatementSync.iterate()`), npm; conexión a internet para primera sincronización, fuentes, traducción e imágenes. El archivo `data/masterdex.sqlite` se crea al arrancar el backend local. Para Playwright, instalar Chromium con `npx playwright install chromium`.

```sh
npm ci
npm run dev
```

Scripts comprobados en `package.json`:

- `npm run dev`: inicia Node y Vite juntos mediante `scripts/run-app.js`; Vite proxya `/api` al backend.
- `npm run build`: genera `dist/`.
- `npm run preview`: inicia el backend y Vite Preview; requiere build existente.
- `npm run start`: sirve el build y las rutas SPA desde el backend Node.
- `npm run sync:pokeapi -- --only-missing`: llena los recursos faltantes; sin `--only-missing` vuelve a sincronizar los datos existentes.
- `npm run migrate:sqlite-to-turso`: copia la caché SQLite local a Turso usando credenciales de `.env.local`.
- `npm run test:e2e`: ejecuta Playwright sobre la suite ubicada en `tests/e2e/`.
- `npm run test:e2e:ui`: abre el modo interactivo de Playwright.

El servidor E2E se inicia en puertos dedicados (`4173` frontend, `3101` backend) y `MASTERDEX_OFFLINE=true`; los casos interceptan `/api/pokeapi/v2/**` y recursos de imagen con fixtures para no depender de la base local ni de servicios externos. Actualmente hay 28 pruebas y se ejecutan con `npm run test:e2e`. No hay comandos de lint o formato. El despliegue de Vercel usa `vercel.json` y Turso, así que la caché de producción no depende de disco persistente. `npm run start` sigue disponible para servir el build con backend Node/SQLite local y fallback SPA en `/pokemon/{id}`.

## 10. Convenciones de desarrollo

- Mantener el patrón actual de componentes funcionales React y hooks; usar `useMemo`/`useCallback` cuando ya se usan para derivaciones y callbacks conectados a efectos.
- Estado local de interacción en el componente o pantalla que lo necesita; conservar en `App` solo el estado compartido entre pantallas, como catálogo, detalles cargados y ruta.
- Mantener las responsabilidades separadas: presentación de pantallas en `src/screens/`, piezas reutilizables en `src/components/`, constantes en `src/data/` y lógica de dominio sin interfaz en `src/utils/`.
- Compartir `Header` entre catálogo y ficha; pasar `showCatalogControls={false}` en la ficha en vez de crear un header duplicado.
- Constantes compartidas en mayúsculas (`API`, `TYPE_NAMES`, etc.); funciones y componentes en `camelCase`/`PascalCase`; clases CSS en `kebab-case`.
- En el frontend, las consultas de datos deben usar el prefijo local `API` de `src/data/constants.js`, no URLs absolutas de PokéAPI. Manejar propiedades opcionales y respuestas parciales.
- Mantener el backend limitado a GET y rutas de recurso validadas; conservar deduplicación, caché y límites de concurrencia. No convertirlo en proxy de URL arbitraria.
- En efectos del frontend, usar `AbortController` para cancelar solicitudes al desmontar o cambiar de registro.
- Agregar recursos de tipos, movimientos o estadísticas a su carpeta temática y referenciarlos mediante imports/`import.meta.glob`, no rutas locales absolutas del equipo.
- Mantener traducciones con preferencia `es`, luego `es-419` y fallback explícito; no presentar fallback inglés como español.
- Comentar la responsabilidad de módulos y el motivo de las decisiones no obvias; evitar comentarios que repitan literalmente el código. En pruebas E2E, usar nombres descriptivos y anotar la intención de una suite o setup compartido cuando no resulte evidente.
- Probar visualmente desktop y mobile cuando el cambio afecte layout. No asumir que disponibilidad de URL significa que el recurso se dibuja correctamente.
- No introducir router, autenticación, otros servicios gestionados ni dependencias nuevas sin necesidad concreta y revisión de impacto. El backend Node/SQLite local y Vercel Functions/Turso de producción son parte de la arquitectura.

## 11. Decisiones técnicas importantes

### Confirmadas en el código

- Vite + React con CSS global; desarrollo usa backend Node y `node:sqlite`, producción usa Vercel Functions con Turso.
- El navegador llama a `/api/pokeapi/v2`. Localmente el backend sirve SQLite y consulta PokéAPI ante misses; en producción la función sirve Turso primero y consulta PokéAPI ante misses. Las regiones se calculan por número nacional.
- La función `latestPokemonIcon` compartida por lista y pestañas de formas prioriza Sword/Shield Gen VIII, iconos generales Gen VIII, Gen VII, Gen VI y Scarlet/Violet Gen IX. La lista prueba estos candidatos ante fallos de carga y nunca cae a sprites 2D; se excluyen Brilliant Diamond/Shining Pearl y Legends: Arceus.
- Las vistas 2D y 3D eligen fuentes distintas. No reutilizar un render de la categoría 3D para afirmar que existe sprite 2D.
- Los recursos propios de iconografía se conservan en `src/assets`.
- `Header` se comparte entre catálogo y ficha. En la ficha, `showCatalogControls={false}` oculta Aleatorio y los controles de búsqueda/filtro/orden sin duplicar el encabezado. En móvil mide 72 px en ambas rutas; en la lista muestra la marca a la izquierda y Aleatorio/búsqueda a la derecha. El panel de búsqueda se superpone al contenido sin aumentar la altura del header. En escritorio los controles están alineados a la derecha.
- La marca circular cian del header se construye con CSS; `public/favicon.svg` contiene el favicon de Poké Ball cian. El título de pestaña es `MasterDex` en la lista y `MasterDex - {Pokémon}` en la ficha.
- La traducción de textos ingleses es una acción explícita del usuario y conserva el original.
- Las descripciones de habilidades se muestran en un popover al pulsar cada tarjeta; priorizan datos localizados de PokéAPI, identifican el fallback inglés y se cierran al hacer clic fuera o pulsar Escape.

### Inferencias razonables, no requisitos formales

- El límite 1.025 y los rangos de regiones reflejan el alcance actual de las nueve generaciones representadas por la Pokédex Nacional.
- El modo `MASTERDEX_OFFLINE=true` elimina la dependencia de PokéAPI para los recursos sincronizados; los sprites, Google Fonts y la traducción siguen siendo recursos externos.

## 12. Problemas conocidos y deuda técnica

- El límite y los IDs `index + 1` están fijados a 1.025; futuras entradas/cambios de orden de la API requieren revisar catálogo, regiones y filtro.
- El frontend aún puede pedir en paralelo hasta 60 detalles visibles; el backend limita a seis consultas simultáneas a PokéAPI y deduplica URLs idénticas. Revisar latencia y carga de SQLite si crece el tráfico.
- El filtro de tipo convierte un fallo de carga en un conjunto vacío, lo que puede parecer que no hay coincidencias.
- Las etiquetas regionales son rangos simplificados y no consideran subdexes, variantes regionales ni procedencia compleja.
- La selección del grupo de movimientos se basa en el número máximo de `version_group` disponible por movimiento; puede no representar un único juego elegido por el usuario.
- La traducción Google no tiene garantía de disponibilidad, calidad, SLA ni clave formal; usa almacenamiento local del navegador.
- Playwright ya cubre búsqueda, filtros múltiples, orden y menú, navegación de ficha, datos de especie, traducciones, formas, algunos recursos ausentes, error/reintento y uso móvil. Aún no cubre visualmente la matriz completa de sprites ni los límites de color de cada estadística, y la suite no prueba sincronización/lectura real de SQLite/Turso. No se encontraron linter ni formatter. La DB inicial local comprimida ocupa aproximadamente 18 MB y se excluye de Git; Vercel guarda la caché de producción en Turso, no en disco efímero.
- La tabla «Debilidades y resistencias» recién añadida todavía no tiene un caso E2E dedicado que compruebe efectividades de tipos simples y dobles.
- `src/screens/PokemonDetailPage.jsx` todavía combina carga de datos y presentación de la ficha en un módulo amplio; separar esa lógica en un hook podría mejorar su mantenimiento. `styles.css` también acumula reglas antiguas y overrides compactos.
- Los rangos `latest` de `package.json` pueden actualizar dependencias al regenerar el lockfile; conservar y revisar `package-lock.json`.
- `node:sqlite` todavía puede emitir `ExperimentalWarning` según la versión de Node. El código requiere Node `>=22.13.0`, donde existe `StatementSync.iterate()` sin flag experimental.
- La caché se persiste en `data/masterdex.sqlite`, pero no es una base normalizada. Si falta un recurso, solo el modo `MASTERDEX_OFFLINE` evita una consulta al upstream.
- El backend Node sirve páginas y proxy de recursos conocidos en local. En Vercel, `api/health.js` y `api/pokeapi/v2.js` son las funciones de producción y Turso conserva la caché; no aplicar a ese entorno las instrucciones de disco persistente del backend local.
- La disponibilidad de sprites, iconos y arte varía por especie y forma. Los recursos remotos pueden fallar aunque los datos JSON estén disponibles.
- La disponibilidad Shiny puede variar entre el modo 2D y 3D para una forma. El selector debe respetar el modo y mostrar su estado no disponible si no existe el recurso solicitado.
- PokéAPI puede entregar una URL de icono que no carga. La lista intenta los demás iconos permitidos y, si todos fallan, oculta la miniatura; no debe caer al sprite frontal estándar para evitar mezclar iconos y sprites 2D en el catálogo.

No se encontró un error general reproducible durante esta inspección. La lista anterior son límites y riesgos observables, no una afirmación de que todos estén causando fallos ahora.

## 13. Tareas pendientes y prioridades

### Confirmado

- No hay backlog formal en archivos del repositorio.
- La continuidad reciente de esta sesión incluyó una inspección de sprites y el ajuste de Zygarde; los detalles se registran en la sección 16.
- El usuario marcó una **guía de habilidades** (qué hace cada habilidad y qué Pokémon la tienen) como próxima función de producto de interés. Alcance visual y comportamiento aún por definir.
- El usuario identificó la separación de `App.jsx` en módulos como prioridad de mantenimiento; la extracción inicial está hecha en el árbol de trabajo descrito en la sección 16.

### Mejoras posibles, aún no aprobadas como requisitos

1. Ampliar Playwright para cubrir las prioridades restantes: casos de borde de colores de estadísticas, prioridad detallada de iconos y sprites, y comprobaciones de integración para la caché SQLite; conservar mocks en E2E para no depender de servicios externos.
2. Considerar configurar una versión Node en `engines` y rangos de dependencia reproducibles en vez de `latest`.
3. Considerar separar la carga de datos de `PokemonDetailPage.jsx` en un hook si la ficha sigue creciendo; mantener esa extracción como refactor independiente de cambios de comportamiento.
4. Ordenar/limpiar `styles.css` después de comprobar cada selector en uso y conservar los estilos responsive actuales.
5. Considerar paginación/concurrencia más cuidadosa para llamadas de detalles y errores de filtros.
6. Si se publica el sitio, documentar proveedor, fallback SPA para `/pokemon/:id`, build y manejo de recursos externos.

No ejecutar estas mejoras como si fueran decisiones ya tomadas; confirmar alcance con el usuario cuando impliquen cambios amplios o decisiones de producto.

## 14. Seguridad y precauciones

- No almacenar ni commitear tokens, credenciales, claves privadas ni archivos `.env`. No hay claves requeridas por el código actual.
- Las descripciones que se traducen son texto público de PokéAPI; no añadir datos personales ni enviar otros contenidos al servicio de traducción.
- El backend consulta PokéAPI; el navegador aún carga sprites de GitHub raw, Google Fonts y la traducción de Google. No asumir que ninguno de esos servicios estará siempre disponible.
- Tratar las respuestas externas como datos no confiables; renderizar texto mediante React y validar cualquier URL o dato antes de convertirlo en HTML.
- No añadir dependencias ni ejecutar migraciones o despliegues para una tarea de interfaz/documentación sin autorización específica.
- Antes de limpiar o revertir cambios, revisar `git status`: preservar el trabajo local y no reemplazar modificaciones ajenas a la tarea.

## 15. Reglas para futuras modificaciones

1. Leer primero el componente, helper y reglas CSS que se modificarán; no crear otra implementación de un patrón que ya exista.
2. Mantener las diferencias entre datos de especie y datos de una forma. Las pestañas provienen de `species.varieties`; una etiqueta parecida no prueba por sí sola que sea una duplicación.
3. Para sprites, distinguir icono de lista, sprite 2D, render 3D e ilustración oficial. Confirmar el `src` elegido y su carga visual en la página, sobre todo para variantes recientes.
4. Mantener el comportamiento fallback explícito: texto inglés si falta español, mensaje cuando un recurso de imagen no existe y no simular disponibilidad con un recurso de otro modo.
5. Preservar los filtros multi-selección, búsqueda, scroll incremental y navegación con History API al tocar la pantalla de lista.
6. Mantener etiquetas accesibles, atributos `aria-*`, nombres alt informativos para imágenes de contenido y soporte de teclado en controles interactivos.
7. Confirmar los nombres de scripts en `package.json` antes de documentar o ejecutar comandos. La suite actual usa `npm run test:e2e`; no hay script `npm test`.
8. Para nuevos E2E, preferir locators accesibles (roles, labels y texto visible) y simular `/api/pokeapi/v2/**` con fixtures en vez de depender de PokéAPI, Google Translate o una base de datos poblada.
9. Para cambios visuales, revisar al menos una ficha común, una forma reciente con recursos Gen IX y tamaños mobile/desktop afectados.
10. No borrar `dist/`, cambiar servicios de traducción ni introducir proveedor de hosting por iniciativa propia. Mantener SQLite fuera de Git y documentar cualquier cambio al proceso de sincronización.
11. El árbol de trabajo puede contener cambios previos sin commit. No hacer reset, checkout destructivo ni sobrescribir `README.md` para completar otra tarea.

## 16. Registro de continuidad

- **Actualizado 2026-10-18:** Lista y ficha ya comparten el componente `Header`; `showCatalogControls={false}` oculta controles en la ficha. La marca mantiene posición y tamaño, y en móvil ambos headers miden 72 px. La búsqueda móvil abre un panel superpuesto y no altera la altura del header. Escritorio conserva las acciones alineadas a la derecha.
- **Actualizado 2026-10-18:** En móvil, la primera activación de una fila actualiza el panel de artwork y la segunda activación de la misma fila abre la ficha. El panel vacío invita a tocar un Pokémon y el panel seleccionado muestra «Ver detalles» en un botón cian con texto e icono blancos, esquinas rectas, `ability-info.svg` a la izquierda y flecha derecha animada a la derecha del texto. Las cápsulas de tipo del panel móvil usan el mismo tamaño compacto que las de las filas Pokédex. En escritorio se conserva la navegación directa por clic/teclado y la previsualización por hover/foco.
- La producción está configurada en Vercel con funciones API y Turso. El usuario confirmó `https://masterdex-pk.vercel.app/` y que el despliegue funciona en escritorio y móvil. `npm run migrate:sqlite-to-turso` copia la caché local; las funciones requieren `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` de Production. La guía operativa detallada está en `GUIDE.md`.
- El favicon actual es `public/favicon.svg` (Poké Ball cian); el título de pestaña es `MasterDex` en catálogo y `MasterDex - {Pokémon}` en ficha.

- Se agregó el apartado «Debilidades y resistencias» a la ficha. `src/utils/typeEffectiveness.js` calcula la efectividad combinada de los tipos defensores, `src/components/TypeEffectiveness.jsx` presenta los grupos en una tabla y `styles.css` adapta el diseño a escritorio y móvil. Cada lista horizontal tiene flechas contextuales accesibles que se actualizan con el scroll, el redimensionamiento y la carga de fuentes. Usa la forma activa y no añade llamadas de red; los grupos sin tipos aplicables se omiten. Comparte una fila de dos columnas con Movimientos por nivel en escritorio, debajo de la Cadena Evolutiva, y se apila en pantallas angostas. El cálculo muestra la tabla de tipos, no modificadores de combate por habilidades u objetos.
- Para evitar que las cápsulas de tipos se partan en varias líneas, la columna del analizador tiene más ancho, las cápsulas son compactas y cada categoría permanece en una sola línea con desplazamiento horizontal si hace falta.
- En la tabla defensiva, se muestran los multiplicadores ×0, ×½, ×¼, ×1, ×2 y ×4 sin etiquetas de categoría visibles. Cada multiplicador usa el atributo HTML `title`, igual que los iconos de clase de movimiento, para mostrar su nombre al pasar el cursor o enfocar el control: Inmune, Nada eficaz, Poco eficaz, Neutro, Eficaz y Súper eficaz, respectivamente.
- La columna del multiplicador es compacta y su encabezado dice «DAÑO» para dedicar el ancho disponible a los tipos atacantes.
- Los multiplicadores ×2 y ×¼ conservan sus indicadores amarillo y celeste, respectivamente, con el valor en blanco.
- `src/screens/DexScreen.jsx` inicia la navegación al presionar ↑/↓ fuera de la lista y de controles interactivos, enfocando la primera o última fila que ya está visible según la dirección para evitar saltos al final de la tanda paginada. `src/components/PokemonRow.jsx` mueve el foco entre registros con esas teclas; la activación abre la ficha en escritorio y selecciona la previsualización en móvil. `src/components/PreviewPanel.jsx` muestra el arte de la fila enfocada y ofrece «Ver detalles» en móvil.

- El contenido del catálogo/ficha tiene una transición direccional horizontal: al abrir, la vista anterior sale hacia la izquierda y la ficha entra desde la derecha; al volver, se invierte. Dura 0,65 s e incluye un difuminado breve. La captura animada es la raíz de la vista para evitar que el navegador intente interpolar tamaños distintos de los layouts y produzca un efecto de zoom. `.topbar` tiene su propio nombre de transición y no se anima. `src/App.jsx` coordina las rutas con `document.startViewTransition` y `flushSync`; `styles.css` define una entrada de respaldo para navegadores sin esa API y respeta movimiento reducido. También se aplica a Atrás/Adelante del navegador.

- Se diseñaron barras de desplazamiento con mayor visibilidad para los contenedores desplazables de la lista, ficha, evoluciones, movimientos, filtros y opciones de formas. En Chromium usan un ancho de 10 px, pista clara, thumb gris verdoso y hover cian mediante `::-webkit-scrollbar`; en navegadores sin ese soporte se usa `scrollbar-width`/`scrollbar-color` estándar. El motivo fue que Brave ocultaba la barra aunque el panel de movimientos de Shedinja sí tenía scroll funcional.

### Historial comprobable en Git

- El historial visible incluye `3d29c9f feat: improve Pokédex detail experience` y el commit inicial `9bf895b Initial MasterDex release`.

### Avances recientes disponibles en el contexto de esta sesión

- La interfaz de `src/components/EvolutionBranch.jsx` y los estilos de evoluciones en `styles.css` se reorganizaron: las rutas simples muestran la condición encima de una flecha SVG; las bifurcaciones reutilizan ese mismo conector y distribuyen las rutas alrededor de un raíl común, sin tarjetas de agrupación ni títulos visibles. Todas las etapas mantienen el mismo tamaño de tarjeta. El requisito se ubica dentro del conector de ancho fijo para que etiquetas más largas no desplacen las tarjetas; se comprobó en la ficha de Eevee y las cinco evoluciones de piedra quedan alineadas entre sí, igual que las tres del lado derecho. La interacción respeta `prefers-reduced-motion`. La lógica recursiva de PokéAPI, las etiquetas de requisitos y la navegación a las fichas se mantienen.
- La ficha de Eevee resumió las múltiples ubicaciones históricas de PokéAPI para Leafeon y Glaceon en sus dos métodos legibles: subir de nivel cerca de la roca musgo/hielo o usar la piedra hoja/hielo.
- La ficha resume las dos representaciones generacionales del requisito de Sylveon como afecto 2 corazones o amistad 160+, y un movimiento de tipo Hada.
- En escritorio, se cambió `.detail-sections-grid` a una sola columna para que Cadena Evolutiva ocupe todo el ancho de la ficha y Movimientos quede debajo; en móvil ya se mantenía una sola columna. El contenido de la cadena se centra dentro del panel cuando cabe, y conserva el scroll desde la izquierda cuando lo supera.
- La ficha de Eevee distribuye sus ocho alternativas a ambos lados del nodo central: las cinco evoluciones por piedra elemental quedan a la izquierda y Espeon, Umbreon y Sylveon a la derecha. El requisito duplicado de Sylveon queda resumido como afecto de 2 corazones o amistad 160+, más un movimiento Hada, en `src/utils/pokemon.js`.
- Se reemplazó el selector de orden por un menú flotante con dos criterios: N.º Pokédex y alfabético. Cada uno empieza ascendente y al volver a tocar el criterio seleccionado alterna a descendente. La función es local y no añade llamadas a PokéAPI.
- Al elegir un criterio, el menú de orden permanece abierto para que el usuario vea el estado actualizado; la flecha rota con transición al cambiar entre ascendente y descendente.
- La ficha muestra grupos huevo y hábitat en español como texto secundario debajo de la descripción; no ocupan tarjetas en el bloque de altura/peso. Estos campos usan los datos de especie ya solicitados, con traducciones locales de slugs y fallback “No especificado”.


- Se instaló `@playwright/test` 1.64.1 y Chromium. `playwright.config.js` ejecuta Chromium con un servidor Vite/backend aislado en los puertos 4173/3101 y modo offline. `scripts/run-app.js` reenvía argumentos de CLI a Vite. Se agregaron los scripts `test:e2e` y `test:e2e:ui`; `test-results/` y `playwright-report/` se ignoran.
- **Actualizado 2026-10-18:** la suite Playwright se amplió a 28 casos. `responsive-detail.spec.js` cubre orden de secciones en móvil, cadenas evolutivas lineales y ramificadas con flechas, efectividades, desplazamiento y selección visible de formas, layout en escritorio/tablet e interacción táctil en tablet. También se corrigió el test de filtros móviles para abrir primero el panel de búsqueda, como exige el header actual. En filas táctiles, Enter/Espacio ahora abre la ficha directamente y no imita el toque de previsualización.
- **Actualizado 2026-10-19:** se revisó la documentación en comentarios de módulos fuente, backend, scripts y configuración de Playwright. Se añadieron comentarios breves donde la concurrencia, el ciclo de vida, la migración o la intención de suite no eran evidentes. Preferir comentarios de propósito sobre anotaciones línea por línea; JSON y otros formatos que no admiten comentarios se explican en README/AGENTS.
- Se añadieron pruebas E2E para el menú de orden ascendente/descendente, semántica OR y limpieza de filtros, cierre de menús, responsive móvil y teclado; datos de grupos huevo/hábitat, estadísticas y movimientos; formas Gigamax y deduplicación de Zygarde; sprites ausentes; traducción de descripciones y habilidades con caché; navegación de evoluciones e historial; y reintento tras fallo de carga. Los fixtures simulan también una falla temporal de catálogo.
- Se verificó manualmente el modo offline en un puerto temporal: la salud indicó `offlineMode: true` y 4.084 recursos; catálogo y Bulbasaur respondieron desde SQLite, y un recurso ausente devolvió 503 sin consultar PokéAPI. El proceso temporal se cerró y no se modificó la configuración normal.
- La prueba de reintento falla dos solicitudes iniciales del catálogo porque React Strict Mode ejecuta el efecto dos veces en desarrollo; el tercer intento corresponde al botón de reintento explícito y carga correctamente.
- La descripción de habilidades usa un popover accesible y tiene cobertura E2E de descripción inglesa, traducción, vuelta al original, caché y cierre con Escape. Los grupos huevo/hábitat aparecen como metadatos en texto español y también se cubren con fixtures.
- Se ajustó `styles.css` para que en móvil el filtro de tipos use tres columnas como el de regiones, manteniendo el diseño de dos columnas en escritorio.
- Las filas de lista recibieron un panel carbón medio detrás del icono y una franja cian paralela al borde inclinado del panel; sus anchos y tamaños de icono se adaptan a breakpoints de escritorio, tablet y móvil sin cambiar el fallback compartido.
- `README.md` presenta el producto con cuatro capturas de la aplicación y un recorte del brand del encabezado; `GUIDE.md` concentra instalación, pruebas y despliegue. Las imágenes en `docs/screenshots/` se capturaron desde la build local con ilustraciones ya cargadas.

- Se modernizó la lista y ficha con filtros de tipo/región, navegación por formas, iconografía local, tablas, estadísticas coloreadas y ajustes responsive.
- Se añadieron fallbacks para iconos Gen VIII/IX y sprites recientes de Scarlet/Violet y Legends: Z-A.
- Al recorrer visualmente la lista se encontró que algunas URLs de iconos específicos de Sword/Shield faltan para especies no disponibles en esos juegos. La colección `generation-viii/icons` sirve como alternativa. Se excluyen recursos de Brilliant Diamond/Shining Pearl y Legends: Arceus. A pedido del usuario, `latestPokemonIcon` es la única función de selección compartida por filas y pestañas de formas. Las filas prueban las fuentes permitidas cuando una imagen falla, pero no sustituyen un icono por sprite 2D.
- Se ajustó la ficha de Zygarde: 2D ya no cae a su imagen 3D; cuando falta sprite 2D muestra el estado correspondiente. En las pestañas se ocultaron las dos variedades `power-construct` redundantes visualmente y se ordenaron habitual, 10%, completa y Mega.
- Se corrigió que las filas de la lista pasaran el registro resumido del catálogo a `latestPokemonIcon`; ese objeto no contiene `sprites`. Ahora la lista consulta la misma función con `detail`. Ante el pedido del usuario de quitar el fallback que mostraba sprites 2D, las filas intentan las demás fuentes de icono permitidas si falla una URL y ocultan la miniatura solo si ninguna carga.
- Una revisión visual posterior en el navegador confirmó miniaturas vacías en especies sin URL de icono de Sword/Shield, iconos generales Gen VIII o Scarlet/Violet (por ejemplo, Weedle, Beedrill y Pidgey); Kakuna recibe una URL general Gen VIII que falla al cargar. Por decisión del usuario, se agregaron Gen VII y Gen VI como fallbacks, y luego Scarlet/Violet Gen IX. La fila recorre las fuentes disponibles ante errores y no recurre a sprites 2D.
- El header conserva la marca circular cian hecha con CSS y el favicon independiente usa una Poké Ball cian en `public/favicon.svg`.
- La conversación disponible indica que el usuario confirmó que el resultado de Zygarde quedó bien. No existe en Git un commit separado que respalde esa cronología.
- Se añadió un control `SHINY` compacto con icono SVG de destellos en el panel de imagen de la ficha. Usa los campos `front_shiny` de los sprites en 2D y de los recursos gráficos por generación/juego en 3D, conserva el modo activo y vuelve a Normal al cambiar de especie o forma. Si no existe la variante para el modo elegido, muestra un mensaje en lugar de la imagen normal. La interfaz toma como referencia la imagen compartida por el usuario.
- El icono SVG de destellos se centralizó en `src/components/SparkleIcon.jsx` y se comparte también en los controles `TRADUCIR AL ESPAÑOL` y `MOSTRAR TRADUCCIÓN`; en traducción, el icono usa el cian del borde en estado normal y cambia a tinta oscura en hover para conservar el contraste con el fondo cian.
- Se invirtieron los degradados de la Pokéball decorativa del panel de vista previa vacío (`.preview-ball-top`/`.preview-ball-bottom`): mitad superior con degradado negro y mitad inferior clara, conservando el botón central. Se probó temporalmente una alternativa violeta inspirada en la Master Ball, pero el usuario prefirió volver al negro.
- Se redujo `src/App.jsx` a la coordinación del catálogo, el estado global y la navegación. Se extrajeron `DexScreen` y `PokemonDetailPage` a `src/screens/`, componentes reutilizables a `src/components/`, catálogos a `src/data/constants.js` y helpers Pokémon a `src/utils/pokemon.js`. `npm run build` pasó y una revisión en el navegador confirmó que la lista y la ficha de Charizard siguen renderizando.
- Se documentó el flujo de la aplicación con comentarios en español en componentes, helpers, constantes, efectos de carga, fallbacks, filtros, navegación y secciones principales del CSS; se explican sobre todo decisiones que no son obvias leyendo una línea aislada. `npm run build` pasó.
- Se renovó `README.md` para presentar el proyecto en GitHub: resumen y funciones, stack, backend/base de datos, inicio local, scripts, variables de configuración y estructura del repositorio. En esa versión se aclaraba que no había pruebas automatizadas; Playwright se integró después. Las imágenes y la traducción siguen dependiendo de servicios externos.
- Para reducir la dependencia de PokéAPI se creó el backend Node/SQLite descrito en las secciones 4, 8 y 9. La sincronización `npm run sync:pokeapi -- --only-missing` almacenó 4.084 recursos; respuestas JSON gzip ocupan cerca de 18 MB. El backend respondió a catálogo, Pokémon, especie, tipo, habilidad, movimiento y cadena evolutiva en modo offline estricto.
- Se cambió `src/data/constants.js` para que la interfaz consulte `/api/pokeapi/v2`; Vite proxya esta ruta en dev/preview. `npm run start` sirve el build con fallback SPA. `npm run dev` coordina backend y Vite por `scripts/run-app.js`.
- `package.json` declara Node `>=22.13.0`; `package-lock.json` sincroniza el campo `engines`. `node:sqlite` funciona sin paquete externo, aunque Node 25.2.1 imprime `ExperimentalWarning`.
- En una ejecución anterior, `npm run dev` y `npm run build` fallaron dentro del entorno aislado por `spawn EPERM` al ejecutar subprocesses de Vite en Windows. El usuario confirmó que `npm run dev` funciona correctamente en su terminal habitual; no tratar aquel fallo como defecto reproducido del proyecto. El build final también pasó al ejecutarlo fuera de esa restricción.
- La base local `data/masterdex.sqlite` está ignorada por Git; no se debe commitear. La sincronización cubre los recursos JSON que usa la aplicación, pero no los archivos de imagen, Google Fonts ni Google Translate.
- La navegación Lista ↔ Ficha conserva la transición direccional de 0,65 s. Al abrir otro Pokémon desde una ficha (por ejemplo, desde una rama evolutiva), `src/App.jsx` clasifica el cambio como `detail` y aplica un fundido de 0,36 s con un desplazamiento vertical de 6 px; el encabezado permanece inmóvil. El fallback CSS y `prefers-reduced-motion` también contemplan esta transición.
- Se agregaron animaciones breves para la entrada escalonada de filas (en tandas visuales de 12), el resaltado del foco de teclado, el fundido de sprites al terminar su carga —incluido el cambio Shiny—, la aparición del popover de habilidad, la apertura y selección de filtros/orden, la entrada escalonada de secciones de ficha y la respuesta hover/activación del botón de volver. El estado de selección de filtros ahora se expresa con la clase `is-selected` de `FilterGroup`; `prefers-reduced-motion` desactiva estas animaciones. `detail-hero` y su columna visual tienen prioridad de apilamiento sobre `detail-sections-grid`, para que el popover quede por encima de la Cadena Evolutiva.
- `DexScreen.jsx` elige uniformemente una entrada del catálogo nacional completo y la abre mediante `onOpen`. El botón ALEATORIO queda inactivo durante la carga o si falla la carga del catálogo. En escritorio va antes del buscador; en móvil se muestra como botón con texto al lado derecho del header.
- El selector de imagen 2D/3D se elevó al estado global de `App.jsx` y se guarda en `localStorage` bajo `masterdex-view-mode`. Cambiar de especie o volver a la lista conserva la última opción; Shiny sigue reiniciándose por especie como antes. El control es un único botón de ancho completo que alterna al hacer clic en cualquier lado; el indicador cian se desplaza entre modos y se desactiva con `prefers-reduced-motion`. Los localizadores E2E existentes se actualizaron al nombre accesible nuevo; no se ejecutó la suite en este cambio.

### Próximos pasos conocidos

#### Revisión responsive móvil (18-10-2026)

- **Ajuste móvil de Movimientos/Efectividades:** por preferencia del usuario, Movimientos conserva su formato de tabla también en móvil y reduce el ancho de la columna «Movimiento» para dar cabida a las demás columnas. Efectividades conserva sus cápsulas desplazables en una fila y ahora muestra flechas contextuales cuando hay tipos fuera de vista.
- **Resuelto — tabletas:** la interacción reconoce puntero táctil aparte del ancho. En 701–900 px y orientación vertical, el catálogo usa previsualización arriba y lista debajo; en orientación horizontal conserva las dos columnas. Un toque en tablet muestra la previsualización y un segundo toque en la misma fila abre la ficha, mientras que el mouse conserva navegación directa.
- **Pendiente — cadena de Eevee y ramificaciones:** ofrecer en móvil una disposición más compacta, con Eevee y alternativas/requisitos en una lista de tarjetas, evitando el diagrama que a 390 px mide aproximadamente 584 × 773 px y exige desplazamiento en dos ejes.
- **Pendiente — jerarquía de la ficha:** en teléfonos bajos (320 × 640 px), priorizar nombre y tipos antes de la ilustración/área de habilidades; evaluar mover habilidades o permitir plegarlas.
- **Resuelto — selector de formas:** las flechas contextuales indican y controlan el desplazamiento horizontal, la scrollbar se oculta mientras hay overflow y la opción activa se desplaza a la vista si fuera necesario.
- **Pendiente — filtros estrechos:** probar dos columnas y objetivos táctiles más cómodos por debajo de 360 px; las tres columnas actuales dejan etiquetas apretadas y filas de unos 30 px.
- **Observaciones de auditoría:** en 320–390 px no se observó desbordamiento horizontal global; la lista y su header móvil resultaron utilizables en los tamaños revisados. La tabla de movimientos y las flechas de desplazamiento contextual son los tratamientos móviles vigentes.

- Producto: la primera parte de la función de habilidades ya está definida e implementada en la ficha: descripciones desplegables por habilidad. La guía/catálogo independiente con búsqueda de habilidades y Pokémon que las tienen continúa sin especificación ni implementación.
- Mantenimiento: si la ficha continúa creciendo, separar sus cargas de datos en un hook sin alterar el comportamiento.
- Antes de empezar otra modificación, revisar `git status` y mantener el trabajo local actual. Si se detecta una discrepancia entre este archivo y el código, actualizar la guía según la implementación comprobada y anotar la incertidumbre.
