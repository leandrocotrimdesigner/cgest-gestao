
export type ClientType = 'mensalista' | 'avulso';
export type ClientStatus = 'active' | 'inactive';

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  status: ClientStatus;
  monthlyValue?: number; // Only for 'mensalista'
  dueDay?: number; // Dia de vencimento (1-31)
  driveFolderUrl?: string; // Link para pasta do Google Drive
  createdAt: string;
  userId?: string;
}

export interface Payment {
  id: string;
  clientId: string;
  value: number;
  dueDate: string; // YYYY-MM-DD (Data de vencimento)
  status: 'paid' | 'pending';
  paidAt?: string; // Data do pagamento efetivo
  description?: string; // Ex: Mensalidade Maio/24
  receiptUrl?: string; // Link para o comprovante no Google Drive
  userId?: string;
}

export type ProjectStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentStatus = 'paid' | 'pending';

export interface Project {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  paymentStatus: PaymentStatus;
  paidAt?: string; // Data em que o pagamento foi realizado (YYYY-MM-DD)
  budget: number;
  deadline?: string;
  createdAt: string;
  userId?: string;
}

export interface Goal {
  id: string;
  description: string;
  targetValue: number;
  currentValue: number;
  deadline?: string;
  userId?: string;
}

export interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
  projectId?: string; // Optional link to a project
  dueDate?: string; // YYYY-MM-DD
  createdAt: string;
  isMeeting?: boolean; // Flag para identificar se é reunião
  meetingTime?: string; // Horário da reunião (HH:mm)
  userId?: string;
}

export type ProspectStatus = 'pending' | 'negative' | 'closed' | 'waiting';

export interface Prospect {
  id: string;
  title: string; // Nome do Cliente
  socialHandle: string; // @ do Instagram
  description: string;
  status: ProspectStatus;
  imageUrl?: string;
  createdAt: string;
  userId?: string;
  color?: string; // Cor do Post-it (Mantido para compatibilidade, mas ignorado visualmente em favor do padrão do site)
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string; // Base64 string for profile picture
}

export interface DashboardStats {
  totalClients: number;
  activeProjects: number;
  monthlyRecurringRevenue: number;
  totalProjectBudget: number;
}
