
import React, { useState, useMemo } from 'react';
import { GavelWithBase } from '../components/CustomIcons';
import {
  CheckCircle2,
  Plus,
  Trash2,
  X,
  Activity,
  History,
  Edit,
  Clock,
  User,
  Scale,
  ChevronRight,
  AlertTriangle,
  Info,
  Calendar,
  CheckSquare,
  XCircle,
  FileText,
  DollarSign,
  ArrowRight,
  ScrollText,
  FilePenLine,
  Users as UsersIcon,
  Briefcase,
  MessageSquare
} from 'lucide-react';
import { FormInput, FormSelect } from '../components/FormComponents';
import {
  Prazo,
  Processo,
  Cliente,
  TipoPrazo,
  ModalidadeAudiencia,
  HistoricoAlteracao,
  Financeiro,
  StatusProcesso
} from '../types';
import {
  formatCurrency,
  maskDate,
  getTodayBR,
  compareDatesBR,
  toBRDate,
  toISODate
} from '../utils/formatters';

interface DeadlinesPageProps {
  prazos: Prazo[];
  setPrazos: React.Dispatch<React.SetStateAction<Prazo[]>>;
  processos: Processo[];
  clientes: Cliente[];
  financeiro: Financeiro[];
  historico: HistoricoAlteracao[];
  setHistorico: React.Dispatch<React.SetStateAction<HistoricoAlteracao[]>>;
}

