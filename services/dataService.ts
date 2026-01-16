
import { Client, Project, User, Goal, Task, Payment, PaymentStatus } from '../types';
import { supabase } from './supabaseClient';

const generateId = () => Math.random().toString(36).substr(2, 9);
const todayStr = new Date().toISOString().split('T')[0];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class DataService {
  private useMock: boolean;

  constructor() {
    // Com as chaves hardcoded, o supabase sempre existirá.
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

  // Helper to map Supabase user to App user
  private mapSupabaseUser(u: any): User {
      return {
          id: u.id,
          email: u.email || '',
          name: u.user_metadata?.name || u.email?.split('@')[0] || 'Usuário',
          avatar: u.user_metadata?.avatar_url || ''
      };
  }

  // Helper para obter o ID do usuário atual para inserção no banco
  private async getAuthUserId(): Promise<string | null> {
      const { data } = await supabase!.auth.getSession();
      return data.session?.user?.id || null;
  }

  // --- GENERIC UPSERT LOGIC FOR PAYMENTS ---
  async upsertPayment(payment: Partial<Payment> & { clientId: string, dueDate: string }): Promise<Payment> {
    const date = new Date(payment.dueDate);
    const targetMonth = date.getMonth();
    const targetYear = date.getFullYear();

    if (this.useMock) {
        await delay(100);
        const payments: Payment[] = JSON.parse(localStorage.getItem('cgest_payments') || '[]');
        
        const existingIndex = payments.findIndex(p => {
             if (payment.id && p.id === payment.id) return true;
             const pDate = new Date(p.dueDate);
             return p.clientId === payment.clientId && 
                    pDate.getMonth() === targetMonth && 
                    pDate.getFullYear() === targetYear;
        });

        if (existingIndex >= 0) {
            const existing = payments[existingIndex];
            const updated = { ...existing, ...payment, id: existing.id }; 
            payments[existingIndex] = updated;
            localStorage.setItem('cgest_payments', JSON.stringify(payments));
            return updated;
        } else {
            const newPayment = { 
                id: generateId(), 
                value: 0, 
                status: 'pending', 
                description: '',
                ...payment 
            } as Payment;
            payments.push(newPayment);
            localStorage.setItem('cgest_payments', JSON.stringify(payments));
            return newPayment;
        }
    } else {
         const userId = await this.getAuthUserId();
         if (!userId) throw new Error("Usuário não autenticado. Faça login novamente.");

         // Prepara o payload com user_id
         const payload = { ...payment, user_id: userId };
         
         if (payment.id) {
             // Update existing
             const { error } = await supabase!.from('payments').update(payload).eq('id', payment.id);
             if (error) throw error;
             return payload as Payment;
         } else {
             // Insert new
             // Garante uso da tabela 'payments' (plural)
             const { data, error } = await supabase!.from('payments').insert([payload]).select().single();
             if (error) throw error;
             return data as Payment;
         }
    }
  }

  // --- BACKUP ---
  async getBackupData(): Promise<any> {
      if (this.useMock) {
          return {
              clients: JSON.parse(localStorage.getItem('cgest_clients') || '[]'),
              projects: JSON.parse(localStorage.getItem('cgest_projects') || '[]'),
              // ...
          };
      }
      return null;
  }

  async restoreBackupData(data: any): Promise<void> {
      if (this.useMock && data) {
          if(Array.isArray(data.clients)) localStorage.setItem('cgest_clients', JSON.stringify(data.clients));
          // ...
      }
  }

  // --- CRUD WRAPPERS ---
  
  // CLIENTS
  async getClients(): Promise<Client[]> {
    if (this.useMock) return JSON.parse(localStorage.getItem('cgest_clients') || '[]');
    
    // Garante uso da tabela 'clients' (plural)
    const { data, error } = await supabase!.from('clients').select('*');
    if (error) throw error;
    return data as Client[];
  }

  async addClient(client: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
    if (this.useMock) {
      const newClient = { ...client, id: generateId(), createdAt: new Date().toISOString() };
      const clients = await this.getClients();
      clients.push(newClient);
      localStorage.setItem('cgest_clients', JSON.stringify(clients));
      return newClient;
    }
    
    const userId = await this.getAuthUserId();
    if (!userId) throw new Error("Usuário não autenticado.");

    // INJEÇÃO DO USER_ID OBRIGATÓRIA PARA RLS
    const payload = { ...client, user_id: userId };

    const { data, error } = await supabase!.from('clients').insert([payload]).select().single();
    if (error) {
        console.error("Erro Supabase:", error);
        throw new Error(`Erro ao salvar cliente: ${error.message}`);
    }
    return data as Client;
  }

  async updateClient(client: Client): Promise<void> {
    if (this.useMock) {
      const clients = await this.getClients();
      const updated = clients.map(c => c.id === client.id ? client : c);
      localStorage.setItem('cgest_clients', JSON.stringify(updated));
      return;
    }
    const { error } = await supabase!.from('clients').update(client).eq('id', client.id);
    if (error) throw error;
  }

  async deleteClient(id: string): Promise<void> {
    if(this.useMock) {
      const clients = await this.getClients();
      localStorage.setItem('cgest_clients', JSON.stringify(clients.filter(c => c.id !== id)));
      return;
    }
    const { error } = await supabase!.from('clients').delete().eq('id', id);
    if(error) throw error;
  }

  // PROJECTS
  async getProjects(): Promise<Project[]> {
    if (this.useMock) return JSON.parse(localStorage.getItem('cgest_projects') || '[]');
    const { data } = await supabase!.from('projects').select('*');
    return data as Project[];
  }

  async addProject(project: any): Promise<Project> {
    if (this.useMock) {
        const newP = { ...project, id: generateId(), createdAt: new Date().toISOString() };
        const ps = await this.getProjects();
        ps.push(newP);
        localStorage.setItem('cgest_projects', JSON.stringify(ps));
        return newP;
    }
    
    const userId = await this.getAuthUserId();
    const payload = { ...project, user_id: userId };

    const { data, error } = await supabase!.from('projects').insert([payload]).select().single();
    if (error) throw error;
    return data as Project;
  }

  async updateProjectStatus(id: string, status: any): Promise<void> {
      if(this.useMock) {
          const ps = await this.getProjects();
          const updated = ps.map(p => p.id === id ? {...p, status} : p);
          localStorage.setItem('cgest_projects', JSON.stringify(updated));
          return;
      }
      const { error } = await supabase!.from('projects').update({ status }).eq('id', id);
      if (error) throw error;
  }

  async updateProjectPaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<void> {
    const paidAt = paymentStatus === 'paid' ? todayStr : undefined;
    
    if(this.useMock) {
       const ps = await this.getProjects();
       const updated = ps.map(p => p.id === id ? {...p, paymentStatus, paidAt} : p);
       localStorage.setItem('cgest_projects', JSON.stringify(updated));
       return;
    }
    // paidAt sendo null remove a data no banco se voltar para pendente
    const { error } = await supabase!.from('projects').update({ paymentStatus, paidAt: paidAt || null }).eq('id', id);
    if (error) throw error;
  }

  async deleteProject(id: string): Promise<void> {
      if(this.useMock) {
          const ps = await this.getProjects();
          localStorage.setItem('cgest_projects', JSON.stringify(ps.filter(p => p.id !== id)));
          return;
      }
      const { error } = await supabase!.from('projects').delete().eq('id', id);
      if(error) throw error;
  }

  // GOALS
  async getGoals(): Promise<Goal[]> {
      if (this.useMock) return JSON.parse(localStorage.getItem('cgest_goals') || '[]');
      const { data } = await supabase!.from('goals').select('*');
      return data as Goal[];
  }

  async addGoal(goal: any): Promise<void> {
      if(this.useMock) {
          const gs = await this.getGoals();
          gs.push({ ...goal, id: generateId() });
          localStorage.setItem('cgest_goals', JSON.stringify(gs));
          return;
      }
      const userId = await this.getAuthUserId();
      const payload = { ...goal, user_id: userId };
      
      const { error } = await supabase!.from('goals').insert([payload]);
      if (error) throw error;
  }

  async updateGoal(goal: Goal): Promise<void> {
      if(this.useMock) {
          const gs = await this.getGoals();
          localStorage.setItem('cgest_goals', JSON.stringify(gs.map(g => g.id === goal.id ? goal : g)));
          return;
      }
      const { error } = await supabase!.from('goals').update(goal).eq('id', goal.id);
      if (error) throw error;
  }

  async deleteGoal(id: string): Promise<void> {
      if(this.useMock) {
          const gs = await this.getGoals();
          localStorage.setItem('cgest_goals', JSON.stringify(gs.filter(g => g.id !== id)));
          return;
      }
      const { error } = await supabase!.from('goals').delete().eq('id', id);
      if (error) throw error;
  }

  // TASKS
  async getTasks(): Promise<Task[]> {
      if (this.useMock) return JSON.parse(localStorage.getItem('cgest_tasks') || '[]');
      const { data } = await supabase!.from('tasks').select('*');
      return data as Task[];
  }

  async addTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<void> {
      if(this.useMock) {
          const ts = await this.getTasks();
          ts.push({ ...task, id: generateId(), createdAt: new Date().toISOString() });
          localStorage.setItem('cgest_tasks', JSON.stringify(ts));
          return;
      }
      const userId = await this.getAuthUserId();
      const payload = { ...task, user_id: userId };

      const { error } = await supabase!.from('tasks').insert([payload]);
      if (error) throw error;
  }

  async toggleTask(id: string, isCompleted: boolean): Promise<void> {
      if(this.useMock) {
          const ts = await this.getTasks();
          const updated = ts.map(t => t.id === id ? {...t, isCompleted} : t);
          localStorage.setItem('cgest_tasks', JSON.stringify(updated));
          return;
      }
      const { error } = await supabase!.from('tasks').update({ isCompleted }).eq('id', id);
      if (error) throw error;
  }

  async deleteTask(id: string): Promise<void> {
      if(this.useMock) {
          const ts = await this.getTasks();
          localStorage.setItem('cgest_tasks', JSON.stringify(ts.filter(t => t.id !== id)));
          return;
      }
      const { error } = await supabase!.from('tasks').delete().eq('id', id);
      if (error) throw error;
  }

  // PAYMENTS
  async getPayments(): Promise<Payment[]> {
      if (this.useMock) return JSON.parse(localStorage.getItem('cgest_payments') || '[]');
      
      // Garante uso da tabela 'payments' (plural)
      const { data, error } = await supabase!.from('payments').select('*');
      return data as Payment[];
  }

  async addPayment(payment: Omit<Payment, 'id'>): Promise<void> {
      await this.upsertPayment(payment as any);
  }

  async updatePayment(payment: Payment): Promise<void> {
      if (this.useMock) {
          const ps = await this.getPayments();
          const updated = ps.map(p => p.id === payment.id ? payment : p);
          localStorage.setItem('cgest_payments', JSON.stringify(updated));
          return;
      }
      const { error } = await supabase!.from('payments').update(payment).eq('id', payment.id);
      if (error) throw error;
  }

  // --- AUTH ---
  async login(email: string, pass: string): Promise<User> {
      const { data, error } = await supabase!.auth.signInWithPassword({
          email,
          password: pass
      });

      if (error) {
          throw new Error(error.message);
      }
      
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
      if (session?.user) {
          return this.mapSupabaseUser(session.user);
      }
      return null;
  }

  async updateUser(user: User): Promise<User> {
      if(this.useMock) {
         if (user.name) localStorage.setItem('cgest_user_name', user.name);
         if (user.avatar) localStorage.setItem('cgest_user_avatar', user.avatar);
         return user;
      }
      
      const updates: any = {
          data: { name: user.name, avatar_url: user.avatar }
      };
      
      const { data, error } = await supabase!.auth.updateUser(updates);
      if (error) throw error;
      
      return this.mapSupabaseUser(data.user);
  }
}

export const dataService = new DataService();
