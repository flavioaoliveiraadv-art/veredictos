
import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  Scale,
  DollarSign,
  X,
  Activity,
  AlertTriangle
} from 'lucide-react';
import {
  Prazo,
  Processo,
  Cliente,
  TipoPrazo,
  Financeiro
} from '../types';
import {
  formatCurrency,
  getTodayBR
} from '../utils/formatters';

interface AgendaPageProps {
  prazos: Prazo[];
  processos: Processo[];
  clientes: Cliente[];
  financeiro: Financeiro[];
}

const AgendaPage: React.FC<AgendaPageProps> = ({
  prazos, processos, clientes, financeiro
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const todayBR = getTodayBR();

  // --- Lógica do Calendário ---
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const daysInMonth = lastDay.getDate();
    const startOffset = firstDay.getDay(); // 0 (Sun) to 6 (Sat)

    const totalSlots = Math.ceil((daysInMonth + startOffset) / 7) * 7;

    return Array.from({ length: totalSlots }).map((_, i) => {
      const dayNum = i - startOffset + 1;
      if (dayNum > 0 && dayNum <= daysInMonth) {
        const dateObj = new Date(year, month, dayNum);
        const dateStr = dateObj.toLocaleDateString('pt-BR');

        // Coletar Tarefas/Prazos
        const taskEvents = prazos.filter(p => p.dataVencimento === dateStr);

        // Coletar Financeiro
        const financialEvents = financeiro.filter(f => f.dataVencimento === dateStr);

        return {
          dayNum,
          dateStr,
          isToday: dateStr === todayBR,
          events: [
            ...taskEvents.map(t => ({ ...t, eventType: 'TASK' })),
            ...financialEvents.map(f => ({ ...f, eventType: 'FINANCE' }))
          ]
        };
      }
      return { dayNum: null, dateStr: null, isToday: false, events: [] };
    });
  }, [currentDate, prazos, financeiro, todayBR]);

  const monthsBr = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const weekdaysBr = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const changeMonth = (delta: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const getEventColor = (event: any) => {
    if (event.eventType === 'FINANCE') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    switch (event.tipo) {
      case TipoPrazo.PRAZO: return 'bg-rose-50 text-rose-600 border-rose-100';
      case TipoPrazo.AUDIENCIA: return 'bg-orange-50 text-orange-600 border-orange-100';
      default: return 'bg-indigo-50 text-indigo-600 border-indigo-100';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[1400px] mx-auto pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0b1726]">Agenda Consolidada</h1>
          <p className="text-gray-500 font-medium">Visualização temporal de todas as atividades e finanças do escritório.</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-50 rounded-xl transition-all"><ChevronLeft className="w-5 h-5 text-gray-400" /></button>
          <span className="text-sm font-black text-gray-700 uppercase tracking-widest min-w-[160px] text-center">
            {monthsBr[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-50 rounded-xl transition-all"><ChevronRight className="w-5 h-5 text-gray-400" /></button>
        </div>
      </header>

      <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[500px]">
        {/* Weekday Header */}
        <div className="grid grid-cols-7 bg-gray-50/50 border-b border-gray-100">
          {weekdaysBr.map(day => (
            <div key={day} className="py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 flex-1">
          {calendarDays.map((day, idx) => (
            <div
              key={idx}
              className={`min-h-[90px] p-2 border-r border-b border-gray-50 transition-colors ${day.dayNum ? 'hover:bg-gray-50/30' : 'bg-gray-50/10'}`}
            >
              {day.dayNum && (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-black transition-all ${day.isToday ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-400'}`}>
                      {day.dayNum}
                    </span>
                  </div>
                  <div className="space-y-1 overflow-y-auto max-h-[60px] custom-scroll pr-1">
                    {day.events.map((ev: any, evIdx: number) => (
                      <div
                        key={evIdx}
                        onClick={() => setSelectedEvent(ev)}
                        className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight truncate border cursor-pointer hover:shadow-sm transition-all ${getEventColor(ev)}`}
                      >
                        {ev.eventType === 'FINANCE' ? `$ ${ev.descricao}` : ev.descricao}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Detalhes do Evento (Read-Only) */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl p-10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-10">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${getEventColor(selectedEvent)} shadow-sm`}>
                  {selectedEvent.eventType === 'FINANCE' ? <DollarSign className="w-6 h-6" /> : <Activity className="w-6 h-6" />}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-800 tracking-tighter">{selectedEvent.descricao}</h2>
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{selectedEvent.eventType === 'FINANCE' ? 'Financeiro' : selectedEvent.tipo}</p>
                </div>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="p-2 text-gray-400 hover:text-gray-600"><X className="w-8 h-8" /></button>
            </div>

            <div className="space-y-6">
              <DetailItem label="Data Agendada" value={`${selectedEvent.dataVencimento}${selectedEvent.horaVencimento ? ` às ${selectedEvent.horaVencimento}` : ''}`} icon={<Clock className="w-4 h-4" />} />

              {selectedEvent.eventType === 'TASK' ? (
                <>
                  <DetailItem label="Cliente" value={clientes.find(c => c.id === selectedEvent.clienteId)?.nome || '-'} icon={<User className="w-4 h-4" />} />
                  <DetailItem label="Responsável" value={selectedEvent.responsavel} icon={<User className="w-4 h-4" />} />
                  {selectedEvent.processoId && (
                    <DetailItem label="Processo" value={processos.find(p => p.id === selectedEvent.processoId)?.numeros[0] || '-'} icon={<Scale className="w-4 h-4" />} />
                  )}
                  {selectedEvent.dataFatal && (
                    <DetailItem label="Data Fatal" value={selectedEvent.dataFatal} icon={<AlertTriangle className="w-4 h-4 text-rose-500" />} />
                  )}
                </>
              ) : (
                <>
                  <DetailItem label="Valor" value={formatCurrency(selectedEvent.valor)} icon={<DollarSign className="w-4 h-4" />} />
                  <DetailItem label="Tipo de Lançamento" value={selectedEvent.tipo} />
                  <DetailItem label="Status Financeiro" value={selectedEvent.status} />
                </>
              )}
            </div>

            <p className="mt-10 p-4 bg-gray-50 rounded-2xl text-[10px] font-bold text-gray-400 text-center uppercase tracking-widest border border-dashed border-gray-200">
              Acesse o módulo correspondente para realizar alterações.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailItem = ({ label, value, icon }: any) => (
  <div className="flex items-start gap-3">
    {icon && <div className="mt-1 text-gray-400">{icon}</div>}
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-sm font-black text-gray-800">{value}</p>
    </div>
  </div>
);

export default AgendaPage;
