
import React, { useState } from 'react';
import { Client, Payment } from '../types';
import { Plus, Trash2, Search, DollarSign, CheckCircle, AlertCircle, Edit2, UploadCloud, Loader2 } from 'lucide-react';
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
  
  // Deletion States
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  // Filters & UI
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); 
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  
  // Forms State
  const [clientFormData, setClientFormData] = useState<Partial<Client>>({ type: 'avulso', status: 'active', monthlyValue: 0, dueDay: 5, whatsapp: '55' });
  const [paymentFormData, setPaymentFormData] = useState({ value: 0, description: '', month: '', receiptUrl: '' });
  const [isUploading, setIsUploading] = useState(false);

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
      
      let mensalistaOverdue = false;
      if (client.type === 'mensalista' && client.dueDay) {
          if (today.getDate() > client.dueDay) {
               const hasPaymentForThisMonth = safePayments.some(p => {
                   const pDate = new Date(p.dueDate);
                   return p.clientId === client.id && 
                          pDate.getMonth() === today.getMonth() && 
                          pDate.getFullYear() === today.getFullYear() &&
                          p.status === 'paid';
               });
               if (!hasPaymentForThisMonth) mensalistaOverdue = true;
          }
      }
      if(hasOverdue || mensalistaOverdue) return 'overdue';
      return 'ok';
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
    setClientFormData({ type: 'avulso', status: 'active', monthlyValue: 0, name: '', dueDay: 5, whatsapp: '55' });
    setIsClientModalOpen(true);
  };

  const handleOpenEditClient = (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    setEditingClient(client);
    setClientFormData({
        name: client.name,
        type: client.type,
        status: client.status,
        monthlyValue: client.monthlyValue || 0,
        dueDay: client.dueDay || 5,
        whatsapp: client.whatsapp || '55'
    });
    setIsClientModalOpen(true);
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Remove tudo que não for número
      let val = e.target.value.replace(/\D/g, '');
      
      // Garante que comece com 55 se o usuário tentar apagar
      if (val === '' || val === '5') {
          val = '55';
      } else if (!val.startsWith('55')) {
          val = '55' + val;
      }
      
      setClientFormData({...clientFormData, whatsapp: val});
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientFormData.name) return;

    const payload = {
      name: clientFormData.name,
      whatsapp: clientFormData.whatsapp,
      type: clientFormData.type as 'mensalista' | 'avulso',
      status: clientFormData.status as 'active' | 'inactive',
      monthlyValue: clientFormData.type === 'mensalista' ? Number(clientFormData.monthlyValue) : undefined,
      dueDay: clientFormData.type === 'mensalista' ? Number(clientFormData.dueDay) : undefined,
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
        addToast({ type: 'error', title: 'Erro ao salvar cliente', message: e.message || 'Verifique sua conexão.' });
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
            addToast({ type: 'error', title: 'Erro ao excluir cliente' });
        } finally {
            setClientToDelete(null);
        }
    }
  };

  // --- Handlers: Financial & Attachments ---

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
       addToast({ type: 'success', title: 'Upload Concluído', message: 'Comprovante vinculado.' });
    } catch (error: any) {
       console.error("Erro no upload", error);
       addToast({ type: 'error', title: 'Falha no Upload', message: error.message || "Verifique as permissões." });
    } finally {
       setIsUploading(false);
       e.target.value = '';
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!selectedClient || !onAddPayment || !onUpdatePayment) return;

      const monthIndex = parseInt(paymentFormData.month);
      const existingPayment = getPaymentForMonth(monthIndex);

      try {
        if (existingPayment) {
            // Upsert: Update existing
            await onUpdatePayment({
                ...existingPayment,
                value: Number(paymentFormData.value),
                description: paymentFormData.description || existingPayment.description,
                receiptUrl: paymentFormData.receiptUrl || existingPayment.receiptUrl,
                status: 'paid',
                paidAt: existingPayment.paidAt || new Date().toISOString().split('T')[0]
            });
            addToast({ type: 'success', title: 'Atualizado', message: 'Dados financeiros sobrepostos.' });
        } else {
            // Upsert: Insert new
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
        setPaymentFormData(prev => ({ ...prev, description: '', receiptUrl: '' }));
      } catch (e) {
          addToast({ type: 'error', title: 'Erro ao salvar pagamento' });
      }
  };

  const handleTogglePaymentStatus = async (monthIndex: number) => {
      if (!selectedClient || !onAddPayment || !onUpdatePayment) return;
      const existingPayment = getPaymentForMonth(monthIndex);
      
      if (existingPayment) {
          const newStatus = existingPayment.status === 'paid' ? 'pending' : 'paid';
          await onUpdatePayment({ 
              ...existingPayment, 
              status: newStatus, 
              paidAt: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined 
          });
      } else {
          // Create empty paid payment
          const dueDay = selectedClient.dueDay || 10; 
          const dateStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(dueDay).padStart(2,'0')}`;
          await onAddPayment({
              clientId: selectedClient.id,
              value: selectedClient.monthlyValue || 0,
              description: `Mensalidade ${months[monthIndex]}/${selectedYear}`,
              dueDate: dateStr,
              status: 'paid',
              paidAt: dateStr
          });
      }
  };

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const fullMonths = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const inputClass = "w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
          <p className="text-slate-500">Gerencie sua base e controle financeiro</p>
        </div>
        <button onClick={handleOpenAddClient} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all active:scale-95">
          <Plus size={20} /> Novo Cliente
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input type="text" placeholder="Buscar clientes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"/>
          </div>
          <div className="flex gap-2 bg-slate-100 p-1 rounded-lg overflow-x-auto">
             {(['all', 'active', 'inactive'] as const).map(status => (
                 <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${statusFilter === status ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                 >
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
                <th className="px-6 py-3 font-semibold">Situação</th>
                <th className="px-6 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedClients.map(client => {
                  const finStatus = getClientFinancialStatus(client);
                  return (
                    <tr key={client.id} className="hover:bg-slate-50 group">
                        <td className="px-6 py-4 relative">
                            <div className={`font-medium ${client.status === 'inactive' ? 'text-slate-400' : 'text-slate-900'}`}>{client.name}</div>
                            {client.type === 'mensalista' && (<div className="text-xs text-slate-500">Vence dia {client.dueDay}</div>)}
                        </td>
                        <td className="px-6 py-4 relative">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${client.type === 'mensalista' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'}`}>
                            {client.type === 'mensalista' ? 'Mensalista' : 'Avulso'}
                            </span>
                        </td>
                        <td className="px-6 py-4 relative">
                           <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                               <div className={`w-1.5 h-1.5 rounded-full ${client.status === 'active' ? 'bg-green-500' : 'bg-slate-400'}`} />
                               {client.status === 'active' ? 'Ativo' : 'Inativo'}
                           </span>
                        </td>
                        <td className="px-6 py-4 relative">
                            {client.status === 'active' ? (
                                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${finStatus === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                    {finStatus === 'overdue' ? <AlertCircle size={14}/> : <CheckCircle size={14}/>}
                                    {finStatus === 'overdue' ? 'EM ATRASO' : 'EM DIA'}
                                </div>
                            ) : (
                                <span className="text-xs text-slate-400">-</span>
                            )}
                        </td>
                        <td className="px-6 py-4 text-right relative">
                            <div className="flex items-center justify-end gap-2">
                                <button type="button" onClick={(e) => handleOpenFinancial(e, client)} className="text-blue-600 hover:text-blue-700 bg-blue-50 p-1.5 rounded-md"><DollarSign size={18} /></button>
                                <button type="button" onClick={(e) => handleOpenEditClient(e, client)} className="text-slate-500 hover:text-blue-600 hover:bg-slate-100 p-1.5 rounded-md transition-colors"><Edit2 size={18} /></button>
                                <button type="button" onClick={(e) => handleDeleteClientRequest(e, client)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors"><Trash2 size={18} /></button>
                            </div>
                        </td>
                    </tr>
                );
              })}
              {displayedClients.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">Nenhum cliente encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALS SECTION --- */}
      <BaseModal
        isOpen={!!clientToDelete}
        onClose={() => setClientToDelete(null)}
        title="Excluir Cliente"
        variant="danger"
        icon={<AlertCircle size={24} />}
      >
        <div className="space-y-4">
            <p className="text-slate-600">
                Tem certeza que deseja excluir <b>{clientToDelete?.name}</b>?
            </p>
            <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-sm text-red-700">
                Esta ação não pode ser desfeita e removerá todos os dados vinculados.
            </div>
            <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setClientToDelete(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button onClick={confirmDeleteClient} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-md">Confirmar Exclusão</button>
            </div>
        </div>
      </BaseModal>

      <BaseModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}
      >
        <form onSubmit={handleClientSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Nome</label><input required type="text" value={clientFormData.name || ''} onChange={e => setClientFormData({...clientFormData, name: e.target.value})} className={inputClass} /></div>
            
            {/* WHATSAPP COM MÁSCARA */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp</label>
                <input 
                    type="tel" 
                    placeholder="5511999999999"
                    value={clientFormData.whatsapp} 
                    onChange={handleWhatsAppChange}
                    className={inputClass}
                    maxLength={15}
                />
                <p className="text-xs text-slate-400 mt-1">Apenas números. O código do país (55) é automático.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Contrato</label>
                <select value={clientFormData.type} onChange={(e) => setClientFormData({...clientFormData, type: e.target.value as any})} className={inputClass}>
                    <option value="avulso">Avulso</option>
                    <option value="mensalista">Mensalista</option>
                </select>
                </div>
                <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <select value={clientFormData.status} onChange={(e) => setClientFormData({...clientFormData, status: e.target.value as any})} className={inputClass}>
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                </select>
                </div>
            </div>

            {clientFormData.type === 'mensalista' && (
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Valor Mensal</label><input type="number" value={clientFormData.monthlyValue || ''} onChange={e => setClientFormData({...clientFormData, monthlyValue: parseFloat(e.target.value)})} className={inputClass} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Dia Vencimento</label><input type="number" value={clientFormData.dueDay || ''} onChange={e => setClientFormData({...clientFormData, dueDay: parseInt(e.target.value)})} className={inputClass} /></div>
            </div>
            )}
            <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setIsClientModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button><button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold">Salvar</button></div>
        </form>
      </BaseModal>

      <BaseModal
        isOpen={isFinancialModalOpen}
        onClose={() => setIsFinancialModalOpen(false)}
        title={
            <div className="flex flex-col">
                <span className="flex items-center gap-2"><DollarSign size={20} className="text-green-600"/> Financeiro</span>
                <span className="text-sm font-normal text-slate-500">{selectedClient?.name}</span>
            </div>
        }
        maxWidth="max-w-3xl"
      >
        <div className="space-y-6">
            <form onSubmit={handlePaymentSubmit} className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Descrição</label>
                            <input type="text" placeholder="Ex: Mensalidade" value={paymentFormData.description} onChange={e => setPaymentFormData({...paymentFormData, description: e.target.value})} className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Valor (R$)</label>
                            <input type="number" required placeholder="0,00" value={paymentFormData.value || ''} onChange={e => setPaymentFormData({...paymentFormData, value: parseFloat(e.target.value)})} className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Comprovante</label>
                            <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed cursor-pointer w-full h-[42px] ${paymentFormData.receiptUrl ? 'border-green-300 bg-green-50 text-green-700' : 'border-slate-300 bg-white'}`}>
                                {isUploading ? <Loader2 size={16} className="animate-spin text-blue-600" /> : (paymentFormData.receiptUrl ? <CheckCircle size={16} className="text-green-600"/> : <UploadCloud size={16} />)}
                                <span className="text-sm truncate font-medium">{isUploading ? 'Enviando...' : (paymentFormData.receiptUrl ? 'Arquivo Pronto' : 'Upload PDF/Imagem')}</span>
                                <input type="file" accept="application/pdf,image/*" onChange={handleFileUpload} className="hidden" disabled={isUploading} />
                            </label>
                        </div>

                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Mês</label>
                                <div className="flex gap-2">
                                    <select value={paymentFormData.month} onChange={e => setPaymentFormData({...paymentFormData, month: e.target.value})} className="flex-1 px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                                        {fullMonths.map((m, i) => (<option key={i} value={i}>{m}</option>))}
                                    </select>
                                    <div className="px-3 py-2 bg-slate-200 text-slate-600 font-bold rounded-lg border border-slate-300">{selectedYear}</div>
                                </div>
                            </div>
                            <button type="submit" disabled={isUploading} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-bold shadow-md h-[42px]">Adicionar</button>
                        </div>
                    </div>
                </div>
            </form>

            <div>
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Histórico Anual</h4>
                    <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-lg">
                        <button onClick={() => setSelectedYear(y => y-1)} className="p-1 hover:bg-white rounded shadow-sm text-slate-500 font-bold px-2">&lt;</button>
                        <span className="font-bold text-slate-800 text-sm">{selectedYear}</span>
                        <button onClick={() => setSelectedYear(y => y+1)} className="p-1 hover:bg-white rounded shadow-sm text-slate-500 font-bold px-2">&gt;</button>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {months.map((month, index) => {
                        const payment = getPaymentForMonth(index);
                        const isPaid = payment?.status === 'paid';
                        const statusColor = isPaid ? 'bg-green-50 border-green-200 text-green-700 shadow-sm' : (payment ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-white border-slate-200 text-slate-400 border-dashed');
                        return (
                            <div key={month} onClick={() => handleTogglePaymentStatus(index)} className={`relative p-3 rounded-xl border flex flex-col items-center justify-between min-h-[120px] transition-all hover:scale-[1.02] cursor-pointer group ${statusColor}`}>
                                <div className="flex justify-between w-full items-start"><span className="text-xs font-bold uppercase tracking-wider opacity-70">{month}</span>{isPaid && <CheckCircle size={14} className="text-green-600" />}</div>
                                <div className="flex-1 flex flex-col justify-center items-center py-2">{payment ? <span className="text-sm font-mono font-bold tracking-tight">{formatCurrency(payment.value)}</span> : <span className="text-xs opacity-40">-</span>}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      </BaseModal>
    </div>
  );
};

export default Clients;
