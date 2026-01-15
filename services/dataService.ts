
import { Client, Project, User, Goal, Task, Payment, PaymentStatus } from '../types';
import { supabase } from './supabaseClient';

// --- MOCK DATA GENERATOR ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const todayStr = new Date().toISOString().split('T')[0];

// Helper to get past date string
const getPastDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
}

const MOCK_CLIENTS: Client[] = [
  { id: '1', name: 'Tech Solutions Ltda', type: 'mensalista', status: 'active', monthlyValue: 2500, dueDay: 5, createdAt: new Date().toISOString() },
  { id: '2', name: 'Padaria do João', type: 'avulso', status: 'active', dueDay: 10, createdAt: new Date().toISOString() },
  { id: '3', name: 'Marketing Digital Pro', type: 'mensalista', status: 'inactive', monthlyValue: 5000, dueDay: 20, createdAt: new Date().toISOString() },
];

const MOCK_PROJECTS: Project[] = [
  { id: '101', clientId: '1', name: 'Manutenção Mensal Site', status: 'in_progress', paymentStatus: 'paid', paidAt: getPastDate(1), budget: 2500, createdAt: new Date().toISOString() },
  { id: '102', clientId: '2', name: 'Logo e Identidade Visual', status: 'completed', paymentStatus: 'paid', paidAt: getPastDate(3), budget: 1500, createdAt: new Date().toISOString() },
  { id: '103', clientId: '3', name: 'Gestão de Tráfego', status: 'in_progress', paymentStatus: 'pending', budget: 5000, createdAt: new Date().toISOString() },
  { id: '104', clientId: '2', name: 'Cardápio Digital', status: 'pending', paymentStatus: 'pending', budget: 800, createdAt: new Date().toISOString() },
];

const MOCK_GOALS: Goal[] = [
  { id: 'g1', description: 'Faturamento Anual 100k', targetValue: 100000, currentValue: 45000, deadline: '2024-12-31' },
  { id: 'g2', description: 'Reserva de Emergência', targetValue: 20000, currentValue: 15000 },
];

const MOCK_TASKS: Task[] = [
  { id: 't1', title: 'Enviar nota fiscal Tech Solutions', isCompleted: false, projectId: '101', dueDate: todayStr, createdAt: new Date().toISOString() },
  { id: 't2', title: 'Comprar domínio novo cliente', isCompleted: true, dueDate: todayStr, createdAt: new Date().toISOString() },
  { id: 't3', title: 'Reunião de alinhamento', isCompleted: false, projectId: '103', createdAt: new Date().toISOString(), isMeeting: true, meetingTime: '14:30' },
];

