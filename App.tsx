
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

  // Check auth check on mount
  useEffect(() => {
    // In a real app with supabase, we would check the session here.
    setIsLoading(false);
  }, []);

  const fetchData = async () => {
    try {
      const [fetchedClients, fetchedProjects, fetchedGoals, fetchedTasks, fetchedPayments] = await Promise.all([
        dataService.getClients(),
        dataService.getProjects(),
        dataService.getGoals(),
        dataService.getTasks(),
        dataService.getPayments()
      ]);
      setClients(fetchedClients);
      setProjects(fetchedProjects);
      setGoals(fetchedGoals);
      setTasks(fetchedTasks);
      setPayments(fetchedPayments);
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleLogin = async (email: string, pass: string) => {
    const user = await dataService.login(email, pass);
    setUser(user);
  };

  const handleLogout = async () => {
    await dataService.logout();
    setUser(null);
  };

  const handleUpdateUser = async (updatedUser: User) => {
      const savedUser = await dataService.updateUser(updatedUser);
      setUser(savedUser);
  };

  // --- Handlers ---

  const handleAddClient = async (clientData: any) => {
    await dataService.addClient(clientData);
    fetchData(); 
  };

  const handleUpdateClient = async (clientData: Client) => {
    await dataService.updateClient(clientData);
    fetchData();
  };

  const handleDeleteClient = async (id: string) => {
    // Confirmation is handled in the component
    await dataService.deleteClient(id);
    fetchData();
  };

  const handleAddProject = async (projectData: any) => {
    await dataService.addProject(projectData);
    fetchData();
  };

  const handleUpdateProjectStatus = async (id: string, status: any) => {
    await dataService.updateProjectStatus(id, status);
    fetchData();
  };

  const handleUpdateProjectPaymentStatus = async (id: string, status: PaymentStatus) => {
    await dataService.updateProjectPaymentStatus(id, status);
    fetchData();
  };

  const handleDeleteProject = async (id: string) => {
    // Confirmation is handled in the component
    await dataService.deleteProject(id);
    fetchData();
  };

  const handleAddGoal = async (goalData: any) => {
    await dataService.addGoal(goalData);
    fetchData();
  };

  const handleDeleteGoal = async (id: string) => {
    // Logic for goals is handled inside Goals.tsx (safe delete by name)
    await dataService.deleteGoal(id);
    fetchData();
  };

  const handleUpdateGoal = async (goal: Goal) => {
    await dataService.updateGoal(goal);
    fetchData();
  };

  const handleAddTask = async (taskData: any) => {
    await dataService.addTask(taskData);
    fetchData();
  };

  const handleToggleTask = async (id: string, isCompleted: boolean) => {
    await dataService.toggleTask(id, isCompleted);
    fetchData();
  };

  const handleDeleteTask = async (id: string) => {
    // Deletion confirmation is handled by Tasks.tsx
    await dataService.deleteTask(id);
    fetchData();
  };

  // Payment Handlers
  const handleAddPayment = async (paymentData: any) => {
      await dataService.addPayment(paymentData);
      fetchData();
  };

  const handleUpdatePayment = async (payment: Payment) => {
      await dataService.updatePayment(payment);
      fetchData();
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50">Carregando...</div>;

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
          {/* Mobile Header */}
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
                <Agenda />
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
