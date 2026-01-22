
import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, FileText, Scale, Clock, AlertTriangle,
  Trash2, Edit, History, X, CheckCircle2, ChevronRight, Save,
  Filter, Calendar, Activity, RotateCcw, ArrowUpRight, Briefcase,
  User, DollarSign, CheckSquare, XCircle, Info
} from 'lucide-react';
import { FormInput, FormSelect, FormTextArea, FormCheckbox } from '../components/FormComponents';
import {
  Processo, Cliente, StatusProcesso, Prazo, Recurso, HistoricoAlteracao,
  AreaAtuacao, FaseProcessual, Financeiro, TipoPrazo, Andamento, TipoAndamento, ProvidenciaAndamento
} from '../types';
import { formatCurrency, maskCurrency, parseCurrency, maskDate, getTodayBR, compareDatesBR, toBRDate, toISODate } from '../utils/formatters';
import { getTaskIcon, getTaskStyle, getTaskTextColor } from '../components/TaskIcon';

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
  const [andamentoErrors, setAndamentoErrors] = useState<Record<string, string>>({});

  // Form States
  const [procFormData, setProcFormData] = useState<Partial<Processo>>(INITIAL_PROC_STATE);
  const [recFormData, setRecFormData] = useState<Partial<Recurso>>(INITIAL_REC_STATE);

  // Tabs inside Details Modal
  const [subTab, setSubTab] = useState<'DADOS' | 'PARTES' | 'TAREFAS' | 'ANDAMENTOS'>('DADOS');

  // Andamento States
  const [isAndamentoTypeModalOpen, setIsAndamentoTypeModalOpen] = useState(false);
  const [isAndamentoModalOpen, setIsAndamentoModalOpen] = useState(false);
  const [isAndamentoDetailModalOpen, setIsAndamentoDetailModalOpen] = useState(false);
  const [selectedAndamento, setSelectedAndamento] = useState<Andamento | null>(null);
  const [andamentoFormData, setAndamentoFormData] = useState<Partial<Andamento>>({
    data: getTodayBR(),
    tipo: TipoAndamento.DESPACHO,
    conteudo: '',
    geraPrazo: false,
    providencia: ProvidenciaAndamento.CIENCIA
  });

  // Quick Prazo States
  const [isQuickPrazoModalOpen, setIsQuickPrazoModalOpen] = useState(false);
  const [quickPrazoData, setQuickPrazoData] = useState<Partial<Prazo>>({});
  const [pendingAndamentoId, setPendingAndamentoId] = useState<string | null>(null);

  // Prazo Detail States (Aba Tarefas e Prazos)
  const [selectedPrazoDetail, setSelectedPrazoDetail] = useState<Prazo | null>(null);
  const [isPrazoDetailModalOpen, setIsPrazoDetailModalOpen] = useState(false);

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

  // Função de Exclusão de Andamento
  const deleteAndamento = (e: React.MouseEvent, andamentoId: string) => {
    e.stopPropagation();
    if (!selectedProcess) return;
    if (confirm('AVISO: Esta é uma exclusão permanente. O andamento será removido definitivamente do histórico do processo. Deseja confirmar a exclusão?')) {
      const updatedAndamentos = (selectedProcess.andamentos || []).filter(a => a.id !== andamentoId);
      const updatedProcess = { ...selectedProcess, andamentos: updatedAndamentos };
      setProcessos(prev => prev.map(p => p.id === selectedProcess.id ? updatedProcess : p));
      setSelectedProcess(updatedProcess);
      addHistorico(selectedProcess.id, 'Andamento excluído do processo.');
    }
  };

  // Função de Edição de Andamento
  const editAndamento = (e: React.MouseEvent, andamento: Andamento) => {
    e.stopPropagation();
    setAndamentoFormData(andamento);
    setIsAndamentoModalOpen(true);
  };

  // Janela de Detalhes do Andamento
  const AndamentoDetailModal = () => {
    if (!selectedAndamento) return null;
    const and = selectedAndamento;

    const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
      <div className="space-y-4 pt-4 border-t border-gray-50 first:pt-0 first:border-0">
        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">{title}</h4>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
          {children}
        </div>
      </div>
    );

    return (
      <div className="fixed inset-0 bg-[#0b1726]/40 backdrop-blur-[2px] z-[100] flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
            <div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Visualização de Andamento</p>
              <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">{and.tipo}</h3>
            </div>
            <button onClick={() => setIsAndamentoDetailModalOpen(false)} className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm group">
              <X className="w-5 h-5 text-gray-400 group-hover:text-rose-500" />
            </button>
          </div>

          <div className="p-8 space-y-10 max-h-[70vh] overflow-y-auto custom-scroll">
            {/* Campos Comuns (Data de Registro) */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-4">
              <DetailField label="Data de Registro" value={and.data} icon={<Calendar className="w-3.5 h-3.5" />} />
            </div>

            {and.tipo === TipoAndamento.SENTENCA && and.sentenca && (
              <>
                <Section title="Identificação da Sentença">
                  <DetailField label="Data da Prolação" value={and.sentenca?.dataProlacao || '-'} />
                  <DetailField label="Data da Publicação" value={and.sentenca?.dataPublicacao || '-'} />
                  <DetailField label="Instância" value={and.sentenca?.instancia || '-'} />
                  <DetailField label="Magistrado" value={and.sentenca?.magistrado || '-'} />
                </Section>
                <Section title="Resultado da Sentença">
                  <DetailField label="Resultado" value={and.sentenca?.resultado || '-'} className="text-indigo-600" />
                  <DetailField label="Decisão Favorável?" value={and.sentenca?.decisaoFavoravel ? 'Sim' : 'Não'} />
                  <DetailField label="Houve Condenação?" value={and.sentenca?.condenacao ? 'Sim' : 'Não'} />
                  {and.sentenca?.condenacao && (
                    <DetailField label="Valor da Condenação" value={formatCurrency(and.sentenca?.valorCondenacao || 0)} className="text-emerald-600" />
                  )}
                  <DetailField label="Obrigação de Fazer/Não Fazer?" value={and.sentenca?.obrigacaoFazerNaoFazer ? 'Sim' : 'Não'} />
                </Section>
                <Section title="Honorários e Custas">
                  <DetailField label="Honorários Advocatícios" value={and.sentenca?.honorariosAdvocaticios || '-'} />
                  <DetailField label="Custas" value={and.sentenca?.custas || '-'} />
                  <DetailField label="Gratuidade de Justiça?" value={and.sentenca?.gratuidadeJustica ? 'Sim' : 'Não'} />
                </Section>
                <div className="space-y-3 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Resumo da Decisão</p>
                  <p className="text-sm font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">{and.sentenca.resumoDecisao || 'Sem resumo detalhado.'}</p>
                </div>
              </>
            )}

            {and.tipo === TipoAndamento.ACORDAO && and.acordao && (
              <>
                <Section title="Identificação do Acórdão">
                  <DetailField label="Tribunal" value={and.acordao.tribunal} />
                  <DetailField label="Órgão Julgador" value={and.acordao.orgaoJulgador} />
                  <DetailField label="Relator" value={and.acordao.relator} />
                  <DetailField label="Recurso Julgado" value={and.acordao.recursoJulgado} />
                  <DetailField label="Parte Recorrente" value={and.acordao.parteRecorrente} />
                  <DetailField label="Número do Julgamento" value={and.acordao.numeroJulgamento} />
                </Section>
                <Section title="Julgamento e Resultado">
                  <DetailField label="Data da Prolação" value={and.acordao.dataProlacao} />
                  <DetailField label="Data da Publicação" value={and.acordao.dataPublicacao} />
                  <DetailField label="Resultado" value={and.acordao.resultado} className="text-indigo-600" />
                  <DetailField label="Modificação da decisão?" value={and.acordao.modificacaoDecisao ? 'Sim' : 'Não'} />
                </Section>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Tese Vencedora</p>
                    <p className="text-sm font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">{and.acordao.resumoTeseVencedora || '-'}</p>
                  </div>
                  <div className="space-y-3 bg-indigo-50/30 p-6 rounded-3xl border border-indigo-100/30">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Notas Estratégicas</p>
                    <p className="text-sm font-medium text-indigo-900/70 leading-relaxed whitespace-pre-wrap">{and.acordao.observacoesEstrategicas || '-'}</p>
                  </div>
                </div>
                <Section title="Aspectos Financeiros e Custas">
                  <DetailField label="Honorários" value={and.acordao.honorarios || '-'} />
                  <DetailField label="Gratuidade de Justiça?" value={and.acordao.gratuidadeJustica ? 'Sim' : 'Não'} />
                  <DetailField label="Custas Judiciais" value={formatCurrency(and.acordao.custas || 0)} />
                  <DetailField label="Multas Aplicadas" value={formatCurrency(and.acordao.multa || 0)} />
                </Section>
              </>
            )}

            {and.tipo === TipoAndamento.DECISAO_INTERLOCUTORIA && and.decisaoInterlocutoria && (
              <>
                <Section title="Identificação da Decisão">
                  <DetailField label="Instância" value={and.decisaoInterlocutoria.instancia} />
                  <DetailField label="Resultado" value={and.decisaoInterlocutoria.resultado} className="text-indigo-600" />
                  <DetailField label="Data da Prolação" value={and.decisaoInterlocutoria.dataProlacao} />
                  <DetailField label="Data da Publicação" value={and.decisaoInterlocutoria.dataPublicacao} />
                </Section>
                <div className="space-y-3 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Resumo Objetivo</p>
                  <p className="text-sm font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">{and.decisaoInterlocutoria.resumoObjetivo || '-'}</p>
                </div>
              </>
            )}

            {and.tipo === TipoAndamento.DECISAO_MONOCRATICA && and.decisaoMonocratica && (
              <>
                <Section title="Identificação do Julgamento">
                  <DetailField label="Recurso analisado" value={and.decisaoMonocratica.recursoAnalisado} />
                  <DetailField label="Tribunal" value={and.decisaoMonocratica.tribunal} />
                  <DetailField label="Órgão julgador" value={and.decisaoMonocratica.orgaoJulgador} />
                  <DetailField label="Relator" value={and.decisaoMonocratica.relator} />
                  <DetailField label="Parte recorrente" value={and.decisaoMonocratica.parteRecorrente} />
                  <DetailField label="Instância" value={and.decisaoMonocratica.instancia} />
                  <DetailField label="Número do julgamento" value={and.decisaoMonocratica.numeroJulgamento} />
                </Section>
                <Section title="Datas e Resultado">
                  <DetailField label="Data da Prolação" value={and.decisaoMonocratica.dataProlacao} />
                  <DetailField label="Data da Publicação" value={and.decisaoMonocratica.dataPublicacao} />
                  <DetailField label="Resultado" value={and.decisaoMonocratica.resultado} className="text-indigo-600" />
                  <DetailField label="Efeito prático" value={and.decisaoMonocratica.efeitoPratico} />
                </Section>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Resumo da Decisão</p>
                    <p className="text-sm font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">{and.decisaoMonocratica.resumoDecisao || '-'}</p>
                  </div>
                  <div className="space-y-3 bg-indigo-50/30 p-6 rounded-3xl border border-indigo-100/30">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Notas Estratégicas</p>
                    <p className="text-sm font-medium text-indigo-900/70 leading-relaxed whitespace-pre-wrap">{and.decisaoMonocratica.observacoesEstrategicas || '-'}</p>
                  </div>
                </div>
                <Section title="Aspectos Financeiros">
                  <DetailField label="Honorários" value={and.decisaoMonocratica.honorarios || '-'} />
                  <DetailField label="Gratuidade de Justiça?" value={and.decisaoMonocratica.gratuidadeJustica} />
                  <DetailField label="Custas Judiciais" value={formatCurrency(and.decisaoMonocratica.custas || 0)} />
                  <DetailField label="Multas Aplicadas" value={formatCurrency(and.decisaoMonocratica.multa || 0)} />
                </Section>
              </>
            )}

            {and.tipo === TipoAndamento.ALVARA && and.alvara && (
              <>
                <Section title="Identificação do Alvará">
                  <DetailField label="Data da Expedição" value={and.alvara.dataExpedicao} />
                  <DetailField label="Tipo de Alvará" value={and.alvara.tipoAlvara} className="text-indigo-600" />
                </Section>
                <div className="space-y-3 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Resumo Objetivo</p>
                  <p className="text-sm font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">{and.alvara.resumoObjetivo || '-'}</p>
                </div>
                <Section title="Aspectos Financeiros">
                  <DetailField label="Origem do Valor" value={and.alvara.origemValor} />
                  <DetailField label="Valor Autorizado" value={formatCurrency(and.alvara.valorAutorizado || 0)} className="text-emerald-600 font-bold" />
                </Section>
              </>
            )}

            {and.tipo === TipoAndamento.CERTIDAO && and.certidao && (
              <>
                <Section title="Identificação da Certidão">
                  <DetailField label="Data da Publicação" value={and.certidao.dataPublicacao} />
                  <DetailField label="Tipo de Certidão" value={and.certidao.tipoCertidao} className="text-indigo-600" />
                </Section>
                <div className="space-y-3 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Resumo Objetivo</p>
                  <p className="text-sm font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">{and.certidao.resumoObjetivo || '-'}</p>
                </div>
              </>
            )}

            {and.tipo === TipoAndamento.DESPACHO && and.despacho && (
              <>
                <Section title="Identificação do Ato">
                  <DetailField label="Instância" value={and.despacho.instancia} />
                  <DetailField label="Data da Prolação" value={and.despacho.dataProlacao} />
                  <DetailField label="Data da Publicação" value={and.despacho.dataPublicacao} />
                  <DetailField label="Tipo de Despacho" value={and.despacho.tipoDespacho} className="text-indigo-600" />
                </Section>
                <div className="space-y-3 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Resumo Objetivo</p>
                  <p className="text-sm font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">{and.despacho.resumoObjetivo || '-'}</p>
                </div>
              </>
            )}

            {/* Observações Estratégicas Gerais (Sempre apresentadas ao final se não houver campo específico) */}
            {!([TipoAndamento.SENTENCA, TipoAndamento.ACORDAO, TipoAndamento.DECISAO_MONOCRATICA].includes(and.tipo as any)) && (
              <div className="space-y-3 bg-indigo-50/30 p-6 rounded-3xl border border-indigo-100/30">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Observações Estratégicas</p>
                <p className="text-sm font-medium text-indigo-900/70 leading-relaxed whitespace-pre-wrap">{and.conteudo || 'Nenhuma observação interna registrada.'}</p>
              </div>
            )}

            {/* Controle de Prazo / Tarefa Vinculada */}
            <div className="space-y-6 pt-6 border-t border-gray-50">
              {(() => {
                const linkedPrazo = prazos.find(p => p.andamentoId === and.id || p.id === and.prazoId);
                if (linkedPrazo) {
                  return (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest ml-1">Tarefa / Prazo Vinculado</h4>
                      <div className="bg-amber-50/50 rounded-[32px] border border-amber-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm ${linkedPrazo.tipo === TipoPrazo.PRAZO ? 'bg-blue-50 text-blue-600 border-blue-100' : getTaskStyle(linkedPrazo.tipo)}`}>
                            {getTaskIcon(linkedPrazo.tipo, "w-6 h-6")}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-0.5">{linkedPrazo.tipo}</p>
                            <h5 className="text-sm font-black text-gray-800">{linkedPrazo.descricao}</h5>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                                <Clock className="w-3 h-3" /> Vencimento: {linkedPrazo.dataVencimento}
                              </span>
                              {linkedPrazo.dataFatal && (
                                <span className="flex items-center gap-1.5 text-[10px] font-black text-rose-500">
                                  <AlertTriangle className="w-3 h-3" /> Fatal: {linkedPrazo.dataFatal}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg border ${linkedPrazo.concluido ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : linkedPrazo.cancelado ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-100 text-amber-600 border-amber-200'}`}>
                            {linkedPrazo.concluido ? 'REALIZADO' : linkedPrazo.cancelado ? 'CANCELADO' : 'PENDENTE'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="flex items-center gap-3 text-gray-400">
                    <Info className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Nenhuma tarefa ou prazo foi gerado a partir deste andamento.</span>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="p-8 bg-gray-50/50 border-t border-gray-50 flex justify-end">
            <button
              onClick={() => setIsAndamentoDetailModalOpen(false)}
              className="bg-white border border-gray-200 text-gray-700 px-8 py-3 rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-sm"
            >
              Fechar Visualização
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Janela de Detalhes Completos do Prazo na Ficha do Processo
  const PrazoDetailModal = () => {
    if (!selectedPrazoDetail) return null;
    const p = selectedPrazoDetail;
    const cli = clientes.find(c => c.id === p.clienteId);
    const proc = processos.find(proc => proc.id === p.processoId);

    const getDayLabel = (date: string) => {
      const todayBR = getTodayBR();
      const diff = compareDatesBR(date, todayBR);
      if (diff < 0) return { label: 'Atrasado', color: 'bg-rose-100 text-rose-600' };
      if (diff === 0) return { label: 'Para Hoje', color: 'bg-amber-100 text-amber-600' };
      if (diff <= 3) return { label: 'Próximo', color: 'bg-indigo-100 text-indigo-600' };
      return { label: 'Em Dia', color: 'bg-emerald-100 text-emerald-600' };
    };

    const statusLabel = getDayLabel(p.dataVencimento);

    const DetailItem = ({ label, value, icon }: any) => (
      <div className="flex items-start gap-3">
        {icon && <div className="mt-1 text-gray-400">{icon}</div>}
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
          <p className="text-sm font-black text-gray-800">{value}</p>
        </div>
      </div>
    );

    return (
      <div className="fixed inset-0 bg-[#0b1726]/40 backdrop-blur-[2px] z-[110] flex items-center justify-center p-4" onClick={() => setIsPrazoDetailModalOpen(false)}>
        <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
          <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm ${p.tipo === TipoPrazo.PRAZO ? 'bg-blue-50 text-blue-600 border-blue-100' : getTaskStyle(p.tipo)}`}>
                {getTaskIcon(p.tipo, "w-6 h-6")}
              </div>
              <div>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Detalhes da Tarefa</p>
                <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">{p.descricao}</h3>
              </div>
            </div>
            <button onClick={() => setIsPrazoDetailModalOpen(false)} className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm group">
              <X className="w-5 h-5 text-gray-400 group-hover:text-rose-500" />
            </button>
          </div>

          <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scroll">
            <div className="grid grid-cols-2 gap-y-8 gap-x-12">
              <DetailItem label="Tipo" value={p.tipo} icon={<Scale className="w-4 h-4" />} />
              <DetailItem label="Responsável" value={p.responsavel} icon={<User className="w-4 h-4" />} />
              <DetailItem label="Data Interna" value={`${p.dataVencimento}${p.horaVencimento ? ` às ${p.horaVencimento}` : ''}`} icon={<Clock className="w-4 h-4" />} />
              <DetailItem label="Data Fatal" value={`${p.dataFatal || '-'}${p.horaFatal ? ` às ${p.horaFatal}` : ''}`} icon={<AlertTriangle className="w-4 h-4 text-rose-500" />} />
              <DetailItem label="Cliente" value={cli?.nome || '-'} icon={<User className="w-4 h-4" />} />
              <DetailItem label="Processo" value={proc?.numeros[0] || '-'} icon={<Briefcase className="w-4 h-4" />} />

              <div className="col-span-2 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-100">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1.5">Andamento de Origem</p>
                    {(() => {
                      const originAndamento = proc?.andamentos?.find(a => a.id === p.andamentoId);
                      if (originAndamento) {
                        const getAndamentoDate = (a: any) => {
                          if (a.tipo === TipoAndamento.SENTENCA) return a.sentenca?.dataProlacao;
                          if (a.tipo === TipoAndamento.ACORDAO) return a.acordao?.dataProlacao;
                          if (a.tipo === TipoAndamento.DECISAO_INTERLOCUTORIA) return a.decisaoInterlocutoria?.dataProlacao;
                          if (a.tipo === TipoAndamento.DECISAO_MONOCRATICA) return a.decisaoMonocratica?.dataProlacao;
                          if (a.tipo === TipoAndamento.ALVARA) return a.alvara?.dataExpedicao;
                          if (a.tipo === TipoAndamento.CERTIDAO) return a.certidao?.dataPublicacao;
                          if (a.tipo === TipoAndamento.DESPACHO) return a.despacho?.dataProlacao;
                          return a.data;
                        };
                        return (
                          <p className="text-sm font-black text-gray-800 uppercase">
                            {getAndamentoDate(originAndamento)} – {originAndamento.tipo}
                          </p>
                        );
                      }
                      return (
                        <p className="text-sm font-bold text-gray-400 italic">
                          Tarefa manual (sem vínculo com andamento)
                        </p>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="col-span-2">
                <DetailItem label="Observações" value={p.observacao || 'Nenhuma observação registrada.'} icon={<FileText className="w-4 h-4" />} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-gray-50">
              <span className={`text-[10px] font-black px-4 py-2 rounded-xl border ${p.concluido ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : p.cancelado ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                STATUS: {p.concluido ? 'REALIZADO' : p.cancelado ? 'CANCELADO' : 'PENDENTE'}
              </span>
              {p.critico && (
                <span className="bg-rose-100 text-rose-600 text-[10px] font-black px-4 py-2 rounded-xl border border-rose-200 uppercase tracking-widest">
                  URGENTE / CRÍTICO
                </span>
              )}
              {p.dataConclusao && (
                <span className="text-[10px] font-bold text-gray-400">Finalizado em: {p.dataConclusao}</span>
              )}
            </div>

            {(p.observacoesRealizacao || p.justificativaCancelamento) && (
              <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nota de Conclusão/Cancelamento</p>
                <p className="text-sm font-medium text-gray-700 italic">"{p.observacoesRealizacao || p.justificativaCancelamento}"</p>
              </div>
            )}
          </div>

          <div className="p-8 bg-gray-50/50 border-t border-gray-50 flex justify-end">
            <button
              onClick={() => setIsPrazoDetailModalOpen(false)}
              className="bg-white border border-gray-200 text-gray-700 px-8 py-3 rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-sm"
            >
              Fechar Detalhes
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {isAndamentoDetailModalOpen && <AndamentoDetailModal />}
        {isPrazoDetailModalOpen && <PrazoDetailModal />}
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
                      <h3 className="text-lg font-black text-gray-800 leading-tight">{rec.numeroRecurso}</h3>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-orange-600">{rec.tipoRecurso}</p>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Ref: {pai?.numeros[0]}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-gray-400">
                        <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {cli?.nome}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-black uppercase tracking-tighter bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                    <Clock className="w-3.5 h-3.5 text-orange-400" /> Atualizado em {rec.ultimaAtualizacao || rec.dataDistribuicao}
                  </div>
                  <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${rec.status === StatusProcesso.ATIVO ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>{rec.status === StatusProcesso.ATIVO ? 'ATIVO' : 'ARQUIVADO'}</span>
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
                      </div>
                      <div className="space-y-3">
                        {prazos.filter(p => p.processoId === selectedProcess.id).length > 0 ? (
                          prazos.filter(p => p.processoId === selectedProcess.id).map(p => (
                            <div key={p.id}
                              onClick={() => { setSelectedPrazoDetail(p); setIsPrazoDetailModalOpen(true); }}
                              className="p-5 bg-white rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group/prazo"
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${p.tipo === TipoPrazo.PRAZO ? 'bg-blue-50 text-blue-600 border-blue-100' : getTaskStyle(p.tipo)}`}>
                                  {getTaskIcon(p.tipo, "w-5 h-5")}
                                </div>
                                <div>
                                  <p className="text-sm font-black text-gray-800 group-hover/prazo:text-indigo-600 transition-colors">{p.descricao}</p>
                                  <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> Vence em: {p.dataVencimento}</span>
                                    {p.critico && <span className="bg-rose-100 text-rose-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">CRÍTICO</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${p.concluido ? 'bg-emerald-100 text-emerald-600' : p.cancelado ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                                  {p.concluido ? 'Realizado' : p.cancelado ? 'Cancelado' : 'Pendente'}
                                </span>
                                <ChevronRight className="w-4 h-4 text-gray-200 group-hover/prazo:text-indigo-400 group-hover/prazo:translate-x-1 transition-all" />
                              </div>
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
                            setAndamentoFormData({ data: getTodayBR(), tipo: TipoAndamento.DESPACHO, conteudo: '', geraPrazo: false, providencia: ProvidenciaAndamento.CIENCIA });
                            setIsAndamentoTypeModalOpen(true);
                          }}
                          className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2"
                        >
                          <Plus className="w-3 h-3" /> Novo Andamento
                        </button>
                      </div>

                      <div className="space-y-2">
                        {selectedProcess.andamentos && selectedProcess.andamentos.length > 0 ? (
                          [...selectedProcess.andamentos].reverse().map((and, idx) => (
                            <div key={and.id} className="relative pl-10">
                              <div className="absolute left-0 top-1.5 w-7 h-7 rounded-full border-4 border-white shadow bg-indigo-100 flex items-center justify-center z-10 text-indigo-600">
                                <Activity className="w-3 h-3" />
                              </div>
                              {idx !== selectedProcess.andamentos!.length - 1 && <div className="absolute left-3.5 top-6 bottom-[-16px] w-0.5 bg-indigo-50"></div>}

                              <div
                                onClick={() => { setSelectedAndamento(and); setIsAndamentoDetailModalOpen(true); }}
                                className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-100 transition-all cursor-pointer group/and"
                              >
                                <div className="flex items-start justify-between mb-1">
                                  <div>
                                    <div className="flex items-center gap-3 mb-1">
                                      <span className="text-xs font-black text-gray-800">
                                        {(and.tipo === TipoAndamento.SENTENCA && and.sentenca?.dataPublicacao) ||
                                          (and.tipo === TipoAndamento.ACORDAO && and.acordao?.dataPublicacao) ||
                                          (and.tipo === TipoAndamento.DECISAO_INTERLOCUTORIA && and.decisaoInterlocutoria?.dataPublicacao) ||
                                          (and.tipo === TipoAndamento.DECISAO_MONOCRATICA && and.decisaoMonocratica?.dataPublicacao) ||
                                          (and.tipo === TipoAndamento.ALVARA && and.alvara?.dataExpedicao) ||
                                          (and.tipo === TipoAndamento.CERTIDAO && and.certidao?.dataPublicacao) ||
                                          (and.tipo === TipoAndamento.DESPACHO && and.despacho?.dataPublicacao) ||
                                          and.data
                                        }
                                      </span>
                                      <span className="bg-indigo-50 text-indigo-600 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest">{and.tipo}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover/and:opacity-100 transition-opacity">
                                    <button
                                      onClick={(e) => editAndamento(e, and)}
                                      className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                                      title="Editar Andamento"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(e) => deleteAndamento(e, and.id)}
                                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                      title="Excluir Andamento"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                <div className="p-2 bg-gray-50/50 rounded-xl border border-gray-50">
                                  {/* Renderização Simplificada Padronizada */}
                                  <div className="flex flex-col gap-2">
                                    {and.tipo === TipoAndamento.DESPACHO && and.despacho && (
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="bg-indigo-50 text-indigo-600 text-[9px] font-black px-3 py-1.5 rounded-xl border border-indigo-100 uppercase uppercase shadow-sm">
                                          Tipo de Despacho: {and.despacho.tipoDespacho}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-16 bg-gray-50 rounded-[40px] border border-dashed border-gray-200">
                            <Activity className="w-10 h-10 text-gray-200 mx-auto mb-4" />
                            <p className="text-sm text-gray-400 font-bold italic mb-4">Inicie o registro cronológico dos andamentos.</p>
                            <button
                              onClick={() => setIsAndamentoTypeModalOpen(true)}
                              className="text-indigo-600 text-xs font-black uppercase tracking-widest hover:underline"
                            >
                              Adicionar primeiro andamento
                            </button>
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
      {/* MODAL SELEÇÃO DE TIPO DE ANDAMENTO */}
      {isAndamentoTypeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4" onClick={() => setIsAndamentoTypeModalOpen(false)}>
          <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                    <Activity className="w-8 h-8 text-indigo-600" /> Tipo de Andamento
                  </h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Selecione o tipo jurídico obrigatório</p>
                </div>
                <button onClick={() => setIsAndamentoTypeModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-8 h-8" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {Object.values(TipoAndamento).map((tipo) => (
                  <button
                    key={tipo}
                    onClick={() => {
                      const initialData: Partial<Andamento> = { ...andamentoFormData, tipo };
                      if (tipo === TipoAndamento.SENTENCA) {
                        initialData.sentenca = {
                          dataProlacao: getTodayBR(),
                          dataPublicacao: getTodayBR(),
                          instancia: '1º grau',
                          magistrado: '',
                          resultado: 'Procedente',
                          decisaoFavoravel: true,
                          condenacao: false,
                          valorCondenacao: 0,
                          obrigacaoFazerNaoFazer: false,
                          resumoDecisao: '',
                          honorariosAdvocaticios: '',
                          custas: '',
                          gratuidadeJustica: false,
                          gerarPrazoTarefaAdm: false
                        };
                      } else if (tipo === TipoAndamento.ACORDAO) {
                        initialData.acordao = {
                          tribunal: '',
                          orgaoJulgador: '',
                          relator: '',
                          recursoJulgado: '',
                          parteRecorrente: '',
                          numeroJulgamento: '',
                          dataProlacao: getTodayBR(),
                          dataPublicacao: getTodayBR(),
                          resultado: 'Provido',
                          modificacaoDecisao: false,
                          resumoTeseVencedora: '',
                          observacoesEstrategicas: '',
                          honorarios: '',
                          custas: 0,
                          multa: 0,
                          gratuidadeJustica: false,
                          gerarPrazoTarefaAdm: false
                        };
                      } else if (tipo === TipoAndamento.DECISAO_INTERLOCUTORIA) {
                        initialData.decisaoInterlocutoria = {
                          instancia: '1º grau',
                          dataProlacao: getTodayBR(),
                          dataPublicacao: getTodayBR(),
                          resumoObjetivo: '',
                          resultado: 'Deferido',
                          gerarPrazoTarefaAdm: false
                        };
                      } else if (tipo === TipoAndamento.DECISAO_MONOCRATICA) {
                        initialData.decisaoMonocratica = {
                          recursoAnalisado: '',
                          tribunal: '',
                          orgaoJulgador: 'Câmara',
                          relator: '',
                          parteRecorrente: '',
                          instancia: '1º grau',
                          numeroJulgamento: '',
                          dataProlacao: getTodayBR(),
                          dataPublicacao: getTodayBR(),
                          resultado: 'Provido',
                          efeitoPratico: 'Mantida a decisão recorrida',
                          resumoDecisao: '',
                          observacoesEstrategicas: '',
                          honorarios: '',
                          custas: 0,
                          multa: 0,
                          gratuidadeJustica: 'Não',
                          gerarPrazoTarefaAdm: false
                        };
                      } else if (tipo === TipoAndamento.ALVARA) {
                        initialData.alvara = {
                          dataExpedicao: getTodayBR(),
                          tipoAlvara: 'Levantamento de valores',
                          resumoObjetivo: '',
                          valorAutorizado: 0,
                          origemValor: 'Depósito judicial',
                          gerarTarefaAcompanhamento: false
                        };
                      } else if (tipo === TipoAndamento.CERTIDAO) {
                        initialData.certidao = {
                          dataPublicacao: getTodayBR(),
                          tipoCertidao: 'Decurso de prazo',
                          resumoObjetivo: '',
                          gerarTarefaAdministrativa: false
                        };
                      } else if (tipo === TipoAndamento.DESPACHO) {
                        initialData.despacho = {
                          instancia: '1º grau',
                          dataProlacao: getTodayBR(),
                          dataPublicacao: getTodayBR(),
                          tipoDespacho: 'Ordinatório ou Mero Expediente',
                          resumoObjetivo: '',
                          gerarPrazoTarefaAdm: false
                        };
                      }
                      setAndamentoFormData(initialData);
                      setAndamentoErrors({});
                      setIsAndamentoTypeModalOpen(false);
                      setIsAndamentoModalOpen(true);
                    }}
                    className="flex items-center justify-between p-5 bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 rounded-2xl transition-all group"
                  >
                    <span className="text-sm font-black text-gray-700 group-hover:text-indigo-700">{tipo}</span>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-400" />
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsAndamentoTypeModalOpen(false)}
                className="w-full mt-8 py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl font-black uppercase text-xs hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )
      }
      {/* MODAL ANDAMENTOS */}
      {
        isAndamentoModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] w-full max-w-2xl max-h-[90vh] shadow-2xl animate-in zoom-in duration-300 flex flex-col overflow-hidden">
              {/* CABEÇALHO FIXO */}
              <div className="p-10 pb-6 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                    <Activity className="w-8 h-8 text-indigo-600" /> {andamentoFormData.id ? 'Editar Andamento' : 'Novo Andamento'}
                  </h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Tipo: {andamentoFormData.tipo || 'Não selecionado'}</p>
                </div>
                <button
                  onClick={() => setIsAndamentoModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  type="button"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>

              {/* CORPO ROLÁVEL */}
              <div className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar">
                <form
                  className="space-y-8"
                  id="andamentoForm"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!selectedProcess) return;

                    // Validação de Datas Obrigatórias por Tipo
                    const errors: Record<string, string> = {};
                    const type = andamentoFormData.tipo;

                    if (type === TipoAndamento.SENTENCA && andamentoFormData.sentenca) {
                      if (!andamentoFormData.sentenca.dataProlacao) errors.sentenca_dataProlacao = 'Obrigatório';
                      if (!andamentoFormData.sentenca.dataPublicacao) errors.sentenca_dataPublicacao = 'Obrigatório';
                    } else if (type === TipoAndamento.ACORDAO && andamentoFormData.acordao) {
                      if (!andamentoFormData.acordao.dataProlacao) errors.acordao_dataProlacao = 'Obrigatório';
                      if (!andamentoFormData.acordao.dataPublicacao) errors.acordao_dataPublicacao = 'Obrigatório';
                    } else if (type === TipoAndamento.DECISAO_INTERLOCUTORIA && andamentoFormData.decisaoInterlocutoria) {
                      if (!andamentoFormData.decisaoInterlocutoria.dataProlacao) errors.decisao_dataProlacao = 'Obrigatório';
                      if (!andamentoFormData.decisaoInterlocutoria.dataPublicacao) errors.decisao_dataPublicacao = 'Obrigatório';
                    } else if (type === TipoAndamento.DECISAO_MONOCRATICA && andamentoFormData.decisaoMonocratica) {
                      if (!andamentoFormData.decisaoMonocratica.dataProlacao) errors.decisaoMon_dataProlacao = 'Obrigatório';
                      if (!andamentoFormData.decisaoMonocratica.dataPublicacao) errors.decisaoMon_dataPublicacao = 'Obrigatório';
                    } else if (type === TipoAndamento.DESPACHO && andamentoFormData.despacho) {
                      if (!andamentoFormData.despacho.dataProlacao) errors.despacho_dataProlacao = 'Obrigatório';
                      if (!andamentoFormData.despacho.dataPublicacao) errors.despacho_dataPublicacao = 'Obrigatório';
                    } else if (type === TipoAndamento.CERTIDAO && andamentoFormData.certidao) {
                      if (!andamentoFormData.certidao.dataPublicacao) errors.certidao_dataPublicacao = 'Obrigatório';
                    }

                    if (Object.keys(errors).length > 0) {
                      setAndamentoErrors(errors);
                      return;
                    }

                    const isEdit = !!andamentoFormData.id;
                    const and: Andamento = {
                      ...andamentoFormData,
                      id: andamentoFormData.id || `and-${Date.now()}`
                    } as Andamento;

                    let updatedAndamentos = [...(selectedProcess.andamentos || [])];
                    if (isEdit) {
                      updatedAndamentos = updatedAndamentos.map(a => a.id === and.id ? and : a);
                    } else {
                      updatedAndamentos.push(and);
                    }

                    const updatedProcesso = {
                      ...selectedProcess,
                      andamentos: updatedAndamentos,
                      ultimaAtualizacao: getTodayBR()
                    };

                    setProcessos(prev => prev.map(p => p.id === selectedProcess.id ? updatedProcesso : p));
                    setSelectedProcess(updatedProcesso);
                    addHistorico(selectedProcess.id, isEdit ? `Andamento atualizado: ${and.tipo}` : `Novo andamento registrado: ${and.tipo}`);
                    setIsAndamentoModalOpen(false);

                    if (!isEdit && and.geraPrazo) {
                      // Navegar para página de Tarefas com parâmetros para abrir modal de seleção
                      window.location.hash = `#/tarefas?novatarefa=true&processoId=${selectedProcess.id}&clienteId=${selectedProcess.clienteId}&descricao=${encodeURIComponent(`${and.providencia.toUpperCase()}: ${and.tipo}`)}`;
                    }
                  }}
                >
                  {andamentoFormData.tipo === TipoAndamento.SENTENCA && andamentoFormData.sentenca && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Identificação da Sentença</h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <FormInput
                            label="Data da Prolação"
                            type="date"
                            required
                            error={andamentoErrors.sentenca_dataProlacao}
                            value={toISODate(andamentoFormData.sentenca.dataProlacao)}
                            onChange={(e: any) => {
                              setAndamentoFormData({
                                ...andamentoFormData,
                                sentenca: { ...andamentoFormData.sentenca!, dataProlacao: toBRDate(e.target.value) }
                              });
                              setAndamentoErrors(prev => ({ ...prev, sentenca_dataProlacao: '' }));
                            }}
                          />
                          <FormInput
                            label="Data da Publicação"
                            type="date"
                            required
                            error={andamentoErrors.sentenca_dataPublicacao}
                            value={toISODate(andamentoFormData.sentenca.dataPublicacao)}
                            onChange={(e: any) => {
                              setAndamentoFormData({
                                ...andamentoFormData,
                                sentenca: { ...andamentoFormData.sentenca!, dataPublicacao: toBRDate(e.target.value) }
                              });
                              setAndamentoErrors(prev => ({ ...prev, sentenca_dataPublicacao: '' }));
                            }}
                          />
                          <FormSelect
                            label="Instância"
                            required
                            value={andamentoFormData.sentenca.instancia}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              sentenca: { ...andamentoFormData.sentenca!, instancia: e.target.value as any }
                            })}
                          >
                            <option value="1º grau">1º grau</option>
                            <option value="2º grau">2º grau</option>
                            <option value="Tribunal Superior">Tribunal Superior</option>
                          </FormSelect>
                          <FormInput
                            label="Magistrado"
                            placeholder="Nome do Juiz/Desembargador"
                            value={andamentoFormData.sentenca.magistrado}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              sentenca: { ...andamentoFormData.sentenca!, magistrado: e.target.value }
                            })}
                          />
                        </div>
                      </div>

                      {/* Resultado */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Resultado da Sentença</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          <FormSelect
                            label="Resultado"
                            required
                            value={andamentoFormData.sentenca.resultado}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              sentenca: { ...andamentoFormData.sentenca!, resultado: e.target.value as any }
                            })}
                          >
                            <option value="Procedente">Procedente</option>
                            <option value="Parcialmente procedente">Parcialmente procedente</option>
                            <option value="Improcedente">Improcedente</option>
                            <option value="Extinção sem resolução do mérito">Extinção sem resolução do mérito</option>
                            <option value="Homologação de acordo">Homologação de acordo</option>
                          </FormSelect>
                          <FormSelect
                            label="Decisão Favorável?"
                            value={andamentoFormData.sentenca.decisaoFavoravel ? 'S' : 'N'}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              sentenca: { ...andamentoFormData.sentenca!, decisaoFavoravel: e.target.value === 'S' }
                            })}
                          >
                            <option value="S">Sim</option>
                            <option value="N">Não</option>
                          </FormSelect>
                          <FormSelect
                            label="Houve Condenação?"
                            value={andamentoFormData.sentenca.condenacao ? 'S' : 'N'}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              sentenca: { ...andamentoFormData.sentenca!, condenacao: e.target.value === 'S' }
                            })}
                          >
                            <option value="N">Não</option>
                            <option value="S">Sim</option>
                          </FormSelect>
                        </div>
                        {andamentoFormData.sentenca.condenacao && (
                          <FormInput
                            label="Valor da Condenação"
                            placeholder="R$ 0,00"
                            value={formatCurrency(andamentoFormData.sentenca.valorCondenacao || 0)}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              sentenca: { ...andamentoFormData.sentenca!, valorCondenacao: parseCurrency(e.target.value) }
                            })}
                          />
                        )}
                        <FormSelect
                          label="Obrigação de Fazer/Não Fazer?"
                          value={andamentoFormData.sentenca.obrigacaoFazerNaoFazer ? 'S' : 'N'}
                          onChange={(e: any) => setAndamentoFormData({
                            ...andamentoFormData,
                            sentenca: { ...andamentoFormData.sentenca!, obrigacaoFazerNaoFazer: e.target.value === 'S' }
                          })}
                        >
                          <option value="N">Não</option>
                          <option value="S">Sim</option>
                        </FormSelect>
                      </div>

                      {/* Honorários e Custas */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Honorários e Custas</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <FormInput
                            label="Honorários Advocatícios"
                            placeholder="Ex: R$ 5.000,00 ou 10% sobre o valor da condenação"
                            value={andamentoFormData.sentenca.honorariosAdvocaticios || ''}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              sentenca: { ...andamentoFormData.sentenca!, honorariosAdvocaticios: e.target.value }
                            })}
                          />
                          <FormInput
                            label="Custas"
                            placeholder="Ex: R$ 500,00 ou Isenção por gratuidade"
                            value={andamentoFormData.sentenca.custas || ''}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              sentenca: { ...andamentoFormData.sentenca!, custas: e.target.value }
                            })}
                          />
                        </div>
                        <FormSelect
                          label="Gratuidade de Justiça?"
                          value={andamentoFormData.sentenca.gratuidadeJustica ? 'S' : 'N'}
                          onChange={(e: any) => setAndamentoFormData({
                            ...andamentoFormData,
                            sentenca: { ...andamentoFormData.sentenca!, gratuidadeJustica: e.target.value === 'S' }
                          })}
                        >
                          <option value="N">Não</option>
                          <option value="S">Sim</option>
                        </FormSelect>
                      </div>

                      {/* Conteúdo do Ato */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Conteúdo da Sentença</h4>
                        <FormTextArea
                          label="Resumo da Decisão"
                          placeholder="Resumo jurídico da sentença..."
                          value={andamentoFormData.sentenca.resumoDecisao}
                          onChange={(e: any) => setAndamentoFormData({
                            ...andamentoFormData,
                            sentenca: { ...andamentoFormData.sentenca!, resumoDecisao: e.target.value }
                          })}
                        />
                      </div>

                      {/* Gerar Tarefa - Último campo do formulário */}
                      <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100">
                        <FormCheckbox
                          label="Gerar tarefa"
                          description="Ao marcar, você será redirecionado para criar uma tarefa vinculada a este andamento"
                          checked={andamentoFormData.geraPrazo}
                          onChange={(e: any) => {
                            const val = e.target.checked;
                            setAndamentoFormData({
                              ...andamentoFormData,
                              geraPrazo: val,
                              sentenca: { ...andamentoFormData.sentenca!, gerarPrazoTarefaAdm: val }
                            });
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {andamentoFormData.tipo === TipoAndamento.ACORDAO && andamentoFormData.acordao && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Identificação do Acórdão</h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <FormInput
                            label="Tribunal"
                            placeholder="Ex: TJPE, TRF5, STJ"
                            value={andamentoFormData.acordao.tribunal}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              acordao: { ...andamentoFormData.acordao!, tribunal: e.target.value }
                            })}
                          />
                          <FormInput
                            label="Órgão Julgador"
                            placeholder="Ex: 1ª Câmara Cível"
                            value={andamentoFormData.acordao.orgaoJulgador}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              acordao: { ...andamentoFormData.acordao!, orgaoJulgador: e.target.value }
                            })}
                          />
                          <FormInput
                            label="Relator"
                            placeholder="Nome do Desembargador/Ministro"
                            value={andamentoFormData.acordao.relator}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              acordao: { ...andamentoFormData.acordao!, relator: e.target.value }
                            })}
                          />
                          <FormInput
                            label="Recurso Julgado"
                            placeholder="Ex: Apelação Cível"
                            value={andamentoFormData.acordao.recursoJulgado}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              acordao: { ...andamentoFormData.acordao!, recursoJulgado: e.target.value }
                            })}
                          />
                          <FormInput
                            label="Parte Recorrente"
                            placeholder="Nome da parte que recorreu"
                            value={andamentoFormData.acordao.parteRecorrente}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              acordao: { ...andamentoFormData.acordao!, parteRecorrente: e.target.value }
                            })}
                          />
                          <FormInput
                            label="Número do Julgamento"
                            placeholder="Nº do acórdão ou processo no tribunal"
                            value={andamentoFormData.acordao.numeroJulgamento}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              acordao: { ...andamentoFormData.acordao!, numeroJulgamento: e.target.value }
                            })}
                          />
                        </div>
                      </div>

                      {/* Datas e Resultado */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Julgamento e Resultado</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <FormInput
                            label="Data da Prolação"
                            type="date"
                            required
                            error={andamentoErrors.acordao_dataProlacao}
                            value={toISODate(andamentoFormData.acordao.dataProlacao)}
                            onChange={(e: any) => {
                              setAndamentoFormData({
                                ...andamentoFormData,
                                acordao: { ...andamentoFormData.acordao!, dataProlacao: toBRDate(e.target.value) }
                              });
                              setAndamentoErrors(prev => ({ ...prev, acordao_dataProlacao: '' }));
                            }}
                          />
                          <FormInput
                            label="Data da Publicação"
                            type="date"
                            required
                            error={andamentoErrors.acordao_dataPublicacao}
                            value={toISODate(andamentoFormData.acordao.dataPublicacao)}
                            onChange={(e: any) => {
                              setAndamentoFormData({
                                ...andamentoFormData,
                                acordao: { ...andamentoFormData.acordao!, dataPublicacao: toBRDate(e.target.value) }
                              });
                              setAndamentoErrors(prev => ({ ...prev, acordao_dataPublicacao: '' }));
                            }}
                          />
                          <FormSelect
                            label="Resultado"
                            required
                            value={andamentoFormData.acordao.resultado}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              acordao: { ...andamentoFormData.acordao!, resultado: e.target.value as any }
                            })}
                          >
                            <option value="Provido">Provido</option>
                            <option value="Parcialmente provido">Parcialmente provido</option>
                            <option value="Negado provimento">Negado provimento</option>
                          </FormSelect>
                          <FormSelect
                            label="Modificação da decisão recorrida?"
                            value={andamentoFormData.acordao.modificacaoDecisao ? 'S' : 'N'}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              acordao: { ...andamentoFormData.acordao!, modificacaoDecisao: e.target.value === 'S' }
                            })}
                          >
                            <option value="N">Não</option>
                            <option value="S">Sim</option>
                          </FormSelect>
                        </div>
                      </div>

                      {/* Teses e Notas */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Teses e Notas Estratégicas</h4>
                        <div className="space-y-4">
                          <FormTextArea
                            label="Resumo da Tese Vencedora"
                            placeholder="Ex: Mantida a sentença por ausência de prova do dano."
                            value={andamentoFormData.acordao.resumoTeseVencedora}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              acordao: { ...andamentoFormData.acordao!, resumoTeseVencedora: e.target.value }
                            })}
                          />
                          <FormTextArea
                            label="Observações Estratégicas"
                            placeholder="Notas internas sobre o impacto do julgamento..."
                            value={andamentoFormData.acordao.observacoesEstrategicas}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              acordao: { ...andamentoFormData.acordao!, observacoesEstrategicas: e.target.value }
                            })}
                          />
                        </div>
                      </div>

                      {/* Aspectos Financeiros */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Aspectos Financeiros e Custas</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <FormInput
                            label="Fixação/Majoração de Honorários"
                            placeholder="Valor ou descrição"
                            value={andamentoFormData.acordao.honorarios}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              acordao: { ...andamentoFormData.acordao!, honorarios: e.target.value }
                            })}
                          />
                          <FormSelect
                            label="Gratuidade de Justiça?"
                            value={andamentoFormData.acordao.gratuidadeJustica ? 'S' : 'N'}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              acordao: { ...andamentoFormData.acordao!, gratuidadeJustica: e.target.value === 'S' }
                            })}
                          >
                            <option value="N">Não</option>
                            <option value="S">Sim</option>
                          </FormSelect>
                          <FormInput
                            label="Custas Judiciais"
                            placeholder="R$ 0,00"
                            value={formatCurrency(andamentoFormData.acordao.custas || 0)}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              acordao: { ...andamentoFormData.acordao!, custas: parseCurrency(e.target.value) }
                            })}
                          />
                          <FormInput
                            label="Multas Aplicadas"
                            placeholder="R$ 0,00"
                            value={formatCurrency(andamentoFormData.acordao.multa || 0)}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              acordao: { ...andamentoFormData.acordao!, multa: parseCurrency(e.target.value) }
                            })}
                          />
                        </div>
                      </div>

                      {/* Gerar Tarefa */}
                      <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 mt-8">
                        <FormCheckbox
                          label="Gerar tarefa"
                          description="Ao marcar, você será redirecionado para criar uma tarefa vinculada a este andamento"
                          checked={andamentoFormData.geraPrazo}
                          onChange={(e: any) => {
                            const val = e.target.checked;
                            setAndamentoFormData({
                              ...andamentoFormData,
                              geraPrazo: val,
                              acordao: { ...andamentoFormData.acordao!, gerarPrazoTarefaAdm: val }
                            });
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {andamentoFormData.tipo === TipoAndamento.DECISAO_INTERLOCUTORIA && andamentoFormData.decisaoInterlocutoria && (
                    <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                      {/* Identificação da Decisão */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Identificação da Decisão</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <FormSelect
                            label="Instância"
                            value={andamentoFormData.decisaoInterlocutoria.instancia}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              decisaoInterlocutoria: { ...andamentoFormData.decisaoInterlocutoria!, instancia: e.target.value as any }
                            })}
                          >
                            <option value="1º grau">1º grau</option>
                            <option value="2º grau">2º grau</option>
                            <option value="Tribunal Superior">Tribunal Superior</option>
                          </FormSelect>
                          <FormSelect
                            label="Resultado"
                            value={andamentoFormData.decisaoInterlocutoria.resultado}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              decisaoInterlocutoria: { ...andamentoFormData.decisaoInterlocutoria!, resultado: e.target.value as any }
                            })}
                          >
                            <option value="Deferido">Deferido</option>
                            <option value="Parcialmente Deferido">Parcialmente Deferido</option>
                            <option value="Indeferido">Indeferido</option>
                          </FormSelect>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <FormInput
                            label="Data da Prolação"
                            type="date"
                            required
                            error={andamentoErrors.decisao_dataProlacao}
                            value={toISODate(andamentoFormData.decisaoInterlocutoria.dataProlacao)}
                            onChange={(e: any) => {
                              setAndamentoFormData({
                                ...andamentoFormData,
                                decisaoInterlocutoria: { ...andamentoFormData.decisaoInterlocutoria!, dataProlacao: toBRDate(e.target.value) }
                              });
                              setAndamentoErrors(prev => ({ ...prev, decisao_dataProlacao: '' }));
                            }}
                          />
                          <FormInput
                            label="Data da Publicação"
                            type="date"
                            required
                            error={andamentoErrors.decisao_dataPublicacao}
                            value={toISODate(andamentoFormData.decisaoInterlocutoria.dataPublicacao)}
                            onChange={(e: any) => {
                              setAndamentoFormData({
                                ...andamentoFormData,
                                decisaoInterlocutoria: { ...andamentoFormData.decisaoInterlocutoria!, dataPublicacao: toBRDate(e.target.value) }
                              });
                              setAndamentoErrors(prev => ({ ...prev, decisao_dataPublicacao: '' }));
                            }}
                          />
                        </div>
                      </div>

                      {/* Conteúdo do Ato */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Conteúdo do Ato</h4>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Resumo Objetivo</label>
                          <textarea
                            placeholder="Digite o resumo da decisão..."
                            className="w-full h-32 px-5 py-4 bg-gray-50 border border-gray-100 rounded-3xl font-medium text-sm outline-none focus:border-indigo-500 transition-all resize-none"
                            value={andamentoFormData.decisaoInterlocutoria.resumoObjetivo}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              decisaoInterlocutoria: { ...andamentoFormData.decisaoInterlocutoria!, resumoObjetivo: e.target.value }
                            })}
                          />
                        </div>
                      </div>

                      {/* Gerar Tarefa */}
                      <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100">
                        <FormCheckbox
                          label="Gerar tarefa"
                          description="Ao marcar, você será redirecionado para criar uma tarefa vinculada a este andamento"
                          checked={andamentoFormData.geraPrazo}
                          onChange={(e: any) => {
                            const val = e.target.checked;
                            setAndamentoFormData({
                              ...andamentoFormData,
                              geraPrazo: val,
                              decisaoInterlocutoria: { ...andamentoFormData.decisaoInterlocutoria!, gerarPrazoTarefaAdm: val }
                            });
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {andamentoFormData.tipo === TipoAndamento.DECISAO_MONOCRATICA && andamentoFormData.decisaoMonocratica && (
                    <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                      {/* Identificação do Julgamento */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Identificação do Julgamento</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <FormInput
                            label="Recurso analisado"
                            placeholder="Ex: Agravo de Instrumento"
                            value={andamentoFormData.decisaoMonocratica.recursoAnalisado}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              decisaoMonocratica: { ...andamentoFormData.decisaoMonocratica!, recursoAnalisado: e.target.value }
                            })}
                          />
                          <FormInput
                            label="Tribunal"
                            placeholder="Ex: TJSP"
                            value={andamentoFormData.decisaoMonocratica.tribunal}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              decisaoMonocratica: { ...andamentoFormData.decisaoMonocratica!, tribunal: e.target.value }
                            })}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          <FormSelect
                            label="Órgão julgador"
                            value={andamentoFormData.decisaoMonocratica.orgaoJulgador}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              decisaoMonocratica: { ...andamentoFormData.decisaoMonocratica!, orgaoJulgador: e.target.value as 'Câmara' | 'Turma' }
                            })}
                          >
                            <option value="Câmara">Câmara</option>
                            <option value="Turma">Turma</option>
                          </FormSelect>
                          <FormInput
                            label="Relator"
                            placeholder="Nome do relator"
                            value={andamentoFormData.decisaoMonocratica.relator}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              decisaoMonocratica: { ...andamentoFormData.decisaoMonocratica!, relator: e.target.value }
                            })}
                          />
                          <FormInput
                            label="Parte recorrente"
                            placeholder="Nome da parte"
                            value={andamentoFormData.decisaoMonocratica.parteRecorrente}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              decisaoMonocratica: { ...andamentoFormData.decisaoMonocratica!, parteRecorrente: e.target.value }
                            })}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <FormSelect
                            label="Instância"
                            value={andamentoFormData.decisaoMonocratica.instancia}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              decisaoMonocratica: { ...andamentoFormData.decisaoMonocratica!, instancia: e.target.value as any }
                            })}
                          >
                            <option value="1º grau">1º grau</option>
                            <option value="2º grau">2º grau</option>
                            <option value="Tribunal Superior">Tribunal Superior</option>
                          </FormSelect>
                          <FormInput
                            label="Número do julgamento"
                            placeholder="Nº da decisão/voto"
                            value={andamentoFormData.decisaoMonocratica.numeroJulgamento}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              decisaoMonocratica: { ...andamentoFormData.decisaoMonocratica!, numeroJulgamento: e.target.value }
                            })}
                          />
                        </div>
                      </div>

                      {/* Datas */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Datas</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <FormInput
                            label="Data da Prolação"
                            type="date"
                            required
                            error={andamentoErrors.decisaoMon_dataProlacao}
                            value={toISODate(andamentoFormData.decisaoMonocratica.dataProlacao)}
                            onChange={(e: any) => {
                              setAndamentoFormData({
                                ...andamentoFormData,
                                decisaoMonocratica: { ...andamentoFormData.decisaoMonocratica!, dataProlacao: toBRDate(e.target.value) }
                              });
                              setAndamentoErrors(prev => ({ ...prev, decisaoMon_dataProlacao: '' }));
                            }}
                          />
                          <FormInput
                            label="Data da Publicação"
                            type="date"
                            required
                            error={andamentoErrors.decisaoMon_dataPublicacao}
                            value={toISODate(andamentoFormData.decisaoMonocratica.dataPublicacao)}
                            onChange={(e: any) => {
                              setAndamentoFormData({
                                ...andamentoFormData,
                                decisaoMonocratica: { ...andamentoFormData.decisaoMonocratica!, dataPublicacao: toBRDate(e.target.value) }
                              });
                              setAndamentoErrors(prev => ({ ...prev, decisaoMon_dataPublicacao: '' }));
                            }}
                          />
                        </div>
                      </div>

                      {/* Resultado e Efeito */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Resultado e Efeito</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <FormSelect
                            label="Resultado"
                            value={andamentoFormData.decisaoMonocratica.resultado}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              decisaoMonocratica: { ...andamentoFormData.decisaoMonocratica!, resultado: e.target.value as any }
                            })}
                          >
                            <option value="Provido">Provido</option>
                            <option value="Parcialmente provido">Parcialmente provido</option>
                            <option value="Negado provimento/seguimento">Negado provimento/seguimento</option>
                            <option value="Não conhecido">Não conhecido</option>
                          </FormSelect>
                          <FormSelect
                            label="Efeito prático"
                            value={andamentoFormData.decisaoMonocratica.efeitoPratico}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              decisaoMonocratica: { ...andamentoFormData.decisaoMonocratica!, efeitoPratico: e.target.value as any }
                            })}
                          >
                            <option value="Mantida a decisão recorrida">Mantida a decisão recorrida</option>
                            <option value="Reformada a decisão">Reformada a decisão</option>
                            <option value="Extinção do recurso">Extinção do recurso</option>
                          </FormSelect>
                        </div>
                      </div>

                      {/* Conteúdo Jurídico */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Conteúdo Jurídico</h4>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Resumo da Decisão</label>
                            <textarea
                              placeholder="Digite o resumo da decisão..."
                              className="w-full h-32 px-5 py-4 bg-gray-50 border border-gray-100 rounded-3xl font-medium text-sm outline-none focus:border-indigo-500 transition-all resize-none"
                              value={andamentoFormData.decisaoMonocratica.resumoDecisao}
                              onChange={(e: any) => setAndamentoFormData({
                                ...andamentoFormData,
                                decisaoMonocratica: { ...andamentoFormData.decisaoMonocratica!, resumoDecisao: e.target.value }
                              })}
                            />
                          </div>
                          <FormInput
                            label="Observações estratégicas"
                            placeholder="Notas internas..."
                            value={andamentoFormData.decisaoMonocratica.observacoesEstrategicas}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              decisaoMonocratica: { ...andamentoFormData.decisaoMonocratica!, observacoesEstrategicas: e.target.value }
                            })}
                          />
                        </div>
                      </div>

                      {/* Aspectos Financeiros */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Aspectos Financeiros</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <FormInput
                            label="Fixação/Majoração de Honorários"
                            placeholder="Valor ou descrição"
                            value={andamentoFormData.decisaoMonocratica.honorarios}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              decisaoMonocratica: { ...andamentoFormData.decisaoMonocratica!, honorarios: e.target.value }
                            })}
                          />
                          <FormSelect
                            label="Gratuidade de Justiça?"
                            value={andamentoFormData.decisaoMonocratica.gratuidadeJustica}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              decisaoMonocratica: { ...andamentoFormData.decisaoMonocratica!, gratuidadeJustica: e.target.value as 'Sim' | 'Não' }
                            })}
                          >
                            <option value="Não">Não</option>
                            <option value="Sim">Sim</option>
                          </FormSelect>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <FormInput
                            label="Custas Judiciais"
                            placeholder="R$ 0,00"
                            value={formatCurrency(andamentoFormData.decisaoMonocratica.custas || 0)}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              decisaoMonocratica: { ...andamentoFormData.decisaoMonocratica!, custas: parseCurrency(e.target.value) }
                            })}
                          />
                          <FormInput
                            label="Multas Aplicadas"
                            placeholder="R$ 0,00"
                            value={formatCurrency(andamentoFormData.decisaoMonocratica.multa || 0)}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              decisaoMonocratica: { ...andamentoFormData.decisaoMonocratica!, multa: parseCurrency(e.target.value) }
                            })}
                          />
                        </div>
                      </div>

                      {/* Gerar Tarefa */}
                      <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100">
                        <FormCheckbox
                          label="Gerar tarefa"
                          description="Ao marcar, você será redirecionado para criar uma tarefa vinculada a este andamento"
                          checked={andamentoFormData.geraPrazo}
                          onChange={(e: any) => {
                            const val = e.target.checked;
                            setAndamentoFormData({
                              ...andamentoFormData,
                              geraPrazo: val,
                              decisaoMonocratica: { ...andamentoFormData.decisaoMonocratica!, gerarPrazoTarefaAdm: val }
                            });
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {andamentoFormData.tipo === TipoAndamento.ALVARA && andamentoFormData.alvara && (
                    <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                      {/* Identificação do Alvará */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Identificação do Alvará</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <FormInput
                            label="Data da Expedição"
                            type="date"
                            required
                            value={toISODate(andamentoFormData.alvara.dataExpedicao)}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              alvara: { ...andamentoFormData.alvara!, dataExpedicao: toBRDate(e.target.value) }
                            })}
                          />
                          <FormSelect
                            label="Tipo de Alvará"
                            value={andamentoFormData.alvara.tipoAlvara}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              alvara: { ...andamentoFormData.alvara!, tipoAlvara: e.target.value as any }
                            })}
                          >
                            <option value="Levantamento de valores">Levantamento de valores</option>
                            <option value="Liberação de bem">Liberação de bem</option>
                            <option value="Outros">Outros</option>
                          </FormSelect>
                        </div>
                      </div>

                      {/* Conteúdo do Ato */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Conteúdo do Ato</h4>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Resumo Objetivo</label>
                          <textarea
                            placeholder="Descreva o conteúdo do alvará..."
                            className="w-full h-32 px-5 py-4 bg-gray-50 border border-gray-100 rounded-3xl font-medium text-sm outline-none focus:border-indigo-500 transition-all resize-none"
                            value={andamentoFormData.alvara.resumoObjetivo}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              alvara: { ...andamentoFormData.alvara!, resumoObjetivo: e.target.value }
                            })}
                          />
                        </div>
                      </div>

                      {/* Aspectos Financeiros */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Aspectos Financeiros</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <FormSelect
                            label="Origem do Valor"
                            value={andamentoFormData.alvara.origemValor}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              alvara: { ...andamentoFormData.alvara!, origemValor: e.target.value as any }
                            })}
                          >
                            <option value="Depósito judicial">Depósito judicial</option>
                            <option value="RPV">RPV</option>
                            <option value="Precatório">Precatório</option>
                            <option value="Outros">Outros</option>
                          </FormSelect>
                          <FormInput
                            label="Valor Autorizado"
                            placeholder="R$ 0,00"
                            value={formatCurrency(andamentoFormData.alvara.valorAutorizado || 0)}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              alvara: { ...andamentoFormData.alvara!, valorAutorizado: parseCurrency(e.target.value) }
                            })}
                          />
                        </div>
                      </div>

                      {/* Gerar Tarefa */}
                      <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100">
                        <FormCheckbox
                          label="Gerar tarefa"
                          description="Ao marcar, você será redirecionado para criar uma tarefa vinculada a este andamento"
                          checked={andamentoFormData.geraPrazo}
                          onChange={(e: any) => {
                            const val = e.target.checked;
                            setAndamentoFormData({
                              ...andamentoFormData,
                              geraPrazo: val,
                              alvara: { ...andamentoFormData.alvara!, gerarTarefaAcompanhamento: val }
                            });
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {andamentoFormData.tipo === TipoAndamento.CERTIDAO && andamentoFormData.certidao && (
                    <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                      {/* Identificação da Certidão */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Identificação da Certidão</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <FormInput
                            label="Data da Publicação"
                            type="date"
                            required
                            error={andamentoErrors.certidao_dataPublicacao}
                            value={toISODate(andamentoFormData.certidao.dataPublicacao)}
                            onChange={(e: any) => {
                              setAndamentoFormData({
                                ...andamentoFormData,
                                certidao: { ...andamentoFormData.certidao!, dataPublicacao: toBRDate(e.target.value) }
                              });
                              setAndamentoErrors(prev => ({ ...prev, certidao_dataPublicacao: '' }));
                            }}
                          />
                          <FormSelect
                            label="Tipo de Certidão"
                            value={andamentoFormData.certidao.tipoCertidao}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              certidao: { ...andamentoFormData.certidao!, tipoCertidao: e.target.value as any }
                            })}
                          >
                            <option value="Decurso de prazo">Decurso de prazo</option>
                            <option value="Trânsito em julgado">Trânsito em julgado</option>
                            <option value="Outros">Outros</option>
                          </FormSelect>
                        </div>
                      </div>

                      {/* Conteúdo do Ato */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Conteúdo do Ato</h4>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Resumo Objetivo</label>
                          <textarea
                            placeholder="Descreva o conteúdo da certidão..."
                            className="w-full h-32 px-5 py-4 bg-gray-50 border border-gray-100 rounded-3xl font-medium text-sm outline-none focus:border-indigo-500 transition-all resize-none"
                            value={andamentoFormData.certidao.resumoObjetivo}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              certidao: { ...andamentoFormData.certidao!, resumoObjetivo: e.target.value }
                            })}
                          />
                        </div>
                      </div>

                      {/* Gerar Tarefa */}
                      <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100">
                        <FormCheckbox
                          label="Gerar tarefa"
                          description="Ao marcar, você será redirecionado para criar uma tarefa vinculada a este andamento"
                          checked={andamentoFormData.geraPrazo}
                          onChange={(e: any) => {
                            const val = e.target.checked;
                            setAndamentoFormData({
                              ...andamentoFormData,
                              geraPrazo: val,
                              certidao: { ...andamentoFormData.certidao!, gerarTarefaAdministrativa: val }
                            });
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {andamentoFormData.tipo === TipoAndamento.DESPACHO && andamentoFormData.despacho && (
                    <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                      {/* Identificação do Ato */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Identificação do Ato</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          <FormSelect
                            label="Instância"
                            required
                            value={andamentoFormData.despacho.instancia}
                            onChange={(e: any) => setAndamentoFormData({
                              ...andamentoFormData,
                              despacho: { ...andamentoFormData.despacho!, instancia: e.target.value as any }
                            })}
                          >
                            <option value="1º grau">1º grau</option>
                            <option value="2º grau">2º grau</option>
                            <option value="Tribunal Superior">Tribunal Superior</option>
                          </FormSelect>
                          <FormInput
                            label="Data da Prolação"
                            type="date"
                            required
                            error={andamentoErrors.despacho_dataProlacao}
                            value={toISODate(andamentoFormData.despacho.dataProlacao)}
                            onChange={(e: any) => {
                              setAndamentoFormData({
                                ...andamentoFormData,
                                despacho: { ...andamentoFormData.despacho!, dataProlacao: toBRDate(e.target.value) }
                              });
                              setAndamentoErrors(prev => ({ ...prev, despacho_dataProlacao: '' }));
                            }}
                          />
                          <FormInput
                            label="Data da Publicação"
                            type="date"
                            required
                            error={andamentoErrors.despacho_dataPublicacao}
                            value={toISODate(andamentoFormData.despacho.dataPublicacao)}
                            onChange={(e: any) => {
                              setAndamentoFormData({
                                ...andamentoFormData,
                                despacho: { ...andamentoFormData.despacho!, dataPublicacao: toBRDate(e.target.value) }
                              });
                              setAndamentoErrors(prev => ({ ...prev, despacho_dataPublicacao: '' }));
                            }}
                          />
                        </div>
                      </div>

                      {/* Classificação do Despacho */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Classificação do Despacho</h4>
                        <FormSelect
                          label="Tipo de Despacho"
                          required
                          value={andamentoFormData.despacho.tipoDespacho}
                          onChange={(e: any) => setAndamentoFormData({
                            ...andamentoFormData,
                            despacho: { ...andamentoFormData.despacho!, tipoDespacho: e.target.value as any }
                          })}
                        >
                          <option value="Ordinatório ou Mero Expediente">Ordinatório ou Mero Expediente</option>
                          <option value="Determinação de diligência">Determinação de diligência</option>
                          <option value="Intimação">Intimação</option>
                          <option value="Intimação para manifestação">Intimação para manifestação</option>
                        </FormSelect>
                      </div>

                      {/* Conteúdo do Ato */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Conteúdo do Ato</h4>
                        <FormTextArea
                          label="Resumo Objetivo"
                          placeholder="Descreva o conteúdo do despacho de forma objetiva..."
                          required
                          value={andamentoFormData.despacho.resumoObjetivo}
                          onChange={(e: any) => setAndamentoFormData({
                            ...andamentoFormData,
                            despacho: { ...andamentoFormData.despacho!, resumoObjetivo: e.target.value }
                          })}
                        />
                      </div>

                      {/* Gerar Tarefa */}
                      <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100">
                        <FormCheckbox
                          label="Gerar tarefa"
                          description="Ao marcar, você será redirecionado para criar uma tarefa vinculada a este andamento"
                          checked={andamentoFormData.geraPrazo}
                          onChange={(e: any) => {
                            const val = e.target.checked;
                            setAndamentoFormData({
                              ...andamentoFormData,
                              geraPrazo: val,
                              despacho: { ...andamentoFormData.despacho!, gerarPrazoTarefaAdm: val }
                            });
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {!([TipoAndamento.SENTENCA, TipoAndamento.ACORDAO, TipoAndamento.DECISAO_INTERLOCUTORIA, TipoAndamento.DECISAO_MONOCRATICA, TipoAndamento.ALVARA, TipoAndamento.CERTIDAO, TipoAndamento.DESPACHO].includes(andamentoFormData.tipo as TipoAndamento)) && (
                    <div className="space-y-4 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Classificação Estratégica</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                          <FormCheckbox
                            label="Gerar tarefa"
                            description="Ao marcar, você será redirecionado para criar uma tarefa"
                            checked={andamentoFormData.geraPrazo}
                            onChange={(e: any) => setAndamentoFormData({ ...andamentoFormData, geraPrazo: e.target.checked })}
                          />
                        </div>
                        <FormSelect
                          label="Tipo de Providência"
                          value={andamentoFormData.providencia}
                          onChange={(e: any) => setAndamentoFormData({ ...andamentoFormData, providencia: e.target.value as ProvidenciaAndamento })}
                        >
                          {Object.values(ProvidenciaAndamento).map(p => <option key={p} value={p}>{p}</option>)}
                        </FormSelect>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Conteúdo do Andamento</h4>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Observações estratégicas</label>
                      <textarea
                        className="w-full h-32 px-5 py-4 bg-gray-50 border border-gray-100 rounded-3xl font-medium text-sm outline-none focus:border-indigo-500 transition-all resize-none"
                        placeholder="Descreva as observações estratégicas do andamento... (opcional)"
                        value={andamentoFormData.conteudo}
                        onChange={(e) => setAndamentoFormData({ ...andamentoFormData, conteudo: e.target.value })}
                      />
                    </div>
                  </div>
                </form>
              </div>

              {/* RODAPÉ FIXO */}
              <div className="p-10 pt-4 border-t border-gray-50 flex gap-4 flex-shrink-0 bg-white">
                <button
                  type="button"
                  onClick={() => setIsAndamentoModalOpen(false)}
                  className="flex-1 py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl font-black uppercase text-xs hover:bg-gray-50 transition-all"
                >
                  Descartar
                </button>
                <button
                  type="submit"
                  form="andamentoForm"
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                >
                  Registrar Andamento
                </button>
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
