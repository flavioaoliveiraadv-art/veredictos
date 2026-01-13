import React from 'react';
import { Cliente, Processo, Prazo } from '../../types';
import { FileDown, LayoutDashboard } from 'lucide-react';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

interface GeneralReportProps {
    clientes: Cliente[];
    processos: Processo[];
    prazos: Prazo[];
}

const GeneralReport: React.FC<GeneralReportProps> = ({ clientes, processos, prazos }) => {
    const stats = {
        totalClientes: clientes.length,
        processosAtivos: processos.filter(p => p.status === 'Ativo').length,
        processosArquivados: processos.filter(p => p.status === 'Arquivado').length,
        prazosPendentes: prazos.filter(p => !p.concluido).length,
        prazosConcluidos: prazos.filter(p => p.concluido).length,
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text('Relatório Geral do Escritório', 14, 22);
        doc.setFontSize(12);
        doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

        doc.text('RESUMO DE DADOS', 14, 45);
        doc.text(`Total de Clientes: ${stats.totalClientes}`, 14, 55);
        doc.text(`Processos Ativos: ${stats.processosAtivos}`, 14, 62);
        doc.text(`Processos Arquivados: ${stats.processosArquivados}`, 14, 69);
        doc.text(`Tarefas/Prazos Pendentes: ${stats.prazosPendentes}`, 14, 76);
        doc.text(`Tarefas/Prazos Concluídos: ${stats.prazosConcluidos}`, 14, 83);

        doc.save('relatorio-geral.pdf');
    };

    const exportDOCX = () => {
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({ text: "Relatório Geral do Escritório", heading: "Heading1" }),
                    new Paragraph({ text: `Gerado em: ${new Date().toLocaleDateString('pt-BR')}` }),
                    new Paragraph({ text: "" }),
                    new Paragraph({ text: "RESUMO DE DADOS", heading: "Heading2" }),
                    new Paragraph({ text: `Total de Clientes: ${stats.totalClientes}`, bullet: { level: 0 } }),
                    new Paragraph({ text: `Processos Ativos: ${stats.processosAtivos}`, bullet: { level: 0 } }),
                    new Paragraph({ text: `Processos Arquivados: ${stats.processosArquivados}`, bullet: { level: 0 } }),
                    new Paragraph({ text: `Tarefas Pendentes: ${stats.prazosPendentes}`, bullet: { level: 0 } }),
                    new Paragraph({ text: `Tarefas Concluídas: ${stats.prazosConcluidos}`, bullet: { level: 0 } }),
                ],
            }],
        });

        Packer.toBlob(doc).then(blob => {
            saveAs(blob, "relatorio-geral.docx");
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">Relatório Geral</h1>
                <div className="flex gap-2">
                    <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition">
                        <FileDown className="w-4 h-4" /> PDF
                    </button>
                    <button onClick={exportDOCX} className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition">
                        <FileDown className="w-4 h-4" /> DOCX
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500 font-medium">Total de Clientes</p>
                    <p className="text-3xl font-bold text-slate-800 mt-2">{stats.totalClientes}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500 font-medium">Processos Ativos</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{stats.processosAtivos}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500 font-medium">Tarefas Pendentes</p>
                    <p className="text-3xl font-bold text-amber-500 mt-2">{stats.prazosPendentes}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500 font-medium">Concluídas</p>
                    <p className="text-3xl font-bold text-emerald-600 mt-2">{stats.prazosConcluidos}</p>
                </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center py-20">
                <LayoutDashboard className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500">Mais indicadores podem ser adicionados aqui conforme necessidade.</p>
            </div>
        </div>
    );
};

export default GeneralReport;
