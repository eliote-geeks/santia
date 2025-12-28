import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Phone } from 'lucide-react';
import { getToken } from '../lib/auth';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isAuthed = !!getToken();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-header border-b border-slate-100" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3" data-testid="navbar-logo">
            <div className="w-10 h-10 bg-[#2ECC71] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl font-['Poppins']">S</span>
            </div>
            <div>
              <span className="text-xl font-bold text-[#0A2540] font-['Poppins']">Santia</span>
              <p className="text-xs text-[#64748B] hidden sm:block">Consultation médicale en ligne</p>
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
            <a 
              href="#specialites" 
              className="text-sm font-medium text-[#0A2540] hover:text-[#2ECC71] transition-colors duration-200"
              data-testid="nav-specialites"
            >
              Spécialités
            </a>
            <a 
              href="#comment-ca-marche" 
              className="text-sm font-medium text-[#0A2540] hover:text-[#2ECC71] transition-colors duration-200"
              data-testid="nav-how-it-works"
            >
              Comment ça marche
            </a>
            <a 
              href="#faq" 
              className="text-sm font-medium text-[#0A2540] hover:text-[#2ECC71] transition-colors duration-200"
              data-testid="nav-faq"
            >
              FAQ
            </a>
            <Link
              to={isAuthed ? "/dossier" : "/login"}
              className={`text-sm font-medium transition-colors duration-200 ${
                isActive('/login') || isActive('/dossier') ? 'text-[#2ECC71]' : 'text-[#0A2540] hover:text-[#2ECC71]'
              }`}
            >
              Espace patient
            </Link>
            {isAuthed && (
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
            <a href="tel:+237600000000" className="flex items-center gap-2 text-sm text-[#64748B] hover:text-[#0A2540] transition-colors duration-200">
              <Phone className="w-4 h-4" />
              <span>+237 6 00 00 00 00</span>
            </a>
            <Link 
              to="/consultation" 
              className="btn-primary text-sm py-3 px-6"
              data-testid="nav-cta-consultation"
            >
              Commencer
            </Link>
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
            <a 
              href="#specialites" 
              className="block py-3 text-lg font-medium text-[#0A2540]"
              onClick={() => setIsOpen(false)}
            >
              Spécialités
            </a>
            <a 
              href="#comment-ca-marche" 
              className="block py-3 text-lg font-medium text-[#0A2540]"
              onClick={() => setIsOpen(false)}
            >
              Comment ça marche
            </a>
            <a 
              href="#faq" 
              className="block py-3 text-lg font-medium text-[#0A2540]"
              onClick={() => setIsOpen(false)}
            >
              FAQ
            </a>
            <Link
              to={isAuthed ? "/dossier" : "/login"}
              className="block py-3 text-lg font-medium text-[#0A2540]"
              onClick={() => setIsOpen(false)}
            >
              Espace patient
            </Link>
            {isAuthed && (
              <Link
                to="/messagerie"
                className="block py-3 text-lg font-medium text-[#0A2540]"
                onClick={() => setIsOpen(false)}
              >
                Messagerie
              </Link>
            )}
            <div className="pt-4 border-t border-slate-100">
              <Link 
                to="/consultation" 
                className="block w-full text-center btn-primary py-4"
                onClick={() => setIsOpen(false)}
              >
                Commencer une consultation
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
