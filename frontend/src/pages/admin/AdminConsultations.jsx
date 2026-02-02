import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, ChevronDown, ChevronUp, Clock, ExternalLink, Loader2, MessageSquare, RefreshCw, Wallet } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { DataTableToolbar } from '../../components/DataTableToolbar';
import { Pagination } from '../../components/Pagination';
import { authHeaders, getToken, getUser } from '../../lib/auth';
import { AdminLayout } from './AdminLayout';

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
  generale: 'Generale',
  'sante-sexuelle': 'Sante sexuelle',
  addictions: 'Addictions',
  'perte-de-poids': 'Perte de poids',
  sommeil: 'Sommeil & stress',
  cheveux: 'Cheveux & peau'
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

const buildPaymentProofUrl = (proof) => {
  if (!proof?.data) return '';
  const type = proof.type || 'image/jpeg';
  return `data:${type};base64,${proof.data}`;
};

const formatMoney = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  if (Number.isNaN(amount)) return value;
  return new Intl.NumberFormat('fr-FR').format(amount);
};

export const AdminConsultations = () => {
  const navigate = useNavigate();
  const [intakes, setIntakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [doctorLoading, setDoctorLoading] = useState(true);
  const [scheduleValues, setScheduleValues] = useState({});
  const [meetingOverrides, setMeetingOverrides] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [assignValues, setAssignValues] = useState({});
  const [assigningId, setAssigningId] = useState(null);
  const [paymentUpdatingId, setPaymentUpdatingId] = useState(null);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState('');
  const [selectedIntakeId, setSelectedIntakeId] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortButton = ({ columnKey, label }) => (
    <button
      type="button"
      onClick={() => handleSort(columnKey)}
      className="flex items-center gap-1 text-left text-sm font-semibold text-[#0A2540] hover:text-[#2ECC71]"
    >
      {label}
      {sortKey === columnKey ? (
        sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
      ) : null}
    </button>
  );

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
    try {
      const response = await axios.get(`${API_URL}/api/doctors`, { headers: authHeaders() });
      setDoctors(response.data || []);
    } finally {
      setDoctorLoading(false);
    }
  };

  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (!token) {
      navigate('/login?next=/admin/consultations');
      return;
    }
    if (user?.role !== 'admin') {
      setError('Acces reserve a l administration.');
      return;
    }
    loadIntakes();
    loadDoctors();
  }, [navigate]);

  const filteredIntakes = useMemo(() => {
    const term = query.trim().toLowerCase();
    const base = showCompleted ? intakes : intakes.filter((item) => item.status !== 'done');
    if (!term) return base;
    return base.filter((item) => {
      const doctorName = item.assigned_doctor?.name || '';
      return [
        item.name,
        item.email,
        item.phone,
        item.city,
        item.category,
        doctorName,
        item.id
      ]
        .filter(Boolean)
        .some((value) => value.toString().toLowerCase().includes(term));
    });
  }, [intakes, showCompleted, query]);

  const sortedIntakes = useMemo(() => {
    const getValue = (item) => {
      switch (sortKey) {
        case 'name':
          return item.name || '';
        case 'category':
          return item.category || '';
        case 'status':
          return item.status || '';
        case 'payment_status':
          return item.payment_status || '';
        case 'scheduled_at':
          return item.scheduled_at || '';
        case 'doctor':
          return item.assigned_doctor?.name || '';
        case 'created_at':
        default:
          return item.created_at || '';
      }
    };
    return [...filteredIntakes].sort((a, b) => {
      const aVal = getValue(a);
      const bVal = getValue(b);
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredIntakes, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedIntakes.length / pageSize));
  const paginatedIntakes = sortedIntakes.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [query, pageSize, showCompleted]);

  useEffect(() => {
    if (!selectedIntakeId && sortedIntakes.length > 0) {
      setSelectedIntakeId(sortedIntakes[0].id);
    }
  }, [sortedIntakes, selectedIntakeId]);

  const selectedIntake = sortedIntakes.find((item) => item.id === selectedIntakeId) || null;

  const handleScheduleChange = (id, value) => {
    setScheduleValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleMeetingChange = (id, value) => {
    setMeetingOverrides((prev) => ({ ...prev, [id]: value }));
  };

  const handlePaymentStatus = async (id, status) => {
    setPaymentUpdatingId(id);
    setPaymentError('');
    setPaymentSuccess('');
    try {
      const response = await axios.patch(
        `${API_URL}/api/intakes/${id}/payment`,
        { status },
        { headers: authHeaders() },
      );
      setIntakes((prev) => prev.map((item) => (item.id === id ? response.data : item)));
      setPaymentSuccess(status === 'confirmed' ? 'Paiement confirme.' : 'Paiement refuse.');
    } catch (err) {
      if (err.response?.status === 401) {
        setPaymentError('Veuillez vous connecter pour acceder a l administration.');
      } else if (err.response?.status === 403) {
        setPaymentError('Acces reserve a l administration.');
      } else {
        setPaymentError('Impossible de mettre a jour le paiement.');
      }
    } finally {
      setPaymentUpdatingId(null);
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
    <AdminLayout
      title="Demandes de consultations"
      subtitle="Suivez, assignez et planifiez les rendez-vous."
      actions={(
        <Button
          onClick={() => {
            loadIntakes();
            loadDoctors();
          }}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Rafraichir
        </Button>
      )}
    >
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700">
          {error}
        </div>
      )}
      {paymentError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700">
          {paymentError}
        </div>
      )}
      {paymentSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 text-sm text-emerald-700">
          {paymentSuccess}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-[#0A2540]">Consultations en cours</h2>
            <p className="text-sm text-[#64748B]">Liste complete des demandes et actions rapides.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCompleted((prev) => !prev)}
            className="text-sm font-medium text-[#0A2540] border border-slate-200 rounded-xl px-4 py-2 hover:border-[#2ECC71]"
          >
            {showCompleted ? 'Masquer terminees' : 'Afficher terminees'}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[#64748B]">
            <Loader2 className="w-4 h-4 animate-spin text-[#2ECC71]" />
            Chargement des demandes...
          </div>
        ) : sortedIntakes.length === 0 ? (
          <div className="text-sm text-[#64748B]">Aucune demande pour le moment.</div>
        ) : (
          <>
            <DataTableToolbar
              query={query}
              onQueryChange={setQuery}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              totalCount={sortedIntakes.length}
              label="demandes"
            />
            <div className="overflow-auto border border-slate-200 rounded-2xl">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-[#0A2540]">
                  <tr>
                    <th className="text-left px-4 py-3">
                      <SortButton columnKey="name" label="Patient" />
                    </th>
                    <th className="text-left px-4 py-3">
                      <SortButton columnKey="category" label="Categorie" />
                    </th>
                    <th className="text-left px-4 py-3 font-semibold">Type</th>
                    <th className="text-left px-4 py-3">
                      <SortButton columnKey="status" label="Statut" />
                    </th>
                    <th className="text-left px-4 py-3">
                      <SortButton columnKey="payment_status" label="Paiement" />
                    </th>
                    <th className="text-left px-4 py-3">
                      <SortButton columnKey="scheduled_at" label="Planifie" />
                    </th>
                    <th className="text-left px-4 py-3">
                      <SortButton columnKey="doctor" label="Medecin" />
                    </th>
                    <th className="text-left px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedIntakes.map((intake) => {
                    const consultationType = intake.consultation_type === 'express' ? 'Express' : 'Standard';
                    const paymentStatus = paymentStatusLabel[intake.payment_status] || paymentStatusLabel.pending;
                    const paymentTone = paymentStatusTone[intake.payment_status] || paymentStatusTone.pending;
                    return (
                      <tr
                        key={intake.id}
                        className={`border-t border-slate-100 ${
                          intake.id === selectedIntakeId ? 'bg-emerald-50/40' : 'bg-white'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#0A2540]">{intake.name}</div>
                          <div className="text-xs text-[#64748B]">{intake.city}</div>
                        </td>
                        <td className="px-4 py-3 text-[#64748B]">
                          {categoryLabels[intake.category] || intake.category}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-[#0A2540]">
                            {consultationType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusTone[intake.status] || statusTone.pending}`}>
                            {statusLabel[intake.status] || statusLabel.pending}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${paymentTone}`}>
                            {paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#64748B]">
                          {formatDateTime(intake.scheduled_at)}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#64748B]">
                          {intake.assigned_doctor ? `Dr ${intake.assigned_doctor.name}` : 'Non assigne'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              className="px-3 py-2 text-xs"
                              onClick={() => setSelectedIntakeId(intake.id)}
                            >
                              Details
                            </Button>
                            <Link to={`/dossier/${intake.id}`}>
                              <Button className="btn-green px-3 py-2 text-xs">Dossier</Button>
                            </Link>
                            {intake.whatsapp_link && (
                              <a href={intake.whatsapp_link} target="_blank" rel="noreferrer">
                                <Button variant="outline" className="px-3 py-2 text-xs">
                                  WhatsApp
                                </Button>
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>

      {selectedIntake && (
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h3 className="text-xl font-semibold text-[#0A2540]">Details de la consultation</h3>
              <p className="text-sm text-[#64748B]">Patient: {selectedIntake.name}</p>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusTone[selectedIntake.status] || statusTone.pending}`}>
              {statusLabel[selectedIntake.status] || statusLabel.pending}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3 text-sm text-[#64748B]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#2ECC71]" />
                <span>Planifie: {formatDateTime(selectedIntake.scheduled_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#2ECC71]" />
                <span>Demande recue le {formatDateTime(selectedIntake.created_at)}</span>
              </div>
              <div className="flex items-start gap-2">
                <Wallet className="w-4 h-4 text-[#2ECC71] mt-0.5" />
                <div>
                  <p className="text-xs text-[#64748B]">Paiement</p>
                  <p className="text-sm text-[#0A2540]">
                    {selectedIntake.payment_method || 'Mobile Money'} · {formatMoney(selectedIntake.payment_amount)} FCFA
                  </p>
                  <p className="text-xs text-[#64748B]">
                    Type: {selectedIntake.consultation_type === 'express' ? 'Express' : 'Standard'}
                  </p>
                  <div className="text-xs text-[#64748B]">
                    Capture: {selectedIntake.payment_proof?.data ? 'Ajoutee' : 'Aucune'}
                  </div>
                  {selectedIntake.payment_proof?.data && (
                    <div className="mt-2">
                      {selectedIntake.payment_proof?.type?.includes('pdf') ? (
                        <a
                          href={buildPaymentProofUrl(selectedIntake.payment_proof)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-[#0A2540] hover:border-[#2ECC71]"
                        >
                          Voir le PDF
                        </a>
                      ) : (
                        <a href={buildPaymentProofUrl(selectedIntake.payment_proof)} target="_blank" rel="noreferrer">
                          <img
                            src={buildPaymentProofUrl(selectedIntake.payment_proof)}
                            alt="Capture de paiement"
                            className="h-16 w-24 rounded-lg border border-slate-200 object-cover"
                          />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {selectedIntake.meeting_url && (
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-[#2ECC71]" />
                  <a href={selectedIntake.meeting_url} target="_blank" rel="noreferrer" className="text-[#0A2540] hover:text-[#2ECC71] break-all">
                    {selectedIntake.meeting_url}
                  </a>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid gap-3">
                <label className="text-sm font-medium text-[#0A2540]">Validation paiement</label>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => handlePaymentStatus(selectedIntake.id, 'confirmed')}
                    disabled={!selectedIntake.payment_proof?.data || selectedIntake.payment_status === 'confirmed' || paymentUpdatingId === selectedIntake.id}
                    className="btn-green px-5 py-3"
                  >
                    {paymentUpdatingId === selectedIntake.id ? 'Validation...' : 'Confirmer'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handlePaymentStatus(selectedIntake.id, 'rejected')}
                    disabled={!selectedIntake.payment_proof?.data || selectedIntake.payment_status === 'rejected' || paymentUpdatingId === selectedIntake.id}
                    className="px-5 py-3"
                  >
                    {paymentUpdatingId === selectedIntake.id ? 'Validation...' : 'Refuser'}
                  </Button>
                </div>
                {!selectedIntake.payment_proof?.data && (
                  <p className="text-xs text-[#94A3B8]">Aucune capture de paiement renseignee.</p>
                )}
              </div>

              <div className="grid gap-3">
                <label className="text-sm font-medium text-[#0A2540]">Medecin assigne</label>
                <select
                  className="input-santia"
                  value={assignValues[selectedIntake.id] ?? selectedIntake.assigned_doctor_id ?? ''}
                  onChange={(e) => handleAssignChange(selectedIntake.id, e.target.value)}
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
                  onClick={() => handleAssignDoctor(selectedIntake.id)}
                  disabled={assigningId === selectedIntake.id || doctors.length === 0}
                  variant="outline"
                  className="px-6 py-3"
                >
                  {assigningId === selectedIntake.id ? 'Assignation...' : 'Assigner'}
                </Button>
              </div>

              <div className="grid gap-3">
                <label className="text-sm font-medium text-[#0A2540]">Date et heure</label>
                <input
                  type="datetime-local"
                  className="input-santia"
                  value={scheduleValues[selectedIntake.id] || ''}
                  onChange={(e) => handleScheduleChange(selectedIntake.id, e.target.value)}
                />
              </div>
              <div className="grid gap-3">
                <label className="text-sm font-medium text-[#0A2540]">Lien Jitsi (optionnel)</label>
                <input
                  type="text"
                  className="input-santia"
                  placeholder="Laisser vide pour generer automatiquement"
                  value={meetingOverrides[selectedIntake.id] || ''}
                  onChange={(e) => handleMeetingChange(selectedIntake.id, e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => handleSchedule(selectedIntake.id)}
                  disabled={savingId === selectedIntake.id}
                  className="btn-green px-6 py-3"
                >
                  {savingId === selectedIntake.id ? 'Planification...' : 'Planifier'}
                </Button>
                {selectedIntake.whatsapp_link && (
                  <a href={selectedIntake.whatsapp_link} target="_blank" rel="noreferrer">
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
      )}
    </AdminLayout>
  );
};

export default AdminConsultations;
