
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  LogOut,
  Scale,
  Calendar,
  CheckSquare,
  DollarSign,
  FileText
} from 'lucide-react';

interface SidebarProps {
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Processos', path: '/processos', icon: Briefcase },
    { name: 'Relatórios', path: '/relatorios', icon: FileText },
    { name: 'Clientes', path: '/clientes', icon: Users },
    { name: 'Tarefas', path: '/tarefas', icon: CheckSquare },
    { name: 'Agenda', path: '/agenda', icon: Calendar },
    { name: 'Financeiro', path: '/financeiro', icon: DollarSign },
  ];

  return (
    <aside className="w-64 bg-[#0b1726] text-white flex flex-col h-full shadow-2xl transition-all duration-300">
      {/* Brand - Oliveira & Lins Advocacia */}
      <div className="px-4 pt-6 pb-5 flex flex-col items-center gap-3 border-b border-white/5 mb-2">
        <img
          src="/logo_oliveira_lins.png"
          alt="Logo Oliveira & Lins"
          className="w-full max-w-[140px] h-auto object-contain"
        />
        <div className="text-center">
          <span className="block text-white font-bold text-xl leading-tight tracking-wide">
            Oliveira & Lins
          </span>
          <span className="block text-indigo-400 font-bold text-[9px] uppercase tracking-[0.2em] mt-0.5">
            Advocacia
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 mt-4 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path + item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all duration-200 group ${isActive
                ? 'bg-[#4f46e5] text-white shadow-xl shadow-indigo-900/40'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-bold text-sm">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer / Logout Only */}
      <div className="p-4 mt-auto border-t border-white/5 bg-white/[0.02]">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-5 py-3 text-gray-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-2xl transition-all duration-200 group"
        >
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold text-sm">Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
