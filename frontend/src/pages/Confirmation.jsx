import { Link, useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { CheckCircle2, ArrowRight, Phone, Clock, MessageSquare, FileText } from 'lucide-react';
import { Button } from '../components/ui/button';

export const Confirmation = () => {
  const location = useLocation();
  const intakeId = location.state?.intakeId || localStorage.getItem('santia_intake_id');
  const dossierPath = intakeId ? `/dossier/${intakeId}` : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="confirmation-page">
      <Navbar />
      
      <main className="pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          {/* Success Card */}
          <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 text-center animate-fade-in-up" data-testid="confirmation-card">
            {/* Success Icon */}
            <div className="w-20 h-20 bg-[#2ECC71] rounded-full flex items-center justify-center mx-auto mb-6 animate-fade-in-up stagger-1">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-[#0A2540] mb-4 animate-fade-in-up stagger-2" data-testid="confirmation-title">
              Merci !
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-[#64748B] mb-8 animate-fade-in-up stagger-3" data-testid="confirmation-subtitle">
              Votre demande de consultation a bien été enregistrée. Un médecin va analyser votre dossier et vous contacter très prochainement.
            </p>

            {/* Info Cards */}
            <div className="grid sm:grid-cols-3 gap-4 mb-8 animate-fade-in-up stagger-4" data-testid="info-cards">
              <div className="bg-[#F8FAFC] rounded-xl p-4">
                <div className="w-10 h-10 bg-[#2ECC71]/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-5 h-5 text-[#2ECC71]" />
                </div>
                <h3 className="font-semibold text-[#0A2540] text-sm mb-1">Délai de réponse</h3>
                <p className="text-xs text-[#64748B]">Sous 15 minutes</p>
              </div>

              <div className="bg-[#F8FAFC] rounded-xl p-4">
                <div className="w-10 h-10 bg-[#2ECC71]/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Phone className="w-5 h-5 text-[#2ECC71]" />
                </div>
                <h3 className="font-semibold text-[#0A2540] text-sm mb-1">Contact</h3>
                <p className="text-xs text-[#64748B]">Appel ou WhatsApp</p>
              </div>

              <div className="bg-[#F8FAFC] rounded-xl p-4">
                <div className="w-10 h-10 bg-[#2ECC71]/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-5 h-5 text-[#2ECC71]" />
                </div>
                <h3 className="font-semibold text-[#0A2540] text-sm mb-1">Suivi</h3>
                <p className="text-xs text-[#64748B]">Par email si besoin</p>
              </div>
            </div>

            {/* Patient Profile Link */}
            {dossierPath && (
              <div className="bg-[#0A2540]/5 border border-[#0A2540]/10 rounded-2xl p-5 mb-8 animate-fade-in-up stagger-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0A2540]/10 rounded-full flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[#0A2540]" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-[#64748B]">Votre dossier patient</p>
                      <p className="text-sm font-medium text-[#0A2540]">Suivez le statut et le lien de consultation</p>
                    </div>
                  </div>
                  <Link to={dossierPath} data-testid="profile-link">
                    <Button className="btn-green px-6 py-3">Voir mon dossier</Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Image */}
            <div className="rounded-2xl overflow-hidden mb-8 animate-fade-in-up stagger-5" data-testid="confirmation-image">
              <img 
                src="https://images.unsplash.com/photo-1627130595904-ebeeb6540a93?crop=entropy&cs=srgb&fm=jpg&q=85&w=800" 
                alt="Patient heureux"
                className="w-full h-48 object-cover"
              />
            </div>

            {/* CTA Button */}
            <Link to="/" data-testid="back-to-home-button">
              <Button className="btn-primary inline-flex items-center gap-2">
                Retour à l'accueil
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {/* Additional Info */}
          <div className="mt-8 text-center animate-fade-in-up stagger-6" data-testid="additional-info">
            <p className="text-[#64748B] text-sm">
              Des questions ? Contactez-nous à{' '}
              <a href="mailto:contact@santia.cm" className="text-[#2ECC71] hover:underline">
                contact@santia.cm
              </a>{' '}
              ou appelez le{' '}
              <a href="tel:+237600000000" className="text-[#2ECC71] hover:underline">
                +237 6 00 00 00 00
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Confirmation;
