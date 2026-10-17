# MasterDex — contexto del proyecto y guía para agentes

Este documento resume el estado comprobable del repositorio y las reglas para continuarlo. La fuente principal es el código actual; las conversaciones disponibles en esta sesión se usan solo para registrar decisiones recientes que no aparecen en el historial de Git. Si una afirmación es una inferencia, se señala como tal.

## 1. Identidad y propósito de MasterDex

**Comprobado:** MasterDex es una Pokédex web en español. Permite recorrer especies de la Pokédex Nacional, buscar y filtrar registros, y consultar una ficha con datos, formas, sprites, estadísticas, evoluciones y movimientos. El `README.md` y `index.html` describen una estética inspirada especialmente en la quinta generación de los juegos Pokémon.

**Propósito inferido de la interfaz:** ofrecer una consulta visual más completa que una lista de nombres, combinando datos de la PokéAPI con una presentación propia y consistente.

**Público objetivo:** personas que quieran explorar información Pokémon desde el navegador. No hay requisitos de usuario, perfiles ni públicos adicionales documentados.

## 2. Estado actual del proyecto

El repositorio contiene un frontend React/Vite y un backend Node pequeño que sirve la aplicación y expone una API local respaldada por SQLite. El backend conserva respuestas de PokéAPI en `data/masterdex.sqlite` y puede sincronizar de antemano los recursos usados por la interfaz. No hay autenticación ni perfiles de usuario. Playwright está configurado para Chromium y contiene 9 pruebas E2E iniciales de búsqueda, filtros y recursos visuales. No se encontró un proveedor de despliegue configurado.

### Implementado en el código

- Lista nacional limitada a los primeros 1.025 registros, con búsqueda, orden y carga incremental.
- Filtros combinables por región y tipo.
- Panel de vista previa y ficha por especie con pestañas de formas y variantes.
- Datos de altura, peso, grupos huevo, hábitat, tipos, habilidades, estadísticas, evoluciones y movimientos aprendidos por nivel.
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
- No se comprobó una URL de producción ni instrucciones de despliegue. El servidor de desarrollo y `vite preview` no equivalen a una publicación.
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
7. Las solicitudes `/api/pokeapi/v2/*` llegan a `server/index.js`. Este consulta SQLite; ante un miss, `server/pokeapi.js` deduplica solicitudes simultáneas, limita concurrencia, obtiene el recurso remoto y lo guarda comprimido. Las URL internas de PokéAPI se reescriben para que sigan apuntando al backend propio.
8. Abrir una especie cambia la URL de interfaz a `/pokemon/{id}` con History API; `popstate` sincroniza el botón Atrás del navegador. No hay router externo. En desarrollo, Vite hace proxy de `/api`; en producción Node sirve `dist/` y las rutas de ficha como SPA.

Los detalles consultados por React se mantienen también en memoria durante la sesión; SQLite persiste recursos JSON entre reinicios y visitantes del mismo servidor. La base guarda el JSON comprimido por ruta de API, con `cached_at`, no un esquema relacional específico por entidad.

## 5. Estructura del repositorio

