import { ARTWORK } from '../data/constants.js';
import { evolutionRequirement, humanizeSlug, padId } from '../utils/pokemon.js';

const EEVEE_ELEMENTAL_EVOLUTIONS = new Set(['vaporeon', 'jolteon', 'flareon', 'leafeon', 'glaceon']);

/** Flecha SVG; en las bifurcaciones ocupa todo el tramo desde el ramal hasta la tarjeta. */
function EvolutionArrow({ direction = 'right', isBranching = false }) {
  if (isBranching) return <span className={`evolution-branch-arrow${direction === 'left' ? ' is-left' : ''}`} aria-hidden="true">
    <span className="evolution-branch-arrow-line" />
    <svg className="evolution-branch-arrow-head" viewBox="0 0 8 12">
      <path d="M1 1l6 5-6 5" />
    </svg>
  </span>;

  return <svg className={`evolution-arrow-svg${direction === 'left' ? ' is-left' : ''}`} viewBox="0 0 48 14" aria-hidden="true">
    <path d="M2 7h40M36 2l6 5-6 5" />
  </svg>;
}

/** Tarjeta clickeable de una especie dentro del árbol evolutivo. */
function EvolutionEntry({ node, id, selected, onOpen }) {
  return <button
    type="button"
    className={`evolution-entry${selected ? ' is-current' : ''}`}
    onClick={() => onOpen(id)}
    aria-label={`Abrir ficha de ${humanizeSlug(node.species.name)}`}
    aria-current={selected ? 'page' : undefined}
  >
    <img loading="lazy" src={`${ARTWORK}/${id}.png`} alt="" />
    <span>N.º {padId(id)}</span>
    <strong>{humanizeSlug(node.species.name)}</strong>
  </button>;
}

/** Presenta una evolución lineal o varias rutas conectadas a un ramal común. */
function EvolutionOptions({ children, selectedId, onOpen, side }) {
  const isBranching = children.length > 1;
  const direction = side === 'left' ? 'left' : 'right';

  return <div
    className={`evolution-options${isBranching ? ' is-branching' : ' is-linear'}${side ? ` is-${side}` : ''}`}
    role={isBranching ? 'group' : undefined}
    aria-label={isBranching ? 'Evoluciones posibles' : undefined}
  >
    <div className="evolution-options-grid">
      {children.map((child) => {
        const requirement = evolutionRequirement(child);
        return <div className={`evolution-option${side === 'left' ? ' is-left' : ''}`} key={child.species.name}>
          <div className="evolution-option-route">
            <div className="evolution-link">
              <span className="evolution-condition">{requirement || 'SUBIR DE NIVEL'}</span>
              <EvolutionArrow direction={direction} isBranching={isBranching} />
            </div>
            <EvolutionBranch node={child} selectedId={selectedId} onOpen={onOpen} />
          </div>
        </div>;
      })}
    </div>
  </div>;
}

/** Renderiza cada etapa y conecta recursivamente sus evoluciones lineales o ramificadas. */
export default function EvolutionBranch({ node, selectedId, onOpen }) {
  // El número nacional se obtiene del recurso de especie enlazado en la respuesta evolutiva.
  const id = Number(node.species.url.match(/\/pokemon-species\/(\d+)\//)?.[1] || 0);
  const selected = id === selectedId;
  const evolutions = node.evolves_to || [];
  // Eevee separa las evoluciones por piedra de las que dependen de amistad o afecto.
  const isEeveeSplit = node.species.name === 'eevee' && evolutions.length > 1;
  const leftEvolutions = isEeveeSplit ? evolutions.filter((child) => EEVEE_ELEMENTAL_EVOLUTIONS.has(child.species.name)) : [];
  const rightEvolutions = isEeveeSplit ? evolutions.filter((child) => !EEVEE_ELEMENTAL_EVOLUTIONS.has(child.species.name)) : [];

  return <div className={`evolution-branch${isEeveeSplit ? ' is-eevee-split' : ''}`}>
    {leftEvolutions.length > 0 && <EvolutionOptions
      children={leftEvolutions}
      selectedId={selectedId}
      onOpen={onOpen}
      side="left"
    />}
    <EvolutionEntry node={node} id={id} selected={selected} onOpen={onOpen} />
    {isEeveeSplit
      ? rightEvolutions.length > 0 && <EvolutionOptions
        children={rightEvolutions}
        selectedId={selectedId}
        onOpen={onOpen}
        side="right"
      />
      : evolutions.length > 0 && <EvolutionOptions children={evolutions} selectedId={selectedId} onOpen={onOpen} />}
  </div>;
}
