
import React, { useState } from 'react';
import { Lock, Mail, Loader2 } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string, pass: string) => Promise<void>;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await onLogin(email, password);
    } catch (err) {
      setError('Falha no login. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-[#FF00FF] focus:border-transparent outline-none transition-all block opacity-100";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#FF00FF] to-purple-600 bg-clip-text text-transparent mb-2">
              CGest
            </h1>
            <p className="text-slate-500 text-sm">Entre para gerenciar seu negócio</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="seu@email.com"
                  autoComplete="email"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-[#FCD282] hover:bg-[#e6c075] text-black font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Entrar'}
            </button>

            <div className="text-center mt-4 text-xs text-slate-400">
              <p>Demo: Use qualquer e-mail/senha para testar.</p>
            </div>
          </form>
        </div>
        <div className="bg-slate-50 p-4 border-t border-slate-100 text-center text-xs text-slate-400">
          &copy; 2024 CGest System.
        </div>
      </div>
    </div>
  );
};

export default Login;
