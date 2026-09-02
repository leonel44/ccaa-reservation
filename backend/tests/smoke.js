import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,        // 1 utilisateur virtuel
  duration: '10s',
};

const BASE_URL = 'http://localhost:4000/api';

export default function () {
  const res = http.get(`${BASE_URL}/health`);
  check(res, {
    'statut 200': (r) => r.status === 200,
  });
  sleep(1);
}