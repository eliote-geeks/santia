import { NavLink } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';

const tabs = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/consultations', label: 'Consultations' },
  { to: '/admin/doctors', label: 'Medecins' },
  { to: '/admin/patients', label: 'Patients' }
];

export const AdminLayout = ({ title, subtitle, actions, children, notice }) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      <main className="pt-24 pb-16 md:pt-28 md:pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#0A2540]">{title}</h1>
              {subtitle && <p className="text-sm text-[#64748B]">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-2 flex flex-wrap gap-2 mb-6">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#0A2540] text-white'
                      : 'text-[#0A2540] hover:text-[#2ECC71]'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </div>

          {notice}
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminLayout;
