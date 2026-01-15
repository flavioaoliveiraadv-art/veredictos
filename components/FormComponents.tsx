
import React from 'react';

interface BaseProps {
    label: string;
    error?: string;
}

export const FormInput = ({ label, error, ...props }: any) => (
    <div className="space-y-2">
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{label}</label>
        <input
            {...props}
            className={`w-full px-5 py-3 bg-white border ${error ? 'border-red-500' : 'border-gray-300'} rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-all placeholder:text-gray-400 text-gray-800 disabled:bg-gray-50 disabled:text-gray-400`}
        />
        {error && <p className="text-[10px] font-bold text-red-500 ml-1 uppercase">{error}</p>}
    </div>
);

export const FormSelect = ({ label, children, error, ...props }: any) => (
    <div className="space-y-2">
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{label}</label>
        <select
            {...props}
            className={`w-full px-5 py-3 bg-white border ${error ? 'border-red-500' : 'border-gray-300'} rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-all appearance-none text-gray-800 disabled:bg-gray-50 disabled:text-gray-400`}
        >
            {children}
        </select>
        {error && <p className="text-[10px] font-bold text-red-500 ml-1 uppercase">{error}</p>}
    </div>
);

export const FormTextArea = ({ label, error, ...props }: any) => (
    <div className="space-y-2">
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{label}</label>
        <textarea
            {...props}
            className={`w-full px-5 py-3 bg-white border ${error ? 'border-red-500' : 'border-gray-300'} rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-all resize-none placeholder:text-gray-400 text-gray-800 disabled:bg-gray-50 disabled:text-gray-400`}
        />
        {error && <p className="text-[10px] font-bold text-red-500 ml-1 uppercase">{error}</p>}
    </div>
);
