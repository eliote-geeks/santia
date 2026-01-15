import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { setAuth, setOpenIM } from '../lib/auth';
import { toast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (formData.password !== formData.confirm_password) {
      setError('Les mots de passe ne correspondent pas.');
      toast({
        title: 'Mot de passe invalide',
        description: 'Les mots de passe ne correspondent pas.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        password: formData.password
      };
      const response = await axios.post(`${API_URL}/api/auth/register`, payload);
      setAuth(response.data.access_token, response.data.user);
      setOpenIM(response.data.openim);
      toast({
        title: 'Compte cree',
        description: 'Bienvenue sur Santia.',
      });
      navigate('/dossier', { state: { welcome: 'register' } });
    } catch (err) {
      setError('Impossible de creer le compte.');
      toast({
        title: 'Inscription echouee',
        description: 'Impossible de creer le compte.',
        variant: 'destructive',
      });
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
                  src="/images/auth-patient.jpg"
                  alt="Patient utilisant la télémédecine au Cameroun"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A2540]/90 via-[#0A2540]/50 to-transparent">
                  <div className="absolute bottom-0 left-0 right-0 p-10 text-white">
                    <h2 className="text-4xl font-bold mb-4 text-white">
                      Rejoignez Santia aujourd'hui
                    </h2>
                    <p className="text-lg text-gray-200 mb-6">
                      Créez votre compte et accédez à des soins de santé de qualité, où que vous soyez au Cameroun.
                    </p>
                    <div className="flex items-center gap-8">
                      <div>
                        <div className="text-3xl font-bold text-white">Simple</div>
                        <div className="text-sm text-gray-200">Inscription rapide</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-white">Sécurisé</div>
                        <div className="text-sm text-gray-200">Données protégées</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-white">24/7</div>
                        <div className="text-sm text-gray-200">Toujours disponible</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Form */}
            <div className="w-full max-w-xl mx-auto lg:mx-0">
              <div className="bg-white rounded-3xl shadow-xl p-8 md:p-10">
                <h1 className="text-3xl font-bold text-[#0A2540] mb-2">Créer un compte</h1>
                <p className="text-sm text-[#64748B] mb-8">Accédez à votre dossier et suivez vos consultations.</p>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-6">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <Label htmlFor="name" className="text-[#0A2540] font-medium mb-2 block">Nom complet</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(event) => handleChange('name', event.target.value)}
                      className="input-santia"
                      placeholder="Brice Ngassa"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-[#0A2540] font-medium mb-2 block">Téléphone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(event) => handleChange('phone', event.target.value)}
                      className="input-santia"
                      placeholder="+237 6XX XXX XXX"
                      required
                    />
                  </div>
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
                      placeholder="Minimum 6 caractères"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm-password" className="text-[#0A2540] font-medium mb-2 block">Confirmer le mot de passe</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={formData.confirm_password}
                      onChange={(event) => handleChange('confirm_password', event.target.value)}
                      className="input-santia"
                      placeholder="Répétez le mot de passe"
                      required
                    />
                  </div>
                  <Button type="submit" className="btn-green w-full" disabled={loading}>
                    {loading ? 'Création...' : 'Créer mon compte'}
                  </Button>
                </form>

                <p className="text-sm text-[#64748B] mt-6 text-center">
                  Vous avez déjà un compte ?{' '}
                  <Link to="/login" className="text-[#2ECC71] hover:underline">Se connecter</Link>
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

export default Register;
