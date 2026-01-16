
import { Client, Project, User, Goal, Task, Payment, PaymentStatus } from '../types';
import { supabase } from './supabaseClient';

const generateId = () => Math.random().toString(36).substr(2, 9);
const todayStr = new Date().toISOString().split('T')[0];

const getPastDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
}

// --- MOCK DATA (Fallback apenas para estruturas, não para Auth) ---
const MOCK_CLIENTS: Client[] = [];
const MOCK_PROJECTS: Project[] = [];
const MOCK_GOALS: Goal[] = [];
const MOCK_TASKS: Task[] = [];
const MOCK_PAYMENTS: Payment[] = [];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class DataService {
  private useMock: boolean;

  constructor() {
    // Em produção, queremos que o Supabase esteja sempre ativo.
    // Se falhar a conexão, o useMock evita crash, mas o login será bloqueado.
    this.useMock = !supabase;
    if (this.useMock) {
      this.initLocalStore();
    }
  }

  private initLocalStore() {
    if (!localStorage.getItem('cgest_clients')) localStorage.setItem('cgest_clients', JSON.stringify(MOCK_CLIENTS));
    if (!localStorage.getItem('cgest_projects')) localStorage.setItem('cgest_projects', JSON.stringify(MOCK_PROJECTS));
    if (!localStorage.getItem('cgest_goals')) localStorage.setItem('cgest_goals', JSON.stringify(MOCK_GOALS));
    if (!localStorage.getItem('cgest_tasks')) localStorage.setItem('cgest_tasks', JSON.stringify(MOCK_TASKS));
    if (!localStorage.getItem('cgest_payments')) localStorage.setItem('cgest_payments', JSON.stringify(MOCK_PAYMENTS));
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
        // Feature futura: Implementar RPC no Supabase para upsert real
        throw new Error("Funcionalidade de Upsert via API pendente de implementação no Backend.");
    }
  }

  // --- BACKUP ---
  async getBackupData(): Promise<any> {
      if (this.useMock) {
          return {
              clients: JSON.parse(localStorage.getItem('cgest_clients') || '[]'),
              projects: JSON.parse(localStorage.getItem('cgest_projects') || '[]'),
              goals: JSON.parse(localStorage.getItem('cgest_goals') || '[]'),
              tasks: JSON.parse(localStorage.getItem('cgest_tasks') || '[]'),
              payments: JSON.parse(localStorage.getItem('cgest_payments') || '[]'),
              user: {
                  name: localStorage.getItem('cgest_user_name'),
                  avatar: localStorage.getItem('cgest_user_avatar')
              },
              timestamp: new Date().toISOString()
          };
      }
      return null;
  }

  async restoreBackupData(data: any): Promise<void> {
      if (this.useMock && data) {
          if(Array.isArray(data.clients)) localStorage.setItem('cgest_clients', JSON.stringify(data.clients));
          if(Array.isArray(data.projects)) localStorage.setItem('cgest_projects', JSON.stringify(data.projects));
          if(Array.isArray(data.goals)) localStorage.setItem('cgest_goals', JSON.stringify(data.goals));
          if(Array.isArray(data.tasks)) localStorage.setItem('cgest_tasks', JSON.stringify(data.tasks));
          if(Array.isArray(data.payments)) localStorage.setItem('cgest_payments', JSON.stringify(data.payments));
          
          if(data.user) {
              if(data.user.name) localStorage.setItem('cgest_user_name', data.user.name);
              if(data.user.avatar) localStorage.setItem('cgest_user_avatar', data.user.avatar);
          }
      }
  }

  // --- CRUD WRAPPERS ---
  
  async getClients(): Promise<Client[]> {
    if (this.useMock) {
      return JSON.parse(localStorage.getItem('cgest_clients') || '[]');
    }
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
    const { data, error } = await supabase!.from('clients').insert([client]).select().single();
    if (error) throw error;
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

      // Cascade Delete
      const payments = await this.getPayments();
      localStorage.setItem('cgest_payments', JSON.stringify(payments.filter(p => p.clientId !== id)));

      const projects = await this.getProjects();
      const clientProjects = projects.filter(p => p.clientId === id);
      const clientProjectIds = new Set(clientProjects.map(p => p.id));
      
      localStorage.setItem('cgest_projects', JSON.stringify(projects.filter(p => p.clientId !== id)));
      
      const tasks = await this.getTasks();
      localStorage.setItem('cgest_tasks', JSON.stringify(tasks.filter(t => !t.projectId || !clientProjectIds.has(t.projectId))));
      
      return;
    }
    const { error } = await supabase!.from('clients').delete().eq('id', id);
    if(error) throw error;
  }

  // Projects

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
    return {} as Project;
  }

  async updateProjectStatus(id: string, status: any): Promise<void> {
      if(this.useMock) {
          const ps = await this.getProjects();
          const updated = ps.map(p => p.id === id ? {...p, status} : p);
          localStorage.setItem('cgest_projects', JSON.stringify(updated));
      }
  }

  async updateProjectPaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<void> {
    const paidAt = paymentStatus === 'paid' ? todayStr : undefined;
    if(this.useMock) {
       const ps = await this.getProjects();
       const updated = ps.map(p => p.id === id ? {...p, paymentStatus, paidAt} : p);
       localStorage.setItem('cgest_projects', JSON.stringify(updated));
    }
  }

  async deleteProject(id: string): Promise<void> {
      if(this.useMock) {
          const ps = await this.getProjects();
          localStorage.setItem('cgest_projects', JSON.stringify(ps.filter(p => p.id !== id)));
      }
  }

  // Goals

  async getGoals(): Promise<Goal[]> {
      return this.useMock ? JSON.parse(localStorage.getItem('cgest_goals') || '[]') : [];
  }

  async addGoal(goal: any): Promise<void> {
      if(this.useMock) {
          const gs = await this.getGoals();
          gs.push({ ...goal, id: generateId() });
          localStorage.setItem('cgest_goals', JSON.stringify(gs));
      }
  }

  async updateGoal(goal: Goal): Promise<void> {
      if(this.useMock) {
          const gs = await this.getGoals();
          localStorage.setItem('cgest_goals', JSON.stringify(gs.map(g => g.id === goal.id ? goal : g)));
      }
  }

  async deleteGoal(id: string): Promise<void> {
      if(this.useMock) {
          const gs = await this.getGoals();
          localStorage.setItem('cgest_goals', JSON.stringify(gs.filter(g => g.id !== id)));
      }
  }

  // Tasks

  async getTasks(): Promise<Task[]> {
      if (this.useMock) return JSON.parse(localStorage.getItem('cgest_tasks') || '[]');
      return [];
  }

  async addTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<void> {
      if(this.useMock) {
          const ts = await this.getTasks();
          ts.push({ ...task, id: generateId(), createdAt: new Date().toISOString() });
          localStorage.setItem('cgest_tasks', JSON.stringify(ts));
      }
  }

  async toggleTask(id: string, isCompleted: boolean): Promise<void> {
      if(this.useMock) {
          const ts = await this.getTasks();
          const updated = ts.map(t => t.id === id ? {...t, isCompleted} : t);
          localStorage.setItem('cgest_tasks', JSON.stringify(updated));
      }
  }

  async deleteTask(id: string): Promise<void> {
      if(this.useMock) {
          const ts = await this.getTasks();
          localStorage.setItem('cgest_tasks', JSON.stringify(ts.filter(t => t.id !== id)));
      }
  }

  // Payments

  async getPayments(): Promise<Payment[]> {
      if (this.useMock) return JSON.parse(localStorage.getItem('cgest_payments') || '[]');
      return [];
  }

  async addPayment(payment: Omit<Payment, 'id'>): Promise<void> {
      await this.upsertPayment(payment as any);
  }

  async updatePayment(payment: Payment): Promise<void> {
      if (this.useMock) {
          const ps = await this.getPayments();
          const updated = ps.map(p => p.id === payment.id ? payment : p);
          localStorage.setItem('cgest_payments', JSON.stringify(updated));
      }
  }

  // --- AUTH REAL (PRODUÇÃO) ---

  async login(email: string, pass: string): Promise<User> {
      // Bloqueia login se o Supabase não estiver configurado corretamente
      if (this.useMock) {
          throw new Error("Erro de Configuração: Backend de autenticação indisponível.");
      }

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
