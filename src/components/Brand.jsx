/** Marca reutilizada en el encabezado; activa navegación interna en vez de recargar la página. */
export default function Brand({ onHome }) {
  return <a className="brand" href="/" onClick={(event) => { event.preventDefault(); onHome(); }} aria-label="MasterDex, inicio">
    <span className="brand-mark" aria-hidden="true"><span /></span>
    <span>MASTER<span className="brand-accent">DEX</span></span>
  </a>;
}
