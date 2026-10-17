import { ARTWORK } from '../data/constants.js';
import { padId } from '../utils/pokemon.js';
import TypeBadge from './TypeBadge.jsx';

/** Panel contextual de la lista: Pokéball vacía o vista previa del Pokémon activo. */
export default function PreviewPanel({ pokemon, detail }) {
  if (!pokemon) return <aside className="preview-panel empty-preview" aria-live="polite">
    <div className="preview-decoration" aria-hidden="true"><span className="preview-ring ring-one" /><span className="preview-ring ring-two" /><div className="preview-ball"><div className="preview-ball-top" /><div className="preview-ball-middle"><i /></div><div className="preview-ball-bottom" /></div><span className="preview-plus plus-one">＋</span><span className="preview-plus plus-two">＋</span></div>
    <p className="preview-hint">ELIGE UN POKÉMON</p>
    <span className="preview-caption">PASA EL CURSOR SOBRE UN REGISTRO</span>
  </aside>;

  return <aside className="preview-panel pokemon-preview" aria-live="polite">
    <span className="preview-number">N.º {padId(pokemon.id)} / POKÉDEX NACIONAL</span>
    <div className="preview-artwork"><span className="preview-art-ring" /><img src={`${ARTWORK}/${pokemon.id}.png`} alt={`Ilustración de ${pokemon.name}`} /></div>
    <h2 className="preview-name">{pokemon.name}</h2>
    <div className="preview-types">{detail?.types.map(({ type }) => <TypeBadge key={type.name} type={type.name} />) || <span className="type-loading">CARGANDO TIPOS…</span>}</div>
    <span className="preview-caption">VISTA PREVIA · HAZ CLIC PARA VER LA FICHA</span>
  </aside>;
}
