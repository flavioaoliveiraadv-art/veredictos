
import React, { useState } from 'react';
import { Scale, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simula delay de login
    setTimeout(() => {
      onLogin();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0b1726] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-600/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-blue-500/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2"></div>

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-blue-600 rounded-2xl mb-6 shadow-2xl shadow-blue-500/20">
            <Scale className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">LegalPro <span className="text-blue-500">CRM</span></h1>
          <p className="text-gray-400">Gestão Jurídica Inteligente e Moderna</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[40px] border border-white/10 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Email Profissional</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="email"
                  defaultValue="oliveiraelinsadv@outlook.com"
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '1rem',
                    padding: '1rem 1rem 1rem 3rem',
                    color: '#ffffff !important',
                    outline: 'none',
                  }}
                  placeholder="Seu e-mail"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Senha de Acesso</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="password"
                  defaultValue="123456"
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '1rem',
                    padding: '1rem 1rem 1rem 3rem',
                    color: '#ffffff !important',
                    outline: 'none',
                  }}
                  placeholder="Sua senha"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-white/5 text-blue-600" />
                Lembrar de mim
              </label>
              <a href="#" className="text-blue-500 font-bold hover:underline">Esqueceu a senha?</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Entrar no Sistema
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Info */}
        <div className="mt-8 flex items-center justify-center gap-2 text-gray-500 text-xs font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Servidor Criptografado de Alta Segurança
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