- `AGENTS.md`: esta guía central de contexto y desarrollo.
- `README.md`: introducción, funcionalidades y scripts de ejecución para personas que visitan el repositorio.
- `package.json`, `package-lock.json`: dependencias y scripts; conservar el lockfile sincronizado con cualquier cambio de dependencias.
- `index.html`: documento HTML, idioma `es`, metadatos, fuentes remotas y entrada del módulo.
- `vite.config.js`: configuración mínima de Vite con `@vitejs/plugin-react`.
- `server/database.js`: crea el archivo SQLite, comprime/descomprime respuestas y mantiene la tabla `api_cache`; migra una tabla JSON anterior a BLOB gzip.
- `server/pokeapi.js`: normaliza rutas, limita y deduplica fetches, cachea respuestas y redirige enlaces API dentro del JSON.
- `server/index.js`: endpoint de salud, API local, modo sin conexión y servidor del build con fallback SPA.
- `scripts/run-app.js`: inicia el backend y Vite juntos para dev/preview, y cierra ambos procesos coordinadamente.
- `scripts/sync-pokeapi.js`: recorre catálogos, Pokémon/formas, especies, habilidades, movimientos, cadenas evolutivas y tipos para llenar/actualizar SQLite.
- `playwright.config.js`: configura Chromium, el servidor aislado de E2E en Vite `4173` y backend `3101`, modo offline, trazas/capturas ante fallos y descubrimiento en `tests/e2e/`.
- `tests/e2e/dex-search-filters.spec.js`: búsqueda por nombre/número y filtros por región, tipo y combinación.
- `tests/e2e/pokemon-sprites.spec.js`: sprites normales 2D/3D y activación/restauración de Shiny en ambos modos.
- `tests/e2e/helpers/pokeapi-mocks.js`: fixtures con IDs nacionales y respuestas API/imágenes simuladas para no depender de red o SQLite poblada.
- `data/masterdex.sqlite`: base local generada y excluida de Git; ruta configurable con `MASTERDEX_DB_PATH`.
- `styles.css`: hoja global. Contiene estilos de ambas pantallas, breakpoints y reglas añadidas como overrides; también hay reglas antiguas que podrían ya no corresponder a componentes actuales.
- `src/main.jsx`: punto de entrada React, Strict Mode e importación de estilos.
- `src/App.jsx`: estado compartido, carga inicial del catálogo y navegación entre pantallas.
- `src/components/`: componentes de interfaz reutilizables, en módulos individuales: `Brand.jsx`, `FilterGroup.jsx`, `Header.jsx`, `MoveClassIcon.jsx`, `PokemonRow.jsx`, `PreviewPanel.jsx`, `SparkleIcon.jsx`, `StatIcon.jsx`, `TypeBadge.jsx` y `EvolutionBranch.jsx`.
- `src/screens/DexScreen.jsx`: interfaz de lista, búsqueda, filtrado regional y por tipo, orden y paginación incremental.
- `src/screens/PokemonDetailPage.jsx`: interfaz y carga de datos de la ficha, sus formas, habilidades, descripción, estadísticas, evoluciones y movimientos.
- `src/data/constants.js`: URLs de API/recursos, nombres y colores de tipos, regiones, etiquetas estadísticas y cachés compartidas.
- `src/utils/pokemon.js`: funciones de dominio para rutas, iconos y sprites, traducción genérica de textos descriptivos con caché, etiquetas de formas, grupos huevo/hábitats, movimientos y requisitos evolutivos.
- `src/assets/pkmn-types/`: iconos SVG de los 18 tipos usados en el filtro. El archivo `fight.svg` corresponde al tipo `fighting`.
- `src/assets/moves/`: imágenes PNG de las clases Físico, Especial y Estado.
- `src/assets/stats/`: iconos SVG de PS, Ataque, Defensa, Ataque Especial, Defensa Especial y Velocidad.
- `src/assets/ability-info.svg`: icono SVG local que acompaña el encabezado de las descripciones de habilidades.
- `src/assets/masterdex-pokedex.svg`: propuesta vectorial morada de una Pokédex abierta, conservada como referencia; no está conectada a la interfaz.
- `node_modules/`: dependencias instaladas, ignoradas por Git.
- `dist/`: salida generada de Vite, ignorada por Git; no editarla manualmente.
- `data/`: datos SQLite persistentes generados localmente; no commitear el archivo de base ni sus WAL.

No se encontró carpeta `docs/`. La suite Playwright vive en `tests/e2e/` y actualmente tiene 9 pruebas iniciales.

## 6. Funcionalidades

### Catálogo

- Carga 1.025 registros de `/pokemon?limit=1025`. El ID nacional de cada fila se infiere del índice de la respuesta más uno.
- La búsqueda compara nombre parcial, número exacto y número rellenado a cuatro dígitos; se elimina un `#` inicial.
- Orden desde un menú flotante: número de Pokédex o alfabético. El criterio nuevo empieza ascendente; volver a elegir el criterio activo invierte la dirección. Los valores internos son `id-asc`, `id-desc`, `name-asc` y `name-desc`.
- La lista muestra 60 entradas inicialmente y agrega más cerca del final del contenedor.
- Al pasar el cursor o enfocar una fila, se carga una ficha en memoria para mostrar ilustración oficial y tipos en el panel de vista previa.

