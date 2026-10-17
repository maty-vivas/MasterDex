/** Presenta opciones seleccionables de una categoría, como regiones o tipos. */
export default function FilterGroup({ title, options, selected, onToggle, className = '' }) {
  return <section className={`filter-group ${className}`}>
    <h2>{title}</h2>
    <div className="filter-options">{options.map((option) => <label key={option.id} className={`filter-option${option.icon ? ' filter-option-type' : ''}`} style={option.color ? { '--filter-type-color': option.color } : undefined}>
      <input type="checkbox" checked={selected.includes(option.id)} onChange={() => onToggle(option.id)} />
      {option.icon && <img className="filter-type-icon" src={option.icon} alt="" aria-hidden="true" />}
      <span>{option.label}</span>
    </label>)}</div>
  </section>;
}
