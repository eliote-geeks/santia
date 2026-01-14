import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { Button } from '../components/ui/button';
import { Calendar, Clock, ExternalLink, Loader2, MessageSquare, RefreshCw, UserPlus } from 'lucide-react';
import { authHeaders, getToken, getUser } from '../lib/auth';

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

const categoryLabels = {
  generale: 'Generale',
  'sante-sexuelle': 'Sante sexuelle',
  addictions: 'Addictions',
  'perte-de-poids': 'Perte de poids',
  sommeil: 'Sommeil',
  cheveux: 'Cheveux',
  fertilite: 'Fertilite'
};

const doctorCategories = [
  { value: 'generale', label: 'Generale' },
  { value: 'perte-de-poids', label: 'Perte de poids' },
  { value: 'sante-sexuelle', label: 'Sante sexuelle' },
  { value: 'addictions', label: 'Addictions' },
  { value: 'sommeil', label: 'Sommeil' },
  { value: 'cheveux', label: 'Cheveux' }
];

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
  const navigate = useNavigate();
  const location = useLocation();
  const welcomeType = location.state?.welcome;
  const welcomeMessage = welcomeType === 'login'
    ? 'Bon retour. Le tableau de bord est pret.'
    : welcomeType === 'register'
      ? 'Bienvenue. Le compte admin est actif.'
      : '';
  const [intakes, setIntakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [doctorLoading, setDoctorLoading] = useState(true);
  const [doctorError, setDoctorError] = useState('');
  const [doctorSuccess, setDoctorSuccess] = useState('');
  const [patients, setPatients] = useState([]);
  const [patientLoading, setPatientLoading] = useState(true);
  const [patientError, setPatientError] = useState('');
  const [doctorForm, setDoctorForm] = useState({
    name: '',
    email: '',
    phone: '',
    specialty: '',
    category: 'generale',
    openemr_provider_id: ''
  });
  const [doctorSubmitting, setDoctorSubmitting] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');
  const [seedDetails, setSeedDetails] = useState([]);
  const [scheduleValues, setScheduleValues] = useState({});
  const [meetingOverrides, setMeetingOverrides] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [assignValues, setAssignValues] = useState({});
  const [assigningId, setAssigningId] = useState(null);

  const loadIntakes = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/api/intakes`, { headers: authHeaders() });
      setIntakes(response.data || []);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Veuillez vous connecter pour acceder a l administration.');
      } else if (err.response?.status === 403) {
        setError('Acces reserve a l administration.');
      } else {
        setError('Impossible de charger les demandes.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDoctors = async () => {
    setDoctorLoading(true);
    setDoctorError('');
    try {
      const response = await axios.get(`${API_URL}/api/doctors`, { headers: authHeaders() });
      setDoctors(response.data || []);
    } catch (err) {
      if (err.response?.status === 401) {
        setDoctorError('Veuillez vous connecter pour acceder a l administration.');
      } else if (err.response?.status === 403) {
        setDoctorError('Acces reserve a l administration.');
      } else {
        setDoctorError('Impossible de charger les medecins.');
      }
    } finally {
      setDoctorLoading(false);
    }
  };

  const loadPatients = async () => {
    setPatientLoading(true);
    setPatientError('');
    try {
      const response = await axios.get(`${API_URL}/api/patients`, { headers: authHeaders() });
      setPatients(response.data || []);
    } catch (err) {
      if (err.response?.status === 401) {
        setPatientError('Veuillez vous connecter pour acceder a l administration.');
      } else if (err.response?.status === 403) {
        setPatientError('Acces reserve a l administration.');
      } else {
        setPatientError('Impossible de charger les patients.');
      }
    } finally {
      setPatientLoading(false);
    }
  };

  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (!token) {
      navigate('/login?next=/admin');
      return;
    }
    if (user?.role !== 'admin') {
      setError('Acces reserve a l administration.');
      return;
    }
    loadIntakes();
    loadDoctors();
    loadPatients();
  }, [navigate]);

  const handleScheduleChange = (id, value) => {
    setScheduleValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleMeetingChange = (id, value) => {
    setMeetingOverrides((prev) => ({ ...prev, [id]: value }));
  };

  const handleDoctorFormChange = (field, value) => {
    setDoctorForm((prev) => ({ ...prev, [field]: value }));
    if (doctorError) setDoctorError('');
    if (doctorSuccess) setDoctorSuccess('');
  };

  const handleCreateDoctor = async (event) => {
    event.preventDefault();
    setDoctorSubmitting(true);
    setDoctorError('');
    setDoctorSuccess('');
    try {
      const response = await axios.post(`${API_URL}/api/doctors`, doctorForm, { headers: authHeaders() });
      const { openim_password, openim_created, ...doctor } = response.data || {};
      setDoctors((prev) => [doctor, ...prev]);
      setDoctorForm({
        name: '',
        email: '',
        phone: '',
        specialty: '',
        category: 'generale',
        openemr_provider_id: ''
      });
      if (openim_created && openim_password) {
        setDoctorSuccess(`Medecin cree. Mot de passe OpenIM: ${openim_password}`);
      } else {
        setDoctorSuccess('Medecin cree. OpenIM sera connecte plus tard.');
      }
    } catch (err) {
      setDoctorError('Impossible de creer le medecin.');
    } finally {
      setDoctorSubmitting(false);
    }
  };

  const handleSeedDoctors = async () => {
    setSeedLoading(true);
    setDoctorError('');
    setDoctorSuccess('');
    setSeedMessage('');
    setSeedDetails([]);
    try {
      const response = await axios.post(`${API_URL}/api/doctors/seed`, {}, { headers: authHeaders() });
      const created = response.data?.created || [];
      const skipped = response.data?.skipped || [];
      setSeedDetails(
        created.map((doctor) => ({
          id: doctor.id,
          name: doctor.name,
          email: doctor.email,
          openim_password: doctor.openim_password,
          openim_created: doctor.openim_created
        }))
      );
      const createdLabel = created.length
        ? `${created.length} medecin(s) test ajoute(s).`
        : 'Aucun nouveau medecin ajoute.';
      const skippedLabel = skipped.length ? ` ${skipped.length} deja existant(s).` : '';
      setSeedMessage(`${createdLabel}${skippedLabel}`);
      await loadDoctors();
    } catch (err) {
      setDoctorError('Impossible d ajouter les medecins tests.');
    } finally {
      setSeedLoading(false);
    }
  };

  const handleAssignChange = (id, value) => {
    setAssignValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleAssignDoctor = async (id) => {
    const current = intakes.find((item) => item.id === id);
    const doctorId = assignValues[id] ?? current?.assigned_doctor_id;
    if (!doctorId) {
      setError('Veuillez choisir un medecin a assigner.');
      return;
    }
    setAssigningId(id);
    setError('');
    try {
      const response = await axios.patch(
        `${API_URL}/api/intakes/${id}/assign`,
        { doctor_id: doctorId },
        { headers: authHeaders() }
      );
      setIntakes((prev) => prev.map((item) => (item.id === id ? response.data : item)));
      setAssignValues((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      setError('L assignation a echoue.');
    } finally {
      setAssigningId(null);
    }
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
      const response = await axios.patch(
        `${API_URL}/api/intakes/${id}/schedule`,
        payload,
        { headers: authHeaders() }
      );
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
            <Button
              onClick={() => {
                loadIntakes();
                loadDoctors();
                loadPatients();
              }}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Rafraichir
            </Button>
          </div>

          {welcomeMessage && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 text-sm text-emerald-700">
              {welcomeMessage}
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[#0A2540]">Equipe medicale</h2>
                <p className="text-sm text-[#64748B]">Ajoutez les medecins et assignez-les aux demandes.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={loadDoctors} variant="outline" className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Rafraichir medecins
                </Button>
                <Button onClick={handleSeedDoctors} variant="outline" className="flex items-center gap-2" disabled={seedLoading}>
                  <UserPlus className="w-4 h-4" />
                  {seedLoading ? 'Ajout en cours...' : 'Ajouter des medecins tests'}
                </Button>
              </div>
            </div>

            {doctorError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4 text-sm text-red-700">
                {doctorError}
              </div>
            )}

            {doctorSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mt-4 text-sm text-emerald-700">
                {doctorSuccess}
              </div>
            )}

            {seedMessage && (
              <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4 mt-4 text-sm text-[#0A2540]">
                <p className="font-medium">{seedMessage}</p>
                {seedDetails.length > 0 && (
                  <div className="mt-3 space-y-2 text-xs text-[#64748B]">
                    {seedDetails.map((doctor) => (
                      <div key={doctor.id}>
                        Dr {doctor.name} · {doctor.email}
                        {doctor.openim_created && doctor.openim_password
                          ? ` · Mdp OpenIM: ${doctor.openim_password}`
                          : ' · OpenIM non lie'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleCreateDoctor} className="mt-6 grid md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[#0A2540]">Nom complet</label>
                <input
                  type="text"
                  className="input-santia"
                  placeholder="Dr Nana Kouam"
                  value={doctorForm.name}
                  onChange={(event) => handleDoctorFormChange('name', event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[#0A2540]">Specialite</label>
                <input
                  type="text"
                  className="input-santia"
                  placeholder="Addictologie, sexologie, nutrition..."
                  value={doctorForm.specialty}
                  onChange={(event) => handleDoctorFormChange('specialty', event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[#0A2540]">Categorie</label>
                <select
                  className="input-santia"
                  value={doctorForm.category}
                  onChange={(event) => handleDoctorFormChange('category', event.target.value)}
                >
                  {doctorCategories.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[#0A2540]">Email</label>
                <input
                  type="email"
                  className="input-santia"
                  placeholder="medecin@santia.cm"
                  value={doctorForm.email}
                  onChange={(event) => handleDoctorFormChange('email', event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[#0A2540]">Telephone</label>
                <input
                  type="tel"
                  className="input-santia"
                  placeholder="+237 6 99 00 00 00"
                  value={doctorForm.phone}
                  onChange={(event) => handleDoctorFormChange('phone', event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <label className="text-sm font-medium text-[#0A2540]">ID OpenEMR (optionnel)</label>
                <input
                  type="text"
                  className="input-santia"
                  placeholder="Ex: 3"
                  value={doctorForm.openemr_provider_id}
                  onChange={(event) => handleDoctorFormChange('openemr_provider_id', event.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" className="btn-green px-6 py-3" disabled={doctorSubmitting}>
                  {doctorSubmitting ? 'Creation...' : 'Ajouter le medecin'}
                </Button>
              </div>
            </form>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-[#0A2540] mb-3">Medecins actifs</h3>
              {doctorLoading ? (
                <div className="flex items-center gap-2 text-sm text-[#64748B]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#2ECC71]" />
                  Chargement des medecins...
                </div>
              ) : (
                <div className="space-y-3">
                  {doctors.length === 0 && (
                    <div className="text-sm text-[#64748B]">Aucun medecin enregistre pour le moment.</div>
                  )}
                  {doctors.map((doctor) => (
                  <div key={doctor.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-slate-200 rounded-xl px-4 py-3">
                    <div>
                      <p className="font-semibold text-[#0A2540]">Dr {doctor.name}</p>
                      <p className="text-sm text-[#64748B]">
                        {doctor.specialty} · {doctor.email}
                        {doctor.category && ` · ${categoryLabels[doctor.category] || doctor.category}`}
                      </p>
                    </div>
                      <div className="text-xs text-[#64748B] space-y-1">
                        <p>Tel: {doctor.phone}</p>
                        {doctor.openemr_provider_id && <p>OpenEMR: {doctor.openemr_provider_id}</p>}
                        <p>{doctor.openim_user_id ? 'OpenIM actif' : 'OpenIM non lie'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
            <h2 className="text-xl font-bold text-[#0A2540] mb-4">Patients inscrits</h2>
            {patientLoading ? (
              <div className="flex items-center gap-2 text-sm text-[#64748B]">
                <Loader2 className="w-4 h-4 animate-spin text-[#2ECC71]" />
                Chargement des patients...
              </div>
            ) : patientError ? (
              <div className="text-sm text-red-700">{patientError}</div>
            ) : (
              <div className="space-y-3">
                {patients.length === 0 && (
                  <div className="text-sm text-[#64748B]">Aucun patient inscrit pour le moment.</div>
                )}
                {patients.map((patient) => (
                  <div key={patient.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-slate-200 rounded-xl px-4 py-3">
                    <div>
                      <p className="font-semibold text-[#0A2540]">{patient.name}</p>
                      <p className="text-sm text-[#64748B]">{patient.email} · {patient.phone}</p>
                      <p className="text-xs text-[#94A3B8]">Inscrit le {formatDateTime(patient.created_at)}</p>
                    </div>
                    <div className="text-xs text-[#64748B]">
                      {patient.openim_user_id ? 'OpenIM actif' : 'OpenIM non lie'}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                      <p className="text-sm text-[#64748B]">{categoryLabels[intake.category] || intake.category} • {intake.city}</p>
                      {intake.assigned_doctor && (
                        <p className="text-xs text-[#64748B] mt-1">
                          Medecin: Dr {intake.assigned_doctor.name} · {intake.assigned_doctor.specialty}
                        </p>
                      )}
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
                        <label className="text-sm font-medium text-[#0A2540]">Medecin assigne</label>
                        <select
                          className="input-santia"
                          value={assignValues[intake.id] ?? intake.assigned_doctor_id ?? ''}
                          onChange={(e) => handleAssignChange(intake.id, e.target.value)}
                        >
                          <option value="">Choisir un medecin</option>
                          {doctors.map((doctor) => (
                            <option key={doctor.id} value={doctor.id}>
                              Dr {doctor.name} · {doctor.specialty}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          onClick={() => handleAssignDoctor(intake.id)}
                          disabled={assigningId === intake.id || doctors.length === 0}
                          variant="outline"
                          className="px-6 py-3"
                        >
                          {assigningId === intake.id ? 'Assignation...' : 'Assigner'}
                        </Button>
                      </div>
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
