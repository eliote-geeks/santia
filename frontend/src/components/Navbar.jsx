import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Menu, X } from 'lucide-react';
import { clearAuth, getToken, getUser } from '../lib/auth';
import { NotificationBell } from './NotificationBell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './ui/dropdown-menu';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthed = !!getToken();
  const user = getUser();
  const isAdmin = user?.role === 'admin';
  const showBack = location.pathname !== '/';

  const isActive = (path) => location.pathname === path;
  const handleLogout = () => {
    clearAuth();
    setIsOpen(false);
    navigate('/');
  };
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-header border-b border-slate-100" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center gap-3" data-testid="navbar-brand">
            {showBack && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-[#0A2540] hover:border-[#2ECC71] hover:text-[#2ECC71] transition-colors duration-200"
                aria-label="Retour"
                data-testid="nav-back"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-medium">Retour</span>
              </button>
            )}
            <Link to="/" className="flex items-center" data-testid="navbar-logo">
              <div className="bg-[#0A2540] rounded-2xl h-16 w-24 flex items-center justify-center">
                <img
                  src="/images/logo_rm_transparent.png"
                  alt="Santia Logo"
                  className="h-12 md:h-14 w-auto"
                />
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
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
          </div>

          {/* CTA Button */}
          <div className="hidden md:flex items-center gap-4">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 text-sm font-medium text-[#0A2540] px-3 py-2 rounded-xl border border-slate-200 hover:border-[#2ECC71] hover:text-[#2ECC71] transition-colors duration-200"
                >
                  Menu
                  <ChevronDown className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {isAuthed ? (
                  <>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to={isAdmin ? '/admin' : '/dossier'}>
                        {isAdmin ? 'Administration' : 'Mon dossier'}
                      </Link>
                    </DropdownMenuItem>
                    {!isAdmin && (
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link to="/messagerie">Messagerie</Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={handleLogout}
                      className="cursor-pointer text-red-600 focus:text-red-600"
                    >
                      Se deconnecter
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to="/login">Se connecter</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to="/register">Creer un compte</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/#faq">FAQ</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <a href="tel:+237657817198">Appeler +237 6 57 81 71 98</a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link
              to="/consultation"
              className="btn-primary text-sm py-3 px-6"
              data-testid="nav-cta-consultation"
            >
              Commencer
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <NotificationBell className="h-9 w-9" iconClassName="w-4 h-4" />
            <button 
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors duration-200"
              onClick={() => setIsOpen(!isOpen)}
              data-testid="mobile-menu-toggle"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-6 h-6 text-[#0A2540]" /> : <Menu className="w-6 h-6 text-[#0A2540]" />}
            </button>
          </div>
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
