import { STAT_ICONS } from '../data/constants.js';

/** Aplica el SVG de la estadística como máscara para que tome el color definido por CSS. */
export default function StatIcon({ stat }) {
  return <span className="stat-icon" style={{ '--stat-icon-mask': `url("${STAT_ICONS[stat]}")` }} aria-hidden="true" />;
}
