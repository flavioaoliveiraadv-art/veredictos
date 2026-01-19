
import React, { useState, useMemo, useEffect } from 'react';
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
  CheckSquare,
  XCircle,
  DollarSign,
  Calendar as CalendarIcon,
  Search,
  MessageSquare,
  FileMinus,
  ScrollText,
  FilePenLine,
  Users as UsersIcon,
  Briefcase
} from 'lucide-react';
import { FormInput, FormSelect, FormTextArea } from '../components/FormComponents';
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
  getDaysDifference,
  toBRDate,
  toISODate
} from '../utils/formatters';

interface TasksPageProps {
  prazos: Prazo[];
  setPrazos: React.Dispatch<React.SetStateAction<Prazo[]>>;
  processos: Processo[];
  clientes: Cliente[];
  financeiro: Financeiro[];
  historico: HistoricoAlteracao[];
  setHistorico: React.Dispatch<React.SetStateAction<HistoricoAlteracao[]>>;
}

const TasksPage: React.FC<TasksPageProps> = ({
  prazos, setPrazos, processos, clientes, financeiro, historico, setHistorico
}) => {
  const [activeTab, setActiveTab] = useState<'PENDENTES' | 'REALIZADAS' | 'CANCELADAS'>('PENDENTES');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isTaskTypeSelectionModalOpen, setIsTaskTypeSelectionModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedPrazo, setSelectedPrazo] = useState<Prazo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const todayBR = getTodayBR();

  const INITIAL_STATE: Partial<Prazo> = {
    tipo: TipoPrazo.PRAZO,
    descricao: '',
    observacao: '',
    processoId: '',
    clienteId: '',
    dataVencimento: todayBR,
    horaVencimento: '',
    dataFatal: '',
    horaFatal: '',
    responsavel: '',
    critico: false,
    financeiroIds: [],
    andamentoId: '',
    concluido: false,
    cancelado: false
  };
  const [formData, setFormData] = useState<Partial<Prazo>>(INITIAL_STATE);
  const [isVincularProcesso, setIsVincularProcesso] = useState(false);

  // Sincronizar estado do checkbox de vínculo quando o formulário é aberto (edição)
  useEffect(() => {
    if (isFormModalOpen) {
      setIsVincularProcesso(!!formData.processoId);
    }
  }, [isFormModalOpen, formData.id]);

  // Detectar parâmetros de navegação vindos de Andamentos
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('novatarefa=true')) {
      const params = new URLSearchParams(hash.split('?')[1]);
      const processoId = params.get('processoId') || '';
      const clienteId = params.get('clienteId') || '';
      const descricao = params.get('descricao') ? decodeURIComponent(params.get('descricao')!) : '';

      // Pré-configurar dados do formulário
      setFormData(prev => ({
        ...prev,
        processoId,
        clienteId,
        descricao
      }));
      setIsVincularProcesso(!!processoId);

      // Abrir modal de seleção de tipo de tarefa
      setIsTaskTypeSelectionModalOpen(true);

      // Limpar parâmetros da URL para evitar reabrir o modal no refresh
      window.location.hash = '#/tarefas';
    }
  }, []);

  const addHistorico = (idReferencia: string, descricao: string) => {
    const entry: HistoricoAlteracao = {
      id: `h-task-${Date.now()}`,
      idReferencia,
      dataHora: new Date().toLocaleString('pt-BR'),
      descricao
    };
    setHistorico(prev => [entry, ...prev]);
  };

  const activeClientes = useMemo(() => clientes.filter(c => c.status === 'Ativo'), [clientes]);
  const availableAndamentos = useMemo(() => {
    if (!formData.processoId) return [];
    const proc = processos.find(p => p.id === formData.processoId);
    if (!proc || !proc.andamentos) return [];

    return [...proc.andamentos].sort((a, b) => compareDatesBR(b.data, a.data));
  }, [formData.processoId, processos]);

  const getAndamentoResultado = (and: any) => {
    if (and.sentenca) return and.sentenca.resultado;
    if (and.acordao) return and.acordao.resultado;
    if (and.decisaoInterlocutoria) return and.decisaoInterlocutoria.resultado;
    if (and.decisaoMonocratica) return and.decisaoMonocratica.resultado;
    if (and.despacho) return and.despacho.tipoDespacho;
    return null;
  };

  const activeProcessos = useMemo(() => {
    return [...processos]
      .filter(p => p.status === StatusProcesso.ATIVO)
      .sort((a, b) => {
        const cliA = clientes.find(c => c.id === a.clienteId)?.nome || '';
        const cliB = clientes.find(c => c.id === b.clienteId)?.nome || '';
        return cliA.localeCompare(cliB, 'pt-BR');
      });
  }, [processos, clientes]);

  const filteredItems = useMemo(() => {
    let base = prazos;
    if (activeTab === 'PENDENTES') base = base.filter(p => !p.concluido && !p.cancelado);
    else if (activeTab === 'REALIZADAS') base = base.filter(p => p.concluido);
    else if (activeTab === 'CANCELADAS') base = base.filter(p => p.cancelado);

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      base = base.filter(p => {
        const cli = clientes.find(c => c.id === p.clienteId);
        const proc = processos.find(pr => pr.id === p.processoId);

        return (
          p.descricao.toLowerCase().includes(lowerSearch) ||
          cli?.nome.toLowerCase().includes(lowerSearch) ||
          (proc && (
            proc.numeros.some(n => n.toLowerCase().includes(lowerSearch)) ||
            proc.objeto.toLowerCase().includes(lowerSearch)
          ))
        );
      });
    }

    return base.sort((a, b) => {
      if (activeTab === 'PENDENTES') {
        const diffA = getDaysDifference(a.dataVencimento);
        const diffB = getDaysDifference(b.dataVencimento);
        // Atrasados primeiro (diff < 0)
        if (diffA < 0 && diffB >= 0) return -1;
        if (diffB < 0 && diffA >= 0) return 1;
        return compareDatesBR(a.dataVencimento, b.dataVencimento);
      }
      if (activeTab === 'REALIZADAS') {
        return compareDatesBR(b.dataConclusao || '', a.dataConclusao || '');
      }
      return compareDatesBR(b.dataCancelamento || '', a.dataCancelamento || '');
    });
  }, [prazos, activeTab, todayBR, searchTerm, clientes]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const id = formData.id || `p-${Date.now()}`;
    const isProtocolo = formData.tipo === TipoPrazo.PROTOCOLO;

    // Validação de obrigatoriedade do cliente para Protocolo
    if (isProtocolo && !formData.clienteId) {
      alert('O campo "Cliente" é obrigatório para tarefas do tipo Protocolo.');
      return;
    }

    // Validação de obrigatoriedade do andamento para Prazo e Audiência
    if ((formData.tipo === TipoPrazo.PRAZO || formData.tipo === TipoPrazo.AUDIENCIA) && isVincularProcesso) {
      if (!formData.andamentoId) {
        alert(`O campo "Andamento vinculado" é obrigatório para tarefas do tipo ${formData.tipo}.`);
        return;
      }
    }

    // Se não estiver vinculado ou se for Protocolo, garantir que processoId seja vazio
    const finalProcessoId = (isVincularProcesso && !isProtocolo) ? formData.processoId : '';
    const finalAndamentoId = !isProtocolo ? formData.andamentoId : '';

    const newPrazo: Prazo = {
      ...formData,
      processoId: finalProcessoId,
      andamentoId: finalAndamentoId,
      id,
      concluido: formData.concluido || false,
      cancelado: formData.cancelado || false,
    } as Prazo;

    if (formData.id) {
      setPrazos(prev => prev.map(p => p.id === id ? newPrazo : p));
      addHistorico(id, `Atividade editada. Nova descrição: ${newPrazo.descricao}`);
    } else {
      setPrazos(prev => [...prev, newPrazo]);
      addHistorico(id, 'Atividade cadastrada no sistema.');
    }
    setIsFormModalOpen(false);
    setFormData(INITIAL_STATE);
  };

  const handleRealizar = (prazo: Prazo) => {
    const obs = prompt('Observações da realização:');
    if (obs === null) return;
    const update: Prazo = {
      ...prazo,
      concluido: true,
      dataConclusao: getTodayBR(),
      observacoesRealizacao: obs || ''
    };
    setPrazos(prev => prev.map(p => p.id === prazo.id ? update : p));
    addHistorico(prazo.id, `Atividade marcada como realizada. Obs: ${obs}`);
    setIsDetailModalOpen(false);
  };

  const handleCancelar = (prazo: Prazo) => {
    const jus = prompt('Justificativa obrigatória para o cancelamento:');
    if (jus === null) return;
    if (!jus.trim()) { alert('A justificativa é obrigatória.'); return; }
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

  // Função de Exclusão Corrigida
  const handleDelete = (id: string) => {
    if (confirm('AVISO: Esta é uma exclusão definitiva. A tarefa/prazo será removido permanentemente do sistema. Deseja confirmar a exclusão?')) {
      setPrazos(prev => prev.filter(p => p.id !== id));
      setIsDetailModalOpen(false);
      setSelectedPrazo(null);
    }
  };

  const renderDaysCountdown = (date: string) => {
    const diff = getDaysDifference(date);
    if (diff < 0) return <span className="text-rose-600">Atrasado há {Math.abs(diff)} {Math.abs(diff) === 1 ? 'dia' : 'dias'}</span>;
    if (diff === 0) return <span className="text-amber-600 font-black uppercase">Para Hoje</span>;
    return <span className="text-indigo-600">Em {diff} {diff === 1 ? 'dia' : 'dias'}</span>;
  };

  const getTypeStyle = (tipo: TipoPrazo) => {
    switch (tipo) {
      case TipoPrazo.PRAZO: return 'bg-blue-50 text-blue-600 border-blue-100';
      case TipoPrazo.AUDIENCIA: return 'bg-orange-50 text-orange-600 border-orange-100';
      case TipoPrazo.DILIGENCIA: return 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100';
      case TipoPrazo.REUNIAO: return 'bg-rose-50 text-rose-600 border-rose-100';
      case TipoPrazo.ATENDIMENTO: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case TipoPrazo.ADMINISTRATIVO: return 'bg-[#efebe9] text-[#5d4037] border-[#d7ccc8]';
      case TipoPrazo.PROTOCOLO: return 'bg-slate-50 text-slate-400 border-slate-100';
      case TipoPrazo.OUTROS: return 'bg-slate-100 text-slate-950 border-slate-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  const getTypeTextColor = (tipo: TipoPrazo) => {
    switch (tipo) {
      case TipoPrazo.PRAZO: return 'text-blue-600';
      case TipoPrazo.AUDIENCIA: return 'text-orange-600';
      case TipoPrazo.DILIGENCIA: return 'text-fuchsia-600';
      case TipoPrazo.REUNIAO: return 'text-rose-600';
      case TipoPrazo.ATENDIMENTO: return 'text-emerald-600';
      case TipoPrazo.ADMINISTRATIVO: return 'text-[#5d4037]';
      case TipoPrazo.PROTOCOLO: return 'text-slate-400';
      case TipoPrazo.OUTROS: return 'text-slate-950';
      default: return 'text-gray-400';
    }
  };

  const getActivityIcon = (tipo: TipoPrazo, className = "w-6 h-6") => {
    switch (tipo) {
      case TipoPrazo.AUDIENCIA: return <GavelWithBase className={className} />;
      case TipoPrazo.PRAZO: return <FilePenLine className={className} />;
      case TipoPrazo.DILIGENCIA: return <Briefcase className={className} />;
      case TipoPrazo.REUNIAO: return <UsersIcon className={className} />;
      case TipoPrazo.ATENDIMENTO: return <MessageSquare className={className} />;
      case TipoPrazo.ADMINISTRATIVO: return <CheckSquare className={className} />;
      case TipoPrazo.PROTOCOLO: return <ScrollText className={className} />;
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
          <h1 className="text-3xl font-black text-[#0b1726]">Gestão de Tarefas</h1>
          <p className="text-gray-500 font-medium">Controle central de todas as atividades e prazos do escritório.</p>
        </div>
        <button
          onClick={() => setIsTaskTypeSelectionModalOpen(true)}
          className="bg-[#4f46e5] hover:bg-[#4338ca] text-white px-8 py-3 rounded-2xl flex items-center justify-center gap-2 font-black shadow-xl shadow-indigo-100 transition-all"
        >
          <Plus className="w-5 h-5" /> Nova Tarefa
        </button>
      </header>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-[32px] shadow-sm border border-gray-100">
        <div className="flex items-center bg-gray-100 p-1 rounded-2xl w-full md:w-auto">
          {['PENDENTES', 'REALIZADAS', 'CANCELADAS'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
            >
              {tab}
              {tab === 'PENDENTES' && (
                <span className="ml-2 px-1.5 py-0.5 rounded-md bg-gray-200 text-gray-500 text-[8px]">
                  {prazos.filter(p => !p.concluido && !p.cancelado).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text" placeholder="Buscar por descrição ou cliente..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-2xl border-none outline-none font-medium text-sm"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {filteredItems.length > 0 ? filteredItems.map(item => {
            const proc = processos.find(p => p.id === item.processoId);
            const cli = clientes.find(c => c.id === item.clienteId);

            return (
              <div
                key={item.id}
                onClick={() => { setSelectedPrazo(item); setIsDetailModalOpen(true); }}
                className="p-6 px-10 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-6 flex-1 min-w-0">
                  <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-sm ${getTypeStyle(item.tipo)} transition-transform group-hover:scale-110`}>
                    {getActivityIcon(item.tipo)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`text-lg font-black truncate ${getTypeTextColor(item.tipo)}`}>{item.descricao}</h3>
                      {item.critico && <span className="bg-rose-50 text-rose-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-rose-100">Urgente</span>}
                      {item.tipo === TipoPrazo.AUDIENCIA && item.modalidade && (
                        <span className="bg-orange-50 text-orange-600 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-orange-100">{item.modalidade}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400">
                      <span className={`flex items-center gap-1 uppercase tracking-widest ${getTypeTextColor(item.tipo)}`}>{item.tipo}</span>
                      <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                      <span className="flex items-center gap-1 truncate"><User className="w-3 h-3" /> {cli?.nome || 'Sem Cliente'}</span>
                      <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                      {proc ? (
                        <span className="flex items-center gap-1 truncate"><Scale className="w-3 h-3" /> {proc.numeros[0]}</span>
                      ) : (
                        <span className="flex items-center gap-1 truncate italic text-gray-300"><FileMinus className="w-3 h-3" /> Sem processo vinculado</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right flex items-center gap-10">
                  <div>
                    <p className="text-sm font-black text-gray-700">
                      {item.dataVencimento}
                      {item.horaVencimento && <span className="text-gray-400 font-bold ml-1">às {item.horaVencimento}</span>}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest mt-1">
                      {activeTab === 'PENDENTES' ? renderDaysCountdown(item.dataVencimento) :
                        activeTab === 'REALIZADAS' ? `Realizada em ${item.dataConclusao}` :
                          `Cancelada em ${item.dataCancelamento}`}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-200 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          }) : (
            <div className="p-24 text-center">
              <Info className="w-8 h-8 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400 font-bold italic">Nenhuma atividade encontrada nesta aba.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Seleção do Tipo de Tarefa */}
      {isTaskTypeSelectionModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setIsTaskTypeSelectionModalOpen(false)}>
          <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl animate-in zoom-in duration-300 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-8 text-center border-b border-gray-100">
              <h2 className="text-2xl font-black text-gray-800 mb-2">Nova Tarefa</h2>
              <p className="text-gray-500 font-medium">Selecione o tipo de atividade que deseja cadastrar</p>
            </div>
            <div className="p-8 grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { tipo: TipoPrazo.PRAZO, label: 'Prazo', desc: 'Prazos processuais', icon: <FilePenLine className="w-6 h-6" />, color: 'bg-blue-50 text-blue-600 border-blue-100 hover:border-blue-400' },
                { tipo: TipoPrazo.AUDIENCIA, label: 'Audiência', desc: 'Audiências judiciais', icon: <GavelWithBase className="w-6 h-6" />, color: 'bg-orange-50 text-orange-600 border-orange-100 hover:border-orange-400' },
                { tipo: TipoPrazo.DILIGENCIA, label: 'Diligência', desc: 'Diligências externas', icon: <Briefcase className="w-6 h-6" />, color: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100 hover:border-fuchsia-400' },
                { tipo: TipoPrazo.ADMINISTRATIVO, label: 'Administrativo', desc: 'Tarefas internas', icon: <CheckSquare className="w-6 h-6" />, color: 'bg-[#efebe9] text-[#5d4037] border-[#d7ccc8] hover:border-[#a1887f]' },
                { tipo: TipoPrazo.REUNIAO, label: 'Reunião', desc: 'Reuniões e encontros', icon: <UsersIcon className="w-6 h-6" />, color: 'bg-rose-50 text-rose-600 border-rose-100 hover:border-rose-400' },
                { tipo: TipoPrazo.ATENDIMENTO, label: 'Atendimento', desc: 'Atendimento ao cliente', icon: <MessageSquare className="w-6 h-6" />, color: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:border-emerald-400' },
                { tipo: TipoPrazo.PROTOCOLO, label: 'Protocolo', desc: 'Protocolos de petições', icon: <ScrollText className="w-6 h-6" />, color: 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-300' },
                { tipo: TipoPrazo.OUTROS, label: 'Outros', desc: 'Casos não previstos', icon: <MessageSquare className="w-6 h-6" />, color: 'bg-slate-100 text-slate-950 border-slate-200 hover:border-slate-400' },
              ].map(item => (
                <button
                  key={item.tipo}
                  onClick={() => {
                    setFormData({ ...INITIAL_STATE, tipo: item.tipo });
                    setIsVincularProcesso(false);
                    setIsTaskTypeSelectionModalOpen(false);
                    setIsFormModalOpen(true);
                  }}
                  className={`p-5 rounded-3xl border-2 ${item.color} group transition-all text-left hover:shadow-lg hover:-translate-y-1`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${item.color.split(' ').slice(0, 2).join(' ')}`}>
                    {item.icon}
                  </div>
                  <h3 className="text-sm font-black text-gray-800">{item.label}</h3>
                  <p className="text-[10px] font-bold text-gray-400 mt-1">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setIsFormModalOpen(false)}>
          <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-8 pb-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                <CalendarIcon className="w-7 h-7 text-indigo-600" /> {formData.id ? 'Editar Tarefa' : 'Nova Tarefa'}
              </h2>
              <button onClick={() => setIsFormModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-8 h-8" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scroll">
              <form id="taskForm" onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <FormSelect label="Tipo de Tarefa" required value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value as TipoPrazo })}>
                    {Object.values(TipoPrazo).filter(t => t !== TipoPrazo.TAREFA).map(t => <option key={t} value={t}>{t}</option>)}
                  </FormSelect>
                  <FormSelect label="Advogado Responsável" required value={formData.responsavel} onChange={e => setFormData({ ...formData, responsavel: e.target.value })}>
                    <option value="">Selecione...</option>
                    <option value="Dr. Flávio Oliveira">Dr. Flávio Oliveira</option>
                    <option value="Dr. Rodrigo Lins">Dr. Rodrigo Lins</option>
                  </FormSelect>
                </div>

                <FormInput label="Descrição" required placeholder="Descreva a tarefa" value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value.toUpperCase() })} />

                <FormTextArea
                  label="Observação"
                  placeholder="Observações adicionais (opcional)"
                  value={formData.observacao || ''}
                  onChange={e => setFormData({ ...formData, observacao: e.target.value })}
                />

                {formData.tipo !== TipoPrazo.PROTOCOLO && (
                  <>
                    <div className="grid grid-cols-2 gap-6">
                      <FormSelect label="Cliente" value={formData.clienteId} onChange={e => setFormData({ ...formData, clienteId: e.target.value })}>
                        <option value="">Nenhum cliente vinculado</option>
                        {activeClientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </FormSelect>

                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Vínculo com Processo</label>
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                          <input
                            type="checkbox"
                            id="checkVincularProcesso"
                            checked={isVincularProcesso}
                            onChange={(e) => {
                              setIsVincularProcesso(e.target.checked);
                              if (!e.target.checked) setFormData(prev => ({ ...prev, processoId: '' }));
                            }}
                            className="w-5 h-5 rounded border-gray-300 text-indigo-600"
                          />
                          <label htmlFor="checkVincularProcesso" className="text-xs font-bold text-gray-700 cursor-pointer">Vincular a um processo judicial</label>
                        </div>
                      </div>
                    </div>

                    {isVincularProcesso ? (
                      <div className="animate-in slide-in-from-top-2 duration-300">
                        <FormSelect label="Número do Processo" required={isVincularProcesso} value={formData.processoId} onChange={e => setFormData({ ...formData, processoId: e.target.value })}>
                          <option value="">Selecione o processo ativo...</option>
                          {activeProcessos.map(p => {
                            const cli = clientes.find(c => c.id === p.clienteId);
                            return (
                              <option key={p.id} value={p.id}>
                                {p.numeros[0]} – {p.objeto} – {cli?.nome || 'Cliente não encontrado'}
                              </option>
                            );
                          })}
                        </FormSelect>

                        {availableAndamentos.length > 0 && (
                          <div className="mt-4 animate-in slide-in-from-top-2 duration-300">
                            <FormSelect
                              label="Andamento Vinculado"
                              required={(formData.tipo === TipoPrazo.PRAZO || formData.tipo === TipoPrazo.AUDIENCIA)}
                              value={formData.andamentoId}
                              onChange={e => setFormData({ ...formData, andamentoId: e.target.value })}
                            >
                              <option value="">Selecione o andamento correspondente...</option>
                              {availableAndamentos.map(and => {
                                const resultado = getAndamentoResultado(and);
                                return (
                                  <option key={and.id} value={and.id}>
                                    {and.data} – {and.tipo}{resultado ? ` – ${resultado}` : ''}
                                  </option>
                                );
                              })}
                            </FormSelect>
                          </div>
                        )}

                        {isVincularProcesso && availableAndamentos.length === 0 && (
                          <div className="mt-4 p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-rose-500" />
                            <p className="text-[10px] font-bold text-rose-700 uppercase tracking-widest">Este processo não possui andamentos cadastrados.</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
                        <FileMinus className="w-5 h-5 text-amber-500" />
                        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Tarefa Administrativa / Sem Processo Vinculado</p>
                      </div>
                    )}
                  </>
                )}

                {formData.tipo === TipoPrazo.PROTOCOLO && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    <FormSelect label="Cliente" required value={formData.clienteId} onChange={e => setFormData({ ...formData, clienteId: e.target.value })}>
                      <option value="">Selecione o Cliente...</option>
                      {activeClientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </FormSelect>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="grid grid-cols-3 gap-2 col-span-1">
                    <div className="col-span-2">
                      <FormInput label="Data Interna" type="date" required value={toISODate(formData.dataVencimento || '')} onChange={e => setFormData({ ...formData, dataVencimento: toBRDate(e.target.value) })} />
                    </div>
                    <div className="col-span-1">
                      <FormInput label="Hora" type="time" value={formData.horaVencimento} onChange={e => setFormData({ ...formData, horaVencimento: e.target.value })} />
                    </div>
                  </div>
                  {formData.tipo !== TipoPrazo.PROTOCOLO && (
                    <div className="grid grid-cols-3 gap-2 col-span-1">
                      <div className="col-span-2">
                        <FormInput label="Data Fatal" type="date" value={toISODate(formData.dataFatal || '')} onChange={e => setFormData({ ...formData, dataFatal: toBRDate(e.target.value) })} />
                      </div>
                      <div className="col-span-1">
                        <FormInput label="Hora" type="time" value={formData.horaFatal} onChange={e => setFormData({ ...formData, horaFatal: e.target.value })} />
                      </div>
                    </div>
                  )}
                </div>

                {formData.tipo === TipoPrazo.AUDIENCIA && (
                  <FormSelect label="Modalidade" value={formData.modalidade} onChange={e => setFormData({ ...formData, modalidade: e.target.value as ModalidadeAudiencia })}>
                    <option value="">Selecione...</option>
                    {Object.values(ModalidadeAudiencia).map(m => <option key={m} value={m}>{m}</option>)}
                  </FormSelect>
                )}

                {formData.tipo !== TipoPrazo.PROTOCOLO && (
                  <label className="flex items-center gap-3 cursor-pointer p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 hover:bg-indigo-50 hover:border-indigo-200 transition-all">
                    <input type="checkbox" checked={formData.critico} onChange={e => setFormData({ ...formData, critico: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-indigo-600" />
                    <span className="text-xs font-black text-gray-700 uppercase tracking-widest">Marcar como Tarefa Urgente</span>
                  </label>
                )}
              </form>
            </div>

            <div className="p-8 border-t border-gray-100 bg-gray-50 flex gap-4">
              <button type="button" onClick={() => setIsFormModalOpen(false)} className="flex-1 py-4 bg-white border border-gray-300 text-gray-500 rounded-2xl font-black uppercase text-xs">Cancelar</button>
              <button type="submit" form="taskForm" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-indigo-100">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      {isDetailModalOpen && selectedPrazo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[70] flex items-center justify-center p-4" onClick={() => setIsDetailModalOpen(false)}>
          <div className="bg-white rounded-[40px] w-full max-w-4xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-10">
              <div className="flex items-start justify-between mb-10">
                <div className="flex items-center gap-5">
                  <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center shadow-lg ${getTypeStyle(selectedPrazo.tipo)}`}>
                    {getActivityIcon(selectedPrazo.tipo, "w-9 h-9")}
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-gray-800 tracking-tighter">{selectedPrazo.descricao}</h2>
                    <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest mt-1">{selectedPrazo.tipo} {selectedPrazo.modalidade ? `(${selectedPrazo.modalidade})` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsHistoryModalOpen(true)} className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all" title="Ver Histórico"><History className="w-6 h-6" /></button>
                  <button onClick={() => { setFormData(selectedPrazo); setIsFormModalOpen(true); setIsDetailModalOpen(false); }} className="p-3 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-2xl transition-all" title="Editar Tarefa"><Edit className="w-6 h-6" /></button>
                  <button onClick={() => handleDelete(selectedPrazo.id)} className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all" title="Excluir Tarefa"><Trash2 className="w-6 h-6" /></button>
                  <button onClick={() => setIsDetailModalOpen(false)} className="p-3 text-gray-400 hover:text-gray-800 rounded-2xl transition-all ml-4" title="Fechar"><X className="w-8 h-8" /></button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <DetailItem label="Data Interna" value={`${selectedPrazo.dataVencimento}${selectedPrazo.horaVencimento ? ` às ${selectedPrazo.horaVencimento}` : ''}`} icon={<Clock className="w-4 h-4" />} />
                    <DetailItem label="Data Fatal" value={`${selectedPrazo.dataFatal || '-'}${selectedPrazo.horaFatal ? ` às ${selectedPrazo.horaFatal}` : ''}`} icon={<AlertTriangle className="w-4 h-4 text-rose-500" />} />
                    <DetailItem label="Responsável" value={selectedPrazo.responsavel} icon={<User className="w-4 h-4" />} />
                    <DetailItem label="Cliente" value={clientes.find(c => c.id === selectedPrazo.clienteId)?.nome || '-'} icon={<User className="w-4 h-4" />} />
                    <DetailItem
                      label="Processo Judicial"
                      value={processos.find(p => p.id === selectedPrazo.processoId)?.numeros[0] || 'Sem processo vinculado'}
                      icon={selectedPrazo.processoId ? <Scale className="w-4 h-4" /> : <FileMinus className="w-4 h-4 text-gray-300" />}
                    />
                    {selectedPrazo.processoId && selectedPrazo.andamentoId && (
                      <div className="col-span-2">
                        <DetailItem
                          label="Andamento Vinculado"
                          value={(() => {
                            const proc = processos.find(p => p.id === selectedPrazo.processoId);
                            const and = proc?.andamentos?.find(a => a.id === selectedPrazo.andamentoId);
                            if (!and) return 'Andamento não encontrado';
                            const res = getAndamentoResultado(and);
                            return `${and.data} – ${and.tipo}${res ? ` – ${res}` : ''}`;
                          })()}
                          icon={<Activity className="w-4 h-4" />}
                        />
                      </div>
                    )}
                  </div>

                  {selectedPrazo.observacao && (
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Observação</p>
                      <p className="text-sm font-bold text-gray-700">{selectedPrazo.observacao}</p>
                    </div>
                  )}

                  {!selectedPrazo.concluido && !selectedPrazo.cancelado ? (
                    <div className="flex gap-4 pt-6 border-t border-gray-100">
                      <button onClick={() => handleRealizar(selectedPrazo)} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 transition-all">
                        <CheckCircle2 className="w-5 h-5" /> Marcar como Realizada
                      </button>
                      <button onClick={() => handleCancelar(selectedPrazo)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black flex items-center justify-center gap-2 transition-all">
                        <XCircle className="w-5 h-5" /> Marcar como Cancelada
                      </button>
                    </div>
                  ) : (
                    <div className={`p-8 rounded-[32px] border ${selectedPrazo.concluido ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                      <h4 className={`text-xs font-black uppercase tracking-widest mb-4 ${selectedPrazo.concluido ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {selectedPrazo.concluido ? 'Finalizada' : 'Cancelada'} em {selectedPrazo.dataConclusao || selectedPrazo.dataCancelamento}
                      </h4>
                      <div className="space-y-4">
                        <p className="text-sm font-bold text-gray-700 italic">"{selectedPrazo.observacoesRealizacao || selectedPrazo.justificativaCancelamento || 'Sem notas adicionais.'}"</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="bg-gray-50 p-8 rounded-[40px] border border-gray-100">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Lançamentos</h4>
                    <div className="space-y-4">
                      {linkedFinances.length > 0 ? linkedFinances.map(f => (
                        <div key={f.id} className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                          <div>
                            <p className="text-xs font-black text-gray-800">{f.descricao}</p>
                            <p className="text-[10px] font-bold text-gray-400">{f.status}</p>
                          </div>
                          <p className="text-sm font-black text-gray-800">{formatCurrency(f.valor)}</p>
                        </div>
                      )) : (
                        <p className="text-[10px] text-gray-400 font-bold uppercase text-center py-4">Sem lançamentos vinculados</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Histórico */}
      {isHistoryModalOpen && selectedPrazo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4" onClick={() => setIsHistoryModalOpen(false)}>
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl p-10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-gray-800 flex items-center gap-3"><History className="w-6 h-6 text-indigo-600" /> Histórico de Alterações</h2>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-400"><X className="w-7 h-7" /></button>
            </div>
            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scroll">
              {historico.filter(h => h.idReferencia === selectedPrazo.id).length > 0 ? (
                historico.filter(h => h.idReferencia === selectedPrazo.id).map((h, i, arr) => (
                  <div key={h.id} className="relative pl-10">
                    <div className="absolute left-0 top-1.5 w-7 h-7 rounded-full border-4 border-white shadow bg-indigo-600 flex items-center justify-center z-10"><div className="w-1.5 h-1.5 rounded-full bg-white"></div></div>
                    {i !== arr.length - 1 && <div className="absolute left-3 top-6 bottom-[-32px] w-0.5 bg-gray-100"></div>}
                    <p className="text-[10px] font-black text-gray-400 mb-1">{h.dataHora}</p>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100"><p className="text-xs font-bold text-gray-700 leading-relaxed">{h.descricao}</p></div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-xs italic">Sem registros no histórico.</p>
                </div>
              )}
            </div>
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

export default TasksPage;
