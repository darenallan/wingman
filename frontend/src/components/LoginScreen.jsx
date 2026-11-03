import { useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import WingmanLogo from './WingmanLogo';

export default function LoginScreen({ apiUrl, onSuccess }) {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!password) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Erreur serveur (${response.status})`);
      setPassword('');
      onSuccess();
    } catch (err) {
      setError(err.message || 'Impossible de contacter le serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-sans p-4 md:p-8 flex items-center">
      <form onSubmit={submit} className="max-w-sm w-full mx-auto space-y-6">
        <h1 className="text-2xl font-bold tracking-wider text-[#DCAB6B] flex items-center justify-center gap-2">
          <WingmanLogo size={28} className="shrink-0 drop-shadow-[0_0_6px_rgba(200,168,75,0.35)]" />
          WINGMAN
        </h1>
        <div className="space-y-2">
          <label htmlFor="password" className="text-xs uppercase tracking-widest text-gray-500">Mot de passe</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#0F0F0F] border border-[#1A1A1A] rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-[#C8A84B] transition-colors"
          />
        </div>
        {error && (
          <p role="alert" className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">{error}</p>
        )}
        <button
          type="submit"
          disabled={!password || isLoading}
          className="w-full bg-gradient-to-r from-[#C8A84B] to-[#DCAB6B] text-[#050505] font-bold tracking-wider uppercase py-3.5 rounded-lg flex items-center justify-center gap-2 hover:opacity-95 transition-all disabled:opacity-40 shadow-lg"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
          Entrer
        </button>
      </form>
    </div>
  );
}
