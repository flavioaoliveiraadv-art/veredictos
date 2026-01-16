
import { Cliente, Processo, StatusProcesso, AreaAtuacao, FaseProcessual, HistoricoAlteracao, Prazo, TipoPrazo } from '../types';
import { getTodayBR } from '../utils/formatters';

export const INITIAL_CLIENTES: Cliente[] = [
  {
    id: '1',
    nome: 'João Silva',
    pessoas: [{
      id: 'p1',
      nome: 'João Silva',
      documento: '123.456.789-00',
      email: 'joao@email.com',
      telefone: '(11) 98888-7777',
      tipo: 'PF'
    }],
    status: 'Ativo',
    createdAt: '01/10/2023',
    processosIds: ['101'],
    endereco: 'Rua das Flores, 123 - São Paulo/SP'
  },
  {
    id: '2',
    nome: 'Tech Soluções LTDA',
    pessoas: [{
      id: 'p2',
      nome: 'Tech Soluções LTDA',
      documento: '12.345.678/0001-90',
      email: 'contato@tech.com',
      telefone: '(11) 3333-4444',
      tipo: 'PJ'
    }],
    status: 'Ativo',
    createdAt: '15/11/2023',
    processosIds: [],
    endereco: 'Av. Paulista, 1000 - São Paulo/SP'
  },
];

export const INITIAL_PROCESSOS: Processo[] = [
  {
    id: '101',
    objeto: 'Indenizatória por Danos Morais',
    numeros: ['1234567-89.2023.8.26.0100'],
    clienteId: '1',
    parteContraria: 'Banco Exemplo S/A',
    valorCausa: 50000,
    areaAtuacao: AreaAtuacao.CIVEL,
    gratuidade: false,
    comarca: 'São Paulo',
    tribunal: 'TJSP',
    localTramitacao: '1ª Vara Cível',
    faseProcessual: FaseProcessual.CONHECIMENTO,
    status: StatusProcesso.ATIVO,
    dataDistribuicao: '15/10/2023',
    ultimaAtualizacao: '15/05/2024'
  },
];

export const INITIAL_HISTORICO: HistoricoAlteracao[] = [
  { id: 'h1', idReferencia: '101', dataHora: '15/05/2024 14:30:00', descricao: 'Processo importado no sistema.' }
];

// Prazos iniciais para popular o Dashboard conforme as imagens
export const INITIAL_PRAZOS: Prazo[] = [
  {
    id: 'p1',
    processoId: '101',
    clienteId: '1',
    descricao: 'Petição Inicial - João Silva',
    dataVencimento: '10/05/2024', // Atrasado (assumindo data de hoje > 10/05)
    tipo: TipoPrazo.PRAZO,
    responsavel: 'Dr. Arthur',
    critico: true,
    concluido: false,
    cancelado: false,
    financeiroIds: []
  },
  {
    id: 'p2',
    processoId: '101',
    clienteId: '1',
    descricao: 'Audiência de Conciliação',
    dataVencimento: getTodayBR(), // Hoje
    tipo: TipoPrazo.AUDIENCIA,
    responsavel: 'Dr. Arthur',
    critico: false,
    concluido: false,
    cancelado: false,
    financeiroIds: []
  },
  {
    id: 'p3',
    processoId: '101',
    clienteId: '1',
    descricao: 'Revisar Contrato Social',
    dataVencimento: '30/12/2025', // Próximo
    tipo: TipoPrazo.TAREFA,
    responsavel: 'Dr. Arthur',
    critico: false,
    concluido: false,
    cancelado: false,
    financeiroIds: []
  }
];
