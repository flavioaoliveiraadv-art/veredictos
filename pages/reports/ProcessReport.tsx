import React, { useState } from 'react';
import { Cliente, Processo, Prazo } from '../../types';
import { Search, FileDown, Printer, Filter } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from 'docx';
import { saveAs } from 'file-saver';

interface ProcessReportProps {
    clientes: Cliente[];
    processos: Processo[];
    prazos: Prazo[];
}

const ProcessReport: React.FC<ProcessReportProps> = ({ clientes, processos, prazos }) => {
    const [selectedCliente, setSelectedCliente] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [generated, setGenerated] = useState<boolean>(false);

    // Filter Logic
    const filteredProcessos = processos.filter(p => {
        if (selectedCliente && p.cliente !== selectedCliente) return false;
        if (selectedStatus && p.status !== selectedStatus) return false;
        return true;
    });

    const getProcessTasks = (processId: string) => {
        return prazos.filter(t => t.processoId === processId || t.titulo.includes(processId)); // Simple matching fallback
    };

    // Mocking resources if not available in props directly or logic to find them
    // Assuming 'recursos' mock data might need to be passed or derived. 
    // For now I'll check if resources are in the process object or need a separate lookup.
    // The props only have 'prazos' and 'processos'. I should probably accept 'recursos' too.
    // But for now I'll list tasks.

    const handleGenerate = () => {
        setGenerated(true);
    };

    const getClientName = (id: string) => {
        const client = clientes.find(c => c.id === id);
        return client ? client.nome : id; // Fallback to ID if name not found or if ID is already name
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        let yPos = 20;

        doc.setFontSize(16);
        doc.text('Relatório Processual Detalhado', 14, yPos);
        yPos += 10;

        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, yPos);
        yPos += 10;

        filteredProcessos.forEach((p, index) => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`Processo: ${p.numero}`, 14, yPos);
            yPos += 6;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Cliente: ${p.cliente} | Status: ${p.status} | Vara: ${p.vara || 'N/A'}`, 14, yPos);
            yPos += 6;

            // Tasks
            const tasks = getProcessTasks(p.id);
            if (tasks.length > 0) {
                const taskData = tasks.map(t => [
                    t.titulo,
                    new Date(t.dataVencimento).toLocaleDateString('pt-BR'),
                    t.status
                ]);

                autoTable(doc, {
                    startY: yPos,
                    head: [['Tarefa/Prazo', 'Data Fatal', 'Status']],
                    body: taskData,
                    margin: { left: 14 },
                    theme: 'plain',
                    styles: { fontSize: 8 }
                });

                // @ts-ignore
                yPos = doc.lastAutoTable.finalY + 10;
            } else {
                doc.text('(Sem tarefas vinculadas)', 14, yPos);
                yPos += 10;
            }

            yPos += 5;
            doc.setDrawColor(200);
            doc.line(14, yPos, 196, yPos);
            yPos += 10;
        });

        doc.save('relatorio-processos-detalhado.pdf');
    };

    const exportDOCX = () => {
        // Simplified DOCX export for brevity, mirroring the structure
        const children = [
            new Paragraph({ text: "Relatório Processual Detalhado", heading: "Heading1" }),
            new Paragraph({ text: `Gerado em: ${new Date().toLocaleDateString('pt-BR')}` }),
        ];

        filteredProcessos.forEach(p => {
            children.push(
                new Paragraph({ text: `Processo: ${p.numero}`, heading: "Heading2" }),
                new Paragraph({ text: `Cliente: ${p.cliente} | Status: ${p.status}` }),
                new Paragraph({ text: "Tarefas/Prazos:", bold: true })
            );

            const tasks = getProcessTasks(p.id);
            if (tasks.length > 0) {
                tasks.forEach(t => {
                    children.push(new Paragraph({
                        text: `- ${t.titulo} (${new Date(t.dataVencimento).toLocaleDateString('pt-BR')}) - ${t.status}`,
                        bullet: { level: 0 }
                    }));
                });
            } else {
                children.push(new Paragraph({ text: "(Sem tarefas vinculadas)" }));
            }
            children.push(new Paragraph({ text: "" })); // Spacer
        });

        const doc = new Document({
            sections: [{ properties: {}, children }],
        });

        Packer.toBlob(doc).then(blob => {
            saveAs(blob, "relatorio-processos-detalhado.docx");
        });
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Relatório de Processos</h1>

            {/* Filters */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                        <select
                            className="w-full rounded-lg border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                            value={selectedCliente}
                            onChange={(e) => setSelectedCliente(e.target.value)}
                        >
                            <option value="">Todos</option>
                            {clientes.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                        <select
                            className="w-full rounded-lg border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                        >
                            <option value="">Todos</option>
                            <option value="Ativo">Ativo</option>
                            <option value="Arquivado">Arquivado</option>
                        </select>
                    </div>
                    <div className="md:col-span-2 flex items-end">
                        <button
                            onClick={handleGenerate}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition w-full md:w-auto"
                        >
                            Gerar Relatório
                        </button>
                    </div>
                </div>
            </div>

            {generated && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-slate-800">Resultados ({filteredProcessos.length})</h2>
                        <div className="flex gap-2">
                            <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition">
                                <FileDown className="w-4 h-4" /> PDF
                            </button>
                            <button onClick={exportDOCX} className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition">
                                <FileDown className="w-4 h-4" /> DOCX
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {filteredProcessos.map((p) => {
                            const tasks = getProcessTasks(p.id);
                            return (
                                <div key={p.id} className="border border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                                    <div className="flex flex-col md:flex-row justify-between mb-4">
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-lg">{p.numero}</h3>
                                            <p className="text-slate-600 text-sm">Cliente: <span className="font-medium">{p.cliente}</span></p>
                                            <p className="text-slate-600 text-sm">Vara: {p.vara || 'N/A'}</p>
                                        </div>
                                        <div className="mt-2 md:mt-0">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${p.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {p.status}
                                            </span>
                                        </div>
                                    </div>

                                    {tasks.length > 0 && (
                                        <div className="mt-4 bg-slate-50 p-3 rounded-lg">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tarefas e Prazos</h4>
                                            <div className="space-y-2">
                                                {tasks.map(t => (
                                                    <div key={t.id} className="flex justify-between text-sm border-l-2 border-blue-400 pl-3">
                                                        <span className="text-slate-700">{t.titulo}</span>
                                                        <div className="flex gap-3">
                                                            <span className="text-slate-500">{new Date(t.dataVencimento).toLocaleDateString('pt-BR')}</span>
                                                            <span className={`font-medium ${t.concluido ? 'text-green-600' : 'text-amber-600'}`}>
                                                                {t.concluido ? 'Concluída' : 'Pendente'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
        </div>
                            );
                        };

                        export default ProcessReport;
