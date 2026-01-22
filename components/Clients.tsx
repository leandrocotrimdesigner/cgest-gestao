
import React, { useState } from 'react';
import { Client, Payment } from '../types';
import { Plus, Trash2, Search, DollarSign, CheckCircle, AlertCircle, Edit2, Loader2, FolderOpen, ExternalLink, Cloud } from 'lucide-react';
import { googleDriveService } from '../services/googleDriveService';
import { useToast } from './ToastContext';
import { BaseModal } from './BaseModal';

interface ClientsProps {
  clients: Client[];
  payments?: Payment[];
  onAddClient: (client: Omit<Client, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateClient?: (client: Client) => Promise<void>;
  onDeleteClient: (id: string) => Promise<void>;
  onAddPayment?: (payment: Omit<Payment, 'id'>) => Promise<void>;
  onUpdatePayment?: (payment: Payment) => Promise<void>;
}

const Clients: React.FC<ClientsProps> = ({ 
    clients = [], 
    payments = [], 
    onAddClient, 
    onUpdateClient, 
    onDeleteClient, 
    onAddPayment, 
    onUpdatePayment 
}) => {
  const { addToast } = useToast();
  
  // Modals State
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
  
  // Selection State
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  // Filters & UI
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); 
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  
  // Forms State
  const [clientFormData, setClientFormData] = useState<Partial<Client>>({ type: 'avulso', status: 'active', driveFolderUrl: '' });
  const [paymentFormData, setPaymentFormData] = useState({ value: 0, description: '', month: '', receiptUrl: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Helpers ---
  const displayedClients = (clients || []).filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus && !deletedIds.has(c.id);
  });

  const getClientFinancialStatus = (client: Client) => {
      if (client.status === 'inactive') return 'inactive';
      
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const safePayments = payments || [];

      const hasOverdue = safePayments.some(p => p.clientId === client.id && p.status === 'pending' && p.dueDate < todayStr);
      return hasOverdue ? 'overdue' : 'ok';
  };

  const getPaymentForMonth = (monthIndex: number) => {
      if (!selectedClient) return null;
      return (payments || []).find(p => {
          const d = new Date(p.dueDate);
          return p.clientId === selectedClient.id && d.getMonth() === monthIndex && d.getFullYear() === selectedYear;
      });
  };

  // --- Handlers: Client CRUD ---
  
  const handleOpenAddClient = () => {
    setEditingClient(null);
    setClientFormData({ type: 'avulso', status: 'active', name: '', driveFolderUrl: '' });
    setIsClientModalOpen(true);
  };

  const handleOpenEditClient = (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    setEditingClient(client);
    setClientFormData({
        name: client.name,
        type: client.type,
        status: client.status,
        driveFolderUrl: client.driveFolderUrl || ''
    });
    setIsClientModalOpen(true);
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientFormData.name) return;
    
    setIsSubmitting(true);

    const payload = {
      name: clientFormData.name,
      type: clientFormData.type as 'mensalista' | 'avulso',
      status: clientFormData.status as 'active' | 'inactive',
      driveFolderUrl: clientFormData.driveFolderUrl
    };

