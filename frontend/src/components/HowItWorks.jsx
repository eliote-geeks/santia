import { ClipboardList, MessageSquare, Calendar, Smartphone, Video } from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'Choisissez votre pathologie',
    description: 'Perte de poids, sante sexuelle, addictions… selectionnez votre besoin.',
    icon: ClipboardList
  },
  {
    number: '02',
    title: 'Décrivez votre problème',
    description: 'Expliquez vos symptômes et vos antécédents.',
    icon: MessageSquare
  },
  {
    number: '03',
    title: 'Choisissez un créneau',
    description: 'Sélectionnez la date et l’heure qui vous conviennent.',
    icon: Calendar
  },
  {
    number: '04',
    title: 'Payez par Mobile Money',
    description: 'Orange Money ou MTN MoMo, paiement sécurisé.',
    icon: Smartphone
  },
  {
    number: '05',
    title: 'Recevez le SMS & rejoignez',
    description: 'Lien de consultation vidéo envoyé par SMS.',
    icon: Video
  }
];

export const HowItWorks = () => {
  return (
    <section id="comment-ca-marche" className="py-16 md:py-24 bg-white" data-testid="how-it-works-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[#0A2540] mb-4 animate-fade-in-up" data-testid="how-it-works-title">
            Comment ça marche ?
          </h2>
          <p className="text-lg text-[#64748B] max-w-2xl mx-auto animate-fade-in-up stagger-1" data-testid="how-it-works-subtitle">
            5 étapes simples pour consulter en ligne
          </p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-8 lg:gap-12" data-testid="steps-grid">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <div
                key={step.number}
                className={`relative text-center animate-fade-in-up stagger-${index + 1}`}
                data-testid={`step-${index + 1}`}
              >
                {index < steps.length - 1 && (
                  <div className="hidden xl:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-[#E2E8F0]">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#2ECC71] rounded-full"></div>
                  </div>
                )}

                <div className="relative inline-block mb-6">
                  <div className="w-24 h-24 bg-[#0A2540] rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                    <IconComponent className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-[#2ECC71] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                    {step.number}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-[#0A2540] mb-3">{step.title}</h3>
                <p className="text-[#64748B] max-w-xs mx-auto">{step.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-16 relative rounded-3xl overflow-hidden animate-fade-in-up stagger-4" data-testid="how-it-works-image">
          <img
            src="https://images.unsplash.com/photo-1631558554184-319c88f4f8a4?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"
            alt="Consultation médicale"
            className="w-full h-64 md:h-80 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A2540]/80 to-transparent flex items-center">
            <div className="p-8 md:p-12 max-w-lg">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                La santé en confiance
              </h3>
              <p className="text-white/80 text-lg">
                Nos médecins sont tous agréés et exercent au Cameroun. Votre santé est entre de bonnes mains.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
