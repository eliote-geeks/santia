import { AlertTriangle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';

const faqItems = [
  {
    question: 'Comment fonctionne une téléconsultation avec Santia ?',
    answer: 'Vous remplissez un questionnaire médical en ligne, puis un médecin analyse votre dossier et vous contacte par téléphone ou WhatsApp pour discuter de votre situation et vous proposer un traitement adapté.'
  },
  {
    question: 'Les médecins sont-ils qualifiés ?',
    answer: 'Oui, tous nos médecins sont diplômés et agréés pour exercer au Cameroun. Ils ont une expérience significative dans leur domaine de spécialité.'
  },
  {
    question: 'Combien coûte une consultation ?',
    answer: 'Les consultations débutent à partir de 5 000 FCFA selon la spécialité. Le prix exact vous sera indiqué avant de confirmer votre demande.'
  },
  {
    question: 'Mes données sont-elles protégées ?',
    answer: 'Absolument. Vos données médicales sont chiffrées et stockées de manière sécurisée. Nous respectons le secret médical et ne partageons jamais vos informations avec des tiers.'
  },
  {
    question: 'Sous quel délai un médecin me contacte ?',
    answer: 'En général, un médecin analyse votre dossier et vous contacte sous 15 minutes pendant les heures ouvrables. En dehors de ces heures, le délai peut être légèrement plus long.'
  },
  {
    question: 'Puis-je obtenir une ordonnance ?',
    answer: 'Oui, si le médecin estime qu\'un traitement est nécessaire, il peut vous délivrer une ordonnance électronique que vous pourrez utiliser dans n\'importe quelle pharmacie au Cameroun.'
  }
];

export const FAQ = () => {
  return (
    <section id="faq" className="py-16 md:py-24 bg-white" data-testid="faq-section">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#0A2540] mb-4 animate-fade-in-up" data-testid="faq-title">
            Questions fréquentes
          </h2>
          <p className="text-lg text-[#64748B] animate-fade-in-up stagger-1" data-testid="faq-subtitle">
            Trouvez les réponses à vos questions
          </p>
        </div>

        {/* Urgence Disclaimer */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8 animate-fade-in-up stagger-2" data-testid="urgence-disclaimer">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-800 mb-2">Important : Urgences médicales</h3>
              <p className="text-red-700">
                Ce service n'est pas adapté aux urgences vitales. Si vous présentez des symptômes graves 
                (douleur thoracique, difficultés respiratoires, hémorragie...), rendez-vous immédiatement 
                aux urgences ou appelez le <strong>112</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="animate-fade-in-up stagger-3" data-testid="faq-accordion">
          <Accordion type="single" collapsible className="space-y-4">
            {faqItems.map((item, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-[#F8FAFC] rounded-xl border-0 px-6"
                data-testid={`faq-item-${index}`}
              >
                <AccordionTrigger className="text-left text-[#0A2540] font-semibold hover:text-[#2ECC71] hover:no-underline py-5">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-[#64748B] pb-5">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
