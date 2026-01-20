
import React from 'react';
import {
    FilePenLine,
    Briefcase,
    Users as UsersIcon,
    MessageSquare,
    CheckSquare,
    ScrollText,
    Activity,
    AlertTriangle
} from 'lucide-react';
import { TipoPrazo } from '../types';
import { GavelWithBase } from './CustomIcons';

interface TaskIconProps {
    tipo: TipoPrazo;
    className?: string;
}

export const getTaskIcon = (tipo: TipoPrazo, className = "w-5 h-5") => {
    switch (tipo) {
        case TipoPrazo.AUDIENCIA: return <GavelWithBase className={className} />;
        case TipoPrazo.PRAZO: return <FilePenLine className={className} />;
        case TipoPrazo.DILIGENCIA: return <Activity className={className} />;
        case TipoPrazo.REUNIAO: return <UsersIcon className={className} />;
        case TipoPrazo.ATENDIMENTO: return <MessageSquare className={className} />;
        case TipoPrazo.ADMINISTRATIVO: return <CheckSquare className={className} />;
        case TipoPrazo.PROTOCOLO: return <ScrollText className={className} />;
        case TipoPrazo.DESPACHO: return <Briefcase className={className} />;
        case TipoPrazo.OUTROS: return <MessageSquare className={className} />;
        default: return <CheckSquare className={className} />;
    }
};

export const getTaskStyle = (tipo: TipoPrazo) => {
    switch (tipo) {
        case TipoPrazo.PRAZO: return 'bg-blue-50 text-blue-600 border-blue-100';
        case TipoPrazo.AUDIENCIA: return 'bg-orange-50 text-orange-600 border-orange-100';
        case TipoPrazo.DILIGENCIA: return 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100';
        case TipoPrazo.REUNIAO: return 'bg-rose-50 text-rose-500 border-rose-100';
        case TipoPrazo.ATENDIMENTO: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        case TipoPrazo.ADMINISTRATIVO: return 'bg-[#efebe9] text-[#5d4037] border-[#d7ccc8]';
        case TipoPrazo.PROTOCOLO: return 'bg-indigo-50 text-indigo-600 border-indigo-100';
        case TipoPrazo.DESPACHO: return 'bg-indigo-50 text-indigo-600 border-indigo-100';
        case TipoPrazo.OUTROS: return 'bg-slate-100 text-slate-600 border-slate-200';
        default: return 'bg-gray-50 text-gray-500 border-gray-100';
    }
};

export const getTaskTextColor = (tipo: TipoPrazo) => {
    switch (tipo) {
        case TipoPrazo.PRAZO: return 'text-blue-600';
        case TipoPrazo.AUDIENCIA: return 'text-orange-600';
        case TipoPrazo.DILIGENCIA: return 'text-fuchsia-600';
        case TipoPrazo.REUNIAO: return 'text-rose-500';
        case TipoPrazo.ATENDIMENTO: return 'text-emerald-600';
        case TipoPrazo.ADMINISTRATIVO: return 'text-[#5d4037]';
        case TipoPrazo.PROTOCOLO: return 'text-indigo-600';
        case TipoPrazo.DESPACHO: return 'text-indigo-600';
        case TipoPrazo.OUTROS: return 'text-slate-600';
        default: return 'text-gray-500';
    }
};

export const TaskIcon: React.FC<TaskIconProps> = ({ tipo, className }) => {
    return <>{getTaskIcon(tipo, className)}</>;
};
