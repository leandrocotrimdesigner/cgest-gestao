
import { Client, Project, User, Goal, Task, Payment, PaymentStatus } from '../types';
import { db, auth, googleProvider, isConfigured } from './firebaseClient';
import { 
    collection, 
    addDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc, 
    doc, 
    query, 
    where 
} from 'firebase/firestore';
import { 
    signInWithPopup, 
    signOut, 
    updateProfile 
} from 'firebase/auth';

const generateId = () => Math.random().toString(36).substr(2, 9);
const FALLBACK_USER_ID = '65a99752-aa5e-46c4-a7c0-18dd286e89e0';

class DataService {
  private useMock: boolean;

  constructor() {
    this.useMock = !isConfigured || !db;
    
    if (this.useMock) {
      console.warn("DataService: Firebase não detectado, usando LocalStorage.");
      this.initLocalStore();
    } else {
      console.log("DataService: Conectado ao Firestore.");
    }
  }

  private initLocalStore() {
    if (!localStorage.getItem('cgest_clients')) localStorage.setItem('cgest_clients', '[]');
    if (!localStorage.getItem('cgest_projects')) localStorage.setItem('cgest_projects', '[]');
    if (!localStorage.getItem('cgest_goals')) localStorage.setItem('cgest_goals', '[]');
    if (!localStorage.getItem('cgest_tasks')) localStorage.setItem('cgest_tasks', '[]');
    if (!localStorage.getItem('cgest_payments')) localStorage.setItem('cgest_payments', '[]');
  }

  // --- HELPERS ---
  
  private getCurrentUserId(): string {
      if (this.useMock) return FALLBACK_USER_ID;
      
      const uid = auth?.currentUser?.uid;
      if (!uid) {
          throw new Error("Usuário não autenticado. Operação abortada por segurança.");
      }
      return uid;
  }

  // --- CLIENTS (Firestore Collection: clients) ---
  
  async getClients(): Promise<Client[]> {
    if (this.useMock) return JSON.parse(localStorage.getItem('cgest_clients') || '[]');
    
    try {
        const userId = this.getCurrentUserId();
        const q = query(collection(db, 'clients'), where("userId", "==", userId));
        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Client[];
    } catch (e) {
        console.error("Erro getClients:", e);
        return [];
    }
  }

  async addClient(client: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
    const userId = this.getCurrentUserId();
    const now = new Date().toISOString();
    
    const payload = {
        name: client.name,
        type: client.type,
        status: client.status,
        monthlyValue: client.monthlyValue || 0,
        dueDay: client.dueDay || null,
        driveFolderUrl: client.driveFolderUrl || '',
        createdAt: now,
        userId: userId // VÍNCULO OBRIGATÓRIO
    };

    if (this.useMock) {
      const newClient = { ...payload, id: generateId() };
      const current = JSON.parse(localStorage.getItem('cgest_clients') || '[]');
      localStorage.setItem('cgest_clients', JSON.stringify([...current, newClient]));
      return newClient;
    }

    try {
        const docRef = await addDoc(collection(db, 'clients'), payload);
        return { id: docRef.id, ...payload } as Client;
    } catch (error: any) {
        console.error("Erro addClient Firestore:", error);
        throw error;
    }
  }

  async updateClient(client: Client): Promise<void> {
       if(this.useMock) {
          const current = JSON.parse(localStorage.getItem('cgest_clients') || '[]');
          const updated = current.map((c: Client) => c.id === client.id ? client : c);
          localStorage.setItem('cgest_clients', JSON.stringify(updated));
          return;
       }
       
       // Não precisamos reenviar o userId no update se as regras permitirem isOwner
       await updateDoc(doc(db, 'clients', client.id), { ...client });
  }

  async deleteClient(id: string): Promise<void> {
    if(this.useMock) {
        const current = JSON.parse(localStorage.getItem('cgest_clients') || '[]');
        localStorage.setItem('cgest_clients', JSON.stringify(current.filter((c: Client) => c.id !== id)));
        return;
    }
    await deleteDoc(doc(db, 'clients', id));
  }

  // --- PROJECTS (Firestore Collection: projects) ---
  
  async getProjects(): Promise<Project[]> {
    if (this.useMock) return JSON.parse(localStorage.getItem('cgest_projects') || '[]');
    try {
        const q = query(collection(db, 'projects'), where("userId", "==", this.getCurrentUserId()));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[];
    } catch { return []; }
  }

