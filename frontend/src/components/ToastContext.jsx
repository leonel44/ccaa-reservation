import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);
const ConfirmContext = createContext(null);

let idCompteur = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmation, setConfirmation] = useState(null);

  const notifier = useCallback((message, type = 'info') => {
    const id = ++idCompteur;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const demanderConfirmation = useCallback((message, titre = 'Confirmer') => {
    return new Promise((resolve) => {
      setConfirmation({
        titre,
        message,
        resoudre: (val) => { setConfirmation(null); resolve(val); },
      });
    });
  }, []);

  return (
    <ToastContext.Provider value={notifier}>
      <ConfirmContext.Provider value={demanderConfirmation}>
        {children}

        <div className="toast-conteneur">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
          ))}
        </div>

        {confirmation && (
          <div className="fond-modale" onClick={() => confirmation.resoudre(false)}>
            <div className="carte-modale carte-confirm" onClick={(e) => e.stopPropagation()}>
              <h2>{confirmation.titre}</h2>
              <p style={{ margin: '12px 0 20px', color: 'var(--texte-secondaire)', fontSize: 14 }}>{confirmation.message}</p>
              <div className="actions-formulaire">
                <button className="bouton-secondaire" onClick={() => confirmation.resoudre(false)}>Annuler</button>
                <button className="bouton-danger" onClick={() => confirmation.resoudre(true)}>Confirmer</button>
              </div>
            </div>
          </div>
        )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