### Filtros

- Los filtros de región usan rangos nacionales definidos en `DEX_REGIONS` (Kanto 1–151 … Paldea 906–1025); no consultan una propiedad de región en cada Pokémon.
- El filtro de tipo carga `/type/{type}` y guarda sus miembros en `TYPE_MEMBER_CACHE`.
- Seleccionar varias regiones o tipos aplica semántica **OR dentro del grupo**: coincide con cualquiera de las opciones seleccionadas. Si se seleccionan región y tipo, ambos grupos restringen el resultado.
- Los iconos de tipo se cargan desde `src/assets/pkmn-types/` mediante `import.meta.glob`.
- En móvil (hasta 700 px), tanto regiones como tipos se presentan en tres columnas; para el grupo de tipos se anula el flujo por columnas de escritorio y se vuelve a ordenar por filas.

**Iconos Pokémon:** una única función, `latestPokemonIcon`, compartida por filas de la lista y pestañas de formas. Orden de prioridad: icono específico Sword/Shield Gen VIII, icono general Gen VIII, icono Gen VII, icono Gen VI y finalmente Scarlet/Violet Gen IX. No selecciona iconos de Brilliant Diamond/Shining Pearl ni Legends: Arceus. En la lista debe recibir el detalle completo consultado desde el backend local (`details[id]`), ya que los registros del endpoint de catálogo contienen solo nombre y URL y no incluyen `sprites`. La lista intenta cada icono compatible si falla el anterior, pero nunca sustituye iconos ausentes o fallidos por sprites 2D; si no hay un icono disponible en esas generaciones, la miniatura queda vacía.

### Ficha

- Ruta cliente `/pokemon/{id}`; permite volver por botón de la ficha, marca del sitio o historial del navegador.
- Formas desde `pokemon-species.varieties`; etiquetas construidas por `formLabel` para megaevoluciones, Gigamax, formas regionales y otros sufijos.
- En Zygarde se omiten de las pestañas los nombres terminados en `-power-construct`, que repetían visualmente las formas 10% y 50%; las pestañas visibles se ordenan como habitual, 10%, completa y Mega. Esta excepción solo afecta el selector.
- Los sprites normales y Shiny 2D priorizan `generation-v/black-white/front_default` o `front_shiny`, y después `sprites.front_default` o `front_shiny`. Los recursos 3D priorizan sprites de generaciones VI–VIII, después `generation-ix/legends-za`, `scarlet-violet` y otros juegos de la IX, usando `front_shiny` cuando Shiny está activo. El recurso es una imagen/render estático, no un modelo 3D interactivo. Si falta el recurso Shiny en el modo seleccionado, se informa que no está disponible y no se muestra la versión normal como sustituto.
- El control `SHINY`, compacto y con un icono de destello, está en la esquina inferior izquierda del panel principal y alterna la variante activa; cambiar de Pokémon o forma vuelve a Normal.
- En miniaturas de formas se usa la función compartida `latestPokemonIcon`; las pestañas aún tienen fallback visual a sprite 2D/render si no hay icono.
- Los textos descriptivos priorizan entradas españolas (`es`, `es-419`); si no hay ninguna, usan inglés y muestran controles para solicitar traducción o volver al original. El texto traducido se almacena en `localStorage` por contenido.
- Habilidades y movimientos prefieren nombres localizados `es`/`es-419`, con nombre derivado del slug como fallback. Al abrir una habilidad, se muestra primero `effect_entries` en español si existe; de lo contrario, el texto descriptivo más reciente de `flavor_text_entries` en español. Si faltan ambos, se usa el efecto breve en inglés y se etiqueta como tal; si no hay texto en ningún idioma, se informa que la descripción no está disponible. El texto inglés puede traducirse bajo demanda con el mismo endpoint y caché local de las descripciones de especie. La ficha consulta el recurso de habilidad una sola vez para localizar el nombre y obtener la descripción. La descripción se almacena como `abilityInfo.text` y la interfaz debe leer esa misma propiedad.
- Estadísticas: barras escaladas sobre 255. Categorías de color según valor: `<20`, `<50`, `<90`, `<150` y `>=150`. Los seis iconos están en `src/assets/stats/` y sus colores son diferentes.
- Altura y peso vienen del detalle de cada forma; los grupos huevo y el hábitat se leen del recurso de especie ya cargado y aparecen como metadatos en texto simple debajo de la descripción. Los slugs conocidos se presentan en español mediante mapas locales en `src/utils/pokemon.js`, sin llamadas extra. PokéAPI puede no asignar hábitat a algunas especies y en ese caso se ve “No especificado”.
- Evoluciones: cadena evolutiva de PokéAPI, requisitos simplificados a etiquetas y arte oficial de sprites.
- Movimientos por nivel: selecciona el grupo de versiones más reciente encontrado entre los datos de aprendizaje por nivel; los iconos de clase son PNG locales y el tipo usa las cápsulas de tipo reutilizadas.

