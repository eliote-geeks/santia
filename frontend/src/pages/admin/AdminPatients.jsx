import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ChevronDown, ChevronUp, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { DataTableToolbar } from '../../components/DataTableToolbar';
import { Pagination } from '../../components/Pagination';
import { authHeaders, getToken, getUser } from '../../lib/auth';
import { AdminLayout } from './AdminLayout';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const formatDateTime = (value) => {
  if (!value) return '—';
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

const copyToClipboard = async (value) => {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch (error) {
    // ignore
  }
};

export const AdminPatients = () => {
  const [patients, setPatients] = useState([]);
  const [patientLoading, setPatientLoading] = useState(true);
  const [patientError, setPatientError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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
      return;
    }
    if (user?.role !== 'admin') {
      setPatientError('Acces reserve a l administration.');
      return;
    }
    loadPatients();
  }, []);

  const filteredPatients = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return patients;
    return patients.filter((patient) =>
      [patient.name, patient.email, patient.phone, patient.id]
        .filter(Boolean)
        .some((value) => value.toString().toLowerCase().includes(term))
    );
  }, [patients, query]);

  const sortedPatients = useMemo(() => {
    const getValue = (patient) => {
      switch (sortKey) {
        case 'name':
          return patient.name || '';
        case 'email':
          return patient.email || '';
        case 'phone':
          return patient.phone || '';
        case 'created_at':
        default:
          return patient.created_at || '';
      }
    };
    return [...filteredPatients].sort((a, b) => {
      const aVal = getValue(a);
      const bVal = getValue(b);
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredPatients, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedPatients.length / pageSize));
  const paginatedPatients = useMemo(
    () => sortedPatients.slice((page - 1) * pageSize, page * pageSize),
    [sortedPatients, page, pageSize]
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [query, pageSize]);

  return (
    <AdminLayout
      title="Patients inscrits"
      subtitle="Consultez les profils patients et leurs informations."
      actions={(
        <Button onClick={loadPatients} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Rafraichir
        </Button>
      )}
    >
      {patientError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700">
          {patientError}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
        <h2 className="text-xl font-semibold text-[#0A2540] mb-4">Liste des patients</h2>
        {patientLoading ? (
          <div className="flex items-center gap-2 text-sm text-[#64748B]">
            <Loader2 className="w-4 h-4 animate-spin text-[#2ECC71]" />
            Chargement des patients...
          </div>
        ) : (
          <>
            <DataTableToolbar
              query={query}
              onQueryChange={setQuery}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              totalCount={sortedPatients.length}
              label="patients"
            />
            <div className="overflow-auto border border-slate-200 rounded-2xl">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-[#0A2540]">
                  <tr>
                    <th className="text-left px-4 py-3">
                      <SortButton columnKey="name" label="Patient" />
                    </th>
                    <th className="text-left px-4 py-3">
                      <SortButton columnKey="email" label="Email" />
                    </th>
                    <th className="text-left px-4 py-3">
                      <SortButton columnKey="phone" label="Telephone" />
                    </th>
                    <th className="text-left px-4 py-3">
                      <SortButton columnKey="created_at" label="Inscription" />
                    </th>
                    <th className="text-left px-4 py-3 font-semibold">OpenIM</th>
                    <th className="text-left px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPatients.map((patient) => (
                    <tr key={patient.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#0A2540]">{patient.name}</div>
                      </td>
                      <td className="px-4 py-3 text-[#64748B]">{patient.email}</td>
                      <td className="px-4 py-3 text-[#64748B]">{patient.phone}</td>
                      <td className="px-4 py-3 text-xs text-[#64748B]">{formatDateTime(patient.created_at)}</td>
                      <td className="px-4 py-3 text-xs text-[#64748B]">
                        {patient.openim_user_id ? 'Actif' : 'Non lie'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" className="px-3 py-2 text-xs" onClick={() => copyToClipboard(patient.email)}>
                            Copier email
                          </Button>
                          <Button variant="outline" className="px-3 py-2 text-xs" onClick={() => copyToClipboard(patient.phone)}>
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

export default AdminPatients;
