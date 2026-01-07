import React from 'react';

export const GavelWithBase = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        {/* Lucide Gavel paths */}
        <path d="m14 13-5-5" />
        <path d="m3 21 3-3" />
        <path d="m9.5 15.5 4-4" />
        <path d="m5.7 12.5 2.5 2.5" />
        <path d="m11.8 5.6 2.5 2.5" />
        <path d="M4.6 14.4c-.8-.8-.8-2 0-2.8l7.2-7.2c.8-.8 2-.8 2.8 0l2.8 2.8c.8.8.8 2 0 2.8l-7.2 7.2c-.8.8-2 .8-2.8 0l-2.8-2.8Z" />

        {/* Custom sound block (base) */}
        <path d="M6 21h10" />
        <path d="M7 18h8" />
    </svg>
);
