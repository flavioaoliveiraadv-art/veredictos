
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

export const FormCheckbox = ({ label, checked, onChange, description, ...props }: any) => (
    <label className="flex items-start gap-4 cursor-pointer group">
        <div className="relative mt-0.5">
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="sr-only peer"
                {...props}
            />
            <div className="w-12 h-7 bg-gray-200 rounded-full peer-checked:bg-indigo-600 transition-all duration-300"></div>
            <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full shadow-sm peer-checked:translate-x-5 transition-all duration-300"></div>
        </div>
        <div className="flex-1">
            <span className="text-sm font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">{label}</span>
            {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
        </div>
    </label>
);
