import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { Button } from '../components/ui/button';
import { Pagination } from '../components/Pagination';
import { authHeaders, getToken } from '../lib/auth';
import {
  Calendar,
  Clock,
  Video,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  Loader2,
  FileText,
  Wallet
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusMeta = {
  pending: { label: 'En attente', tone: 'bg-amber-100 text-amber-700' },
  scheduled: { label: 'Planifiee', tone: 'bg-emerald-100 text-emerald-700' },
  done: { label: 'Terminee', tone: 'bg-slate-200 text-slate-700' }
};

const paymentStatusLabel = {
  pending: 'En attente',
  confirmed: 'Confirme',
  rejected: 'Refuse'
};

const paymentStatusTone = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700'
};

const categoryLabels = {
  'sante-sexuelle': 'Sante sexuelle',
  generale: 'Generale',
  addictions: 'Addictions',
  'perte-de-poids': 'Perte de poids',
  sommeil: 'Sommeil & stress',
  cheveux: 'Cheveux & peau'
};

const durationLabels = {
  'moins-1-semaine': 'Moins d une semaine',
  '1-4-semaines': '1 a 4 semaines',
  '1-3-mois': '1 a 3 mois',
  'plus-3-mois': 'Plus de 3 mois'
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

const formatMoney = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  if (Number.isNaN(amount)) return value;
  return new Intl.NumberFormat('fr-FR').format(amount);
};

