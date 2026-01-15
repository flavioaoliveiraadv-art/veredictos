
export enum StatusProcesso {
  ATIVO = 'Ativo',
  ARQUIVADO = 'Arquivado',
  SUSPENSO = 'Suspenso'
}

export enum AreaAtuacao {
  CIVEL = 'Cível',
  TRABALHISTA = 'Trabalhista',
  PENAL = 'Penal',
  PREVIDENCIARIO = 'Previdenciário',
  TRIBUTARIO = 'Tributário',
  EMPRESARIAL = 'Empresarial',
  CONSUMIDOR = 'Consumidor',
  FAMILIA = 'Família',
  SUCESSOES = 'Sucessões',
  ADMINISTRATIVO = 'Administrativo',
  CONSTITUCIONAL = 'Constitucional'
}

export enum FaseProcessual {
  CONHECIMENTO = 'Conhecimento',
  PRE_SENTENCA = 'Pré-sentença',
  DECISORIA = 'Decisória',
  RECURSAL = 'Recursal',
  CUMPRIMENTO = 'Cumprimento de Sentença',
  EXECUTIVA = 'Executiva'
}

export enum TipoPrazo {
  PRAZO = 'Prazo',
  AUDIENCIA = 'Audiência',
  DILIGENCIA = 'Diligência',
  ATENDIMENTO = 'Atendimento',
  REUNIAO = 'Reunião',
  ADMINISTRATIVO = 'Administrativo',
  // Added TAREFA member to resolve property access errors
  TAREFA = 'Tarefa'
}

export enum ModalidadeAudiencia {
  TELEPRESENCIAL = 'Telepresencial',
  PRESENCIAL = 'Presencial'
}

export interface HistoricoAlteracao {
  id: string;
  idReferencia: string; // ID do Processo, Recurso, Cliente ou Financeiro/Prazo
  dataHora: string;
  descricao: string;
}

export interface Recurso {
  id: string;
  tipoRecurso: string;
  numeroRecurso: string;
  processoOriginarioId: string;
  clienteId: string;
  gratuidade: boolean;
  localTramitacao: string;
  tribunal: string;
  dataDistribuicao: string;
  status: StatusProcesso;
  ultimaAtualizacao: string;
}

export enum TipoAndamento {
  DECISAO_INTERLOCUTORIA = 'Decisão interlocutória',
  DESPACHO = 'Despacho',
  SENTENCA = 'Sentença',
  ACORDAO = 'Acórdão',
  DECISAO_INTERLOCUTORIA = 'Decisão Interlocutória',
  DECISAO_MONOCRATICA = 'Decisão monocrática',
  ALVARA = 'Alvará',
  CERTIDAO = 'Certidão'
}

export enum ProvidenciaAndamento {
  MANIFESTACAO = 'Manifestação',
  RECURSO = 'Recurso',
  CUMPRIMENTO = 'Cumprimento',
  CIENCIA = 'Apenas ciência'
}

export interface SentencaData {
  dataProlacao: string;
  dataPublicacao: string;
  instancia: '1º grau' | '2º grau' | 'Tribunal Superior';
  magistrado: string;
  resultado: 'Procedente' | 'Parcialmente procedente' | 'Improcedente' | 'Extinção sem resolução do mérito';
  decisaoFavoravel: boolean;
  condenacao: boolean;
  valorCondenacao?: number;
  obrigacaoFazerNaoFazer: boolean;
  resumoDecisao: string;
  honorariosPercentual?: number;
  honorariosValorFixo?: number;
  custas?: number;
  gratuidadeJustica: boolean;
  gerarPrazoTarefaAdm: boolean;
}

export interface AcordaoData {
  tribunal: string;
  orgaoJulgador: string;
  relator: string;
  recursoJulgado: string;
  parteRecorrente: string;
  numeroJulgamento: string;
  dataProlacao: string;
  dataPublicacao: string;
  resultado: 'Provido' | 'Parcialmente provido' | 'Negado provimento';
  modificacaoDecisao: boolean;
  resumoTeseVencedora: string;
  observacoesEstrategicas: string;
  honorarios: string;
  custas: number;
  multa: number;
  gratuidadeJustica: boolean;
  gerarPrazoTarefaAdm: boolean;
}

export interface DecisaoInterlocutoriaData {
  instancia: '1º grau' | '2º grau' | 'Tribunal Superior';
  dataProlacao: string;
  dataPublicacao: string;
  resumoObjetivo: string;
  resultado: 'Deferido' | 'Parcialmente Deferido' | 'Indeferido';
  gerarPrazoTarefaAdm: boolean;
}

export interface Andamento {
  id: string;
  data: string;
  tipo: TipoAndamento;
  conteudo: string;
  geraPrazo: boolean;
  providencia: ProvidenciaAndamento;
  prazoId?: string;
  sentenca?: SentencaData;
  acordao?: AcordaoData;
  decisaoInterlocutoria?: DecisaoInterlocutoriaData;
}

export interface Processo {
  id: string;
  objeto: string;
  numeros: string[];
  clienteId: string;
  parteContraria: string;
  valorCausa: number;
  areaAtuacao: AreaAtuacao;
  gratuidade: boolean;
  comarca: string;
  tribunal: string;
  localTramitacao: string;
  faseProcessual: FaseProcessual;
  status: StatusProcesso;
  dataDistribuicao: string;
  ultimaAtualizacao: string;
  polo?: 'Autor' | 'Réu';
  andamentos?: Andamento[];
}

export interface Cliente {
  id: string;
  nome: string;
  representanteLegal?: string;
  documento: string; // CPF
  rg?: string;
  email: string;
  telefone: string;
  tipo: 'PF' | 'PJ';
  status: 'Ativo' | 'Inativo';
  estadoCivil?: string;
  profissao?: string;
  endereco?: string;
  processosIds: string[]; // Vínculo com múltiplos processos
  createdAt: string;
}

export interface Prazo {
  id: string;
  processoId: string;
  clienteId: string;
  descricao: string;
  observacao?: string; // Campo de observação livre
  dataVencimento: string; // Data Interna (dd/mm/aaaa)
  horaVencimento?: string; // Hora Interna (hh:mm)
  dataFatal?: string;      // Data Fatal (dd/mm/aaaa)
  horaFatal?: string;      // Hora Fatal (hh:mm)
  dataConclusao?: string; // Data de Realização
  dataCancelamento?: string;
  tipo: TipoPrazo;
  modalidade?: ModalidadeAudiencia;
  responsavel: string;
  critico: boolean;
  concluido: boolean;
  cancelado: boolean;
  justificativaCancelamento?: string;
  observacoesRealizacao?: string;
  financeiroIds: string[];
}

export enum StatusFinanceiro {
  PAGO = 'Pago',
  PENDENTE = 'Pendente',
  ATRASADO = 'Atrasado'
}

export interface Financeiro {
  id: string;
  tipo: 'Receita' | 'Despesa';
  descricao: string;
  valor: number;
  parcela: string; // Ex: "1/1"
  dataVencimento: string;
  dataPagamento?: string;
  status: StatusFinanceiro;
  clienteId?: string;
  processoId?: string;
  tarefaVinculadaId?: string;
  comprovante?: string; // Base64 do arquivo de comprovante
  comprovanteNome?: string; // Nome original do arquivo
}
