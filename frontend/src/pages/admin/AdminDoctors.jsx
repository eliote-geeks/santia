import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Loader2, RefreshCw, UserPlus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Pagination } from '../../components/Pagination';
import { authHeaders, getToken, getUser } from '../../lib/auth';
import { AdminLayout } from './AdminLayout';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const categoryLabels = {
  generale: 'Generale',
  'sante-sexuelle': 'Sante sexuelle',
  addictions: 'Addictions',
  'perte-de-poids': 'Perte de poids',
  sommeil: 'Sommeil & stress',
  cheveux: 'Cheveux & peau'
};

const doctorCategories = [
  { value: 'generale', label: 'Generale' },
  { value: 'perte-de-poids', label: 'Perte de poids' },
  { value: 'sante-sexuelle', label: 'Sante sexuelle' },
  { value: 'addictions', label: 'Addictions' },
  { value: 'sommeil', label: 'Sommeil & stress' },
  { value: 'cheveux', label: 'Cheveux & peau' }
];

const copyToClipboard = async (value) => {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch (error) {
    // ignore
  }
};

export const AdminDoctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [doctorLoading, setDoctorLoading] = useState(true);
  const [doctorError, setDoctorError] = useState('');
  const [doctorSuccess, setDoctorSuccess] = useState('');
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
  const [page, setPage] = useState(1);
  const pageSize = 8;

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

  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (!token) {
      return;
    }
    if (user?.role !== 'admin') {
      setDoctorError('Acces reserve a l administration.');
      return;
    }
    loadDoctors();
  }, []);

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

  const totalPages = Math.max(1, Math.ceil(doctors.length / pageSize));
  const paginatedDoctors = useMemo(
    () => doctors.slice((page - 1) * pageSize, page * pageSize),
    [doctors, page]
  );

  return (
    <AdminLayout
      title="Equipe medicale"
      subtitle="Ajoutez et organisez vos medecins."
      actions={(
        <>
          <Button onClick={loadDoctors} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Rafraichir
          </Button>
          <Button onClick={handleSeedDoctors} variant="outline" className="flex items-center gap-2" disabled={seedLoading}>
            <UserPlus className="w-4 h-4" />
            {seedLoading ? 'Ajout en cours...' : 'Ajouter des medecins tests'}
          </Button>
        </>
      )}
    >
      {doctorError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700">
          {doctorError}
        </div>
      )}

      {doctorSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 text-sm text-emerald-700">
          {doctorSuccess}
        </div>
      )}

      {seedMessage && (
        <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4 mb-6 text-sm text-[#0A2540]">
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

      <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
        <h2 className="text-xl font-semibold text-[#0A2540] mb-4">Ajouter un medecin</h2>
        <form onSubmit={handleCreateDoctor} className="grid md:grid-cols-2 gap-4">
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
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
        <h2 className="text-xl font-semibold text-[#0A2540] mb-4">Medecins actifs</h2>
        {doctorLoading ? (
          <div className="flex items-center gap-2 text-sm text-[#64748B]">
            <Loader2 className="w-4 h-4 animate-spin text-[#2ECC71]" />
            Chargement des medecins...
          </div>
        ) : (
          <>
            <div className="overflow-auto border border-slate-200 rounded-2xl">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-[#0A2540]">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Medecin</th>
                    <th className="text-left px-4 py-3 font-semibold">Specialite</th>
                    <th className="text-left px-4 py-3 font-semibold">Categorie</th>
                    <th className="text-left px-4 py-3 font-semibold">Contact</th>
                    <th className="text-left px-4 py-3 font-semibold">OpenIM</th>
                    <th className="text-left px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDoctors.map((doctor) => (
                    <tr key={doctor.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#0A2540]">Dr {doctor.name}</div>
                        <div className="text-xs text-[#64748B]">{doctor.email}</div>
                      </td>
                      <td className="px-4 py-3 text-[#64748B]">{doctor.specialty}</td>
                      <td className="px-4 py-3 text-[#64748B]">
                        {categoryLabels[doctor.category] || doctor.category || '—'}
                      </td>
                      <td className="px-4 py-3 text-[#64748B]">{doctor.phone}</td>
                      <td className="px-4 py-3 text-xs text-[#64748B]">
                        {doctor.openim_user_id ? 'Actif' : 'Non lie'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" className="px-3 py-2 text-xs" onClick={() => copyToClipboard(doctor.email)}>
                            Copier email
                          </Button>
                          <Button variant="outline" className="px-3 py-2 text-xs" onClick={() => copyToClipboard(doctor.phone)}>
                            Copier tel
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDoctors;
