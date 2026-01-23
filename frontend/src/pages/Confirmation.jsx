import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { CheckCircle2, ArrowRight, Clock, MessageSquare, Wallet, Video } from 'lucide-react';
import { Button } from '../components/ui/button';

const BOOKING_STORAGE_KEY = 'santia_booking';
const DEFAULT_MEETING_URL = 'https://meet.jit.si/santia-demo';

const formatMoney = (amount) => new Intl.NumberFormat('fr-FR').format(amount);

export const Confirmation = () => {
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem(BOOKING_STORAGE_KEY);
    if (!raw) return;
    try {
      setBooking(JSON.parse(raw));
    } catch (error) {
      setBooking(null);
    }
  }, []);

  const scheduleLabel = booking?.schedule?.label || 'Aujourd\'hui 14:00';
  const meetingUrl = booking?.meetingUrl || DEFAULT_MEETING_URL;
  const paymentMethod = booking?.payment?.method || 'Orange Money';
  const paymentAmount = booking?.payment?.amount || 5000;
  const paymentReference = booking?.payment?.reference || 'REF-000000';
  const patientName = booking?.name || 'Votre consultation';

  const smsMessage = useMemo(() => {
    const name = booking?.name || 'Patient';
    return `Bonjour ${name}, votre paiement est en cours de validation.\nCréneau: ${scheduleLabel}\nLien: ${meetingUrl}\nMerci.`;
  }, [booking, scheduleLabel, meetingUrl]);

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
              Paiement en attente de validation
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-[#64748B] mb-8 animate-fade-in-up stagger-3" data-testid="confirmation-subtitle">
              Votre reference de paiement a ete enregistree. Nous confirmons le depot avant le rendez-vous.
            </p>

            {/* Info Cards */}
            <div className="grid sm:grid-cols-3 gap-4 mb-8 animate-fade-in-up stagger-4" data-testid="info-cards">
              <div className="bg-[#F8FAFC] rounded-xl p-4">
                <div className="w-10 h-10 bg-[#2ECC71]/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-5 h-5 text-[#2ECC71]" />
                </div>
                <h3 className="font-semibold text-[#0A2540] text-sm mb-1">Créneau</h3>
                <p className="text-xs text-[#64748B]">{scheduleLabel}</p>
              </div>

              <div className="bg-[#F8FAFC] rounded-xl p-4">
                <div className="w-10 h-10 bg-[#2ECC71]/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Wallet className="w-5 h-5 text-[#2ECC71]" />
                </div>
                <h3 className="font-semibold text-[#0A2540] text-sm mb-1">Paiement</h3>
                <p className="text-xs text-[#64748B]">{paymentMethod}</p>
              </div>

              <div className="bg-[#F8FAFC] rounded-xl p-4">
                <div className="w-10 h-10 bg-[#2ECC71]/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-5 h-5 text-[#2ECC71]" />
                </div>
                <h3 className="font-semibold text-[#0A2540] text-sm mb-1">SMS envoyé</h3>
                <p className="text-xs text-[#64748B]">Lien de consultation</p>
              </div>
            </div>

            {/* Consultation Link */}
            <div className="bg-[#0A2540]/5 border border-[#0A2540]/10 rounded-2xl p-5 mb-8 animate-fade-in-up stagger-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0A2540]/10 rounded-full flex items-center justify-center">
                    <Video className="w-5 h-5 text-[#0A2540]" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-[#64748B]">Lien de consultation</p>
                    <p className="text-sm font-medium text-[#0A2540]">{patientName}</p>
                  </div>
                </div>
                <a href={meetingUrl} target="_blank" rel="noreferrer">
                  <Button className="btn-green px-6 py-3">Rejoindre la visio</Button>
                </a>
              </div>
            </div>

            {/* SMS Preview */}
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-5 text-left mb-8 animate-fade-in-up stagger-5">
              <h3 className="text-sm font-semibold text-[#0A2540] mb-3">SMS de confirmation</h3>
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-[#475569] whitespace-pre-line">
                {smsMessage}
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-[#64748B]">
                <span>Montant payé : {formatMoney(paymentAmount)} FCFA</span>
                <span>Réf : {paymentReference}</span>
              </div>
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
