
import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, FileText, Scale, Clock, AlertTriangle,
  Trash2, Edit, History, X, CheckCircle2, ChevronRight, Save,
  Filter, Calendar, Activity, RotateCcw, ArrowUpRight, Briefcase,
  User, DollarSign, CheckSquare, XCircle
} from 'lucide-react';
import {
  Processo, Cliente, StatusProcesso, Prazo, Recurso, HistoricoAlteracao,
  AreaAtuacao, FaseProcessual, Financeiro, TipoPrazo, Andamento, TipoAndamento, ProvidenciaAndamento
} from '../types';
import { formatCurrency, maskCurrency, parseCurrency, maskDate, getTodayBR, compareDatesBR, toBRDate, toISODate } from '../utils/formatters';

interface ProcessesPageProps {
  processos: Processo[];
  setProcessos: React.Dispatch<React.SetStateAction<Processo[]>>;
  clientes: Cliente[];
  setPrazos: React.Dispatch<React.SetStateAction<Prazo[]>>;
  prazos: Prazo[];
  recursos: Recurso[];
  setRecursos: React.Dispatch<React.SetStateAction<Recurso[]>>;
  historico: HistoricoAlteracao[];
  setHistorico: React.Dispatch<React.SetStateAction<HistoricoAlteracao[]>>;
  financeiro: Financeiro[];
}

const INITIAL_PROC_STATE: Partial<Processo> = { areaAtuacao: AreaAtuacao.CIVEL, faseProcessual: FaseProcessual.CONHECIMENTO, status: StatusProcesso.ATIVO, numeros: [''], valorCausa: 0, dataDistribuicao: getTodayBR(), polo: undefined, gratuidade: false };
const INITIAL_REC_STATE: Partial<Recurso> = { dataDistribuicao: getTodayBR(), gratuidade: false, status: StatusProcesso.ATIVO };

// Componentes Auxiliares (Movidos para o topo para evitar erros de declaração)
const DetailField = ({ label, value, className = "", icon }: { label: string, value: string, className?: string, icon?: React.ReactNode }) => (
  <div>
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">{icon} {label}</p>
    <p className={`text-sm font-bold text-gray-800 ${className}`}>{value}</p>
  </div>
);

const FormInput = ({ label, ...props }: any) => (
  <div className="space-y-2">
    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{label}</label>
    <input {...props} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-all" />
  </div>
);

const FormSelect = ({ label, children, ...props }: any) => (
  <div className="space-y-2">
    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{label}</label>
    <select {...props} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-all appearance-none">{children}</select>
  </div>
);

