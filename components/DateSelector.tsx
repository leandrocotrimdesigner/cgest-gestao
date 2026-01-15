import React, { useEffect, useState } from 'react';

interface DateSelectorProps {
  value?: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  required?: boolean;
}

export const DateSelector: React.FC<DateSelectorProps> = ({ value, onChange, required }) => {
  // Configuração padrão solicitada: Janeiro de 2026
  const defaultYear = "2026";
  const defaultMonth = "1"; 
  
  // Helper to parse "YYYY-MM-DD" into parts
  const parseDate = (dateStr?: string) => {
    if (!dateStr) return { day: '', month: '', year: '' };
    const [y, m, d] = dateStr.split('-');
    return { day: parseInt(d).toString(), month: parseInt(m).toString(), year: y };
  };

  const [dateParts, setDateParts] = useState(parseDate(value));

  // Update internal state if external value changes
  useEffect(() => {
     setDateParts(parseDate(value));
  }, [value]);

  const handleChange = (part: Partial<typeof dateParts>) => {
    const newParts = { ...dateParts, ...part };
    
    // Auto-fill defaults based on specific requirements (Jan/2026) if user starts typing
    if (!newParts.year) newParts.year = defaultYear;
    if (!newParts.month) newParts.month = defaultMonth;
    if (!newParts.day && part.day) newParts.day = part.day; 

    setDateParts(newParts);

    // Only propagate if we have a valid-ish date
    if (newParts.year && newParts.month && newParts.day) {
        const d = newParts.day.padStart(2, '0');
        const m = newParts.month.padStart(2, '0');
        const y = newParts.year;
        onChange(`${y}-${m}-${d}`);
    } else {
        onChange('');
    }
  };

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const inputClass = "bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none transition-shadow";

  return (
    <div className="flex gap-2 w-full">
      <div className="flex-1">
        <select 
          required={required}
          value={dateParts.day}
          onChange={e => handleChange({ day: e.target.value })}
          className={inputClass}
        >
          <option value="">Dia</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
      
      <div className="flex-[2]">
        <select 
          required={required}
          value={dateParts.month}
          onChange={e => handleChange({ month: e.target.value })}
          className={inputClass}
        >
           <option value="">Mês</option>
          {months.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
      </div>

      <div className="flex-[1.5]">
        <input 
          required={required}
          type="number"
          value={dateParts.year}
          onChange={e => handleChange({ year: e.target.value })}
          className={inputClass}
          placeholder="Ano"
        />
      </div>
    </div>
  );
};