  async addProject(project: any): Promise<Project> {
      const userId = this.getCurrentUserId();
      const payload = { 
          ...project, 
          userId, 
          createdAt: new Date().toISOString() 
      };
      
      if (this.useMock) {
         const newP = { ...payload, id: generateId() };
         const list = JSON.parse(localStorage.getItem('cgest_projects') || '[]');
         localStorage.setItem('cgest_projects', JSON.stringify([...list, newP]));
         return newP;
      }
      
      const docRef = await addDoc(collection(db, 'projects'), payload);
      return { id: docRef.id, ...payload };
  }

  async updateProjectStatus(id: string, status: any): Promise<void> {
      if(!this.useMock) await updateDoc(doc(db, 'projects', id), { status });
      else {
          const list = JSON.parse(localStorage.getItem('cgest_projects') || '[]');
          const updated = list.map((p: Project) => p.id === id ? { ...p, status } : p);
          localStorage.setItem('cgest_projects', JSON.stringify(updated));
      }
  }
  
  async updateProjectPaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<void> { 
      if(!this.useMock) {
          const updateData: any = { paymentStatus };
          if (paymentStatus === 'paid') updateData.paidAt = new Date().toISOString().split('T')[0];
          await updateDoc(doc(db, 'projects', id), updateData);
      } else {
          const list = JSON.parse(localStorage.getItem('cgest_projects') || '[]');
          const updated = list.map((p: Project) => p.id === id ? { ...p, paymentStatus } : p);
          localStorage.setItem('cgest_projects', JSON.stringify(updated));
      }
  }
  
  async deleteProject(id: string): Promise<void> { 
      if(!this.useMock) await deleteDoc(doc(db, 'projects', id));
      else {
          const list = JSON.parse(localStorage.getItem('cgest_projects') || '[]');
          localStorage.setItem('cgest_projects', JSON.stringify(list.filter((p: Project) => p.id !== id)));
      }
  }

  // --- GOALS (Firestore Collection: goals) ---
  
  async getGoals(): Promise<Goal[]> {
      if (this.useMock) return JSON.parse(localStorage.getItem('cgest_goals') || '[]');
      try {
        const q = query(collection(db, 'goals'), where("userId", "==", this.getCurrentUserId()));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Goal[];
      } catch { return []; }
  }
  
  async addGoal(goal: any): Promise<void> {
      const userId = this.getCurrentUserId();
      const payload = { ...goal, userId };
      
      if (!this.useMock) {
          await addDoc(collection(db, 'goals'), payload);
      } else {
          const list = JSON.parse(localStorage.getItem('cgest_goals') || '[]');
          localStorage.setItem('cgest_goals', JSON.stringify([...list, { ...payload, id: generateId() }]));
      }
  }
  
  async updateGoal(goal: Goal): Promise<void> {
      if (!this.useMock) {
          await updateDoc(doc(db, 'goals', goal.id), { ...goal });
      } else {
          const list = JSON.parse(localStorage.getItem('cgest_goals') || '[]');
          const updated = list.map((g: Goal) => g.id === goal.id ? goal : g);
          localStorage.setItem('cgest_goals', JSON.stringify(updated));
      }
  }
  
  async deleteGoal(id: string): Promise<void> {
      if (!this.useMock) await deleteDoc(doc(db, 'goals', id));
      else {
          const list = JSON.parse(localStorage.getItem('cgest_goals') || '[]');
          localStorage.setItem('cgest_goals', JSON.stringify(list.filter((g: Goal) => g.id !== id)));
      }
  }

  // --- TASKS (Firestore Collection: tasks) ---
  
  async getTasks(): Promise<Task[]> {
      if (this.useMock) return JSON.parse(localStorage.getItem('cgest_tasks') || '[]');
      try {
        const q = query(collection(db, 'tasks'), where("userId", "==", this.getCurrentUserId()));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Task[];
      } catch { return []; }
  }
  
  async addTask(task: any): Promise<void> {
    const userId = this.getCurrentUserId();
    const payload = { 
        ...task, 
        userId, 
        createdAt: new Date().toISOString() 
    };

    if (this.useMock) {
        const list = JSON.parse(localStorage.getItem('cgest_tasks') || '[]');
        localStorage.setItem('cgest_tasks', JSON.stringify([...list, { ...payload, id: generateId() }]));
        return;
    }
    
    try {
        await addDoc(collection(db, 'tasks'), payload);
    } catch(e: any) {
        console.error("[DataService] Erro addTask Firestore:", e);
        throw new Error(`Erro ao salvar tarefa: ${e.message}`);
    }
  }
  
