# MasterDex — contexto del proyecto y guía para agentes

Este documento resume el estado comprobable del repositorio y las reglas para continuarlo. La fuente principal es el código actual; las conversaciones disponibles en esta sesión se usan solo para registrar decisiones recientes que no aparecen en el historial de Git. Si una afirmación es una inferencia, se señala como tal.

## 1. Identidad y propósito de MasterDex

**Comprobado:** MasterDex es una Pokédex web en español. Permite recorrer especies de la Pokédex Nacional, buscar y filtrar registros, y consultar una ficha con datos, formas, sprites, estadísticas, evoluciones y movimientos. El `README.md` y `index.html` describen una estética inspirada especialmente en la quinta generación de los juegos Pokémon.

**Propósito inferido de la interfaz:** ofrecer una consulta visual más completa que una lista de nombres, combinando datos de la PokéAPI con una presentación propia y consistente.

**Público objetivo:** personas que quieran explorar información Pokémon desde el navegador. No hay requisitos de usuario, perfiles ni públicos adicionales documentados.

## 2. Estado actual del proyecto

El repositorio contiene un frontend funcional basado en datos remotos. No se encontró backend, base de datos, autenticación, despliegue configurado ni una suite automatizada de pruebas. La única persistencia local identificada es el caché de traducciones en `localStorage`; la aplicación no guarda perfiles ni progreso del usuario.

### Implementado en el código

- Lista nacional limitada a los primeros 1.025 registros, con búsqueda, orden y carga incremental.
- Filtros combinables por región y tipo.
- Panel de vista previa y ficha por especie con pestañas de formas y variantes.
- Datos de altura, peso, tipos, habilidades, estadísticas, evoluciones y movimientos aprendidos por nivel.
- Selección separada de imágenes 2D y recursos gráficos 3D disponibles.
- Selector Shiny en la imagen principal, que cambia el recurso de la forma elegida sin cambiar entre los modos 2D/3D.
- Descripción en español cuando existe; si no, texto en inglés con traducción solicitada por el usuario y alternativa para volver al original.
- Estados de carga y error para la lista y la ficha; la lista ofrece reintento.

### Parcial o dependiente de terceros

- La traducción se solicita al endpoint web de Google Translate al pulsar el botón. El resultado se guarda en `localStorage`; el servicio no tiene garantía ni integración formal configurada.
- La cobertura y calidad de datos, formas, iconos, sprites e ilustraciones dependen de PokéAPI y del repositorio de sprites público de PokeAPI.
- Algunos Pokémon o formas no tienen un sprite 2D o 3D para el modo seleccionado. La ficha muestra un mensaje de recurso no disponible en lugar de fingir que la imagen del otro modo es la solicitada.
- Las reglas de deduplicación y orden especial de formas de Zygarde son una excepción visual implementada en la ficha.

### No encontrado / pendiente de confirmación

- No hay historias de usuario, roadmap formal ni backlog dentro del repositorio.
- No se comprobó una URL de producción ni instrucciones de despliegue. El servidor de desarrollo y `vite preview` no equivalen a una publicación.
- No existe script `test`, `lint` o `format` en `package.json`.

## 3. Stack tecnológico

| Tecnología | Versión comprobada | Uso |
|---|---:|---|
| JavaScript con módulos ES | — | Lógica de interfaz y llamadas HTTP |
| React | 19.3.0 en `package-lock.json` | Componentes y estado |
| React DOM | 19.3.0 en `package-lock.json` | Montaje en el navegador |
| Vite | 8.3.4 en `package-lock.json` | Servidor de desarrollo y build |
| `@vitejs/plugin-react` | 6.1.2 en `package-lock.json` | Transformación React en Vite |
| CSS | — | Estilos globales, diseño responsivo y algunos SVG como máscaras |

`package.json` declara las dependencias con el rango `latest`; el lockfile contiene las versiones exactas anteriores. Vite y su plugin requieren Node `^20.19.0 || >=22.12.0` según el lockfile. No hay campo `engines` en el proyecto. En el entorno inspeccionado se observó Node 25.2.1 y npm 11.19.0; esto describe el entorno de inspección, no una versión fijada para el equipo.

No se usan librerías adicionales de UI, router, estado global, iconos o pruebas.

## 4. Arquitectura

