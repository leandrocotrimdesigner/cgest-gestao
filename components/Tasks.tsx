
import React, { useState, useEffect } from 'react';
import { Task, Project } from '../types';
import { Plus, Trash2, Check, AlertCircle, Calendar, Clock, Briefcase, X, Video, Undo2 } from 'lucide-react';
import { DateSelector } from './DateSelector';
import { googleCalendarService } from '../services/googleCalendarService';

interface TasksProps {
  tasks: Task[];
  projects: Project[];
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  onToggleTask: (id: string, isCompleted: boolean) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}

const Tasks: React.FC<TasksProps> = ({ tasks, projects, onAddTask, onToggleTask, onDeleteTask }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  
  // Meeting State
  const [isMeeting, setIsMeeting] = useState(false);
  const [meetingTime, setMeetingTime] = useState('');
  
  // Undo / Deletion State
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [undoTask, setUndoTask] = useState<Task | null>(null);
  const [undoTimer, setUndoTimer] = useState<number | null>(null);

  // Limpeza automática de IDs já excluídos do backend
  useEffect(() => {
     if (deletedIds.size > 0) {
         const currentIds = new Set(tasks.map(t => t.id));
         setDeletedIds(prev => {
             const next = new Set(prev);
             let changed = false;
             prev.forEach(id => {
                 if (!currentIds.has(id)) {
                     next.delete(id);
                     changed = true;
                 }
             });
             return changed ? next : prev;
         });
     }
  }, [tasks]);

  // Optimistic UI
  const displayedTasks = tasks.filter(t => !deletedIds.has(t.id));

  const getProjectName = (id?: string) => {
    if (!id) return null;
    return projects.find(p => p.id === id)?.name;
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    // 1. Criar a Tarefa no Sistema
    await onAddTask({
      title: newTaskTitle,
      isCompleted: false,
      projectId: selectedProjectId || undefined,
      dueDate: dueDate || undefined,
      isMeeting: isMeeting,
      meetingTime: isMeeting ? meetingTime : undefined
    });

    // 2. Integração com Google Agenda (TENTATIVA)
    if (isMeeting && dueDate && meetingTime) {
      if (googleCalendarService.isAuthenticated()) {
        try {
           const startDateStr = `${dueDate}T${meetingTime}:00`;
           const start = new Date(startDateStr);
           // Define duração padrão de 1 hora
           const end = new Date(start.getTime() + 60 * 60 * 1000);

           const projectName = getProjectName(selectedProjectId);
           const description = projectName ? `Projeto: ${projectName}` : 'Tarefa criada via CGest';

           await googleCalendarService.createEvent({
             summary: newTaskTitle,
             description: description,
             start: start.toISOString(),
             end: end.toISOString()
           });
           
           alert("Reunião agendada no Google Calendar com sucesso!");
        } catch (error) {
           console.error("Erro ao sincronizar com Google:", error);
           alert("A tarefa foi criada, mas houve um erro ao sincronizar com a Agenda Google. Verifique o console.");
        }
      } else {
        alert("Tarefa criada! Para sincronizar com a agenda, conecte sua conta Google na aba 'Agenda'.");
      }
    }
    
    // Reset form
    setNewTaskTitle('');
    setSelectedProjectId('');
    setDueDate('');
    setIsMeeting(false);
    setMeetingTime('');
  };

  const handleDelete = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    e.preventDefault();

    // Se já existe uma tarefa pendente de exclusão, confirma ela imediatamente
    if (undoTask && undoTimer) {
        clearTimeout(undoTimer);
        onDeleteTask(undoTask.id);
    }

    // 1. Oculta visualmente (Otimista)
    setDeletedIds(prev => {
        const next = new Set(prev);
        next.add(task.id);
        return next;
    });

    // 2. Prepara estado de Desfazer
    setUndoTask(task);
    
    // 3. Inicia timer de 5s para confirmar exclusão real
    const timer = window.setTimeout(() => {
        onDeleteTask(task.id);
        setUndoTask(null);
        setUndoTimer(null);
    }, 5000);

    setUndoTimer(timer);
  };

  const handleUndo = () => {
      if (undoTimer) {
          clearTimeout(undoTimer);
          setUndoTimer(null);
      }
      
      if (undoTask) {
          setDeletedIds(prev => {
              const next = new Set(prev);
              next.delete(undoTask.id);
              return next;
          });
          setUndoTask(null);
      }
  };

  const getTaskGroup = (task: Task) => {
    if (task.isCompleted) return 'Concluídas';
    if (!task.dueDate) return 'Sem Prazo';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(task.dueDate + 'T00:00:00'); 
    const diffTime = taskDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Atrasadas';
    if (diffDays === 0) return 'Hoje';
    if (diffDays <= 7) return 'Esta Semana';
    return 'Futuras';
  };

  const groupOrder = ['Atrasadas', 'Hoje', 'Esta Semana', 'Futuras', 'Sem Prazo', 'Concluídas'];
  const groupedTasks = groupOrder.reduce((acc, group) => {
    acc[group] = displayedTasks.filter(t => getTaskGroup(t) === group);
    return acc;
  }, {} as Record<string, Task[]>);

  const getGroupColor = (group: string) => {
    switch(group) {
      case 'Atrasadas': return 'text-red-600 bg-red-50';
      case 'Hoje': return 'text-blue-600 bg-blue-50';
      case 'Esta Semana': return 'text-purple-600 bg-purple-50';
      case 'Futuras': return 'text-slate-600 bg-slate-100';
      case 'Concluídas': return 'text-green-600 bg-green-50';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const inputClass = "w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#FF00FF] outline-none";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div><h2 className="text-2xl font-bold text-slate-800">Tarefas</h2><p className="text-slate-500">Organize seu dia</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 sticky top-4">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Plus size={18} className="text-[#FF00FF]" />Nova Tarefa</h3>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div><label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Descrição</label><textarea required rows={3} value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none resize-none focus:ring-2 focus:ring-[#FF00FF]" placeholder="Fazer..." /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Prazo</label><DateSelector value={dueDate} onChange={setDueDate} /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Projeto</label><select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className={inputClass}><option value="">Nenhum</option>{projects.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}</select></div>
              
              {/* Meeting Toggle */}
              <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700 flex items-center gap-2"><Video size={16} className={isMeeting ? "text-[#FF00FF]" : "text-slate-400"} /> Reunião</span>
                      <button 
                        type="button" 
                        onClick={() => setIsMeeting(!isMeeting)} 
                        className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${isMeeting ? 'bg-[#FF00FF]' : 'bg-slate-200'}`}
                      >
                          <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${isMeeting ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                  </div>
                  
                  {isMeeting && (
                    <div className="animate-fadeIn">
                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Horário da Reunião</label>
                        <input 
                            type="time" 
                            required={isMeeting}
                            value={meetingTime} 
                            onChange={e => setMeetingTime(e.target.value)} 
                            className={inputClass} 
                        />
                    </div>
                  )}
              </div>

              <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-[#FF00FF] to-[#FCD282] hover:opacity-90 text-black font-bold rounded-lg shadow-md transition-all active:scale-95">Adicionar</button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6 relative">
          
          {/* UNDO TOAST NOTIFICATION - Repositioned inside the column */}
          {undoTask && (
            <div className="absolute top-0 right-0 z-20 animate-fadeInLeft w-full max-w-sm">
                <div className="bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-500/20 p-1 rounded-full"><Check size={14} className="text-green-400" /></div>
                        <span className="text-sm font-medium">Tarefa excluída</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleUndo}
                            className="flex items-center gap-1.5 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors bg-slate-700/50 px-2 py-1 rounded"
                        >
                            <Undo2 size={14} />
                            Desfazer
                        </button>
                        <button 
                            onClick={() => {
                            if (undoTimer) clearTimeout(undoTimer);
                            if (undoTask) onDeleteTask(undoTask.id);
                            setUndoTask(null);
                            }}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
                {/* Progress bar for time indication */}
                <div className="h-1 bg-slate-700 rounded-b-lg overflow-hidden mt-[-4px] mx-1">
                    <div className="h-full bg-blue-500 animate-progressBar" style={{animationDuration: '5s'}}></div>
                </div>
            </div>
          )}

          {groupOrder.map(group => {
            const groupTasks = groupedTasks[group];
            if (!groupTasks || groupTasks.length === 0) return null;
            return (
              <div key={group} className="space-y-3">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm font-bold ${getGroupColor(group)}`}>
                  {group === 'Atrasadas' && <AlertCircle size={14} />}{group === 'Hoje' && <Calendar size={14} />}{group === 'Futuras' && <Clock size={14} />}
                  <span>{group}</span><span className="opacity-60 text-xs ml-1">({groupTasks.length})</span>
                </div>
                <div className="space-y-2">
                    {groupTasks.map(task => {
                        const projectName = getProjectName(task.projectId);
                        const isMeetingTask = task.isMeeting;
                        
                        return (
                        <div key={task.id} className={`bg-white p-4 rounded-xl border flex items-start gap-4 group hover:shadow-md transition-all ${task.isCompleted ? 'border-slate-100 opacity-60' : 'border-slate-200'} relative`}>
                            {/* Checkbox or Meeting Icon Area */}
                            <button onClick={() => onToggleTask(task.id, !task.isCompleted)} className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.isCompleted ? 'bg-green-500 border-green-500 text-white' : (isMeetingTask ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-300 hover:border-[#FF00FF]')}`}>
                                {task.isCompleted ? <Check size={14} strokeWidth={3} /> : (isMeetingTask ? <Video size={12} /> : null)}
                            </button>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className={`text-slate-800 font-medium break-words ${task.isCompleted ? 'line-through text-slate-400' : ''}`}>{task.title}</p>
                                        {isMeetingTask && !task.isCompleted && task.meetingTime && (
                                            <div className="inline-flex items-center gap-1 mt-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                <Clock size={10} />
                                                Reunião às {task.meetingTime}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <button 
                                        type="button"
                                        onClick={(e) => handleDelete(e, task)}
                                        className="text-slate-300 hover:text-red-600 p-1.5 rounded-md transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                    {task.dueDate && <span className={`text-xs flex items-center gap-1 ${getTaskGroup(task) === 'Atrasadas' ? 'text-red-600 font-medium' : 'text-slate-500'}`}><Calendar size={12} />{new Date(task.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                                    {projectName && <span className="text-xs flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-medium"><Briefcase size={12} />{projectName}</span>}
                                </div>
                            </div>
                        </div>
                        );
                    })}
                </div>
              </div>
            );
          })}
          {displayedTasks.length === 0 && (<div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">Nenhuma tarefa pendente.</div>)}
        </div>
      </div>
      
      <style>{`
        @keyframes fadeInLeft {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes progressBar {
            from { width: 100%; }
            to { width: 0%; }
        }
        .animate-fadeInLeft { animation: fadeInLeft 0.3s ease-out; }
        .animate-progressBar { animation: progressBar 5s linear forwards; }
      `}</style>
    </div>
  );
};

export default Tasks;
