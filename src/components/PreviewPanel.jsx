import { useState } from 'react';
import abilityInfoIcon from '../assets/ability-info.svg';
import { ARTWORK } from '../data/constants.js';
import { padId } from '../utils/pokemon.js';
import TypeBadge from './TypeBadge.jsx';

/** Panel contextual de la lista: Pokéball vacía o vista previa del Pokémon activo. */
export default function PreviewPanel({ pokemon, detail, onOpen }) {
  const [artworkLoad, setArtworkLoad] = useState({ src: '', status: 'idle' });
  if (!pokemon) return <aside className="preview-panel empty-preview" aria-live="polite">
    <div className="preview-decoration" aria-hidden="true"><span className="preview-ring ring-one" /><span className="preview-ring ring-two" /><div className="preview-ball"><div className="preview-ball-top" /><div className="preview-ball-middle"><i /></div><div className="preview-ball-bottom" /></div><span className="preview-plus plus-one">＋</span><span className="preview-plus plus-two">＋</span></div>
    <p className="preview-hint">ELIGE UN POKÉMON</p>
    <span className="preview-caption"><span className="desktop-preview-hint">USA EL MOUSE O LAS FLECHAS DEL TECLADO</span><span className="mobile-preview-hint">TOCA UN POKÉMON PARA SELECCIONAR</span></span>
  </aside>;

  const artwork = `${ARTWORK}/${pokemon.id}.png`;
  const artworkStatus = artworkLoad.src === artwork ? artworkLoad.status : 'loading';
  return <aside className="preview-panel pokemon-preview" aria-live="polite">
    <span className="preview-number">N.º {padId(pokemon.id)} / POKÉDEX NACIONAL</span>
    <div className={`preview-artwork${artworkStatus === 'loading' ? ' is-loading' : ''}`}>
      <span className="preview-art-ring" />
      <img key={artwork} src={artwork} alt={`Ilustración de ${pokemon.name}`} style={artworkStatus === 'error' ? { visibility: 'hidden' } : undefined} onLoad={() => setArtworkLoad({ src: artwork, status: 'loaded' })} onError={() => setArtworkLoad({ src: artwork, status: 'error' })} />
      {artworkStatus === 'loading' && <span className="preview-image-loader" role="status"><i className="loading-pokeball" aria-hidden="true" />CARGANDO ILUSTRACIÓN…</span>}
    </div>
    <h2 className="preview-name">{pokemon.name}</h2>
    <div className="preview-types">{detail?.types.map(({ type }) => <TypeBadge key={type.name} type={type.name} />) || <span className="type-loading">CARGANDO TIPOS…</span>}</div>
    <span className="preview-caption">CLICK o ENTER/ESPACIO PARA VER LOS DETALLES</span>
    <button className="preview-details-button" type="button" onClick={onOpen}><img className="ability-info-icon" src={abilityInfoIcon} alt="" aria-hidden="true" /><span>Ver detalles</span><span className="preview-details-arrow" aria-hidden="true">→</span></button>
  </aside>;
}
