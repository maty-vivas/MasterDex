import TypeBadge from './TypeBadge.jsx';
import { typeEffectivenessGroups } from '../utils/typeEffectiveness.js';
const MULTIPLIER_TEXT = {
  0: { value: '×0', label: 'Inmune' },
  0.25: { value: '×¼', label: 'Nada eficaz' },
  0.5: { value: '×½', label: 'Poco eficaz' },
  1: { value: '×1', label: 'Neutro' },
  2: { value: '×2', label: 'Eficaz' },
  4: { value: '×4', label: 'Súper eficaz' },
};

/** Tabla defensiva calculada desde los tipos de la forma actualmente seleccionada. */
export default function TypeEffectiveness({ types }) {
  const groups = typeEffectivenessGroups(types?.map(({ type }) => type.name) || []);

  if (!groups.length) return null;

  return <section className="detail-info-panel type-effectiveness-panel" aria-labelledby="type-effectiveness-title">
    <div className="type-effectiveness-heading">
      <h2 className="detail-section-title" id="type-effectiveness-title">DEBILIDADES Y RESISTENCIAS</h2>
      <p>Daño recibido según los tipos del Pokémon</p>
    </div>
    <div className="type-effectiveness-table-wrap">
      <table className="type-effectiveness-table" aria-label="Daño recibido por tipo de ataque">
        <thead><tr><th scope="col">DAÑO</th><th scope="col">TIPOS DE ATAQUE</th></tr></thead>
        <tbody>{groups.map(({ multiplier, className, types: attackTypes }) => {
          const { value: multiplierText, label } = MULTIPLIER_TEXT[multiplier];
          return <tr key={multiplier} className={`effectiveness-${className}`}>
          <th scope="row"><span className="effectiveness-multiplier" title={label} aria-label={`${label}, daño ${multiplierText}`} tabIndex="0">{multiplierText}</span></th>
          <td><div className="effectiveness-type-list">{attackTypes.map((type) => <TypeBadge key={type} type={type} />)}</div></td>
        </tr>;
        })}</tbody>
      </table>
    </div>
    <p className="type-effectiveness-note">El cálculo considera únicamente los tipos; no incluye habilidades, objetos ni efectos temporales.</p>
  </section>;
}