La aplicación está concentrada principalmente en `src/App.jsx`:

1. `src/main.jsx` monta `<App />` con `React.StrictMode` e importa `styles.css`.
2. `App` obtiene `pokemon?limit=1025`, mantiene estado global de registros, detalles consultados, búsqueda, filtros, orden y ruta seleccionada.
3. La pantalla principal (`DexScreen`) calcula resultados con `useMemo`, solicita detalles para la vista previa, carga registros en bloques de 60 y obtiene miembros de cada tipo para filtrar.
4. Abrir una especie cambia la URL a `/pokemon/{id}` con History API; `popstate` sincroniza el botón Atrás del navegador. No hay router externo.
5. `PokemonDetailPage` obtiene el Pokémon, la especie, las variedades, la cadena evolutiva, traducciones de habilidades y datos de movimientos. Las variedades se consultan en paralelo; los detalles de movimientos usan hasta seis trabajadores concurrentes.
6. Funciones auxiliares normalizan nombres, eligen textos, sprites y movimientos. El CSS global aplica los estilos y breakpoints.

Los datos de PokéAPI y los detalles se guardan en memoria durante la sesión de la aplicación. No hay una base local ni caché de servidor.

## 5. Estructura del repositorio

- `AGENTS.md`: esta guía central de contexto y desarrollo.
- `README.md`: introducción, funcionalidades y scripts de ejecución para personas que visitan el repositorio.
- `package.json`, `package-lock.json`: dependencias y scripts; conservar el lockfile sincronizado con cualquier cambio de dependencias.
- `index.html`: documento HTML, idioma `es`, metadatos, fuentes remotas y entrada del módulo.
- `vite.config.js`: configuración mínima de Vite con `@vitejs/plugin-react`.
- `styles.css`: hoja global. Contiene estilos de ambas pantallas, breakpoints y reglas añadidas como overrides; también hay reglas antiguas que podrían ya no corresponder a componentes actuales.
- `src/main.jsx`: punto de entrada React, Strict Mode e importación de estilos.
- `src/App.jsx`: catálogo, filtros, estado, navegación, ficha, cálculos y acceso a APIs.
- `src/assets/pkmn-types/`: iconos SVG de los 18 tipos usados en el filtro. El archivo `fight.svg` corresponde al tipo `fighting`.
- `src/assets/moves/`: imágenes PNG de las clases Físico, Especial y Estado.
- `src/assets/stats/`: iconos SVG de PS, Ataque, Defensa, Ataque Especial, Defensa Especial y Velocidad.
- `src/assets/masterdex-pokedex.svg`: propuesta vectorial morada de una Pokédex abierta, conservada como referencia; no está conectada a la interfaz.
- `node_modules/`: dependencias instaladas, ignoradas por Git.
- `dist/`: salida generada de Vite, ignorada por Git; no editarla manualmente.

No se encontró carpeta `docs/`, directorio de pruebas ni otros módulos de aplicación.

## 6. Funcionalidades

### Catálogo

- Carga 1.025 registros de `/pokemon?limit=1025`. El ID nacional de cada fila se infiere del índice de la respuesta más uno.
- La búsqueda compara nombre parcial, número exacto y número rellenado a cuatro dígitos; se elimina un `#` inicial.
- Orden: número nacional o nombre A–Z.
- La lista muestra 60 entradas inicialmente y agrega más cerca del final del contenedor.
- Al pasar el cursor o enfocar una fila, se carga una ficha en memoria para mostrar ilustración oficial y tipos en el panel de vista previa.

### Filtros

- Los filtros de región usan rangos nacionales definidos en `DEX_REGIONS` (Kanto 1–151 … Paldea 906–1025); no consultan una propiedad de región en cada Pokémon.
- El filtro de tipo carga `/type/{type}` y guarda sus miembros en `TYPE_MEMBER_CACHE`.
- Seleccionar varias regiones o tipos aplica semántica **OR dentro del grupo**: coincide con cualquiera de las opciones seleccionadas. Si se seleccionan región y tipo, ambos grupos restringen el resultado.
- Los iconos de tipo se cargan desde `src/assets/pkmn-types/` mediante `import.meta.glob`.

