import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import logo from '../assets/logo-ccaa.jpg';
import { api } from '../api.js';

const LIENS_EMPLOYE = [
  { to: '/', label: 'Accueil', icone: '🏠' },
  { to: '/plan', label: 'Plan', icone: '🗺️' },
  { to: '/calendrier', label: 'Calendrier', icone: '📅' },
  { to: '/reserver', label: 'Réserver', icone: '➕' },
  { to: '/mes-reservations', label: 'Mes réservations', icone: '🗂️' },
];
const LIENS_RESPONSABLE = [
  ...LIENS_EMPLOYE,
  { to: '/responsable', label: 'Validation équipe', icone: '✅' },
];

const LIENS_ADMIN = [
  { to: '/admin', label: 'Tableau de bord', icone: '📊' },
  { to: '/admin/ressources', label: 'Ressources', icone: '🏢' },
  { to: '/admin/services', label: 'Services & priorités', icone: '⭐' },
  { to: '/admin/utilisateurs', label: 'Utilisateurs', icone: '👥' },
  { to: '/admin/jours-bloques', label: 'Jours bloqués', icone: '📆' },
  { to: '/admin/contraintes', label: 'Contraintes', icone: '⚙️' },
  { to: '/admin/support', label: 'Support', icone: '🆘' },
  { to: '/admin/journal', label: "Journal d'audit", icone: '📜' },
];

function initiales(nomComplet) {
  if (!nomComplet) return '?';
  const parts = nomComplet.trim().split(' ');
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

export default function Layout({ children, role }) {
  const [menuMobileOuvert, setMenuMobileOuvert] = useState(false);
  const [notifOuvertes, setNotifOuvertes] = useState(false);
  const [menuUtilisateurOuvert, setMenuUtilisateurOuvert] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [themeSombre, setThemeSombre] = useState(() => localStorage.getItem('ccaa_theme') === 'sombre');
  const navigate = useNavigate();

  const liens = role === 'Administrateur' ? LIENS_ADMIN : api.getRole() === 'Responsable' ? LIENS_RESPONSABLE : LIENS_EMPLOYE;
  const nonLues = notifications.filter((n) => !n.lue).length;
  const nomComplet = api.getNomComplet ? api.getNomComplet() : '';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeSombre ? 'sombre' : 'clair');
    localStorage.setItem('ccaa_theme', themeSombre ? 'sombre' : 'clair');
  }, [themeSombre]);

  useEffect(() => {
    api.getNotifications().then(setNotifications).catch(() => {});
    const intervalle = setInterval(() => {
      api.getNotifications().then(setNotifications).catch(() => {});
    }, 30000);
    return () => clearInterval(intervalle);
  }, []);

  async function ouvrirNotifications() {
    setNotifOuvertes((v) => !v);
    if (!notifOuvertes && nonLues > 0) {
      await api.toutMarquerLu();
      setNotifications((prev) => prev.map((n) => ({ ...n, lue: true })));
    }
  }

  function seDeconnecter() {
    api.clearToken();
    navigate('/connexion');
  }

  return (
    <div className="app-shell">
      <header className="entete">
        <div className="entete-gauche">
          <button className="bouton-menu-mobile" onClick={() => setMenuMobileOuvert((v) => !v)} aria-label="Menu">☰</button>
          <img src={logo} alt="Logo CCAA" className="entete-logo" />
          <span className="entete-titre">CCAA — Réservation de salles</span>
        </div>
        <div className="entete-droite">
          <button className="bouton-secondaire" onClick={() => navigate('/support')} title="Besoin d’aide urgente">🆘 Urgence</button>
          <button className="bouton-icone" onClick={() => setThemeSombre((v) => !v)} title="Changer de thème">
            {themeSombre ? '☀️' : '🌙'}
          </button>

          <div className="notif-conteneur">
            <button className="bouton-icone" onClick={ouvrirNotifications} aria-label="Notifications">
              🔔
              {nonLues > 0 && <span className="pastille-notif">{nonLues}</span>}
            </button>
            {notifOuvertes && (
              <div className="panneau-notifications">
                <p className="panneau-notifications-titre">Notifications</p>
                {notifications.length === 0 && <p className="texte-discret">Aucune notification.</p>}
                {notifications.map((n) => (
                  <div key={n.id} className={`notif-item notif-${n.type}`}>
                    <p>{n.message}</p>
                    <span className="texte-discret">{new Date(n.creeLe).toLocaleString('fr-FR')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="menu-utilisateur">
            <div className="avatar-utilisateur" onClick={() => setMenuUtilisateurOuvert((v) => !v)}>
              {initiales(nomComplet)}
            </div>
            {menuUtilisateurOuvert && (
              <div className="panneau-menu-utilisateur">
                <button className="item-menu-utilisateur" onClick={() => { setMenuUtilisateurOuvert(false); navigate('/profil'); }}>
                  👤 Mon profil
                </button>
                <button className="item-menu-utilisateur" onClick={seDeconnecter}>🚪 Déconnexion</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="app-corps">
        {menuMobileOuvert && (
          <div className="fond-menu-mobile" onClick={() => setMenuMobileOuvert(false)} />
        )}
        <nav className={`barre-laterale ${menuMobileOuvert ? 'barre-laterale-ouverte' : ''}`}>
          {liens.map((lien) => (
            <NavLink
              key={lien.to}
              to={lien.to}
              end={lien.to === '/' || lien.to === '/admin'}
              className={({ isActive }) => `lien-nav ${isActive ? 'lien-nav-actif' : ''}`}
              onClick={() => setMenuMobileOuvert(false)}
            >
              <span className="lien-nav-icone">{lien.icone}</span> {lien.label}
            </NavLink>
          ))}
        </nav>

        <main className="contenu-principal">{children}</main>
      </div>

      <nav className="barre-mobile-basse">
        {liens.slice(0, 4).map((lien) => (
          <NavLink
            key={lien.to}
            to={lien.to}
            end={lien.to === '/' || lien.to === '/admin'}
            className={({ isActive }) => `lien-mobile ${isActive ? 'lien-mobile-actif' : ''}`}
          >
            <span>{lien.icone}</span>
            <span className="lien-mobile-label">{lien.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}