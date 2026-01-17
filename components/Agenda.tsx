
import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, AlertCircle } from 'lucide-react';

const Agenda: React.FC = () => {
  // Agenda Desativada temporariamente para estabilização
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 animate-fadeIn">
        <div className="bg-slate-100 p-4 rounded-full">
            <CalendarIcon className="text-slate-400 w-12 h-12" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Agenda Simplificada</h2>
        <p className="text-slate-500 max-w-md">
            O módulo de agenda foi pausado temporariamente para manutenção da conexão. 
            Utilize a aba "Tarefas" para gerenciar seus compromissos do dia.
        </p>
    </div>
  );
};

export default Agenda;
