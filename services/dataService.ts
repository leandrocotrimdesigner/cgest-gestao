import { Client, Project, User, Goal, Task, Payment, PaymentStatus } from '../types';
import { supabase } from './supabaseClient';

const generateId = () => Math.random().toString(36).substr(2, 9);
const todayStr = new Date().toISOString().split('T')[0];

const getPastDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
}

// --- MOCK DATA ---
const MOCK_CLIENTS: Client[] = [
  { id: '1', name: 'Tech Solutions Ltda', type: 'mensalista', status: 'active', monthlyValue: 2500, dueDay: 5, createdAt: new Date().toISOString() },
  { id: '2', name: 'Padaria do João', type: 'avulso', status: 'active', dueDay: 10, createdAt: new Date().toISOString() },
  { id: '3', name: 'Marketing Digital Pro', type: 'mensalista', status: 'inactive', monthlyValue: 5000, dueDay: 20, createdAt: new Date().toISOString() },
];

const MOCK_PROJECTS: Project[] = [
  { id: '101', clientId: '1', name: 'Manutenção Mensal Site', status: 'in_progress', paymentStatus: 'paid', paidAt: getPastDate(1), budget: 2500, createdAt: new Date().toISOString() },
  { id: '102', clientId: '2', name: 'Logo e Identidade Visual', status: 'completed', paymentStatus: 'paid', paidAt: getPastDate(3), budget: 1500, createdAt: new Date().toISOString() },
  { id: '103', clientId: '3', name: 'Gestão de Tráfego', status: 'in_progress', paymentStatus: 'pending', budget: 5000, createdAt: new Date().toISOString() },
];

const MOCK_GOALS: Goal[] = [
  { id: 'g1', description: 'Faturamento Anual 100k', targetValue: 100000, currentValue: 45000, deadline: '2024-12-31' },
];

const MOCK_TASKS: Task[] = [
  { id: 't1', title: 'Enviar nota fiscal Tech Solutions', isCompleted: false, projectId: '101', dueDate: todayStr, createdAt: new Date().toISOString() },
];

const MOCK_PAYMENTS: Payment[] = [
    { id: 'p1', clientId: '1', value: 2500, dueDate: getPastDate(2), status: 'paid', paidAt: getPastDate(2), description: 'Mensalidade Abril' },
    { id: 'p2', clientId: '3', value: 5000, dueDate: getPastDate(5), status: 'pending', description: 'Mensalidade Abril - ATRASADO' },
];

const MOCK_USER: User = {
    id: 'u1',
    email: 'admin@cgest.com',
    name: 'Admin User',
    avatar: ''
};

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
    if (!localStorage.getItem('cgest_clients')) localStorage.setItem('cgest_clients', JSON.stringify(MOCK_CLIENTS));
    if (!localStorage.getItem('cgest_projects')) localStorage.setItem('cgest_projects', JSON.stringify(MOCK_PROJECTS));
    if (!localStorage.getItem('cgest_goals')) localStorage.setItem('cgest_goals', JSON.stringify(MOCK_GOALS));
    if (!localStorage.getItem('cgest_tasks')) localStorage.setItem('cgest_tasks', JSON.stringify(MOCK_TASKS));
    if (!localStorage.getItem('cgest_payments')) localStorage.setItem('cgest_payments', JSON.stringify(MOCK_PAYMENTS));
  }

  // --- GENERIC UPSERT LOGIC FOR PAYMENTS ---
  // Verifica se existe pagamento para Cliente + Mês + Ano. Se sim, atualiza. Se não, cria.
  async upsertPayment(payment: Partial<Payment> & { clientId: string, dueDate: string }): Promise<Payment> {
    const date = new Date(payment.dueDate);
    const targetMonth = date.getMonth();
    const targetYear = date.getFullYear();

    if (this.useMock) {
        await delay(100);
        const payments: Payment[] = JSON.parse(localStorage.getItem('cgest_payments') || '[]');
        
        // Find existing payment for same Month/Year/Client (Atomic Logic)
        const existingIndex = payments.findIndex(p => {
             // If ID is provided, strict match
             if (payment.id && p.id === payment.id) return true;
             
             // Otherwise, duplicate check by date/client
             const pDate = new Date(p.dueDate);
             return p.clientId === payment.clientId && 
                    pDate.getMonth() === targetMonth && 
                    pDate.getFullYear() === targetYear;
        });

        if (existingIndex >= 0) {
            // UPDATE
            const existing = payments[existingIndex];
            const updated = { ...existing, ...payment, id: existing.id }; // Ensure ID preservation
            payments[existingIndex] = updated;
            localStorage.setItem('cgest_payments', JSON.stringify(payments));
            return updated;
        } else {
            // INSERT
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
        // Supabase Implementation (SimplifiedUpsert logic)
        // Note: Real supabase implementation would need a RPC or improved schema constraints
        throw new Error("Supabase upsert not fully implemented in this demo.");
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
      await delay(100);
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
      // Reusing logic from upsert for consistency in mock
      await this.upsertPayment(payment as any);
  }

  async updatePayment(payment: Payment): Promise<void> {
      if (this.useMock) {
          const ps = await this.getPayments();
          const updated = ps.map(p => p.id === payment.id ? payment : p);
          localStorage.setItem('cgest_payments', JSON.stringify(updated));
      }
  }

  // Auth & User

  async login(email: string, pass: string): Promise<User> {
      await delay(500);
      // For demo, accept any login
      const storedName = localStorage.getItem('cgest_user_name');
      const storedAvatar = localStorage.getItem('cgest_user_avatar');
      
      const user = { ...MOCK_USER, email };
      if (storedName) user.name = storedName;
      if (storedAvatar) user.avatar = storedAvatar;
      
      return user;
  }

  async logout(): Promise<void> {
      await delay(200);
  }

  async updateUser(user: User): Promise<User> {
      if(this.useMock) {
         if (user.name) localStorage.setItem('cgest_user_name', user.name);
         if (user.avatar) localStorage.setItem('cgest_user_avatar', user.avatar);
         return user;
      }
      return user;
  }

}

export const dataService = new DataService();