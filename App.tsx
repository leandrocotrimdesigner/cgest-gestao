
import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Clients from './components/Clients';
import Projects from './components/Projects';
import Goals from './components/Goals';
import Tasks from './components/Tasks';
import Login from './components/Login';
import Profile from './components/Profile'; 
import Agenda from './components/Agenda';
import { dataService } from './services/dataService';
import { Client, Project, User, Goal, Task, Payment, PaymentStatus } from './types';
import { ToastProvider } from './components/ToastContext';
import { auth } from './services/firebaseClient';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Data State
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    let mounted = true;

    // Timeout de segurança
    const safetyTimeout = setTimeout(() => {
        if (mounted && isLoading) {
            console.warn("Timeout de carregamento. Liberando interface.");
            setIsLoading(false);
        }
    }, 4000);

    // Firebase Auth Listener
    let unsubscribe = () => {};
    
    if (auth) {
        unsubscribe = auth.onAuthStateChanged(async (u: any) => {
            if (!mounted) return;
            if (u) {
                setUser({ 
                    id: u.uid, 
                    email: u.email || '', 
                    name: u.displayName || 'Usuário', 
                    avatar: u.photoURL || '' 
                });
            } else {
                // Se não houver usuário logado no Firebase, verificamos se estamos em modo Mock
                const currentUser = await dataService.getCurrentUser();
                setUser(currentUser);
            }
            setIsLoading(false);
        });
    } else {
        // Fallback para modo Mock imediato
        dataService.getCurrentUser().then(u => {
            if(mounted) setUser(u);
            setIsLoading(false);
        });
    }

    return () => {
        mounted = false;
        clearTimeout(safetyTimeout);
        unsubscribe();
    };
  }, []);

  const fetchData = async () => {
    if (!user) return;
    try {
      const results = await Promise.allSettled([
        dataService.getClients(),
        dataService.getProjects(),
        dataService.getTasks(),
        dataService.getPayments(),
        dataService.getGoals()
      ]);

      const getData = <T,>(result: PromiseSettledResult<T[]>) => {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
            return result.value;
        }
        return [];
      };

      setClients(getData(results[0]));
      setProjects(getData(results[1]));
      setTasks(getData(results[2]));
      setPayments(getData(results[3]));
      setGoals(getData(results[4]));

    } catch (error) {
      console.error("Erro geral no fetch data", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleLogin = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
        const user = await dataService.login(email, pass);
        setUser(user);
    } catch (e) {
        throw e; 
    } finally {
        setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await dataService.logout();
    setUser(null);
  };

  const handleUpdateUser = async (updatedUser: User) => {
      const savedUser = await dataService.updateUser(updatedUser);
      setUser(savedUser);
  };

  // Handlers
  const handleAddClient = async (clientData: any) => { await dataService.addClient(clientData); fetchData(); };
  const handleUpdateClient = async (clientData: Client) => { await dataService.updateClient(clientData); fetchData(); };
  const handleDeleteClient = async (id: string) => { await dataService.deleteClient(id); fetchData(); };
  
  const handleAddProject = async (projectData: any) => { await dataService.addProject(projectData); fetchData(); };
  const handleUpdateProjectStatus = async (id: string, status: any) => { await dataService.updateProjectStatus(id, status); fetchData(); };
  const handleUpdateProjectPaymentStatus = async (id: string, status: PaymentStatus) => { await dataService.updateProjectPaymentStatus(id, status); fetchData(); };
  const handleDeleteProject = async (id: string) => { await dataService.deleteProject(id); fetchData(); };
  
  const handleAddGoal = async (goalData: any) => { await dataService.addGoal(goalData); fetchData(); };
  const handleDeleteGoal = async (id: string) => { await dataService.deleteGoal(id); fetchData(); };
  const handleUpdateGoal = async (goal: Goal) => { await dataService.updateGoal(goal); fetchData(); };
  
  const handleAddTask = async (taskData: any) => { await dataService.addTask(taskData); fetchData(); };
  const handleToggleTask = async (id: string, isCompleted: boolean) => { await dataService.toggleTask(id, isCompleted); fetchData(); };
  const handleDeleteTask = async (id: string) => { await dataService.deleteTask(id); fetchData(); };
  
  const handleAddPayment = async (paymentData: any) => { await dataService.addPayment(paymentData); fetchData(); };
  const handleUpdatePayment = async (payment: Payment) => { await dataService.updatePayment(payment); fetchData(); };

  if (isLoading) {
      return (
          <div className="flex h-screen items-center justify-center bg-slate-50 flex-col gap-4">
             <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
             <p className="text-slate-500 font-medium animate-pulse">Iniciando CGest...</p>
          </div>
      );
  }

  if (!user) {
     return (
        <ToastProvider>
           <Login onLogin={handleLogin} />
        </ToastProvider>
     );
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-50 text-slate-900">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          user={user} 
          onLogout={handleLogout}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
        />

        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
          <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between md:hidden sticky top-0 z-10">
            <div className="flex items-center gap-3">
               <button onClick={() => setIsMobileOpen(true)} className="text-slate-600 hover:text-slate-900">
                 <Menu size={24} />
               </button>
               <h1 className="font-bold text-lg text-slate-800">CGest</h1>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-8 overflow-y-auto h-full">
            <div className="max-w-7xl mx-auto">
              {activeTab === 'dashboard' && (
                  <Dashboard 
                      clients={clients} 
                      projects={projects} 
                      goals={goals} 
                      tasks={tasks}
                      payments={payments}
                      onAddTask={handleAddTask}
                      onToggleTask={handleToggleTask}
                      onAddGoal={handleAddGoal}
                      onDeleteGoal={handleDeleteGoal}
                      onUpdateGoal={handleUpdateGoal}
                  />
              )}
              {activeTab === 'clients' && (
                <Clients 
                  clients={clients} 
                  payments={payments}
                  onAddClient={handleAddClient} 
                  onUpdateClient={handleUpdateClient}
                  onDeleteClient={handleDeleteClient}
                  onAddPayment={handleAddPayment}
                  onUpdatePayment={handleUpdatePayment}
                />
              )}
              {activeTab === 'projects' && (
                <Projects 
                  projects={projects} 
                  clients={clients} 
                  onAddProject={handleAddProject} 
                  onUpdateStatus={handleUpdateProjectStatus}
                  onUpdatePaymentStatus={handleUpdateProjectPaymentStatus}
                  onDeleteProject={handleDeleteProject}
                />
              )}
              {activeTab === 'agenda' && (
                <Agenda tasks={tasks} projects={projects} />
              )}
              {activeTab === 'goals' && (
                <Goals 
                  goals={goals}
                  onAddGoal={handleAddGoal}
                  onDeleteGoal={handleDeleteGoal}
                  onUpdateGoal={handleUpdateGoal}
                />
              )}
              {activeTab === 'tasks' && (
                <Tasks 
                  tasks={tasks}
                  projects={projects}
                  onAddTask={handleAddTask}
                  onToggleTask={handleToggleTask}
                  onDeleteTask={handleDeleteTask}
                />
              )}
              {activeTab === 'profile' && (
                <Profile user={user} onUpdateUser={handleUpdateUser} />
              )}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

export default App;
