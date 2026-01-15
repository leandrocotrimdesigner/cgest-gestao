
import React, { useState } from 'react';
import { Client, Payment, ClientStatus } from '../types';
import { Plus, Trash2, Search, DollarSign, X, CheckCircle, AlertCircle, XCircle, Edit2, Calendar, UploadCloud, Paperclip, Loader2 } from 'lucide-react';
import { DateSelector } from './DateSelector';
import { googleDriveService } from '../services/googleDriveService';

interface ClientsProps {
  clients: Client[];
  payments?: Payment[];
  onAddClient: (client: Omit<Client, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateClient?: (client: Client) => Promise<void>;
  onDeleteClient: (id: string) => Promise<void>;
  onAddPayment?: (payment: Omit<Payment, 'id'>) => Promise<void>;
  onUpdatePayment?: (payment: Payment) => Promise<void>;
}

const Clients: React.FC<ClientsProps> = ({ clients, payments = [], onAddClient, onUpdateClient, onDeleteClient, onAddPayment, onUpdatePayment }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Edit State
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  // States for Deletion (Meta Style)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); 
  
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<Partial<Client>>({ type: 'avulso', status: 'active', monthlyValue: 0, dueDay: 5 });
  
  // Financial Modal Form State
  const [newPaymentData, setNewPaymentData] = useState({ value: 0, description: '', month: '', receiptUrl: '' });
  // Upload State
  const [isUploading, setIsUploading] = useState(false);

  // Filtering
  const displayedClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus && !deletedIds.has(c.id);
  });

  // Handle Delete Request (Opens Modal)
  const handleDeleteRequest = (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    e.preventDefault();
    setClientToDelete(client);
    setDeleteConfirmationText('');
  };

  // Confirm Delete (Called by Modal)
  const confirmDelete = async () => {
    if (clientToDelete) {
        // Optimistic Update
        setDeletedIds(prev => {
            const next = new Set(prev);
            next.add(clientToDelete.id);
            return next;
        });

        try {
            await onDeleteClient(clientToDelete.id);
        } catch (error) {
            // Rollback
            setDeletedIds(prev => {
                const next = new Set(prev);
                next.delete(clientToDelete.id);
                return next;
            });
            alert("Erro ao excluir cliente.");
        } finally {
            setClientToDelete(null);
        }
    }
  };

  const getClientFinancialStatus = (client: Client) => {
      if (client.status === 'inactive') return 'inactive';
      
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const hasOverdue = payments.some(p => p.clientId === client.id && p.status === 'pending' && p.dueDate < todayStr);
      
      let mensalistaOverdue = false;
      if (client.type === 'mensalista' && client.dueDay) {
          if (today.getDate() > client.dueDay) {
               const hasPaymentForThisMonth = payments.some(p => {
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

  const handleOpenAdd = () => {
    setEditingClient(null);
    setFormData({ type: 'avulso', status: 'active', monthlyValue: 0, name: '', dueDay: 5 });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    setEditingClient(client);
    setFormData({
        name: client.name,
        type: client.type,
        status: client.status,
        monthlyValue: client.monthlyValue || 0,
        dueDay: client.dueDay || 5
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const payload = {
      name: formData.name,
      type: formData.type as 'mensalista' | 'avulso',
      status: formData.status as 'active' | 'inactive',
      monthlyValue: formData.type === 'mensalista' ? Number(formData.monthlyValue) : undefined,
      dueDay: formData.type === 'mensalista' ? Number(formData.dueDay) : undefined,
    };

    if (editingClient && onUpdateClient) {
        await onUpdateClient({
            ...editingClient,
            ...payload
        });
    } else {
        await onAddClient(payload);
    }
    
    setIsModalOpen(false);
  };

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const fullMonths = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const handleOpenFinancial = (e: React.MouseEvent, client: Client) => {
      e.stopPropagation();
      setSelectedClient(client);
      // Default to current month
      const currentMonth = new Date().getMonth();
      setNewPaymentData({ 
          value: client.monthlyValue || 0, 
          description: '', 
          month: String(currentMonth),
          receiptUrl: ''
      });
      setIsUploading(false);
      setIsFinancialModalOpen(true);
  }

  const getPaymentForMonth = (monthIndex: number) => {
      if (!selectedClient) return null;
      return payments.find(p => {
          const d = new Date(p.dueDate);
          return p.clientId === selectedClient.id && d.getMonth() === monthIndex && d.getFullYear() === selectedYear;
      });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
       // Inicializa cliente se necessário para garantir APIs carregadas
       await googleDriveService.initClient();
       
       const webViewLink = await googleDriveService.uploadFile(file);
       
       // Salva URL no estado do formulário para ser usada no submit
       setNewPaymentData(prev => ({ ...prev, receiptUrl: webViewLink }));
       alert("Comprovante enviado com sucesso para pasta 'Comprovantes_CGest'!");
    } catch (error: any) {
       console.error("Erro no upload", error);
       const msg = error.message || "Erro desconhecido ao enviar arquivo.";
       alert(`Falha no upload: ${msg}`);
    } finally {
       setIsUploading(false);
    }
  };

  const handleManualPaymentSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if(selectedClient && onAddPayment && onUpdatePayment) {
          const monthIndex = parseInt(newPaymentData.month);
          const year = selectedYear;

          // Assunto A3: Verifica se já existe pagamento para este mês/ano
          const existingPayment = getPaymentForMonth(monthIndex);

          if (existingPayment) {
              // UPDATE (Sobreposição)
              await onUpdatePayment({
                  ...existingPayment,
                  value: Number(newPaymentData.value),
                  // Se o usuário digitou uma nova descrição, usa ela. Senão mantém a antiga.
                  description: newPaymentData.description || existingPayment.description,
                  // Se o usuário fez upload de novo arquivo, usa ele. Senão mantém o antigo.
                  receiptUrl: newPaymentData.receiptUrl || existingPayment.receiptUrl,
                  status: 'paid', // Garante status pago ao lançar manualmente
                  paidAt: existingPayment.paidAt || new Date().toISOString().split('T')[0]
              });
              alert("Lançamento atualizado com sucesso!");
          } else {
              // INSERT (Novo)
              const day = '10'; 
              const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${day}`;
              
              await onAddPayment({
                  clientId: selectedClient.id,
                  value: Number(newPaymentData.value),
                  description: newPaymentData.description || `Pagamento ${months[monthIndex]}/${year}`,
                  dueDate: dateStr,
                  status: 'paid',
                  paidAt: dateStr,
                  receiptUrl: newPaymentData.receiptUrl
              });
          }
          
          // Reset description and file but keep value for ease of entry
          setNewPaymentData(prev => ({ ...prev, description: '', receiptUrl: '' }));
      }
  };

  // Grid click toggles payment status
  const handleMonthClick = async (monthIndex: number) => {
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
          // If clicking an empty box, treat as creating a paid payment for that month
          const dueDay = selectedClient.dueDay || 10; 
          const date = new Date(selectedYear, monthIndex, dueDay);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;
          
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

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const inputClass = "w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
          <p className="text-slate-500">Gerencie sua base e controle financeiro</p>
        </div>
        <button onClick={handleOpenAdd} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all active:scale-95">
          <Plus size={20} /> Novo Cliente
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input type="text" placeholder="Buscar clientes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"/>
          </div>
          <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
             {(['all', 'active', 'inactive'] as const).map(status => (
                 <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${statusFilter === status ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
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
                                <button 
                                    type="button"
                                    onClick={(e) => handleOpenEdit(e, client)}
                                    className="text-slate-500 hover:text-blue-600 hover:bg-slate-100 p-1.5 rounded-md transition-colors"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button 
                                    type="button"
                                    onClick={(e) => handleDeleteRequest(e, client)}
                                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </td>
                    </tr>
                );
              })}
              {displayedClients.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">Nenhum cliente encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DELETE MODAL (META ARCHITECTURE) */}
      {clientToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={() => setClientToDelete(null)}>
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fadeIn overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-6 bg-red-50 border-b border-red-100 flex items-start gap-4">
                <div className="p-2 bg-red-100 rounded-full text-red-600">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-900">Excluir Cliente</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Você está prestes a excluir <b>{clientToDelete.name}</b>.
                  </p>
                </div>
                <button onClick={() => setClientToDelete(null)} className="ml-auto text-red-400 hover:text-red-700"><X size={20} /></button>
              </div>
              <div className="p-6">
                <p className="text-slate-600 text-sm mb-4">Esta ação é irreversível e pode afetar o histórico financeiro.</p>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setClientToDelete(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                  <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-md">Confirmar Exclusão</button>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* NEW/EDIT CLIENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100"><h3 className="text-xl font-bold text-slate-800">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h3></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Nome</label><input required type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} /></div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Contrato</label>
                    <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value as any})} className={inputClass}>
                        <option value="avulso">Avulso</option>
                        <option value="mensalista">Mensalista</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as any})} className={inputClass}>
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                    </select>
                  </div>
              </div>

              {formData.type === 'mensalista' && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Valor Mensal</label><input type="number" value={formData.monthlyValue || ''} onChange={e => setFormData({...formData, monthlyValue: parseFloat(e.target.value)})} className={inputClass} /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Dia Vencimento</label><input type="number" value={formData.dueDay || ''} onChange={e => setFormData({...formData, dueDay: parseInt(e.target.value)})} className={inputClass} /></div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button><button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold">Salvar</button></div>
            </form>
          </div>
        </div>
      )}

      {/* FINANCIAL MODAL RESTRUCTURED */}
      {isFinancialModalOpen && selectedClient && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsFinancialModalOpen(false)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl animate-fadeIn flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><DollarSign size={20} className="text-green-600"/> Financeiro</h3>
                        <p className="text-sm text-slate-500">{selectedClient.name}</p>
                    </div>
                    <button onClick={() => setIsFinancialModalOpen(false)} className="text-slate-400 hover:text-slate-700"><X size={24} /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <form onSubmit={handleManualPaymentSubmit} className="bg-white p-5 rounded-xl border border-slate-200 mb-8 shadow-sm">
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Descrição</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: Mensalidade, Serviço Extra" 
                                        value={newPaymentData.description} 
                                        onChange={e => setNewPaymentData({...newPaymentData, description: e.target.value})} 
                                        className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Valor (R$)</label>
                                    <input 
                                        type="number" 
                                        required 
                                        placeholder="0,00" 
                                        value={newPaymentData.value || ''} 
                                        onChange={e => setNewPaymentData({...newPaymentData, value: parseFloat(e.target.value)})} 
                                        className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400" 
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Comprovante (Google Drive)</label>
                                    <div className="flex items-center gap-2">
                                        <label className={`
                                            flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed cursor-pointer w-full transition-colors
                                            ${newPaymentData.receiptUrl ? 'border-green-300 bg-green-50 text-green-700' : 'border-slate-300 hover:border-blue-400 text-slate-500 hover:bg-slate-50'}
                                        `}>
                                            {isUploading ? <Loader2 size={16} className="animate-spin text-blue-600" /> : (newPaymentData.receiptUrl ? <CheckCircle size={16} className="text-green-600"/> : <UploadCloud size={16} />)}
                                            <span className="text-sm truncate">
                                                {isUploading ? 'Enviando para Drive...' : (newPaymentData.receiptUrl ? 'Comprovante Salvo' : 'Upload PDF/Imagem')}
                                            </span>
                                            <input 
                                                type="file" 
                                                accept="application/pdf,image/*" 
                                                onChange={handleFileUpload}
                                                className="hidden"
                                                disabled={isUploading}
                                            />
                                        </label>
                                    </div>
                                    {newPaymentData.receiptUrl && <p className="text-[10px] text-green-600 mt-1 pl-1">Arquivo vinculado com sucesso!</p>}
                                </div>

                                <div className="flex gap-4 items-end">
                                    <div className="flex-1">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Mês de Referência</label>
                                        <div className="flex gap-2">
                                            <select 
                                                value={newPaymentData.month} 
                                                onChange={e => setNewPaymentData({...newPaymentData, month: e.target.value})}
                                                className="flex-1 px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                {fullMonths.map((m, i) => (
                                                    <option key={i} value={i}>{m}</option>
                                                ))}
                                            </select>
                                            <div className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg border border-slate-200">
                                                {selectedYear}
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        type="submit" 
                                        disabled={isUploading}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-bold shadow-md transition-all h-[42px]"
                                    >
                                        Adicionar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>

                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Histórico de {selectedYear}</h4>
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSelectedYear(y => y-1)} className="p-1 hover:bg-slate-100 rounded text-slate-500 font-bold">&lt;</button>
                            <span className="font-bold text-slate-800 text-lg">{selectedYear}</span>
                            <button onClick={() => setSelectedYear(y => y+1)} className="p-1 hover:bg-slate-100 rounded text-slate-500 font-bold">&gt;</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                        {months.map((month, index) => {
                            const payment = getPaymentForMonth(index);
                            const isPaid = payment?.status === 'paid';
                            const statusColor = isPaid 
                                ? 'bg-green-50 border-green-200 text-green-700 shadow-sm' 
                                : (payment ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-slate-50 border-slate-100 text-slate-400');
                            
                            return (
                                <button 
                                    key={month} 
                                    onClick={() => handleMonthClick(index)} 
                                    className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.02] relative group ${statusColor}`}
                                >
                                    {payment?.receiptUrl && (
                                        <a 
                                            href={payment.receiptUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute top-2 right-2 p-1.5 bg-white/80 hover:bg-blue-600 text-blue-600 hover:text-white rounded-full transition-colors z-10 shadow-sm"
                                            title="Ver Comprovante (Drive)"
                                        >
                                            <Paperclip size={14} />
                                        </a>
                                    )}
                                    <span className="text-sm font-bold uppercase">{month}</span>
                                    {payment ? (
                                        <span className="text-xs font-mono font-semibold">{formatCurrency(payment.value)}</span>
                                    ) : (
                                        <span className="text-xs opacity-50">-</span>
                                    )}
                                    {isPaid && <CheckCircle size={12} className="opacity-50" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default Clients;
