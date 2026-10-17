import { TYPE_COLORS } from '../data/constants.js';
import { typeLabel } from '../utils/pokemon.js';

/** Cápsula visual del tipo; el nombre y el color provienen del catálogo central. */
export default function TypeBadge({ type }) {
  return <span className="type-badge" style={{ '--type-color': TYPE_COLORS[type] || '#526164' }}>{typeLabel(type)}</span>;
}
