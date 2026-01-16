
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export type ModalVariant = 'default' | 'danger' | 'success' | 'info';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  variant?: ModalVariant;
  maxWidth?: string;
  icon?: React.ReactNode; // Ícone opcional no cabeçalho
}

export const BaseModal: React.FC<BaseModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  variant = 'default', 
  maxWidth = 'max-w-md',
  icon
}) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const headerStyles = {
    default: 'bg-white border-slate-100 text-slate-800',
    danger: 'bg-red-50 border-red-100 text-red-900',
    success: 'bg-green-50 border-green-100 text-green-900',
    info: 'bg-blue-50 border-blue-100 text-blue-900',
  };

  const iconBgStyles = {
    default: 'bg-slate-100 text-slate-600',
    danger: 'bg-red-100 text-red-600',
    success: 'bg-green-100 text-green-600',
    info: 'bg-blue-100 text-blue-600',
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4 transition-opacity duration-300"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className={`bg-white rounded-xl shadow-2xl w-full ${maxWidth} animate-fadeIn overflow-hidden flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-6 border-b flex items-start gap-4 ${headerStyles[variant]}`}>
          {icon && (
            <div className={`p-2 rounded-full shrink-0 ${iconBgStyles[variant]}`}>
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold truncate flex items-center gap-2">
              {title}
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="ml-auto text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md hover:bg-black/5"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};
