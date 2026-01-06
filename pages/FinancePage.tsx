
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  X, 
  History, 
  Edit, 
  Trash2, 
  CheckCircle,
  Calendar,
  User,
  Briefcase,
  FileText,
  DollarSign,
  ArrowRight,
  ChevronRight,
  Clock,
  ChevronLeft,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import { Financeiro, StatusFinanceiro, Cliente, Processo, Prazo, HistoricoAlteracao } from '../types';
import { formatCurrency, maskCurrency, parseCurrency, maskDate, getTodayBR, compareDatesBR } from '../utils/formatters';

interface FinancePageProps {
  financeiro: Financeiro[];
  setFinanceiro: React.Dispatch<React.SetStateAction<Financeiro[]>>;
  clientes: Cliente[];
  processos: Processo[];
  prazos?: Prazo[];
}

const FinancePage: React.FC<FinancePageProps> = ({ financeiro, setFinanceiro, clientes, processos, prazos = [] }) => {
  const [activeTab, setActiveTab] = useState<'RESUMO' | 'LANCAMENTOS' | 'FLUXO'>(() => {
    const saved = localStorage.getItem('legalpro_finance_active_tab');
    return (saved as 'RESUMO' | 'LANCAMENTOS' | 'FLUXO') || 'RESUMO';
  });

  const [activeSubTab, setActiveSubTab] = useState<'PENDENTES' | 'PAGOS'>('PENDENTES');
  
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const [selectedEntry, setSelectedEntry] = useState<Financeiro | null>(null);
  
  const [formData, setFormData] = useState<Partial<Financeiro>>({
    tipo: 'Receita',
    descricao: '',
    valor: 0,
    parcela: '1/1',
    dataVencimento: getTodayBR(),
    status: StatusFinanceiro.PENDENTE,
    processoId: '',
    clienteId: '',
    tarefaVinculadaId: ''
  });

  useEffect(() => {
    localStorage.setItem('legalpro_finance_active_tab', activeTab);
  }, [activeTab]);

  const [localHistory, setLocalHistory] = useState<HistoricoAlteracao[]>(() => {
    const saved = localStorage.getItem('legalpro_finance_history');
    return saved ? JSON.parse(saved) : [];
  });

  const saveHistory = (idRef: string, msg: string) => {
    const newEntry: HistoricoAlteracao = {
      id: `h-fin-${Date.now()}`,
      idReferencia: idRef,
      dataHora: new Date().toLocaleString('pt-BR'),
      descricao: msg
    };
    const updated = [newEntry, ...localHistory];
    setLocalHistory(updated);
    localStorage.setItem('legalpro_finance_history', JSON.stringify(updated));
  };

  useEffect(() => {
    if (formData.processoId && formData.processoId !== '') {
      const proc = processos.find(p => p.id === formData.processoId);
      if (proc && proc.clienteId !== formData.clienteId) {
        setFormData(prev => ({ ...prev, clienteId: proc.clienteId }));
      }
    }
  }, [formData.processoId, processos]);

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const id = formData.id || `f-${Date.now()}`;
    const isNew = !formData.id;
    
    const newEntry: Financeiro = {
      ...formData,
      id,
      valor: formData.valor || 0,
      status: formData.status || StatusFinanceiro.PENDENTE,
      parcela: formData.parcela || '1/1'
    } as Financeiro;

    if (isNew) {
      setFinanceiro(prev => [...prev, newEntry]);
      saveHistory(id, "Lançamento criado no sistema.");
    } else {
      setFinanceiro(prev => prev.map(f => f.id === id ? newEntry : f));
      saveHistory(id, "Lançamento editado.");
    }
    
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ 
      tipo: 'Receita', 
      descricao: '',
      valor: 0, 
      parcela: '1/1', 
      dataVencimento: getTodayBR(), 
      status: StatusFinanceiro.PENDENTE,
      processoId: '',
      clienteId: '',
      tarefaVinculadaId: ''
    });
  };

  // Função de Exclusão Corrigida
  const handleDeleteEntry = (id: string) => {
    if (confirm("AVISO: Esta é uma exclusão definitiva. O lançamento financeiro será removido permanentemente do sistema. Deseja confirmar a exclusão?")) {
      setFinanceiro(prev => prev.filter(f => f.id !== id));
      setIsDetailModalOpen(false);
      setSelectedEntry(null);
    }
  };

  const handleMarkAsPaid = (entry: Financeiro) => {
    const today = getTodayBR();
    const updated: Financeiro = {
      ...entry,
      status: StatusFinanceiro.PAGO,
      dataPagamento: today
    };
    setFinanceiro(prev => prev.map(f => f.id === entry.id ? updated : f));
    saveHistory(entry.id, `Status alterado para Pago em ${today}.`);
    setIsDetailModalOpen(false);
    setSelectedEntry(null);
  };

  const todayStr = getTodayBR();

  const monthlyStats = useMemo(() => {
    const monthData = financeiro.filter(f => {
      const [d, m, y] = f.dataVencimento.split('/').map(Number);
      const date = new Date(y, m - 1, d);
      return date.getMonth() === viewMonth && date.getFullYear() === viewYear;
    });

    const entradas = monthData.filter(f => f.tipo === 'Receita').reduce((s, f) => s + f.valor, 0);
    const saidas = monthData.filter(f => f.tipo === 'Despesa').reduce((s, f) => s + f.valor, 0);
    const saldo = entradas - saidas;
    
    return { entradas, saidas, saldo, monthData };
  }, [financeiro, viewMonth, viewYear]);

  const cashFlowData = useMemo(() => {
    const sorted = [...financeiro].sort((a, b) => compareDatesBR(a.dataVencimento, b.dataVencimento));
    let accumulated = 0;
    return sorted.map(f => {
      const delta = f.tipo === 'Receita' ? f.valor : -f.valor;
      accumulated += delta;
      return { ...f, saldoAcumulado: accumulated };
    });
  }, [financeiro]);

  const filteredLançamentos = useMemo(() => {
    if (activeSubTab === 'PENDENTES') {
      return financeiro
        .filter(f => f.status !== StatusFinanceiro.PAGO)
        .sort((a, b) => compareDatesBR(a.dataVencimento, b.dataVencimento));
    } else {
      return financeiro
        .filter(f => f.status === StatusFinanceiro.PAGO)
        .sort((a, b) => compareDatesBR(b.dataVencimento, a.dataVencimento));
    }
  }, [financeiro, activeSubTab]);

  const totalProjetado = useMemo(() => {
    const receitas = financeiro.filter(f => f.tipo === 'Receita').reduce((s, f) => s + f.valor, 0);
    const despesas = financeiro.filter(f => f.tipo === 'Despesa').reduce((s, f) => s + f.valor, 0);
    return receitas - despesas;
  }, [financeiro]);

  const monthsBr = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const changeMonth = (delta: number) => {
    let newMonth = viewMonth + delta;
    let newYear = viewYear;
    if (newMonth < 0) { newMonth = 11; newYear -= 1; }
    else if (newMonth > 11) { newMonth = 0; newYear += 1; }
    setViewMonth(newMonth);
    setViewYear(newYear);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0b1726] tracking-tight">Financeiro</h1>
          <p className="text-gray-500 font-medium">Gerenciamento centralizado de financeiro.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-[#4f46e5] hover:bg-[#4338ca] text-white px-8 py-3 rounded-2xl flex items-center gap-2 font-black shadow-lg shadow-indigo-100 transition-all"
          >
            <Plus className="w-5 h-5" /> Novo Lançamento
          </button>
        </div>
      </header>

      <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-2xl w-fit">
        <button onClick={() => setActiveTab('RESUMO')} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'RESUMO' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>Resumo Mensal</button>
        <button onClick={() => setActiveTab('LANCAMENTOS')} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'LANCAMENTOS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>Lançamentos</button>
        <button onClick={() => setActiveTab('FLUXO')} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'FLUXO' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>Fluxo de Caixa</button>
      </div>

      {activeTab === 'RESUMO' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-gray-800 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-indigo-600" />
              Resumo de {monthsBr[viewMonth]} de {viewYear}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-indigo-600 transition-all"><ChevronLeft className="w-6 h-6" /></button>
              <button onClick={() => { setViewMonth(now.getMonth()); setViewYear(now.getFullYear()); }} className="px-4 py-2 text-xs font-black uppercase text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all">Este Mês</button>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-indigo-600 transition-all"><ChevronRight className="w-6 h-6" /></button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard label="Entradas do Mês" value={formatCurrency(monthlyStats.entradas)} icon={<TrendingUp className="w-6 h-6"/>} color="emerald" />
            <StatCard label="Saídas do Mês" value={formatCurrency(monthlyStats.saidas)} icon={<TrendingDown className="w-6 h-6"/>} color="rose" />
            <StatCard label="Saldo do Mês" value={formatCurrency(monthlyStats.saldo)} icon={<Wallet className="w-6 h-6"/>} color="blue" />
            <StatCard label="Saldo Projetado Total" value={formatCurrency(totalProjetado)} icon={<DollarSign className="w-6 h-6"/>} color="indigo" />
          </div>

          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
             <div className="p-8 border-b border-gray-50">
                <h3 className="font-black text-gray-800 text-sm uppercase tracking-widest">Movimentações do Mês</h3>
             </div>
             <div className="divide-y divide-gray-50">
               {monthlyStats.monthData.length > 0 ? monthlyStats.monthData.map(f => (
                 <div key={f.id} onClick={() => { setSelectedEntry(f); setIsDetailModalOpen(true); }} className="p-6 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors group">
                    <div className="flex items-center gap-4">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.tipo === 'Receita' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                         {f.tipo === 'Receita' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                       </div>
                       <div>
                         <p className="text-sm font-black text-gray-800">{f.descricao}</p>
                         <p className="text-[10px] font-bold text-gray-400">Venc: {f.dataVencimento}</p>
                       </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black ${f.tipo === 'Receita' ? 'text-emerald-600' : 'text-rose-500'}`}>{f.tipo === 'Receita' ? '+' : '-'} {formatCurrency(f.valor)}</p>
                      <span className="text-[10px] font-black uppercase text-gray-400">{f.status}</span>
                    </div>
                 </div>
               )) : (
                 <div className="p-20 text-center text-gray-300 font-black uppercase tracking-widest text-xs">Nenhum lançamento registrado neste período.</div>
               )}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'LANCAMENTOS' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-8 border-b border-gray-200 pb-px">
            <button onClick={() => setActiveSubTab('PENDENTES')} className={`pb-4 text-sm font-black transition-all border-b-2 ${activeSubTab === 'PENDENTES' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Pendentes e Atrasados</button>
            <button onClick={() => setActiveSubTab('PAGOS')} className={`pb-4 text-sm font-black transition-all border-b-2 ${activeSubTab === 'PAGOS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Pagos</button>
          </div>

          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
               <h2 className="text-lg font-black text-gray-800">Histórico de Transações</h2>
               <div className="flex gap-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="text" placeholder="Filtrar por descrição..." className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500" />
                  </div>
               </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                    <th className="px-10 py-5">Descrição</th>
                    <th className="px-10 py-5">Cliente / Processo</th>
                    <th className="px-10 py-5">Vencimento</th>
                    <th className="px-10 py-5">Valor</th>
                    <th className="px-10 py-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredLançamentos.map(entry => (
                    <tr key={entry.id} onClick={() => { setSelectedEntry(entry); setIsDetailModalOpen(true); }} className="hover:bg-gray-50 cursor-pointer transition-colors group">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${entry.tipo === 'Receita' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                            {entry.tipo === 'Receita' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-800">{entry.descricao}</p>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${entry.tipo === 'Receita' ? 'text-emerald-500' : 'text-rose-500'}`}>{entry.tipo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <p className="text-xs font-black text-gray-700">{clientes.find(c => c.id === entry.clienteId)?.nome || '-'}</p>
                        <p className="text-[10px] font-bold text-gray-400">{processos.find(p => p.id === entry.processoId)?.numeros[0] || '-'}</p>
                      </td>
                      <td className="px-10 py-6"><p className="text-xs font-black text-gray-700">{entry.dataVencimento}</p></td>
                      <td className="px-10 py-6"><p className="text-sm font-black text-gray-800">{entry.tipo === 'Receita' ? '+' : '-'} {formatCurrency(entry.valor)}</p></td>
                      <td className="px-10 py-6">
                        {entry.status === StatusFinanceiro.PAGO ? (
                          <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">Pago</span>
                        ) : compareDatesBR(entry.dataVencimento, todayStr) < 0 ? (
                          <span className="px-4 py-1.5 bg-rose-50 text-rose-500 rounded-full text-[10px] font-black uppercase tracking-widest">Atrasado</span>
                        ) : entry.dataVencimento === todayStr ? (
                          <span className="px-4 py-1.5 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest">Para Hoje</span>
                        ) : (
                          <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">Pendente</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'FLUXO' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
           <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-gray-50">
                 <h2 className="text-xl font-black text-gray-800">Evolução do Fluxo de Caixa</h2>
                 <p className="text-sm text-gray-500 font-medium">Histórico acumulado de entradas, saídas e evolução do saldo.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 bg-gray-50/50">
                      <th className="px-10 py-5">Data</th>
                      <th className="px-10 py-5">Movimentação</th>
                      <th className="px-10 py-5">Valor</th>
                      <th className="px-10 py-5 text-right">Saldo Acumulado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {cashFlowData.map(f => (
                      <tr key={f.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-10 py-5 text-xs font-black text-gray-500">{f.dataVencimento}</td>
                        <td className="px-10 py-5"><p className="text-sm font-black text-gray-800">{f.descricao}</p></td>
                        <td className={`px-10 py-5 text-sm font-black ${f.tipo === 'Receita' ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {f.tipo === 'Receita' ? <ArrowUpRight className="inline w-4 h-4 mr-1" /> : <ArrowDownLeft className="inline w-4 h-4 mr-1" />}
                          {formatCurrency(f.valor)}
                        </td>
                        <td className={`px-10 py-5 text-right font-black text-sm ${f.saldoAcumulado >= 0 ? 'text-gray-800' : 'text-rose-600'}`}>
                          {formatCurrency(f.saldoAcumulado)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-default" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl animate-in zoom-in duration-300 flex flex-col overflow-hidden max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-8 pb-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                <DollarSign className="w-7 h-7 text-indigo-600" /> {formData.id ? 'Editar Lançamento' : 'Novo Lançamento Financeiro'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-8 h-8" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 custom-scroll">
              <form id="financeForm" onSubmit={handleSaveTransaction} className="space-y-6">
                <div className="flex p-1 bg-gray-100 rounded-2xl">
                  <button type="button" onClick={() => setFormData({...formData, tipo: 'Receita'})} className={`flex-1 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 ${formData.tipo === 'Receita' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>
                    <TrendingUp className="w-4 h-4" /> Receita
                  </button>
                  <button type="button" onClick={() => setFormData({...formData, tipo: 'Despesa'})} className={`flex-1 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 ${formData.tipo === 'Despesa' ? 'bg-white text-rose-500 shadow-sm' : 'text-gray-500'}`}>
                    <TrendingDown className="w-4 h-4" /> Despesa
                  </button>
                </div>

                <div className="space-y-4">
                  <FormInput label="Descrição" required placeholder="Ex: Honorários Sucumbenciais" value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} />
                  
                  <FormSelect label="Número do Processo" value={formData.processoId} onChange={e => setFormData({...formData, processoId: e.target.value})}>
                    <option value="">Não relacionado a processo</option>
                    {processos.map(p => <option key={p.id} value={p.id}>{p.numeros[0]} - {p.objeto}</option>)}
                  </FormSelect>

                  <div className="grid grid-cols-2 gap-4">
                    <FormInput label="Valor" required placeholder="R$ 0,00" value={formatCurrency(formData.valor || 0)} onChange={(e: any) => setFormData({...formData, valor: parseCurrency(e.target.value)})} />
                    <FormInput label="Parcela" placeholder="1/1" value={formData.parcela} onChange={e => setFormData({...formData, parcela: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Cliente / Fornecedor</label>
                    <select 
                      disabled={!!formData.processoId && formData.processoId !== ''}
                      value={formData.clienteId}
                      onChange={e => setFormData({...formData, clienteId: e.target.value})}
                      className={`w-full px-5 py-4 rounded-2xl border outline-none font-bold text-sm transition-all shadow-sm appearance-none ${!!formData.processoId && formData.processoId !== '' ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white border-gray-300 text-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'}`}
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1rem' }}
                    >
                      <option value="">Nome do cliente ou fornecedor</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>

                  <FormInput label="Vencimento" placeholder="dd/mm/aaaa" required value={formData.dataVencimento} onChange={e => setFormData({...formData, dataVencimento: maskDate(e.target.value)})} />
                  
                  <FormSelect label="Vínculo com Tarefa" value={formData.tarefaVinculadaId} onChange={e => setFormData({...formData, tarefaVinculadaId: e.target.value})}>
                    <option value="">Nenhuma tarefa vinculada</option>
                    {prazos.map(t => <option key={t.id} value={t.id}>{t.descricao}</option>)}
                  </FormSelect>
                </div>
              </form>
            </div>

            <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex gap-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-white border border-gray-300 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 transition-all">Cancelar</button>
              <button type="submit" form="financeForm" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">Salvar Lançamento</button>
            </div>
          </div>
        </div>
      )}

      {isDetailModalOpen && selectedEntry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-default" onClick={() => setIsDetailModalOpen(false)}>
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl animate-in zoom-in duration-300 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-8 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-black text-gray-800">Detalhes do Lançamento</h2>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => { setFormData(selectedEntry); setIsModalOpen(true); setIsDetailModalOpen(false); }} className="p-2 text-gray-400 hover:text-indigo-600 transition-all" title="Editar"><Edit className="w-5 h-5" /></button>
                <button onClick={() => handleDeleteEntry(selectedEntry.id)} className="p-2 text-gray-400 hover:text-rose-500 transition-all" title="Excluir"><Trash2 className="w-5 h-5" /></button>
                <button onClick={() => setIsHistoryModalOpen(true)} className="p-2 text-gray-400 hover:text-indigo-600 transition-all" title="Ver Histórico"><History className="w-5 h-5" /></button>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 transition-all" title="Fechar"><X className="w-7 h-7" /></button>
              </div>
            </div>

            <div className="p-10 space-y-10">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-black text-gray-800 mb-1">{selectedEntry.descricao}</h3>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${selectedEntry.tipo === 'Receita' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                    {selectedEntry.tipo}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-gray-800">{formatCurrency(selectedEntry.valor)}</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Parcela {selectedEntry.parcela}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-8">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Vencimento</p>
                  <p className="text-sm font-black text-gray-700">{selectedEntry.dataVencimento}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                  {selectedEntry.status === StatusFinanceiro.PAGO ? (
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest">Pago</span>
                  ) : compareDatesBR(selectedEntry.dataVencimento, todayStr) < 0 ? (
                    <span className="px-3 py-1 bg-rose-50 text-rose-500 rounded-full text-[9px] font-black uppercase tracking-widest">Atrasado</span>
                  ) : selectedEntry.dataVencimento === todayStr ? (
                    <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black uppercase tracking-widest">Para Hoje</span>
                  ) : (
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-widest">Pendente</span>
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cliente</p>
                  <p className="text-sm font-black text-gray-700">{clientes.find(c => c.id === selectedEntry.clienteId)?.nome || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Processo</p>
                  <p className="text-sm font-black text-gray-700">{processos.find(p => p.id === selectedEntry.processoId)?.numeros[0] || '-'}</p>
                </div>

                {selectedEntry.dataPagamento && (
                  <div className="col-span-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Data de Pagamento</p>
                    <p className="text-sm font-black text-emerald-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> {selectedEntry.dataPagamento}
                    </p>
                  </div>
                )}
              </div>

              {selectedEntry.status !== StatusFinanceiro.PAGO && (
                <button 
                  onClick={() => handleMarkAsPaid(selectedEntry)}
                  className="w-full py-5 bg-[#00a16b] hover:bg-[#008f5e] text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 transition-all"
                >
                  <CheckCircle className="w-5 h-5" /> Marcar como Pago
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isHistoryModalOpen && selectedEntry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 cursor-default" onClick={() => setIsHistoryModalOpen(false)}>
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-gray-800 flex items-center gap-3"><History className="w-6 h-6 text-indigo-600" /> Histórico do Lançamento</h2>
                <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-400 hover:text-gray-800 transition-colors"><X className="w-7 h-7" /></button>
              </div>
              <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scroll">
                {localHistory.filter(h => h.idReferencia === selectedEntry.id).map((h, i, arr) => (
                  <div key={h.id} className="relative pl-10">
                    <div className="absolute left-0 top-1.5 w-7 h-7 rounded-full border-4 border-white shadow bg-indigo-600 flex items-center justify-center z-10"><div className="w-1.5 h-1.5 rounded-full bg-white"></div></div>
                    {i !== arr.length - 1 && <div className="absolute left-3 top-6 bottom-[-32px] w-0.5 bg-gray-100"></div>}
                    <p className="text-[10px] font-black text-gray-400 mb-1">{h.dataHora}</p>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100"><p className="text-xs font-bold text-gray-700 leading-relaxed">{h.descricao}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string, value: string, icon: React.ReactNode, color: 'emerald' | 'rose' | 'blue' | 'indigo' }> = ({ label, value, icon, color }) => {
  const themes = {
    emerald: 'bg-emerald-50 text-emerald-500 border-emerald-100',
    rose: 'bg-rose-50 text-rose-500 border-rose-100',
    blue: 'bg-blue-50 text-blue-500 border-blue-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100'
  };
  return (
    <div className={`p-8 bg-white rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-5 transition-all hover:shadow-md hover:-translate-y-1`}>
      <div className={`p-4 rounded-2xl ${themes[color].split(' ').slice(0, 2).join(' ')}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black text-gray-800">{value}</p>
      </div>
    </div>
  );
};

const FormInput = ({ label, ...props }: any) => (
  <div className="space-y-2">
    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{label}</label>
    <input 
      {...props} 
      className="w-full px-5 py-4 bg-white rounded-2xl border border-gray-300 placeholder-gray-400 text-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none font-bold text-sm transition-all shadow-sm" 
    />
  </div>
);

const FormSelect = ({ label, children, ...props }: any) => (
  <div className="space-y-2">
    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{label}</label>
    <select 
      {...props} 
      className="w-full px-5 py-4 bg-white rounded-2xl border border-gray-300 text-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none font-bold text-sm transition-all shadow-sm appearance-none"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1rem' }}
    >
      {children}
    </select>
  </div>
);

export default FinancePage;
