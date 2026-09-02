import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // montée à 10 utilisateurs
    { duration: '1m', target: 10 },   // maintien 1 minute
    { duration: '20s', target: 0 },   // redescente
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'], // 95% des requêtes < 800ms
    http_req_failed: ['rate<0.01'],   // moins de 1% d'échecs
  },
};

const BASE_URL = 'http://localhost:4000/api';

export default function () {
  // 1. Connexion
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: 'employe@ccaa.cm', motDePasse: 'Passer123!' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(loginRes, { 'connexion OK': (r) => r.status === 200 });

  const token = loginRes.json('token');
  const authHeaders = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };

  // 2. Consulter les ressources
  const resRes = http.get(`${BASE_URL}/resources`, authHeaders);
  check(resRes, { 'ressources OK': (r) => r.status === 200 });

  sleep(1);

  // 3. Consulter les réservations
  const resaRes = http.get(`${BASE_URL}/reservations`, authHeaders);
  check(resaRes, { 'réservations OK': (r) => r.status === 200 });

  sleep(Math.random() * 2 + 1); // pause entre 1 et 3s, simule un vrai utilisateur
}