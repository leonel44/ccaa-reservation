export default function PageLoader() {
  return (
    <div className="page-loader-shell" aria-live="polite" aria-busy="true">
      <div className="page-loader-card">
        <span className="spinner" aria-hidden="true" />
        <p className="texte-discret">Chargement de la page…</p>
      </div>
    </div>
  );
}
