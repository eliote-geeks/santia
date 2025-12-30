import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  ShieldAlert,
  Scale,
  Moon,
  Sparkles,
  Baby,
  Check,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { getToken, authHeaders } from '../lib/auth';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const MEETING_BASE_URL = (process.env.REACT_APP_JITSI_URL || 'https://meet.jit.si').replace(/\/$/, '');
const PAYMENT_AMOUNT = 10000;
const BOOKING_STORAGE_KEY = 'santia_booking';

const categories = [
  { id: 'sante-sexuelle', title: 'Santé sexuelle', icon: Heart, color: 'bg-rose-50', iconColor: 'text-rose-500' },
  { id: 'addictions', title: 'Addictions', icon: ShieldAlert, color: 'bg-amber-50', iconColor: 'text-amber-600' },
  { id: 'perte-de-poids', title: 'Perte de poids', icon: Scale, color: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  { id: 'sommeil', title: 'Sommeil', icon: Moon, color: 'bg-indigo-50', iconColor: 'text-indigo-600' },
  { id: 'cheveux', title: 'Cheveux', icon: Sparkles, color: 'bg-purple-50', iconColor: 'text-purple-600' },
  { id: 'fertilite', title: 'Fertilité', icon: Baby, color: 'bg-sky-50', iconColor: 'text-sky-600' }
];

const durations = [
  { value: 'moins-1-semaine', label: 'Moins d\'une semaine' },
  { value: '1-4-semaines', label: '1 à 4 semaines' },
  { value: '1-3-mois', label: '1 à 3 mois' },
  { value: 'plus-3-mois', label: 'Plus de 3 mois' }
];

const cities = [
  'Douala', 'Yaoundé', 'Bamenda', 'Garoua', 'Maroua',
  'Bafoussam', 'Ngaoundéré', 'Bertoua', 'Kribi', 'Limbe', 'Autre'
];

const paymentMethods = [
  {
    id: 'orange-money',
    label: 'Orange Money',
    helper: 'Paiement instantané via Orange',
    accent: '#FF7900',
    badge: 'OM'
  },
  {
    id: 'mtn-momo',
    label: 'MTN MoMo',
    helper: 'Paiement instantané via MTN',
    accent: '#FFCB05',
    badge: 'MoMo'
  }
];

const buildScheduleSlots = () => {
  const slots = [];
  const now = new Date();
  const timeSlots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'];

  for (let dayOffset = 0; dayOffset < 5; dayOffset += 1) {
    const baseDate = new Date(now);
    baseDate.setDate(now.getDate() + dayOffset);
    timeSlots.forEach((time) => {
      const [hour, minute] = time.split(':').map(Number);
      const slotDate = new Date(baseDate);
      slotDate.setHours(hour, minute, 0, 0);
      if (slotDate < now) return;
      const label = `${slotDate.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
      })} · ${time}`;
      slots.push({
        id: slotDate.toISOString(),
        date: slotDate.toISOString().slice(0, 10),
        time,
        label
      });
    });
  }

  return slots.slice(0, 10);
};

const formatMoney = (amount) => new Intl.NumberFormat('fr-FR').format(amount);

export const Consultation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const scheduleSlots = useMemo(() => buildScheduleSlots(), []);

  const [formData, setFormData] = useState({
    category: searchParams.get('category') || '',
    symptoms: '',
    duration: '',
    history: '',
    name: '',
    age: '',
    gender: '',
    phone: '',
    email: '',
    city: '',
    scheduleSlotId: '',
    scheduleDate: '',
    scheduleTime: '',
    scheduleLabel: '',
    paymentMethod: '',
    paymentPhone: '',
    paymentConfirmed: false,
    paymentReference: '',
    consent: false
  });

  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    if (categoryFromUrl && categories.find(c => c.id === categoryFromUrl)) {
      setFormData(prev => ({ ...prev, category: categoryFromUrl }));
      setCurrentStep(2);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!getToken()) {
      navigate('/login?next=/consultation');
    }
  }, [navigate]);

  useEffect(() => {
    if (formData.phone && !formData.paymentPhone) {
      setFormData(prev => ({ ...prev, paymentPhone: prev.phone }));
    }
  }, [formData.phone, formData.paymentPhone]);

  const updateFormData = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (['paymentMethod', 'paymentPhone'].includes(field)) {
        next.paymentConfirmed = false;
        next.paymentReference = '';
      }
      return next;
    });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const selectScheduleSlot = (slot) => {
    setFormData(prev => ({
      ...prev,
      scheduleSlotId: slot.id,
      scheduleDate: slot.date,
      scheduleTime: slot.time,
      scheduleLabel: slot.label
    }));
    if (errors.scheduleSlotId) {
      setErrors(prev => ({ ...prev, scheduleSlotId: null }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.category) newErrors.category = 'Veuillez sélectionner un motif';
    } else if (step === 2) {
      if (!formData.symptoms.trim()) newErrors.symptoms = 'Veuillez décrire vos symptômes';
      if (!formData.duration) newErrors.duration = 'Veuillez indiquer la durée';
    } else if (step === 3) {
      if (!formData.name.trim()) newErrors.name = 'Veuillez entrer votre nom';
      if (!formData.age || formData.age < 1 || formData.age > 120) newErrors.age = 'Veuillez entrer un âge valide';
      if (!formData.gender) newErrors.gender = 'Veuillez sélectionner votre sexe';
      if (!formData.phone.trim()) newErrors.phone = 'Veuillez entrer votre téléphone';
      if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Veuillez entrer un email valide';
      if (!formData.city) newErrors.city = 'Veuillez sélectionner votre ville';
    } else if (step === 4) {
      if (!formData.scheduleSlotId) newErrors.scheduleSlotId = 'Veuillez choisir un créneau disponible';
    } else if (step === 5) {
      if (!formData.paymentMethod) newErrors.paymentMethod = 'Choisissez un moyen de paiement';
      if (!formData.paymentPhone.trim()) newErrors.paymentPhone = 'Indiquez le numéro Mobile Money';
      if (!formData.paymentConfirmed) newErrors.paymentConfirmed = 'Confirmez le paiement Mobile Money';
      if (!formData.consent) newErrors.consent = 'Vous devez accepter les conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSimulatePayment = () => {
    const newErrors = {};
    if (!formData.paymentMethod) newErrors.paymentMethod = 'Choisissez un moyen de paiement';
    if (!formData.paymentPhone.trim()) newErrors.paymentPhone = 'Indiquez le numéro Mobile Money';
    if (Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }));
      return;
    }
    const reference = `SM-${Math.floor(100000 + Math.random() * 900000)}`;
    setFormData(prev => ({
      ...prev,
      paymentConfirmed: true,
      paymentReference: reference
    }));
    setErrors(prev => ({ ...prev, paymentConfirmed: null }));
  };

  const buildMeetingUrl = () => {
    const slugBase = formData.category || 'consultation';
    const random = Math.random().toString(36).slice(2, 8);
    return `${MEETING_BASE_URL}/santia-${slugBase}-${random}`;
  };

  const handleSubmit = async () => {
    if (!validateStep(5)) return;

    setIsSubmitting(true);
    try {
      const payload = {
        category: formData.category,
        symptoms: formData.symptoms,
        duration: formData.duration,
        history: formData.history,
        name: formData.name,
        age: parseInt(formData.age, 10),
        gender: formData.gender,
        phone: formData.phone,
        email: formData.email,
        city: formData.city,
        consent: formData.consent
      };

      await axios.post(`${API_URL}/api/intake`, payload, {
        headers: authHeaders()
      });

      const meetingUrl = buildMeetingUrl();
      const paymentLabel = paymentMethods.find((method) => method.id === formData.paymentMethod)?.label || formData.paymentMethod;
      const booking = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        category: getCategoryLabel(formData.category),
        symptoms: formData.symptoms,
        schedule: {
          date: formData.scheduleDate,
          time: formData.scheduleTime,
          label: formData.scheduleLabel
        },
        payment: {
          method: paymentLabel,
          amount: PAYMENT_AMOUNT,
          phone: formData.paymentPhone,
          reference: formData.paymentReference
        },
        meetingUrl,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(booking));

      navigate('/confirmation');
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      setErrors({ submit: 'Une erreur est survenue. Veuillez réessayer.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryLabel = (id) => {
    const cat = categories.find(c => c.id === id);
    return cat ? cat.title : id;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="consultation-page">
      <Navbar />

      <main className="pt-24 pb-16 md:pt-28 md:pb-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          {/* Urgence Disclaimer */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 animate-fade-in" data-testid="urgence-banner">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">
                <strong>Urgence ?</strong> En cas de symptômes graves, appelez le <strong>112</strong> ou rendez-vous aux urgences.
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-8" data-testid="progress-bar">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#0A2540]">Étape {currentStep} sur 5</span>
              <span className="text-sm text-[#64748B]">{Math.round((currentStep / 5) * 100)}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#2ECC71] rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / 5) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-3">
              {['Motif', 'Problème', 'Infos', 'Rendez-vous', 'Paiement'].map((label, index) => (
                <div
                  key={label}
                  className={`text-xs font-medium ${currentStep > index ? 'text-[#2ECC71]' : currentStep === index + 1 ? 'text-[#0A2540]' : 'text-[#64748B]'}`}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Form Container */}
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 animate-fade-in" data-testid="form-container">

            {/* Step 1: Category Selection */}
            {currentStep === 1 && (
              <div data-testid="step-1">
                <h2 className="text-2xl font-bold text-[#0A2540] mb-2">Choisissez votre pathologie</h2>
                <p className="text-[#64748B] mb-6">Sélectionnez la catégorie qui correspond le mieux à votre besoin.</p>

                <div className="grid sm:grid-cols-2 gap-4">
                  {categories.map((cat) => {
                    const IconComponent = cat.icon;
                    const isSelected = formData.category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => updateFormData('category', cat.id)}
                        className={`p-5 rounded-xl border-2 text-left transition-all duration-200 ${
                          isSelected
                            ? 'border-[#2ECC71] bg-[#2ECC71]/5 ring-1 ring-[#2ECC71]'
                            : 'border-slate-200 hover:border-[#0A2540]/30 hover:bg-slate-50'
                        }`}
                        data-testid={`category-${cat.id}`}
                      >
                        <div className={`w-12 h-12 ${cat.color} rounded-xl flex items-center justify-center mb-3`}>
                          <IconComponent className={`w-6 h-6 ${cat.iconColor}`} />
                        </div>
                        <h3 className="font-semibold text-[#0A2540]">{cat.title}</h3>
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-6 h-6 bg-[#2ECC71] rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {errors.category && <p className="text-red-500 text-sm mt-4">{errors.category}</p>}
              </div>
            )}

            {/* Step 2: Symptoms */}
            {currentStep === 2 && (
              <div data-testid="step-2">
                <h2 className="text-2xl font-bold text-[#0A2540] mb-2">Décrivez votre problème</h2>
                <p className="text-[#64748B] mb-6">Plus vous êtes précis, mieux le médecin pourra vous aider.</p>

                <div className="space-y-6">
                  <div>
                    <Label htmlFor="symptoms" className="text-[#0A2540] font-medium mb-2 block">
                      Quels sont vos symptômes ? *
                    </Label>
                    <Textarea
                      id="symptoms"
                      placeholder="Décrivez vos symptômes en détail..."
                      value={formData.symptoms}
                      onChange={(e) => updateFormData('symptoms', e.target.value)}
                      className="min-h-[120px] input-santia"
                      data-testid="symptoms-input"
                    />
                    {errors.symptoms && <p className="text-red-500 text-sm mt-1">{errors.symptoms}</p>}
                  </div>

                  <div>
                    <Label className="text-[#0A2540] font-medium mb-3 block">
                      Depuis combien de temps ? *
                    </Label>
                    <RadioGroup
                      value={formData.duration}
                      onValueChange={(value) => updateFormData('duration', value)}
                      className="grid sm:grid-cols-2 gap-3"
                      data-testid="duration-select"
                    >
                      {durations.map((d) => (
                        <div key={d.value} className="flex items-center">
                          <RadioGroupItem value={d.value} id={d.value} className="peer sr-only" />
                          <Label
                            htmlFor={d.value}
                            className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                              formData.duration === d.value
                                ? 'border-[#2ECC71] bg-[#2ECC71]/5'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {d.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    {errors.duration && <p className="text-red-500 text-sm mt-1">{errors.duration}</p>}
                  </div>

                  <div>
                    <Label htmlFor="history" className="text-[#0A2540] font-medium mb-2 block">
                      Antécédents médicaux (optionnel)
                    </Label>
                    <Textarea
                      id="history"
                      placeholder="Maladies, allergies, traitements en cours..."
                      value={formData.history}
                      onChange={(e) => updateFormData('history', e.target.value)}
                      className="min-h-[80px] input-santia"
                      data-testid="history-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Patient Info */}
            {currentStep === 3 && (
              <div data-testid="step-3">
                <h2 className="text-2xl font-bold text-[#0A2540] mb-2">Vos informations</h2>
                <p className="text-[#64748B] mb-6">Ces informations permettront au médecin de vous contacter.</p>

                <div className="space-y-5">
                  <div>
                    <Label htmlFor="name" className="text-[#0A2540] font-medium mb-2 block">Nom complet *</Label>
                    <Input
                      id="name"
                      placeholder="Brice Ngassa"
                      value={formData.name}
                      onChange={(e) => updateFormData('name', e.target.value)}
                      className="input-santia"
                      data-testid="name-input"
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="age" className="text-[#0A2540] font-medium mb-2 block">Âge *</Label>
                      <Input
                        id="age"
                        type="number"
                        placeholder="25"
                        min="1"
                        max="120"
                        value={formData.age}
                        onChange={(e) => updateFormData('age', e.target.value)}
                        className="input-santia"
                        data-testid="age-input"
                      />
                      {errors.age && <p className="text-red-500 text-sm mt-1">{errors.age}</p>}
                    </div>

                    <div>
                      <Label className="text-[#0A2540] font-medium mb-2 block">Sexe *</Label>
                      <Select value={formData.gender} onValueChange={(value) => updateFormData('gender', value)}>
                        <SelectTrigger className="input-santia" data-testid="gender-select">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="homme">Homme</SelectItem>
                          <SelectItem value="femme">Femme</SelectItem>
                          <SelectItem value="autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-[#0A2540] font-medium mb-2 block">Téléphone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+237 6XX XXX XXX"
                      value={formData.phone}
                      onChange={(e) => updateFormData('phone', e.target.value)}
                      className="input-santia"
                      data-testid="phone-input"
                    />
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-[#0A2540] font-medium mb-2 block">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="jean@exemple.com"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                      className="input-santia"
                      data-testid="email-input"
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <Label className="text-[#0A2540] font-medium mb-2 block">Ville *</Label>
                    <Select value={formData.city} onValueChange={(value) => updateFormData('city', value)}>
                      <SelectTrigger className="input-santia" data-testid="city-select">
                        <SelectValue placeholder="Sélectionner votre ville" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Schedule */}
            {currentStep === 4 && (
              <div data-testid="step-4">
                <h2 className="text-2xl font-bold text-[#0A2540] mb-2">Choisissez un créneau</h2>
                <p className="text-[#64748B] mb-6">Sélectionnez la date et l'heure de votre consultation.</p>

                <div className="grid sm:grid-cols-2 gap-4">
                  {scheduleSlots.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => selectScheduleSlot(slot)}
                      className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                        formData.scheduleSlotId === slot.id
                          ? 'border-[#2ECC71] bg-[#2ECC71]/5 ring-1 ring-[#2ECC71]'
                          : 'border-slate-200 hover:border-[#0A2540]/30 hover:bg-slate-50'
                      }`}
                    >
                      <p className="font-semibold text-[#0A2540]">{slot.label}</p>
                      <p className="text-xs text-[#64748B] mt-1">Consultation vidéo · 20 min</p>
                    </button>
                  ))}
                </div>

                {errors.scheduleSlotId && <p className="text-red-500 text-sm mt-4">{errors.scheduleSlotId}</p>}

                <div className="mt-6 bg-[#0A2540]/5 border border-[#0A2540]/10 rounded-2xl p-5">
                  <p className="text-sm text-[#0A2540] font-medium">Fuseau horaire : GMT+1 (Cameroun)</p>
                  <p className="text-xs text-[#64748B] mt-2">Un SMS de confirmation vous sera envoyé avec le lien de consultation.</p>
                </div>
              </div>
            )}

            {/* Step 5: Payment */}
            {currentStep === 5 && (
              <div data-testid="step-5">
                <h2 className="text-2xl font-bold text-[#0A2540] mb-2">Paiement Mobile Money</h2>
                <p className="text-[#64748B] mb-6">Réglez votre consultation via Orange Money ou MTN MoMo.</p>

                <div className="space-y-6">
                  <div className="bg-[#F8FAFC] rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#64748B]">Montant de la consultation</p>
                      <p className="text-2xl font-bold text-[#0A2540]">{formatMoney(PAYMENT_AMOUNT)} FCFA</p>
                    </div>
                    <div className="text-xs text-[#2ECC71] font-medium">Paiement sécurisé</div>
                  </div>

                  <div>
                    <Label className="text-[#0A2540] font-medium mb-3 block">Choisissez votre opérateur *</Label>
                    <RadioGroup
                      value={formData.paymentMethod}
                      onValueChange={(value) => updateFormData('paymentMethod', value)}
                      className="grid sm:grid-cols-2 gap-4"
                      data-testid="payment-methods"
                    >
                      {paymentMethods.map((method) => (
                        <div key={method.id} className="flex items-center">
                          <RadioGroupItem value={method.id} id={method.id} className="peer sr-only" />
                          <Label
                            htmlFor={method.id}
                            className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                              formData.paymentMethod === method.id
                                ? 'border-[#2ECC71] bg-[#2ECC71]/5'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                                style={{ backgroundColor: method.accent }}
                              >
                                {method.badge}
                              </div>
                              <div>
                                <p className="font-semibold text-[#0A2540]">{method.label}</p>
                                <p className="text-xs text-[#64748B]">{method.helper}</p>
                              </div>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    {errors.paymentMethod && <p className="text-red-500 text-sm mt-1">{errors.paymentMethod}</p>}
                  </div>

                  <div>
                    <Label htmlFor="paymentPhone" className="text-[#0A2540] font-medium mb-2 block">Numéro Mobile Money *</Label>
                    <Input
                      id="paymentPhone"
                      type="tel"
                      placeholder="+237 6XX XXX XXX"
                      value={formData.paymentPhone}
                      onChange={(e) => updateFormData('paymentPhone', e.target.value)}
                      className="input-santia"
                      data-testid="payment-phone"
                    />
                    {errors.paymentPhone && <p className="text-red-500 text-sm mt-1">{errors.paymentPhone}</p>}
                  </div>

                  <div className="bg-[#0A2540]/5 border border-[#0A2540]/10 rounded-2xl p-5">
                    <p className="text-sm text-[#0A2540] font-medium">Simulation de paiement</p>
                    <p className="text-xs text-[#64748B] mt-2">
                      Cliquez sur “Simuler le paiement” pour continuer (pas de débit réel).
                    </p>
                    <div className="mt-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      <Button type="button" className="btn-primary" onClick={handleSimulatePayment}>
                        Simuler le paiement
                      </Button>
                      {formData.paymentConfirmed && (
                        <span className="text-sm text-[#2ECC71] font-medium">
                          Paiement confirmé · Réf {formData.paymentReference}
                        </span>
                      )}
                    </div>
                    {errors.paymentConfirmed && <p className="text-red-500 text-sm mt-2">{errors.paymentConfirmed}</p>}
                  </div>

                  <div className="bg-[#F8FAFC] rounded-xl p-4">
                    <h3 className="font-semibold text-[#0A2540] mb-3">Récapitulatif</h3>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Motif</span>
                        <span className="font-medium text-[#0A2540]">{getCategoryLabel(formData.category)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Créneau</span>
                        <span className="font-medium text-[#0A2540]">{formData.scheduleLabel || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Paiement</span>
                        <span className="font-medium text-[#0A2540]">{formatMoney(PAYMENT_AMOUNT)} FCFA</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="consent"
                        checked={formData.consent}
                        onCheckedChange={(checked) => updateFormData('consent', checked)}
                        data-testid="consent-checkbox"
                      />
                      <Label htmlFor="consent" className="text-sm text-[#64748B] leading-relaxed cursor-pointer">
                        J'accepte que mes données soient traitées par Santia dans le cadre de ma consultation médicale.
                        Je comprends que ce service ne remplace pas une consultation en urgence.
                      </Label>
                    </div>
                    {errors.consent && <p className="text-red-500 text-sm mt-2">{errors.consent}</p>}
                  </div>

                  {errors.submit && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-red-700 text-sm">{errors.submit}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-slate-200" data-testid="form-navigation">
              {currentStep > 1 ? (
                <Button
                  variant="outline"
                  onClick={prevStep}
                  className="flex items-center gap-2"
                  data-testid="prev-button"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Précédent
                </Button>
              ) : (
                <div></div>
              )}

              {currentStep < 5 ? (
                <Button
                  onClick={nextStep}
                  className="btn-primary flex items-center gap-2"
                  data-testid="next-button"
                >
                  Suivant
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="btn-green flex items-center gap-2"
                  data-testid="submit-button"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Validation en cours...
                    </>
                  ) : (
                    <>
                      Payer et confirmer
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Consultation;
