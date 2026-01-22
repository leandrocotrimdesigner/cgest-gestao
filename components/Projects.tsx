
import React, { useState } from 'react';
import { Project, Client, ProjectStatus, PaymentStatus } from '../types';
import { Plus, Trash2, Search, AlertCircle, X, DollarSign, CheckCircle, Clock, Loader2 } from 'lucide-react';

interface ProjectsProps {
  projects: Project[];
  clients: Client[];
  onAddProject: (project: Omit<Project, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateStatus: (id: string, status: ProjectStatus) => Promise<void>;
  onUpdatePaymentStatus: (id: string, status: PaymentStatus) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
}

const Projects: React.FC<ProjectsProps> = ({ 
    projects = [], 
    clients = [], 
    onAddProject, 
    onUpdateStatus, 
    onUpdatePaymentStatus, 
    onDeleteProject 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('all');
  const [filterPayment, setFilterPayment] = useState<PaymentStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Partial<Omit<Project, 'id' | 'createdAt'>>>({ status: 'pending', paymentStatus: 'pending', budget: 0 });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Meta-style Deletion State
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const displayedProjects = (projects || []).filter(p => {
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesPayment = filterPayment === 'all' || (p.paymentStatus || 'pending') === filterPayment;
    const clientName = (clients || []).find(c => c.id === p.clientId)?.name || '';
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          clientName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesPayment && matchesSearch && !deletedIds.has(p.id);
  });

  const getClientName = (id: string) => (clients || []).find(c => c.id === id)?.name || 'Cliente Removido';

  const handleDeleteRequest = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    e.preventDefault();
    setProjectToDelete(project);
  };

  const confirmDelete = async () => {
    if (projectToDelete) {
        setDeletedIds(prev => {
            const next = new Set(prev);
            next.add(projectToDelete.id);
            return next;
        });

        try {
            await onDeleteProject(projectToDelete.id);
        } catch (error) {
            setDeletedIds(prev => {
                const next = new Set(prev);
                next.delete(projectToDelete.id);
                return next;
            });
            alert("Erro ao excluir projeto.");
        } finally {
            setProjectToDelete(null);
        }
    }
  };

  const togglePaymentStatus = async (project: Project) => {
     const newStatus = project.paymentStatus === 'paid' ? 'pending' : 'paid';
     await onUpdatePaymentStatus(project.id, newStatus);
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const statusLabels = {
    pending: 'Pendente',
    in_progress: 'Em Andamento',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.clientId) return;
    
    setIsSubmitting(true);
    try {
        await onAddProject({
            ...formData, 
            paymentStatus: formData.paymentStatus || 'pending'
        } as any);
        setIsModalOpen(false);
        setFormData({ status: 'pending', paymentStatus: 'pending', budget: 0, name: '', clientId: '' });
    } catch (error) {
        console.error("Erro ao criar projeto:", error);
        alert("Erro ao criar projeto");
    } finally {
        setIsSubmitting(false);
    }
  };

  const inputClass = "w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Projetos</h2>
          <p className="text-slate-500">Acompanhe o progresso e orçamento</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all active:scale-95">
          <Plus size={20} /> Novo Projeto
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {/* Search */}
        <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Buscar projeto ou cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 shadow-sm"/>
        </div>
        
        {/* Filters Wrapper */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            {/* Project Status Filter */}
            <div className="flex gap-2 pb-2 overflow-x-auto w-full md:w-auto no-scrollbar">
                {(['all', 'pending', 'in_progress', 'completed', 'cancelled'] as const).map(status => (
                <button key={status} onClick={() => setFilterStatus(status)} className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${filterStatus === status ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-600 border-slate-200'}`}>
                    {status === 'all' ? 'Todos' : statusLabels[status]}
                </button>
                ))}
            </div>
            
             {/* Payment Status Filter */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                {(['all', 'paid', 'pending'] as const).map(status => (
                    <button 
                        key={status} 
                        onClick={() => setFilterPayment(status)} 
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterPayment === status ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {status === 'all' ? 'Financeiro: Todos' : (status === 'paid' ? 'Pagos' : 'Pendentes')}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {displayedProjects.map(project => {
          const isPaid = project.paymentStatus === 'paid';
          return (
          <div key={project.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between h-full hover:shadow-lg transition-shadow relative group">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[project.status]}`}>{statusLabels[project.status]}</span>
                
                <button 
                  type="button"
                  onClick={(e) => handleDeleteRequest(e, project)}
                  className="text-slate-300 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <h3 className="font-semibold text-slate-800 text-lg mb-1">{project.name}</h3>
              <p className="text-sm text-slate-500 mb-4 flex items-center gap-1"><span className="font-medium text-slate-600">{getClientName(project.clientId)}</span></p>
            </div>
            
            <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                        <p className="text-xs text-slate-400">Orçamento</p>
                        <p className="font-mono font-medium text-slate-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(project.budget)}</p>
                    </div>
                    
                    <button 
                        onClick={() => togglePaymentStatus(project)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border transition-colors ${isPaid ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200'}`}
                        title={isPaid ? "Marcar como Pendente" : "Marcar como Pago"}
                    >
                        {isPaid ? <CheckCircle size={14} /> : <Clock size={14} />}
                        {isPaid ? 'PAGO' : 'PENDENTE'}
                    </button>
                </div>

                <div className="border-t border-slate-100 pt-3">
                   <select value={project.status} onChange={(e) => onUpdateStatus(project.id, e.target.value as ProjectStatus)} className="w-full text-xs border-slate-200 border rounded py-1.5 px-2 bg-white text-slate-600 outline-none cursor-pointer hover:border-blue-400 transition-colors"><option value="pending">Pendente</option><option value="in_progress">Em Andamento</option><option value="completed">Concluído</option><option value="cancelled">Cancelado</option></select>
                </div>
            </div>
          </div>
        );})}
        {displayedProjects.length === 0 && (<div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">Nenhum projeto encontrado.</div>)}
      </div>

      {/* DELETE MODAL */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={() => setProjectToDelete(null)}>
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fadeIn overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-6 bg-red-50 border-b border-red-100 flex items-start gap-4">
                <div className="p-2 bg-red-100 rounded-full text-red-600"><AlertCircle size={24} /></div>
                <div><h3 className="text-lg font-bold text-red-900">Excluir Projeto</h3><p className="text-sm text-red-700 mt-1">Projeto: <b>{projectToDelete.name}</b></p></div>
                <button onClick={() => setProjectToDelete(null)} className="ml-auto text-red-400 hover:text-red-700"><X size={20} /></button>
              </div>
              <div className="p-6">
                <p className="text-slate-600 text-sm mb-4">Tem certeza que deseja continuar? O projeto será removido permanentemente.</p>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setProjectToDelete(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                  <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-md">Excluir</button>
                </div>
              </div>
           </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100"><h3 className="text-xl font-bold text-slate-800">Novo Projeto</h3></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Nome</label><input required type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} /></div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                <select required value={formData.clientId || ''} onChange={e => setFormData({...formData, clientId: e.target.value})} className={inputClass}>
                  <option value="">Selecione...</option>
                  {(clients || []).map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div><label className="block text-sm font-medium text-slate-700 mb-1">Status</label><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ProjectStatus})} className={inputClass}><option value="pending">Pendente</option><option value="in_progress">Em Andamento</option></select></div>
                 <div><label className="block text-sm font-medium text-slate-700 mb-1">Pagamento</label><select value={formData.paymentStatus} onChange={e => setFormData({...formData, paymentStatus: e.target.value as PaymentStatus})} className={inputClass}><option value="pending">Pendente</option><option value="paid">Pago</option></select></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Orçamento</label><input type="number" value={formData.budget || ''} onChange={e => setFormData({...formData, budget: parseFloat(e.target.value)})} className={inputClass} /></div>
              <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button><button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 font-bold rounded-lg flex items-center gap-2">{isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Criar'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
