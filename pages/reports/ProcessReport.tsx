import React, { useState } from 'react';
import { Cliente, Processo, Prazo, Recurso, Financeiro } from '../../types';
import { Search, FileDown, X, Scale, Calendar, DollarSign, FileText, Gavel, Users, Activity } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ProcessReportProps {
    clientes: Cliente[];
    processos: Processo[];
    prazos: Prazo[];
    recursos: Recurso[];
    financeiro: Financeiro[];
}

const ProcessReport: React.FC<ProcessReportProps> = ({ clientes, processos, prazos, recursos, financeiro }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProcesso, setSelectedProcesso] = useState<Processo | null>(null);

    const getClientName = (id: string): string => {
        const client = clientes?.find(c => c.id === id);
        return client ? client.nome : 'Cliente não encontrado';
    };

    // Helper to get the main process number (first in the array or fallback)
    const getNumeroProcesso = (p: Processo): string => {
        return p.numeros && p.numeros.length > 0 ? p.numeros[0] : 'Sem número';
    };

    // Filter processes for the grid view
    const filteredProcessos = (processos || [])
        .filter(p => {
            if (!p) return false;
            const searchLower = searchTerm.toLowerCase();
            const numero = getNumeroProcesso(p);
            const clientName = clientes?.find(c => c.id === p.clienteId)?.nome || '';
            return (
                numero.toLowerCase().includes(searchLower) ||
                clientName.toLowerCase().includes(searchLower) ||
                (p.parteContraria && p.parteContraria.toLowerCase().includes(searchLower)) ||
                (p.objeto && p.objeto.toLowerCase().includes(searchLower))
            );
        })
        .sort((a, b) => {
            const nameA = getClientName(a.clienteId);
            const nameB = getClientName(b.clienteId);
            return nameA.localeCompare(nameB, 'pt-BR');
        });

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
            [`Valor da Causa: R$ ${selectedProcesso.valorCausa?.toLocaleString('pt-BR') || '0,00'}`, `Status: ${selectedProcesso.status || '-'}`]
        ];

        generalData.forEach(row => {
            doc.text(row[0], 16, yPos);
            doc.text(row[1], 110, yPos);
            yPos += 6;
        });
        yPos += 5;

        // 2. Tarefas e Prazos
        doc.setFillColor(241, 245, 249);
        doc.rect(14, yPos, 182, 8, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('2. HISTÓRICO DE TAREFAS E PRAZOS', 16, yPos + 6);
        yPos += 10;

        const tasks = (prazos || [])
            .filter(t => t && t.processoId === selectedProcesso.id)
            .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime());

        if (tasks.length > 0) {
            const taskRows = tasks.map(t => [
                new Date(t.dataVencimento).toLocaleDateString('pt-BR'),
                t.tipo || 'Tarefa',
                t.descricao || '-',
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

        // 3. Recursos
        if (yPos > 250) { doc.addPage(); yPos = 20; }

        doc.setFillColor(241, 245, 249);
        doc.rect(14, yPos, 182, 8, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('3. RECURSOS VINCULADOS', 16, yPos + 6);
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

        // 4. Financeiro
        if (yPos > 250) { doc.addPage(); yPos = 20; }

        doc.setFillColor(241, 245, 249);
        doc.rect(14, yPos, 182, 8, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('4. LANÇAMENTOS FINANCEIROS', 16, yPos + 6);
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
            yPos += 10;
        } else {
            doc.setFont('helvetica', 'italic');
            doc.text('Nenhum lançamento financeiro encontrado.', 16, yPos + 5);
            yPos += 15;
        }

        // 5. Andamentos Processuais
        if (yPos > 240) { doc.addPage(); yPos = 20; }

        doc.setFillColor(241, 245, 249);
        doc.rect(14, yPos, 182, 8, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('5. HISTÓRICO DE ANDAMENTOS', 16, yPos + 6);
        yPos += 10;

        const andamentosList = selectedProcesso.andamentos || [];

        if (andamentosList.length > 0) {
            const andRows = [...andamentosList].reverse().map(and => {
                let displayContent = and.conteudo;
                if (and.tipo === 'Acórdão' && and.acordao) {
                    displayContent = `[ACÓRDÃO] ${and.acordao.resultado} - ${and.acordao.tribunal} (${and.acordao.orgaoJulgador})\nRelator: ${and.acordao.relator}\nTese: ${and.acordao.resumoTeseVencedora || and.conteudo}`;
                } else if (and.tipo === 'Sentença' && and.sentenca) {
                    displayContent = `[SENTENÇA] ${and.sentenca.resultado} (${and.sentenca.instancia})\nResumo: ${and.sentenca.resumoDecisao || and.conteudo}`;
                }
                return [
                    and.data,
                    and.tipo,
                    displayContent,
                    and.geraPrazo ? 'Sim' : 'Não'
                ];
            });

            autoTable(doc, {
                startY: yPos,
                head: [['Data', 'Tipo', 'Conteúdo / Providência', 'Prazo?']],
                body: andRows,
                theme: 'grid',
                headStyles: { fillColor: [79, 70, 229] },
                columnStyles: {
                    2: { cellWidth: 100 }
                }
            });
        } else {
            doc.setFont('helvetica', 'italic');
            doc.text('Nenhum andamento registrado.', 16, yPos + 5);
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
                                        <p className="font-semibold text-emerald-700 mt-1">R$ {selectedProcesso.valorCausa?.toLocaleString('pt-BR') || '0,00'}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <label className="text-xs text-slate-500 uppercase font-bold">Gratuidade Justiça</label>
                                        <p className="font-semibold text-slate-800 mt-1">{selectedProcesso.gratuidade ? 'Sim' : 'Não'}</p>
                                    </div>
                                </div>
                            </section>

                            {/* 2. TIMELINE DE TAREFAS */}
                            <section>
                                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                                    <Calendar className="w-5 h-5 text-indigo-500" />
                                    Histórico de Tarefas e Prazos
                                </h3>
                                <div className="space-y-3">
                                    {(prazos || [])
                                        .filter(t => t && t.processoId === selectedProcesso.id)
                                        .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime())
                                        .map(t => (
                                            <div key={t.id} className="flex items-center p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                                                <div className={`w-2 h-10 rounded-full mr-4 ${t.concluido ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-slate-800">{t.descricao || 'Sem descrição'}</p>
                                                    <p className="text-xs text-slate-500">{t.tipo} • Vencimento: {new Date(t.dataVencimento).toLocaleDateString('pt-BR')}</p>
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

                            {/* 3. RECURSOS */}
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

                            {/* 4. FINANCEIRO */}
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

                            {/* 5. ANDAMENTOS */}
                            <section>
                                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                                    <Activity className="w-5 h-5 text-indigo-500" />
                                    Andamentos Processuais
                                </h3>
                                <div className="space-y-4">
                                    {(selectedProcesso.andamentos || []).length > 0 ? (
                                        [...selectedProcesso.andamentos!].reverse().map((and, idx) => (
                                            <div key={and.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-slate-800 bg-white px-2 py-1 rounded-lg shadow-sm">{and.data}</span>
                                                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{and.tipo}</span>
                                                    </div>
                                                    {and.geraPrazo && <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase font-mono">Gera Prazo</span>}
                                                </div>
                                                {and.tipo === 'Acórdão' && and.acordao ? (
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-2 gap-4 text-[10px] border-b border-slate-200/50 pb-2 mb-2">
                                                            <p><b>Tribunal:</b> {and.acordao.tribunal}</p>
                                                            <p><b>Órgão:</b> {and.acordao.orgaoJulgador}</p>
                                                            <p><b>Relator:</b> {and.acordao.relator}</p>
                                                            <p><b>Recurso:</b> {and.acordao.recursoJulgado}</p>
                                                            <p><b>Resultado:</b> {and.acordao.resultado}</p>
                                                            <p><b>Modificação:</b> {and.acordao.modificacaoDecisao ? 'Sim' : 'Não'}</p>
                                                        </div>
                                                        <p className="text-sm text-slate-600 leading-relaxed font-medium"><b>Tese:</b> {and.acordao.resumoTeseVencedora || and.conteudo}</p>
                                                        {(and.acordao.honorarios || and.acordao.custas || and.acordao.multa) && (
                                                            <div className="flex gap-2 mt-2">
                                                                {and.acordao.honorarios && <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded">Honorários: {and.acordao.honorarios}</span>}
                                                                {and.acordao.custas > 0 && <span className="text-[9px] font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded">Custas: R$ {and.acordao.custas.toLocaleString('pt-BR')}</span>}
                                                                {and.acordao.multa > 0 && <span className="text-[9px] font-bold bg-rose-50 text-rose-700 px-2 py-1 rounded">Multa: R$ {and.acordao.multa.toLocaleString('pt-BR')}</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : and.tipo === 'Sentença' && and.sentenca ? (
                                                    <div className="space-y-2">
                                                        <div className="grid grid-cols-2 gap-2 text-[10px] border-b border-slate-200/50 pb-2 mb-2">
                                                            <p><b>Instância:</b> {and.sentenca.instancia}</p>
                                                            <p><b>Magistrado:</b> {and.sentenca.magistrado}</p>
                                                            <p><b>Resultado:</b> {and.sentenca.resultado}</p>
                                                            <p><b>Favorável:</b> {and.sentenca.decisaoFavoravel ? 'Sim' : 'Não'}</p>
                                                        </div>
                                                        <p className="text-sm text-slate-600 leading-relaxed font-medium"><b>Resumo:</b> {and.sentenca.resumoDecisao || and.conteudo}</p>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{and.conteudo}</p>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-slate-400 italic text-sm">Nenhum andamento registrado.</p>
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
