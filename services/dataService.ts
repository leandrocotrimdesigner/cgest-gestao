
import { Client, Project, User, Goal, Task, Payment, PaymentStatus } from '../types';
import { supabase } from './supabaseClient';

const generateId = () => Math.random().toString(36).substr(2, 9);

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
          // Whatsapp removido
          type: record.contract_type || 'avulso', 
          status: record.status || 'active',
          // Leitura segura (pode vir null do banco)
          monthlyValue: record.monthly_value ? Number(record.monthly_value) : undefined,
          dueDay: record.due_day ? Number(record.due_day) : undefined,
          createdAt: record.created_at || new Date().toISOString()
      };
  }

  private mapDbToTask(record: any): Task {
      return {
          id: record.id,
          title: record.description || record.title || 'Sem título',
          isCompleted: record.completed || false,
          projectId: record.project_id,
          dueDate: record.due_date,
          isMeeting: record.is_meeting || false,
          meetingTime: record.meeting_time, 
          createdAt: record.created_at
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
          return null;
      }
      return data.session.user.id;
  }

  // --- CRUD WRAPPERS ---
  
  // CLIENTS
  async getClients(): Promise<Client[]> {
    if (this.useMock) return JSON.parse(localStorage.getItem('cgest_clients') || '[]');
    
    try {
        const { data, error } = await supabase!.from('clients').select('*');
        if (error) return [];
        return (data || []).map(this.mapDbToClient);
    } catch (e) {
        return [];
    }
  }

  // --- CRÍTICO: Payload Limpo para evitar erro 400 ---
  async addClient(client: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
    console.log('[DataService] Add Client Limpo');
    
    if (this.useMock) {
      const newClient = { ...client, id: generateId(), createdAt: new Date().toISOString() };
      return newClient;
    }
    
    const userId = await this.getAuthUserId();
    if (!userId) throw new Error("Sessão expirada.");

    // Payload estrito: Apenas colunas que temos certeza que existem
    const dbPayload = { 
        name: client.name,
        contract_type: client.type,
        status: client.status,
        user_id: userId
        // REMOVIDO: monthly_value, due_day, whatsapp
    };

    const { data, error } = await supabase!.from('clients').insert([dbPayload]).select().single();
    
    if (error) {
        console.error("Erro Supabase addClient:", error);
        throw error;
    }
    return this.mapDbToClient(data);
  }

  async updateClient(client: Client): Promise<void> {
       if(this.useMock) return;
       // Simplificado para update básico sem WhatsApp
       const { error } = await supabase!.from('clients').update({ name: client.name }).eq('id', client.id);
  }

  async deleteClient(id: string): Promise<void> {
    if(this.useMock) return;
    await supabase!.from('clients').delete().eq('id', id);
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
        
        const payload = { 
            name: project.name,
            client_id: project.clientId,
            status: project.status,
            payment_status: project.paymentStatus,
            budget: project.budget,
            user_id: userId 
        };
        
        const { data, error } = await supabase!.from('projects').insert([payload]).select().single();
        if(error) throw error;
        return data as Project;
      } catch (e) {
          return { ...project, id: generateId() } as Project;
      }
  }

  async updateProjectStatus(id: string, status: any): Promise<void> {
      if(!this.useMock) await supabase!.from('projects').update({ status }).eq('id', id);
  }
  
  async updateProjectPaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<void> { 
      if(!this.useMock) await supabase!.from('projects').update({ payment_status: paymentStatus }).eq('id', id);
  }
  
  async deleteProject(id: string): Promise<void> { 
      if(!this.useMock) await supabase!.from('projects').delete().eq('id', id);
  }

  // GOALS
  async getGoals(): Promise<Goal[]> {
      return []; 
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
        return (data || []).map(this.mapDbToTask);
      } catch { return []; }
  }
  
  async addTask(task: any): Promise<void> {
    try {
        if (this.useMock) return;
        const userId = await this.getAuthUserId();
        if(!userId) throw new Error("Login necessário");
        
        const dbPayload = {
            description: task.title,
            due_date: task.dueDate,
            completed: task.isCompleted || false,
            is_meeting: task.isMeeting || false,
            user_id: userId
        };
        
        const { error } = await supabase!.from('tasks').insert([dbPayload]);
        if (error) throw error;
    } catch(e: any) {
        throw new Error(`Erro ao salvar tarefa: ${e.message}`);
    }
  }
  
  async toggleTask(id: string, isCompleted: boolean): Promise<void> {
      if (!this.useMock) {
          await supabase!.from('tasks').update({ completed: isCompleted }).eq('id', id);
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
  
  async addPayment(payment: any): Promise<void> {
      if(!this.useMock) {
          const userId = await this.getAuthUserId();
          const payload = { ...payment, user_id: userId };
          await supabase!.from('payments').insert([payload]);
      }
  }
  
  async updatePayment(payment: Payment): Promise<void> {
      if(!this.useMock) {
         await supabase!.from('payments').update({ 
             status: payment.status, 
             value: payment.value,
             description: payment.description,
             paid_at: payment.paidAt,
             receipt_url: payment.receiptUrl
         }).eq('id', payment.id);
      }
  }

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

  // --- BACKUP & RESTORE ---
  
  async getBackupData(): Promise<any> {
    if (this.useMock) {
        return {
            clients: JSON.parse(localStorage.getItem('cgest_clients') || '[]'),
            projects: JSON.parse(localStorage.getItem('cgest_projects') || '[]'),
            goals: JSON.parse(localStorage.getItem('cgest_goals') || '[]'),
            tasks: JSON.parse(localStorage.getItem('cgest_tasks') || '[]'),
            payments: JSON.parse(localStorage.getItem('cgest_payments') || '[]'),
            timestamp: new Date().toISOString()
        };
    }

    const { data: clients } = await supabase!.from('clients').select('*');
    const { data: projects } = await supabase!.from('projects').select('*');
    const { data: tasks } = await supabase!.from('tasks').select('*');
    const { data: payments } = await supabase!.from('payments').select('*');

    return {
        clients: clients || [],
        projects: projects || [],
        tasks: tasks || [],
        payments: payments || [],
        timestamp: new Date().toISOString()
    };
  }

  async restoreBackupData(backup: any): Promise<void> {
    if (this.useMock) {
        if(backup.clients) localStorage.setItem('cgest_clients', JSON.stringify(backup.clients));
        if(backup.projects) localStorage.setItem('cgest_projects', JSON.stringify(backup.projects));
        if(backup.goals) localStorage.setItem('cgest_goals', JSON.stringify(backup.goals));
        if(backup.tasks) localStorage.setItem('cgest_tasks', JSON.stringify(backup.tasks));
        if(backup.payments) localStorage.setItem('cgest_payments', JSON.stringify(backup.payments));
        return;
    }

    const userId = await this.getAuthUserId();
    if (!userId) throw new Error("Usuário não autenticado.");

    // Clean existing data for this user
    await supabase!.from('payments').delete().eq('user_id', userId);
    await supabase!.from('tasks').delete().eq('user_id', userId);
    await supabase!.from('projects').delete().eq('user_id', userId);
    await supabase!.from('clients').delete().eq('user_id', userId);

    const injectUser = (arr: any[]) => arr.map(item => ({ ...item, user_id: userId }));

    if (backup.clients?.length) await supabase!.from('clients').insert(injectUser(backup.clients));
    if (backup.projects?.length) await supabase!.from('projects').insert(injectUser(backup.projects));
    if (backup.tasks?.length) await supabase!.from('tasks').insert(injectUser(backup.tasks));
    if (backup.payments?.length) await supabase!.from('payments').insert(injectUser(backup.payments));
  }
}

export const dataService = new DataService();