## 7. Diseño y experiencia de usuario

- Estética de Pokédex tecnológica, con grilla de fondo, encabezado oscuro, acento turquesa, paneles claros, tablas y estados visuales de selección.
- `Inter` para texto general y `Barlow Condensed` para encabezados técnicos; ambas se cargan desde Google Fonts en `index.html`.
- Componentes reutilizables en `src/components/`: `Brand`, `FilterGroup`, `TypeBadge`, `MoveClassIcon`, `SparkleIcon`, `PokemonRow`, `PreviewPanel`, `StatIcon` y `EvolutionBranch`.
- `styles.css` incluye reglas para escritorio y móvil (`max-width: 900px`, `700px` y otras heredadas), y diseños distintos para lista y ficha.
- Las filas de la Pokédex conservan el contorno trapezoidal; el icono está separado en un panel carbón medio y una franja cian cuya inclinación coincide con el borde oblicuo del panel. El bloque se reduce en móvil.
- Hay etiquetas ARIA en filtros, navegación de formas, tabla de características y selector de vista; las filas se pueden abrir con Enter o Espacio. No se encontró una auditoría formal WCAG ni soporte explícito de `prefers-reduced-motion`.
- La hoja CSS está compactada en reglas muy largas y contiene capas de estilos anteriores y overrides. Al modificarla, inspeccionar reglas existentes y breakpoints antes de agregar otra excepción.

## 8. Backend, datos e integraciones

El proyecto ahora incluye un backend Node y almacenamiento SQLite persistente. No se encontró autenticación, cuentas de usuario ni almacenamiento de datos personales.

Servicios externos comprobados:

- **PokéAPI v2** (`https://pokeapi.co/api/v2`): el backend la consulta ante misses o durante sincronización. El navegador consume el endpoint local `/api/pokeapi/v2`; los enlaces API dentro del JSON se reescriben a rutas locales.
- **Repositorio de sprites de PokeAPI en GitHub raw** (`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon`): iconos, sprites normales y variantes Shiny. Los recursos se solicitan directamente desde el navegador.
- **Google Translate** (`https://translate.googleapis.com/translate_a/single`): se llama solo cuando se pide traducción. Usa el parámetro `client=gtx`; no se observa API key. Tratarlo como endpoint web no formal/no garantizado, no como integración comercial estable.
- **Google Fonts**: entrega Inter y Barlow Condensed.

`node:sqlite` conserva JSON gzip por ruta en `data/masterdex.sqlite`; es una caché de respuestas, no tablas normalizadas de dominio. La sincronización actual guardó 4.084 respuestas: catálogos, 1.351 Pokémon/formas, 1.025 especies, 313 habilidades, 833 movimientos, 540 cadenas evolutivas y 18 tipos. No almacena imágenes binarias. Variables opcionales comprobadas: `MASTERDEX_DB_PATH`, `MASTERDEX_OFFLINE`, `MASTERDEX_HOST`, `MASTERDEX_API_PORT`, `PORT`, `MASTERDEX_UPSTREAM_CONCURRENCY` y `MASTERDEX_SYNC_CONCURRENCY`. No se necesitan claves o secretos.

