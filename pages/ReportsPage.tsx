import React from 'react';
import { useNavigate, Routes, Route, Link } from 'react-router-dom';
import { FileText, Users, Scale, LayoutDashboard } from 'lucide-react';
import { Cliente, Processo, Prazo, Financeiro } from '../types';
import ProcessReport from './reports/ProcessReport';
import ClientReport from './reports/ClientReport';
import GeneralReport from './reports/GeneralReport';

interface ReportsPageProps {
    clientes: Cliente[];
    processos: Processo[];
    prazos: Prazo[];
    financeiro: Financeiro[];
}

const ReportsLanding: React.FC = () => {
    const navigate = useNavigate();

    const reportTypes = [
        {
            title: 'Relatório de Processos',
            description: 'Visão completa e detalhada dos processos, incluindo histórico e prazos.',
            icon: Scale,
            path: 'processos',
            color: 'bg-blue-500'
        },
        {
            title: 'Relatório de Clientes',
            description: 'Análise institucional dos clientes, volume de processos e status.',
            icon: Users,
            path: 'clientes',
            color: 'bg-emerald-500'
        },
        {
            title: 'Relatório Geral',
            description: 'Indicadores macro do escritório e visão gerencial consolidada.',
            icon: LayoutDashboard,
            path: 'geral',
            color: 'bg-violet-500'
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Relatórios</h1>
                    <p className="text-slate-500">Selecione o tipo de relatório que deseja gerar</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {reportTypes.map((report) => (
                    <div
                        key={report.path}
                        onClick={() => navigate(report.path)}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
                    >
                        <div className={`${report.color} w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white shadow-lg shadow-gray-200 group-hover:scale-110 transition-transform`}>
                            <report.icon className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">{report.title}</h3>
                        <p className="text-sm text-slate-500">{report.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ReportsPage: React.FC<ReportsPageProps> = ({ clientes, processos, prazos, financeiro }) => {
    return (
        <Routes>
            <Route index element={<ReportsLanding />} />
            <Route path="processos" element={<ProcessReport clientes={clientes} processos={processos} prazos={prazos} />} />
            <Route path="clientes" element={<ClientReport clientes={clientes} processos={processos} />} />
            <Route path="geral" element={<GeneralReport clientes={clientes} processos={processos} prazos={prazos} />} />
        </Routes>
    );
};

export default ReportsPage;
