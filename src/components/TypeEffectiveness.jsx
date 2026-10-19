import { useCallback, useEffect, useRef, useState } from 'react';
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

/** Lista desplazable por fila; las flechas aparecen solo si aún hay tipos fuera de vista. */
function EffectivenessTypeList({ types }) {
  const listRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const maxScrollLeft = list.scrollWidth - list.clientWidth;
    setCanScrollLeft(list.scrollLeft > 1);
    setCanScrollRight(maxScrollLeft - list.scrollLeft > 1);
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;

    updateScrollState();
    list.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateScrollState);
    observer?.observe(list);
    if (list.firstElementChild) observer?.observe(list.firstElementChild);
    document.fonts?.ready?.then(updateScrollState);

    return () => {
      list.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
      observer?.disconnect();
    };
  }, [types, updateScrollState]);

  const scroll = (direction) => {
    const list = listRef.current;
    if (!list) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    list.scrollBy({ left: direction * Math.max(list.clientWidth * 0.7, 100), behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  const isScrollable = canScrollLeft || canScrollRight;

  return <div className={`effectiveness-type-scroll-shell${isScrollable ? ' is-scrollable' : ''}`}>
    <div className="effectiveness-type-list" ref={listRef} role="group" aria-label="Tipos de ataque; desplazamiento horizontal" tabIndex={canScrollLeft || canScrollRight ? 0 : undefined}>
      {types.map((type) => <TypeBadge key={type} type={type} />)}
    </div>
    {canScrollLeft && <button className="effectiveness-scroll-arrow is-left" type="button" onClick={() => scroll(-1)} aria-label="Mostrar tipos anteriores" title="Mostrar tipos anteriores">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8.5 3.5 4 8l4.5 4.5M4.5 8H12" /></svg>
    </button>}
    {canScrollRight && <button className="effectiveness-scroll-arrow is-right" type="button" onClick={() => scroll(1)} aria-label="Mostrar más tipos" title="Mostrar más tipos">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m7.5 3.5 4.5 4.5-4.5 4.5M11.5 8H4" /></svg>
    </button>}
  </div>;
}

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
          <td><EffectivenessTypeList types={attackTypes} /></td>
        </tr>;
        })}</tbody>
      </table>
    </div>
    <p className="type-effectiveness-note">El cálculo considera únicamente los tipos; no incluye habilidades, objetos ni efectos temporales.</p>
  </section>;
}
