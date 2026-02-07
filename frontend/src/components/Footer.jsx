import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-[#0A2540] text-white" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="mb-4">
              <img
                src="/images/logo_santia.png"
                alt="Santia Logo"
                className="h-16 w-auto"
              />
            </div>
            <p className="text-white/70 mb-4">
              Consultation médicale en ligne au Cameroun. La santé en confiance.
            </p>
            <div className="flex items-center gap-2 text-white/70">
              <MapPin className="w-4 h-4" />
              <span>Douala, Cameroun</span>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-bold text-lg mb-4">Navigation</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-white/70 hover:text-[#2ECC71] transition-colors duration-200">
                  Accueil
                </Link>
              </li>
              <li>
                <Link to="/#specialites" className="text-white/70 hover:text-[#2ECC71] transition-colors duration-200">
                  Spécialités
                </Link>
              </li>
              <li>
                <Link to="/#comment-ca-marche" className="text-white/70 hover:text-[#2ECC71] transition-colors duration-200">
                  Comment ça marche
                </Link>
              </li>
              <li>
                <Link to="/#faq" className="text-white/70 hover:text-[#2ECC71] transition-colors duration-200">
                  FAQ
                </Link>
              </li>
              <li>
                <a
                  href="/docs/USER_GUIDE.html"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/70 hover:text-[#2ECC71] transition-colors duration-200"
                >
                  Guide utilisateur
                </a>
              </li>
            </ul>
          </div>

          {/* Spécialités */}
          <div>
            <h4 className="font-bold text-lg mb-4">Spécialités</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/consultation?category=generale" className="text-white/70 hover:text-[#2ECC71] transition-colors duration-200">
                  Générale
                </Link>
              </li>
              <li>
                <Link to="/consultation?category=perte-de-poids" className="text-white/70 hover:text-[#2ECC71] transition-colors duration-200">
                  Perte de poids
                </Link>
              </li>
              <li>
                <Link to="/consultation?category=sante-sexuelle" className="text-white/70 hover:text-[#2ECC71] transition-colors duration-200">
                  Santé sexuelle
                </Link>
              </li>
              <li>
                <Link to="/consultation?category=addictions" className="text-white/70 hover:text-[#2ECC71] transition-colors duration-200">
                  Addictions
                </Link>
              </li>
              <li>
                <Link to="/consultation?category=sommeil" className="text-white/70 hover:text-[#2ECC71] transition-colors duration-200">
                  Sommeil & stress
                </Link>
              </li>
              <li>
                <Link to="/consultation?category=cheveux" className="text-white/70 hover:text-[#2ECC71] transition-colors duration-200">
                  Cheveux & peau
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-lg mb-4">Contact</h4>
            <ul className="space-y-3">
              <li>
                <a href="tel:+237657817198" className="flex items-center gap-2 text-white/70 hover:text-[#2ECC71] transition-colors duration-200">
                  <Phone className="w-4 h-4" />
                  <span>+237 6 57 81 71 98</span>
                </a>
              </li>
              <li>
                <a href="mailto:contact@santia.cm" className="flex items-center gap-2 text-white/70 hover:text-[#2ECC71] transition-colors duration-200">
                  <Mail className="w-4 h-4" />
                  <span>contact@santia.cm</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/50 text-sm">
              © {new Date().getFullYear()} Santia. Tous droits réservés. ·{' '}
              <a
                href="https://www.linkedin.com/in/paul-eliote-180015263"
                target="_blank"
                rel="noreferrer"
                className="text-white/60 hover:text-white transition-colors duration-200"
              >
                Made by Father Paul
              </a>
            </p>
            <div className="flex items-center gap-6">
              <a href="/docs/USER_GUIDE.html" target="_blank" rel="noreferrer" className="text-white/50 hover:text-white/70 text-sm transition-colors duration-200">
                Guide utilisateur
              </a>
              <a href="#" className="text-white/50 hover:text-white/70 text-sm transition-colors duration-200">
                Mentions légales
              </a>
              <a href="#" className="text-white/50 hover:text-white/70 text-sm transition-colors duration-200">
                Politique de confidentialité
              </a>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 p-4 bg-white/5 rounded-xl">
          <p className="text-white/50 text-sm text-center">
            Ce service ne remplace pas une consultation médicale en personne. En cas d'urgence vitale, 
            appelez le 112 ou rendez-vous aux urgences les plus proches.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
