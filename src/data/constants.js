import hpStatIcon from '../assets/stats/ps.svg';
import attackStatIcon from '../assets/stats/atk.svg';
import defenseStatIcon from '../assets/stats/def.svg';
import specialAttackStatIcon from '../assets/stats/sp-atk.svg';
import specialDefenseStatIcon from '../assets/stats/sp-def.svg';
import speedStatIcon from '../assets/stats/speed.svg';

// Endpoints y caché compartida de detalles de movimientos durante la sesión.
// El navegador siempre consulta el backend propio; este decide si usa SQLite o el origen remoto.
export const API = '/api/pokeapi/v2';
export const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
export const ARTWORK = `${SPRITES}/other/official-artwork`;
export const MOVE_INFO_CACHE = new Map();
// Cantidad de registros que se muestran inicialmente y se agregan en cada tanda.
export const PAGE_SIZE = 60;

// Etiquetas y colores usados en cápsulas, filtros y tablas de tipos.
export const TYPE_NAMES = { normal:'NORMAL',fire:'FUEGO',water:'AGUA',electric:'ELÉCTRICO',grass:'PLANTA',ice:'HIELO',fighting:'LUCHA',poison:'VENENO',ground:'TIERRA',flying:'VOLADOR',psychic:'PSÍQUICO',bug:'BICHO',rock:'ROCA',ghost:'FANTASMA',dragon:'DRAGÓN',dark:'SINIESTRO',steel:'ACERO',fairy:'HADA' };
export const TYPE_COLORS = { normal:'#858b91',fire:'#ed624b',water:'#4389df',electric:'#d9b936',grass:'#60a94f',ice:'#6bbdc5',fighting:'#ca5545',poison:'#9859ad',ground:'#bd9845',flying:'#8291d5',psychic:'#d85b8c',bug:'#99a62d',rock:'#ad9146',ghost:'#756198',dragon:'#6651bd',dark:'#60575b',steel:'#7d91a1',fairy:'#d47fa8' };
export const TYPES = Object.keys(TYPE_NAMES);
// Vite resuelve estos SVG como URLs locales para poder mostrarlos en el menú de filtros.
export const TYPE_ICON_FILES = Object.fromEntries(Object.entries(import.meta.glob('../assets/pkmn-types/*.svg', { eager:true, query:'?url', import:'default' })).map(([path, url]) => [path.split('/').pop().replace('.svg', ''), url]));
// Guarda IDs por tipo para que volver a marcar un filtro no vuelva a pedir la misma lista.
export const TYPE_MEMBER_CACHE = new Map();

// Rangos nacionales utilizados para aproximar la región de origen en los filtros.
export const DEX_REGIONS = [
  { id:'kanto', label:'Kanto', min:1, max:151 }, { id:'johto', label:'Johto', min:152, max:251 },
  { id:'hoenn', label:'Hoenn', min:252, max:386 }, { id:'sinnoh', label:'Sinnoh', min:387, max:493 },
  { id:'unova', label:'Unova', min:494, max:649 }, { id:'kalos', label:'Kalos', min:650, max:721 },
  { id:'alola', label:'Alola', min:722, max:809 }, { id:'galar', label:'Galar', min:810, max:905 },
  { id:'paldea', label:'Paldea', min:906, max:1025 },
];

// Convierte los nombres de PokéAPI en etiquetas de tabla y conecta cada estadística con su SVG.
export const STAT_LABELS = { hp:'PS', attack:'ATAQUE', defense:'DEFENSA', 'special-attack':'AT. ESP.', 'special-defense':'DEF. ESP.', speed:'VELOCIDAD' };
// URL de los SVG locales, indexadas con el mismo slug de las estadísticas de PokéAPI.
export const STAT_ICONS = { hp:hpStatIcon, attack:attackStatIcon, defense:defenseStatIcon, 'special-attack':specialAttackStatIcon, 'special-defense':specialDefenseStatIcon, speed:speedStatIcon };

// Orden numérico usado para comparar nombres de generación como "generation-viii".
export const ROMAN_GENERATIONS = { i:1, ii:2, iii:3, iv:4, v:5, vi:6, vii:7, viii:8, ix:9 };
