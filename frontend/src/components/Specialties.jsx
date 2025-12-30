import { Link } from 'react-router-dom';
import { Heart, ShieldAlert, Scale, Moon, Sparkles, Baby, ArrowRight } from 'lucide-react';

const specialties = [
  {
    id: 'sante-sexuelle',
    title: 'Santé sexuelle',
    description: 'Troubles érectiles, IST, contraception...',
    icon: Heart,
    color: 'bg-rose-50',
    iconColor: 'text-rose-500'
  },
  {
    id: 'addictions',
    title: 'Addictions',
    description: 'Tabac, alcool, dépendances...',
    icon: ShieldAlert,
    color: 'bg-amber-50',
    iconColor: 'text-amber-600'
  },
  {
    id: 'perte-de-poids',
    title: 'Perte de poids',
    description: 'Nutrition, régimes, suivi médical...',
    icon: Scale,
    color: 'bg-emerald-50',
    iconColor: 'text-emerald-600'
  },
  {
    id: 'sommeil',
    title: 'Sommeil',
    description: 'Insomnie, apnée, troubles du sommeil...',
    icon: Moon,
    color: 'bg-indigo-50',
    iconColor: 'text-indigo-600'
  },
  {
    id: 'cheveux',
    title: 'Cheveux',
    description: 'Chute de cheveux, alopécie, traitements...',
    icon: Sparkles,
    color: 'bg-purple-50',
    iconColor: 'text-purple-600'
  },
  {
    id: 'fertilite',
    title: 'Fertilité',
    description: 'Bilan, conseils, accompagnement...',
    icon: Baby,
    color: 'bg-sky-50',
    iconColor: 'text-sky-600'
  }
];

export const Specialties = () => {
  return (
    <section id="specialites" className="py-16 md:py-24 bg-[#F8FAFC]" data-testid="specialties-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[#0A2540] mb-4 animate-fade-in-up" data-testid="specialties-title">
            Choisissez votre pathologie
          </h2>
          <p className="text-lg text-[#64748B] max-w-2xl mx-auto animate-fade-in-up stagger-1" data-testid="specialties-subtitle">
            Perte de poids, santé sexuelle, addictions, sommeil... Sélectionnez la catégorie qui vous concerne.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="specialties-grid">
          {specialties.map((specialty, index) => {
            const IconComponent = specialty.icon;
            return (
              <Link
                key={specialty.id}
                to={`/consultation?category=${specialty.id}`}
                className={`card-hover p-6 group animate-fade-in-up stagger-${index + 1}`}
                data-testid={`specialty-card-${specialty.id}`}
              >
                <div className={`w-14 h-14 ${specialty.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <IconComponent className={`w-7 h-7 ${specialty.iconColor}`} />
                </div>
                <h3 className="text-xl font-bold text-[#0A2540] mb-2">{specialty.title}</h3>
                <p className="text-[#64748B] mb-4">{specialty.description}</p>
                <div className="flex items-center gap-2 text-[#2ECC71] font-medium group-hover:gap-3 transition-all duration-200">
                  <span>Consulter</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Specialties;
