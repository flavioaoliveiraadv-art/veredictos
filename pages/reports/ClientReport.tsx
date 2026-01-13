import React, { useState } from 'react';
import { Cliente, Processo } from '../../types';
import { FileDown, Users } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from 'docx';
import { saveAs } from 'file-saver';

interface ClientReportProps {
    clientes: Cliente[];
    processos: Processo[];
}

const ClientReport: React.FC<ClientReportProps> = ({ clientes, processos }) => {
    const [generated, setGenerated] = useState<boolean>(false);

    const handleGenerate = () => {
        setGenerated(true);
    };

    const getActiveProcessCount = (clientName: string) => {
        return processos.filter(p => p.cliente === clientName && p.status === 'Ativo').length;
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Relatório de Clientes', 14, 22);

        const tableData = clientes.map(c => [
            c.nome,
            c.tipo,
            c.cpf || c.cnpj || '-',
            getActiveProcessCount(c.nome).toString()
        ]);

        autoTable(doc, {
            head: [['Nome', 'Tipo', 'Documento', 'Processos Ativos']],
            body: tableData,
            startY: 30,
        });

        doc.save('relatorio-clientes.pdf');
    };

    const exportDOCX = () => {
        const tableRows = [
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: "Nome", bold: true })] }),
                    new TableCell({ children: [new Paragraph({ text: "Tipo", bold: true })] }),
                    new TableCell({ children: [new Paragraph({ text: "Documento", bold: true })] }),
                    new TableCell({ children: [new Paragraph({ text: "Proc. Ativos", bold: true })] }),
                ],
            }),
            ...clientes.map(c =>
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph(c.nome)] }),
                        new TableCell({ children: [new Paragraph(c.tipo)] }),
                        new TableCell({ children: [new Paragraph(c.cpf || c.cnpj || "-")] }),
                        new TableCell({ children: [new Paragraph(getActiveProcessCount(c.nome).toString())] }),
                    ],
                })
            )
        ];

        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({ text: "Relatório de Clientes", heading: "Heading1" }),
                    new Table({
                        rows: tableRows,
                        width: { size: 100, type: WidthType.PERCENTAGE },
                    }),
                ],
            }],
        });

        Packer.toBlob(doc).then(blob => {
            saveAs(blob, "relatorio-clientes.docx");
        });
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Relatório de Clientes</h1>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <p className="text-slate-600 mb-4">Gerar listagem completa de clientes e contagem de processos.</p>
                <button
                    onClick={handleGenerate}
                    className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 transition"
                >
                    Gerar Listagem
                </button>
            </div>

            {generated && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-slate-800">Clientes ({clientes.length})</h2>
                        <div className="flex gap-2">
                            <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition">
                                <FileDown className="w-4 h-4" /> PDF
                            </button>
                            <button onClick={exportDOCX} className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition">
                                <FileDown className="w-4 h-4" /> DOCX
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="py-3 px-4 text-sm font-semibold text-slate-600">Nome</th>
                                    <th className="py-3 px-4 text-sm font-semibold text-slate-600">Tipo</th>
                                    <th className="py-3 px-4 text-sm font-semibold text-slate-600">Documento</th>
                                    <th className="py-3 px-4 text-sm font-semibold text-slate-600">Proc. Ativos</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientes.map((c) => (
                                    <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="py-3 px-4 text-sm text-slate-800 font-medium">{c.nome}</td>
                                        <td className="py-3 px-4 text-sm text-slate-600">{c.tipo}</td>
                                        <td className="py-3 px-4 text-sm text-slate-600 font-mono">{c.cpf || c.cnpj || '-'}</td>
                                        <td className="py-3 px-4 text-sm text-slate-600">
                                            <span className="bg-blue-100 text-blue-700 py-1 px-3 rounded-full text-xs font-bold">
                                                {getActiveProcessCount(c.nome)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientReport;
