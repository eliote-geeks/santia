import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Phone } from 'lucide-react';
import { clearAuth, getToken, getUser } from '../lib/auth';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthed = !!getToken();
  const user = getUser();
  const isAdmin = user?.role === 'admin';

  const isActive = (path) => location.pathname === path;
  const handleLogout = () => {
    clearAuth();
    setIsOpen(false);
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-header border-b border-slate-100" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center" data-testid="navbar-logo">
            <div className="bg-[#0A2540] rounded-xl px-4 py-2">
              <img
                src="/images/logo_rm_transparent.png"
                alt="Santia Logo"
                className="h-12 w-auto"
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link 
              to="/" 
              className={`text-sm font-medium transition-colors duration-200 ${
                isActive('/') ? 'text-[#2ECC71]' : 'text-[#0A2540] hover:text-[#2ECC71]'
              }`}
              data-testid="nav-home"
            >
              Accueil
            </Link>
            <Link
              to="/#specialites"
              className="text-sm font-medium text-[#0A2540] hover:text-[#2ECC71] transition-colors duration-200"
              data-testid="nav-specialites"
            >
              Spécialités
            </Link>
            <Link
              to="/#comment-ca-marche"
              className="text-sm font-medium text-[#0A2540] hover:text-[#2ECC71] transition-colors duration-200"
              data-testid="nav-how-it-works"
            >
              Comment ça marche
            </Link>
            <Link
              to="/#faq"
              className="text-sm font-medium text-[#0A2540] hover:text-[#2ECC71] transition-colors duration-200"
              data-testid="nav-faq"
            >
              FAQ
            </Link>
            {isAuthed && !isAdmin && (
              <Link
                to="/dossier"
                className={`text-sm font-medium transition-colors duration-200 ${
                  isActive('/dossier') ? 'text-[#2ECC71]' : 'text-[#0A2540] hover:text-[#2ECC71]'
                }`}
              >
                Mon dossier
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                className={`text-sm font-medium transition-colors duration-200 ${
                  isActive('/admin') ? 'text-[#2ECC71]' : 'text-[#0A2540] hover:text-[#2ECC71]'
                }`}
              >
                Administration
              </Link>
            )}
            {isAuthed && !isAdmin && (
              <Link
                to="/messagerie"
                className={`text-sm font-medium transition-colors duration-200 ${
                  isActive('/messagerie') ? 'text-[#2ECC71]' : 'text-[#0A2540] hover:text-[#2ECC71]'
                }`}
              >
                Messagerie
              </Link>
            )}
          </div>

          {/* CTA Button */}
          <div className="hidden md:flex items-center gap-4">
            <a href="tel:+237657817198" className="flex items-center gap-2 text-sm text-[#64748B] hover:text-[#0A2540] transition-colors duration-200">
              <Phone className="w-4 h-4" />
              <span>+237 6 57 81 71 98</span>
            </a>
            {isAuthed ? (
              <>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-sm font-medium text-[#0A2540] hover:text-[#2ECC71] transition-colors duration-200"
                >
                  Se deconnecter
                </button>
                <Link
                  to="/consultation"
                  className="btn-primary text-sm py-3 px-6"
                  data-testid="nav-cta-consultation"
                >
                  Commencer
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-[#0A2540] hover:text-[#2ECC71] transition-colors duration-200"
                >
                  Se connecter
                </Link>
                <Link
                  to="/register"
                  className="btn-green text-sm py-3 px-6"
                >
                  Creer un compte
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors duration-200"
            onClick={() => setIsOpen(!isOpen)}
            data-testid="mobile-menu-toggle"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6 text-[#0A2540]" /> : <Menu className="w-6 h-6 text-[#0A2540]" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 animate-fade-in" data-testid="mobile-menu">
          <div className="px-4 py-6 space-y-4">
            <Link 
              to="/" 
              className="block py-3 text-lg font-medium text-[#0A2540]"
              onClick={() => setIsOpen(false)}
            >
              Accueil
            </Link>
            <Link
              to="/#specialites"
              className="block py-3 text-lg font-medium text-[#0A2540]"
              onClick={() => setIsOpen(false)}
            >
              Spécialités
            </Link>
            <Link
              to="/#comment-ca-marche"
              className="block py-3 text-lg font-medium text-[#0A2540]"
              onClick={() => setIsOpen(false)}
            >
              Comment ça marche
            </Link>
            <Link
              to="/#faq"
              className="block py-3 text-lg font-medium text-[#0A2540]"
              onClick={() => setIsOpen(false)}
            >
              FAQ
            </Link>
            {isAuthed ? (
              <>
                {!isAdmin && (
                  <Link
                    to="/dossier"
                    className="block py-3 text-lg font-medium text-[#0A2540]"
                    onClick={() => setIsOpen(false)}
                  >
                    Mon dossier
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="block py-3 text-lg font-medium text-[#0A2540]"
                    onClick={() => setIsOpen(false)}
                  >
                    Administration
                  </Link>
                )}
                {!isAdmin && (
                  <Link
                    to="/messagerie"
                    className="block py-3 text-lg font-medium text-[#0A2540]"
                    onClick={() => setIsOpen(false)}
                  >
                    Messagerie
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full text-left py-3 text-lg font-medium text-[#0A2540]"
                >
                  Se deconnecter
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block py-3 text-lg font-medium text-[#0A2540]"
                  onClick={() => setIsOpen(false)}
                >
                  Se connecter
                </Link>
                <Link
                  to="/register"
                  className="block py-3 text-lg font-medium text-[#0A2540]"
                  onClick={() => setIsOpen(false)}
                >
                  Creer un compte
                </Link>
              </>
            )}
            <div className="pt-4 border-t border-slate-100">
              {isAuthed ? (
                <Link
                  to="/consultation"
                  className="block w-full text-center btn-primary py-4"
                  onClick={() => setIsOpen(false)}
                >
                  Commencer une consultation
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="block w-full text-center btn-primary py-4"
                  onClick={() => setIsOpen(false)}
                >
                  Creer un compte
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
