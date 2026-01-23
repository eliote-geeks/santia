import { Shield, UserCheck, Clock, Banknote, Lock, Award } from 'lucide-react';

const trustItems = [
  {
    icon: UserCheck,
    title: 'Médecins certifiés',
    description: 'Tous nos médecins sont agréés et exercent légalement au Cameroun.'
  },
  {
    icon: Lock,
    title: 'Confidentialité totale',
    description: 'Vos données sont protégées et vos échanges restent strictement privés.'
  },
  {
    icon: Clock,
    title: 'Réponse rapide',
    description: 'Un médecin analyse votre dossier et vous contacte sous 15 minutes.'
  },
  {
    icon: Banknote,
    title: 'Prix abordable',
    description: 'Consultations accessibles à partir de 5 000 FCFA.'
  },
  {
    icon: Shield,
    title: 'Sécurité garantie',
    description: 'Plateforme sécurisée avec chiffrement de bout en bout.'
  },
  {
    icon: Award,
    title: 'Qualité de soins',
    description: 'Suivi personnalisé et recommandations adaptées à votre situation.'
  }
];

export const TrustSection = () => {
  return (
    <section className="py-16 md:py-24 bg-[#FDFBF7]" data-testid="trust-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[#0A2540] mb-4 animate-fade-in-up" data-testid="trust-title">
            Pourquoi nous faire confiance ?
          </h2>
          <p className="text-lg text-[#64748B] max-w-2xl mx-auto animate-fade-in-up stagger-1" data-testid="trust-subtitle">
            Santia s'engage à vous offrir des soins de qualité dans un cadre sécurisé et confidentiel.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="trust-grid">
          {trustItems.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <div 
                key={item.title}
                className={`bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 animate-fade-in-up stagger-${index + 1}`}
                data-testid={`trust-item-${index}`}
              >
                <div className="w-12 h-12 bg-[#2ECC71]/10 rounded-xl flex items-center justify-center mb-4">
                  <IconComponent className="w-6 h-6 text-[#2ECC71]" />
                </div>
                <h3 className="text-lg font-bold text-[#0A2540] mb-2">{item.title}</h3>
                <p className="text-[#64748B]">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
