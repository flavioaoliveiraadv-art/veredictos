import React, { useState } from 'react';
import { Cliente, Processo, Financeiro } from '../../types';
import { Search, FileDown, X, Users, MapPin, Briefcase, DollarSign, FileText, Activity } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ClientReportProps {
    clientes: Cliente[];
    processos: Processo[];
    financeiro: Financeiro[];
}

const ClientReport: React.FC<ClientReportProps> = ({ clientes, processos, financeiro }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

    // Filter clients
    const filteredClientes = clientes
        .filter(c =>
            c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.cpf && c.cpf.includes(searchTerm)) ||
            (c.cnpj && c.cnpj.includes(searchTerm))
        )
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    const openDossier = (cliente: Cliente) => {
        setSelectedCliente(cliente);
    };

    const closeDossier = () => {
        setSelectedCliente(null);
    };

    const getActiveProcessCount = (clientId: string) => {
        // Assuming clienteId is the link. Check types if name is used.
        // Based on previous files, process.clienteId links to client.id
        return processos.filter(p => p.clienteId === clientId && p.status === 'Ativo').length;
    };

    const exportDossierPDF = () => {
        if (!selectedCliente) return;

        const doc = new jsPDF();
        let yPos = 20;

        // Header
        doc.setFontSize(22);
        doc.setTextColor(11, 23, 38);
        doc.text('Dossiê do Cliente', 105, yPos, { align: 'center' });
        yPos += 10;

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 105, yPos, { align: 'center' });
        yPos += 15;

        // 1. DADOS DO CLIENTE E INTEGRANTES
        doc.setFillColor(241, 245, 249);
        doc.rect(14, yPos, 182, 8, 'F');
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        doc.text('1. DADOS DO CLIENTE E INTEGRANTES', 16, yPos + 6);
        yPos += 12;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Status: ${selectedCliente.status}`, 16, yPos);
        doc.text(`Cadastrado em: ${new Date(selectedCliente.createdAt).toLocaleDateString('pt-BR')}`, 110, yPos);
        yPos += 8;

        (selectedCliente.pessoas || []).forEach((pessoa, idx) => {
            if (yPos > 250) { doc.addPage(); yPos = 20; }

            doc.setFont('helvetica', 'bold');
            doc.text(`${idx === 0 ? 'Pessoa Principal' : `Pessoa Adicional ${idx}`}: ${pessoa.nome}`, 16, yPos);
            yPos += 6;

            doc.setFont('helvetica', 'normal');
            const pData = [
                [`Documento: ${pessoa.documento || '-'}`, `Tipo: ${pessoa.tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}`],
                [`E-mail: ${pessoa.email || '-'}`, `Telefone: ${pessoa.telefone || '-'}`]
            ];

            if (pessoa.tipo === 'PF') {
                pData.push([`RG: ${pessoa.rg || '-'}`, `Estado Civil: ${pessoa.estadoCivil || '-'}`]);
                pData.push([`Profissão: ${pessoa.profissao || '-'}`, '']);
            }

            if (pessoa.representanteLegal) {
                pData.push([`Representante Legal: ${pessoa.representanteLegal}`, '']);
            }

            pData.forEach(row => {
                doc.text(row[0], 20, yPos);
                if (row[1]) doc.text(row[1], 110, yPos);
                yPos += 6;
            });
            yPos += 4;
        });

        if (selectedCliente.endereco) {
            doc.setFont('helvetica', 'bold');
            doc.text('Localização:', 16, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(selectedCliente.endereco, 40, yPos);
            yPos += 10;
        }

        // 2. PROCESSOS VINCULADOS
        doc.setFillColor(241, 245, 249);
        doc.rect(14, yPos, 182, 8, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('2. PROCESSOS VINCULADOS', 16, yPos + 6);
        yPos += 10;

        const linkedProcesses = processos.filter(p => p.clienteId === selectedCliente.id);

        if (linkedProcesses.length > 0) {
            const procRows = linkedProcesses.map(p => [
                p.numeros?.[0] || 'Sem número',
                p.objeto,
                `${p.tribunal || '-'} / ${p.localTramitacao || '-'}`,
                p.status
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Número', 'Objeto', 'Local', 'Status']],
                body: procRows,
                theme: 'grid',
                headStyles: { fillColor: [16, 185, 129] }, // Emerald color
            });
            // @ts-ignore
            yPos = doc.lastAutoTable.finalY + 10;
        } else {
            doc.setFont('helvetica', 'italic');
            doc.text('Nenhum processo vinculado encontrado.', 16, yPos + 5);
            yPos += 15;
        }

        // 3. FINANCEIRO DO CLIENTE
        if (yPos > 250) { doc.addPage(); yPos = 20; }

        doc.setFillColor(241, 245, 249);
        doc.rect(14, yPos, 182, 8, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('3. FINANCEIRO DO CLIENTE', 16, yPos + 6);
        yPos += 10;

        // Filter logic: Financial records linked directly to client OR via processes of this client
        // Requirement says: "Listar todos os lançamentos financeiros vinculados diretamente ao cliente"
        // "Não incluir lançamentos vinculados apenas aos processos" -> Strict interpretation: only if financeiro.clienteId matches.
        const clientFinancials = financeiro.filter(f => f.clienteId === selectedCliente.id);

        if (clientFinancials.length > 0) {
            const finRows = clientFinancials.map(f => [
                new Date(f.dataVencimento).toLocaleDateString('pt-BR'),
                f.tipo,
                f.descricao,
                `R$ ${f.valor.toLocaleString('pt-BR')}`,
                f.status
            ]);

            const total = clientFinancials.reduce((acc, curr) => {
                return curr.tipo === 'Receita' ? acc + curr.valor : acc - curr.valor;
            }, 0);

            autoTable(doc, {
                startY: yPos,
                head: [['Vencimento', 'Tipo', 'Descrição', 'Valor', 'Status']],
                body: finRows,
                theme: 'grid',
                headStyles: { fillColor: [16, 185, 129] },
            });
            // @ts-ignore
            yPos = doc.lastAutoTable.finalY + 10;

            doc.setFont('helvetica', 'bold');
            doc.text(`Saldo Total (Receitas - Despesas): R$ ${total.toLocaleString('pt-BR')}`, 16, yPos);

        } else {
            doc.setFont('helvetica', 'italic');
            doc.text('Nenhum lançamento financeiro direto encontrado.', 16, yPos + 5);
            yPos += 15;
        }

        // 4. ANDAMENTOS DOS PROCESSOS
        if (yPos > 240) { doc.addPage(); yPos = 20; }

        doc.setFillColor(241, 245, 249);
        doc.rect(14, yPos, 182, 8, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('4. ÚLTIMOS ANDAMENTOS DOS PROCESSOS', 16, yPos + 6);
        yPos += 10;

        const allAndamentos = linkedProcesses.flatMap(p =>
            (p.andamentos || []).map(a => ({ ...a, procNum: p.numeros?.[0] || 'Sem número' }))
        ).sort((a, b) => {
            const dateA = a.data.split('/').reverse().join('-');
            const dateB = b.data.split('/').reverse().join('-');
            return dateB.localeCompare(dateA);
        });

        if (allAndamentos.length > 0) {
            const andRows = allAndamentos.map(and => [
                and.data,
                and.procNum,
                and.tipo,
                and.conteudo
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Data', 'Processo', 'Tipo', 'Conteúdo']],
                body: andRows,
                theme: 'grid',
                headStyles: { fillColor: [16, 185, 129] },
                columnStyles: {
                    3: { cellWidth: 80 }
                }
            });
        } else {
            doc.setFont('helvetica', 'italic');
            doc.text('Nenhum andamento registrado para os processos deste cliente.', 16, yPos + 5);
        }

        doc.save(`dossie_cliente_${selectedCliente.nome.replace(/\s+/g, '_')}.pdf`);
    };

    return (
        <div className="space-y-6">
            {/* Header & Search */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Relatório de Clientes</h1>
                    <p className="text-slate-500">Selecione um cliente para gerar o dossiê completo</p>
                </div>
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou documento..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 bg-white placeholder-slate-400 text-slate-800 focus:border-emerald-500 focus:ring-emerald-500 transition-all outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid of Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                {filteredClientes.map(cliente => {
                    const activeProcesses = getActiveProcessCount(cliente.id);
                    return (
                        <div
                            key={cliente.id}
                            onClick={() => openDossier(cliente)}
                            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-lg hover:border-emerald-400 hover:-translate-y-1 transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-emerald-50 p-2 rounded-lg group-hover:bg-emerald-100 transition-colors">
                                    <Users className="w-6 h-6 text-emerald-600" />
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${cliente.status === 'Ativo' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                    {cliente.status}
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 mb-1">{cliente.nome}</h3>
                            <p className="text-slate-500 text-sm mb-4">{cliente.tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}</p>

                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Briefcase className="w-4 h-4 text-emerald-500" />
                                <span className="font-medium">{activeProcesses} Processos Ativos</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredClientes.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                    <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg">Nenhum cliente encontrado.</p>
                </div>
            )}

            {/* DOSSIER MODAL */}
            {selectedCliente && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">

                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-emerald-50/50">
                            <div>
                                <p className="text-emerald-600 font-bold text-sm tracking-wide uppercase mb-1">Dossiê do Cliente</p>
                                <h2 className="text-2xl font-black text-slate-800">{selectedCliente.nome}</h2>
                                <div className="flex gap-3 mt-2 text-sm text-slate-600">
                                    <span>{selectedCliente.documento}</span>
                                    <span>•</span>
                                    <span>{selectedCliente.tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={exportDossierPDF}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/30"
                                >
                                    <FileDown className="w-4 h-4" />
                                    Exportar PDF
                                </button>
                                <button
                                    onClick={closeDossier}
                                    className="bg-white hover:bg-slate-100 text-slate-400 hover:text-rose-500 p-2 rounded-xl transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="overflow-y-auto p-6 space-y-8 bg-white">

                            {/* 1. DADOS CADASTRAIS */}
                            <section>
                                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                                    <FileText className="w-5 h-5 text-emerald-500" />
                                    Dados Cadastrais
                                </h3>
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase font-bold">Nome Completo / Razão Social</label>
                                        <p className="font-semibold text-slate-800 mt-1">{selectedCliente.nome}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase font-bold">Documento (CPF/CNPJ)</label>
                                        <p className="font-semibold text-slate-800 mt-1">{selectedCliente.documento}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase font-bold">Email</label>
                                        <p className="font-semibold text-slate-800 mt-1">{selectedCliente.email}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase font-bold">Telefone</label>
                                        <p className="font-semibold text-slate-800 mt-1">{selectedCliente.telefone}</p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs text-slate-500 uppercase font-bold">Endereço</label>
                                        <div className="flex items-start gap-2 mt-1">
                                            <MapPin className="w-4 h-4 text-emerald-500 mt-0.5" />
                                            <p className="font-semibold text-slate-800">{selectedCliente.endereco || 'Não informado'}</p>
                                        </div>
                                    </div>
                                    {selectedCliente.representanteLegal && (
                                        <div className="md:col-span-2">
                                            <label className="text-xs text-slate-500 uppercase font-bold">Representante Legal</label>
                                            <p className="font-semibold text-slate-800 mt-1">{selectedCliente.representanteLegal}</p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* 2. PROCESSOS VINCULADOS */}
                            <section>
                                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                                    <Briefcase className="w-5 h-5 text-blue-500" />
                                    Processos Vinculados
                                </h3>
                                <div className="space-y-3">
                                    {processos
                                        .filter(p => p.clienteId === selectedCliente.id)
                                        .map(p => (
                                            <div key={p.id} className="flex justify-between items-center p-4 rounded-xl border border-slate-100 hover:bg-blue-50/30 transition-colors">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-800">{p.numero}</span>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${p.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                            {p.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-500 mt-1">{p.objeto} • {p.tribunal} ({p.localTramitacao})</p>
                                                </div>
                                                <div className="text-right hidden md:block">
                                                    <p className="text-xs font-bold text-slate-400">FASE</p>
                                                    <p className="text-sm font-semibold text-slate-700">{p.faseProcessual}</p>
                                                </div>
                                            </div>
                                        ))
                                    }
                                    {processos.filter(p => p.clienteId === selectedCliente.id).length === 0 && (
                                        <p className="text-slate-400 italic text-sm">Nenhum processo vinculado.</p>
                                    )}
                                </div>
                            </section>

                            {/* 3. FINANCEIRO */}
                            <section>
                                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                                    <DollarSign className="w-5 h-5 text-emerald-500" />
                                    Financeiro do Cliente
                                </h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {financeiro
                                        .filter(f => f.clienteId === selectedCliente.id)
                                        .map(f => (
                                            <div key={f.id} className="flex justify-between items-center p-3 border-b border-slate-100 last:border-0 border-dashed">
                                                <div>
                                                    <p className="font-medium text-slate-800">{f.descricao}</p>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                        <span>{new Date(f.dataVencimento).toLocaleDateString('pt-BR')}</span>
                                                        <span className={`px-2 py-0.5 rounded-full ${f.status === 'Pago' ? 'bg-green-100 text-green-700' :
                                                            f.status === 'Atrasado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                                            }`}>{f.status}</span>
                                                        {f.parcela && <span>Parcela {f.parcela}</span>}
                                                    </div>
                                                </div>
                                                <div className={`font-bold ${f.tipo === 'Receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {f.tipo === 'Receita' ? '+' : '-'} R$ {f.valor.toLocaleString('pt-BR')}
                                                </div>
                                            </div>
                                        ))
                                    }
                                    {financeiro.filter(f => f.clienteId === selectedCliente.id).length === 0 && (
                                        <p className="text-slate-400 italic text-sm">Nenhum lançamento financeiro direto encontrado.</p>
                                    )}
                                </div>
                            </section>

                            {/* 4. ANDAMENTOS DOS PROCESSOS */}
                            <section>
                                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                                    <Activity className="w-5 h-5 text-indigo-500" />
                                    Histórico de Andamentos (Processos)
                                </h3>
                                <div className="space-y-4">
                                    {processos.filter(p => p.clienteId === selectedCliente.id && (p.andamentos || []).length > 0).length > 0 ? (
                                        processos.filter(p => p.clienteId === selectedCliente.id).flatMap(p =>
                                            (p.andamentos || []).map(and => ({ ...and, procNum: p.numeros?.[0] || 'Sem número' }))
                                        ).sort((a, b) => {
                                            const dateA = a.data.split('/').reverse().join('-');
                                            const dateB = b.data.split('/').reverse().join('-');
                                            return dateB.localeCompare(dateA);
                                        }).map(and => (
                                            <div key={and.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PROCESSO: {and.procNum}</span>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                                        <span className="text-xs font-black text-slate-800">{and.data}</span>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{and.tipo}</span>
                                                </div>
                                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{and.conteudo}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-slate-400 italic text-sm">Nenhum andamento registrado para os processos deste cliente.</p>
                                    )}
                                </div>
                            </section>

                        </div>

                        {/* Footer */}
                        <div className="bg-slate-50 p-4 border-t border-slate-100 text-center text-xs text-slate-400">
                            VeredictOS Intelligence • Dossiê Gerado em {new Date().toLocaleDateString('pt-BR')}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ClientReport;
