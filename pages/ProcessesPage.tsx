
import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, FileText, Scale, Clock, AlertTriangle,
  Trash2, Edit, History, X, CheckCircle2, ChevronRight, Save,
  Filter, Calendar, Activity, RotateCcw, ArrowUpRight, Briefcase,
  User, DollarSign, CheckSquare, XCircle
} from 'lucide-react';
import {
  Processo, Cliente, StatusProcesso, Prazo, Recurso, HistoricoAlteracao,
  AreaAtuacao, FaseProcessual, Financeiro, Andamento, TipoAndamento, ProvidenciaAndamento, TipoPrazo
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
  andamentos: Andamento[];
  setAndamentos: React.Dispatch<React.SetStateAction<Andamento[]>>;
  historico: HistoricoAlteracao[];
  setHistorico: React.Dispatch<React.SetStateAction<HistoricoAlteracao[]>>;
  financeiro: Financeiro[];
}

const INITIAL_PROC_STATE: Partial<Processo> = { areaAtuacao: AreaAtuacao.CIVEL, faseProcessual: FaseProcessual.CONHECIMENTO, status: StatusProcesso.ATIVO, numeros: [''], valorCausa: 0, dataDistribuicao: getTodayBR(), polo: undefined, gratuidade: false };
const INITIAL_REC_STATE: Partial<Recurso> = { dataDistribuicao: getTodayBR(), gratuidade: false, status: StatusProcesso.ATIVO };

