import { ARTWORK } from '../data/constants.js';
import { evolutionRequirement, humanizeSlug, padId } from '../utils/pokemon.js';

/** Dibuja una etapa evolutiva y vuelve a llamarse para representar todas sus evoluciones siguientes. */
export default function EvolutionBranch({ node, selectedId, onOpen }) {
  // El número nacional se obtiene del recurso de especie enlazado en la respuesta evolutiva.
  const id = Number(node.species.url.match(/\/pokemon-species\/(\d+)\//)?.[1] || 0);
  const selected = id === selectedId;
  return <div className="evolution-branch">
    <button className={`evolution-entry${selected ? ' is-current' : ''}`} onClick={() => onOpen(id)} aria-label={`Abrir ficha de ${node.species.name}`}>
      <img loading="lazy" src={`${ARTWORK}/${id}.png`} alt="" />
      <span>N.º {padId(id)}</span><strong>{humanizeSlug(node.species.name)}</strong>
    </button>
    {node.evolves_to?.length > 0 && <div className="evolution-children">{node.evolves_to.map((child) => <div className="evolution-path" key={child.species.name}><div className="evolution-link"><span className="evolution-arrow" aria-hidden="true">→</span><span>{evolutionRequirement(child)}</span></div><EvolutionBranch node={child} selectedId={selectedId} onOpen={onOpen} /></div>)}</div>}
  </div>;
}