**Iconos Pokémon:** una única función, `latestPokemonIcon`, compartida por filas de la lista y pestañas de formas. Orden de prioridad: icono específico Sword/Shield Gen VIII, icono general Gen VIII, icono Gen VII, icono Gen VI y finalmente Scarlet/Violet Gen IX. No selecciona iconos de Brilliant Diamond/Shining Pearl ni Legends: Arceus. En la lista debe recibir el detalle completo consultado desde PokéAPI (`details[id]`), ya que los registros del endpoint `/pokemon?limit=1025` contienen solo nombre y URL y no incluyen `sprites`. La lista intenta cada icono compatible si falla el anterior, pero nunca sustituye iconos ausentes o fallidos por sprites 2D; si no hay un icono disponible en esas generaciones, la miniatura queda vacía.

### Ficha

- Ruta cliente `/pokemon/{id}`; permite volver por botón de la ficha, marca del sitio o historial del navegador.
- Formas desde `pokemon-species.varieties`; etiquetas construidas por `formLabel` para megaevoluciones, Gigamax, formas regionales y otros sufijos.
- En Zygarde se omiten de las pestañas los nombres terminados en `-power-construct`, que repetían visualmente las formas 10% y 50%; las pestañas visibles se ordenan como habitual, 10%, completa y Mega. Esta excepción solo afecta el selector.
- Los sprites normales y Shiny 2D priorizan `generation-v/black-white/front_default` o `front_shiny`, y después `sprites.front_default` o `front_shiny`. Los recursos 3D priorizan sprites de generaciones VI–VIII, después `generation-ix/legends-za`, `scarlet-violet` y otros juegos de la IX, usando `front_shiny` cuando Shiny está activo. El recurso es una imagen/render estático, no un modelo 3D interactivo. Si falta el recurso Shiny en el modo seleccionado, se informa que no está disponible y no se muestra la versión normal como sustituto.
- El control `SHINY`, compacto y con un icono de destello, está en la esquina inferior izquierda del panel principal y alterna la variante activa; cambiar de Pokémon o forma vuelve a Normal.
- En miniaturas de formas se usa la función compartida `latestPokemonIcon`; las pestañas aún tienen fallback visual a sprite 2D/render si no hay icono.
- Los textos descriptivos priorizan entradas españolas (`es`, `es-419`); si no hay ninguna, usan inglés y muestran controles para solicitar traducción o volver al original. El texto traducido se almacena en `localStorage` por contenido.
- Habilidades y movimientos prefieren nombres localizados `es`/`es-419`, con nombre derivado del slug como fallback.
- Estadísticas: barras escaladas sobre 255. Categorías de color según valor: `<20`, `<50`, `<90`, `<150` y `>=150`. Los seis iconos están en `src/assets/stats/` y sus colores son diferentes.
- Evoluciones: cadena evolutiva de PokéAPI, requisitos simplificados a etiquetas y arte oficial de sprites.
- Movimientos por nivel: selecciona el grupo de versiones más reciente encontrado entre los datos de aprendizaje por nivel; los iconos de clase son PNG locales y el tipo usa las cápsulas de tipo reutilizadas.

## 7. Diseño y experiencia de usuario

- Estética de Pokédex tecnológica, con grilla de fondo, encabezado oscuro, acento turquesa, paneles claros, tablas y estados visuales de selección.
- `Inter` para texto general y `Barlow Condensed` para encabezados técnicos; ambas se cargan desde Google Fonts en `index.html`.
- Componentes reutilizables en `App.jsx`: `Brand`, `FilterGroup`, `TypeBadge`, `MoveClassIcon`, `PokemonRow`, `PreviewPanel`, `StatIcon` y `EvolutionBranch`.
- `styles.css` incluye reglas para escritorio y móvil (`max-width: 900px`, `700px` y otras heredadas), y diseños distintos para lista y ficha.
- Hay etiquetas ARIA en filtros, navegación de formas, tabla de características y selector de vista; las filas se pueden abrir con Enter o Espacio. No se encontró una auditoría formal WCAG ni soporte explícito de `prefers-reduced-motion`.
- La hoja CSS está compactada en reglas muy largas y contiene capas de estilos anteriores y overrides. Al modificarla, inspeccionar reglas existentes y breakpoints antes de agregar otra excepción.

## 8. Backend, datos e integraciones

No existe backend propio ni base de datos. No se encontró autenticación, cuentas, servidor de aplicación o almacenamiento propio.

