import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { Button } from '../components/ui/button';
import { Calendar, Clock, ExternalLink, Loader2, MessageSquare, RefreshCw } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusTone = {
  pending: 'bg-amber-100 text-amber-700',
  scheduled: 'bg-emerald-100 text-emerald-700',
  done: 'bg-slate-200 text-slate-700'
};

const statusLabel = {
  pending: 'En attente',
  scheduled: 'Planifiee',
  done: 'Terminee'
};

const formatDateTime = (value) => {
  if (!value) return 'A planifier';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const Admin = () => {
  const [intakes, setIntakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scheduleValues, setScheduleValues] = useState({});
  const [meetingOverrides, setMeetingOverrides] = useState({});
  const [savingId, setSavingId] = useState(null);

  const loadIntakes = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/api/intakes`);
      setIntakes(response.data || []);
    } catch (err) {
      setError('Impossible de charger les demandes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntakes();
  }, []);

  const handleScheduleChange = (id, value) => {
    setScheduleValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleMeetingChange = (id, value) => {
    setMeetingOverrides((prev) => ({ ...prev, [id]: value }));
  };

  const handleSchedule = async (id) => {
    const scheduled_at = scheduleValues[id];
    if (!scheduled_at) {
      setError('Veuillez choisir une date et heure pour planifier.');
      return;
    }

    setSavingId(id);
    setError('');
    try {
      const payload = { scheduled_at };
      if (meetingOverrides[id]) {
        payload.meeting_url = meetingOverrides[id];
      }
      const response = await axios.patch(`${API_URL}/api/intakes/${id}/schedule`, payload);
      setIntakes((prev) => prev.map((item) => (item.id === id ? response.data : item)));
    } catch (err) {
      setError('La planification a echoue.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="admin-page">
      <Navbar />

      <main className="pt-24 pb-16 md:pt-28 md:pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#0A2540]">Planification manuelle</h1>
              <p className="text-sm text-[#64748B]">Planifiez les consultations et envoyez les liens WhatsApp.</p>
            </div>
            <Button onClick={loadIntakes} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Rafraichir
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-[#2ECC71] animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {intakes.length === 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center text-sm text-[#64748B]">
                  Aucune demande pour le moment.
                </div>
              )}

              {intakes.map((intake) => (
                <div key={intake.id} className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold text-[#0A2540]">{intake.name}</h2>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusTone[intake.status] || statusTone.pending}`}>
                          {statusLabel[intake.status] || statusLabel.pending}
                        </span>
                      </div>
                      <p className="text-sm text-[#64748B]">{intake.category} • {intake.city}</p>
                      <p className="text-xs text-[#94A3B8] mt-1">ID: {intake.id}</p>
                    </div>
                    <Link to={`/dossier/${intake.id}`} className="text-sm text-[#0A2540] hover:text-[#2ECC71] transition-colors">
                      Voir le dossier patient
                    </Link>
                  </div>

                  <div className="mt-6 grid md:grid-cols-2 gap-6">
                    <div className="space-y-3 text-sm text-[#64748B]">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#2ECC71]" />
                        <span>Planifie: {formatDateTime(intake.scheduled_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#2ECC71]" />
                        <span>Demande recue le {formatDateTime(intake.created_at)}</span>
                      </div>
                      {intake.meeting_url && (
                        <div className="flex items-center gap-2">
                          <ExternalLink className="w-4 h-4 text-[#2ECC71]" />
                          <a href={intake.meeting_url} target="_blank" rel="noreferrer" className="text-[#0A2540] hover:text-[#2ECC71] break-all">
                            {intake.meeting_url}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="grid gap-3">
                        <label className="text-sm font-medium text-[#0A2540]">Date et heure</label>
                        <input
                          type="datetime-local"
                          className="input-santia"
                          value={scheduleValues[intake.id] || ''}
                          onChange={(e) => handleScheduleChange(intake.id, e.target.value)}
                        />
                      </div>
                      <div className="grid gap-3">
                        <label className="text-sm font-medium text-[#0A2540]">Lien Jitsi (optionnel)</label>
                        <input
                          type="text"
                          className="input-santia"
                          placeholder="Laisser vide pour generer automatiquement"
                          value={meetingOverrides[intake.id] || ''}
                          onChange={(e) => handleMeetingChange(intake.id, e.target.value)}
                        />
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          onClick={() => handleSchedule(intake.id)}
                          disabled={savingId === intake.id}
                          className="btn-green px-6 py-3"
                        >
                          {savingId === intake.id ? 'Planification...' : 'Planifier'}
                        </Button>
                        {intake.whatsapp_link && (
                          <a href={intake.whatsapp_link} target="_blank" rel="noreferrer">
                            <Button variant="outline" className="flex items-center gap-2 px-5 py-3">
                              <MessageSquare className="w-4 h-4" />
                              WhatsApp
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Admin;
