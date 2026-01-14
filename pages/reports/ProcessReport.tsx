import React, { useState } from 'react';
import { Cliente, Processo, Prazo, Recurso, Financeiro, Andamento } from '../../types';
import { Search, FileDown, X, Scale, Calendar, DollarSign, FileText, Gavel, Users, Activity } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { compareDatesBR } from '../../utils/formatters';

interface ProcessReportProps {
    clientes: Cliente[];
    processos: Processo[];
    prazos: Prazo[];
    recursos: Recurso[];
    financeiro: Financeiro[];
    andamentos: Andamento[];
}

const ProcessReport: React.FC<ProcessReportProps> = ({ clientes, processos, prazos, recursos, financeiro, andamentos }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProcesso, setSelectedProcesso] = useState<Processo | null>(null);

    // Helper to get the main process number (first in the array or fallback)
    const getNumeroProcesso = (p: Processo): string => {
        if (!p || !p.numeros || !Array.isArray(p.numeros) || p.numeros.length === 0) return 'Sem número';
        return p.numeros[0];
    };

    // Filter processes for the grid view and sort by client name
    const filteredProcessos = (processos || [])
        .filter(p => {
            if (!p) return false;
            const searchLower = (searchTerm || '').toLowerCase();
            const numero = getNumeroProcesso(p) || '';
            const clientName = (clientes?.find(c => c && c.id === p.clienteId)?.nome || '').toLowerCase();
            return (
                numero.toLowerCase().includes(searchLower) ||
                clientName.includes(searchLower) ||
                (p.parteContraria && p.parteContraria.toLowerCase().includes(searchLower)) ||
                (p.objeto && p.objeto.toLowerCase().includes(searchLower))
            );
        })
        .sort((a, b) => {
            const nameA = getClientName(a.clienteId) || '';
            const nameB = getClientName(b.clienteId) || '';
            return nameA.localeCompare(nameB);
        });

    const getClientName = (id: string): string => {
        if (!id || !Array.isArray(clientes)) return 'Cliente não encontrado';
        const client = clientes.find(c => c && c.id === id);
        return client ? client.nome : 'Cliente não encontrado';
    };

    const openDossier = (processo: Processo) => {
        setSelectedProcesso(processo);
    };

    const closeDossier = () => {
        setSelectedProcesso(null);
    };

    const exportDossierPDF = () => {
        if (!selectedProcesso) return;

        const doc = new jsPDF();
        const clienteName = getClientName(selectedProcesso.clienteId);
        const numero = getNumeroProcesso(selectedProcesso);
        let yPos = 20;

        // Header
        doc.setFontSize(22);
        doc.setTextColor(11, 23, 38);
        doc.text('Dossiê Processual Completo', 105, yPos, { align: 'center' });
        yPos += 10;

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 105, yPos, { align: 'center' });
        yPos += 15;

        // 1. Dados Gerais
        doc.setFillColor(241, 245, 249);
        doc.rect(14, yPos, 182, 8, 'F');
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        doc.text('1. DADOS GERAIS DO PROCESSO', 16, yPos + 6);
        yPos += 15;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        const generalData = [
            [`Processo: ${numero}`, `Tribunal: ${selectedProcesso.tribunal || '-'}`],
            [`Cliente: ${clienteName}`, `Comarca: ${selectedProcesso.comarca || '-'}`],
            [`Parte Adversa: ${selectedProcesso.parteContraria || '-'}`, `Vara: ${selectedProcesso.localTramitacao || '-'}`],
            [`Área: ${selectedProcesso.areaAtuacao || '-'}`, `Fase: ${selectedProcesso.faseProcessual || '-'}`],
            [`Valor da Causa: R$ ${Number(selectedProcesso.valorCausa || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, `Status: ${selectedProcesso.status || '-'}`]
        ];

        generalData.forEach(row => {
            doc.text(row[0], 16, yPos);
            doc.text(row[1], 110, yPos);
            yPos += 6;
        });
        yPos += 5;

        // 2. Andamentos (NEW)
        doc.setFillColor(241, 245, 249);
        doc.rect(14, yPos, 182, 8, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('2. HISTÓRICO DE ANDAMENTOS', 16, yPos + 6);
        yPos += 10;

        const procAndamentos = (andamentos || [])
            .filter(a => a && a.processoId === selectedProcesso.id)
            .sort((a, b) => compareDatesBR(b.data, a.data)); // Reversa (mais novo primeiro)

        if (procAndamentos.length > 0) {
            const andamentoRows = procAndamentos.map(a => [
                a.data,
                a.tipo,
                a.descricao,
                a.providencia
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Data', 'Tipo', 'Descrição', 'Providência']],
                body: andamentoRows,
                theme: 'grid',
                headStyles: { fillColor: [79, 70, 229] },
                columnStyles: { 2: { cellWidth: 80 } }
            });
            // @ts-ignore
            yPos = doc.lastAutoTable.finalY + 10;
        } else {
            doc.setFont('helvetica', 'italic');
            doc.text('Nenhum andamento registrado.', 16, yPos + 5);
            yPos += 15;
        }

        // 3. Tarefas e Prazos (Shifted)
        if (yPos > 240) { doc.addPage(); yPos = 20; }
        doc.setFillColor(241, 245, 249);
        doc.rect(14, yPos, 182, 8, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('3. HISTÓRICO DE TAREFAS E PRAZOS', 16, yPos + 6);
        yPos += 10;

        const tasks = (prazos || [])
            .filter(t => t && t.processoId === selectedProcesso.id)
            .sort((a, b) => compareDatesBR(a.dataVencimento, b.dataVencimento));

        if (tasks.length > 0) {
            const taskRows = tasks.map(t => [
                new Date(t.dataVencimento).toLocaleDateString('pt-BR'),
                t.tipo || 'Tarefa',
                t.observacoesRelatorio ? `${t.descricao}\nObs: ${t.observacoesRelatorio}` : (t.descricao || '-'),
                t.concluido ? 'Concluída' : 'Pendente'
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Data', 'Tipo', 'Descrição', 'Status']],
                body: taskRows,
                theme: 'grid',
                headStyles: { fillColor: [79, 70, 229] },
            });
            // @ts-ignore
            yPos = doc.lastAutoTable.finalY + 10;
        } else {
            doc.setFont('helvetica', 'italic');
            doc.text('Nenhum registro encontrado.', 16, yPos + 5);
            yPos += 15;
        }

        // 4. Recursos
        if (yPos > 240) { doc.addPage(); yPos = 20; }
        doc.setFillColor(241, 245, 249);
        doc.rect(14, yPos, 182, 8, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('4. RECURSOS VINCULADOS', 16, yPos + 6);
        yPos += 10;

        const linkedResources = (recursos || []).filter(r => r && r.processoOriginarioId === selectedProcesso.id);

        if (linkedResources.length > 0) {
            const recRows = linkedResources.map(r => [
                r.tipoRecurso || '-',
                r.numeroRecurso || '-',
                r.tribunal || '-',
                r.status || '-'
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Tipo', 'Número', 'Tribunal', 'Status']],
                body: recRows,
                theme: 'grid',
                headStyles: { fillColor: [79, 70, 229] },
            });
            // @ts-ignore
            yPos = doc.lastAutoTable.finalY + 10;
        } else {
            doc.setFont('helvetica', 'italic');
            doc.text('Nenhum recurso vinculado encontrado.', 16, yPos + 5);
            yPos += 15;
        }

        // 5. Financeiro
        if (yPos > 240) { doc.addPage(); yPos = 20; }
        doc.setFillColor(241, 245, 249);
        doc.rect(14, yPos, 182, 8, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('5. LANÇAMENTOS FINANCEIROS', 16, yPos + 6);
        yPos += 10;

        const finRecords = (financeiro || []).filter(f => f && f.processoId === selectedProcesso.id);

        if (finRecords.length > 0) {
            const finRows = finRecords.map(f => [
                new Date(f.dataVencimento).toLocaleDateString('pt-BR'),
                f.tipo || '-',
                f.descricao || '-',
                `R$ ${f.valor?.toLocaleString('pt-BR') || '0,00'}`,
                f.status || '-'
            ]);

            const totalReceitas = finRecords.filter(f => f.tipo === 'Receita').reduce((acc, curr) => acc + (curr.valor || 0), 0);
            const totalDespesas = finRecords.filter(f => f.tipo === 'Despesa').reduce((acc, curr) => acc + (curr.valor || 0), 0);

            autoTable(doc, {
                startY: yPos,
                head: [['Vencimento', 'Tipo', 'Descrição', 'Valor', 'Status']],
                body: finRows,
                theme: 'grid',
                headStyles: { fillColor: [79, 70, 229] },
            });
            // @ts-ignore
            yPos = doc.lastAutoTable.finalY + 10;

            doc.setFont('helvetica', 'bold');
            doc.text(`Total Receitas: R$ ${totalReceitas.toLocaleString('pt-BR')}`, 16, yPos);
            doc.text(`Total Despesas: R$ ${totalDespesas.toLocaleString('pt-BR')}`, 100, yPos);

        } else {
            doc.setFont('helvetica', 'italic');
            doc.text('Nenhum lançamento financeiro encontrado.', 16, yPos + 5);
        }

        doc.save(`dossie_processo_${numero.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    };

    // Handle loading state or empty data gracefully
    if (!processos || processos.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Relatório de Processos</h1>
                        <p className="text-slate-500">Selecione um processo para gerar o dossiê completo</p>
                    </div>
                </div>
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                    <Scale className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg">Nenhum processo disponível para relatório.</p>
                    <p className="text-slate-400 text-sm mt-2">Cadastre processos no módulo Processos para visualizá-los aqui.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header & Search */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Relatório de Processos</h1>
                    <p className="text-slate-500">Selecione um processo para gerar o dossiê completo</p>
                </div>
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar por número, cliente ou parte..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid of Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                {filteredProcessos.map(processo => {
                    const clientName = getClientName(processo.clienteId);
                    const numero = getNumeroProcesso(processo);
                    return (
                        <div
                            key={processo.id}
                            onClick={() => openDossier(processo)}
                            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-lg hover:border-blue-400 hover:-translate-y-1 transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-blue-50 p-2 rounded-lg group-hover:bg-blue-100 transition-colors">
                                    <Scale className="w-6 h-6 text-blue-600" />
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${processo.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                    {processo.status}
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 mb-1">{numero}</h3>
                            <p className="text-slate-500 text-sm mb-4 line-clamp-1">{processo.objeto || 'Sem objeto definido'}</p>

                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-slate-700">
                                    <Users className="w-4 h-4 text-slate-400" />
                                    <span className="font-medium truncate">{clientName}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Gavel className="w-4 h-4 text-slate-400" />
                                    <span className="truncate">{processo.localTramitacao || 'Vara não informada'}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredProcessos.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                    <Scale className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg">Nenhum processo encontrado com esses termos.</p>
                </div>
            )}

            {/* DOSSIER MODAL */}
            {selectedProcesso && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">

                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                            <div>
                                <p className="text-blue-600 font-bold text-sm tracking-wide uppercase mb-1">Dossiê Processual</p>
                                <h2 className="text-2xl font-black text-slate-800">{getNumeroProcesso(selectedProcesso)}</h2>
                                <div className="flex gap-3 mt-2 text-sm text-slate-600">
                                    <span>Cliente: <b>{getClientName(selectedProcesso.clienteId)}</b></span>
                                    <span>•</span>
                                    <span>{selectedProcesso.areaAtuacao}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={exportDossierPDF}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/30"
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

                        {/* Modal Content - Scrollable */}
                        <div className="overflow-y-auto p-6 space-y-8 bg-white">

                            {/* 1. DADOS GERAIS */}
                            <section>
                                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                                    <FileText className="w-5 h-5 text-blue-500" />
                                    Dados Gerais
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <label className="text-xs text-slate-500 uppercase font-bold">Tribunal / Comarca</label>
                                        <p className="font-semibold text-slate-800 mt-1">{selectedProcesso.tribunal || '-'} / {selectedProcesso.comarca || '-'}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <label className="text-xs text-slate-500 uppercase font-bold">Vara / Local</label>
                                        <p className="font-semibold text-slate-800 mt-1">{selectedProcesso.localTramitacao || '-'}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <label className="text-xs text-slate-500 uppercase font-bold">Fase Processual</label>
                                        <p className="font-semibold text-slate-800 mt-1">{selectedProcesso.faseProcessual || '-'}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <label className="text-xs text-slate-500 uppercase font-bold">Parte Adversa</label>
                                        <p className="font-semibold text-slate-800 mt-1">{selectedProcesso.parteContraria || '-'}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <label className="text-xs text-slate-500 uppercase font-bold">Valor da Causa</label>
                                        <p className="font-semibold text-emerald-700 mt-1">R$ {Number(selectedProcesso.valorCausa || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <label className="text-xs text-slate-500 uppercase font-bold">Gratuidade Justiça</label>
                                        <p className="font-semibold text-slate-800 mt-1">{selectedProcesso.gratuidade ? 'Sim' : 'Não'}</p>
                                    </div>
                                </div>
                            </section>

                            {/* 2. TIMELINE DE ANDAMENTOS */}
                            <section>
                                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                                    <Activity className="w-5 h-5 text-indigo-500" />
                                    Histórico de Andamentos
                                </h3>
                                <div className="space-y-4">
                                    {(andamentos || [])
                                        .filter(a => a && a.processoId === selectedProcesso.id)
                                        .sort((a, b) => compareDatesBR(b.data, a.data))
                                        .map(a => (
                                            <div key={a.id} className="relative pl-8 before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-100 last:before:hidden">
                                                <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full border-2 border-indigo-400 bg-white z-10 flex items-center justify-center">
                                                    <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                                                </div>
                                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="text-xs font-black text-indigo-600">{a.data}</span>
                                                        <span className="bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest">{a.tipo}</span>
                                                        <span className="bg-white text-slate-500 text-[9px] font-bold uppercase px-2 py-0.5 rounded border border-slate-200 tracking-widest">{a.providencia}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap">{a.descricao}</p>
                                                    {a.prazoId && (
                                                        <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase">
                                                            <Calendar className="w-3.5 h-3.5" /> Prazo Gerado e Vinculado
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    }
                                    {(andamentos || []).filter(a => a && a.processoId === selectedProcesso.id).length === 0 && (
                                        <p className="text-slate-400 italic text-sm">Nenhum andamento registrado.</p>
                                    )}
                                </div>
                            </section>

                            {/* 3. TIMELINE DE TAREFAS */}
                            <section>
                                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                                    <Calendar className="w-5 h-5 text-indigo-500" />
                                    Histórico de Tarefas e Prazos
                                </h3>
                                <div className="space-y-3">
                                    {(prazos || [])
                                        .filter(t => t && t.processoId === selectedProcesso.id)
                                        .sort((a, b) => compareDatesBR(a.dataVencimento, b.dataVencimento))
                                        .map(t => (
                                            <div key={t.id} className="flex items-center p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                                                <div className={`w-2 h-10 rounded-full mr-4 ${t.concluido ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-slate-800">{t.descricao || 'Sem descrição'}</p>
                                                    <p className="text-xs text-slate-500">{t.tipo} • Vencimento: {new Date(t.dataVencimento).toLocaleDateString('pt-BR')}</p>
                                                    {t.observacoesRelatorio && (
                                                        <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                                                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Observações para Relatório</p>
                                                            <p className="text-xs text-slate-700 font-medium">{t.observacoesRelatorio}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${t.concluido ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                                        {t.concluido ? 'Realizada' : 'Pendente'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    }
                                    {(prazos || []).filter(t => t && t.processoId === selectedProcesso.id).length === 0 && (
                                        <p className="text-slate-400 italic text-sm">Nenhuma tarefa ou prazo registrado.</p>
                                    )}
                                </div>
                            </section>

                            {/* 4. RECURSOS */}
                            <section>
                                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                                    <Gavel className="w-5 h-5 text-violet-500" />
                                    Recursos Vinculados
                                </h3>
                                <div className="space-y-2">
                                    {(recursos || [])
                                        .filter(r => r && r.processoOriginarioId === selectedProcesso.id)
                                        .map(r => (
                                            <div key={r.id} className="bg-violet-50 p-4 rounded-xl border border-violet-100 flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold text-violet-900">{r.tipoRecurso}</p>
                                                    <p className="text-sm text-violet-700">Nº {r.numeroRecurso}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-bold uppercase text-violet-500">{r.tribunal}</p>
                                                    <span className="text-xs bg-white px-2 py-1 rounded text-violet-800 border border-violet-200 mt-1 inline-block">{r.status}</span>
                                                </div>
                                            </div>
                                        ))
                                    }
                                    {(recursos || []).filter(r => r && r.processoOriginarioId === selectedProcesso.id).length === 0 && (
                                        <p className="text-slate-400 italic text-sm">Nenhum recurso vinculado.</p>
                                    )}
                                </div>
                            </section>

                            {/* 5. FINANCEIRO */}
                            <section>
                                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                                    <DollarSign className="w-5 h-5 text-emerald-500" />
                                    Lançamentos Financeiros
                                </h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {(financeiro || [])
                                        .filter(f => f && f.processoId === selectedProcesso.id)
                                        .map(f => (
                                            <div key={f.id} className="flex justify-between items-center p-3 border-b border-slate-100 last:border-0">
                                                <div>
                                                    <p className="font-medium text-slate-800">{f.descricao}</p>
                                                    <p className="text-xs text-slate-500">{new Date(f.dataVencimento).toLocaleDateString('pt-BR')} • {f.status}</p>
                                                </div>
                                                <div className={`font-bold ${f.tipo === 'Receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {f.tipo === 'Receita' ? '+' : '-'} R$ {f.valor?.toLocaleString('pt-BR') || '0,00'}
                                                </div>
                                            </div>
                                        ))
                                    }
                                    {(financeiro || []).filter(f => f && f.processoId === selectedProcesso.id).length === 0 && (
                                        <p className="text-slate-400 italic text-sm">Nenhum lançamento financeiro.</p>
                                    )}
                                </div>
                            </section>

                        </div>

                        {/* Modal Footer */}
                        <div className="bg-slate-50 p-4 border-t border-slate-100 text-center text-xs text-slate-400">
                            Dossiê gerado automaticamente pelo módulo de Relatórios do VeredictOS.
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ProcessReport;
