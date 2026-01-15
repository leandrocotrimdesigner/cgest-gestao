
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
    fixed inset-y-0 left-0 z-30 w-64 bg-[#212121] text-white transform transition-transform duration-300 ease-in-out
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
            <div className="p-6 border-b border-white/10 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center justify-center w-full md:w-auto md:justify-start">
                 <img 
                    src="https://lh3.googleusercontent.com/d/1As39kdJ3X61IEs7YpZYPZlmRg-CBitIA" 
                    alt="CGest Logo" 
                    className="h-12 w-auto object-contain"
                 />
              </div>
              <button onClick={() => setIsMobileOpen(false)} className="md:hidden text-white hover:bg-white/10 rounded p-1 transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* MENU ITEMS (Scrollable Area) */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                    activeTab === item.id 
                      ? 'bg-blue-600 text-white shadow-lg translate-x-1 font-bold' 
                      : 'text-white/80 hover:bg-white/10 hover:text-white hover:translate-x-1'
                  }`}
                >
                  <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'opacity-70 group-hover:opacity-100'} />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
        </div>

        {/* USER PROFILE FOOTER (Fixed at Bottom) */}
        <div className="p-4 border-t border-white/10 bg-black/20 flex-shrink-0">
          <div className="flex items-center gap-3 px-2 py-3 mb-2 rounded-lg bg-black/20">
            {/* Profile Picture */}
            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden shrink-0 relative">
                {user?.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                    <UserCircle size={32} className="text-white/80" />
                )}
            </div>
            
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{user?.name || 'Usuário'}</p>
              <p className="text-xs text-white/70 truncate">{user?.email}</p>
            </div>
          </div>
          
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-white/80 hover:bg-white/10 hover:text-white rounded-lg transition-colors text-sm font-medium"
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
