import React, { useState } from 'react';
import { Copy, Send, Loader2, Check } from 'lucide-react';
import WingmanLogo from './components/WingmanLogo';

const VIBES = [
  { id: 'Provocateur', label: 'Provocateur' },
  { id: 'Arrogant Charmeur', label: 'Arrogant Charmeur' },
  { id: 'Mystérieux', label: 'Mystérieux' },
  { id: 'Recadrage', label: 'Recadrage' }
];

const API_URL = import.meta.env.VITE_API_URL || '';

export default function WingmanApp() {
  const [context, setContext] = useState('');
  const [herMessage, setHerMessage] = useState('');
  const [selectedVibe, setSelectedVibe] = useState('Provocateur');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!herMessage.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          herMessage,
          vibe: selectedVibe
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `Erreur serveur (${response.status})`);
      }
      setResults(data);
    } catch (err) {
      console.error("Erreur API:", err);
      setResults(null);
      setError(err.message || "Impossible de contacter le serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-sans p-4 md:p-8">
      <div className="max-w-md mx-auto space-y-8">
        
        {/* Header Luxury Tech */}
        <header className="flex items-center justify-between border-b border-[#1A1A1A] pb-4">
          <h1 className="text-2xl font-bold tracking-wider text-[#DCAB6B] flex items-center gap-2">
            <WingmanLogo size={28} className="shrink-0 drop-shadow-[0_0_6px_rgba(200,168,75,0.35)]" />
            WINGMAN
          </h1>
          <span className="text-xs uppercase tracking-widest text-[#C8A84B] bg-[#C8A84B]/10 px-2.5 py-1 rounded border border-[#C8A84B]/30">
            V2.0 PRO
          </span>
        </header>

        {/* Input Section */}
        <section className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-gray-500">Contexte (Optionnel)</label>
            <input 
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Ex: On flirt depuis 2 jours, elle fait la difficile..."
              className="w-full bg-[#0F0F0F] border border-[#1A1A1A] rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-[#C8A84B] transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-gray-500">Son dernier message</label>
            <textarea 
              value={herMessage}
              onChange={(e) => setHerMessage(e.target.value)}
              placeholder="Colle son message ici..."
              rows="3"
              className="w-full bg-[#0F0F0F] border border-[#1A1A1A] rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-[#C8A84B] transition-colors resize-none"
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs uppercase tracking-widest text-gray-500">Vibe prioritaire</label>
            <div className="grid grid-cols-2 gap-3">
              {VIBES.map((vibe) => (
                <button
                  key={vibe.id}
                  onClick={() => setSelectedVibe(vibe.id)}
                  className={`p-2.5 text-xs font-medium rounded-lg border transition-all ${
                    selectedVibe === vibe.id 
                      ? 'border-[#C8A84B] text-[#C8A84B] bg-[#C8A84B]/10 shadow-[0_0_15px_rgba(200,168,75,0.15)]' 
                      : 'border-[#1A1A1A] bg-[#09090b] text-gray-500 hover:border-gray-700'
                  }`}
                >
                  {vibe.label}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={!herMessage.trim() || isLoading}
            className="w-full bg-gradient-to-r from-[#C8A84B] to-[#DCAB6B] text-[#050505] font-bold tracking-wider uppercase py-3.5 rounded-lg flex items-center justify-center gap-2 hover:opacity-95 transition-all disabled:opacity-40 shadow-lg"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {isLoading ? 'Analyse tactique...' : 'Générer la répartie'}
          </button>
        </section>

        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            {error}
          </p>
        )}

        {/* Results Section */}
        {results && (
          <section className="space-y-6 pt-6 border-t border-[#1A1A1A]">
            
            <div className="bg-[#0F0F0F] border-l-2 border-[#C8A84B] p-3.5 rounded-r-lg">
              <p className="text-xs text-gray-300 leading-relaxed">
                <span className="text-[#DCAB6B] font-semibold uppercase tracking-wider block mb-1">Analyse du sous-texte :</span>
                {results.analysis}
              </p>
            </div>

            <div className="space-y-4">
              {results.options?.map((option, index) => (
                <div key={index} className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-xl p-4 hover:border-[#C8A84B]/50 transition-all">
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#C8A84B] bg-[#C8A84B]/10 px-2.5 py-1 rounded">
                      {option.tone}
                    </span>
                    <button 
                      onClick={() => copyToClipboard(option.text, index)}
                      className="text-gray-400 hover:text-[#DCAB6B] transition-colors flex items-center gap-1 text-xs"
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">Copié</span>
                        </>
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-gray-100 font-medium mb-3 leading-relaxed">{option.text}</p>
                  <p className="text-[11px] text-gray-500 border-t border-[#1A1A1A] pt-2">
                    {option.explanation}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
