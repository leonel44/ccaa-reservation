import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { api } from './api.js';
import PageLoader from './components/PageLoader.jsx';

const Login = lazy(() => import('./pages/Login.jsx'));
const Inscription = lazy(() => import('./pages/Inscription.jsx'));
const Profil = lazy(() => import('./pages/Profil.jsx'));
const Accueil = lazy(() => import('./pages/Accueil.jsx'));
const Plan = lazy(() => import('./pages/Plan.jsx'));
const Calendrier = lazy(() => import('./pages/Calendrier.jsx'));
const FormulaireReservation = lazy(() => import('./pages/FormulaireReservation.jsx'));
const MesReservations = lazy(() => import('./pages/MesReservations.jsx'));
const DashboardAdmin = lazy(() => import('./pages/DashboardAdmin.jsx'));
const AdminRessources = lazy(() => import('./pages/AdminRessources.jsx'));
const AdminServices = lazy(() => import('./pages/AdminServices.jsx'));
const AdminUtilisateurs = lazy(() => import('./pages/AdminUtilisateurs.jsx'));
const AdminJoursFeries = lazy(() => import('./pages/AdminJoursFeries.jsx'));
const AdminJournal = lazy(() => import('./pages/AdminJournal.jsx'));
const Support = lazy(() => import('./pages/Support.jsx'));

function RouteProtegee({ children, adminSeulement = false }) {
  if (!api.estConnecte()) return <Navigate to="/connexion" replace />;
  if (adminSeulement && api.getRole() !== 'Administrateur') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/connexion" element={<Login />} />
        <Route path="/inscription" element={<Inscription />} />
        <Route path="/profil" element={<RouteProtegee><Profil /></RouteProtegee>} />

        <Route path="/" element={<RouteProtegee><Accueil /></RouteProtegee>} />
        <Route path="/plan" element={<RouteProtegee><Plan /></RouteProtegee>} />
        <Route path="/calendrier" element={<RouteProtegee><Calendrier /></RouteProtegee>} />
        <Route path="/reserver" element={<RouteProtegee><FormulaireReservation /></RouteProtegee>} />
        <Route path="/mes-reservations" element={<RouteProtegee><MesReservations /></RouteProtegee>} />
        <Route path="/support" element={<RouteProtegee><Support /></RouteProtegee>} />

        <Route path="/admin" element={<RouteProtegee adminSeulement><DashboardAdmin /></RouteProtegee>} />
        <Route path="/admin/ressources" element={<RouteProtegee adminSeulement><AdminRessources /></RouteProtegee>} />
        <Route path="/admin/services" element={<RouteProtegee adminSeulement><AdminServices /></RouteProtegee>} />
        <Route path="/admin/utilisateurs" element={<RouteProtegee adminSeulement><AdminUtilisateurs /></RouteProtegee>} />
        <Route path="/admin/jours-bloques" element={<RouteProtegee adminSeulement><AdminJoursFeries /></RouteProtegee>} />
        <Route path="/admin/journal" element={<RouteProtegee adminSeulement><AdminJournal /></RouteProtegee>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