Servicios externos comprobados:

- **PokéAPI v2** (`https://pokeapi.co/api/v2`): catálogo, tipos, Pokémon, especies, variedades, habilidades, cadena evolutiva y movimientos.
- **Repositorio de sprites de PokeAPI en GitHub raw** (`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon`): iconos, sprites normales y variantes Shiny. Los recursos se solicitan directamente desde el navegador.
- **Google Translate** (`https://translate.googleapis.com/translate_a/single`): se llama solo cuando se pide traducción. Usa el parámetro `client=gtx`; no se observa API key. Tratarlo como endpoint web no formal/no garantizado, no como integración comercial estable.
- **Google Fonts**: entrega Inter y Barlow Condensed.

No se encontraron archivos `.env` ni uso de `import.meta.env` o `process.env`. No hay nombres de variables de entorno documentados ni necesarios según el código actual.

## 9. Configuración y ejecución

Requisitos: Node compatible con Vite 8 (`^20.19.0` o `>=22.12.0`) y npm; conexión a internet para datos, fuentes y recursos remotos.

```sh
npm ci
npm run dev
```

Scripts comprobados en `package.json`:

- `npm run dev`: Vite en modo desarrollo.
- `npm run build`: genera `dist/`.
- `npm run preview`: sirve localmente el build existente.

No hay comandos de prueba, lint ni formato configurados. No hay instrucciones ni configuración de despliegue. Como la ficha usa rutas History API, un hosting de producción necesitaría servir `index.html` como fallback para rutas `/pokemon/{id}`; esto no está configurado ni verificado en el repositorio.

## 10. Convenciones de desarrollo

- Mantener el patrón actual de componentes funcionales React y hooks; usar `useMemo`/`useCallback` cuando ya se usan para derivaciones y callbacks conectados a efectos.
- Estado local de interacción en el componente que lo necesita; estado del catálogo y ruta en `App`.
- Constantes compartidas en mayúsculas (`API`, `TYPE_NAMES`, etc.); funciones y componentes en `camelCase`/`PascalCase`; clases CSS en `kebab-case`.
- Al trabajar con datos de PokéAPI, manejar propiedades opcionales y respuestas parciales. Usar `AbortController` en efectos que hacen fetch y evitar actualizaciones después de desmontar.
- Agregar recursos de tipos, movimientos o estadísticas a su carpeta temática y referenciarlos mediante imports/`import.meta.glob`, no rutas locales absolutas del equipo.
- Mantener traducciones con preferencia `es`, luego `es-419` y fallback explícito; no presentar fallback inglés como español.
- Probar visualmente desktop y mobile cuando el cambio afecte layout. No asumir que disponibilidad de URL significa que el recurso se dibuja correctamente.
- No introducir router, backend, almacenamiento o dependencias nuevas sin necesidad concreta y revisión de su impacto.

## 11. Decisiones técnicas importantes

### Confirmadas en el código

- Vite + React, con frontend y CSS globales sencillos; no hay servidor propio.
- Los datos son remotos y las regiones se calculan a partir del número nacional.
- La función `latestPokemonIcon` compartida por lista y pestañas de formas prioriza Sword/Shield Gen VIII, iconos generales Gen VIII, Gen VII, Gen VI y Scarlet/Violet Gen IX. La lista prueba estos candidatos ante fallos de carga y nunca cae a sprites 2D; se excluyen Brilliant Diamond/Shining Pearl y Legends: Arceus.
- Las vistas 2D y 3D eligen fuentes distintas. No reutilizar un render de la categoría 3D para afirmar que existe sprite 2D.
- Los recursos propios de iconografía se conservan en `src/assets`.
- El encabezado mantiene el símbolo circular genérico implementado en CSS; la propuesta morada SVG está conservada como referencia y no se usa en el sitio.
- La traducción de textos ingleses es una acción explícita del usuario y conserva el original.

### Inferencias razonables, no requisitos formales

- El límite 1.025 y los rangos de regiones reflejan el alcance actual de las nueve generaciones representadas por la Pokédex Nacional.
- La ausencia de servidor facilita el despliegue estático, pero las llamadas del cliente y los fallbacks de ruta deben ser admitidos por el hosting.

## 12. Problemas conocidos y deuda técnica