  async toggleTask(id: string, isCompleted: boolean): Promise<void> {
      if (!this.useMock) {
          await updateDoc(doc(db, 'tasks', id), { isCompleted });
      } else {
          const list = JSON.parse(localStorage.getItem('cgest_tasks') || '[]');
          const updated = list.map((t: Task) => t.id === id ? { ...t, isCompleted } : t);
          localStorage.setItem('cgest_tasks', JSON.stringify(updated));
      }
  }
  
  async deleteTask(id: string): Promise<void> {
      if (!this.useMock) {
          await deleteDoc(doc(db, 'tasks', id));
      } else {
          const list = JSON.parse(localStorage.getItem('cgest_tasks') || '[]');
          localStorage.setItem('cgest_tasks', JSON.stringify(list.filter((t: Task) => t.id !== id)));
      }
  }

  // --- PAYMENTS (Firestore Collection: payments) ---
  
  async getPayments(): Promise<Payment[]> {
      if (this.useMock) return JSON.parse(localStorage.getItem('cgest_payments') || '[]');
      try {
        const q = query(collection(db, 'payments'), where("userId", "==", this.getCurrentUserId()));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Payment[];
      } catch { return []; }
  }
  
  async addPayment(payment: any): Promise<void> {
      const userId = this.getCurrentUserId();
      const payload = { ...payment, userId };
      
      if(!this.useMock) {
          await addDoc(collection(db, 'payments'), payload);
      } else {
          const list = JSON.parse(localStorage.getItem('cgest_payments') || '[]');
          localStorage.setItem('cgest_payments', JSON.stringify([...list, { ...payload, id: generateId() }]));
      }
  }
  
  async updatePayment(payment: Payment): Promise<void> {
      if(!this.useMock) {
         await updateDoc(doc(db, 'payments', payment.id), { ...payment });
      } else {
          const list = JSON.parse(localStorage.getItem('cgest_payments') || '[]');
          const updated = list.map((p: Payment) => p.id === payment.id ? payment : p);
          localStorage.setItem('cgest_payments', JSON.stringify(updated));
      }
  }

  // --- AUTH (Google Only) ---
  
  async loginWithGoogle(): Promise<User> {
      if (this.useMock) {
          return { id: FALLBACK_USER_ID, email: 'mock@cgest.com', name: 'Usuário Local' };
      }
      try {
          const result = await signInWithPopup(auth, googleProvider);
          const u = result.user;
          return { 
              id: u.uid, 
              email: u.email || '', 
              name: u.displayName || 'Usuário', 
              avatar: u.photoURL || '' 
          };
      } catch (error: any) {
          console.error("Erro no login Google:", error);
          throw error;
      }
  }

  async logout(): Promise<void> {
      if (this.useMock) return;
      await signOut(auth);
  }

  async getCurrentUser(): Promise<User | null> {
      if (this.useMock) return { id: FALLBACK_USER_ID, email: 'admin@local.com', name: 'Admin Local' };
      
      return new Promise((resolve) => {
          if (!auth) { resolve(null); return; }
          const unsubscribe = auth.onAuthStateChanged((u: any) => {
              if (u) {
                  resolve({ id: u.uid, email: u.email || '', name: u.displayName || 'Usuário', avatar: u.photoURL || '' });
              } else {
                  resolve(null);
              }
              unsubscribe();
          });
      });
  }

  async updateUser(user: User): Promise<User> {
      if (!this.useMock && auth.currentUser) {
          await updateProfile(auth.currentUser, { displayName: user.name, photoURL: user.avatar });
          return user;
      }
      return user;
  }

  // --- BACKUP & RESTORE ---
  
  async getBackupData(): Promise<any> {
    const clients = await this.getClients();
    const projects = await this.getProjects();
    const tasks = await this.getTasks();
    const payments = await this.getPayments();
    const goals = await this.getGoals();

    return {
        clients,
        projects,
        tasks,
        payments,
        goals,
        timestamp: new Date().toISOString()
    };
  }

  async restoreBackupData(backup: any): Promise<void> {
    if (!this.useMock) {
        console.warn("Restauração não disponível diretamente no Firebase por segurança.");
        return;
    }
    
    if (backup.clients) localStorage.setItem('cgest_clients', JSON.stringify(backup.clients));
    if (backup.projects) localStorage.setItem('cgest_projects', JSON.stringify(backup.projects));
    if (backup.tasks) localStorage.setItem('cgest_tasks', JSON.stringify(backup.tasks));
    if (backup.payments) localStorage.setItem('cgest_payments', JSON.stringify(backup.payments));
  }
}

export const dataService = new DataService();
