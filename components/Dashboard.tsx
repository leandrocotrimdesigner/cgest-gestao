
import React, { useMemo, useState, useEffect } from 'react';
import { Client, Project, Goal, Task, Payment } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Briefcase, Users, TrendingUp, Quote, Trash2, Check, AlertTriangle, X, Calendar, CheckSquare, FileText, ArrowRight, List, Video, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import Goals from './Goals'; 

interface DashboardProps {
  clients: Client[];
  projects: Project[];
  goals: Goal[];
  tasks: Task[]; 
  payments: Payment[]; 
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>; 
  onToggleTask: (id: string, isCompleted: boolean) => Promise<void>;
  onAddGoal: (goal: Omit<Goal, 'id'>) => Promise<void>;
  onDeleteGoal: (id: string) => Promise<void>;
  onUpdateGoal: (goal: Goal) => Promise<void>;
}

const VERSES = [
    { text: "Tudo posso naquele que me fortalece.", reference: "Filipenses 4:13" },
    { text: "O Senhor é o meu pastor, nada me faltará.", reference: "Salmos 23:1" },
    { text: "Esforça-te, e tem bom ânimo.", reference: "Josué 1:9" },
    { text: "Porque sou eu que conheço os planos que tenho para vocês, diz o Senhor, planos de fazê-los prosperar.", reference: "Jeremias 29:11" },
];