const DeadlinesPage: React.FC<DeadlinesPageProps> = ({
  prazos, setPrazos, processos, clientes, financeiro, historico, setHistorico
}) => {
  const [activeTab, setActiveTab] = useState<'PENDENTES' | 'REALIZADAS' | 'CANCELADAS'>('PENDENTES');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedPrazo, setSelectedPrazo] = useState<Prazo | null>(null);

  const todayBR = getTodayBR();

  const INITIAL_STATE: Partial<Prazo> = {
    tipo: TipoPrazo.PRAZO,
    descricao: '',
    processoId: '',
    clienteId: '',
    dataVencimento: todayBR,
    horaVencimento: '',
    dataFatal: '',
    horaFatal: '',
    responsavel: '',
    critico: false,
    financeiroIds: [],
    concluido: false,
    cancelado: false
  };
  const [formData, setFormData] = useState<Partial<Prazo>>(INITIAL_STATE);

  // --- Helpers ---
  const addHistorico = (idReferencia: string, descricao: string) => {
    const entry: HistoricoAlteracao = {
      id: `h-p-${Date.now()}`,
      idReferencia,
      dataHora: new Date().toLocaleString('pt-BR'),
      descricao
    };
    setHistorico(prev => [entry, ...prev]);
  };

  const activeClientes = useMemo(() => clientes.filter(c => c.status === 'Ativo'), [clientes]);
  const activeProcessos = useMemo(() => processos.filter(p => p.status === StatusProcesso.ATIVO), [processos]);

  const filteredPrazos = useMemo(() => {
    let base = prazos;
    if (activeTab === 'PENDENTES') base = prazos.filter(p => !p.concluido && !p.cancelado);
    else if (activeTab === 'REALIZADAS') base = prazos.filter(p => p.concluido);
    else if (activeTab === 'CANCELADAS') base = prazos.filter(p => p.cancelado);

    return base.sort((a, b) => {
      if (activeTab === 'PENDENTES') {
        const diffA = compareDatesBR(a.dataVencimento, todayBR);
        const diffB = compareDatesBR(b.dataVencimento, todayBR);
        // Priorizar atrasados
        if (diffA < 0 && diffB >= 0) return -1;
        if (diffB < 0 && diffA >= 0) return 1;
        return compareDatesBR(a.dataVencimento, b.dataVencimento);
      }
      const dateA = a.dataConclusao || a.dataCancelamento || '';
      const dateB = b.dataConclusao || b.dataCancelamento || '';
      return compareDatesBR(dateB, dateA); // Mais recentes primeiro
    });
  }, [prazos, activeTab, todayBR]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const id = formData.id || `p-${Date.now()}`;
    const newPrazo: Prazo = {
      ...formData,
      id,
      concluido: formData.concluido || false,
      cancelado: formData.cancelado || false,
    } as Prazo;

    if (formData.id) {
      setPrazos(prev => prev.map(p => p.id === id ? newPrazo : p));
      addHistorico(id, 'Atividade editada e salva.');
    } else {
      setPrazos(prev => [...prev, newPrazo]);
      addHistorico(id, 'Atividade cadastrada no sistema.');
    }
    setIsFormModalOpen(false);
    setFormData(INITIAL_STATE);
  };

  const handleRealizar = (prazo: Prazo) => {
    const obs = prompt('Deseja registrar alguma observação sobre a realização?');
    const update: Prazo = {
      ...prazo,
      concluido: true,
      dataConclusao: getTodayBR(),
      observacoesRealizacao: obs || ''
    };
    setPrazos(prev => prev.map(p => p.id === prazo.id ? update : p));
    addHistorico(prazo.id, 'Atividade marcada como realizada.');
    setIsDetailModalOpen(false);
  };

  const handleCancelar = (prazo: Prazo) => {
    const jus = prompt('Justificativa obrigatória para o cancelamento:');
    if (jus === null) return;
    if (!jus.trim()) {
      alert('A justificativa é obrigatória.');
      return;
    }
    const update: Prazo = {
      ...prazo,
      cancelado: true,
      dataCancelamento: getTodayBR(),
      justificativaCancelamento: jus
    };
    setPrazos(prev => prev.map(p => p.id === prazo.id ? update : p));
    addHistorico(prazo.id, `Atividade cancelada. Justificativa: ${jus}`);
    setIsDetailModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta atividade definitivamente?')) {
      setPrazos(prev => prev.filter(p => p.id !== id));
      setIsDetailModalOpen(false);
    }
  };

  const getDayLabel = (date: string) => {
    const diff = compareDatesBR(date, todayBR);
    if (diff < 0) return { label: 'Atrasado', color: 'bg-rose-100 text-rose-600' };
    if (diff === 0) return { label: 'Para Hoje', color: 'bg-amber-100 text-amber-600' };
    if (diff <= 3) return { label: 'Próximo', color: 'bg-indigo-100 text-indigo-600' };
    return { label: 'Em Dia', color: 'bg-emerald-100 text-emerald-600' };
  };

  const getTypeStyle = (tipo: TipoPrazo) => {
    switch (tipo) {
      case TipoPrazo.PRAZO: return 'bg-blue-50 text-blue-600 border-blue-100';
      case TipoPrazo.AUDIENCIA: return 'bg-orange-50 text-orange-600 border-orange-100';
      case TipoPrazo.TAREFA: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case TipoPrazo.REUNIAO: return 'bg-rose-50 text-rose-600 border-rose-100';
      case TipoPrazo.DILIGENCIA: return 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100';
      case TipoPrazo.ATENDIMENTO: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case TipoPrazo.ADMINISTRATIVO: return 'bg-[#efebe9] text-[#5d4037] border-[#d7ccc8]';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  const getTypeTextColor = (tipo: TipoPrazo) => {
    switch (tipo) {
      case TipoPrazo.PRAZO: return 'text-blue-600';
      case TipoPrazo.AUDIENCIA: return 'text-orange-600';
      case TipoPrazo.TAREFA: return 'text-emerald-600';
      case TipoPrazo.REUNIAO: return 'text-rose-600';
      case TipoPrazo.DILIGENCIA: return 'text-fuchsia-600';
      case TipoPrazo.ATENDIMENTO: return 'text-emerald-600';
      case TipoPrazo.ADMINISTRATIVO: return 'text-[#5d4037]';
      default: return 'text-gray-400';
    }
  };

  const getActivityIcon = (tipo: TipoPrazo, className = "w-6 h-6") => {
    switch (tipo) {
      case TipoPrazo.AUDIENCIA: return <GavelWithBase className={className} />;
      case TipoPrazo.PRAZO: return <FilePenLine className={className} />;
      case TipoPrazo.DILIGENCIA: return <Briefcase className={className} />;
      case TipoPrazo.REUNIAO: return <UsersIcon className={className} />;
      case TipoPrazo.ATENDIMENTO: return <Activity className={className} />;
      case TipoPrazo.ADMINISTRATIVO: return <CheckSquare className={className} />;
      case TipoPrazo.OUTROS: return <MessageSquare className={className} />;
      default: return <CheckSquare className={className} />;
    }
  };

  const linkedFinances = useMemo(() => {
    if (!selectedPrazo) return [];
    return financeiro.filter(f => f.tarefaVinculadaId === selectedPrazo.id);
  }, [selectedPrazo, financeiro]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[1400px] mx-auto pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0b1726]">Gestão de Prazos</h1>
          <p className="text-gray-500 font-medium">Acompanhamento centralizado de todas as atividades do escritório.</p>
        </div>
        <button
          onClick={() => { setFormData(INITIAL_STATE); setIsFormModalOpen(true); }}
          className="bg-[#4f46e5] hover:bg-[#4338ca] text-white px-8 py-3 rounded-2xl flex items-center justify-center gap-2 font-black shadow-xl shadow-indigo-100 transition-all"
        >
          <Plus className="w-5 h-5" /> Novo Prazo
        </button>
      </header>

      {/* Abas */}
      <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center bg-gray-50 p-2 gap-2">
          <button
            onClick={() => setActiveTab('PENDENTES')}
            className={`flex-1 py-4 px-6 rounded-[28px] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${activeTab === 'PENDENTES' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Pendentes
            <span className="px-2 py-0.5 rounded-lg bg-gray-200 text-gray-500 text-[10px]">{prazos.filter(p => !p.concluido && !p.cancelado).length}</span>
          </button>
          <button
            onClick={() => setActiveTab('REALIZADAS')}
            className={`flex-1 py-4 px-6 rounded-[28px] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${activeTab === 'REALIZADAS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Realizadas
            <span className="px-2 py-0.5 rounded-lg bg-gray-200 text-gray-500 text-[10px]">{prazos.filter(p => p.concluido).length}</span>
          </button>
          <button
            onClick={() => setActiveTab('CANCELADAS')}
            className={`flex-1 py-4 px-6 rounded-[28px] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${activeTab === 'CANCELADAS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Canceladas
            <span className="px-2 py-0.5 rounded-lg bg-gray-200 text-gray-500 text-[10px]">{prazos.filter(p => p.cancelado).length}</span>
          </button>
        </div>

        <div className="divide-y divide-gray-50">
          {filteredPrazos.length > 0 ? filteredPrazos.map(prazo => {
            const status = getDayLabel(prazo.dataVencimento);
            const proc = processos.find(p => p.id === prazo.processoId);
            const cli = clientes.find(c => c.id === prazo.clienteId);

            return (
              <div
                key={prazo.id}
                onClick={() => { setSelectedPrazo(prazo); setIsDetailModalOpen(true); }}
                className="p-6 px-10 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-6 flex-1 min-w-0">
                  <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-sm ${getTypeStyle(prazo.tipo)} transition-transform group-hover:scale-110`}>
                    {getActivityIcon(prazo.tipo)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-black truncate ${getTypeTextColor(prazo.tipo)}`}>{prazo.descricao}</h3>
                      {prazo.critico && <span className="bg-rose-50 text-rose-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-rose-100">Crítico</span>}
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400">
                      <span className="flex items-center gap-1"><Scale className="w-3 h-3" /> {proc?.numeros[0] || 'Avulso'}</span>
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {cli?.nome}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex items-center gap-10">
                  <div>
                    <p className={`text-sm font-black text-gray-700`}>
                      {prazo.dataVencimento}
                      {prazo.horaVencimento && <span className="text-gray-400 font-bold ml-1">às {prazo.horaVencimento}</span>}
                    </p>
                    {activeTab === 'PENDENTES' ? (
                      <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${status.color.split(' ')[1]}`}>
                        {status.label}
                      </p>
                    ) : (
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                        {activeTab === 'REALIZADAS' ? `Realizada em ${prazo.dataConclusao}` : `Cancelada em ${prazo.dataCancelamento}`}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-200 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          }) : (
            <div className="p-24 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-gray-200">
                <Info className="w-8 h-8 text-gray-200" />
              </div>
              <p className="text-gray-400 font-bold italic">Nenhuma atividade registrada nesta aba.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cadastro */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setIsFormModalOpen(false)}>
          <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-8 pb-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                <Calendar className="w-7 h-7 text-indigo-600" /> {formData.id ? 'Editar Atividade' : 'Nova Atividade'}
              </h2>
              <button onClick={() => setIsFormModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-8 h-8" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scroll space-y-6">
              <form id="prazoForm" onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <FormSelect label="Tipo de Atividade" required value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value as TipoPrazo })}>
                    {Object.values(TipoPrazo).filter(t => t !== TipoPrazo.TAREFA).map(t => <option key={t} value={t}>{t}</option>)}
                  </FormSelect>
                  <FormInput label="Responsável" required value={formData.responsavel} onChange={e => setFormData({ ...formData, responsavel: e.target.value })} />
                </div>

                <FormInput label="Descrição" required placeholder="Ex: Protocolo de Réplica" value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value.toUpperCase() })} />

                <div className="grid grid-cols-2 gap-6">
                  <FormSelect label="Cliente" required value={formData.clienteId} onChange={e => setFormData({ ...formData, clienteId: e.target.value })}>
                    <option value="">Selecione o Cliente...</option>
                    {activeClientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </FormSelect>
                  <FormSelect label="Processo" required value={formData.processoId} onChange={e => setFormData({ ...formData, processoId: e.target.value })}>
                    <option value="">Selecione o Processo...</option>
                    {activeProcessos.map(p => <option key={p.id} value={p.id}>{p.numeros[0]} - {p.objeto}</option>)}
                  </FormSelect>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="grid grid-cols-3 gap-2 col-span-1">
                    <div className="col-span-2">
                      <FormInput label="Data Interna" type="date" required value={toISODate(formData.dataVencimento || '')} onChange={e => setFormData({ ...formData, dataVencimento: toBRDate(e.target.value) })} />
                    </div>
                    <div className="col-span-1">
                      <FormInput label="Hora" type="time" value={formData.horaVencimento} onChange={e => setFormData({ ...formData, horaVencimento: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 col-span-1">
                    <div className="col-span-2">
                      <FormInput label="Data Fatal" type="date" value={toISODate(formData.dataFatal || '')} onChange={e => setFormData({ ...formData, dataFatal: toBRDate(e.target.value) })} />
                    </div>
                    <div className="col-span-1">
                      <FormInput label="Hora" type="time" value={formData.horaFatal} onChange={e => setFormData({ ...formData, horaFatal: e.target.value })} />
                    </div>
                  </div>
                </div>

                {formData.tipo === TipoPrazo.AUDIENCIA && (
                  <FormSelect label="Modalidade da Audiência" required value={formData.modalidade} onChange={e => setFormData({ ...formData, modalidade: e.target.value as ModalidadeAudiencia })}>
                    <option value="">Selecione...</option>
                    {Object.values(ModalidadeAudiencia).map(m => <option key={m} value={m}>{m}</option>)}
                  </FormSelect>
                )}

                <div className="pt-4">
                  <label className="flex items-center gap-3 cursor-pointer p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 hover:bg-indigo-50 hover:border-indigo-200 transition-all">
                    <input type="checkbox" checked={formData.critico} onChange={e => setFormData({ ...formData, critico: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-indigo-600" />
                    <span className="text-xs font-black text-gray-700 uppercase tracking-widest">Marcar como Atividade Crítica / Urgente</span>
                  </label>
                </div>
              </form>
            </div>

            <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex gap-4">
              <button type="button" onClick={() => setIsFormModalOpen(false)} className="flex-1 py-4 bg-white border border-gray-300 text-gray-500 rounded-2xl font-black uppercase text-xs">Cancelar</button>
              <button type="submit" form="prazoForm" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-indigo-100 transition-all hover:bg-indigo-700">Salvar Atividade</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      {isDetailModalOpen && selectedPrazo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[70] flex items-center justify-center p-4" onClick={() => setIsDetailModalOpen(false)}>
          <div className="bg-white rounded-[40px] w-full max-w-4xl shadow-2xl animate-in slide-in-from-bottom-10 duration-500 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-10">
              <div className="flex items-start justify-between mb-10">
                <div className="flex items-center gap-5">
                  <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center shadow-lg ${getTypeStyle(selectedPrazo.tipo)}`}>
                    {getActivityIcon(selectedPrazo.tipo, "w-9 h-9")}
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-gray-800 tracking-tighter">{selectedPrazo.descricao}</h2>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                        <Scale className="w-4 h-4" /> {processos.find(p => p.id === selectedPrazo.processoId)?.numeros[0] || 'Vínculo Avulso'}
                      </span>
                      <span className={`text-xs font-bold uppercase tracking-widest ${getTypeTextColor(selectedPrazo.tipo)}`}>Tipo: {selectedPrazo.tipo}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsHistoryModalOpen(true)} className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"><History className="w-6 h-6" /></button>
                  <button onClick={() => { setFormData(selectedPrazo); setIsFormModalOpen(true); setIsDetailModalOpen(false); }} className="p-3 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-2xl transition-all"><Edit className="w-6 h-6" /></button>
                  <button onClick={() => handleDelete(selectedPrazo.id)} className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"><Trash2 className="w-6 h-6" /></button>
                  <button onClick={() => setIsDetailModalOpen(false)} className="p-3 text-gray-400 hover:text-gray-800 rounded-2xl transition-all ml-4"><X className="w-8 h-8" /></button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-10">
                  <section className="grid grid-cols-2 gap-8">
                    <DetailItem label="Data Interna" value={`${selectedPrazo.dataVencimento}${selectedPrazo.horaVencimento ? ` às ${selectedPrazo.horaVencimento}` : ''}`} icon={<Clock className="w-4 h-4" />} />
                    <DetailItem label="Data Fatal" value={`${selectedPrazo.dataFatal || '-'}${selectedPrazo.horaFatal ? ` às ${selectedPrazo.horaFatal}` : ''}`} icon={<AlertTriangle className="w-4 h-4 text-rose-500" />} />
                    <DetailItem label="Responsável" value={selectedPrazo.responsavel} icon={<User className="w-4 h-4" />} />
                    <DetailItem label="Cliente" value={clientes.find(c => c.id === selectedPrazo.clienteId)?.nome || '-'} icon={<User className="w-4 h-4" />} />
                    {selectedPrazo.tipo === TipoPrazo.AUDIENCIA && (
                      <DetailItem label="Modalidade" value={selectedPrazo.modalidade || '-'} />
                    )}
                  </section>

                  {/* Fluxo de Realização / Cancelamento */}
                  {!selectedPrazo.concluido && !selectedPrazo.cancelado ? (
                    <div className="flex gap-4 pt-6 border-t border-gray-50">
                      <button
                        onClick={() => handleRealizar(selectedPrazo)}
                        className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 transition-all hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="w-5 h-5" /> Marcar Realizada
                      </button>
                      <button
                        onClick={() => handleCancelar(selectedPrazo)}
                        className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition-all"
                      >
                        <XCircle className="w-5 h-5" /> Cancelar Atividade
                      </button>
                    </div>
                  ) : (
                    <section className={`p-8 rounded-[32px] border ${selectedPrazo.concluido ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                      <h4 className={`text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${selectedPrazo.concluido ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {selectedPrazo.concluido ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {selectedPrazo.concluido ? 'Atividade Realizada' : 'Atividade Cancelada'}
                      </h4>
                      <div className="grid grid-cols-2 gap-6 mb-4">
                        <DetailItem label="Data Efetiva" value={selectedPrazo.dataConclusao || selectedPrazo.dataCancelamento || ''} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Observações / Justificativa</p>
                        <p className="text-sm font-bold text-gray-700 italic">"{selectedPrazo.observacoesRealizacao || selectedPrazo.justificativaCancelamento || 'Sem notas.'}"</p>
                      </div>
                    </section>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Integração Financeira */}
                  <div className="bg-gray-50 p-8 rounded-[40px] border border-gray-100">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Lançamentos</h4>
                    <div className="space-y-4">
                      {linkedFinances.length > 0 ? linkedFinances.map(f => (
                        <div key={f.id} className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center group">
                          <div>
                            <p className="text-xs font-black text-gray-800">{f.descricao}</p>
                            <p className={`text-[10px] font-black uppercase ${f.tipo === 'Receita' ? 'text-emerald-500' : 'text-rose-500'}`}>{f.tipo}</p>
                          </div>
                          <p className="text-sm font-black text-gray-800">{formatCurrency(f.valor)}</p>
                        </div>
                      )) : (
                        <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-3xl">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Nenhum vínculo financeiro</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Histórico */}
      {isHistoryModalOpen && selectedPrazo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4" onClick={() => setIsHistoryModalOpen(false)}>
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-gray-800 flex items-center gap-3"><History className="w-6 h-6 text-indigo-600" /> Histórico da Atividade</h2>
                <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-400 hover:text-gray-800 transition-colors"><X className="w-7 h-7" /></button>
              </div>
              <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scroll">
                {historico.filter(h => h.idReferencia === selectedPrazo.id).map((h, i, arr) => (
                  <div key={h.id} className="relative pl-10">
                    <div className="absolute left-0 top-1.5 w-7 h-7 rounded-full border-4 border-white shadow bg-indigo-600 flex items-center justify-center z-10"><div className="w-1.5 h-1.5 rounded-full bg-white"></div></div>
                    {i !== arr.length - 1 && <div className="absolute left-3 top-6 bottom-[-32px] w-0.5 bg-gray-100"></div>}
                    <p className="text-[10px] font-black text-gray-400 mb-1">{h.dataHora}</p>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100"><p className="text-xs font-bold text-gray-700 leading-relaxed">{h.descricao}</p></div>
                  </div>
                ))}
                {historico.filter(h => h.idReferencia === selectedPrazo.id).length === 0 && (
                  <p className="text-center text-gray-300 italic py-10">Nenhum registro encontrado.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Subcomponentes ---
const DetailItem = ({ label, value, icon }: any) => (
  <div className="flex items-start gap-3">
    {icon && <div className="mt-1 text-gray-400">{icon}</div>}
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-sm font-black text-gray-800">{value}</p>
    </div>
  </div>
);

export default DeadlinesPage;
