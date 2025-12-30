import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { Specialties } from '../components/Specialties';
import { HowItWorks } from '../components/HowItWorks';
import { TrustSection } from '../components/TrustSection';
import { FAQ } from '../components/FAQ';
import { Footer } from '../components/Footer';

export const Home = () => {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.replace('#', '');
    const section = document.getElementById(id);
    if (!section) return;
    const offset = 96;
    const top = section.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }, [location.hash]);

  return (
    <div className="min-h-screen" data-testid="home-page">
      <Navbar />
      <main>
        <Hero />
        <Specialties />
        <HowItWorks />
        <TrustSection />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
};

export default Home;