const Dashboard: React.FC<DashboardProps> = ({ 
    clients = [], 
    projects = [], 
    payments = [], 
    goals = [], 
    tasks = [], 
    onToggleTask, 
    onAddGoal, 
    onDeleteGoal, 
    onUpdateGoal 
}) => {
  const [todaysVerse, setTodaysVerse] = useState(VERSES[0]);
  const [hiddenAlerts, setHiddenAlerts] = useState<Set<string>>(new Set());
  const [alertToDelete, setAlertToDelete] = useState<string | null>(null);

  // Filtro Temporal
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Revenue Details State
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    const day = new Date().getDate();
    const index = day % VERSES.length;
    setTodaysVerse(VERSES[index]);
  }, []);

  // Helpers robustos para extrair ano e mês dos pagamentos
  const getPaymentYear = (p: any) => {
      if (p.year !== undefined) return p.year;
      if (p.dueDate || p.paidAt) {
          const parsed = parseInt((p.dueDate || p.paidAt).split('-')[0], 10);
          return isNaN(parsed) ? 2025 : parsed; // Fallback para 2025 conforme solicitado para registros legados
      }
      return 2025;
  };

  const getPaymentMonth = (p: any) => {
      if (p.month !== undefined) return p.month;
      if (p.dueDate || p.paidAt) {
          return parseInt((p.dueDate || p.paidAt).split('-')[1], 10) - 1;
      }
      return new Date().getMonth();
  };

  const stats = useMemo(() => {
    const safeClients = clients || [];
    const safeProjects = projects || [];
    const safePayments = payments || [];

    const activeClients = safeClients.filter(c => c.status === 'active');
    const totalClients = activeClients.length;
    const activeProjects = safeProjects.filter(p => p.status === 'in_progress').length;
    
    const currentMonth = new Date().getMonth();

    // Faturamento Mensal: Aplica filtro duplo (Mês Atual + Ano Selecionado)
    const monthlyRevenue = safePayments
        .filter(p => p.status === 'paid')
        .filter(p => getPaymentYear(p) === selectedYear && getPaymentMonth(p) === currentMonth)
        .reduce((sum, p) => sum + p.value, 0)
        + safeProjects
        .filter(p => p.paymentStatus === 'paid')
        .filter(p => {
            if (!p.paidAt) return false;
            return getPaymentYear(p) === selectedYear && getPaymentMonth(p) === currentMonth;
        })
        .reduce((sum, p) => sum + p.budget, 0);

    // Faturamento Total: Histórico completo (Ignora filtros de ano/mês)
    const totalRevenue = safePayments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.value, 0)
        + safeProjects
        .filter(p => p.paymentStatus === 'paid')
        .reduce((sum, p) => sum + p.budget, 0);

    const pipeline = safeProjects.filter(p => p.paymentStatus === 'pending').reduce((acc, curr) => acc + curr.budget, 0);

    return { totalClients, activeProjects, monthlyRevenue, totalRevenue, pipeline };
  }, [clients, projects, payments, selectedYear]);

  // Gráfico Anual de Receita (Filtrado estritamente pelo selectedYear)
  const yearlyRevenueData = useMemo(() => {
     const data = [];
     const safePayments = payments || [];
     const safeProjects = projects || [];
     const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

     for (let i = 0; i < 12; i++) {
        const monthPrefix = `${selectedYear}-${String(i + 1).padStart(2, '0')}`;
        
        const monthlyPayments = safePayments.filter(p => {
            if (p.status !== 'paid') return false;
            return getPaymentYear(p) === selectedYear && getPaymentMonth(p) === i;
        }).reduce((acc, curr) => acc + curr.value, 0);

        const monthlyProjects = safeProjects.filter(p => {
            if (p.paymentStatus !== 'paid' || !p.paidAt) return false;
            return getPaymentYear(p) === selectedYear && getPaymentMonth(p) === i;
        }).reduce((acc, curr) => acc + curr.budget, 0);

        data.push({ 
            name: months[i], 
            date: monthPrefix, 
            revenue: monthlyPayments + monthlyProjects 
        });
     }
     return data;
  }, [payments, projects, selectedYear]);

  const getClientName = (id: string) => (clients || []).find(c => c.id === id)?.name || 'Cliente';
  const getProjectName = (id?: string) => (projects || []).find(p => p.id === id)?.name;

  const alertsList = useMemo(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      const currentMonth = new Date().getMonth();
      const alerts: Array<{
          id: string;
          type: 'payment' | 'project';
          title: string;
          subtitle: string;
          date: string | null;
          value: number;
      }> = [];

      // Pagamentos Atrasados (Filtro Duplo: Ano Selecionado e Mês Atual)
      (payments || []).forEach(p => {
          if (p.status === 'pending' && p.dueDate < todayStr && !hiddenAlerts.has(p.id)) {
              if (getPaymentYear(p) === selectedYear && getPaymentMonth(p) === currentMonth) {
                  alerts.push({
                      id: p.id,
                      type: 'payment',
                      title: getClientName(p.clientId),
                      subtitle: p.description || 'Pagamento Pendente',
                      date: p.dueDate,
                      value: p.value
                  });
              }
          }
      });

      // Projetos Pendentes
      (projects || []).forEach(p => {
          if (p.paymentStatus === 'pending' && !hiddenAlerts.has(`proj-${p.id}`)) {
              const pYear = p.deadline ? parseInt(p.deadline.split('-')[0], 10) : 2025;
              const pMonth = p.deadline ? parseInt(p.deadline.split('-')[1], 10) - 1 : currentMonth;
              
              if (!p.deadline || (pYear === selectedYear && pMonth === currentMonth)) {
                  alerts.push({
                      id: `proj-${p.id}`,
                      type: 'project',
                      title: getClientName(p.clientId),
                      subtitle: `Projeto: ${p.name}`,
                      date: p.deadline || null,
                      value: p.budget
                  });
              }
          }
      });

      alerts.sort((a, b) => {
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

      return alerts;
  }, [payments, projects, hiddenAlerts, clients, selectedYear]);

  const todaysTasks = useMemo(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      return (tasks || []).filter(t => t.dueDate === todayStr);
  }, [tasks]);

  const handleDeleteAlertRequest = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    setAlertToDelete(id);
  };

  const confirmDeleteAlert = () => {
    if (alertToDelete) {
        setHiddenAlerts(prev => new Set(prev).add(alertToDelete));
        setAlertToDelete(null);
    }
  };

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
        setSelectedDate(data.activePayload[0].payload.date);
        setIsDetailsOpen(true);
    } else if (data && data.date) {
        setSelectedDate(data.date);
        setIsDetailsOpen(true);
    }
  };

  const openRecentDetails = () => {
    const lastMonthWithRevenue = [...yearlyRevenueData].reverse().find(d => d.revenue > 0);
    const targetDate = lastMonthWithRevenue ? lastMonthWithRevenue.date : `${selectedYear}-01`;
    setSelectedDate(targetDate);
    setIsDetailsOpen(true);
  };

  const selectedTransactions = useMemo(() => {
    if (!selectedDate) return [];
    const transactionList: Array<{ id: string; type: 'Receita' | 'Projeto'; clientName: string; description: string; value: number; date: string }> = [];

    const [targetYearStr, targetMonthStr] = selectedDate.split('-');
    const targetYear = parseInt(targetYearStr);
    const targetMonth = parseInt(targetMonthStr) - 1;

    (payments || []).forEach(p => {
        if (p.status === 'paid') {
            if (getPaymentYear(p) === targetYear && getPaymentMonth(p) === targetMonth) {
                transactionList.push({ id: p.id, type: 'Receita', clientName: getClientName(p.clientId), description: p.description || 'Mensalidade/Avulso', value: p.value, date: p.paidAt || p.dueDate });
            }
        }
    });

    (projects || []).forEach(p => {
        if (p.paymentStatus === 'paid' && p.paidAt) {
            if (getPaymentYear(p) === targetYear && getPaymentMonth(p) === targetMonth) {
                transactionList.push({ id: p.id, type: 'Projeto', clientName: getClientName(p.clientId), description: `Projeto: ${p.name}`, value: p.budget, date: p.paidAt });
            }
        }
    });

    return transactionList;
  }, [selectedDate, payments, projects, clients]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* 1. Header & Seletor de Ano */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
              <h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2>
              <p className="text-slate-500">Acompanhe seus resultados e métricas</p>
          </div>
          <div className="flex items-center gap-3 bg-white border border-slate-200 p-1.5 rounded-lg shadow-sm">
              <button 
                  onClick={() => setSelectedYear(prev => Math.max(2025, prev - 1))} 
                  disabled={selectedYear <= 2025}
                  className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                  <ChevronLeft size={18} />
              </button>
              <span className="font-bold text-slate-700 min-w-[50px] text-center">{selectedYear}</span>
              <button 
                  onClick={() => setSelectedYear(prev => prev + 1)} 
                  className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 transition-all"
              >
                  <ChevronRight size={18} />
              </button>
          </div>
      </div>

      {/* 2. Inspiração do Dia */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
                <h2 className="text-blue-100 font-medium text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Quote size={16} className="fill-blue-200 text-blue-200" />Inspiração do Dia
                </h2>
                <p className="text-xl md:text-2xl font-serif font-bold italic leading-relaxed text-white">"{todaysVerse.text}"</p>
                <p className="mt-2 text-blue-100 text-sm font-semibold">— {todaysVerse.reference}</p>
            </div>
            <div className="hidden md:block opacity-20 transform rotate-12 text-white"><Briefcase size={80} /></div>
        </div>
      </div>

      {/* 3. Métrica Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={`Faturamento Mensal (${selectedYear})`} value={formatCurrency(stats.monthlyRevenue)} icon={DollarSign} color="text-green-600" bg="bg-green-100"/>
        <StatCard title="Faturamento Total" value={formatCurrency(stats.totalRevenue)} icon={Check} color="text-emerald-600" bg="bg-emerald-100"/>
        <StatCard title="Pipeline (Pendente)" value={formatCurrency(stats.pipeline)} icon={TrendingUp} color="text-blue-600" bg="bg-blue-100"/>
        <StatCard title="Projetos Ativos" value={stats.activeProjects} icon={Briefcase} color="text-purple-600" bg="bg-purple-100"/>
      </div>

      {/* 4. CENTRAL GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Receita Chart Anual */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-[400px]">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><DollarSign size={20} className="text-green-600"/>Receita Anual ({selectedYear})</h3>
                <button onClick={openRecentDetails} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors"><List size={18} /></button>
            </div>
            <div className="flex-1 w-full min-h-0 relative group">
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                    <BarChart data={yearlyRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} onClick={handleBarClick} className="cursor-pointer">
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 10}} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={(val) => `R$${val}`} tick={{fill: '#64748b', fontSize: 10}} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: '#f1f5f9'}} formatter={(value: number) => [formatCurrency(value), 'Receita']} />
                        <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={30} cursor="pointer" onClick={handleBarClick} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Alertas Financeiros */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-[400px]">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"><AlertTriangle size={20} className="text-red-500"/>Alertas Financeiros</h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                {alertsList.length > 0 ? (
                    alertsList.map(alert => (
                        <div key={alert.id} className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 relative group">
                            <div className="bg-white p-1.5 rounded-full text-red-500 shadow-sm shrink-0">
                                {alert.type === 'project' ? <Briefcase size={14} /> : <DollarSign size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-800 truncate">{alert.title}</p>
                                <p className="text-xs text-red-600 font-medium truncate">{alert.subtitle}</p>
                                <div className="flex justify-between mt-1 text-xs text-slate-500">
                                    <span>{alert.date ? new Date(alert.date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem prazo'}</span>
                                    <span className="font-bold text-red-700">{formatCurrency(alert.value)}</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button type="button" onClick={(e) => handleDeleteAlertRequest(e, alert.id)} className="text-red-400 bg-white hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md shadow-sm transition-colors border border-red-100">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg p-4 text-center">
                        <Check size={24} className="mb-2 opacity-50 text-green-500"/>
                        <p>Nenhum alerta pendente!</p>
                    </div>
                )}
            </div>
        </div>

        {/* Tarefas de Hoje */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-[400px]">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"><CheckSquare size={20} className="text-blue-600"/>Tarefas de Hoje</h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                {todaysTasks.length > 0 ? (
                    todaysTasks.map(task => {
                        const projectName = getProjectName(task.projectId);
                        return (
                            <div key={task.id} className={`p-3 border rounded-lg flex items-start gap-3 transition-all ${task.isCompleted ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 hover:border-blue-400'}`}>
                                <button onClick={() => onToggleTask(task.id, !task.isCompleted)} className={`mt-0.5 shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${task.isCompleted ? 'bg-green-50 border-green-500 text-white' : 'bg-white border-slate-300 hover:border-blue-500'}`}>
                                    {task.isCompleted && <Check size={12} strokeWidth={3} />}
                                </button>
                                <div className="min-w-0 flex-1">
                                    <div className="flex justify-between items-start">
                                        <p className={`text-sm font-medium break-words ${task.isCompleted ? 'line-through text-slate-500' : 'text-slate-800'}`}>{task.title}</p>
                                        {task.isMeeting && !task.isCompleted && (
                                            <div className="ml-2 bg-purple-50 text-purple-600 rounded p-1" title="Reunião"><Video size={14} /></div>
                                        )}
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                        {projectName && <div className="flex items-center gap-1"><Briefcase size={10} className="text-slate-400"/><span className="text-xs text-slate-500 truncate">{projectName}</span></div>}
                                        {task.isMeeting && task.meetingTime && !task.isCompleted && (
                                            <div className="flex items-center gap-1 bg-purple-50 px-1.5 py-0.5 rounded text-purple-700"><Clock size={10} /><span className="text-xs font-bold">{task.meetingTime}</span></div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg p-4 text-center">
                        <Calendar size={24} className="mb-2 opacity-50 text-blue-500"/>
                        <p>Nenhuma tarefa para hoje.</p>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* 5. METAS */}
      <div className="pt-4 border-t border-slate-200">
        <Goals goals={goals || []} onAddGoal={onAddGoal} onDeleteGoal={onDeleteGoal} onUpdateGoal={onUpdateGoal} readOnly={true} />
      </div>

      {/* MODALS (Revenue Details & Alerts) */}
      {isDetailsOpen && selectedDate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={() => setIsDetailsOpen(false)}>
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl animate-fadeIn overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileText size={20} className="text-blue-600"/> Detalhamento de Receita</h3>
                    <p className="text-sm text-slate-500">
                        {selectedDate.length === 7 
                            ? new Date(selectedDate + '-01T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                            : new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                        }
                    </p>
                  </div>
                  <button onClick={() => setIsDetailsOpen(false)} className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-200 transition-colors"><X size={20} /></button>
              </div>
              <div className="p-0 overflow-y-auto">
                {selectedTransactions.length > 0 ? (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider sticky top-0"><tr><th className="px-6 py-3 font-semibold">Cliente / Origem</th><th className="px-6 py-3 font-semibold">Descrição</th><th className="px-6 py-3 font-semibold text-right">Valor</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {selectedTransactions.map((item, idx) => (
                                <tr key={item.id + idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-800">{item.clientName}</div>
                                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">{item.type === 'Projeto' ? <Briefcase size={10}/> : <Users size={10}/>}{item.type}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{item.description}</td>
                                    <td className="px-6 py-4 text-right font-bold text-green-600">{formatCurrency(item.value)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t border-slate-200"><tr><td colSpan={2} className="px-6 py-4 text-right font-bold text-slate-700">Total do Período:</td><td className="px-6 py-4 text-right font-bold text-slate-900 text-lg">{formatCurrency(selectedTransactions.reduce((acc, curr) => acc + curr.value, 0))}</td></tr></tfoot>
                    </table>
                ) : (
                    <div className="p-12 text-center text-slate-400 flex flex-col items-center"><AlertTriangle size={32} className="mb-2 opacity-30" /><p>Nenhum detalhe encontrado para esta data/mês.</p></div>
                )}
              </div>
           </div>
        </div>
      )}

      {alertToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={() => setAlertToDelete(null)}>
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fadeIn overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-6 bg-red-50 border-b border-red-100 flex items-start gap-4">
                <div className="p-2 bg-red-100 rounded-full text-red-600"><AlertTriangle size={24} /></div>
                <div><h3 className="text-lg font-bold text-red-900">Remover Alerta</h3><p className="text-sm text-red-700 mt-1">Deseja ocultar este alerta?</p></div>
                <button onClick={() => setAlertToDelete(null)} className="ml-auto text-red-400 hover:text-red-700"><X size={20} /></button>
              </div>
              <div className="p-6 flex justify-end gap-3">
                  <button onClick={() => setAlertToDelete(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                  <button onClick={confirmDeleteAlert} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-md">Confirmar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
const StatCard = ({ title, value, icon: Icon, color, bg }: any) => (<div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between"><div><p className="text-sm font-medium text-slate-500 mb-1">{title}</p><h3 className="text-2xl font-bold text-slate-800">{value}</h3></div><div className={`p-3 rounded-lg ${bg}`}><Icon className={`w-6 h-6 ${color}`} /></div></div>);
export default Dashboard;
