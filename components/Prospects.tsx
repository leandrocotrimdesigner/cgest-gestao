
import React, { useState } from 'react';
import { Prospect, ProspectStatus } from '../types';
import { Plus, Trash2, Edit2, Camera, X, Loader2, Instagram, Image as ImageIcon } from 'lucide-react';
import { useToast } from './ToastContext';
import { BaseModal } from './BaseModal';
import { googleDriveService } from '../services/googleDriveService';

interface ProspectsProps {
  prospects: Prospect[];
  onAddProspect: (p: Omit<Prospect, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateProspect: (p: Prospect) => Promise<void>;
  onDeleteProspect: (id: string) => Promise<void>;
}

const Prospects: React.FC<ProspectsProps> = ({ prospects, onAddProspect, onUpdateProspect, onDeleteProspect }) => {
  const { addToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [prospectToDelete, setProspectToDelete] = useState<Prospect | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProspectStatus | 'all'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState<Partial<Prospect>>({
    title: '',
    socialHandle: '',
    description: '',
    status: 'pending',
    imageUrl: '',
  });

  const filteredProspects = prospects.filter(p => statusFilter === 'all' || p.status === statusFilter);

  const handleOpenAdd = () => {
    setEditingProspect(null);
    setFormData({
        title: '',
        socialHandle: '',
        description: '',
        status: 'pending',
        imageUrl: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Prospect) => {
    setEditingProspect(p);
    setFormData({ ...p });
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
        await googleDriveService.initClient();
        const webViewLink = await googleDriveService.uploadFile(file);
        setFormData(prev => ({ ...prev, imageUrl: webViewLink }));
        addToast({ type: 'success', title: 'Imagem anexada' });
    } catch (error: any) {
        addToast({ type: 'error', title: 'Erro no Upload', message: error.message });
    } finally {
        setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;
    setIsSubmitting(true);
    try {
        if (editingProspect) {
            await onUpdateProspect({ ...editingProspect, ...formData } as Prospect);
            addToast({ type: 'success', title: 'Prospecção atualizada' });
        } else {
            await onAddProspect(formData as any);
            addToast({ type: 'success', title: 'Nova prospecção criada' });
        }
        setIsModalOpen(false);
    } catch (err) {
        addToast({ type: 'error', title: 'Erro ao salvar' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (p: Prospect) => {
    setProspectToDelete(p);
  };

  const confirmDelete = async () => {
    if (prospectToDelete) {
        await onDeleteProspect(prospectToDelete.id);
        addToast({ type: 'info', title: 'Removido com sucesso' });
        setProspectToDelete(null);
    }
  };

  const statusLabels: Record<ProspectStatus, string> = {
    pending: 'Pendente',
    negative: 'Negativa',
    closed: 'Fechado',
    waiting: 'Em Espera'
  };

  // Cores de Etiquetas de Status (Badge)
  const statusColors: Record<ProspectStatus, string> = {
    pending: 'text-amber-700 bg-amber-50 border-amber-200',  // Alerta
    negative: 'text-slate-500 bg-slate-50 border-slate-200',  // Negativa/Cinza
    closed: 'text-emerald-700 bg-emerald-50 border-emerald-200', // Sucesso
    waiting: 'text-blue-700 bg-blue-50 border-blue-200'       // Neutro/Azul
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1e293b]">Prospecção</h2>
          <p className="text-slate-500">Gestão de novos leads e oportunidades</p>
        </div>
        <button onClick={handleOpenAdd} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all active:scale-95">
          <Plus size={20} /> Novo Lead
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
        {(['all', 'pending', 'closed', 'negative', 'waiting'] as const).map(status => (
            <button 
                key={status} 
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                    statusFilter === status 
                    ? 'bg-slate-800 text-white border-slate-800 shadow-sm' 
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
            >
                {status === 'all' ? 'Todos' : statusLabels[status]}
            </button>
        ))}
      </div>

      {/* Grid de Cards Padronizados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProspects.map(p => (
            <div 
                key={p.id} 
                className="flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-all h-full"
            >
                {/* Imagem no Topo - 160px fixo, object-fit cover */}
                <div className="w-full h-40 bg-slate-50 relative border-b border-slate-100 shrink-0">
                    {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon size={32} className="text-slate-200" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
                </div>

                <div className="p-5 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-3">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${statusColors[p.status]}`}>
                            {statusLabels[p.status]}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenEdit(p)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit2 size={16}/></button>
                            <button onClick={() => handleDeleteClick(p)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16}/></button>
                        </div>
                    </div>

                    <h3 className="text-lg font-bold text-[#1e293b] mb-1 leading-tight">{p.title}</h3>
                    
                    {p.socialHandle && (
                        <div className="flex items-center gap-1.5 text-xs text-[#64748b] font-medium mb-3">
                            <Instagram size={14} className="text-blue-500" /> {p.socialHandle.startsWith('@') ? p.socialHandle : `@${p.socialHandle}`}
                        </div>
                    )}
                    
                    <p className="text-sm text-slate-500 leading-relaxed flex-grow line-clamp-3 whitespace-pre-wrap">{p.description}</p>
                    
                    <div className="mt-4 pt-4 border-t border-slate-50 text-[10px] text-slate-400 font-medium flex justify-between">
                        <span>Lead Criado</span>
                        <span>{new Date(p.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                </div>
            </div>
        ))}
        {filteredProspects.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                <div className="flex flex-col items-center gap-2">
                    <Plus size={32} className="opacity-20" />
                    <p>Nenhuma prospecção encontrada nesta categoria.</p>
                </div>
            </div>
        )}
      </div>

      {/* Modal de Exclusão */}
      <BaseModal isOpen={!!prospectToDelete} onClose={() => setProspectToDelete(null)} title="Excluir Prospecção">
          <div className="space-y-4">
              <p className="text-slate-600">Deseja excluir esta prospecção?</p>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button onClick={() => setProspectToDelete(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancelar</button>
                  <button onClick={confirmDelete} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all">Confirmar</button>
              </div>
          </div>
      </BaseModal>

      {/* Modal de Criação/Edição */}
      <BaseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProspect ? 'Editar Lead' : 'Novo Lead'}>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Cliente</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white text-slate-900" placeholder="Ex: Nome da Empresa ou Pessoa" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">@ Instagram</label>
                    <input type="text" value={formData.socialHandle} onChange={e => setFormData({...formData, socialHandle: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900" placeholder="@perfil" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ProspectStatus})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900">
                        <option value="pending">Pendente</option>
                        <option value="closed">Fechado</option>
                        <option value="negative">Negativa</option>
                        <option value="waiting">Em Espera</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observações do Lead</label>
                <textarea rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white text-slate-900" placeholder="Histórico da conversa, o que foi oferecido..." />
            </div>

            <div className="pt-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Logo ou Foto de Referência</label>
                <div className="flex items-center gap-4">
                    <label className="cursor-pointer flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl text-sm font-medium transition-all group">
                        {isUploading ? <Loader2 className="animate-spin text-blue-600" size={20} /> : <Camera className="text-slate-400 group-hover:text-blue-500" size={20} />}
                        <span className="text-slate-600 group-hover:text-blue-700">{isUploading ? 'Enviando...' : 'Fazer Upload'}</span>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                    {formData.imageUrl && (
                        <div className="relative w-20 h-20 rounded-xl border border-slate-200 overflow-hidden shadow-sm shrink-0">
                            <img src={formData.imageUrl} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => setFormData({...formData, imageUrl: ''})} className="absolute top-1 right-1 bg-red-500 text-white rounded-md p-1 hover:bg-red-600 transition-colors shadow-md"><X size={12} /></button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancelar</button>
                <button type="submit" disabled={isSubmitting || isUploading} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50">
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Salvar Alterações'}
                </button>
            </div>
        </form>
      </BaseModal>
    </div>
  );
};

export default Prospects;
