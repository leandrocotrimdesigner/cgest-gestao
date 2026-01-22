
import React, { useState } from 'react';
import { Loader2, ShieldCheck, CheckCircle } from 'lucide-react';

interface LoginProps {
  onLogin: () => Promise<void>;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      await onLogin();
    } catch (err: any) {
      console.error(err);
      let msg = 'Não foi possível conectar com o Google.';
      if (err.code === 'auth/popup-closed-by-user') msg = 'Login cancelado.';
      setError(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="p-8">
          <div className="text-center mb-8 flex flex-col items-center">
            {/* Logo Colorida */}
            <img 
                src="https://lh3.googleusercontent.com/d/1zdSeNj43Wsrn-r29x6FPuSzbMG--v6F2" 
                alt="CGest" 
                className="h-24 w-auto object-contain mb-4"
            />
            <h2 className="text-2xl font-bold text-slate-800">Bem-vindo de volta</h2>
            <p className="text-slate-500 text-sm mt-1">Gestão inteligente e segura</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
              <ShieldCheck size={16} />
              {error}
            </div>
          )}

          <div className="space-y-6">
            <button 
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full bg-white text-slate-700 font-bold py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <Loader2 className="animate-spin text-blue-600" size={24} />
              ) : (
                <>
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                  <span className="group-hover:text-slate-900 transition-colors">Entrar com Google</span>
                </>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-400">Acesso Seguro</span>
              </div>
            </div>

            <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                    <CheckCircle size={12} className="text-green-500" /> Seus dados estão protegidos
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                    <CheckCircle size={12} className="text-green-500" /> Integração Drive & Agenda
                </div>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 p-4 border-t border-slate-100 text-center text-xs text-slate-400">
          &copy; 2026 CGest System. Desenvolvido com Google Cloud.
        </div>
      </div>
    </div>
  );
};

export default Login;
