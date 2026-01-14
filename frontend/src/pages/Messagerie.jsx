import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { Button } from '../components/ui/button';
import { authHeaders, clearAuth, getOpenIM, getToken, setOpenIM } from '../lib/auth';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const OPENIM_WEB_URL = (process.env.REACT_APP_OPENIM_WEB_URL || 'http://localhost:11001').replace(/\/$/, '');
const OPENIM_API_URL = process.env.REACT_APP_OPENIM_API_URL || '';
const OPENIM_CHAT_URL = process.env.REACT_APP_OPENIM_CHAT_URL || '';
const OPENIM_WS_URL = process.env.REACT_APP_OPENIM_WS_URL || '';

const encodePayload = (payload) => {
  const json = JSON.stringify(payload);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const Messagerie = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const welcomeType = location.state?.welcome;
  const welcomeMessage = welcomeType === 'login'
    ? 'Bon retour. Votre messagerie est prete.'
    : welcomeType === 'register'
      ? 'Bienvenue. Votre messagerie est prete.'
      : '';
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      navigate('/login?next=/messagerie');
    }
  }, [navigate]);

  const isOpenIMStale = (payload) => {
    if (!payload?.issued_at) return true;
    const issuedAt = new Date(payload.issued_at).getTime();
    if (Number.isNaN(issuedAt)) return true;
    const ageMs = Date.now() - issuedAt;
    return ageMs > 12 * 60 * 60 * 1000;
  };

  const refreshOpenIM = async () => {
    setRefreshing(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/openim/refresh`, {}, { headers: authHeaders() });
      setOpenIM(response.data);
      return response.data;
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Votre session a expire. Merci de vous reconnecter.');
      } else if (err.response?.status === 409) {
        setError("Reconnectez-vous pour reinitialiser la messagerie.");
      } else {
        setError("Impossible de rafraichir la messagerie. Reessayez.");
      }
      return null;
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenChat = async () => {
    setError('');
    let openim = getOpenIM();
    if (!openim?.im_token || !openim?.chat_token || !openim?.user_id || isOpenIMStale(openim)) {
      openim = await refreshOpenIM();
      if (!openim?.im_token || !openim?.chat_token || !openim?.user_id) {
        setError("La session de messagerie n'est pas encore active. Reconnectez-vous d'abord.");
        return;
      }
    }
    if (!OPENIM_WEB_URL) {
      setError("URL de la messagerie indisponible.");
      return;
    }
    const payload = {
      imToken: openim.im_token,
      chatToken: openim.chat_token,
      userID: openim.user_id,
    };
    if (OPENIM_API_URL) payload.apiUrl = OPENIM_API_URL;
    if (OPENIM_CHAT_URL) payload.chatUrl = OPENIM_CHAT_URL;
    if (OPENIM_WS_URL) payload.wsUrl = OPENIM_WS_URL;
    const url = `${OPENIM_WEB_URL}/sso.html?payload=${encodePayload(payload)}`;
    window.open(url, '_blank', 'noopener');
  };

  const handleReauth = () => {
    clearAuth();
    navigate('/login?next=/messagerie');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      <main className="pt-24 pb-16 md:pt-28 md:pb-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-3xl shadow-xl p-8 md:p-10">
            <h1 className="text-3xl font-bold text-[#0A2540] mb-2">Messagerie</h1>
            <p className="text-sm text-[#64748B] mb-6">
              Discutez avec votre médecin dans un espace dédié et sécurisé.
            </p>

            {welcomeMessage && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700 mb-6">
                {welcomeMessage}
              </div>
            )}

            {error && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 mb-6">
                <p className="mb-3">{error}</p>
                <Button variant="outline" onClick={handleReauth}>
                  Se reconnecter
                </Button>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <p className="text-sm text-[#475569] mb-4">
                Cliquez sur le bouton pour ouvrir la messagerie. Une nouvelle fenêtre s'ouvrira.
              </p>
              <Button className="btn-green" onClick={handleOpenChat} disabled={refreshing}>
                {refreshing ? 'Connexion en cours...' : 'Ouvrir la messagerie'}
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Messagerie;