export const PatientProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const welcomeType = location.state?.welcome;
  const welcomeMessage = welcomeType === 'register'
    ? 'Bienvenue sur Santia. Votre compte est cree.'
    : welcomeType === 'login'
      ? 'Bon retour. Votre espace patient est pret.'
      : '';
  const isDetailView = Boolean(id);
  const [intake, setIntake] = useState(null);
  const [intakes, setIntakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(6);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchIntake = async () => {
      if (!getToken()) {
        navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
        return;
      }
      try {
        if (id) {
          const response = await axios.get(`${API_URL}/api/intakes/${id}`, { headers: authHeaders() });
          setIntake(response.data);
        } else {
          const response = await axios.get(`${API_URL}/api/intakes/me/paged`, {
            headers: authHeaders(),
            params: {
              page,
              page_size: pageSize,
              sort_key: 'created_at',
              sort_dir: 'desc',
            },
          });
          const payload = response.data || {};
          const items = payload.items || [];
          setIntakes(items);
          setTotalCount(payload.total || 0);
        }
      } catch (err) {
        if (err.response?.status === 401) {
          setError('Veuillez vous connecter pour acceder a votre dossier.');
        } else {
          setError('Impossible de charger votre dossier.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchIntake();
  }, [id, navigate, location.pathname, page, pageSize]);

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


  const statusInfo = intake?.status ? (statusMeta[intake.status] || statusMeta.pending) : statusMeta.pending;
  const meetingReady = Boolean(intake?.meeting_url);
  const categoryLabel = intake?.category ? (categoryLabels[intake.category] || intake.category) : '';
  const durationLabel = intake?.duration ? (durationLabels[intake.duration] || intake.duration) : '';
  const doctorName = intake?.assigned_doctor?.name ? `Dr ${intake.assigned_doctor.name}` : 'En attente';
  const paymentAmount = intake?.payment_amount !== null && intake?.payment_amount !== undefined
    ? `${formatMoney(intake.payment_amount)} FCFA`
    : '—';
  const paymentMethod = intake?.payment_method || 'Mobile Money';
  const paymentReference = intake?.payment_reference || '—';
  const consultationType = intake?.consultation_type === 'express' ? 'Express' : 'Standard';
  const paymentProofUrl = intake?.payment_proof?.data
    ? `data:${intake.payment_proof.type || 'image/jpeg'};base64,${intake.payment_proof.data}`
    : '';
  const isProofPdf = (intake?.payment_proof?.type || '').includes('pdf');
  const paymentStatus = paymentStatusLabel[intake?.payment_status] || paymentStatusLabel.pending;
  const paymentTone = paymentStatusTone[intake?.payment_status] || paymentStatusTone.pending;
  const nextAction = intake?.status === 'scheduled'
    ? 'Votre consultation est planifiee. Connectez-vous 5 minutes avant l\'heure.'
    : 'Votre demande est en cours de traitement. Un medecin vous sera assigne rapidement.';
  const progressSteps = intake ? ([
    {
      id: 'demande',
      label: 'Demande recue',
      detail: `Le ${formatDateTime(intake.created_at)}`,
      done: true
    },
    {
      id: 'medecin',
      label: 'Medecin assigne',
      detail: intake.assigned_doctor ? doctorName : 'En cours',
      done: !!intake.assigned_doctor
    },
    {
      id: 'rdv',
      label: 'Rendez-vous planifie',
      detail: intake.scheduled_at ? formatDateTime(intake.scheduled_at) : 'A planifier',
      done: !!intake.scheduled_at
    }
  ]) : [];

  const pageTitle = isDetailView ? 'Suivi de votre consultation' : 'Mes consultations';
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="patient-profile-page">
      <Navbar />

      <main className="pt-24 pb-16 md:pt-28 md:pb-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <p className="text-sm text-[#64748B]">Dossier de suivi</p>
              <h1 className="text-3xl md:text-4xl font-bold text-[#0A2540]">{pageTitle}</h1>
              {id && <p className="text-sm text-[#64748B] mt-2">Reference: {id}</p>}
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

          {welcomeMessage && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-8">
              <p className="text-sm text-emerald-700">{welcomeMessage}</p>
            </div>
          )}

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

          {!loading && !error && !isDetailView && (
            intakes.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <p className="text-[#0A2540] font-semibold mb-2">Aucune consultation trouvee</p>
                <p className="text-sm text-[#64748B] mb-6">Soumettez une demande pour acceder a votre dossier.</p>
                <Link to="/consultation">
                  <Button className="btn-green px-6 py-3">Commencer une consultation</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {intakes.map((item) => {
                  const status = statusMeta[item.status] || statusMeta.pending;
                  const label = item.category ? (categoryLabels[item.category] || item.category) : '—';
                  const hasMeeting = Boolean(item.meeting_url);
                  return (
                    <div key={item.id} className="bg-white rounded-2xl shadow-lg p-6 md:p-7">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <p className="text-xs text-[#64748B]">Reference: {item.id}</p>
                          <h3 className="text-lg font-semibold text-[#0A2540] mt-1">{label}</h3>
                          <p className="text-sm text-[#64748B] mt-1">Cree le {formatDateTime(item.created_at)}</p>
                          {item.scheduled_at && (
                            <p className="text-sm text-[#64748B]">Planifie le {formatDateTime(item.scheduled_at)}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${status.tone}`}>
                            {status.label}
                          </span>
                          <Link to={`/dossier/${item.id}`}>
                            <Button variant="outline" className="px-4 py-2">Voir details</Button>
                          </Link>
                        </div>
                      </div>
                      {hasMeeting && (
                        <div className="mt-4 bg-[#F8FAFC] border border-slate-200 rounded-xl p-4">
                          <p className="text-xs text-[#64748B] mb-2">Lien de consultation</p>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <p className="text-xs text-[#0A2540] break-all">{item.meeting_url}</p>
                            <a href={item.meeting_url} target="_blank" rel="noreferrer">
                              <Button className="btn-green px-4 py-2">Rejoindre</Button>
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )
          )}

          {!loading && !error && isDetailView && !intake && (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <p className="text-[#0A2540] font-semibold mb-2">Dossier introuvable</p>
              <p className="text-sm text-[#64748B] mb-6">Ce dossier n existe pas ou vous n y avez pas acces.</p>
              <Link to="/dossier">
                <Button variant="outline" className="px-6 py-3">Retour aux consultations</Button>
              </Link>
            </div>
          )}

          {!loading && intake && isDetailView && (
            <div className="space-y-6">
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#0A2540]/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-[#0A2540]" />
                    </div>
                    <div>
                      <p className="text-sm text-[#64748B]">Vue d'ensemble</p>
                      <h2 className="text-xl font-bold text-[#0A2540]">Suivi de votre demande</h2>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div className="rounded-xl border border-slate-200 p-4">
                      <p className="text-[#64748B]">Motif principal</p>
                      <p className="font-semibold text-[#0A2540]">{categoryLabel || 'N/A'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4">
                      <p className="text-[#64748B]">Patient</p>
                      <p className="font-semibold text-[#0A2540]">{intake.name} · {intake.age} ans · {intake.gender}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4">
                      <p className="text-[#64748B]">Statut</p>
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.tone}`}>
                        {statusInfo.label}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4">
                      <p className="text-[#64748B]">Date de creation</p>
                      <p className="font-semibold text-[#0A2540]">{formatDateTime(intake.created_at)}</p>
                    </div>
                  </div>

                  <div className="mt-6 bg-[#F8FAFC] border border-slate-200 rounded-xl p-4 text-sm text-[#64748B]">
                    <span className="font-semibold text-[#0A2540]">Prochaine action:</span> {nextAction}
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                  <h3 className="text-lg font-semibold text-[#0A2540] mb-4">Suivi du dossier</h3>
                  <div className="space-y-4">
                    {progressSteps.map((step) => (
                      <div key={step.id} className="flex items-start gap-3">
                        <div className={`mt-1 h-2.5 w-2.5 rounded-full ${step.done ? 'bg-[#2ECC71]' : 'bg-slate-300'}`} />
                        <div>
                          <p className="text-sm font-semibold text-[#0A2540]">{step.label}</p>
                          <p className="text-xs text-[#64748B]">{step.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
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
                    <div className="flex items-start gap-3">
                      <Video className="w-5 h-5 text-[#2ECC71] mt-0.5" />
                      <div>
                        <p className="text-sm text-[#64748B]">Mode</p>
                        <p className="font-semibold text-[#0A2540]">Video en ligne</p>
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
              <h2 className="text-xl font-bold text-[#0A2540] mb-4">Paiement</h2>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-[#64748B]">Mode</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Wallet className="w-4 h-4 text-[#2ECC71]" />
                    <p className="font-semibold text-[#0A2540]">{paymentMethod}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-[#64748B]">Montant</p>
                  <p className="font-semibold text-[#0A2540]">{paymentAmount}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-[#64748B]">Reference</p>
                  <p className="font-semibold text-[#0A2540] break-all">{paymentReference}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-[#64748B]">Type de consultation</p>
                  <p className="font-semibold text-[#0A2540]">{consultationType}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-[#64748B]">Capture</p>
                  {paymentProofUrl ? (
                    <div className="mt-2">
                      {isProofPdf ? (
                        <a
                          href={paymentProofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-[#0A2540] hover:border-[#2ECC71]"
                        >
                          Voir le PDF
                        </a>
                      ) : (
                        <a href={paymentProofUrl} target="_blank" rel="noreferrer">
                          <img
                            src={paymentProofUrl}
                            alt="Capture de paiement"
                            className="h-16 w-24 rounded-lg border border-slate-200 object-cover"
                          />
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="font-semibold text-[#0A2540]">Aucune</p>
                  )}
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-[#64748B]">Statut</p>
                  <span className={`inline-flex mt-2 text-[11px] font-semibold px-2 py-1 rounded-full ${paymentTone}`}>
                    {paymentStatus}
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#64748B] mt-4">
                Votre paiement est valide apres verification par notre equipe.
              </p>
            </div>

            {intake.assigned_doctor && (
              <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                <h2 className="text-xl font-bold text-[#0A2540] mb-4">Votre medecin</h2>
                  <div className="grid md:grid-cols-2 gap-6 text-sm">
                    <div>
                      <p className="text-lg font-semibold text-[#0A2540]">Dr {intake.assigned_doctor.name}</p>
                      <p className="text-sm text-[#64748B]">{intake.assigned_doctor.specialty}</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-[#2ECC71]" />
                        <span className="text-[#64748B]">{intake.assigned_doctor.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[#2ECC71]" />
                        <span className="text-[#64748B]">{intake.assigned_doctor.email}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                  <h2 className="text-xl font-bold text-[#0A2540] mb-4">Resume medical</h2>
                  <div className="space-y-3 text-sm text-[#64748B]">
                    <p><strong className="text-[#0A2540]">Motif:</strong> {categoryLabel}</p>
                    <p><strong className="text-[#0A2540]">Symptomes:</strong> {intake.symptoms}</p>
                    <p><strong className="text-[#0A2540]">Duree:</strong> {durationLabel}</p>
                    {intake.history && (
                      <p><strong className="text-[#0A2540]">Antecedents:</strong> {intake.history}</p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                  <h2 className="text-xl font-bold text-[#0A2540] mb-4">Coordonnees</h2>
                  <div className="space-y-3 text-sm">
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
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                <h2 className="text-xl font-bold text-[#0A2540] mb-4">Avant la consultation</h2>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-[#64748B]">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="font-semibold text-[#0A2540] mb-2">Preparer vos informations</p>
                    <p>Notez vos symptomes, traitements en cours et questions a poser.</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="font-semibold text-[#0A2540] mb-2">Tester votre connexion</p>
                    <p>Assurez-vous d'etre dans un endroit calme avec une bonne connexion.</p>
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
