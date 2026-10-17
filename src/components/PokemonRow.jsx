import { useState } from 'react';
import { latestPokemonIcon, padId } from '../utils/pokemon.js';
import TypeBadge from './TypeBadge.jsx';

/** Fila interactiva de la lista; soporta ratón y teclado y prueba iconos alternativos si fallan. */
export default function PokemonRow({ pokemon, detail, onPreview, onLoadPreview, onOpen }) {
  // La prioridad se define en latestPokemonIcon; se quitan URLs repetidas antes de probarlas.
  const iconCandidates = [...new Set([0, 1, 2, 3, 4].map((index) => latestPokemonIcon(detail, index)).filter(Boolean))];
  const iconSignature = iconCandidates.join('|');
  // Si el detalle cambia, el contador vuelve a cero y se prueba la nueva lista de URLs.
  const [iconState, setIconState] = useState({ signature:'', failedCount:0 });
  const failedCount = iconState.signature === iconSignature ? iconState.failedCount : 0;
  // Solo se oculta la miniatura después de que todas las fuentes permitidas fallen.
  const iconFailed = failedCount >= iconCandidates.length;
  const icon = iconCandidates[Math.min(failedCount, iconCandidates.length - 1)];
  return <article className="pokemon-row" tabIndex="0" role="button" aria-label={`Ver ficha de ${pokemon.name}`}
    onMouseEnter={() => { onPreview(pokemon); onLoadPreview(pokemon); }} onMouseLeave={() => onPreview(null)}
    onFocus={() => { onPreview(pokemon); onLoadPreview(pokemon); }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) onPreview(null); }}
    onClick={onOpen} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(); } }}>
    <span className="row-sprite"><img loading="lazy" src={icon || undefined} alt="" style={iconFailed ? { visibility:'hidden' } : undefined} onError={() => setIconState({ signature:iconSignature, failedCount:Math.min(failedCount + 1, iconCandidates.length) })} /></span>
    <span className="row-number">{padId(pokemon.id)}</span>
    <span className="row-name">{pokemon.name}</span>
    <span className="row-types">{detail ? detail.types.map(({ type }) => <TypeBadge key={type.name} type={type.name} />) : <span className="type-loading">CARGANDO…</span>}</span>
  </article>;
}
