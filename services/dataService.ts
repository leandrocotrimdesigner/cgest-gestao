
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
          type: record.contract_type || 'avulso', 
          status: record.status || 'active',
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

  async addClient(client: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
    console.log('[DataService] Iniciando addClient...');
    
    if (this.useMock) {
      const newClient = { ...client, id: generateId(), createdAt: new Date().toISOString() };
      return newClient;
    }
    
    // Captura direta do ID do usuário para garantir a sessão atual
    const { data: userData } = await supabase!.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
        console.error('[DataService] Erro: User ID não encontrado via getUser()');
        throw new Error("Sessão expirada ou inválida. Recarregue a página.");
    }

    // Payload Limpo e Mínimo
    const dbPayload = { 
        name: client.name,
        contract_type: client.type, // 'mensalista' ou 'avulso'
        status: client.status,      // 'active' ou 'inactive'
        user_id: userId,
        // Campos opcionais apenas se existirem
        monthly_value: client.monthlyValue || null,
        due_day: client.dueDay || null
    };

    console.log('[DataService] Payload enviado:', dbPayload);

    try {
        const { data, error } = await supabase!.from('clients').insert([dbPayload]).select().single();
        
        console.log('[DataService] Resposta Supabase:', { data, error });

        if (error) {
            throw error;
        }
        
        return this.mapDbToClient(data);
    } catch (error: any) {
        console.error('[DataService] Erro Fatal addClient:', error);
        throw new Error(error.message || "Erro ao gravar no banco.");
    }
  }

  async updateClient(client: Client): Promise<void> {
       if(this.useMock) return;
       const { error } = await supabase!.from('clients').update({ 
           name: client.name,
           contract_type: client.type,
           status: client.status,
           monthly_value: client.monthlyValue,
           due_day: client.dueDay
       }).eq('id', client.id);
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
        
        const { data: userData } = await supabase!.auth.getUser();
        const userId = userData.user?.id;
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
    console.log('[DataService] Iniciando addTask...');

    if (this.useMock) return;
    
    try {
        // Captura direta do ID do usuário
        const { data: userData } = await supabase!.auth.getUser();
        const userId = userData.user?.id;

        if(!userId) {
            console.error('[DataService] Erro: User ID não encontrado em addTask');
            throw new Error("Login necessário para criar tarefas.");
        }
        
        const dbPayload = {
            description: task.title,
            due_date: task.dueDate,
            completed: task.isCompleted || false,
            is_meeting: task.isMeeting || false,
            meeting_time: task.meetingTime,
            project_id: task.projectId || null,
            user_id: userId
        };

        console.log('[DataService] Payload Task:', dbPayload);
        
        const { data, error } = await supabase!.from('tasks').insert([dbPayload]).select();
        
        console.log('[DataService] Resposta Task:', { data, error });

        if (error) throw error;
    } catch(e: any) {
        console.error("[DataService] Erro addTask:", e);
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
          const { data: userData } = await supabase!.auth.getUser();
          const userId = userData.user?.id;
          if (!userId) return;
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
    if (this.useMock) return {}; // Mock implementation skipped for brevity

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
    if (this.useMock) return;

    const { data: userData } = await supabase!.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error("Usuário não autenticado.");

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
