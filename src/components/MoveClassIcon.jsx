import physicalClassIcon from '../assets/moves/move-class-physical.png';
import specialClassIcon from '../assets/moves/move-class-special.png';
import statusClassIcon from '../assets/moves/move-class-status.png';

/** Mapea la clase de daño de PokéAPI al icono local y a un texto accesible. */
export default function MoveClassIcon({ damageClass }) {
  const labels = { physical:'Físico', special:'Especial', status:'Estado' };
  const images = { physical:physicalClassIcon, special:specialClassIcon, status:statusClassIcon };
  const label = labels[damageClass];
  if (!label) return null;
  return <img className="move-class-icon" src={images[damageClass]} alt={`Clase: ${label}`} title={label} draggable="false" />;
}
