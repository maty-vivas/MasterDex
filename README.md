# MasterDex

Pokédex web en español hecha con React y Vite, con una interfaz inspirada en Pokémon Blanco/Negro y sus secuelas.

## Desarrollo local

```powershell
npm install
npm run dev
```

Vite mostrará la dirección local para abrir en el navegador. Para generar la versión de producción, usa `npm run build`; para previsualizarla, `npm run preview`.

La aplicación consulta [PokéAPI](https://pokeapi.co/) y carga sprites e ilustraciones desde sus recursos públicos, por lo que necesita conexión a internet.

## Funciones

- Búsqueda por nombre o número nacional.
- Orden alfabético o por número.
- Carga progresiva de 60 registros por tanda.
- Filtro por tipo desde el encabezado.
- Vista previa del Pokémon al pasar el cursor o navegar la lista con el teclado.
- Fichas detalladas en rutas internas `/pokemon/:id`, con estadísticas y descripción en español.
- Diseño adaptable a pantallas móviles y de escritorio.
