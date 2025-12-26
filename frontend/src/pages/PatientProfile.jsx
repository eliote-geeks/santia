import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import {
  Calendar,
  Clock,
  Video,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  Loader2,
  FileText
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusMeta = {
  pending: { label: 'En attente', tone: 'bg-amber-100 text-amber-700' },
  scheduled: { label: 'Planifiee', tone: 'bg-emerald-100 text-emerald-700' },
  done: { label: 'Terminee', tone: 'bg-slate-200 text-slate-700' }
};

const categoryLabels = {
  'sante-sexuelle': 'Sante sexuelle',
  addictions: 'Addictions',
  'perte-de-poids': 'Perte de poids',
  sommeil: 'Sommeil',
  cheveux: 'Cheveux',
  fertilite: 'Fertilite'
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

export const PatientProfile = () => {
  const { id } = useParams();
  const [intake, setIntake] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState(() => ([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Bonjour, je suis l assistant Santia. Decrivez votre besoin et vos disponibilites.'
    }
  ]));

  useEffect(() => {
    const fetchIntake = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/intakes/${id}`);
        setIntake(response.data);
      } catch (err) {
        setError('Impossible de charger votre dossier.');
      } finally {
        setLoading(false);
      }
    };

    fetchIntake();
  }, [id]);

  const handleCopy = async () => {
    if (!intake?.meeting_url) return;
    try {
      await navigator.clipboard.writeText(intake.meeting_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setCopied(false);
    }
  };

  const handleSendMessage = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    const message = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      role: 'patient',
      content: trimmed
    };
    setChatMessages((prev) => [...prev, message]);
    setChatInput('');
  };

  const statusInfo = intake?.status ? (statusMeta[intake.status] || statusMeta.pending) : statusMeta.pending;
  const meetingReady = intake?.status === 'scheduled' && intake?.meeting_url;
  const categoryLabel = intake?.category ? (categoryLabels[intake.category] || intake.category) : '';

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="patient-profile-page">
      <Navbar />

      <main className="pt-24 pb-16 md:pt-28 md:pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <p className="text-sm text-[#64748B]">Dossier patient</p>
              <h1 className="text-3xl md:text-4xl font-bold text-[#0A2540]">Suivi de votre consultation</h1>
              <p className="text-sm text-[#64748B] mt-2">Reference: {id}</p>
            </div>
            <Link to="/" className="text-sm text-[#0A2540] hover:text-[#2ECC71] transition-colors">
              Retour a l'accueil
            </Link>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">
                <strong>Urgence ?</strong> En cas de symptomes graves, appelez le <strong>112</strong>.
              </p>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20" data-testid="profile-loading">
              <Loader2 className="w-6 h-6 text-[#2ECC71] animate-spin" />
            </div>
          )}

          {!loading && error && (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center" data-testid="profile-error">
              <p className="text-[#0A2540] font-semibold mb-2">Oups</p>
              <p className="text-sm text-[#64748B]">{error}</p>
            </div>
          )}

          {!loading && intake && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#0A2540]/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-[#0A2540]" />
                    </div>
                    <div>
                      <p className="text-sm text-[#64748B]">Statut actuel</p>
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.tone}`}>
                        {statusInfo.label}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-[#64748B]">Demande creee le {formatDateTime(intake.created_at)}</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                <h2 className="text-xl font-bold text-[#0A2540] mb-4">Rendez-vous</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-[#2ECC71] mt-0.5" />
                      <div>
                        <p className="text-sm text-[#64748B]">Date et heure</p>
                        <p className="font-semibold text-[#0A2540]">{formatDateTime(intake.scheduled_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-[#2ECC71] mt-0.5" />
                      <div>
                        <p className="text-sm text-[#64748B]">Statut</p>
                        <p className="font-semibold text-[#0A2540]">{statusInfo.label}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Video className="w-5 h-5 text-[#2ECC71] mt-0.5" />
                      <div>
                        <p className="text-sm text-[#64748B]">Lien de consultation</p>
                        {meetingReady ? (
                          <p className="text-sm text-[#0A2540] break-all">{intake.meeting_url}</p>
                        ) : (
                          <p className="text-sm text-[#64748B]">Votre lien sera disponible apres planification.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {meetingReady && (
                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <a href={intake.meeting_url} target="_blank" rel="noreferrer">
                      <Button className="btn-green px-6 py-3">Rejoindre la consultation</Button>
                    </a>
                    <Button variant="outline" onClick={handleCopy} className="px-6 py-3">
                      {copied ? 'Lien copie' : 'Copier le lien'}
                    </Button>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#0A2540]">Messagerie</h2>
                    <p className="text-sm text-[#64748B]">Discutez avec un agent IA pour preparer le rendez-vous.</p>
                  </div>
                  <span className="text-xs text-[#64748B]">Bientot connecte a n8n</span>
                </div>

                <div className="bg-[#F8FAFC] rounded-2xl border border-slate-200 p-4 md:p-5">
                  <div className="max-h-64 overflow-y-auto space-y-3">
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'patient' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                            message.role === 'patient'
                              ? 'bg-[#0A2540] text-white'
                              : 'bg-white text-[#0A2540] border border-slate-200'
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-col gap-3">
                    <Textarea
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Ecrivez votre message..."
                      className="input-santia min-h-[96px]"
                    />
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button className="btn-green px-6 py-3" onClick={handleSendMessage}>
                        Envoyer
                      </Button>
                      <p className="text-xs text-[#64748B] self-center">
                        Entree pour envoyer, Shift+Entree pour aller a la ligne.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                <h2 className="text-xl font-bold text-[#0A2540] mb-4">Vos informations</h2>
                <div className="grid md:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[#2ECC71]" />
                      <span className="text-[#64748B]">{intake.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#2ECC71]" />
                      <span className="text-[#64748B]">{intake.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#2ECC71]" />
                      <span className="text-[#64748B]">{intake.city}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[#64748B]"><strong className="text-[#0A2540]">Motif:</strong> {categoryLabel}</p>
                    <p className="text-[#64748B]"><strong className="text-[#0A2540]">Symptomes:</strong> {intake.symptoms}</p>
                    {intake.history && (
                      <p className="text-[#64748B]"><strong className="text-[#0A2540]">Antecedents:</strong> {intake.history}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PatientProfile;
