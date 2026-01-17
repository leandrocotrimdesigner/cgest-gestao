
import { Client, Project, User, Goal, Task, Payment, PaymentStatus } from '../types';
import { supabase } from './supabaseClient';

const generateId = () => Math.random().toString(36).substr(2, 9);
const todayStr = new Date().toISOString().split('T')[0];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class DataService {
  private useMock: boolean;

  constructor() {
    this.useMock = !supabase;
    
    if (this.useMock) {
      this.initLocalStore();
    }
  }

  private initLocalStore() {
    if (!localStorage.getItem('cgest_clients')) localStorage.setItem('cgest_clients', '[]');
    if (!localStorage.getItem('cgest_projects')) localStorage.setItem('cgest_projects', '[]');
    if (!localStorage.getItem('cgest_goals')) localStorage.setItem('cgest_goals', '[]');
    if (!localStorage.getItem('cgest_tasks')) localStorage.setItem('cgest_tasks', '[]');
    if (!localStorage.getItem('cgest_payments')) localStorage.setItem('cgest_payments', '[]');
  }

  // --- HELPERS DE MAPEAMENTO ---
  
  private mapDbToClient(record: any): Client {
      return {
          id: record.id,
          name: record.name,
          whatsapp: record.whatsapp,
          type: record.contract_type || 'avulso', 
          status: record.status || 'active',
          monthlyValue: record.monthly_value ? Number(record.monthly_value) : undefined,
          dueDay: record.due_day ? Number(record.due_day) : undefined,
          createdAt: record.created_at || new Date().toISOString()
      };
  }

  private mapSupabaseUser(u: any): User {
      return {
          id: u.id,
          email: u.email || '',
          name: u.user_metadata?.name || u.email?.split('@')[0] || 'Usuário',
          avatar: u.user_metadata?.avatar_url || ''
      };
  }

  private async getAuthUserId(): Promise<string | null> {
      const { data, error } = await supabase!.auth.getSession();
      if (error || !data.session?.user) {
          console.warn("Sessão inválida:", error);
          return null;
      }
      return data.session.user.id;
  }

  // --- GENERIC UPSERT LOGIC FOR PAYMENTS ---
  async upsertPayment(payment: Partial<Payment> & { clientId: string, dueDate: string }): Promise<Payment> {
    if (this.useMock) {
        await delay(100);
        return { ...payment, id: generateId() } as Payment;
    } else {
         const userId = await this.getAuthUserId();
         if (!userId) { await supabase!.auth.signOut(); throw new Error("Sessão inválida."); }

         const payload = { ...payment, user_id: userId };
         
         if (payment.id) {
             const { error } = await supabase!.from('payments').update(payload).eq('id', payment.id);
             if (error) throw new Error(`Erro ao atualizar: ${error.message}`);
             return payload as Payment;
         } else {
             const { data, error } = await supabase!.from('payments').insert([payload]).select().single();
             if (error) throw new Error(`Erro ao criar: ${error.message}`);
             return data as Payment;
         }
    }
  }

  // --- BACKUP ---
  async getBackupData(): Promise<any> {
      if (this.useMock) {
          return { clients: JSON.parse(localStorage.getItem('cgest_clients') || '[]') };
      }
      return null;
  }

  async restoreBackupData(data: any): Promise<void> {
      if (this.useMock && data) {
          if(Array.isArray(data.clients)) localStorage.setItem('cgest_clients', JSON.stringify(data.clients));
      }
  }

  // --- CRUD WRAPPERS ---
  
  // CLIENTS
  async getClients(): Promise<Client[]> {
    if (this.useMock) return JSON.parse(localStorage.getItem('cgest_clients') || '[]');
    
    try {
        const { data, error } = await supabase!.from('clients').select('*');
        if (error) {
            console.warn("Erro ao buscar clientes:", error.message);
            return [];
        }
        return (data || []).map(this.mapDbToClient);
    } catch (e) {
        return [];
    }
  }

  async addClient(client: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
    console.log('[DataService] Iniciando addClient...');
    
    if (this.useMock) {
      const newClient = { ...client, id: generateId(), createdAt: new Date().toISOString() };
      const clients = await this.getClients();
      clients.push(newClient);
      localStorage.setItem('cgest_clients', JSON.stringify(clients));
      return newClient;
    }
    
    // 1. Obter ID da sessão segura
    const userId = await this.getAuthUserId();
    if (!userId) {
        await supabase!.auth.signOut();
        throw new Error("Sessão expirada. Faça login novamente.");
    }
    
    console.log('[DataService] UserID Detectado:', userId);

    // 2. Limpeza de WhatsApp (GARANTIA DE NÚMERO LIMPO)
    // Se o valor já vier com máscara, removemos tudo que não é dígito
    let cleanWhatsapp = client.whatsapp ? client.whatsapp.toString().replace(/\D/g, '') : '';
    // Garante prefixo 55 se tiver número
    if (cleanWhatsapp.length > 0 && !cleanWhatsapp.startsWith('55')) {
        cleanWhatsapp = '55' + cleanWhatsapp;
    }

    // 3. Payload Mapeado (Snake Case) com user_id injetado
    const dbPayload = { 
        name: client.name,
        whatsapp: cleanWhatsapp,
        contract_type: client.type,
        status: client.status,
        monthly_value: client.monthlyValue,
        due_day: client.dueDay,
        user_id: userId // Injeção Obrigatória
    };

    console.log('[DataService] Enviando para Supabase (clients):', dbPayload);

    // 4. Insert Direto na tabela 'clients' (Plural)
    const { data, error } = await supabase!.from('clients').insert([dbPayload]).select().single();
    
    if (error) {
        console.error("Erro Supabase:", error);
        throw new Error(`Erro ao salvar: ${error.message} (Code: ${error.code})`);
    }
    
    console.log('[DataService] Cliente Salvo com Sucesso:', data);
    return this.mapDbToClient(data);
  }

  async updateClient(client: Client): Promise<void> {
    if (this.useMock) {
      const clients = await this.getClients();
      const updated = clients.map(c => c.id === client.id ? client : c);
      localStorage.setItem('cgest_clients', JSON.stringify(updated));
      return;
    }
    
    const userId = await this.getAuthUserId();
    if (!userId) throw new Error("Sessão inválida.");

    let cleanWhatsapp = client.whatsapp ? client.whatsapp.toString().replace(/\D/g, '') : '';
    if (cleanWhatsapp.length > 0 && !cleanWhatsapp.startsWith('55')) {
        cleanWhatsapp = '55' + cleanWhatsapp;
    }

    const dbPayload = { 
        name: client.name,
        whatsapp: cleanWhatsapp,
        contract_type: client.type,
        status: client.status,
        monthly_value: client.monthlyValue,
        due_day: client.dueDay
    };

    const { error } = await supabase!.from('clients').update(dbPayload).eq('id', client.id);
    if (error) throw new Error(`Erro ao atualizar: ${error.message}`);
  }

  async deleteClient(id: string): Promise<void> {
    if(this.useMock) {
      const clients = await this.getClients();
      localStorage.setItem('cgest_clients', JSON.stringify(clients.filter(c => c.id !== id)));
      return;
    }
    const { error } = await supabase!.from('clients').delete().eq('id', id);
    if (error) throw new Error(`Erro ao excluir: ${error.message}`);
  }

  // PROJECTS
  async getProjects(): Promise<Project[]> {
    if (this.useMock) return JSON.parse(localStorage.getItem('cgest_projects') || '[]');
    try {
        const { data, error } = await supabase!.from('projects').select('*');
        if (error) return [];
        return (data || []) as Project[];
    } catch { return []; }
  }

  async addProject(project: any): Promise<Project> {
      try {
        if (this.useMock) return { ...project, id: generateId() };
        const userId = await this.getAuthUserId();
        if(!userId) throw new Error("Login necessario");
        const payload = { ...project, user_id: userId };
        const { data, error } = await supabase!.from('projects').insert([payload]).select().single();
        if(error) throw error;
        return data as Project;
      } catch (e) {
          console.warn("Project add failed", e);
          return { ...project, id: generateId() } as Project;
      }
  }

  async updateProjectStatus(id: string, status: any): Promise<void> { /* ... */ }
  async updateProjectPaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<void> { /* ... */ }
  async deleteProject(id: string): Promise<void> { /* ... */ }

  // GOALS
  async getGoals(): Promise<Goal[]> {
      try {
        if (this.useMock) return [];
        const { data, error } = await supabase!.from('goals').select('*');
        if (error) return [];
        return (data || []) as Goal[];
      } catch { return []; }
  }
  async addGoal(goal: any): Promise<void> {}
  async updateGoal(goal: Goal): Promise<void> {}
  async deleteGoal(id: string): Promise<void> {}

  // TASKS
  async getTasks(): Promise<Task[]> {
      try {
        if (this.useMock) return [];
        const { data, error } = await supabase!.from('tasks').select('*');
        if (error) return [];
        return (data || []) as Task[];
      } catch { return []; }
  }
  
  async addTask(task: any): Promise<void> {
    console.log('[DataService] Iniciando addTask...');
    try {
        if (this.useMock) {
            // Mock logic
            return;
        }
        
        const userId = await this.getAuthUserId();
        if(!userId) throw new Error("Login necessário");
        
        console.log('[DataService] UserID para Task:', userId);
        
        const payload = { ...task, user_id: userId };
        
        const { error } = await supabase!.from('tasks').insert([payload]);
        if (error) {
            console.error("Erro Supabase (addTask):", error);
            throw error;
        }
        console.log('[DataService] Tarefa Salva.');
    } catch(e) {
        console.error(e);
        throw e;
    }
  }
  
  async toggleTask(id: string, isCompleted: boolean): Promise<void> {
      // Simplificado para manter foco
      if (!this.useMock) {
          await supabase!.from('tasks').update({ isCompleted }).eq('id', id);
      }
  }
  
  async deleteTask(id: string): Promise<void> {
      if (!this.useMock) {
          await supabase!.from('tasks').delete().eq('id', id);
      }
  }

  // PAYMENTS
  async getPayments(): Promise<Payment[]> {
      try {
        if (this.useMock) return [];
        const { data, error } = await supabase!.from('payments').select('*');
        if (error) return [];
        return (data || []) as Payment[];
      } catch { return []; }
  }
  async addPayment(payment: any): Promise<void> {}
  async updatePayment(payment: Payment): Promise<void> {}

  // --- AUTH ---
  async login(email: string, pass: string): Promise<User> {
      const { data, error } = await supabase!.auth.signInWithPassword({
          email,
          password: pass
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error("Usuário não encontrado.");
      return this.mapSupabaseUser(data.user);
  }

  async logout(): Promise<void> {
      if (this.useMock) return;
      await supabase!.auth.signOut();
  }

  async getCurrentUser(): Promise<User | null> {
      if (this.useMock) return null;
      const { data: { session } } = await supabase!.auth.getSession();
      if (session?.user) return this.mapSupabaseUser(session.user);
      return null;
  }

  async updateUser(user: User): Promise<User> {
      const updates: any = { data: { name: user.name, avatar_url: user.avatar } };
      const { data, error } = await supabase!.auth.updateUser(updates);
      if (error) throw error;
      return this.mapSupabaseUser(data.user);
  }
}

export const dataService = new DataService();