    try {
        if (editingClient && onUpdateClient) {
            await onUpdateClient({ ...editingClient, ...payload });
            addToast({ type: 'success', title: 'Cliente atualizado' });
        } else {
            await onAddClient(payload);
            addToast({ type: 'success', title: 'Cliente adicionado' });
        }
        setIsClientModalOpen(false); 
    } catch (e: any) {
        console.error("Erro no submit do cliente:", e);
        addToast({ type: 'error', title: 'Erro ao salvar', message: 'Tente novamente.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteClientRequest = (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    setClientToDelete(client);
  };

  const confirmDeleteClient = async () => {
    if (clientToDelete) {
        setDeletedIds(prev => new Set(prev).add(clientToDelete.id)); 
        try {
            await onDeleteClient(clientToDelete.id);
            addToast({ type: 'success', title: 'Cliente removido' });
        } catch (error) {
            setDeletedIds(prev => {
                const next = new Set(prev);
                next.delete(clientToDelete.id);
                return next;
            });
            addToast({ type: 'error', title: 'Erro ao excluir' });
        } finally {
            setClientToDelete(null);
        }
    }
  };

  // --- Handlers: Financial ---
  const handleOpenFinancial = (e: React.MouseEvent, client: Client) => {
      e.stopPropagation();
      setSelectedClient(client);
      const currentMonth = new Date().getMonth();
      setPaymentFormData({ 
          value: client.monthlyValue || 0, 
          description: '', 
          month: String(currentMonth),
          receiptUrl: ''
      });
      setIsUploading(false);
      setIsFinancialModalOpen(true);
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
       await googleDriveService.initClient();
       const webViewLink = await googleDriveService.uploadFile(file);
       setPaymentFormData(prev => ({ ...prev, receiptUrl: webViewLink }));
       addToast({ type: 'success', title: 'Upload Concluído' });
    } catch (error: any) {
       addToast({ type: 'error', title: 'Falha no Upload', message: error.message });
    } finally {
       setIsUploading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!selectedClient || !onAddPayment || !onUpdatePayment) return;

      const monthIndex = parseInt(paymentFormData.month);
      const existingPayment = getPaymentForMonth(monthIndex);

      try {
        if (existingPayment) {
            await onUpdatePayment({
                ...existingPayment,
                value: Number(paymentFormData.value),
                description: paymentFormData.description,
                receiptUrl: paymentFormData.receiptUrl,
                status: 'paid',
                paidAt: existingPayment.paidAt || new Date().toISOString().split('T')[0]
            });
            addToast({ type: 'success', title: 'Atualizado' });
        } else {
            const day = '10'; 
            const dateStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-${day}`;
            await onAddPayment({
                clientId: selectedClient.id,
                value: Number(paymentFormData.value),
                description: paymentFormData.description || `Pagamento ${months[monthIndex]}/${selectedYear}`,
                dueDate: dateStr,
                status: 'paid',
                paidAt: dateStr,
                receiptUrl: paymentFormData.receiptUrl
            });
            addToast({ type: 'success', title: 'Pagamento Criado' });
        }
      } catch (e) {
          addToast({ type: 'error', title: 'Erro ao salvar pagamento' });
      }
  };

  const handleTogglePaymentStatus = async (monthIndex: number) => {
      if (!selectedClient || !onAddPayment || !onUpdatePayment) return;
      const existingPayment = getPaymentForMonth(monthIndex);
      if (existingPayment) {
          const newStatus = existingPayment.status === 'paid' ? 'pending' : 'paid';
          await onUpdatePayment({ ...existingPayment, status: newStatus });
      } else {
           // Create stub
           const dateStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-10`;
           await onAddPayment({
              clientId: selectedClient.id,
              value: selectedClient.monthlyValue || 0,
              description: `Mensalidade ${months[monthIndex]}`,
              dueDate: dateStr,
              status: 'paid',
              paidAt: dateStr
           });
      }
  };

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const inputClass = "w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
          <p className="text-slate-500">Gerencie sua base e controle financeiro</p>
        </div>
        <button onClick={handleOpenAddClient} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-md">
          <Plus size={20} /> Novo Cliente
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input type="text" placeholder="Buscar clientes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 text-slate-900 rounded-lg outline-none shadow-sm"/>
          </div>
          <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
             {(['all', 'active', 'inactive'] as const).map(status => (
                 <button key={status} onClick={() => setStatusFilter(status)} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${statusFilter === status ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    {status === 'all' ? 'Todos' : status === 'active' ? 'Ativos' : 'Inativos'}
                 </button>
             ))}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-600 text-sm">
              <tr>
                <th className="px-6 py-3 font-semibold">Nome</th>
                <th className="px-6 py-3 font-semibold">Tipo</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Drive (2TB)</th>
                <th className="px-6 py-3 font-semibold">Situação</th>
                <th className="px-6 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedClients.map(client => {
                  const finStatus = getClientFinancialStatus(client);
                  return (
                    <tr key={client.id} className="hover:bg-slate-50 group">
                        <td className="px-6 py-4 font-medium text-slate-900">{client.name}</td>
                        <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${client.type === 'mensalista' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'}`}>{client.type}</span></td>
                        <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{client.status === 'active' ? 'Ativo' : 'Inativo'}</span></td>
                        <td className="px-6 py-4">
                            {client.driveFolderUrl ? (
                                <a href={client.driveFolderUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline hover:text-blue-700 flex items-center gap-1.5 font-medium text-sm transition-colors">
                                    <Cloud size={16} className="shrink-0 text-blue-500" /> Acessar Arquivos <ExternalLink size={12} />
                                </a>
                            ) : <span className="text-slate-400 text-xs italic">Sem pasta</span>}
                        </td>
                        <td className="px-6 py-4">{client.status === 'active' ? (<div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${finStatus === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{finStatus === 'overdue' ? <AlertCircle size={14}/> : <CheckCircle size={14}/>}{finStatus === 'overdue' ? 'EM ATRASO' : 'EM DIA'}</div>) : '-'}</td>
                        <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-2"><button onClick={(e) => handleOpenFinancial(e, client)} className="text-blue-600 bg-blue-50 p-1.5 rounded-md"><DollarSign size={18} /></button><button onClick={(e) => handleOpenEditClient(e, client)} className="text-slate-500 hover:text-blue-600 p-1.5"><Edit2 size={18} /></button><button onClick={(e) => handleDeleteClientRequest(e, client)} className="text-slate-400 hover:text-red-600 p-1.5"><Trash2 size={18} /></button></div></td>
                    </tr>
                );
              })}
              {displayedClients.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Nenhum cliente encontrado</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <BaseModal isOpen={!!clientToDelete} onClose={() => setClientToDelete(null)} title="Excluir Cliente" variant="danger">
        <div className="space-y-4">
            <p className="text-slate-600">Confirma exclusão de <b>{clientToDelete?.name}</b>?</p>
            <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setClientToDelete(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button onClick={confirmDeleteClient} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">Confirmar Exclusão</button>
            </div>
        </div>
      </BaseModal>

      <BaseModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}>
        <form onSubmit={handleClientSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Nome</label><input required type="text" value={clientFormData.name || ''} onChange={e => setClientFormData({...clientFormData, name: e.target.value})} className={inputClass} placeholder="Nome do Cliente ou Empresa" /></div>
            
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label><select value={clientFormData.type} onChange={(e) => setClientFormData({...clientFormData, type: e.target.value as any})} className={inputClass}><option value="avulso">Avulso</option><option value="mensalista">Mensalista</option></select></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Status</label><select value={clientFormData.status} onChange={(e) => setClientFormData({...clientFormData, status: e.target.value as any})} className={inputClass}><option value="active">Ativo</option><option value="inactive">Inativo</option></select></div>
            </div>

            <div className="pt-2 border-t border-slate-100">
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                    <FolderOpen size={16} className="text-blue-500"/> Link da Pasta (Google Drive)
                </label>
                <input 
                    type="url" 
                    placeholder="https://drive.google.com/drive/u/0/folders/..." 
                    value={clientFormData.driveFolderUrl || ''} 
                    onChange={e => setClientFormData({...clientFormData, driveFolderUrl: e.target.value})} 
                    className={inputClass} 
                />
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Cloud size={10} /> Link para armazenamento de arquivos pesados (2TB)</p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsClientModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all active:scale-95"
                >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : (editingClient ? 'Salvar Alterações' : 'Criar Cliente')}
                </button>
            </div>
        </form>
      </BaseModal>

      <BaseModal isOpen={isFinancialModalOpen} onClose={() => setIsFinancialModalOpen(false)} title="Financeiro" maxWidth="max-w-3xl">
         <div className="space-y-6">
            <form onSubmit={handlePaymentSubmit} className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Descrição" value={paymentFormData.description} onChange={e => setPaymentFormData({...paymentFormData, description: e.target.value})} className={inputClass} />
                    <input type="number" placeholder="Valor" value={paymentFormData.value} onChange={e => setPaymentFormData({...paymentFormData, value: parseFloat(e.target.value)})} className={inputClass} />
                </div>
                <div className="flex justify-end mt-4"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg">Registrar</button></div>
            </form>
            <div className="grid grid-cols-3 gap-2">
                 {months.map((m, i) => {
                     const p = getPaymentForMonth(i);
                     return <div key={m} onClick={() => handleTogglePaymentStatus(i)} className={`p-2 border text-center cursor-pointer ${p?.status === 'paid' ? 'bg-green-100 border-green-300' : 'bg-white'}`}>{m}</div>
                 })}
            </div>
         </div>
      </BaseModal>
    </div>
  );
};

export default Clients;
