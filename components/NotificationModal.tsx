
import React from 'react';
import { X, AlertTriangle, Calendar, Clock, ArrowRight, Bell } from 'lucide-react';
import { Prazo, Cliente, Processo } from '../types';
import { getTaskIcon, getTaskStyle, getTaskTextColor } from './TaskIcon';

interface NotificationModalProps {
    overdue: Prazo[];
    today: Prazo[];
    clientes: Cliente[];
    processos: Processo[];
    onClose: () => void;
    onViewTasks: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
    overdue,
    today,
    clientes,
    processos,
    onClose,
    onViewTasks
}) => {
    const hasAlerts = overdue.length > 0 || today.length > 0;

    if (!hasAlerts) return null;

    return (
        <div className="fixed inset-0 bg-[#0b1726]/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
                            <Bell className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-800 tracking-tighter">Atenção aos Prazos</h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Resumo de atividades pendentes</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                        <X className="w-8 h-8" />
                    </button>
                </div>

                <div className="p-8 max-h-[60vh] overflow-y-auto custom-scroll space-y-8">
                    {/* Overdue Section */}
                    {overdue.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-rose-600">
                                <AlertTriangle className="w-5 h-5 font-black" />
                                <h3 className="text-sm font-black uppercase tracking-widest">🚨 Em Atraso ({overdue.length})</h3>
                            </div>
                            <div className="space-y-3">
                                {overdue.map(p => (
                                    <ActivityItem key={p.id} item={p} clientes={clientes} processos={processos} variant="overdue" />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Today Section */}
                    {today.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-indigo-600">
                                <Calendar className="w-5 h-5 font-black" />
                                <h3 className="text-sm font-black uppercase tracking-widest">📅 Para Hoje ({today.length})</h3>
                            </div>
                            <div className="space-y-3">
                                {today.map(p => (
                                    <ActivityItem key={p.id} item={p} clientes={clientes} processos={processos} variant="today" />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-8 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 bg-white border border-gray-200 text-gray-500 rounded-2xl font-black uppercase text-xs hover:bg-gray-100 transition-all"
                    >
                        Agora não
                    </button>
                    <button
                        onClick={onViewTasks}
                        className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                    >
                        Ver Todas as Tarefas <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const ActivityItem = ({ item, clientes, processos, variant }: any) => {
    const cli = clientes.find((c: any) => c.id === item.clienteId);
    const proc = processos.find((p: any) => p.id === item.processoId);

    return (
        <div className={`p-4 rounded-2xl border transition-all flex items-center gap-4 ${variant === 'overdue' ? 'bg-rose-50/50 border-rose-100' : 'bg-indigo-50/50 border-indigo-100'
            }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm ${getTaskStyle(item.tipo)}`}>
                {getTaskIcon(item.tipo, "w-6 h-6")}
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <h4 className="text-sm font-black text-gray-800 leading-tight mb-1">{item.descricao}</h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {item.dataVencimento} {item.horaVencimento ? ` às ${item.horaVencimento}` : ''}</span>
                            {cli && <span>• {cli.nome}</span>}
                            {proc && <span>• {proc.numeros[0]}</span>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationModal;
