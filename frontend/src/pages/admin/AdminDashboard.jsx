import { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart3, Calendar, CreditCard, Loader2, TrendingUp, Users } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { authHeaders, getToken, getUser } from '../../lib/auth';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const formatMoney = (value) => {
  if (value === null || value === undefined) return '0';
  const amount = Number(value);
  if (Number.isNaN(amount)) return value;
  return new Intl.NumberFormat('fr-FR').format(amount);
};

export const AdminDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/api/admin/metrics`, { headers: authHeaders() });
      setMetrics(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Veuillez vous connecter pour acceder a l administration.');
      } else if (err.response?.status === 403) {
        setError('Acces reserve a l administration.');
      } else {
        setError('Impossible de charger les statistiques.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (!token) return;
    if (user?.role !== 'admin') {
      setError('Acces reserve a l administration.');
      return;
    }
    loadMetrics();
  }, []);

  return (
    <AdminLayout
      title="Dashboard Santia"
      subtitle="Suivi des paiements et des performances de la plateforme."
      actions={(
        <button
          type="button"
          onClick={loadMetrics}
          className="text-sm font-medium text-[#0A2540] border border-slate-200 rounded-xl px-4 py-2 hover:border-[#2ECC71]"
        >
          Rafraichir
        </button>
      )}
    >
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[#64748B]">
          <Loader2 className="w-4 h-4 animate-spin text-[#2ECC71]" />
          Chargement du dashboard...
        </div>
      ) : metrics ? (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-2xl p-5 shadow border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-[#2ECC71]" />
                </div>
                <div>
                  <p className="text-xs text-[#64748B]">Paiements confirmes</p>
                  <p className="text-lg font-bold text-[#0A2540]">{formatMoney(metrics.payments.confirmed_amount)} FCFA</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-[#64748B]">Paiements en attente</p>
                  <p className="text-lg font-bold text-[#0A2540]">{metrics.payments.pending}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[#0A2540]" />
                </div>
                <div>
                  <p className="text-xs text-[#64748B]">Consultations</p>
                  <p className="text-lg font-bold text-[#0A2540]">{metrics.totals.requests}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-[#64748B]">Patients inscrits</p>
                  <p className="text-lg font-bold text-[#0A2540]">{metrics.totals.patients}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow border border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-[#2ECC71]" />
                <h3 className="text-lg font-semibold text-[#0A2540]">Statuts consultations</h3>
              </div>
              <div className="space-y-3 text-sm text-[#64748B]">
                <div className="flex items-center justify-between">
                  <span>En attente</span>
                  <span className="font-semibold text-[#0A2540]">{metrics.statuses.pending || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Planifiees</span>
                  <span className="font-semibold text-[#0A2540]">{metrics.statuses.scheduled || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Terminees</span>
                  <span className="font-semibold text-[#0A2540]">{metrics.statuses.done || 0}</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow border border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-[#2ECC71]" />
                <h3 className="text-lg font-semibold text-[#0A2540]">Types de consultation</h3>
              </div>
              <div className="space-y-3 text-sm text-[#64748B]">
                <div className="flex items-center justify-between">
                  <span>Standard</span>
                  <span className="font-semibold text-[#0A2540]">{metrics.types.standard || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Express</span>
                  <span className="font-semibold text-[#0A2540]">{metrics.types.express || 0}</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow border border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-[#2ECC71]" />
                <h3 className="text-lg font-semibold text-[#0A2540]">Activite recente</h3>
              </div>
              <div className="space-y-3 text-sm text-[#64748B]">
                <div className="flex items-center justify-between">
                  <span>7 derniers jours</span>
                  <span className="font-semibold text-[#0A2540]">{metrics.recent.last7 || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>30 derniers jours</span>
                  <span className="font-semibold text-[#0A2540]">{metrics.recent.last30 || 0}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow border border-slate-100">
              <h3 className="text-lg font-semibold text-[#0A2540] mb-4">Top categories</h3>
              <div className="space-y-3 text-sm text-[#64748B]">
                {(metrics.categories || []).map((item) => (
                  <div key={item.category} className="flex items-center justify-between">
                    <span>{item.category}</span>
                    <span className="font-semibold text-[#0A2540]">{item.count}</span>
                  </div>
                ))}
                {(!metrics.categories || metrics.categories.length === 0) && (
                  <p className="text-sm text-[#94A3B8]">Aucune donnee disponible.</p>
                )}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow border border-slate-100">
              <h3 className="text-lg font-semibold text-[#0A2540] mb-4">Top medecins assigns</h3>
              <div className="space-y-3 text-sm text-[#64748B]">
                {(metrics.doctors || []).map((item) => (
                  <div key={item.doctor_id} className="flex items-center justify-between">
                    <span>{item.doctor_name}</span>
                    <span className="font-semibold text-[#0A2540]">{item.count}</span>
                  </div>
                ))}
                {(!metrics.doctors || metrics.doctors.length === 0) && (
                  <p className="text-sm text-[#94A3B8]">Aucune donnee disponible.</p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </AdminLayout>
  );
};

export default AdminDashboard;