## 9. Configuración y ejecución

Requisitos: Node `>=22.13.0` (por `node:sqlite` y `StatementSync.iterate()`), npm; conexión a internet para primera sincronización, fuentes, traducción e imágenes. El archivo `data/masterdex.sqlite` se crea al arrancar el backend. Para Playwright, instalar Chromium con `npx playwright install chromium`.

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
- `npm run test:e2e`: ejecuta Playwright sobre la suite ubicada en `tests/e2e/`.
- `npm run test:e2e:ui`: abre el modo interactivo de Playwright.

El servidor E2E se inicia en puertos dedicados (`4173` frontend, `3101` backend) y `MASTERDEX_OFFLINE=true`; los casos interceptan `/api/pokeapi/v2/**` y recursos de imagen con fixtures para no depender de la base local ni de servicios externos. Actualmente hay 9 pruebas iniciales y se ejecutan con `npm run test:e2e`. No hay comandos de lint o formato. Un despliegue necesita Node y disco persistente para SQLite. Para no depender de PokéAPI en runtime, sincronizar la base y activar `MASTERDEX_OFFLINE=true`; en contenedores públicos configurar `MASTERDEX_HOST=0.0.0.0`. `npm run start` sirve `index.html` como fallback para `/pokemon/{id}`.

## 10. Convenciones de desarrollo

- Mantener el patrón actual de componentes funcionales React y hooks; usar `useMemo`/`useCallback` cuando ya se usan para derivaciones y callbacks conectados a efectos.
- Estado local de interacción en el componente o pantalla que lo necesita; conservar en `App` solo el estado compartido entre pantallas, como catálogo, detalles cargados y ruta.
- Mantener las responsabilidades separadas: presentación de pantallas en `src/screens/`, piezas reutilizables en `src/components/`, constantes en `src/data/` y lógica de dominio sin interfaz en `src/utils/`.
- Constantes compartidas en mayúsculas (`API`, `TYPE_NAMES`, etc.); funciones y componentes en `camelCase`/`PascalCase`; clases CSS en `kebab-case`.
- En el frontend, las consultas de datos deben usar el prefijo local `API` de `src/data/constants.js`, no URLs absolutas de PokéAPI. Manejar propiedades opcionales y respuestas parciales.
- Mantener el backend limitado a GET y rutas de recurso validadas; conservar deduplicación, caché y límites de concurrencia. No convertirlo en proxy de URL arbitraria.
- En efectos del frontend, usar `AbortController` para cancelar solicitudes al desmontar o cambiar de registro.
- Agregar recursos de tipos, movimientos o estadísticas a su carpeta temática y referenciarlos mediante imports/`import.meta.glob`, no rutas locales absolutas del equipo.
- Mantener traducciones con preferencia `es`, luego `es-419` y fallback explícito; no presentar fallback inglés como español.
- Probar visualmente desktop y mobile cuando el cambio afecte layout. No asumir que disponibilidad de URL significa que el recurso se dibuja correctamente.
- No introducir router, autenticación, servicios gestionados ni dependencias nuevas sin necesidad concreta y revisión de impacto. El backend Node/SQLite es ahora parte de la arquitectura.

## 11. Decisiones técnicas importantes

### Confirmadas en el código

