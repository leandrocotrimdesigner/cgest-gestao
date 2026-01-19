
import React, { useState, useEffect, useMemo } from 'react';
import { Task, Project } from '../types';
import { googleCalendarService, GoogleEvent } from '../services/googleCalendarService';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';

interface AgendaProps {
    tasks?: Task[];
    projects?: Project[];
}

interface CalendarEvent {
    id: string;
    title: string;
    date: Date;
    type: 'google' | 'task' | 'project';
    color: string;
}

const Agenda: React.FC<AgendaProps> = ({ tasks = [], projects = [] }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [googleEvents, setGoogleEvents] = useState<GoogleEvent[]>([]);
    const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
    const [isGoogleConnected, setIsGoogleConnected] = useState(false);
    const [authError, setAuthError] = useState(false);

    useEffect(() => {
        const checkAuth = () => {
             const auth = googleCalendarService.isAuthenticated();
             setIsGoogleConnected(auth);
             if (auth) fetchGoogleEvents();
        };
        // Pequeno delay para garantir que o GAPI carregou
        setTimeout(checkAuth, 1000);
    }, []);

    useEffect(() => {
        if (isGoogleConnected) {
            fetchGoogleEvents();
        }
    }, [currentDate, isGoogleConnected]);

    const fetchGoogleEvents = async () => {
        setIsLoadingGoogle(true);
        setAuthError(false);
        try {
            const start = startOfMonth(currentDate);
            const end = endOfMonth(currentDate);
            // Pega um buffer de dias para preencher a grade visual
            const visibleStart = startOfWeek(start);
            const visibleEnd = endOfWeek(end);
            
            const events = await googleCalendarService.listUpcomingEvents(visibleStart, visibleEnd);
            setGoogleEvents(events);
        } catch (error: any) {
            console.error("Agenda Fetch Error:", error);
            if (error.result?.error?.code === 401 || error.result?.error?.code === 403) {
                 setAuthError(true);
                 setIsGoogleConnected(false); // Força reconexão
            }
        } finally {
            setIsLoadingGoogle(false);
        }
    };

    const handleConnectGoogle = async () => {
        try {
            await googleCalendarService.initClient();
            await googleCalendarService.handleAuthClick();
            setIsGoogleConnected(true);
            setAuthError(false);
        } catch (error) {
            console.error("Auth Failed", error);
            alert("Falha na autenticação com Google. Verifique o console.");
        }
    };

    // MERGE LOCAL DATA + GOOGLE DATA
    const calendarEvents = useMemo(() => {
        const events: CalendarEvent[] = [];

        // 1. Local Tasks
        tasks.forEach(task => {
            if (task.dueDate && !task.isCompleted) {
                events.push({
                    id: task.id,
                    title: task.title,
                    date: parseISO(task.dueDate),
                    type: 'task',
                    color: task.isMeeting ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'
                });
            }
        });

        // 2. Google Events
        googleEvents.forEach(evt => {
            const dateStr = evt.start.dateTime || evt.start.date;
            if (dateStr) {
                events.push({
                    id: evt.id,
                    title: evt.summary,
                    date: new Date(dateStr),
                    type: 'google',
                    color: 'bg-green-100 text-green-700 border-green-200'
                });
            }
        });

        return events;
    }, [tasks, googleEvents]);

    // Calendar Grid Logic
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const goToToday = () => setCurrentDate(new Date());

    return (
        <div className="space-y-6 animate-fadeIn h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Agenda Visual</h2>
                    <p className="text-slate-500">Sincronizado com Google Calendar</p>
                </div>
                
                <div className="flex items-center gap-2">
                    {!isGoogleConnected ? (
                        <button 
                            onClick={handleConnectGoogle}
                            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
                        >
                            <img src="https://www.gstatic.com/images/branding/product/1x/calendar_2020q4_48dp.png" alt="Google" className="w-5 h-5" />
                            {authError ? 'Reconectar Google' : 'Conectar Google Agenda'}
                        </button>
                    ) : (
                         <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold border border-green-100">
                             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                             Sincronizado
                         </div>
                    )}
                    
                    {isLoadingGoogle && <Loader2 className="animate-spin text-blue-600" size={20} />}
                </div>
            </div>

            {/* ERROR ALERT INSIDE AGENDA FRAME ONLY */}
            {authError && (
                 <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded-lg flex items-center gap-2 text-sm">
                     <AlertTriangle size={16} />
                     <span>A sessão do Google expirou ou as chaves são inválidas. A agenda está operando em modo local.</span>
                 </div>
            )}

            {/* CALENDAR CONTROLS */}
            <div className="bg-white p-4 rounded-t-xl border-b border-slate-100 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <h3 className="text-xl font-bold text-slate-800 capitalize">
                        {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                    </h3>
                    <div className="flex items-center bg-slate-100 rounded-lg p-1">
                        <button onClick={prevMonth} className="p-1 hover:bg-white rounded-md text-slate-600 transition-all"><ChevronLeft size={20} /></button>
                        <button onClick={nextMonth} className="p-1 hover:bg-white rounded-md text-slate-600 transition-all"><ChevronRight size={20} /></button>
                    </div>
                </div>
                <button onClick={goToToday} className="text-sm font-medium text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                    Hoje
                </button>
            </div>

            {/* CALENDAR GRID */}
            <div className="bg-white rounded-b-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col min-h-[600px]">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
                    {weekDays.map(day => (
                        <div key={day} className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>
                
                {/* Days Grid */}
                <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                    {calendarDays.map((day, idx) => {
                         const dayEvents = calendarEvents.filter(evt => isSameDay(evt.date, day));
                         const isCurrentMonth = isSameMonth(day, monthStart);
                         const isTodayDate = isToday(day);

                         return (
                             <div 
                                key={day.toISOString()} 
                                className={`min-h-[100px] border-b border-r border-slate-100 p-2 transition-colors ${!isCurrentMonth ? 'bg-slate-50/50' : 'bg-white hover:bg-blue-50/10'}`}
                             >
                                 <div className="flex justify-between items-start mb-1">
                                     <span 
                                        className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isTodayDate ? 'bg-blue-600 text-white shadow-md' : (!isCurrentMonth ? 'text-slate-400' : 'text-slate-700')}`}
                                     >
                                         {format(day, 'd')}
                                     </span>
                                 </div>
                                 
                                 <div className="space-y-1">
                                     {dayEvents.map(evt => (
                                         <div 
                                            key={evt.id} 
                                            className={`text-xs px-2 py-1 rounded border truncate font-medium ${evt.color} cursor-default`}
                                            title={evt.title}
                                         >
                                            {evt.type === 'google' && <span className="mr-1 font-bold">•</span>}
                                            {evt.title}
                                         </div>
                                     ))}
                                     {dayEvents.length > 3 && (
                                         <div className="text-xs text-slate-400 pl-1 font-medium">
                                             + {dayEvents.length - 3} mais
                                         </div>
                                     )}
                                 </div>
                             </div>
                         );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Agenda;
