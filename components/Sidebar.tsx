
import React from 'react';
import { LayoutDashboard, Users, Briefcase, LogOut, X, Target, CheckSquare, UserCircle, Calendar } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User | null;
  onLogout: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user, onLogout, isMobileOpen, setIsMobileOpen }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'projects', label: 'Projetos', icon: Briefcase },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'goals', label: 'Metas', icon: Target },
    { id: 'tasks', label: 'Tarefas', icon: CheckSquare },
    { id: 'profile', label: 'Meu Perfil', icon: UserCircle },
  ];

  const handleNav = (id: string) => {
    setActiveTab(id);
    setIsMobileOpen(false);
  };

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out
    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
    md:translate-x-0 md:sticky md:top-0 md:h-screen flex flex-col justify-between shadow-xl md:shadow-none
  `;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={sidebarClasses}>
        
        {/* TOP SECTION (Logo + Menu) */}
        <div className="flex flex-col flex-1 overflow-hidden">
            {/* LOGO AREA */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-400 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <span className="text-white font-bold text-xl font-sans leading-none">C</span>
                 </div>
                 
                 <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent tracking-tight">
                   CGest
                 </h1>
              </div>
              <button onClick={() => setIsMobileOpen(false)} className="md:hidden text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* MENU ITEMS (Scrollable Area) */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                    activeTab === item.id 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-x-1' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1'
                  }`}
                >
                  <item.icon size={20} className={activeTab === item.id ? 'animate-pulse' : ''} />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
        </div>

        {/* USER PROFILE FOOTER (Fixed at Bottom) */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex-shrink-0">
          <div className="flex items-center gap-3 px-2 py-3 mb-2 rounded-lg bg-slate-800/50">
            {/* Profile Picture */}
            <div className="w-10 h-10 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center overflow-hidden shrink-0 relative">
                {user?.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                    <UserCircle size={32} className="text-slate-400" />
                )}
            </div>
            
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-200 truncate">{user?.name || 'Usuário'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors text-sm font-medium border border-transparent hover:border-red-500/20"
          >
            <LogOut size={16} />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
