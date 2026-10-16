# MasterDex

MasterDex es una Pokédex web interactiva en español para explorar Pokémon de la Pokédex Nacional y consultar sus datos en una ficha detallada. El proyecto combina información de PokéAPI con una interfaz inspirada en la presentación de las Pokédex vistas en las distintas generaciones de los juegos.

## Introducción

La pantalla principal permite recorrer la lista nacional, buscar especies y aplicar filtros. Al abrir una ficha se puede consultar información de la especie, cambiar entre sus formas disponibles y explorar sus estadísticas, evoluciones y movimientos.

MasterDex está construido con React y Vite. Los datos, sprites e ilustraciones se cargan desde [PokéAPI](https://pokeapi.co/) y sus recursos públicos, por lo que la aplicación necesita conexión a internet.

## Funcionalidades

### Lista Pokédex
- Busca Pokémon por nombre o número nacional.
- Ordena los registros por número nacional o alfabéticamente.
- Filtra por región de origen, por tipo o por una combinación de ambos.

### Ficha del Pokémon

- Consulta el número de la Pokédex Nacional, el nombre de la especie y sus tipos.
- Cambia entre el sprite 2D y el sprite 3D disponible para esa forma.
- Cambia de forma o variante desde pestañas con iconos de vista previa.
- Lee la descripción en español más reciente disponible en los datos de PokéAPI.
- Consulta habilidades normales y ocultas, además de altura y peso en metros y kilogramos.
- Compara PS, Ataque, Defensa, Ataque Especial, Defensa Especial y Velocidad con barras e iconos identificables por color.
- Explora la cadena evolutiva junto con los requisitos de evolución.
- Revisa los movimientos aprendidos por nivel junto con su tipo elemental y su clase de movimiento: Físico, Especial o Estado.

La disponibilidad de sprites e información de formas depende de los recursos publicados por PokéAPI.

## Scripts

- `npm run dev`: inicia el servidor de desarrollo.
- `npm run build`: genera la versión de producción en `dist/`.
- `npm run preview`: sirve localmente la versión generada.
