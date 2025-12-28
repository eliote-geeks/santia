import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { setAuth, setOpenIM } from '../lib/auth';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: ''
  });
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
      const response = await axios.post(`${API_URL}/api/auth/register`, formData);
      setAuth(response.data.access_token, response.data.user);
      setOpenIM(response.data.openim);
      navigate('/dossier');
    } catch (err) {
      setError('Impossible de creer le compte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      <main className="pt-24 pb-16 md:pt-28 md:pb-24">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-3xl shadow-xl p-8 md:p-10">
            <h1 className="text-3xl font-bold text-[#0A2540] mb-2">Creer un compte</h1>
            <p className="text-sm text-[#64748B] mb-8">Accedez a votre espace patient et suivez vos consultations.</p>

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
                <Label htmlFor="phone" className="text-[#0A2540] font-medium mb-2 block">Telephone</Label>
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
                  placeholder="Minimum 6 caracteres"
                  required
                />
              </div>
              <Button type="submit" className="btn-green w-full" disabled={loading}>
                {loading ? 'Creation...' : 'Creer mon compte'}
              </Button>
            </form>

            <p className="text-sm text-[#64748B] mt-6 text-center">
              Vous avez deja un compte ?{' '}
              <Link to="/login" className="text-[#2ECC71] hover:underline">Se connecter</Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Register;