const ProcessesPage: React.FC<ProcessesPageProps> = ({
  processos, setProcessos, clientes, setPrazos, prazos, recursos, setRecursos, historico, setHistorico, financeiro
}) => {
  const [activeTab, setActiveTab] = useState<'ATIVO' | 'ARQUIVADO'>('ATIVO');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcModalOpen, setIsProcModalOpen] = useState(false);
  const [isRecModalOpen, setIsRecModalOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<Processo | null>(null);
  const [selectedRecurso, setSelectedRecurso] = useState<Recurso | null>(null);
  const [isHistoryLogModalOpen, setIsHistoryLogModalOpen] = useState(false);

  // Form States
  const [procFormData, setProcFormData] = useState<Partial<Processo>>(INITIAL_PROC_STATE);
  const [recFormData, setRecFormData] = useState<Partial<Recurso>>(INITIAL_REC_STATE);

  // Tabs inside Details Modal
  const [subTab, setSubTab] = useState<'DADOS' | 'PARTES' | 'TAREFAS' | 'ANDAMENTOS' | 'FINANCEIRO'>('DADOS');

  // Andamento States
  const [isAndamentoModalOpen, setIsAndamentoModalOpen] = useState(false);
  const [andamentoFormData, setAndamentoFormData] = useState<Partial<Andamento>>({
    data: getTodayBR(),
    tipo: TipoAndamento.INTIMACAO,
    conteudo: '',
    geraPrazo: false,
    providencia: ProvidenciaAndamento.CIENCIA
  });

  // Quick Prazo States
  const [isQuickPrazoModalOpen, setIsQuickPrazoModalOpen] = useState(false);
  const [quickPrazoData, setQuickPrazoData] = useState<Partial<Prazo>>({});
  const [pendingAndamentoId, setPendingAndamentoId] = useState<string | null>(null);

  const addHistorico = (idReferencia: string, descricao: string) => {
    const entry: HistoricoAlteracao = {
      id: `h-${Date.now()}`,
      idReferencia,
      dataHora: new Date().toLocaleString('pt-BR'),
      descricao
    };
    setHistorico(prev => [entry, ...prev]);
  };

  // Listagem Unificada de Processos e Recursos
  const unificadaList = useMemo(() => {
    const targetStatus = activeTab === 'ATIVO' ? StatusProcesso.ATIVO : StatusProcesso.ARQUIVADO;

    // Processos filtrados
    const procs = processos.filter(p => {
      const matchesTab = p.status === targetStatus;
      const matchesSearch = p.objeto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.numeros.some(n => n.includes(searchTerm)) ||
        clientes.find(c => c.id === p.clienteId)?.nome.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTab && matchesSearch;
    }).map(p => ({ ...p, _tipoItem: 'PROCESSO' as const }));

    // Recursos filtrados
    const recs = recursos.filter(r => {
      const matchesTab = (r.status || StatusProcesso.ATIVO) === targetStatus;
      const cli = clientes.find(c => c.id === r.clienteId);
      const matchesSearch = r.tipoRecurso.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.numeroRecurso.includes(searchTerm) ||
        cli?.nome.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesTab && matchesSearch;
    }).map(r => ({ ...r, _tipoItem: 'RECURSO' as const }));

    return [...procs, ...recs].sort((a, b) => {
      const clienteA = clientes.find(c => c.id === a.clienteId)?.nome || '';
      const clienteB = clientes.find(c => c.id === b.clienteId)?.nome || '';

      const comparison = clienteA.localeCompare(clienteB);
      if (comparison !== 0) return comparison;

      const nomeA = (a as any).objeto || (a as any).tipoRecurso || '';
      const nomeB = (b as any).objeto || (b as any).tipoRecurso || '';
      return nomeA.localeCompare(nomeB);
    });
  }, [processos, recursos, activeTab, searchTerm, clientes]);

  const handleSaveProcess = (e: React.FormEvent) => {
    e.preventDefault();
    const id = procFormData.id || `proc-${Date.now()}`;
    const newProc: Processo = {
      ...procFormData,
      id,
      ultimaAtualizacao: getTodayBR(),
      numeros: procFormData.numeros?.filter(n => n.trim() !== '') || [],
      status: procFormData.status || StatusProcesso.ATIVO
    } as Processo;

    if (procFormData.id) {
      setProcessos(prev => prev.map(p => p.id === id ? newProc : p));
      addHistorico(id, 'Dados do processo atualizados.');
    } else {
      setProcessos(prev => [...prev, newProc]);
      addHistorico(id, 'Processo iniciado no sistema.');
    }
    setIsProcModalOpen(false);
    setSelectedProcess(null);
  };

  const handleSaveRecurso = (e: React.FormEvent) => {
    e.preventDefault();
    const id = recFormData.id || `rec-${Date.now()}`;
    const newRec: Recurso = {
      ...recFormData,
      id,
      status: recFormData.status || StatusProcesso.ATIVO,
      ultimaAtualizacao: getTodayBR()
    } as Recurso;

    if (recFormData.id) {
      setRecursos(prev => prev.map(r => r.id === id ? newRec : r));
      addHistorico(newRec.processoOriginarioId, `Alterações salvas no recurso ${newRec.tipoRecurso}.`);
    } else {
      setRecursos(prev => [...prev, newRec]);
      addHistorico(newRec.processoOriginarioId, `Novo recurso cadastrado: ${newRec.tipoRecurso}.`);
    }

    setProcessos(prev => prev.map(p => p.id === newRec.processoOriginarioId ? { ...p, ultimaAtualizacao: getTodayBR() } : p));
    setIsRecModalOpen(false);
    setSelectedRecurso(null);
  };

  // Vínculo automático de cliente no cadastro de recurso
  useEffect(() => {
    if (recFormData.processoOriginarioId) {
      const pai = processos.find(p => p.id === recFormData.processoOriginarioId);
      if (pai && pai.clienteId !== recFormData.clienteId) {
        setRecFormData(prev => ({ ...prev, clienteId: pai.clienteId }));
      }
    }
  }, [recFormData.processoOriginarioId, processos]);

  // Função de Exclusão de Recurso Corrigida
  const deleteRecurso = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('AVISO: Esta é uma exclusão permanente. O registro do recurso será removido definitivamente do sistema. Deseja confirmar a exclusão?')) {
      const rec = recursos.find(r => r.id === id);
      if (rec) {
        addHistorico(rec.processoOriginarioId, `Recurso ${rec.tipoRecurso} excluído definitivamente.`);
        setRecursos(prev => prev.filter(r => r.id !== id));
        setSelectedRecurso(null);
      }
    }
  };

  // Função de Exclusão de Processo Corrigida
  const deleteProcesso = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('AVISO CRÍTICO: Esta é uma exclusão permanente. Ao excluir este processo, TODOS os recursos vinculados a ele também serão removidos definitivamente. Deseja prosseguir com a exclusão?')) {
      setProcessos(prev => prev.filter(p => p.id !== id));
      setRecursos(prev => prev.filter(r => r.processoOriginarioId !== id));
      setSelectedProcess(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0b1726]">Processos e Recursos</h1>
          <p className="text-gray-500 font-medium">Gestão unificada de acervo judicial e recursos de 2º grau.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => { setProcFormData(INITIAL_PROC_STATE); setIsProcModalOpen(true); }}
            className="bg-[#4f46e5] hover:bg-[#4338ca] text-white px-8 py-3 rounded-2xl flex items-center justify-center gap-2 font-black shadow-xl shadow-indigo-200 transition-all"
          >
            <Plus className="w-5 h-5" /> Novo Processo
          </button>
          <button
            onClick={() => { setRecFormData(INITIAL_REC_STATE); setIsRecModalOpen(true); }}
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all shadow-sm"
          >
            <ArrowUpRight className="w-5 h-5 text-indigo-500" /> Novo Recurso
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-[32px] shadow-sm border border-gray-100">
        <div className="flex items-center bg-gray-100 p-1 rounded-2xl w-full md:w-auto">
          <button onClick={() => setActiveTab('ATIVO')} className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'ATIVO' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>Ativos</button>
          <button onClick={() => setActiveTab('ARQUIVADO')} className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'ARQUIVADO' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>Arquivados</button>
        </div>
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="text" placeholder="Buscar por número, cliente ou objeto..." className="w-full pl-12 pr-4 py-3.5 bg-gray-50 rounded-2xl border border-gray-100 outline-none font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="space-y-4">
        {unificadaList.map(item => {
          if (item._tipoItem === 'PROCESSO') {
            const proc = item as Processo;
            const cli = clientes.find(c => c.id === proc.clienteId);
            return (
              <div
                key={proc.id}
                onClick={() => setSelectedProcess(proc)}
                className="bg-white p-6 rounded-[32px] border border-gray-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all cursor-pointer flex items-center justify-between group relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500"></div>
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                    <Briefcase className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="bg-indigo-100 text-indigo-700 text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest">PROCESSO</span>
                      <h3 className="text-lg font-black text-gray-800 leading-tight">{proc.numeros[0]}</h3>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-indigo-600 truncate max-w-md">{proc.objeto}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-gray-400">
                        <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {cli?.nome}</span>
                        <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Contra: {proc.parteContraria}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-black uppercase tracking-tighter bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" /> Atualizado em {proc.ultimaAtualizacao}
                  </div>
                  <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${proc.status === StatusProcesso.ATIVO ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>{proc.status}</span>
                </div>
              </div>
            );
          } else {
            const rec = item as Recurso;
            const cli = clientes.find(c => c.id === rec.clienteId);
            const pai = processos.find(p => p.id === rec.processoOriginarioId);
            return (
              <div
                key={rec.id}
                onClick={() => setSelectedRecurso(rec)}
                className="bg-white p-6 rounded-[32px] border border-orange-100 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-500/5 transition-all cursor-pointer flex items-center justify-between group relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-400"></div>
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all shadow-sm">
                    <Scale className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="bg-orange-100 text-orange-700 text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest">RECURSO - 2º GRAU</span>
                      <h3 className="text-lg font-black text-gray-800 leading-tight">{rec.tipoRecurso}</h3>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-orange-600">{rec.numeroRecurso}</p>
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-tighter">Ref: {pai?.numeros[0]}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-gray-400">
                        <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {cli?.nome}</span>
                        <span className="flex items-center gap-1.5 bg-rose-50 text-rose-500 px-2 py-0.5 rounded text-[8px] uppercase font-black tracking-widest">Processo em 2º Grau</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-black uppercase tracking-tighter bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                    <Clock className="w-3.5 h-3.5 text-orange-400" /> Atualizado em {rec.ultimaAtualizacao || rec.dataDistribuicao}
                  </div>
                  <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${rec.status === StatusProcesso.ATIVO ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>{rec.status === StatusProcesso.ATIVO ? 'RECURSO ATIVO' : 'RECURSO ARQUIVADO'}</span>
                </div>
              </div>
            );
          }
        })}

        {unificadaList.length === 0 && (
          <div className="p-20 text-center">
            <Search className="w-10 h-10 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-bold italic">Nenhum processo ou recurso encontrado.</p>
          </div>
        )}
      </div>

      {/* MODAL DETALHES PROCESSO */}
      {selectedProcess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 flex items-center justify-center p-4" onClick={() => setSelectedProcess(null)}>
          <div className="bg-white rounded-[40px] w-full max-w-6xl shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-10 flex-1 overflow-y-auto custom-scroll">
              <div className="flex items-start justify-between mb-10">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-100">
                    <Briefcase className="w-9 h-9" />
                  </div>
                  <div>
                    <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-widest mb-1 inline-block">FICHA DO PROCESSO</span>
                    <h2 className="text-3xl font-black text-gray-800 tracking-tighter leading-none">{selectedProcess.numeros[0]}</h2>
                    <p className="text-base font-bold text-indigo-600 mt-1">{clientes.find(c => c.id === selectedProcess.clienteId)?.nome}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsHistoryLogModalOpen(true)} className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all" title="Ver Histórico"><History className="w-6 h-6" /></button>
                  <button onClick={() => { setProcFormData(selectedProcess); setIsProcModalOpen(true); }} className="p-3 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-2xl transition-all" title="Editar Processo"><Edit className="w-6 h-6" /></button>
                  <button onClick={(e) => deleteProcesso(e, selectedProcess.id)} className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all" title="Excluir Processo"><Trash2 className="w-6 h-6" /></button>
                  <button onClick={() => setSelectedProcess(null)} className="p-3 text-gray-400 hover:text-gray-800 rounded-2xl transition-all ml-4" title="Fechar"><X className="w-8 h-8" /></button>
                </div>
              </div>
              <div className="flex items-center gap-1 border-b border-gray-100 mb-8 overflow-x-auto custom-scroll pb-1">
                {[
                  { id: 'DADOS', label: 'Dados do Processo', icon: <FileText className="w-4 h-4" /> },
                  { id: 'TAREFAS', label: 'Tarefas e Prazos', icon: <CheckSquare className="w-4 h-4" /> },
                  { id: 'ANDAMENTOS', label: 'Andamentos', icon: <Activity className="w-4 h-4" /> },
                  { id: 'FINANCEIRO', label: 'Financeiro', icon: <DollarSign className="w-4 h-4" /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSubTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-3 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${subTab === tab.id ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="md:col-span-2">
                  {subTab === 'DADOS' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12 animate-in fade-in slide-in-from-bottom-2">
                      <div className="md:col-span-2">
                        <DetailField label="Objeto do Processo" value={selectedProcess.objeto} />
                      </div>
                      <DetailField label="Cliente / Contratante" value={clientes.find(c => c.id === selectedProcess.clienteId)?.nome || '-'} />
                      <DetailField label="Parte Contrária" value={selectedProcess.parteContraria || '-'} />
                      <DetailField label="Polo" value={selectedProcess.polo || '-'} />
                      <DetailField label="Fase Processual" value={selectedProcess.faseProcessual} />
                      <DetailField label="Área de Atuação" value={selectedProcess.areaAtuacao} />
                      <DetailField label="Vara / Local" value={selectedProcess.localTramitacao || '-'} />
                      <DetailField label="Comarca" value={selectedProcess.comarca || '-'} />
                      <DetailField label="Tribunal" value={selectedProcess.tribunal || '-'} />
                      <DetailField label="Distribuição" value={selectedProcess.dataDistribuicao || '-'} />
                      <DetailField label="Justiça Gratuita" value={selectedProcess.gratuidade ? 'Sim' : 'Não'} />
                      <DetailField label="Valor da Causa" value={formatCurrency(selectedProcess.valorCausa)} className="font-black" />
                      <DetailField label="Última Atualização" value={selectedProcess.ultimaAtualizacao} icon={<Clock className="w-3.5 h-3.5" />} />
                    </div>
                  )}


                  {subTab === 'TAREFAS' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                          <CheckSquare className="w-4 h-4" /> Tarefas e Prazos Judiciais
                        </h3>
                        <button
                          onClick={() => {
                            setQuickPrazoData({
                              descricao: '',
                              processoId: selectedProcess.id,
                              clienteId: selectedProcess.clienteId,
                              dataVencimento: getTodayBR(),
                              tipo: TipoPrazo.TAREFA,
                              responsavel: '',
                              critico: false,
                              concluido: false,
                              cancelado: false,
                              financeiroIds: []
                            });
                            setIsQuickPrazoModalOpen(true);
                          }}
                          className="text-indigo-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-all"
                        >
                          <Plus className="w-3 h-3" /> Nova Tarefa
                        </button>
                      </div>
                      <div className="space-y-3">
                        {prazos.filter(p => p.processoId === selectedProcess.id).length > 0 ? (
                          prazos.filter(p => p.processoId === selectedProcess.id).map(p => (
                            <div key={p.id} className="p-5 bg-white rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm hover:border-indigo-200 transition-all">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.concluido ? 'bg-emerald-50 text-emerald-500' : p.cancelado ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                  {p.concluido ? <CheckCircle2 className="w-5 h-5" /> : p.cancelado ? <XCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                </div>
                                <div>
                                  <p className="text-sm font-black text-gray-800">{p.descricao}</p>
                                  <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> Vence em: {p.dataVencimento}</span>
                                    {p.critico && <span className="bg-rose-100 text-rose-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">CRÍTICO</span>}
                                  </div>
                                </div>
                              </div>
                              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${p.concluido ? 'bg-emerald-100 text-emerald-600' : p.cancelado ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                                {p.concluido ? 'Realizado' : p.cancelado ? 'Cancelado' : 'Pendente'}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-12 bg-gray-50 rounded-[32px] border border-dashed border-gray-200">
                            <CheckSquare className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                            <p className="text-xs text-gray-400 font-bold italic">Nenhuma tarefa ou prazo vinculado a este processo.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {subTab === 'ANDAMENTOS' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                          <Activity className="w-4 h-4" /> Histórico de Andamentos Processuais
                        </h3>
                        <button
                          onClick={() => {
                            setAndamentoFormData({ data: getTodayBR(), tipo: TipoAndamento.INTIMACAO, conteudo: '', geraPrazo: false, providencia: ProvidenciaAndamento.CIENCIA });
                            setIsAndamentoModalOpen(true);
                          }}
                          className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2"
                        >
                          <Plus className="w-3 h-3" /> Novo Andamento
                        </button>
                      </div>

                      <div className="space-y-4">
                        {selectedProcess.andamentos && selectedProcess.andamentos.length > 0 ? (
                          [...selectedProcess.andamentos].reverse().map((and, idx) => (
                            <div key={and.id} className="relative pl-10">
                              <div className="absolute left-0 top-2 w-7 h-7 rounded-full border-4 border-white shadow bg-indigo-100 flex items-center justify-center z-10 text-indigo-600">
                                <Activity className="w-3 h-3" />
                              </div>
                              {idx !== selectedProcess.andamentos!.length - 1 && <div className="absolute left-3.5 top-8 bottom-[-24px] w-0.5 bg-indigo-50"></div>}

                              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:border-indigo-100 transition-all">
                                <div className="flex items-start justify-between mb-4">
                                  <div>
                                    <div className="flex items-center gap-3 mb-1">
                                      <span className="text-xs font-black text-gray-800">{and.data}</span>
                                      <span className="bg-indigo-50 text-indigo-600 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest">{and.tipo}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${and.geraPrazo ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {and.geraPrazo ? 'Gera Prazo' : 'Sem Prazo'}
                                      </span>
                                      <span className="text-[8px] font-black text-gray-300 uppercase tracking-tighter">— {and.providencia}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-50">
                                  <p className="text-sm font-medium text-gray-600 leading-relaxed whitespace-pre-wrap">{and.conteudo}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-16 bg-gray-50 rounded-[40px] border border-dashed border-gray-200">
                            <Activity className="w-10 h-10 text-gray-200 mx-auto mb-4" />
                            <p className="text-sm text-gray-400 font-bold italic mb-4">Inicie o registro cronológico dos andamentos.</p>
                            <button
                              onClick={() => setIsAndamentoModalOpen(true)}
                              className="text-indigo-600 text-xs font-black uppercase tracking-widest hover:underline"
                            >
                              Adicionar primeiro andamento
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {subTab === 'FINANCEIRO' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <DollarSign className="w-4 h-4" /> Lançamentos Financeiros Vinculados
                      </h3>
                      <div className="space-y-3">
                        {financeiro.filter(f => f.processoId === selectedProcess.id).length > 0 ? (
                          financeiro.filter(f => f.processoId === selectedProcess.id).map(f => (
                            <div key={f.id} className="p-5 bg-white rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm hover:border-indigo-200 transition-all">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.tipo === 'Receita' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                                  <DollarSign className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="text-sm font-black text-gray-800">{f.descricao}</p>
                                  <p className="text-[10px] font-bold text-gray-400">{f.dataVencimento}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-black ${f.tipo === 'Receita' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                  {f.tipo === 'Receita' ? '+' : '-'} {formatCurrency(f.valor)}
                                </p>
                                <span className={`text-[8px] font-black uppercase tracking-widest ${f.status === 'Pago' ? 'text-emerald-500' : 'text-amber-500'}`}>{f.status}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-12 bg-gray-50 rounded-[32px] border border-dashed border-gray-200">
                            <DollarSign className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                            <p className="text-xs text-gray-400 font-bold italic">Nenhum lançamento financeiro para este processo.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-6">
                  <div className="bg-gray-50 p-8 rounded-[40px] border border-gray-100">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Status e Controle</h4>
                    <div className="flex items-center justify-between p-5 bg-white rounded-3xl border border-gray-100 mb-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        <span className="text-sm font-black text-gray-700">Arquivar</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={selectedProcess.status === StatusProcesso.ARQUIVADO} onChange={() => {
                          const newStatus = selectedProcess.status === StatusProcesso.ARQUIVADO ? StatusProcesso.ATIVO : StatusProcesso.ARQUIVADO;
                          setProcessos(prev => prev.map(p => p.id === selectedProcess.id ? { ...p, status: newStatus } : p));
                          setSelectedProcess(null);
                        }} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
      }

      {/* MODAL DETALHES RECURSO */}
      {
        selectedRecurso && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4" onClick={() => setSelectedRecurso(null)}>
            <div className="bg-white rounded-[40px] w-full max-w-4xl shadow-2xl animate-in slide-in-from-bottom-10 duration-500 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-10">
                <div className="flex items-start justify-between mb-10">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border-2 border-orange-100 shadow-lg">
                      <Scale className="w-9 h-9" />
                    </div>
                    <div>
                      <span className="bg-orange-100 text-orange-700 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-widest mb-1 inline-block">DETALHES DO RECURSO - 2º GRAU</span>
                      <h2 className="text-3xl font-black text-gray-800 tracking-tighter leading-none">{selectedRecurso.tipoRecurso}</h2>
                      <p className="text-base font-bold text-orange-600 mt-1">Ref: {processos.find(p => p.id === selectedRecurso.processoOriginarioId)?.numeros[0]}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setRecFormData(selectedRecurso); setIsRecModalOpen(true); }} className="p-3 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-2xl transition-all" title="Editar Recurso"><Edit className="w-6 h-6" /></button>
                    <button onClick={(e) => deleteRecurso(e, selectedRecurso.id)} className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all" title="Excluir Recurso"><Trash2 className="w-6 h-6" /></button>
                    <button onClick={() => setSelectedRecurso(null)} className="p-3 text-gray-400 hover:text-gray-800 rounded-2xl transition-all ml-4" title="Fechar"><X className="w-8 h-8" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-12">
                    <DetailField label="Número do Recurso" value={selectedRecurso.numeroRecurso} />
                    <DetailField label="Local de Tramitação" value={selectedRecurso.localTramitacao} />
                    <DetailField label="Tribunal" value={selectedRecurso.tribunal} />
                    <DetailField label="Data de Distribuição" value={selectedRecurso.dataDistribuicao} />
                    <DetailField label="Cliente Vinculado" value={clientes.find(c => c.id === selectedRecurso.clienteId)?.nome || '-'} />
                    <DetailField label="Assistência Judiciária" value={selectedRecurso.gratuidade ? 'CONCEDIDA' : 'NEGADA / NÃO REQUERIDA'} />
                  </div>

                  <div className="space-y-6">
                    <div className="bg-gray-50 p-8 rounded-[40px] border border-gray-100">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Controle de Status</h4>
                      <div className="flex items-center justify-between p-5 bg-white rounded-3xl border border-gray-100 mb-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                          <span className="text-sm font-black text-gray-700">Arquivar</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={selectedRecurso.status === StatusProcesso.ARQUIVADO} onChange={() => {
                            const newStatus = selectedRecurso.status === StatusProcesso.ARQUIVADO ? StatusProcesso.ATIVO : StatusProcesso.ARQUIVADO;
                            const today = getTodayBR();
                            setRecursos(prev => prev.map(r => r.id === selectedRecurso.id ? { ...r, status: newStatus, ultimaAtualizacao: today } : r));
                            addHistorico(selectedRecurso.processoOriginarioId, `Recurso ${selectedRecurso.tipoRecurso} alterado para ${newStatus}.`);
                            setSelectedRecurso(null);
                          }} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* MODAL CADASTRO PROCESSO */}
      {
        isProcModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setIsProcModalOpen(false)}>
            <div className="bg-white rounded-[40px] w-full max-w-3xl shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-8 pb-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3"><FileText className="w-7 h-7 text-indigo-600" /> {procFormData.id ? 'Editar Processo' : 'Novo Processo'}</h2>
                <button onClick={() => setIsProcModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-8 h-8" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 custom-scroll">
                <form id="procForm" onSubmit={handleSaveProcess} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormSelect label="Cliente" required value={procFormData.clienteId} onChange={e => setProcFormData({ ...procFormData, clienteId: e.target.value })}>
                      <option value="">Selecione...</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </FormSelect>
                    <FormSelect label="Polo" required value={procFormData.polo || ''} onChange={e => setProcFormData({ ...procFormData, polo: e.target.value as 'Autor' | 'Réu' })}>
                      <option value="">Selecione...</option>
                      <option value="Autor">Autor (Polo Ativo)</option>
                      <option value="Réu">Réu (Polo Passivo)</option>
                    </FormSelect>
                    <FormInput label="Número do Processo" required placeholder="0000000-00.0000.0.00.0000" value={procFormData.numeros?.[0] || ''} onChange={e => setProcFormData({ ...procFormData, numeros: [e.target.value] })} />
                    <FormInput label="Parte Contrária" placeholder="Nome da Parte Contrária" value={procFormData.parteContraria} onChange={e => setProcFormData({ ...procFormData, parteContraria: e.target.value.toUpperCase() })} />
                    <FormSelect label="Justiça Gratuita" value={procFormData.gratuidade ? 'S' : 'N'} onChange={e => setProcFormData({ ...procFormData, gratuidade: e.target.value === 'S' })}>
                      <option value="N">Não</option>
                      <option value="S">Sim</option>
                    </FormSelect>
                    <FormInput label="Valor da Causa" placeholder="R$ 0,00" value={formatCurrency(procFormData.valorCausa || 0)} onChange={e => setProcFormData({ ...procFormData, valorCausa: parseCurrency(e.target.value) })} />
                    <div className="col-span-2"><FormInput label="Objeto do Processo" required placeholder="Descreva o objeto da ação" value={procFormData.objeto} onChange={e => setProcFormData({ ...procFormData, objeto: e.target.value.toUpperCase() })} /></div>
                    <FormSelect label="Área de Atuação" value={procFormData.areaAtuacao} onChange={e => setProcFormData({ ...procFormData, areaAtuacao: e.target.value as AreaAtuacao })}>
                      {Object.values(AreaAtuacao).map(v => <option key={v} value={v}>{v}</option>)}
                    </FormSelect>
                    <FormSelect label="Fase Processual" value={procFormData.faseProcessual} onChange={e => setProcFormData({ ...procFormData, faseProcessual: e.target.value as FaseProcessual })}>
                      {Object.values(FaseProcessual).map(v => <option key={v} value={v}>{v}</option>)}
                    </FormSelect>
                    <FormInput label="Vara / Local" placeholder="Ex: 1ª Vara Cível" value={procFormData.localTramitacao} onChange={e => setProcFormData({ ...procFormData, localTramitacao: e.target.value })} />
                    <FormInput label="Comarca" placeholder="Ex: São Paulo" value={procFormData.comarca} onChange={e => setProcFormData({ ...procFormData, comarca: e.target.value })} />
                    <FormInput label="Tribunal" placeholder="Ex: TJSP" value={procFormData.tribunal} onChange={e => setProcFormData({ ...procFormData, tribunal: e.target.value })} />
                    <div className="col-span-2"><FormInput label="Data de Distribuição" type="date" value={toISODate(procFormData.dataDistribuicao || '')} onChange={e => setProcFormData({ ...procFormData, dataDistribuicao: toBRDate(e.target.value) })} /></div>
                  </div>
                </form>
              </div>
              <div className="p-8 border-t border-gray-100 bg-gray-50 flex gap-4">
                <button type="button" onClick={() => setIsProcModalOpen(false)} className="flex-1 py-4 bg-white border border-gray-300 text-gray-500 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                <button type="submit" form="procForm" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-indigo-100">Salvar Processo</button>
              </div>
            </div>
          </div>
        )
      }

      {/* MODAL CADASTRO RECURSO */}
      {
        isRecModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4" onClick={() => setIsRecModalOpen(false)}>
            <div className="bg-white rounded-[40px] w-full max-w-3xl shadow-2xl animate-in zoom-in duration-300 flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-8 pb-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3"><Scale className="w-7 h-7 text-indigo-600" /> {recFormData.id ? 'Editar Recurso' : 'Novo Recurso'}</h2>
                <button onClick={() => setIsRecModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-8 h-8" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 custom-scroll">
                <form id="recForm" onSubmit={handleSaveRecurso} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <FormInput label="Tipo de Recurso" required placeholder="Ex: Apelação, Agravo de Instrumento" value={recFormData.tipoRecurso} onChange={e => setRecFormData({ ...recFormData, tipoRecurso: e.target.value })} />
                    <FormSelect label="Processo Originário" required value={recFormData.processoOriginarioId} onChange={e => setRecFormData({ ...recFormData, processoOriginarioId: e.target.value })}>
                      <option value="">Selecione o processo originário...</option>
                      {processos.filter(p => p.status === StatusProcesso.ATIVO).map(p => <option key={p.id} value={p.id}>{p.numeros[0]} - {p.objeto}</option>)}
                    </FormSelect>
                    <div className="space-y-2 opacity-80">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Cliente (Automático)</label>
                      <input type="text" readOnly className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-gray-400 text-sm cursor-not-allowed" value={clientes.find(c => c.id === recFormData.clienteId)?.nome || 'Selecione o processo para vincular o cliente'} />
                    </div>
                    <FormInput label="Número do Recurso" placeholder="0000000-00.0000.0.00.0000" value={recFormData.numeroRecurso} onChange={e => setRecFormData({ ...recFormData, numeroRecurso: e.target.value })} />
                    <FormSelect label="Gratuidade" value={recFormData.gratuidade ? 'S' : 'N'} onChange={e => setRecFormData({ ...recFormData, gratuidade: e.target.value === 'S' })}>
                      <option value="N">Não</option>
                      <option value="S">Sim</option>
                    </FormSelect>
                    <FormInput label="Data Distribuição" type="date" value={toISODate(recFormData.dataDistribuicao || '')} onChange={e => setRecFormData({ ...recFormData, dataDistribuicao: toBRDate(e.target.value) })} />
                    <FormInput label="Tribunal" placeholder="Ex: TJSP, STJ" value={recFormData.tribunal} onChange={e => setRecFormData({ ...recFormData, tribunal: e.target.value })} />
                    <FormInput label="Local de Tramitação" placeholder="Ex: 1ª Câmara de Direito Privado" value={recFormData.localTramitacao} onChange={e => setRecFormData({ ...recFormData, localTramitacao: e.target.value })} />
                  </div>
                </form>
              </div>
              <div className="p-8 border-t border-gray-100 bg-gray-50 flex gap-4">
                <button type="button" onClick={() => setIsRecModalOpen(false)} className="flex-1 py-4 bg-white border border-gray-300 text-gray-500 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                <button type="submit" form="recForm" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-indigo-100">Salvar Recurso</button>
              </div>
            </div>
          </div>
        )
      }

      {/* MODAL HISTORICO */}
      {
        isHistoryLogModalOpen && selectedProcess && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4" onClick={() => setIsHistoryLogModalOpen(false)}>
            <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
              <div className="p-10">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-black text-gray-800 flex items-center gap-3"><History className="w-6 h-6 text-indigo-600" /> Registro de Alterações</h2>
                  <button onClick={() => setIsHistoryLogModalOpen(false)} className="text-gray-400"><X className="w-7 h-7" /></button>
                </div>
                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scroll">
                  {historico.filter(h => h.idReferencia === selectedProcess.id).map((h, i, arr) => (
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
        )
      }
      {/* MODAL ANDAMENTOS */}
      {
        isAndamentoModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl animate-in zoom-in duration-300">
              <div className="p-10">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                      <Activity className="w-8 h-8 text-indigo-600" /> Registrar Andamento
                    </h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Lançamento de movimentação processual</p>
                  </div>
                  <button onClick={() => setIsAndamentoModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <X className="w-8 h-8" />
                  </button>
                </div>

                <form className="space-y-8" id="andamentoForm" onSubmit={(e) => {
                  e.preventDefault();
                  if (!selectedProcess) return;
                  const and: Andamento = {
                    ...andamentoFormData,
                    id: `and-${Date.now()}`
                  } as Andamento;

                  const updatedProcesso = {
                    ...selectedProcess,
                    andamentos: [...(selectedProcess.andamentos || []), and],
                    ultimaAtualizacao: getTodayBR()
                  };

                  setProcessos(prev => prev.map(p => p.id === selectedProcess.id ? updatedProcesso : p));
                  setSelectedProcess(updatedProcesso);
                  addHistorico(selectedProcess.id, `Novo andamento registrado: ${and.tipo}`);
                  setIsAndamentoModalOpen(false);

                  if (and.geraPrazo) {
                    // Abrir modal de Prazo rápido
                    setPendingAndamentoId(and.id);
                    setQuickPrazoData({
                      descricao: `${and.providencia.toUpperCase()}: ${and.tipo}`,
                      processoId: selectedProcess.id,
                      clienteId: selectedProcess.clienteId,
                      dataVencimento: getTodayBR(),
                      tipo: TipoPrazo.PRAZO,
                      responsavel: '',
                      critico: true,
                      concluido: false,
                      cancelado: false,
                      financeiroIds: []
                    });
                    setIsQuickPrazoModalOpen(true);
                  }
                }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormInput
                      label="Data do Andamento"
                      type="date"
                      required
                      value={toISODate(andamentoFormData.data || '')}
                      onChange={(e: any) => setAndamentoFormData({ ...andamentoFormData, data: toBRDate(e.target.value) })}
                    />
                    <FormSelect
                      label="Tipo de Andamento"
                      required
                      value={andamentoFormData.tipo}
                      onChange={(e: any) => setAndamentoFormData({ ...andamentoFormData, tipo: e.target.value as TipoAndamento })}
                    >
                      {Object.values(TipoAndamento).map(t => <option key={t} value={t}>{t}</option>)}
                    </FormSelect>
                  </div>

                  <div className="space-y-4 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Classificação Estratégica</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <FormSelect
                        label="Gera Prazo?"
                        value={andamentoFormData.geraPrazo ? 'S' : 'N'}
                        onChange={(e: any) => setAndamentoFormData({ ...andamentoFormData, geraPrazo: e.target.value === 'S' })}
                      >
                        <option value="N">Não</option>
                        <option value="S">Sim</option>
                      </FormSelect>
                      <FormSelect
                        label="Tipo de Providência"
                        value={andamentoFormData.providencia}
                        onChange={(e: any) => setAndamentoFormData({ ...andamentoFormData, providencia: e.target.value as ProvidenciaAndamento })}
                      >
                        {Object.values(ProvidenciaAndamento).map(p => <option key={p} value={p}>{p}</option>)}
                      </FormSelect>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Conteúdo / Descrição</label>
                    <textarea
                      required
                      className="w-full h-32 px-5 py-4 bg-gray-50 border border-gray-100 rounded-3xl font-medium text-sm outline-none focus:border-indigo-500 transition-all resize-none"
                      placeholder="Descreva o conteúdo do andamento processual..."
                      value={andamentoFormData.conteudo}
                      onChange={(e) => setAndamentoFormData({ ...andamentoFormData, conteudo: e.target.value })}
                    />
                  </div>
                </form>

                <div className="flex gap-4 mt-10">
                  <button type="button" onClick={() => setIsAndamentoModalOpen(false)} className="flex-1 py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl font-black uppercase text-xs hover:bg-gray-50 transition-all">Descartar</button>
                  <button type="submit" form="andamentoForm" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">Registrar Andamento</button>
                </div>
              </div>
            </div>
          </div>
        )
      }
      {/* MODAL PRAZO RÁPIDO (GATILHO DE ANDAMENTO) */}
      {
        isQuickPrazoModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[95] flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl animate-in zoom-in duration-300">
              <div className="p-10">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                      <Calendar className="w-8 h-8 text-amber-500" /> Agenda de Prazo
                    </h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Configurar prazo gerado pelo andamento</p>
                  </div>
                  <button onClick={() => setIsQuickPrazoModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <X className="w-8 h-8" />
                  </button>
                </div>

                <form className="space-y-6" id="quickPrazoForm" onSubmit={(e) => {
                  e.preventDefault();
                  const newPrazo: Prazo = {
                    ...quickPrazoData,
                    id: `p-${Date.now()}`
                  } as Prazo;

                  setPrazos(prev => [...prev, newPrazo]);
                  addHistorico(newPrazo.processoId, `Prazo judicial agendado via andamento: ${newPrazo.descricao}`);

                  // Vincular o prazo ao andamento se necessário (embora já tenhamos o fluxo)
                  if (pendingAndamentoId && selectedProcess) {
                    const updatedAndamentos = selectedProcess.andamentos?.map(a =>
                      a.id === pendingAndamentoId ? { ...a, prazoId: newPrazo.id } : a
                    );
                    setProcessos(prev => prev.map(p => p.id === selectedProcess.id ? { ...p, andamentos: updatedAndamentos } : p));
                  }

                  setIsQuickPrazoModalOpen(false);
                  setPendingAndamentoId(null);

                  // Prompt opcional para tarefa vinculada
                  if (confirm("Deseja criar uma tarefa interna (checklist) vinculada a este prazo?")) {
                    // Aqui poderíamos abrir outro formulário ou apenas logar
                    const tarefaInternal: Prazo = {
                      ...newPrazo,
                      id: `p-${Date.now() + 1}`,
                      descricao: `[TAREFA] Providência para: ${newPrazo.descricao}`,
                      tipo: TipoPrazo.TAREFA,
                      critico: false
                    };
                    setPrazos(prev => [...prev, tarefaInternal]);
                    addHistorico(newPrazo.processoId, `Tarefa interna vinculada ao prazo criada.`);
                  }
                }}>
                  <FormInput label="Descrição do Prazo" required value={quickPrazoData.descricao} onChange={(e: any) => setQuickPrazoData({ ...quickPrazoData, descricao: e.target.value })} />

                  <div className="grid grid-cols-2 gap-6">
                    <FormInput label="Data de Vencimento" type="date" required value={toISODate(quickPrazoData.dataVencimento || '')} onChange={(e: any) => setQuickPrazoData({ ...quickPrazoData, dataVencimento: toBRDate(e.target.value) })} />
                    <FormInput label="Hora" type="time" value={quickPrazoData.horaVencimento} onChange={(e: any) => setQuickPrazoData({ ...quickPrazoData, horaVencimento: e.target.value })} />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <FormSelect label="Tipo de Prazo" required value={quickPrazoData.tipo} onChange={(e: any) => setQuickPrazoData({ ...quickPrazoData, tipo: e.target.value as TipoPrazo })}>
                      {Object.values(TipoPrazo).map(t => <option key={t} value={t}>{t}</option>)}
                    </FormSelect>
                    <FormSelect label="Crítico / Urgente?" value={quickPrazoData.critico ? 'S' : 'N'} onChange={(e: any) => setQuickPrazoData({ ...quickPrazoData, critico: e.target.value === 'S' })}>
                      <option value="N">Não</option>
                      <option value="S">Sim</option>
                    </FormSelect>
                  </div>
                  <FormInput label="Responsável" required placeholder="Nome do responsável" value={quickPrazoData.responsavel} onChange={(e: any) => setQuickPrazoData({ ...quickPrazoData, responsavel: e.target.value })} />
                </form>

                <div className="flex gap-4 mt-10">
                  <button type="button" onClick={() => setIsQuickPrazoModalOpen(false)} className="flex-1 py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl font-black uppercase text-xs">Pular Cadastro</button>
                  <button type="submit" form="quickPrazoForm" className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-amber-100 hover:bg-amber-600 transition-all">Agendar Prazo</button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default ProcessesPage;
