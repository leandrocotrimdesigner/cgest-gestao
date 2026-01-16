
import React, { useState } from 'react';
import { User } from '../types';
import { User as UserIcon, Mail, Lock, Save, Shield, Camera, Download, Upload, Trash2, AlertTriangle, X } from 'lucide-react';
import { dataService } from '../services/dataService';
import { useToast } from './ToastContext';

interface ProfileProps {
  user: User;
  onUpdateUser: (user: User) => Promise<void>;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdateUser }) => {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar || null);
  
  // States for Security Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  // States for Backup Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email,
    recoveryEmail: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
        await onUpdateUser({ 
            ...user, 
            name: formData.name,
            avatar: avatarPreview || undefined 
        });
        addToast({ type: 'success', title: 'Perfil Atualizado', message: 'Suas informações foram salvas com sucesso.' });
        setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (error) {
        addToast({ type: 'error', title: 'Erro', message: 'Não foi possível salvar as alterações.' });
    } finally {
        setIsLoading(false);
    }
  };

  // --- BACKUP LOGIC ---
  const handleExport = async () => {
      try {
          const data = await dataService.getBackupData();
          const jsonString = JSON.stringify(data, null, 2);
          const blob = new Blob([jsonString], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const date = new Date().toISOString().split('T')[0];
          link.href = url;
          link.download = `cgest-backup-${date}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          addToast({ type: 'success', title: 'Exportação Concluída', message: 'O arquivo foi baixado com sucesso.' });
      } catch (error) {
          addToast({ type: 'error', title: 'Erro na Exportação', message: 'Tente novamente mais tarde.' });
      }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const content = event.target?.result as string;
              if (!content) return;

              const json = JSON.parse(content);
              
              // Validação básica
              if (!json.timestamp && (!json.clients && !json.projects)) {
                  throw new Error("Formato de arquivo inválido");
              }

              // Armazena dados temporariamente e abre modal de confirmação
              setPendingBackupData(json);
              setIsImportModalOpen(true);
          } catch (error) {
              addToast({ type: 'error', title: 'Arquivo Inválido', message: 'O arquivo selecionado não é um backup válido do CGest.' });
          }
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset input
  };

  const confirmImport = async () => {
      if (pendingBackupData) {
          try {
              await dataService.restoreBackupData(pendingBackupData);
              addToast({ type: 'success', title: 'Importação Concluída', message: 'Sistema recarregando...' });
              setTimeout(() => window.location.reload(), 1500);
          } catch (e) {
              addToast({ type: 'error', title: 'Erro na Restauração', message: 'Houve um problema ao processar os dados.' });
          }
      }
      setIsImportModalOpen(false);
      setPendingBackupData(null);
  };

  // --- CLEAR DATA LOGIC ---
  const handleConfirmClear = () => {
      if (deletePassword === 'admin123') {
          try {
              localStorage.clear();
              addToast({ type: 'success', title: 'Sistema Resetado', message: 'Recarregando aplicação...' });
              setTimeout(() => window.location.reload(), 1500);
          } catch (e) {
              addToast({ type: 'error', title: 'Erro', message: 'Falha ao limpar dados.' });
          }
      } else {
          addToast({ type: 'error', title: 'Acesso Negado', message: 'Senha de administrador incorreta.' });
          setDeletePassword('');
      }
  };

  const inputClass = "w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none";

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Meu Perfil</h2>
        <p className="text-slate-500">Gerencie suas informações e segurança</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 text-center relative">
            
            <div className="relative inline-block mx-auto mb-4 w-32 h-32 group">
                 <input 
                    type="file" 
                    onChange={handleImageChange} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50" 
                    accept="image/*"
                    title="Alterar foto de perfil"
                />

                <div className="w-full h-full rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center relative z-10 pointer-events-none">
                    {avatarPreview ? (
                        <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <UserIcon size={48} className="text-slate-400" />
                    )}
                </div>
                
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center border-4 border-transparent z-20 pointer-events-none">
                    <Camera className="text-white" size={24} />
                </div>
                
                <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full shadow-md border-2 border-white group-hover:bg-blue-700 transition-colors z-30 pointer-events-none">
                    <Camera size={14} />
                </div>
            </div>
            
            <h3 className="font-bold text-slate-800 text-lg">{formData.name || 'Usuário'}</h3>
            <p className="text-sm text-slate-500">{user.email}</p>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-100">
               <Shield size={12} />
               Conta Administrador
            </div>
            
            <div className="mt-4 text-sm text-blue-600 font-medium hover:underline cursor-pointer relative">
                Alterar Foto
                 <input 
                    type="file" 
                    onChange={handleImageChange} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    accept="image/*"
                />
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6">
            <div className="space-y-4">
                <h4 className="font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2"><UserIcon size={18} className="text-blue-600" />Dados Pessoais</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">E-mail Principal</label>
                        {/* Campo de email com visual padronizado (fundo branco), apenas leitura */}
                        <input 
                            type="email" 
                            value={formData.email} 
                            readOnly 
                            className={inputClass} 
                        />
                    </div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">E-mail de Recuperação</label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="email" name="recoveryEmail" value={formData.recoveryEmail} onChange={handleChange} placeholder="ex: secundario@email.com" className={inputClass.replace('px-3', 'pl-10 pr-3')} /></div></div>
                </div>
            </div>

            <div className="space-y-4 pt-2">
                <h4 className="font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2"><Lock size={18} className="text-blue-600" />Alterar Senha</h4>
                <div className="space-y-3">
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Senha Atual</label><input type="password" name="currentPassword" value={formData.currentPassword} onChange={handleChange} className={inputClass} /></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Nova Senha</label><input type="password" name="newPassword" value={formData.newPassword} onChange={handleChange} className={inputClass} /></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Nova Senha</label><input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className={inputClass} /></div>
                    </div>
                </div>
            </div>

            <div className="pt-4 flex justify-end">
                <button type="submit" disabled={isLoading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold transition-all shadow-md active:scale-95 disabled:opacity-70">
                    <Save size={18} /> {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>
          </form>

          {/* DATA AND SECURITY SECTION */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6">
              <h4 className="font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2"><Shield size={18} className="text-purple-500" />Dados e Segurança</h4>
              
              <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <h5 className="font-medium text-slate-800 mb-1">Backup do Sistema</h5>
                      <p className="text-sm text-slate-500 mb-4">Exporte seus dados para segurança ou transfira para outro dispositivo.</p>
                      
                      <div className="flex gap-3">
                          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors shadow-sm">
                              <Download size={16} /> Exportar Backup
                          </button>
                          
                          <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer">
                              <Upload size={16} /> Importar Backup
                              <input type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
                          </label>
                      </div>
                  </div>

                  <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                      <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-medium text-red-900 mb-1">Zona de Perigo</h5>
                            <p className="text-sm text-red-700">Ação irreversível. Isso apagará todos os clientes, projetos, metas e tarefas.</p>
                          </div>
                          <div className="p-2 bg-red-100 rounded-full text-red-600">
                              <AlertTriangle size={20} />
                          </div>
                      </div>
                      
                      <button 
                        onClick={() => { setIsDeleteModalOpen(true); setDeletePassword(''); }}
                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                      >
                          <Trash2 size={16} /> Limpar Todos os Dados
                      </button>
                  </div>
              </div>
          </div>
        </div>
      </div>

      {/* SECURITY MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4" onClick={() => setIsDeleteModalOpen(false)}>
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fadeIn overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-6 bg-red-50 border-b border-red-100 flex items-start gap-4">
                <div className="p-2 bg-red-100 rounded-full text-red-600">
                  <Lock size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-900">Confirmação de Segurança</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Esta ação requer permissão de administrador.
                  </p>
                </div>
                <button onClick={() => setIsDeleteModalOpen(false)} className="ml-auto text-red-400 hover:text-red-700"><X size={20} /></button>
              </div>
              
              <div className="p-6 space-y-4">
                <p className="text-slate-600 text-sm">
                  Digite a senha de administrador para confirmar a limpeza total do sistema.
                </p>
                <div>
                    <input 
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Senha de administrador"
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                      autoFocus
                    />
                    <p className="text-xs text-slate-400 mt-1 italic">Dica: A senha padrão é 'admin123'</p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                  <button 
                    onClick={handleConfirmClear}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-md transition-all"
                  >
                    Confirmar Limpeza
                  </button>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* IMPORT CONFIRMATION MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4" onClick={() => setIsImportModalOpen(false)}>
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fadeIn overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-6 bg-blue-50 border-b border-blue-100 flex items-start gap-4">
                <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                  <Upload size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-blue-900">Importar Backup</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Atenção: Isso substituirá os dados atuais.
                  </p>
                </div>
                <button onClick={() => setIsImportModalOpen(false)} className="ml-auto text-blue-400 hover:text-blue-700"><X size={20} /></button>
              </div>
              
              <div className="p-6 space-y-4">
                <p className="text-slate-600 text-sm">
                  Você está prestes a restaurar um backup. Todos os clientes, projetos e tarefas atuais serão <b>substituídos</b> pelos dados do arquivo. Deseja continuar?
                </p>
                
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                  <button 
                    onClick={confirmImport}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md transition-all"
                  >
                    Confirmar Importação
                  </button>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
