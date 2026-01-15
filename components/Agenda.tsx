
import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin, RefreshCw, LogOut } from 'lucide-react';
import { googleCalendarService, GoogleEvent } from '../services/googleCalendarService';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday, 
  parseISO 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Agenda: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<GoogleEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  useEffect(() => {
    const init = async () => {
      try {
        await googleCalendarService.initClient();
        setIsConnected(googleCalendarService.isAuthenticated());
        if (googleCalendarService.isAuthenticated()) {
            fetchEvents(currentDate);
        }
      } catch (e) {
        console.error("Failed to init google calendar", e);
      }
    };
    init();
  }, []);

  const fetchEvents = async (date: Date) => {
    setIsLoading(true);
    try {
        const start = startOfMonth(date);
        const end = endOfMonth(date);
        // Extend to cover visible grid (prev/next month days)
        const gridStart = startOfWeek(start);
        const gridEnd = endOfWeek(end);
        
        const fetchedEvents = await googleCalendarService.listUpcomingEvents(gridStart, gridEnd);
        setEvents(fetchedEvents);
    } catch (error) {
        console.error(error);
        if (isConnected) setIsConnected(false); // Token might have expired
    } finally {
        setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      await googleCalendarService.handleAuthClick();
      setIsConnected(true);
      fetchEvents(currentDate);
    } catch (error) {
      console.error("Auth failed", error);
      alert("Falha na autenticação com Google. Verifique se as janelas pop-up estão permitidas.");
    }
  };

  const handleDisconnect = () => {
      googleCalendarService.handleSignoutClick();
      setIsConnected(false);
      setEvents([]);
  };

  const nextMonth = () => {
    const newDate = addMonths(currentDate, 1);
    setCurrentDate(newDate);
    if(isConnected) fetchEvents(newDate);
  };

  const prevMonth = () => {
    const newDate = subMonths(currentDate, 1);
    setCurrentDate(newDate);
    if(isConnected) fetchEvents(newDate);
  };

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventDateStr = event.start.dateTime || event.start.date;
      if (!eventDateStr) return false;
      const eventDate = parseISO(eventDateStr);
      return isSameDay(eventDate, day);
    });
  };

  // Calendar Grid Logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-6 animate-fadeIn h-[calc(100vh-140px)] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="text-blue-600" /> Agenda Google
          </h2>
          <p className="text-slate-500">Sincronize seus compromissos</p>
        </div>
        
        <div className="flex items-center gap-2">
             {isConnected && (
                 <button 
                    onClick={() => fetchEvents(currentDate)} 
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Atualizar Agenda"
                 >
                     <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
                 </button>
             )}
             
             {!isConnected ? (
                <button 
                    onClick={handleConnect}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-md transition-all hover:shadow-lg active:scale-95"
                >
                    <div className="bg-white p-1 rounded-full shrink-0">
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
                    </div>
                    Conectar com Google
                </button>
            ) : (
                <button 
                    onClick={handleDisconnect}
                    className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    <LogOut size={18} />
                    <span className="hidden sm:inline">Desconectar</span>
                </button>
            )}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col md:flex-row">
          
          {/* Main Calendar Grid */}
          <div className="flex-1 flex flex-col border-r border-slate-100 p-4">
              {/* Calendar Header */}
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-slate-800 capitalize">
                      {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                  </h3>
                  <div className="flex gap-1">
                      <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-600"><ChevronLeft /></button>
                      <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-600"><ChevronRight /></button>
                  </div>
              </div>

              {/* Week Headers */}
              <div className="grid grid-cols-7 mb-2">
                  {weekDays.map(day => (
                      <div key={day} className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider py-2">
                          {day}
                      </div>
                  ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 flex-1 auto-rows-fr gap-1">
                  {calendarDays.map((day, dayIdx) => {
                      const dayEvents = getEventsForDay(day);
                      const isSelected = isSameDay(day, selectedDay);
                      const isCurrentMonth = isSameMonth(day, currentDate);
                      const isTodayDate = isToday(day);

                      return (
                          <div 
                            key={day.toString()} 
                            onClick={() => setSelectedDay(day)}
                            className={`
                                min-h-[80px] p-2 rounded-lg border transition-all cursor-pointer relative flex flex-col
                                ${!isCurrentMonth ? 'bg-slate-50 text-slate-400 border-transparent' : 'bg-white'}
                                ${isSelected ? 'ring-2 ring-blue-500 border-transparent z-10' : 'border-slate-100 hover:border-blue-300'}
                            `}
                          >
                              <div className="flex justify-between items-start">
                                  <span className={`
                                    text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                                    ${isTodayDate ? 'bg-blue-600 text-white shadow-md' : ''}
                                  `}>
                                      {format(day, 'd')}
                                  </span>
                              </div>
                              
                              <div className="mt-1 space-y-1 overflow-hidden">
                                  {dayEvents.slice(0, 3).map((ev, i) => (
                                      <div key={i} className="text-[10px] truncate px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium border border-blue-100">
                                          {ev.summary}
                                      </div>
                                  ))}
                                  {dayEvents.length > 3 && (
                                      <div className="text-[10px] text-slate-400 pl-1">
                                          +{dayEvents.length - 3} mais
                                      </div>
                                  )}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>

          {/* Side Panel: Selected Day Details */}
          <div className="w-full md:w-80 bg-slate-50 p-6 flex flex-col border-t md:border-t-0 md:border-l border-slate-200">
              <h4 className="text-lg font-bold text-slate-800 mb-1 capitalize">
                  {format(selectedDay, 'EEEE', { locale: ptBR })}
              </h4>
              <p className="text-slate-500 text-sm mb-6">
                  {format(selectedDay, "d 'de' MMMM", { locale: ptBR })}
              </p>

              <div className="flex-1 overflow-y-auto space-y-3">
                  {getEventsForDay(selectedDay).length > 0 ? (
                      getEventsForDay(selectedDay).map(event => {
                          const startTime = event.start.dateTime ? format(parseISO(event.start.dateTime), 'HH:mm') : 'Dia todo';
                          return (
                              <div key={event.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                  <div className="flex items-start gap-3">
                                      <div className="w-1 h-full min-h-[40px] bg-blue-500 rounded-full"></div>
                                      <div className="flex-1 min-w-0">
                                          <h5 className="font-semibold text-slate-800 text-sm truncate" title={event.summary}>
                                              {event.summary}
                                          </h5>
                                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                              <Clock size={12} />
                                              <span>{startTime}</span>
                                          </div>
                                          {event.location && (
                                              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 truncate">
                                                  <MapPin size={12} />
                                                  <span>{event.location}</span>
                                              </div>
                                          )}
                                          <a 
                                            href={event.htmlLink} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="block mt-2 text-xs text-blue-600 hover:underline"
                                          >
                                            Ver no Calendar
                                          </a>
                                      </div>
                                  </div>
                              </div>
                          );
                      })
                  ) : (
                      <div className="text-center py-10 text-slate-400">
                          <CalendarIcon size={32} className="mx-auto mb-2 opacity-20" />
                          <p className="text-sm">Nenhum evento para este dia.</p>
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default Agenda;
