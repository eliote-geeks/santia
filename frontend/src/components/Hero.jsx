import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Clock, Users } from 'lucide-react';

export const Hero = () => {
  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden" data-testid="hero-section">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 right-0 w-96 h-96 bg-[#2ECC71]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#0A2540]/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#2ECC71]/10 rounded-full mb-6 animate-fade-in-up">
              <span className="w-2 h-2 bg-[#2ECC71] rounded-full animate-pulse-soft"></span>
              <span className="text-sm font-medium text-[#0A2540]">Disponible 24h/24</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0A2540] leading-tight mb-6 animate-fade-in-up stagger-1" data-testid="hero-title">
              Votre médecin,
              <br />
              <span className="text-[#2ECC71]">dans votre poche.</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-[#64748B] mb-8 max-w-lg animate-fade-in-up stagger-2" data-testid="hero-subtitle">
              Consultation médicale en ligne au Cameroun. Parlez à un médecin certifié en toute confidentialité, où que vous soyez.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12 animate-fade-in-up stagger-3">
              <a 
                href="#specialites" 
                className="btn-primary inline-flex items-center justify-center gap-2 text-lg py-5 px-8"
                data-testid="hero-cta-primary"
              >
                Choisir une pathologie
                <ArrowRight className="w-5 h-5" />
              </a>
              <Link 
                to="/consultation" 
                className="btn-secondary inline-flex items-center justify-center text-lg py-5 px-8"
                data-testid="hero-cta-secondary"
              >
                Démarrer la consultation
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-6 animate-fade-in-up stagger-4" data-testid="trust-badges">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-[#0A2540]/5 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[#2ECC71]" />
                </div>
                <span className="text-sm font-medium text-[#0A2540]">100% Confidentiel</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-[#0A2540]/5 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#2ECC71]" />
                </div>
                <span className="text-sm font-medium text-[#0A2540]">Médecins Agréés</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-[#0A2540]/5 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#2ECC71]" />
                </div>
                <span className="text-sm font-medium text-[#0A2540]">Réponse rapide</span>
              </div>
            </div>
          </div>

          {/* Right Content - Image */}
          <div className="relative animate-fade-in-up stagger-3" data-testid="hero-image-container">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1582895361887-24daa40c8667?crop=entropy&cs=srgb&fm=jpg&q=85&w=800" 
                alt="Médecin professionnel souriant"
                className="w-full h-auto object-cover aspect-[4/3]"
                data-testid="hero-image"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A2540]/20 to-transparent"></div>
            </div>
            
            {/* Floating card */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-4 animate-fade-in-up stagger-5" data-testid="floating-card">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#2ECC71] rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">+</span>
                </div>
                <div>
                  <p className="font-bold text-[#0A2540]">5000+</p>
                  <p className="text-sm text-[#64748B]">Consultations réussies</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