- El límite y los IDs `index + 1` están fijados a 1.025; futuras entradas/cambios de orden de la API requieren revisar catálogo, regiones y filtro.
- La carga inicial dispara solicitudes de detalles para los registros visibles con objetivo de completar tipos y vista previa. Vigilar cuotas, latencia y concurrencia de PokéAPI si se amplía la página.
- El filtro de tipo convierte un fallo de carga en un conjunto vacío, lo que puede parecer que no hay coincidencias.
- Las etiquetas regionales son rangos simplificados y no consideran subdexes, variantes regionales ni procedencia compleja.
- La selección del grupo de movimientos se basa en el número máximo de `version_group` disponible por movimiento; puede no representar un único juego elegido por el usuario.
- La traducción Google no tiene garantía de disponibilidad, calidad, SLA ni clave formal; usa almacenamiento local del navegador.
- No hay caché persistente de datos de PokéAPI, tests, linter ni formatter.
- `src/App.jsx` reúne catálogo, dominio y ficha; `styles.css` acumula reglas antiguas y overrides compactos. Una división por módulos puede mejorar mantenimiento, pero es una mejora potencial, no un plan confirmado.
- El repositorio no declara versiones mediante `engines` y los rangos `latest` de `package.json` pueden actualizar dependencias al regenerar el lockfile; conservar y revisar `package-lock.json`.
- La disponibilidad de sprites, iconos y arte varía por especie y forma. Los recursos remotos pueden fallar aunque los datos JSON estén disponibles.
- La disponibilidad Shiny puede variar entre el modo 2D y 3D para una forma. El selector debe respetar el modo y mostrar su estado no disponible si no existe el recurso solicitado.
- PokéAPI puede entregar una URL de icono que no carga. La lista intenta los demás iconos permitidos y, si todos fallan, oculta la miniatura; no debe caer al sprite frontal estándar para evitar mezclar iconos y sprites 2D en el catálogo.

No se encontró un error general reproducible durante esta inspección. La lista anterior son límites y riesgos observables, no una afirmación de que todos estén causando fallos ahora.

## 13. Tareas pendientes y prioridades

### Confirmado

- No hay tareas pendientes formales en archivos del repositorio ni roadmap.
- La continuidad reciente de esta sesión incluyó una inspección de sprites y el ajuste de Zygarde; los detalles se registran en la sección 16.

### Mejoras posibles, aún no aprobadas como requisitos

1. Añadir pruebas de funciones de selección de sprites, filtros y etiquetas de formas, más verificación visual de rutas recientes.
2. Considerar configurar una versión Node en `engines` y rangos de dependencia reproducibles en vez de `latest`.
3. Extraer catálogo, tipos/filtros, ficha y helpers en módulos cuando el tamaño de `App.jsx` lo justifique.
4. Ordenar/limpiar `styles.css` después de comprobar cada selector en uso y conservar los estilos responsive actuales.
5. Considerar paginación/concurrencia más cuidadosa para llamadas de detalles y errores de filtros.
6. Si se publica el sitio, documentar proveedor, fallback SPA para `/pokemon/:id`, build y manejo de recursos externos.

No ejecutar estas mejoras como si fueran decisiones ya tomadas; confirmar alcance con el usuario cuando impliquen cambios amplios o decisiones de producto.

## 14. Seguridad y precauciones

- No almacenar ni commitear tokens, credenciales, claves privadas ni archivos `.env`. No hay claves requeridas por el código actual.
- Las descripciones que se traducen son texto público de PokéAPI; no añadir datos personales ni enviar otros contenidos al servicio de traducción.
- El navegador realiza solicitudes directas a terceros. No asumir que PokéAPI, GitHub raw, Google Fonts o Translate estarán siempre disponibles.
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
7. Confirmar los nombres de scripts en `package.json` antes de documentar o ejecutar comandos. Actualmente no existe `npm test`.
8. Para cambios visuales, revisar al menos una ficha común, una forma reciente con recursos Gen IX y tamaños mobile/desktop afectados.
9. No borrar `dist/`, actualizar dependencias, cambiar servicios de traducción ni añadir un backend por iniciativa propia.
10. El árbol de trabajo puede contener cambios previos sin commit. No hacer reset, checkout destructivo ni sobrescribir `README.md` para completar otra tarea.

