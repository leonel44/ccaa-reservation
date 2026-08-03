import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { api } from '../api.js';

export default function AdminJournal() {
  const [journal, setJournal] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    api.getJournal().then(setJournal).finally(() => setChargement(false));
  }, []);

  return (
    <Layout role="Administrateur">
      <div className="entete-page"><h1>Journal d'audit</h1></div>
      <p className="texte-discret" style={{ marginBottom: 16 }}>
        Traçabilité des créations, validations, rejets et annulations — exigence de section 3.3 du cahier des charges.
      </p>

      {chargement && <div className="squelette" style={{ height: 300 }} />}

      {!chargement && journal.length === 0 && (
        <div className="etat-vide"><div className="etat-vide-icone">📜</div><p>Aucune action enregistrée pour le moment.</p></div>
      )}

      {!chargement && journal.length > 0 && (
        <div className="panneau">
          {journal.map((j) => (
            <div key={j.id} className="ligne-journal">
              <span className="journal-action">{j.action}</span>
              <div>
                <p className="journal-details">{j.details}</p>
                <span className="journal-date">{new Date(j.horodatage).toLocaleString('fr-FR')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
