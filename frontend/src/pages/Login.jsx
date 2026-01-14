import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { setAuth, setOpenIM } from '../lib/auth';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const nextPath = params.get('next');

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, formData);
      setAuth(response.data.access_token, response.data.user);
      setOpenIM(response.data.openim);
      const fallback = response.data.user?.role === 'admin' ? '/admin' : '/dossier';
      navigate(nextPath || fallback, { state: { welcome: 'login' } });
    } catch (err) {
      setError('Identifiants invalides.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      <main className="pt-24 pb-16 md:pt-28 md:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Left side - Image */}
            <div className="hidden lg:block">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl h-[600px]">
                <img
                  src="/images/auth-doctor.jpg"
                  alt="Consultation médicale au Cameroun"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A2540]/90 via-[#0A2540]/50 to-transparent">
                  <div className="absolute bottom-0 left-0 right-0 p-10 text-white">
                    <h2 className="text-4xl font-bold mb-4 text-white">
                      Santé accessible pour tous les Camerounais
                    </h2>
                    <p className="text-lg text-gray-200 mb-6">
                      Consultez des médecins qualifiés depuis chez vous.
                      Disponible dans toutes les régions du Cameroun.
                    </p>
                    <div className="flex items-center gap-8">
                      <div>
                        <div className="text-3xl font-bold text-white">24/7</div>
                        <div className="text-sm text-gray-200">Disponibilité</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-white">950+</div>
                        <div className="text-sm text-gray-200">Médecins</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-white">60K+</div>
                        <div className="text-sm text-gray-200">Consultations</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Form */}
            <div className="w-full max-w-xl mx-auto lg:mx-0">
              <div className="bg-white rounded-3xl shadow-xl p-8 md:p-10">
                <h1 className="text-3xl font-bold text-[#0A2540] mb-2">Connexion patient</h1>
                <p className="text-sm text-[#64748B] mb-8">Accédez à votre dossier et au suivi de votre consultation.</p>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-6">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <Label htmlFor="email" className="text-[#0A2540] font-medium mb-2 block">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(event) => handleChange('email', event.target.value)}
                      className="input-santia"
                      placeholder="vous@exemple.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-[#0A2540] font-medium mb-2 block">Mot de passe</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(event) => handleChange('password', event.target.value)}
                      className="input-santia"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <Button type="submit" className="btn-green w-full" disabled={loading}>
                    {loading ? 'Connexion...' : 'Se connecter'}
                  </Button>
                </form>

                <p className="text-sm text-[#64748B] mt-6 text-center">
                  Pas encore de compte ?{' '}
                  <Link to="/register" className="text-[#2ECC71] hover:underline">Créer un compte</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Login;
