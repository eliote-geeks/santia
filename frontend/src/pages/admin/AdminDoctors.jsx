import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ChevronDown, ChevronUp, Loader2, RefreshCw, UserPlus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { DataTableToolbar } from '../../components/DataTableToolbar';
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
  const [pageSize, setPageSize] = useState(8);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    specialty: '',
    category: 'generale',
    openemr_provider_id: ''
  });
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

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

  const filteredDoctors = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return doctors;
    return doctors.filter((doctor) =>
      [
        doctor.name,
        doctor.email,
        doctor.phone,
        doctor.specialty,
        doctor.category,
        doctor.id
      ]
        .filter(Boolean)
        .some((value) => value.toString().toLowerCase().includes(term))
    );
  }, [doctors, query]);

  const sortedDoctors = useMemo(() => {
    const getValue = (doctor) => {
      switch (sortKey) {
        case 'name':
          return doctor.name || '';
        case 'specialty':
          return doctor.specialty || '';
        case 'category':
          return doctor.category || '';
        case 'email':
          return doctor.email || '';
        case 'created_at':
        default:
          return doctor.created_at || '';
      }
    };
    return [...filteredDoctors].sort((a, b) => {
      const aVal = getValue(a);
      const bVal = getValue(b);
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredDoctors, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedDoctors.length / pageSize));
  const paginatedDoctors = useMemo(
    () => sortedDoctors.slice((page - 1) * pageSize, page * pageSize),
    [sortedDoctors, page, pageSize]
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [query, pageSize]);

  const selectedDoctor = sortedDoctors.find((doctor) => doctor.id === selectedDoctorId) || null;

  useEffect(() => {
    if (!selectedDoctorId && sortedDoctors.length > 0) {
      setSelectedDoctorId(sortedDoctors[0].id);
    }
  }, [sortedDoctors, selectedDoctorId]);

  useEffect(() => {
    if (selectedDoctor) {
      setEditForm({
        name: selectedDoctor.name || '',
        email: selectedDoctor.email || '',
        phone: selectedDoctor.phone || '',
        specialty: selectedDoctor.specialty || '',
        category: selectedDoctor.category || 'generale',
        openemr_provider_id: selectedDoctor.openemr_provider_id || ''
      });
    }
  }, [selectedDoctor]);

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateDoctor = async () => {
    if (!selectedDoctor) return;
    setSavingId(selectedDoctor.id);
    setDoctorError('');
    setDoctorSuccess('');
    try {
      const response = await axios.patch(
        `${API_URL}/api/doctors/${selectedDoctor.id}`,
        editForm,
        { headers: authHeaders() }
      );
      setDoctors((prev) => prev.map((doc) => (doc.id === selectedDoctor.id ? response.data : doc)));
      setDoctorSuccess('Medecin mis a jour.');
      setEditMode(false);
    } catch (err) {
      setDoctorError(err.response?.data?.detail || 'Impossible de mettre a jour le medecin.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteDoctor = async (doctorId) => {
    const confirmDelete = window.confirm('Confirmer la suppression de ce medecin ?');
    if (!confirmDelete) return;
    setDeletingId(doctorId);
    setDoctorError('');
    setDoctorSuccess('');
    try {
      await axios.delete(`${API_URL}/api/doctors/${doctorId}`, { headers: authHeaders() });
      setDoctors((prev) => prev.filter((doc) => doc.id !== doctorId));
      if (selectedDoctorId === doctorId) {
        setSelectedDoctorId(null);
        setEditMode(false);
      }
      setDoctorSuccess('Medecin supprime.');
    } catch (err) {
      setDoctorError(err.response?.data?.detail || 'Impossible de supprimer le medecin.');
    } finally {
      setDeletingId(null);
    }
  };

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
            <DataTableToolbar
              query={query}
              onQueryChange={setQuery}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              totalCount={sortedDoctors.length}
              label="medecins"
            />
            <div className="overflow-auto border border-slate-200 rounded-2xl">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-[#0A2540]">
                  <tr>
                    <th className="text-left px-4 py-3">
                      <SortButton columnKey="name" label="Medecin" />
                    </th>
                    <th className="text-left px-4 py-3">
                      <SortButton columnKey="specialty" label="Specialite" />
                    </th>
                    <th className="text-left px-4 py-3">
                      <SortButton columnKey="category" label="Categorie" />
                    </th>
                    <th className="text-left px-4 py-3">
                      <SortButton columnKey="email" label="Contact" />
                    </th>
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
                          <Button
                            variant="outline"
                            className="px-3 py-2 text-xs"
                            onClick={() => {
                              setSelectedDoctorId(doctor.id);
                              setEditMode(false);
                            }}
                          >
                            Details
                          </Button>
                          <Button
                            className="btn-green px-3 py-2 text-xs"
                            onClick={() => {
                              setSelectedDoctorId(doctor.id);
                              setEditMode(true);
                            }}
                          >
                            Editer
                          </Button>
                          <Button
                            variant="outline"
                            className="px-3 py-2 text-xs"
                            onClick={() => handleDeleteDoctor(doctor.id)}
                            disabled={deletingId === doctor.id}
                          >
                            {deletingId === doctor.id ? 'Suppression...' : 'Supprimer'}
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

      {selectedDoctor && (
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mt-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h3 className="text-xl font-semibold text-[#0A2540]">Details medecin</h3>
              <p className="text-sm text-[#64748B]">Dr {selectedDoctor.name}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="px-4 py-2"
                onClick={() => setEditMode((prev) => !prev)}
              >
                {editMode ? 'Annuler' : 'Modifier'}
              </Button>
            </div>
          </div>

          {editMode ? (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[#0A2540]">Nom complet</label>
                <input
                  type="text"
                  className="input-santia"
                  value={editForm.name}
                  onChange={(event) => handleEditChange('name', event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[#0A2540]">Email</label>
                <input
                  type="email"
                  className="input-santia"
                  value={editForm.email}
                  onChange={(event) => handleEditChange('email', event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[#0A2540]">Telephone</label>
                <input
                  type="text"
                  className="input-santia"
                  value={editForm.phone}
                  onChange={(event) => handleEditChange('phone', event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[#0A2540]">Specialite</label>
                <input
                  type="text"
                  className="input-santia"
                  value={editForm.specialty}
                  onChange={(event) => handleEditChange('specialty', event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[#0A2540]">Categorie</label>
                <select
                  className="input-santia"
                  value={editForm.category}
                  onChange={(event) => handleEditChange('category', event.target.value)}
                >
                  {doctorCategories.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[#0A2540]">ID OpenEMR</label>
                <input
                  type="text"
                  className="input-santia"
                  value={editForm.openemr_provider_id}
                  onChange={(event) => handleEditChange('openemr_provider_id', event.target.value)}
                />
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-3">
                <Button
                  className="btn-green px-6 py-3"
                  onClick={handleUpdateDoctor}
                  disabled={savingId === selectedDoctor.id}
                >
                  {savingId === selectedDoctor.id ? 'Sauvegarde...' : 'Enregistrer'}
                </Button>
                <Button variant="outline" className="px-6 py-3" onClick={() => setEditMode(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4 text-sm text-[#64748B]">
              <div>
                <p className="text-xs uppercase text-[#94A3B8] mb-1">Contact</p>
                <p className="font-semibold text-[#0A2540]">{selectedDoctor.email}</p>
                <p>{selectedDoctor.phone}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-[#94A3B8] mb-1">Specialite</p>
                <p className="font-semibold text-[#0A2540]">{selectedDoctor.specialty}</p>
                <p>{categoryLabels[selectedDoctor.category] || selectedDoctor.category}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-[#94A3B8] mb-1">OpenIM</p>
                <p>{selectedDoctor.openim_user_id ? 'Actif' : 'Non lie'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-[#94A3B8] mb-1">OpenEMR</p>
                <p>{selectedDoctor.openemr_provider_id || '—'}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDoctors;