const ProcessesPage: React.FC<ProcessesPageProps> = ({
  processos, setProcessos, clientes, setPrazos, prazos, recursos, setRecursos,
  andamentos, setAndamentos, historico, setHistorico, financeiro
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
  const [subTab, setSubTab] = useState<'DADOS' | 'PARTES' | 'TAREFAS' | 'ANDAMENTOS' | 'FINANCEIRO' | 'RELATORIOS'>('DADOS');

  // Andamentos State
  const [isAndamentoModalOpen, setIsAndamentoModalOpen] = useState(false);
  const [andamentoFormData, setAndamentoFormData] = useState<Partial<Andamento>>({
    data: getTodayBR(),
    tipo: TipoAndamento.JUNTADA,
    geraPrazo: false,
    providencia: ProvidenciaAndamento.CIENCIA
  });

  // Flow after andamento
  const [isClassificationModalOpen, setIsClassificationModalOpen] = useState(false);
  const [isNewPrazoFromAndamentoModalOpen, setIsNewPrazoFromAndamentoModalOpen] = useState(false);
  const [newPrazoData, setNewPrazoData] = useState<Partial<Prazo>>({});
  const [currentAndamentoId, setCurrentAndamentoId] = useState<string | null>(null);

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
      setAndamentos(prev => prev.filter(a => a.processoId !== id));
      setSelectedProcess(null);
    }
  };

  const handleSaveAndamento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProcess) return;

    const id = `and-${Date.now()}`;
    const newAndamento: Andamento = {
      ...andamentoFormData,
      id,
      processoId: selectedProcess.id,
    } as Andamento;

    setAndamentos(prev => [...prev, newAndamento]);
    setCurrentAndamentoId(id);
    addHistorico(selectedProcess.id, `Novo andamento registrado: ${newAndamento.tipo}.`);
    setIsAndamentoModalOpen(false);
    setIsClassificationModalOpen(true);
  };

  const handleClassificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (andamentoFormData.geraPrazo) {
      setNewPrazoData({
        processoId: selectedProcess?.id,
        clienteId: selectedProcess?.clienteId,
        descricao: `Ação referente ao andamento: ${andamentoFormData.tipo}`,
        dataVencimento: getTodayBR(),
        tipo: TipoPrazo.PRAZO,
        responsavel: 'Dr. Flávio Oliveira',
        concluido: false,
        cancelado: false,
        financeiroIds: [],
        andamentoId: currentAndamentoId || undefined
      });
      setIsNewPrazoFromAndamentoModalOpen(true);
    }
    setIsClassificationModalOpen(false);
  };

  const handleCreatePrazoFromAndamento = (e: React.FormEvent) => {
    e.preventDefault();
    const prazoId = `p-${Date.now()}`;
    const finalPrazo: Prazo = {
      ...newPrazoData,
      id: prazoId
    } as Prazo;

    setPrazos(prev => [...prev, finalPrazo]);

    // Vincular prazo ao andamento
    if (currentAndamentoId) {
      setAndamentos(prev => prev.map(a => a.id === currentAndamentoId ? { ...a, prazoId } : a));
    }

    if (confirm('Deseja criar uma tarefa vinculada a este prazo?')) {
      // Redirecionar ou abrir modal de tarefa? 
      // Para manter o escopo, vamos apenas informar que a tarefa pode ser criada no módulo de tarefas.
      // Ou criar uma tarefa básica automaticamente.
      addHistorico(selectedProcess!.id, `Prazo e tarefa gerados a partir de andamento.`);
    }

    setIsNewPrazoFromAndamentoModalOpen(false);
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
                  { id: 'PARTES', label: 'Partes / Cliente', icon: <User className="w-4 h-4" /> },
                  { id: 'TAREFAS', label: 'Tarefas e Prazos', icon: <CheckSquare className="w-4 h-4" /> },
                  { id: 'ANDAMENTOS', label: 'Andamentos', icon: <Activity className="w-4 h-4" /> },
                  { id: 'FINANCEIRO', label: 'Financeiro', icon: <DollarSign className="w-4 h-4" /> },
                  { id: 'RELATORIOS', label: 'Relatórios', icon: <Search className="w-4 h-4" /> },
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

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                <div className="lg:col-span-3">
                  {subTab === 'DADOS' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2">
                      <section>
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 border-b-2 border-gray-50 pb-3">Informações Gerais</h3>
                        <div className="grid grid-cols-2 gap-8 text-balance">
                          <DetailField label="Objeto do Processo" value={selectedProcess.objeto} />
                          <DetailField label="Polo" value={selectedProcess.polo || '-'} />
                          <DetailField label="Parte Contrária" value={selectedProcess.parteContraria || '-'} />
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
                      </section>

                      <section>
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 border-b-2 border-gray-50 pb-3 flex items-center gap-2">
                          <Scale className="w-4 h-4" /> Recursos Originados
                        </h3>
                        <div className="space-y-3">
                          {recursos.filter(r => r.processoOriginarioId === selectedProcess.id).length > 0 ? (
                            recursos.filter(r => r.processoOriginarioId === selectedProcess.id).map(r => (
                              <div
                                key={r.id}
                                onClick={() => { setSelectedRecurso(r); setSelectedProcess(null); }}
                                className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 flex items-center justify-between cursor-pointer hover:bg-orange-50 transition-all"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                                    <Scale className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-black text-gray-800">{r.tipoRecurso}</p>
                                    <p className="text-[10px] font-bold text-gray-400">{r.numeroRecurso}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-[9px] font-black uppercase text-orange-600">{r.status}</p>
                                  <p className="text-[8px] font-bold text-gray-400">Atualizado: {r.ultimaAtualizacao || r.dataDistribuicao}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-gray-400 italic">Nenhum recurso gerado a partir deste processo.</p>
                          )}
                        </div>
                      </section>
                    </div>
                  )}

                  {subTab === 'PARTES' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                      <section>
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 border-b-2 border-gray-50 pb-3">Dados da Parte Assistida</h3>
                        {(() => {
                          const cli = clientes.find(c => c.id === selectedProcess.clienteId);
                          if (!cli) return <p className="text-xs text-gray-400 italic">Cliente não encontrado.</p>;
                          return (
                            <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 grid grid-cols-2 gap-8">
                              <DetailField label="Nome / Razão Social" value={cli.nome} />
                              <DetailField label="CPF / CNPJ" value={cli.documento} />
                              <DetailField label="E-mail" value={cli.email} />
                              <DetailField label="Telefone" value={cli.telefone} />
                              <DetailField label="Status" value={cli.status} />
                              <DetailField label="Tipo" value={cli.tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'} />
                            </div>
                          );
                        })()}
                      </section>
                      <section>
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 border-b-2 border-gray-50 pb-3">Parte Adversa</h3>
                        <div className="bg-rose-50/30 p-8 rounded-3xl border border-rose-100">
                          <DetailField label="Nome da Parte Contrária" value={selectedProcess.parteContraria || 'Não informada'} />
                        </div>
                      </section>
                    </div>
                  )}

                  {subTab === 'TAREFAS' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Atividades Vinculadas</h3>
                        <button
                          onClick={() => window.location.hash = '#/tarefas'}
                          className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                        >
                          Ir para Módulo de Tarefas
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
                                  <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400">
                                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {p.dataVencimento}</span>
                                    <span>•</span>
                                    <span>{p.tipo}</span>
                                  </div>
                                </div>
                              </div>
                              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${p.concluido ? 'bg-emerald-100 text-emerald-700' : p.cancelado ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                {p.concluido ? 'Realizado' : p.cancelado ? 'Cancelado' : 'Pendente'}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="p-12 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                            <p className="text-sm text-gray-400 font-bold italic">Nenhuma tarefa ou prazo para este processo.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {subTab === 'ANDAMENTOS' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Histórico de Andamentos</h3>
                        <button
                          onClick={() => {
                            setAndamentoFormData({
                              data: getTodayBR(),
                              tipo: TipoAndamento.JUNTADA,
                              geraPrazo: false,
                              providencia: ProvidenciaAndamento.CIENCIA,
                              descricao: ''
                            });
                            setIsAndamentoModalOpen(true);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100"
                        >
                          <Plus className="w-4 h-4" /> Novo Andamento
                        </button>
                      </div>

                      <div className="space-y-6 relative before:absolute before:left-6 before:top-2 before:bottom-0 before:w-0.5 before:bg-gray-100">
                        {andamentos.filter(a => a.processoId === selectedProcess.id).length > 0 ? (
                          andamentos
                            .filter(a => a.processoId === selectedProcess.id)
                            .sort((a, b) => compareDatesBR(b.data, a.data))
                            .map((and) => {
                              const relatedPrazo = and.prazoId ? prazos.find(p => p.id === and.prazoId) : null;
                              return (
                                <div key={and.id} className="relative pl-16">
                                  <div className="absolute left-3.5 top-0 w-5 h-5 rounded-full bg-white border-2 border-indigo-400 z-10"></div>
                                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:border-indigo-200 transition-all">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs font-black text-indigo-600">{and.data}</span>
                                        <span className="bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest">{and.tipo}</span>
                                        <span className="bg-gray-100 text-gray-600 text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest">{and.providencia}</span>
                                      </div>
                                      {and.geraPrazo && (
                                        <span className="flex items-center gap-1.5 text-[9px] font-black text-rose-500 uppercase">
                                          <AlertTriangle className="w-3.5 h-3.5" /> Gerou Prazo
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm font-bold text-gray-700 whitespace-pre-wrap mb-4">{and.descricao}</p>

                                    {relatedPrazo && (
                                      <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <Clock className="w-4 h-4 text-amber-500" />
                                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Prazo Vinculado:</span>
                                          <span className="text-[10px] font-bold text-gray-700">{relatedPrazo.descricao} ({relatedPrazo.dataVencimento})</span>
                                        </div>
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${relatedPrazo.concluido ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                          {relatedPrazo.concluido ? 'Finalizado' : 'Aguardando'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                        ) : (
                          <div className="pl-16">
                            <div className="p-12 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                              <p className="text-sm text-gray-400 font-bold italic">Nenhum andamento registrado para este processo.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {subTab === 'FINANCEIRO' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Lançamentos Vinculados</h3>
                        <button
                          onClick={() => window.location.hash = '#/financeiro'}
                          className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                        >
                          Ir para Módulo Financeiro
                        </button>
                      </div>
                      <div className="space-y-3">
                        {financeiro.filter(f => f.processoId === selectedProcess.id).length > 0 ? (
                          financeiro.filter(f => f.processoId === selectedProcess.id).map(f => (
                            <div key={f.id} className="p-5 bg-white rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.tipo === 'Receita' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                                  <DollarSign className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="text-sm font-black text-gray-800">{f.descricao}</p>
                                  <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400">
                                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {f.dataVencimento}</span>
                                    <span>•</span>
                                    <span>{f.status}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-black ${f.tipo === 'Receita' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                  {f.tipo === 'Receita' ? '+' : '-'} {formatCurrency(f.valor)}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-12 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                            <p className="text-sm text-gray-400 font-bold italic">Nenhum lançamento financeiro para este processo.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {subTab === 'RELATORIOS' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                      <div className="bg-indigo-50 p-10 rounded-[40px] border border-indigo-100 text-center">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-100">
                          <Search className="w-10 h-10 text-indigo-600" />
                        </div>
                        <h3 className="text-xl font-black text-gray-800 mb-2">Relatórios do Processo</h3>
                        <p className="text-sm text-gray-500 font-medium max-w-sm mx-auto mb-8">Gere dossiês completos e relatórios de acompanhamento específicos para este processo.</p>
                        <button
                          onClick={() => window.location.hash = '#/relatorios'}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs transition-all shadow-xl shadow-indigo-200"
                        >
                          Acessar Gerador de Relatórios
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="bg-gray-50 p-8 rounded-[40px] border border-gray-100">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Controle Rápidos</h4>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-5 bg-white rounded-3xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          <span className="text-[10px] font-black text-gray-700 uppercase">Arquivar</span>
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

                      <div className="p-5 bg-white rounded-3xl border border-gray-100 shadow-sm">
                        <p className="text-[9px] font-black text-gray-400 uppercase mb-3">Resumo Processual</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-gray-500">Andamentos:</span>
                            <span className="text-gray-800">{andamentos.filter(a => a.processoId === selectedProcess.id).length}</span>
                          </div>
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-gray-500">Prazos Ativos:</span>
                            <span className="text-amber-600">{prazos.filter(p => p.processoId === selectedProcess.id && !p.concluido && !p.cancelado).length}</span>
                          </div>
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-gray-500">Recursos:</span>
                            <span className="text-orange-600">{recursos.filter(r => r.processoOriginarioId === selectedProcess.id).length}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHES RECURSO */}
      {selectedRecurso && (
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
      )}

      {/* MODAL CADASTRO PROCESSO */}
      {isProcModalOpen && (
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
      )}

      {/* MODAL CADASTRO RECURSO */}
      {isRecModalOpen && (
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
      )}


      {/* MODAL NOVO ANDAMENTO */}
      {isAndamentoModalOpen && selectedProcess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setIsAndamentoModalOpen(false)}>
          <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl animate-in zoom-in duration-300 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3"><Activity className="w-8 h-8 text-indigo-600" /> Registrar Andamento</h2>
                <button onClick={() => setIsAndamentoModalOpen(false)} className="text-gray-400"><X className="w-8 h-8" /></button>
              </div>
              <form onSubmit={handleSaveAndamento} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <FormInput label="Data do Andamento" type="date" required value={toISODate(andamentoFormData.data || '')} onChange={(e: any) => setAndamentoFormData({ ...andamentoFormData, data: toBRDate(e.target.value) })} />
                  <FormSelect label="Tipo de Andamento" required value={andamentoFormData.tipo} onChange={(e: any) => setAndamentoFormData({ ...andamentoFormData, tipo: e.target.value as TipoAndamento })}>
                    {Object.values(TipoAndamento).map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
                  </FormSelect>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Texto do Andamento (DJE / PJe / e-SAJ)</label>
                  <textarea
                    required
                    rows={6}
                    value={andamentoFormData.descricao}
                    onChange={(e) => setAndamentoFormData({ ...andamentoFormData, descricao: e.target.value })}
                    placeholder="Cole aqui o conteúdo do andamento processual..."
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-3xl font-bold text-sm outline-none focus:border-indigo-500 transition-all resize-none"
                  />
                </div>
                <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black uppercase text-xs shadow-xl shadow-indigo-100 transition-all hover:bg-indigo-700">Continuar para Classificação</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CLASSIFICAÇÃO JURÍDICA */}
      {isClassificationModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl animate-in zoom-in duration-300">
            <div className="p-10">
              <h2 className="text-xl font-black text-gray-800 mb-2">Classificação Jurídica</h2>
              <p className="text-sm text-gray-400 font-medium mb-8">Defina a natureza deste andamento para o sistema.</p>
              <form onSubmit={handleClassificationSubmit} className="space-y-8">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Este andamento gera prazo?</p>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setAndamentoFormData({ ...andamentoFormData, geraPrazo: true })} className={`flex-1 py-4 rounded-2xl border-2 font-black uppercase text-xs transition-all ${andamentoFormData.geraPrazo ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>Sim</button>
                    <button type="button" onClick={() => setAndamentoFormData({ ...andamentoFormData, geraPrazo: false })} className={`flex-1 py-4 rounded-2xl border-2 font-black uppercase text-xs transition-all ${!andamentoFormData.geraPrazo ? 'border-rose-600 bg-rose-50 text-rose-600' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>Não</button>
                  </div>
                </div>
                <FormSelect label="Tipo de Providência" required value={andamentoFormData.providencia} onChange={(e: any) => setAndamentoFormData({ ...andamentoFormData, providencia: e.target.value as ProvidenciaAndamento })}>
                  {Object.values(ProvidenciaAndamento).map(prov => <option key={prov} value={prov}>{prov}</option>)}
                </FormSelect>
                <div className="flex gap-4">
                  <button type="submit" className="flex-1 py-5 bg-indigo-600 text-white rounded-[24px] font-black uppercase text-xs shadow-xl shadow-indigo-100">Finalizar Registro</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRIAR PRAZO A PARTIR DE ANDAMENTO */}
      {isNewPrazoFromAndamentoModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-800">Abertura de Prazo</h2>
              <button onClick={() => setIsNewPrazoFromAndamentoModalOpen(false)} className="text-gray-400"><X className="w-7 h-7" /></button>
            </div>
            <div className="p-10 flex-1 overflow-y-auto">
              <form id="andamentoPrazoForm" onSubmit={handleCreatePrazoFromAndamento} className="space-y-6">
                <FormInput label="Descrição do Prazo" required value={newPrazoData.descricao} onChange={(e: any) => setNewPrazoData({ ...newPrazoData, descricao: e.target.value })} />
                <div className="grid grid-cols-2 gap-6">
                  <FormInput label="Data Inicial (Publicação)" type="date" value={toISODate(newPrazoData.dataVencimento || getTodayBR())} onChange={(e: any) => setNewPrazoData({ ...newPrazoData, dataVencimento: toBRDate(e.target.value) })} />
                  <FormSelect label="Tipo de Prazo" value={newPrazoData.tipo} onChange={(e: any) => setNewPrazoData({ ...newPrazoData, tipo: e.target.value as any })}>
                    {Object.values(TipoPrazo).map(t => <option key={t} value={t}>{t}</option>)}
                  </FormSelect>
                </div>
                <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
                  <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-2">Dica de Gestão</p>
                  <p className="text-xs text-amber-800 font-medium leading-relaxed">Este prazo ficará vinculado permanentemente a este andamento e ao processo, garantindo rastreabilidade jurídica total.</p>
                </div>
              </form>
            </div>
            <div className="p-8 border-t border-gray-100 bg-gray-50">
              <button form="andamentoPrazoForm" type="submit" className="w-full py-5 bg-amber-600 text-white rounded-[24px] font-black uppercase text-xs shadow-xl shadow-amber-100">Abrir Prazo agora</button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL HISTORICO */}
      {isHistoryLogModalOpen && selectedProcess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[130] flex items-center justify-center p-4" onClick={() => setIsHistoryLogModalOpen(false)}>
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
      )}
    </div>
  );
};

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

export default ProcessesPage;
