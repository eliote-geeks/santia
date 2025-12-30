import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

const starterMessages = [
  {
    id: 'intro',
    role: 'assistant',
    content: 'Bonjour, je suis Sanity, votre assistante IA. Je suis ravie de vous aider.'
  },
  {
    id: 'prompt',
    role: 'assistant',
    content: 'Decrivez votre besoin ou choisissez une option rapide.'
  }
];

const quickActions = [
  { id: 'rdv', label: 'Planifier un rendez-vous', message: 'Je veux planifier une consultation.' },
  { id: 'suivi', label: 'Suivre mon dossier', message: 'Je veux suivre mon dossier patient.' },
  { id: 'urgent', label: 'Besoin rapide', message: "J'ai besoin d'un medecin rapidement." }
];

export const AssistantWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState(starterMessages);

  const pushMessage = (content, role = 'patient') => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        role,
        content
      }
    ]);
  };

  const handleSend = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    pushMessage(trimmed, 'patient');
    setChatInput('');
    setTimeout(() => {
      pushMessage('Merci, je prepare cela. Souhaitez-vous ajouter des details ?', 'assistant');
    }, 500);
  };

  const handleQuickAction = (message) => {
    pushMessage(message, 'patient');
    setTimeout(() => {
      pushMessage("Parfait, je m'en occupe. Pouvez-vous preciser votre disponibilite ?", 'assistant');
    }, 400);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {!isOpen && (
        <button
          className="flex items-center gap-3 bg-[#0A2540] text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl border border-white/10 transition"
          onClick={() => setIsOpen(true)}
          aria-label="Ouvrir Sanity"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2ECC71] text-[#0A2540] font-semibold">
            S
          </span>
          <span className="text-sm font-semibold">Sanity</span>
          <span className="text-xs text-white/70">Assistante IA</span>
        </button>
      )}

      {isOpen && (
        <div className="w-[320px] sm:w-[380px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-[#0A2540] via-[#0A2540] to-[#1B6B52] text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Sanity</p>
                <p className="text-xs text-white/70">Assistante IA - disponible 7j/7</p>
              </div>
              <button
                className="p-1 rounded-full hover:bg-white/10 transition-colors"
                onClick={() => setIsOpen(false)}
                aria-label="Fermer Sanity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'patient' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      message.role === 'patient'
                        ? 'bg-[#0A2540] text-white'
                        : 'bg-slate-50 text-[#0A2540] border border-slate-200'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  className="rounded-full border border-[#2ECC71] text-[#0A2540] text-xs px-3 py-1 hover:bg-[#2ECC71]/10 transition"
                  onClick={() => handleQuickAction(action.message)}
                >
                  {action.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Textarea
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ecrivez ici..."
                className="input-santia min-h-[80px]"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Mode demo - reponse simulee</span>
                <button
                  className="text-[#2ECC71] hover:text-[#1B6B52] transition-colors"
                  onClick={() => setMessages(starterMessages)}
                  type="button"
                >
                  Reinitialiser
                </button>
              </div>
              <Button className="btn-green w-full" onClick={handleSend}>
                Envoyer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssistantWidget;