- Vite + React con CSS global y backend Node; `node:sqlite` integrado guarda respuestas de PokéAPI comprimidas.
- El navegador llama a la API local. El backend sirve SQLite primero y puede usar PokéAPI como fallback; regiones se calculan por número nacional.
- La función `latestPokemonIcon` compartida por lista y pestañas de formas prioriza Sword/Shield Gen VIII, iconos generales Gen VIII, Gen VII, Gen VI y Scarlet/Violet Gen IX. La lista prueba estos candidatos ante fallos de carga y nunca cae a sprites 2D; se excluyen Brilliant Diamond/Shining Pearl y Legends: Arceus.
- Las vistas 2D y 3D eligen fuentes distintas. No reutilizar un render de la categoría 3D para afirmar que existe sprite 2D.
- Los recursos propios de iconografía se conservan en `src/assets`.
- El encabezado mantiene el símbolo circular genérico implementado en CSS; la propuesta morada SVG está conservada como referencia y no se usa en el sitio.
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
- Playwright cubre los flujos iniciales principales, pero no toda la ficha: faltan casos para pestañas de formas, traducción, navegación de historial, recursos ausentes y vista móvil. No se encontraron linter ni formatter. La DB inicial comprimida ocupa aproximadamente 18 MB; el archivo se excluye de Git y un despliegue necesita persistencia y copias de seguridad.
- `src/screens/PokemonDetailPage.jsx` todavía combina carga de datos y presentación de la ficha en un módulo amplio; separar esa lógica en un hook podría mejorar su mantenimiento. `styles.css` también acumula reglas antiguas y overrides compactos.
- Los rangos `latest` de `package.json` pueden actualizar dependencias al regenerar el lockfile; conservar y revisar `package-lock.json`.
- `node:sqlite` todavía puede emitir `ExperimentalWarning` según la versión de Node. El código requiere Node `>=22.13.0`, donde existe `StatementSync.iterate()` sin flag experimental.
- La caché se persiste en `data/masterdex.sqlite`, pero no es una base normalizada. Si falta un recurso, solo el modo `MASTERDEX_OFFLINE` evita una consulta al upstream.
- El backend sirve páginas de la aplicación y proxy de recursos conocidos; un despliegue público debe usar `MASTERDEX_OFFLINE=true` tras sincronizar, preservar el disco y aplicar límites de tráfico en el proveedor.
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

1. Ampliar Playwright gradualmente para cubrir formas, navegación atrás/adelante, fallback de recursos ausentes, traducción y viewport móvil; conservar los mocks para que las pruebas no dependan de servicios externos.
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

### Historial comprobable en Git

- El historial visible incluye `3d29c9f feat: improve Pokédex detail experience` y el commit inicial `9bf895b Initial MasterDex release`.
- En el árbol de trabajo actual hay una refactorización sin commit y dos archivos PNG sin seguimiento (`src/assets/MasterDex-favicon.png`, `src/assets/MasterDex-logo.png`) que no son importados por la interfaz. No descartar ni incluir automáticamente estos recursos en otro cambio.

### Avances recientes disponibles en el contexto de esta sesión

- Se reemplazó el selector de orden por un menú flotante con dos criterios: N.º Pokédex y alfabético. Cada uno empieza ascendente y al volver a tocar el criterio seleccionado alterna a descendente. La función es local y no añade llamadas a PokéAPI.
- Al elegir un criterio, el menú de orden permanece abierto para que el usuario vea el estado actualizado; la flecha rota con transición al cambiar entre ascendente y descendente.
- La ficha muestra grupos huevo y hábitat en español como texto secundario debajo de la descripción; no ocupan tarjetas en el bloque de altura/peso. Estos campos usan los datos de especie ya solicitados, con traducciones locales de slugs y fallback “No especificado”.