## 16. Registro de continuidad

### Historial comprobable en Git

- Hay un commit visible: `9bf895b Initial MasterDex release`.
- En la inspección actual aparecen cambios locales sin commit: `README.md`, `src/App.jsx`, `styles.css` modificados y `src/assets/stats/` sin seguimiento. No descartar ni reescribir estos cambios; no se atribuyen todos a una misma tarea sin comparar cada diff.

### Avances recientes disponibles en el contexto de esta sesión

- Se modernizó la lista y ficha con filtros de tipo/región, navegación por formas, iconografía local, tablas, estadísticas coloreadas y ajustes responsive.
- Se añadieron fallbacks para iconos Gen VIII/IX y sprites recientes de Scarlet/Violet y Legends: Z-A.
- Al recorrer visualmente la lista se encontró que algunas URLs de iconos específicos de Sword/Shield faltan para especies no disponibles en esos juegos. La colección `generation-viii/icons` sirve como alternativa. Se excluyen recursos de Brilliant Diamond/Shining Pearl y Legends: Arceus. A pedido del usuario, `latestPokemonIcon` es la única función de selección compartida por filas y pestañas de formas. Las filas prueban las fuentes permitidas cuando una imagen falla, pero no sustituyen un icono por sprite 2D.
- Se ajustó la ficha de Zygarde: 2D ya no cae a su imagen 3D; cuando falta sprite 2D muestra el estado correspondiente. En las pestañas se ocultaron las dos variedades `power-construct` redundantes visualmente y se ordenaron habitual, 10%, completa y Mega.
- Se corrigió que las filas de la lista pasaran el registro resumido del catálogo a `latestPokemonIcon`; ese objeto no contiene `sprites`. Ahora la lista consulta la misma función con `detail`. Ante el pedido del usuario de quitar el fallback que mostraba sprites 2D, las filas intentan las demás fuentes de icono permitidas si falla una URL y ocultan la miniatura solo si ninguna carga.
- Una revisión visual posterior en el navegador confirmó miniaturas vacías en especies sin URL de icono de Sword/Shield, iconos generales Gen VIII o Scarlet/Violet (por ejemplo, Weedle, Beedrill y Pidgey); Kakuna recibe una URL general Gen VIII que falla al cargar. Por decisión del usuario, se agregaron Gen VII y Gen VI como fallbacks, y luego Scarlet/Violet Gen IX. La fila recorre las fuentes disponibles ante errores y no recurre a sprites 2D.
- Se creó `src/assets/masterdex-pokedex.svg` como propuesta de logo; el usuario prefirió conservarla solo como referencia y restaurar el símbolo genérico circular del encabezado.
- La conversación disponible indica que el usuario confirmó que el resultado de Zygarde quedó bien. No existe en Git un commit separado que respalde esa cronología.
- Se añadió un control `SHINY` compacto con icono SVG de destellos en el panel de imagen de la ficha. Usa los campos `front_shiny` de los sprites en 2D y de los recursos gráficos por generación/juego en 3D, conserva el modo activo y vuelve a Normal al cambiar de especie o forma. Si no existe la variante para el modo elegido, muestra un mensaje en lugar de la imagen normal. La interfaz toma como referencia la imagen compartida por el usuario.
- El icono SVG de destellos se centralizó en el componente `SparkleIcon` de `src/App.jsx` y ahora se comparte también en los controles `TRADUCIR AL ESPAÑOL` y `MOSTRAR TRADUCCIÓN`; en traducción, el icono usa el cian del borde en estado normal y cambia a tinta oscura en hover para conservar el contraste con el fondo cian. Se verificó con `npm run build`.
- Se invirtieron los degradados de la Pokéball decorativa del panel de vista previa vacío (`.preview-ball-top`/`.preview-ball-bottom`): mitad superior con degradado negro y mitad inferior clara, conservando el botón central. Se probó temporalmente una alternativa violeta inspirada en la Master Ball, pero el usuario prefirió volver al negro.

### Próximo paso

No hay una tarea de producto en curso después de documentar el estado. Antes de empezar otra modificación, revisar `git status` y mantener el trabajo local actual. Si se detecta una discrepancia entre este archivo y el código, actualizar la guía según la implementación comprobada y anotar la incertidumbre.