const MOCK_PAYMENTS: Payment[] = [
    { id: 'p1', clientId: '1', value: 2500, dueDate: getPastDate(2), status: 'paid', paidAt: getPastDate(2), description: 'Mensalidade Abril' },
    { id: 'p2', clientId: '3', value: 5000, dueDate: getPastDate(5), status: 'pending', description: 'Mensalidade Abril - ATRASADO' },
    { id: 'p3', clientId: '2', value: 1500, dueDate: todayStr, status: 'pending', description: 'Logo Final' },
    { id: 'p4', clientId: '1', value: 2500, dueDate: getPastDate(35), status: 'paid', paidAt: getPastDate(36), description: 'Mensalidade Março' },
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- GOOGLE CALENDAR SYNC PREPARATION ---
const syncWithGoogleCalendar = (task: Task) => {
  if (task.isMeeting) {
      console.log("--------------------------------------------------");
      console.log("INTEGRAÇÃO AGENDA: Dados prontos para envio");
      console.log(`Evento: ${task.title}`);
      console.log(`Data: ${task.dueDate}`);
      console.log(`Horário: ${task.meetingTime}`);
      console.log("ID do Projeto:", task.projectId || 'N/A');
      console.log("--------------------------------------------------");
      // Aqui entraria a chamada real para a API do Google Calendar
  }
};

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

  // --- BACKUP & SYSTEM ---
  
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
          // Validate and restore each key if it is an array or valid object
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

  async clearSystemData(userRole: string): Promise<void> {
      // Future-proofing: Check role
      // In a real scenario: if (userRole !== 'admin') throw new Error('Unauthorized');
      
      console.log(`[System] Cleaning data requested by role: ${userRole}`);
      
      if (this.useMock) {
          // Removes only app specific data to avoid clearing other localhost things
          localStorage.removeItem('cgest_clients');
          localStorage.removeItem('cgest_projects');
          localStorage.removeItem('cgest_goals');
          localStorage.removeItem('cgest_tasks');
          localStorage.removeItem('cgest_payments');
          // Optionally keep user session or clear it too. 
          // Request said "Clear All Data", usually implies business data.
          // Let's clear everything related to the app logic.
          localStorage.removeItem('cgest_user_name');
          localStorage.removeItem('cgest_user_avatar');
      }
  }

  // --- CLIENTS ---
  async getClients(): Promise<Client[]> {
    if (this.useMock) {
      await delay(200);
      return JSON.parse(localStorage.getItem('cgest_clients') || '[]');
    }
    const { data, error } = await supabase!.from('clients').select('*');
    if (error) throw error;
    return data as Client[];
  }

  async addClient(client: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
    if (this.useMock) {
      await delay(200);
      const newClient: Client = { ...client, id: generateId(), createdAt: new Date().toISOString() };
      const clients = JSON.parse(localStorage.getItem('cgest_clients') || '[]');
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
      await delay(200);
      const clients = JSON.parse(localStorage.getItem('cgest_clients') || '[]');
      const updated = clients.map((c: Client) => c.id === client.id ? client : c);
      localStorage.setItem('cgest_clients', JSON.stringify(updated));
      return;
    }
    const { error } = await supabase!.from('clients').update(client).eq('id', client.id);
    if (error) throw error;
  }

  async deleteClient(id: string): Promise<void> {
    if(this.useMock) {
      const clients = JSON.parse(localStorage.getItem('cgest_clients') || '[]');
      const filtered = clients.filter((c: Client) => c.id !== id);
      localStorage.setItem('cgest_clients', JSON.stringify(filtered));
      return;
    }
    const { error } = await supabase!.from('clients').delete().eq('id', id);
    if(error) throw error;
  }

  // --- PROJECTS ---
  async getProjects(): Promise<Project[]> {
    if (this.useMock) {
      await delay(200);
      return JSON.parse(localStorage.getItem('cgest_projects') || '[]');
    }
    const { data, error } = await supabase!.from('projects').select('*');
    if (error) throw error;
    return data as Project[];
  }

  async addProject(project: Omit<Project, 'id' | 'createdAt'>): Promise<Project> {
    if (this.useMock) {
      await delay(200);
      const newProject: Project = { ...project, id: generateId(), createdAt: new Date().toISOString() };
      const projects = JSON.parse(localStorage.getItem('cgest_projects') || '[]');
      projects.push(newProject);
      localStorage.setItem('cgest_projects', JSON.stringify(projects));
      return newProject;
    }
    const { data, error } = await supabase!.from('projects').insert([project]).select().single();
    if (error) throw error;
    return data as Project;
  }

  async updateProjectStatus(id: string, status: Project['status']): Promise<void> {
    if(this.useMock) {
       const projects = JSON.parse(localStorage.getItem('cgest_projects') || '[]');
       const updated = projects.map((p: Project) => p.id === id ? {...p, status} : p);
       localStorage.setItem('cgest_projects', JSON.stringify(updated));
       return;
    }
    const { error } = await supabase!.from('projects').update({ status }).eq('id', id);
    if(error) throw error;
  }

  async updateProjectPaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<void> {
    const paidAt = paymentStatus === 'paid' ? new Date().toISOString().split('T')[0] : null;

    if(this.useMock) {
       const projects = JSON.parse(localStorage.getItem('cgest_projects') || '[]');
       const updated = projects.map((p: Project) => p.id === id ? {...p, paymentStatus, paidAt: paidAt || undefined } : p);
       localStorage.setItem('cgest_projects', JSON.stringify(updated));
       return;
    }
    const { error } = await supabase!.from('projects').update({ paymentStatus, paidAt }).eq('id', id);
    if(error) throw error;
  }

  async deleteProject(id: string): Promise<void> {
    if(this.useMock) {
      const projects = JSON.parse(localStorage.getItem('cgest_projects') || '[]');
      const filtered = projects.filter((p: Project) => p.id !== id);
      localStorage.setItem('cgest_projects', JSON.stringify(filtered));
      return;
    }
    const { error } = await supabase!.from('projects').delete().eq('id', id);
    if(error) throw error;
  }

  // --- GOALS ---
  async getGoals(): Promise<Goal[]> {
    if (this.useMock) {
      await delay(200);
      return JSON.parse(localStorage.getItem('cgest_goals') || '[]');
    }
    const { data, error } = await supabase!.from('goals').select('*');
    if (error) throw error;
    return data as Goal[];
  }

  async addGoal(goal: Omit<Goal, 'id'>): Promise<Goal> {
    if (this.useMock) {
      await delay(200);
      const newGoal = { ...goal, id: generateId() };
      const goals = JSON.parse(localStorage.getItem('cgest_goals') || '[]');
      goals.push(newGoal);
      localStorage.setItem('cgest_goals', JSON.stringify(goals));
      return newGoal;
    }
    const { data, error } = await supabase!.from('goals').insert([goal]).select().single();
    if (error) throw error;
    return data as Goal;
  }

  async deleteGoal(id: string): Promise<void> {
    if (this.useMock) {
      const goals = JSON.parse(localStorage.getItem('cgest_goals') || '[]');
      const filtered = goals.filter((g: Goal) => g.id !== id);
      localStorage.setItem('cgest_goals', JSON.stringify(filtered));
      return;
    }
    const { error } = await supabase!.from('goals').delete().eq('id', id);
    if (error) throw error;
  }

  async updateGoal(goal: Goal): Promise<void> {
    if (this.useMock) {
      const goals = JSON.parse(localStorage.getItem('cgest_goals') || '[]');
      const updated = goals.map((g: Goal) => g.id === goal.id ? goal : g);
      localStorage.setItem('cgest_goals', JSON.stringify(updated));
      return;
    }
    const { error } = await supabase!.from('goals').update(goal).eq('id', goal.id);
    if (error) throw error;
  }

  // --- TASKS ---
  async getTasks(): Promise<Task[]> {
    if (this.useMock) {
      await delay(200);
      return JSON.parse(localStorage.getItem('cgest_tasks') || '[]');
    }
    const { data, error } = await supabase!.from('tasks').select('*');
    if (error) throw error;
    return data as Task[];
  }

  async addTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
    let newTask: Task;
    if (this.useMock) {
      await delay(200);
      newTask = { ...task, id: generateId(), createdAt: new Date().toISOString() };
      const tasks = JSON.parse(localStorage.getItem('cgest_tasks') || '[]');
      tasks.push(newTask);
      localStorage.setItem('cgest_tasks', JSON.stringify(tasks));
    } else {
      const { data, error } = await supabase!.from('tasks').insert([task]).select().single();
      if (error) throw error;
      newTask = data as Task;
    }
    
    // Trigger integration placeholder
    syncWithGoogleCalendar(newTask);
    
    return newTask;
  }

  async toggleTask(id: string, isCompleted: boolean): Promise<void> {
    if (this.useMock) {
      const tasks = JSON.parse(localStorage.getItem('cgest_tasks') || '[]');
      const updated = tasks.map((t: Task) => t.id === id ? {...t, isCompleted} : t);
      localStorage.setItem('cgest_tasks', JSON.stringify(updated));
      return;
    }
    const { error } = await supabase!.from('tasks').update({ isCompleted }).eq('id', id);
    if (error) throw error;
  }

  async deleteTask(id: string): Promise<void> {
    if (this.useMock) {
      const tasks = JSON.parse(localStorage.getItem('cgest_tasks') || '[]');
      const filtered = tasks.filter((t: Task) => t.id !== id);
      localStorage.setItem('cgest_tasks', JSON.stringify(filtered));
      return;
    }
    const { error } = await supabase!.from('tasks').delete().eq('id', id);
    if (error) throw error;
  }

  // --- PAYMENTS ---
  async getPayments(): Promise<Payment[]> {
    if (this.useMock) {
        await delay(200);
        return JSON.parse(localStorage.getItem('cgest_payments') || '[]');
    }
    const { data, error } = await supabase!.from('payments').select('*');
    if (error) throw error;
    return data as Payment[];
  }

  async addPayment(payment: Omit<Payment, 'id'>): Promise<Payment> {
    if (this.useMock) {
        await delay(200);
        const newPayment = { ...payment, id: generateId() };
        const payments = JSON.parse(localStorage.getItem('cgest_payments') || '[]');
        payments.push(newPayment);
        localStorage.setItem('cgest_payments', JSON.stringify(payments));
        return newPayment;
    }
    const { data, error } = await supabase!.from('payments').insert([payment]).select().single();
    if (error) throw error;
    return data as Payment;
  }

  async updatePayment(payment: Payment): Promise<void> {
    if (this.useMock) {
        const payments = JSON.parse(localStorage.getItem('cgest_payments') || '[]');
        const updated = payments.map((p: Payment) => p.id === payment.id ? payment : p);
        localStorage.setItem('cgest_payments', JSON.stringify(updated));
        return;
    }
    const { error } = await supabase!.from('payments').update(payment).eq('id', payment.id);
    if(error) throw error;
  }

  async deletePayment(id: string): Promise<void> {
     if(this.useMock) {
         const payments = JSON.parse(localStorage.getItem('cgest_payments') || '[]');
         const filtered = payments.filter((p: Payment) => p.id !== id);
         localStorage.setItem('cgest_payments', JSON.stringify(filtered));
         return;
     }
     const { error } = await supabase!.from('payments').delete().eq('id', id);
     if(error) throw error;
  }

  // --- AUTH ---
  async login(email: string, password: string): Promise<User> {
    if(this.useMock) {
      await delay(500);
      if(email && password) {
        const savedName = localStorage.getItem('cgest_user_name');
        const savedAvatar = localStorage.getItem('cgest_user_avatar');
        return { 
          id: 'user_123', 
          email, 
          name: savedName || 'Usuário Demo',
          avatar: savedAvatar || undefined
        };
      }
      throw new Error('Credenciais inválidas');
    }
    const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
    if(error) throw error;
    return { id: data.user.id, email: data.user.email!, name: data.user.user_metadata.name };
  }

  async logout(): Promise<void> {
    if(this.useMock) return;
    await supabase!.auth.signOut();
  }

  async updateUser(user: User): Promise<User> {
    if(this.useMock) {
        await delay(500);
        localStorage.setItem('cgest_user_name', user.name || '');
        if (user.avatar) {
           localStorage.setItem('cgest_user_avatar', user.avatar);
        }
        return user;
    }
    const { data, error } = await supabase!.auth.updateUser({
        data: { name: user.name, avatar: user.avatar }
    });
    if (error) throw error;
    return { 
        id: data.user.id, 
        email: data.user.email!, 
        name: data.user.user_metadata.name,
        avatar: data.user.user_metadata.avatar 
    };
  }
}

export const dataService = new DataService();