- Se instaló `@playwright/test` 1.64.1 y Chromium. `playwright.config.js` ejecuta Chromium con un servidor Vite/backend aislado en los puertos 4173/3101 y modo offline. `scripts/run-app.js` reenvía argumentos de CLI a Vite. Se agregaron los scripts `test:e2e` y `test:e2e:ui`; `test-results/` y `playwright-report/` se ignoran.
- Se añadieron 9 pruebas E2E en `tests/e2e/`: búsqueda por nombre y número; filtros por región, tipo y combinación; sprite 2D, sprite 3D, Shiny 2D con vuelta a normal y Shiny 3D. `helpers/pokeapi-mocks.js` simula catálogo, especies, recursos e imágenes, sin consultas externas. `npm run test:e2e` pasó: 9/9 en Chromium.
- Se implementó la descripción de cada habilidad en `src/screens/PokemonDetailPage.jsx`, con extracción en `src/utils/pokemon.js`. Una discrepancia entre el campo producido (`text`) y el leído por la vista (`description`) hacía que todas aparecieran como no disponibles; la ficha ahora lee `abilityInfo.text`. El panel inline se reemplazó por un popover anclado a la habilidad, con cierre por clic fuera y Escape. Su aspecto incluye encabezado “Descripción”, icono informativo SVG local (`src/assets/ability-info.svg`), borde turquesa en la habilidad activa y una capa superior para no quedar detrás de las secciones siguientes. Si el texto solo existe en inglés, el usuario puede solicitar su traducción, alternar entre versión traducida y original, y reutilizar el resultado cacheado mediante `translateTextToSpanish`. Pendiente añadir un caso E2E para abrir/cerrar y comprobar la descripción y el flujo de traducción.
- Se ajustó `styles.css` para que en móvil el filtro de tipos use tres columnas como el de regiones, manteniendo el diseño de dos columnas en escritorio.
- Las filas de lista recibieron un panel carbón medio detrás del icono y una franja cian paralela al borde inclinado del panel; sus anchos y tamaños de icono se adaptan a breakpoints de escritorio, tablet y móvil sin cambiar el fallback compartido.
- `README.md` y esta guía se actualizaron con comandos, cobertura actual y próximos casos deseables. `npm run build`, comprobación sintáctica de la configuración y `git diff --check` pasaron; los avisos de líneas CRLF son del checkout Windows.

- Se modernizó la lista y ficha con filtros de tipo/región, navegación por formas, iconografía local, tablas, estadísticas coloreadas y ajustes responsive.
- Se añadieron fallbacks para iconos Gen VIII/IX y sprites recientes de Scarlet/Violet y Legends: Z-A.
- Al recorrer visualmente la lista se encontró que algunas URLs de iconos específicos de Sword/Shield faltan para especies no disponibles en esos juegos. La colección `generation-viii/icons` sirve como alternativa. Se excluyen recursos de Brilliant Diamond/Shining Pearl y Legends: Arceus. A pedido del usuario, `latestPokemonIcon` es la única función de selección compartida por filas y pestañas de formas. Las filas prueban las fuentes permitidas cuando una imagen falla, pero no sustituyen un icono por sprite 2D.
- Se ajustó la ficha de Zygarde: 2D ya no cae a su imagen 3D; cuando falta sprite 2D muestra el estado correspondiente. En las pestañas se ocultaron las dos variedades `power-construct` redundantes visualmente y se ordenaron habitual, 10%, completa y Mega.
- Se corrigió que las filas de la lista pasaran el registro resumido del catálogo a `latestPokemonIcon`; ese objeto no contiene `sprites`. Ahora la lista consulta la misma función con `detail`. Ante el pedido del usuario de quitar el fallback que mostraba sprites 2D, las filas intentan las demás fuentes de icono permitidas si falla una URL y ocultan la miniatura solo si ninguna carga.
- Una revisión visual posterior en el navegador confirmó miniaturas vacías en especies sin URL de icono de Sword/Shield, iconos generales Gen VIII o Scarlet/Violet (por ejemplo, Weedle, Beedrill y Pidgey); Kakuna recibe una URL general Gen VIII que falla al cargar. Por decisión del usuario, se agregaron Gen VII y Gen VI como fallbacks, y luego Scarlet/Violet Gen IX. La fila recorre las fuentes disponibles ante errores y no recurre a sprites 2D.
- Se creó `src/assets/masterdex-pokedex.svg` como propuesta de logo; el usuario prefirió conservarla solo como referencia y restaurar el símbolo genérico circular del encabezado.
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

### Próximos pasos conocidos

- Producto: la primera parte de la función de habilidades ya está definida e implementada en la ficha: descripciones desplegables por habilidad. La guía/catálogo independiente con búsqueda de habilidades y Pokémon que las tienen continúa sin especificación ni implementación.
- Mantenimiento: si la ficha continúa creciendo, separar sus cargas de datos en un hook sin alterar el comportamiento.
- Antes de empezar otra modificación, revisar `git status` y mantener el trabajo local actual. Si se detecta una discrepancia entre este archivo y el código, actualizar la guía según la implementación comprobada y anotar la incertidumbre.
