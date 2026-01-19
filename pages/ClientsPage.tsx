
import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, Search, Mail, Phone, User, Trash2, Edit, History, X,
  CheckCircle2, ChevronRight, Save, Filter,
  MinusCircle
} from 'lucide-react';
import {
  Cliente, Processo, Financeiro, HistoricoAlteracao, StatusProcesso, Pessoa
} from '../types';
import { FormInput, FormSelect } from '../components/FormComponents';

interface ClientsPageProps {
  clientes: Cliente[];
  setClientes: React.Dispatch<React.SetStateAction<Cliente[]>>;
  processos: Processo[];
  setProcessos: React.Dispatch<React.SetStateAction<Processo[]>>;
  historico: HistoricoAlteracao[];
  setHistorico: React.Dispatch<React.SetStateAction<HistoricoAlteracao[]>>;
}

const INITIAL_PERSON_STATE = (tipo: 'PF' | 'PJ'): Pessoa => ({
  id: `per-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  nome: '',
  documento: '',
  rg: '',
  email: '',
  telefone: '',
  tipo,
  estadoCivil: '',
  profissao: '',
  representanteLegal: ''
});

const INITIAL_FORM_STATE: Partial<Cliente> = {
  nome: '',
  pessoas: [],
  status: 'Ativo',
  endereco: '', // Mantido no nível do cliente para o cadastro único
};

// Fixed: Corrected typo 'procesos' to 'processos' in props destructuring
const ClientsPage: React.FC<ClientsPageProps> = ({
  clientes, setClientes, processos, setProcessos, historico, setHistorico
}) => {
  const [activeTab, setActiveTab] = useState<'ATIVO' | 'INATIVO'>('ATIVO');
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // --- Form State ---
  const [formData, setFormData] = useState<Partial<Cliente>>(INITIAL_FORM_STATE);
  const [initialFormValue, setInitialFormValue] = useState<string>(JSON.stringify(INITIAL_FORM_STATE));
  const [isClientTypeSelectionModalOpen, setIsClientTypeSelectionModalOpen] = useState(false);

  // --- Helpers ---
  const addHistorico = (idReferencia: string, descricao: string) => {
    const entry: HistoricoAlteracao = {
      id: `h-${Date.now()}`,
      idReferencia,
      dataHora: new Date().toLocaleString('pt-BR'),
      descricao
    };
    setHistorico(prev => [entry, ...prev]);
  };

  const filteredClientes = useMemo(() => {
    return clientes.filter(c => {
      const matchesTab = c.status === (activeTab === 'ATIVO' ? 'Ativo' : 'Inativo');
      const matchesSearch = c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.documento.includes(searchTerm);
      return matchesTab && matchesSearch;
    });
  }, [clientes, activeTab, searchTerm]);

  const getProcessosDoCliente = (clienteId: string) => {
    return processos.filter(p => p.clienteId === clienteId);
  };

  // --- Modal Control Helpers ---
  const checkUnsavedChanges = (currentData: any, initialDataStr: string) => {
    return JSON.stringify(currentData) !== initialDataStr;
  };

  const handleCloseNewClientModal = () => {
    if (checkUnsavedChanges(formData, initialFormValue)) {
      if (confirm('Existem alterações não salvas. Deseja sair?')) {
        setIsNewClientModalOpen(false);
      }
    } else {
      setIsNewClientModalOpen(false);
    }
  };

  // --- Actions ---
  const handleSaveCliente = (e: React.FormEvent) => {
    e.preventDefault();
    const id = formData.id || `cli-${Date.now()}`;
    const pessoas = formData.pessoas || [];

    // Regra de exibição do nome: "Nome do primeiro e outro"
    let nomeExibicao = '';
    if (pessoas.length > 0) {
      nomeExibicao = pessoas[0].nome;
      if (pessoas.length > 1) {
        nomeExibicao += ' E OUTRO';
      }
    }

    const newCliente: Cliente = {
      ...formData,
      id,
      nome: nomeExibicao,
      pessoas,
      createdAt: formData.createdAt || new Date().toISOString().split('T')[0]
    } as Cliente;

    if (formData.id) {
      setClientes(prev => prev.map(c => c.id === id ? newCliente : c));
      addHistorico(id, 'Ficha do cliente atualizada.');
    } else {
      setClientes(prev => [...prev, newCliente]);
      addHistorico(id, 'Cliente cadastrado no sistema.');
    }

    setIsNewClientModalOpen(false);
    setIsEditMode(false);
    setFormData(INITIAL_FORM_STATE);
  };

  const toggleInativar = (cliente: Cliente) => {
    const newStatus = cliente.status === 'Ativo' ? 'Inativo' : 'Ativo';
    setClientes(prev => prev.map(c => c.id === cliente.id ? { ...c, status: newStatus } : c));
    addHistorico(cliente.id, `Status alterado para ${newStatus}.`);
    setSelectedCliente(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente excluir este cliente?')) {
      setClientes(prev => prev.filter(c => c.id !== id));
      setProcessos(prev => prev.map(p => p.clienteId === id ? { ...p, clienteId: '' } : p));
      setSelectedCliente(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0b1726]">Clientes</h1>
          <p className="text-gray-500 font-medium">Gestão centralizada da sua base de clientes.</p>
        </div>
        <button
          onClick={() => {
            setIsClientTypeSelectionModalOpen(true);
          }}
          className="bg-[#4f46e5] hover:bg-[#4338ca] text-white px-8 py-3 rounded-2xl flex items-center justify-center gap-2 font-black shadow-xl shadow-indigo-200 transition-all"
        >
          <Plus className="w-5 h-5" /> Novo Cliente
        </button>
      </header>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-[32px] shadow-sm border border-gray-100">
        <div className="flex items-center bg-gray-100 p-1 rounded-2xl w-full md:w-auto">
          <button onClick={() => setActiveTab('ATIVO')} className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'ATIVO' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>Ativos</button>
          <button onClick={() => setActiveTab('INATIVO')} className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'INATIVO' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>Inativos</button>
        </div>
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text" placeholder="Buscar por nome ou CPF..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="hidden lg:block text-right">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{filteredClientes.length} Clientes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredClientes.map(cliente => (
          <div key={cliente.id} onClick={() => setSelectedCliente(cliente)} className="bg-white p-4 rounded-[32px] border border-gray-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all cursor-pointer group">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                {cliente.nome.charAt(0)}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black text-gray-800 truncate mb-0.5">{cliente.nome}</h3>
                <p className="text-[10px] font-bold text-gray-400 truncate mb-1 uppercase h-[15px]">
                  {cliente.representanteLegal ? `Rep: ${cliente.representanteLegal}` : ''}
                </p>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${cliente.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                  {cliente.status}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-indigo-600 font-black text-[9px] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
              Ver Ficha Completa <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: DETALHES DO CLIENTE */}
      {selectedCliente && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 flex items-center justify-center p-4 cursor-default"
          onClick={() => setSelectedCliente(null)}
        >
          <div
            className="bg-white rounded-[40px] w-full max-w-5xl shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-10 flex-1 overflow-y-auto custom-scroll">
              <div className="flex items-start justify-between mb-10">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-100">
                    <User className="w-9 h-9" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-gray-800 tracking-tighter">{selectedCliente.nome}</h2>
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600">{selectedCliente.status}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsHistoryModalOpen(true)} className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"><History className="w-6 h-6" /></button>
                  <button onClick={() => {
                    const state = { ...selectedCliente };
                    setFormData(state);
                    setInitialFormValue(JSON.stringify(state));
                    setIsEditMode(true);
                    setIsNewClientModalOpen(true);
                  }} className="p-3 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-2xl transition-all"><Edit className="w-6 h-6" /></button>
                  <button onClick={() => handleDelete(selectedCliente.id)} className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"><Trash2 className="w-6 h-6" /></button>
                  <button onClick={() => setSelectedCliente(null)} className="p-3 text-gray-400 hover:text-gray-800 rounded-2xl transition-all ml-4"><X className="w-8 h-8" /></button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-12">
                  {(selectedCliente.pessoas || []).map((pessoa, idx) => (
                    <section key={pessoa.id} className="bg-gray-50/30 p-8 rounded-[32px] border border-gray-100">
                      <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-6 border-b-2 border-indigo-50 pb-3">
                        {idx === 0 ? 'Pessoa Principal' : `Pessoa Adicional ${idx}`}
                      </h3>
                      <div className="grid grid-cols-2 gap-y-8 gap-x-12">
                        <DetailField label="Nome" value={pessoa.nome} />
                        <DetailField label="Representante Legal" value={pessoa.representanteLegal || '-'} />
                        <DetailField label={pessoa.tipo === 'PJ' ? 'CNPJ' : 'CPF'} value={pessoa.documento || '-'} />
                        {pessoa.tipo !== 'PJ' && (
                          <>
                            <DetailField label="RG" value={pessoa.rg || '-'} />
                            <DetailField label="Estado Civil" value={pessoa.estadoCivil || '-'} />
                            <DetailField label="Profissão" value={pessoa.profissao || '-'} />
                          </>
                        )}
                        <DetailField label="E-mail" value={pessoa.email || '-'} className="text-indigo-600" />
                        <DetailField label="Telefone" value={pessoa.telefone || '-'} />
                      </div>
                    </section>
                  ))}
                  <section>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 border-b-2 border-gray-50 pb-3">Localização Única do Cadastro</h3>
                    <div className="grid grid-cols-1 gap-y-8 gap-x-12">
                      <DetailField label="Endereço com CEP" value={selectedCliente.endereco || '-'} />
                    </div>
                  </section>
                </div>
                <div className="space-y-6">
                  <div className="bg-gray-50 p-8 rounded-[40px] border border-gray-100">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Informações do Registro</h4>
                    <div className="space-y-4">
                      <div className="p-5 bg-white rounded-3xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cadastrado em</p>
                        <p className="text-sm font-black text-gray-700">{selectedCliente.createdAt ? new Date(selectedCliente.createdAt).toLocaleDateString('pt-BR') : '-'}</p>
                      </div>
                      <div className="flex items-center justify-between p-5 bg-white rounded-3xl border border-gray-100">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                          <span className="text-sm font-black text-gray-700">Status Ativo</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={selectedCliente.status === 'Ativo'} onChange={() => toggleInativar(selectedCliente)} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SELEÇÃO DE TIPO DE CLIENTE */}
      {isClientTypeSelectionModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 cursor-default"
          onClick={() => setIsClientTypeSelectionModalOpen(false)}
        >
          <div
            className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl animate-in zoom-in duration-300 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 text-center">
              <h2 className="text-2xl font-black text-gray-800 mb-2">Novo Cliente</h2>
              <p className="text-gray-500 font-medium mb-8">Selecione o tipo de cliente que deseja cadastrar</p>

              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => {
                    const person = INITIAL_PERSON_STATE('PF');
                    const state = { ...INITIAL_FORM_STATE, pessoas: [person] };
                    setFormData(state);
                    setInitialFormValue(JSON.stringify(state));
                    setIsEditMode(false);
                    setIsClientTypeSelectionModalOpen(false);
                    setIsNewClientModalOpen(true);
                  }}
                  className="p-6 rounded-3xl border-2 border-gray-100 hover:border-indigo-600 hover:bg-indigo-50 group transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <User className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-black text-gray-800 group-hover:text-indigo-700">Pessoa Física</h3>
                      <p className="text-xs font-bold text-gray-400">Cadastro por CPF</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    const person = INITIAL_PERSON_STATE('PJ');
                    const state = { ...INITIAL_FORM_STATE, pessoas: [person] };
                    setFormData(state);
                    setInitialFormValue(JSON.stringify(state));
                    setIsEditMode(false);
                    setIsClientTypeSelectionModalOpen(false);
                    setIsNewClientModalOpen(true);
                  }}
                  className="p-6 rounded-3xl border-2 border-gray-100 hover:border-indigo-600 hover:bg-indigo-50 group transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <div className="relative">
                        <User className="w-4 h-4 absolute -left-1 top-0" />
                        <User className="w-4 h-4 absolute left-2 top-0" />
                      </div>
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-black text-gray-800 group-hover:text-indigo-700">Pessoa Jurídica</h3>
                      <p className="text-xs font-bold text-gray-400">Cadastro por CNPJ</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CADASTRO / EDIÇÃO */}
      {isNewClientModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 cursor-default"
          onClick={handleCloseNewClientModal}
        >
          <div
            className="bg-white rounded-[40px] w-full max-w-4xl shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 pb-6 flex items-center justify-between border-b border-gray-100">
              <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                <User className="w-7 h-7 text-indigo-600" />
                {isEditMode ? 'Editar Cliente' : (formData.tipo === 'PJ' ? 'Novo Cliente - Pessoa Jurídica' : 'Novo Cliente - Pessoa Física')}
              </h2>
              <button onClick={handleCloseNewClientModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-8 h-8" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 custom-scroll">
              <form id="clientForm" onSubmit={handleSaveCliente} className="space-y-8">
                {/* LISTA DE PESSOAS */}
                <div className="space-y-10">
                  {(formData.pessoas || []).map((pessoa, idx) => (
                    <div key={pessoa.id} className="relative p-6 bg-gray-50/50 rounded-[32px] border border-gray-100">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                          <User className="w-4 h-4" /> {idx === 0 ? 'Pessoa Principal' : `Pessoa Adicional ${idx}`}
                        </h3>
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newPessoas = [...(formData.pessoas || [])];
                              newPessoas.splice(idx, 1);
                              setFormData({ ...formData, pessoas: newPessoas });
                            }}
                            className="text-red-400 hover:text-red-600 p-2 transition-colors flex items-center gap-1 text-[10px] font-black uppercase"
                          >
                            <Trash2 className="w-4 h-4" /> Remover
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                          <FormInput
                            label="Nome Completo"
                            required
                            value={pessoa.nome}
                            onChange={e => {
                              const newPessoas = [...(formData.pessoas || [])];
                              newPessoas[idx] = { ...pessoa, nome: e.target.value.toUpperCase() };
                              setFormData({ ...formData, pessoas: newPessoas });
                            }}
                            placeholder="Nome da Pessoa"
                          />
                        </div>
                        <FormInput
                          label="Representante Legal"
                          value={pessoa.representanteLegal}
                          onChange={e => {
                            const newPessoas = [...(formData.pessoas || [])];
                            newPessoas[idx] = { ...pessoa, representanteLegal: e.target.value.toUpperCase() };
                            setFormData({ ...formData, pessoas: newPessoas });
                          }}
                          placeholder="Rep. Legal (se houver)"
                        />

                        <FormInput
                          label={pessoa.tipo === 'PJ' ? "CNPJ" : "CPF"}
                          value={pessoa.documento}
                          onChange={e => {
                            const newPessoas = [...(formData.pessoas || [])];
                            newPessoas[idx] = { ...pessoa, documento: e.target.value };
                            setFormData({ ...formData, pessoas: newPessoas });
                          }}
                          placeholder={pessoa.tipo === 'PJ' ? "00.000.000/0000-00" : "000.000.000-00"}
                        />

                        <FormInput
                          label="Telefone"
                          value={pessoa.telefone}
                          onChange={e => {
                            const newPessoas = [...(formData.pessoas || [])];
                            newPessoas[idx] = { ...pessoa, telefone: e.target.value };
                            setFormData({ ...formData, pessoas: newPessoas });
                          }}
                          placeholder="(00) 00000-0000"
                        />
                        <FormInput
                          label="E-mail"
                          value={pessoa.email}
                          onChange={e => {
                            const newPessoas = [...(formData.pessoas || [])];
                            newPessoas[idx] = { ...pessoa, email: e.target.value };
                            setFormData({ ...formData, pessoas: newPessoas });
                          }}
                          placeholder="exemplo@email.com"
                        />

                        {pessoa.tipo === 'PF' && (
                          <>
                            <FormInput
                              label="RG"
                              value={pessoa.rg}
                              onChange={e => {
                                const newPessoas = [...(formData.pessoas || [])];
                                newPessoas[idx] = { ...pessoa, rg: e.target.value };
                                setFormData({ ...formData, pessoas: newPessoas });
                              }}
                              placeholder="00.000.000-0"
                            />
                            <FormInput
                              label="Estado Civil"
                              value={pessoa.estadoCivil}
                              onChange={e => {
                                const newPessoas = [...(formData.pessoas || [])];
                                newPessoas[idx] = { ...pessoa, estadoCivil: e.target.value };
                                setFormData({ ...formData, pessoas: newPessoas });
                              }}
                              placeholder="Solteiro, Casado..."
                            />
                            <FormInput
                              label="Profissão"
                              value={pessoa.profissao}
                              onChange={e => {
                                const newPessoas = [...(formData.pessoas || [])];
                                newPessoas[idx] = { ...pessoa, profissao: e.target.value };
                                setFormData({ ...formData, pessoas: newPessoas });
                              }}
                              placeholder="Ex: Advogado"
                            />
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        pessoas: [...(prev.pessoas || []), INITIAL_PERSON_STATE('PF')]
                      }));
                    }}
                    className="w-full py-4 border-2 border-dashed border-gray-200 rounded-[32px] text-gray-400 font-black uppercase tracking-widest text-[10px] hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" /> Adicionar Outra Pessoa (Litisconsórcio/Cônjuge)
                  </button>
                </div>

                <div className="pt-8 border-t border-gray-100">
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      Endereço do Cadastro
                    </h3>
                    <FormInput
                      label="Endereço Completo com CEP"
                      value={formData.endereco}
                      onChange={e => setFormData({ ...formData, endereco: e.target.value })}
                      placeholder="Rua, Número, Bairro, Cidade, Estado - CEP"
                    />
                  </div>
                </div>
              </form>
            </div>
            <div className="p-8 border-t border-gray-100 flex gap-4 bg-gray-50/50">
              <button type="button" onClick={handleCloseNewClientModal} className="flex-1 py-4 bg-white border border-gray-300 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-100 transition-all">Cancelar</button>
              <button type="submit" form="clientForm" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">Salvar Cliente</button>
            </div>
          </div>
        </div >
      )}

      {/* MODAL: HISTÓRICO */}
      {
        isHistoryModalOpen && selectedCliente && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4 cursor-default"
            onClick={() => setIsHistoryModalOpen(false)}
          >
            <div
              className="bg-white rounded-[40px] w-full max-w-md shadow-2xl animate-in zoom-in duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-10">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-black text-gray-800 flex items-center gap-3"><History className="w-6 h-6 text-indigo-600" /> Histórico</h2>
                  <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-400 hover:text-gray-800 transition-colors"><X className="w-7 h-7" /></button>
                </div>
                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scroll">
                  {historico.filter(h => h.idReferencia === selectedCliente.id).map((h, i) => (
                    <div key={h.id} className="relative pl-10">
                      <div className="absolute left-0 top-1.5 w-7 h-7 rounded-full border-4 border-white shadow bg-indigo-600 flex items-center justify-center z-10"><div className="w-1.5 h-1.5 rounded-full bg-white"></div></div>
                      {i !== historico.filter(h => h.idReferencia === selectedCliente.id).length - 1 && <div className="absolute left-3 top-6 bottom-[-32px] w-0.5 bg-gray-100"></div>}
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
    </div >
  );
};

// UI Reusable Components
const DetailField = ({ label, value, className = "" }: { label: string, value: string, className?: string }) => (
  <div>
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-sm font-black text-gray-800 ${className}`}>{value}</p>
  </div>
);

export default ClientsPage;
