
import React, { useState } from 'react';
import { Goal } from '../types';
import { Plus, Trash2, Target, Calendar, Edit2, Check, AlertTriangle, X } from 'lucide-react';

interface GoalsProps {
  goals: Goal[];
  onAddGoal: (goal: Omit<Goal, 'id'>) => Promise<void>;
  onDeleteGoal: (id: string) => Promise<void>;
  onUpdateGoal: (goal: Goal) => Promise<void>;
  readOnly?: boolean;
}

const Goals: React.FC<GoalsProps> = ({ goals, onAddGoal, onDeleteGoal, onUpdateGoal, readOnly = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [formData, setFormData] = useState({ description: '', targetValue: 0, currentValue: 0, deadline: '' });

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const calculateProgress = (current: number, target: number) => {
    if (target === 0) return 0;
    const progress = (current / target) * 100;
    return Math.min(progress, 100);
  };

  const handleOpenAdd = () => {
    setEditingGoal(null);
    setFormData({ description: '', targetValue: 0, currentValue: 0, deadline: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      description: goal.description,
      targetValue: goal.targetValue,
      currentValue: goal.currentValue,
      deadline: goal.deadline || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.targetValue) return;

    const payload = {
      description: formData.description,
      targetValue: Number(formData.targetValue),
      currentValue: Number(formData.currentValue),
      deadline: formData.deadline
    };

    if (editingGoal) {
      await onUpdateGoal({ ...editingGoal, ...payload });
    } else {
      await onAddGoal({ ...payload, currentValue: payload.currentValue || 0 });
    }
    
    setIsModalOpen(false);
  };

  const confirmDelete = async () => {
    if (goalToDelete && deleteConfirmationText === goalToDelete.description) {
      await onDeleteGoal(goalToDelete.id);
      setGoalToDelete(null);
      setDeleteConfirmationText('');
    }
  };

  // High contrast input style
  const inputClass = "w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-400 shadow-sm";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Metas Financeiras</h2>
          <p className="text-slate-500">{readOnly ? 'Acompanhamento de progresso' : 'Acompanhe seus objetivos e conquistas'}</p>
        </div>
        {!readOnly && (
            <button 
            onClick={handleOpenAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all active:scale-95 shadow-md"
            >
            <Plus size={20} />
            Nova Meta
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map(goal => {
          const progress = calculateProgress(goal.currentValue, goal.targetValue);
          return (
            <div key={goal.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-full hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Target size={24} />
                </div>
                {!readOnly && (
                    <div className="flex gap-2">
                        <button 
                        onClick={() => handleOpenEdit(goal)}
                        className="text-slate-400 hover:text-blue-500 transition-colors p-1"
                        title="Editar"
                        >
                        <Edit2 size={18} />
                        </button>
                        <button 
                        onClick={() => { setGoalToDelete(goal); setDeleteConfirmationText(''); }}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                        title="Excluir"
                        >
                        <Trash2 size={18} />
                        </button>
                    </div>
                )}
              </div>

              <h3 className="font-semibold text-slate-800 text-lg mb-1">{goal.description}</h3>
              {goal.deadline && (
                <div className="flex items-center gap-1 text-xs text-slate-400 mb-4">
                  <Calendar size={12} />
                  <span>Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}</span>
                </div>
              )}

              <div className="mt-auto space-y-3">
                <div className="flex justify-between items-end text-sm">
                  <span className="text-slate-500 font-medium">Progresso</span>
                  <span className="font-bold text-indigo-600">{progress.toFixed(0)}%</span>
                </div>
                
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-500" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div>
                    <p className="text-xs text-slate-500">Atual</p>
                    <p className="font-semibold text-slate-700">{formatCurrency(goal.currentValue)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Alvo</p>
                    <p className="font-semibold text-slate-700">{formatCurrency(goal.targetValue)}</p>
                  </div>
                </div>

                {!readOnly && (
                    <div className="pt-3 mt-2 border-t border-slate-100">
                    <label className="text-xs font-semibold text-slate-500 block mb-1.5 uppercase tracking-wide">Atualização Rápida</label>
                    <div className="flex gap-2">
                        <input 
                            type="number" 
                            value={goal.currentValue}
                            onChange={(e) => onUpdateGoal({ ...goal, currentValue: Number(e.target.value) })}
                            className="w-full text-sm bg-white text-slate-900 border border-slate-300 rounded px-3 py-1.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 font-medium"
                        />
                        <div className="flex items-center justify-center p-1.5 bg-green-50 text-green-600 rounded border border-green-100" title="Salvo">
                            <Check size={14} />
                        </div>
                    </div>
                    </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {goalToDelete && !readOnly && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={() => setGoalToDelete(null)}>
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fadeIn overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-6 bg-red-50 border-b border-red-100 flex items-start gap-4">
                <div className="p-2 bg-red-100 rounded-full text-red-600">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-900">Excluir Meta</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Esta ação é irreversível.
                  </p>
                </div>
                <button 
                  onClick={() => setGoalToDelete(null)}
                  className="ml-auto text-red-400 hover:text-red-700"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <p className="text-slate-600 text-sm">
                  Para confirmar, digite: <span className="font-bold">{goalToDelete.description}</span>
                </p>
                <input 
                  type="text"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder="Nome da meta"
                  className={inputClass}
                  autoFocus
                />
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setGoalToDelete(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                  <button 
                    onClick={confirmDelete}
                    disabled={deleteConfirmationText !== goalToDelete.description}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium shadow-md shadow-red-200 transition-all"
                  >
                    Excluir
                  </button>
                </div>
              </div>
           </div>
        </div>
      )}

      {isModalOpen && !readOnly && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">{editingGoal ? 'Editar Meta' : 'Nova Meta'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                <input required type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={inputClass} placeholder="Ex: Faturamento 100k" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valor Alvo (R$)</label>
                  <input required type="number" min="0" step="0.01" value={formData.targetValue} onChange={e => setFormData({...formData, targetValue: parseFloat(e.target.value)})} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valor Atual (R$)</label>
                  <input type="number" min="0" step="0.01" value={formData.currentValue} onChange={e => setFormData({...formData, currentValue: parseFloat(e.target.value)})} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Prazo</label>
                <input type="date" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} className={inputClass} />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;
