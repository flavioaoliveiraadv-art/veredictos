
import React, { useMemo, useState } from 'react';
import { GavelWithBase } from '../components/CustomIcons';
import {
  Clock,
  CheckSquare,
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  Bell,
  Scale,
  AlertTriangle,
  ScrollText,
  Gavel,
  FilePenLine,
  Users as UsersIcon,
  Briefcase,
  MessageSquare,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Cliente, Processo, Prazo, TipoPrazo, StatusProcesso } from '../types';
import { getTodayBR, compareDatesBR } from '../utils/formatters';
import { getTaskIcon, getTaskStyle, getTaskTextColor } from '../components/TaskIcon';

interface DashboardProps {
  clientes: Cliente[];
  processos: Processo[];
  prazos: Prazo[];
  financeiro: any[];
}

const DashboardPage: React.FC<DashboardProps> = ({ processos, prazos, financeiro }) => {
  const navigate = useNavigate();
  const todayBR = getTodayBR();
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  // --- Cálculos de Indicadores ---
  const getStatsForType = (typeFilter: (t: TipoPrazo) => boolean) => {
    const filtered = prazos.filter(p => typeFilter(p.tipo) && !p.concluido && !p.cancelado);
    return {
      atrasados: filtered.filter(p => compareDatesBR(p.dataVencimento, todayBR) < 0).length,
      hoje: filtered.filter(p => p.dataVencimento === todayBR).length,
      proximos: filtered.filter(p => compareDatesBR(p.dataVencimento, todayBR) > 0).length
    };
  };

  const statsPrazos = useMemo(() => getStatsForType(t => t === TipoPrazo.PRAZO), [prazos, todayBR]);
  const statsTarefas = useMemo(() => getStatsForType(t =>
    [TipoPrazo.TAREFA, TipoPrazo.DILIGENCIA, TipoPrazo.REUNIAO, TipoPrazo.ATENDIMENTO, TipoPrazo.ADMINISTRATIVO].includes(t)
  ), [prazos, todayBR]);
  const statsAudiencias = useMemo(() => getStatsForType(t => t === TipoPrazo.AUDIENCIA), [prazos, todayBR]);
  const statsProtocolos = useMemo(() => getStatsForType(t => t === TipoPrazo.PROTOCOLO), [prazos, todayBR]);

  // --- Eventos Prioritários ---
  const priorityEvents = useMemo(() => {
    return [...prazos]
      .filter(p => !p.concluido && !p.cancelado)
      .sort((a, b) => compareDatesBR(a.dataVencimento, b.dataVencimento))
      .slice(0, 8);
  }, [prazos]);

  // --- Lógica de Calendário Semanal ---
  const weekDays = useMemo(() => {
    const start = new Date();
    // Ajustar para o início da semana (Segunda-feira)
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1) + (currentWeekOffset * 7);
    const monday = new Date(start.setDate(diff));

    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return {
        date: d,
        dateStr: d.toLocaleDateString('pt-BR'),
        dayName: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        dayNum: d.getDate()
      };
    });
  }, [currentWeekOffset]);

  const getEventsForDate = (dateStr: string) => {
    const taskEvents = prazos.filter(p => p.dataVencimento === dateStr).map(t => ({ ...t, eventType: 'TASK' }));
    const financialEvents = financeiro ? financeiro.filter(f => f.dataVencimento === dateStr).map(f => ({ ...f, eventType: 'FINANCE' })) : [];
    return [...taskEvents, ...financialEvents];
  };

  const getEventStatusTag = (vencimento: string) => {
    const diff = compareDatesBR(vencimento, todayBR);
    if (diff < 0) return { label: 'ATRASADO', color: 'bg-rose-100 text-rose-500' };
    if (diff === 0) return { label: 'HOJE', color: 'bg-amber-100 text-amber-500' };
    return { label: 'PRÓXIMO', color: 'bg-orange-100 text-orange-500' };
  };

  const getEventColor = (event: any) => {
    if (event.eventType === 'FINANCE') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    return getTaskStyle(event.tipo);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto pb-10">
      {/* Top Header Section */}
      <div className="flex justify-end">
        <button className="p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm hover:bg-gray-50 transition-all relative">
          <Bell className="w-5 h-5 text-gray-400" />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
        </button>
      </div>

      {/* Primary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Prazos"
          icon={getTaskIcon(TipoPrazo.PRAZO, "w-5 h-5")}
          iconColor="text-rose-500 bg-rose-50"
          stats={statsPrazos}
          onClick={() => navigate('/tarefas')}
        />
        <StatCard
          title="Tarefas Internas"
          icon={getTaskIcon(TipoPrazo.ADMINISTRATIVO, "w-5 h-5")}
          iconColor="text-amber-700 bg-[#efebe9]"
          stats={statsTarefas}
          isFeminine={true}
          onClick={() => navigate('/tarefas')}
        />
        <StatCard
          title="Protocolos"
          icon={getTaskIcon(TipoPrazo.PROTOCOLO, "w-5 h-5")}
          iconColor="text-indigo-500 bg-indigo-50"
          stats={statsProtocolos}
          onClick={() => navigate('/tarefas')}
        />
        <StatCard
          title="Audiências"
          icon={getTaskIcon(TipoPrazo.AUDIENCIA, "w-5 h-5")}
          iconColor="text-orange-500 bg-orange-50"
          stats={statsAudiencias}
          isFeminine={true}
          onClick={() => navigate('/tarefas')}
        />
      </div>

      {/* Main Grid: Weekly Calendar */}
      <div className="grid grid-cols-1 gap-8">

        {/* Weekly Calendar Column - Full Width */}
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-[#0b1726] flex items-center gap-3">
              <CalendarIcon className="w-6 h-6 text-indigo-600" />
              Agenda Semanal
            </h2>
            <div className="flex items-center gap-4 bg-gray-50 p-1.5 rounded-2xl">
              <button onClick={() => setCurrentWeekOffset(prev => prev - 1)} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-gray-400"><ChevronLeft className="w-5 h-5" /></button>
              <span className="text-xs font-black text-gray-600 uppercase tracking-widest px-2">
                {weekDays[0].date.toLocaleDateString('pt-BR', { month: 'short' })} {weekDays[0].dayNum} - {weekDays[6].date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })} {weekDays[6].dayNum}
              </span>
              <button onClick={() => setCurrentWeekOffset(prev => prev + 1)} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-gray-400"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-4 flex-1">
            {weekDays.map((day) => {
              const isToday = day.dateStr === todayBR;
              const events = getEventsForDate(day.dateStr);
              return (
                <div key={day.dateStr} className={`flex flex-col rounded-[32px] p-4 border transition-all ${isToday ? 'bg-indigo-50/40 border-indigo-100 shadow-sm' : 'border-gray-50'}`}>
                  <div className="text-center mb-4">
                    <p className={`text-[10px] font-black uppercase mb-2 ${isToday ? 'text-indigo-600' : 'text-gray-400'}`}>{day.dayName}</p>
                    <div className={`w-10 h-10 flex items-center justify-center mx-auto rounded-xl text-sm font-black transition-all ${isToday ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-700 bg-gray-50'}`}>
                      {day.dayNum}
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto max-h-[250px] custom-scroll pr-1">
                    {events.map((ev: any) => (
                      <div key={ev.id} className={`p-2 rounded-xl text-[9px] font-bold border shadow-sm leading-tight ${getEventColor(ev)}`}>
                        {ev.eventType === 'FINANCE' ? `$ ${ev.descricao}` : ev.descricao}
                      </div>
                    ))}
                    {events.length === 0 && <div className="h-full flex items-center justify-center opacity-20"><CalendarIcon className="w-4 h-4 text-gray-300" /></div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

const StatCard = ({ title, icon, iconColor, stats, onClick, isFeminine }: any) => {
  return (
    <div
      onClick={onClick}
      className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-all group"
    >
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">{title}</h3>
        <div className={`p-2.5 rounded-xl ${iconColor} transition-transform group-hover:scale-110 shadow-sm`}>
          {icon}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-center">
          <p className={`text-xl font-black ${stats.atrasados > 0 ? 'text-rose-500' : 'text-gray-800'}`}>
            {stats.atrasados}
          </p>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">
            {isFeminine ? 'Atrasadas' : 'Atrasados'}
          </p>
        </div>
        <div className="w-px h-8 bg-gray-100"></div>
        <div className="text-center">
          <p className={`text-xl font-black ${stats.hoje > 0 ? 'text-amber-500' : 'text-gray-800'}`}>
            {stats.hoje}
          </p>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Para Hoje</p>
        </div>
        <div className="w-px h-8 bg-gray-100"></div>
        <div className="text-center">
          <p className={`text-xl font-black ${stats.proximos > 0 ? 'text-emerald-500' : 'text-gray-800'}`}>
            {stats.proximos}
          </p>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">
            {isFeminine ? 'Próximas' : 'Próximos'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
