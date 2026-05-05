/**
 * KW Coastline Scale Management
 * Version: V2.8 (Features: Shift Absences, Date Ranges, RGB Picker, Watermarks, Collapsible Sidebar, PDF Wrap Fix)
 * Last Update: 2026
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithCustomToken, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { 
  UserPlus, Trash2, ChevronLeft, ChevronRight, X, LayoutDashboard, Database, 
  Mail, Phone, Plus, Save, AlertCircle, RefreshCw, Menu,
  Clock, Sparkles, Eraser, Cloud, CalendarDays, UserCheck, Download, 
  Upload, LogOut, CalendarPlus, Send, Calculator, Users, Pencil
} from 'lucide-react';

// --- CONFIGURAÇÕES E CONSTANTES ---
const ADMIN_EMAILS = ['hugocunha@kwportugal.pt'];

const defaultFirebaseConfig = {
  apiKey: "AIzaSyBQN51i9RgnoygcchPVmYt-nON1aY4_eUc",
  authDomain: "our-tract-466815-j4.firebaseapp.com",
  projectId: "our-tract-466815-j4",
  storageBucket: "our-tract-466815-j4.firebasestorage.app",
  messagingSenderId: "568088933808",
  appId: "1:568088933808:web:0ac71bb1a239b70d5dd275"
};

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : defaultFirebaseConfig;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'kw-coastline-scale';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const daysOfWeek = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

// ============================================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================================
const getPTnationalHolidays = (year) => {
  const f = Math.floor;
  const G = year % 19; const C = f(year / 100);
  const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
  const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11));
  const J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7;
  const L = I - J;
  const month = 3 + f((L + 40) / 44);
  const day = L + 28 - 31 * f(month / 4);
  
  const easter = new Date(year, month - 1, day);
  const goodFriday = new Date(year, month - 1, day - 2);
  const corpusChristi = new Date(year, month - 1, day + 60);

  const format = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

  return {
    [`${year}-1-1`]: "Ano Novo", [`${year}-4-25`]: "Dia da Liberdade", [`${year}-5-1`]: "Dia do Trabalhador", [`${year}-6-10`]: "Dia de Portugal",
    [`${year}-8-15`]: "Assunção de N. Sra.", [`${year}-10-5`]: "Implant. da República", [`${year}-11-1`]: "Todos os Santos", [`${year}-12-1`]: "Restauração da Indep.",
    [`${year}-12-8`]: "Imaculada Conceição", [`${year}-12-25`]: "Natal",
    [format(goodFriday)]: "Sexta-feira Santa", [format(easter)]: "Páscoa", [format(corpusChristi)]: "Corpo de Deus",
  };
};

const getDatesInRange = (startDate, endDate) => {
  const dates = [];
  let currentDate = new Date(startDate);
  const stopDate = new Date(endDate);
  while (currentDate <= stopDate) {
    dates.push(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

// ============================================================================
// COMPONENTES MODULARIZADOS
// ============================================================================

// 1. COMPONENTE: CONTABILIDADE
const Contabilidade = ({ agents, assignments, month, year, setCurrentDate, resolveAgent }) => {
  const stats = {};
  agents.forEach(a => { stats[a.id] = { agent: a, morning: 0, afternoon: 0, weekday: 0, weekend: 0, total: 0 }; });
  
  Object.entries(assignments).forEach(([key, val]) => {
    const agent = resolveAgent(val);
    if (!agent || !stats[agent.id]) return;
    const [y, m, d, shiftType] = key.split('-');
    const dow = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).getDay();

    if (shiftType === 'morning') stats[agent.id].morning++; else stats[agent.id].afternoon++;
    if (dow === 0 || dow === 6) stats[agent.id].weekend++; else stats[agent.id].weekday++;
    stats[agent.id].total++;
  });

  const sortedStats = Object.values(stats).sort((a, b) => b.total - a.total || String(a.agent.firstName || '').localeCompare(String(b.agent.firstName || '')));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 w-full overflow-hidden">
      <div className="bg-white rounded-2xl md:rounded-[32px] shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 md:px-8 md:py-5 flex flex-col md:flex-row items-center justify-between border-b border-slate-200 gap-4">
          <h3 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tighter">
            Relatório <span className="text-red-600 ml-2">{months[month]} {year}</span>
          </h3>
          <div className="flex gap-2">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2.5 md:p-3 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-red-600 transition-all active:scale-95 shadow-sm"><ChevronLeft size={20}/></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 font-black text-[10px] uppercase text-slate-500 hover:text-red-600 transition-all shadow-sm">Mês Atual</button>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2.5 md:p-3 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-red-600 transition-all active:scale-95 shadow-sm"><ChevronRight size={20}/></button>
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Consultor</th>
                <th className="px-6 py-4 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest border-l border-slate-200">Manhãs</th>
                <th className="px-6 py-4 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest">Tardes</th>
                <th className="px-6 py-4 text-center text-[10px] font-black uppercase text-sky-600 tracking-widest border-l border-slate-200">Dias Úteis</th>
                <th className="px-6 py-4 text-center text-[10px] font-black uppercase text-orange-600 tracking-widest">Fim-de-semana</th>
                <th className="px-6 py-4 text-center text-[10px] font-black uppercase text-red-600 tracking-widest border-l border-slate-200">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedStats.map(({ agent, morning, afternoon, weekday, weekend, total }) => (
                <tr key={agent.id} className="hover:bg-slate-50 transition-all">
                  <td className="px-6 py-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-md shrink-0" style={{ backgroundColor: agent.color }}>{agent.firstName?.[0]?.toUpperCase() || '?'}</div>
                    <span className="font-black text-slate-800 uppercase text-sm">{String(agent.firstName || '')} {String(agent.lastName || '')}</span>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-slate-600 border-l border-slate-100">{morning}</td>
                  <td className="px-6 py-4 text-center font-bold text-slate-600">{afternoon}</td>
                  <td className="px-6 py-4 text-center font-bold text-sky-700 bg-sky-50/30 border-l border-slate-100">{weekday}</td>
                  <td className="px-6 py-4 text-center font-black text-orange-600 bg-orange-50/30">{weekend}</td>
                  <td className="px-6 py-4 text-center font-black text-red-600 text-lg border-l border-slate-100">{total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 2. COMPONENTE: CALENDÁRIO MENSAL
const Calendario = ({ year, month, daysInMonth, firstDayOfMonth, assignments, isAdmin, setAssignmentModal, resolveAgent, setCurrentDate, holidays }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 w-full overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar pb-4 w-full">
        <div id="calendar-to-export" className="bg-slate-100 rounded-2xl md:rounded-[32px] shadow-xl border border-black overflow-hidden min-w-[900px] lg:min-w-full">
          <div className="bg-slate-200 px-6 py-4 md:px-8 md:py-5 flex flex-col md:flex-row items-center justify-between border-b border-black gap-4">
            <h3 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tighter">
              {months[month]} <span className="text-red-600">{year}</span>
            </h3>
            <div className="flex gap-2 no-print-pdf">
              <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2.5 md:p-3 bg-white border-2 border-slate-300 rounded-xl hover:bg-slate-50 hover:border-red-600 transition-all active:scale-95 shadow-sm"><ChevronLeft size={20}/></button>
              <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2.5 md:p-3 bg-white border-2 border-slate-300 rounded-xl hover:bg-slate-50 hover:border-red-600 transition-all active:scale-95 shadow-sm"><ChevronRight size={20}/></button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 text-center bg-slate-200/80 border-b border-black">
            {daysOfWeek.map(day => (
              <div key={day} className="py-2 md:py-4 text-[6px] sm:text-[7px] md:text-[8px] lg:text-[10px] font-black uppercase tracking-tighter md:tracking-normal text-black shrink-0 leading-tight px-0.5">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-fr">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`e-${i}`} className="h-24 md:h-32 bg-slate-200/30 border border-black"></div>
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const dow = new Date(year, month, day).getDay();
              const dateKey = `${year}-${month + 1}-${day}`;
              const holidayName = holidays[dateKey];
              const morningAgent = !holidayName ? resolveAgent(assignments[`${dateKey}-morning`]) : null;
              const afternoonAgent = !holidayName ? resolveAgent(assignments[`${dateKey}-afternoon`]) : null;
              
              return (
                <div key={day} className={`min-h-[110px] md:min-h-[125px] lg:min-h-[140px] border ${holidayName ? 'border-red-500 bg-red-50/40' : 'border-black'} p-1.5 md:p-2 transition-colors ${!holidayName && (dow === 0 ? 'bg-slate-200' : 'bg-slate-100 hover:bg-white')} day-cell flex flex-col relative overflow-hidden`}>
                  
                  {/* Feriado Watermark */}
                  {holidayName && (
                    <div className="absolute inset-0 flex items-center justify-center -rotate-45 pointer-events-none z-0">
                      <span className="text-red-500/10 text-3xl md:text-5xl font-black uppercase tracking-widest leading-none text-center">{holidayName}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-1.5 md:mb-2 relative z-10">
                    <span className={`text-xs font-black ${holidayName ? 'text-red-600' : 'text-black'}`}>{day}</span>
                    {holidayName ? (
                        <span className="text-[8px] font-black uppercase text-red-600">Feriado</span>
                    ) : dow === 0 ? (
                        <span className="text-[8px] font-black uppercase text-black">Encerrado</span>
                    ) : null}
                  </div>
                  
                  {(dow !== 0 || holidayName) && (
                    <div className="space-y-1.5 flex-1 flex flex-col justify-center relative z-10">
                      {holidayName ? (
                        <div className="flex-1 p-1 lg:p-1.5 rounded-lg border-2 border-red-500 bg-white/80 backdrop-blur-sm text-center flex flex-col items-center justify-center min-h-[2.5rem] shadow-sm">
                           <span className="text-[8px] md:text-[9px] font-black text-red-600 uppercase leading-[1.1] tracking-tighter whitespace-normal break-words block px-0.5">{holidayName}</span>
                        </div>
                      ) : dow !== 0 ? (
                        <>
                          <div 
                            onClick={() => isAdmin && setAssignmentModal({ isOpen: true, day, shift: 'morning' })} 
                            className={`p-1 lg:p-1.5 rounded-lg border-2 border-dashed text-center flex items-center justify-center min-h-[2.5rem] transition-all ${morningAgent ? 'border-transparent text-white shadow-md' : 'border-slate-300 text-slate-500'} ${isAdmin ? 'cursor-pointer hover:border-red-400 bg-white/80' : 'cursor-default bg-white/50'}`} 
                            style={morningAgent ? { backgroundColor: morningAgent.color } : {}}
                          >
                            <span className="pdf-agent-name text-[8px] md:text-[9px] font-black uppercase leading-[1.1] tracking-tighter whitespace-normal break-words block px-0.5">
                              {morningAgent ? (
                                <>
                                  {String(morningAgent.firstName || '')}
                                  <br />
                                  {String(morningAgent.lastName || '')}
                                </>
                              ) : 'Turno Manhã'}
                            </span>
                          </div>
                          {dow !== 6 && (
                            <div 
                              onClick={() => isAdmin && setAssignmentModal({ isOpen: true, day, shift: 'afternoon' })} 
                              className={`p-1 lg:p-1.5 rounded-lg border-2 border-dashed text-center flex items-center justify-center min-h-[2.5rem] transition-all ${afternoonAgent ? 'border-transparent text-white shadow-md' : 'border-slate-300 text-slate-500'} ${isAdmin ? 'cursor-pointer hover:border-red-400 bg-white/80' : 'cursor-default bg-white/50'}`} 
                              style={afternoonAgent ? { backgroundColor: afternoonAgent.color } : {}}
                            >
                              <span className="pdf-agent-name text-[8px] md:text-[9px] font-black uppercase leading-[1.1] tracking-tighter whitespace-normal break-words block px-0.5">
                                {afternoonAgent ? (
                                  <>
                                    {String(afternoonAgent.firstName || '')}
                                    <br />
                                    {String(afternoonAgent.lastName || '')}
                                  </>
                                ) : 'Turno Tarde'}
                              </span>
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// 3. COMPONENTE: VISTA SEMANAL
const VistaSemanal = ({ year, month, daysInMonth, firstDayOfMonth, assignments, isAdmin, setAssignmentModal, resolveAgent, currentWeekIndex, setCurrentWeekIndex, setCurrentDate, holidays }) => {
  const getMonthWeeks = () => {
    const weeks = []; let currentWeek = [];
    for (let i = 0; i < firstDayOfMonth; i++) currentWeek.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(day);
      if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
    }
    if (currentWeek.length > 0) { while (currentWeek.length < 7) currentWeek.push(null); weeks.push(currentWeek); }
    return weeks;
  };
  
  const monthWeeks = getMonthWeeks();
  const currentWeekData = monthWeeks[currentWeekIndex] || monthWeeks[0];

  const handlePrevWeek = () => {
    if (currentWeekIndex > 0) setCurrentWeekIndex(prev => prev - 1);
    else {
      const prevMonth = new Date(year, month - 1, 1);
      setCurrentDate(prevMonth);
      const prevDays = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate();
      const prevFirstDay = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1).getDay();
      setCurrentWeekIndex(Math.ceil((prevFirstDay + prevDays) / 7) - 1);
    }
  };

  const handleNextWeek = () => {
    if (currentWeekIndex < monthWeeks.length - 1) setCurrentWeekIndex(prev => prev + 1);
    else { setCurrentDate(new Date(year, month + 1, 1)); setCurrentWeekIndex(0); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 w-full overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar pb-4 w-full">
        <div className="bg-slate-100 rounded-2xl md:rounded-[32px] shadow-xl border border-black overflow-hidden min-w-[900px] lg:min-w-full">
          <div className="bg-slate-200 px-6 py-4 md:px-8 md:py-5 flex flex-col md:flex-row items-center justify-between border-b border-black gap-4">
            <h3 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tighter">
              {months[month]} <span className="text-red-600">{year}</span>
              <span className="text-sm text-slate-500 ml-4 block md:inline mt-1 md:mt-0">Semana {currentWeekIndex + 1} de {monthWeeks.length}</span>
            </h3>
            <div className="flex gap-2">
              <button onClick={handlePrevWeek} className="p-2.5 md:p-3 bg-white border-2 border-slate-300 rounded-xl hover:bg-slate-50 hover:border-red-600 transition-all active:scale-95 shadow-sm"><ChevronLeft size={20}/></button>
              <button onClick={() => { setCurrentDate(new Date()); setCurrentWeekIndex(Math.floor((new Date().getDay() + new Date().getDate() - 1) / 7)); }} className="px-4 py-2 bg-white border-2 border-slate-300 rounded-xl hover:bg-slate-50 font-black text-[10px] uppercase text-slate-500 hover:text-red-600 transition-all shadow-sm">Esta Semana</button>
              <button onClick={handleNextWeek} className="p-2.5 md:p-3 bg-white border-2 border-slate-300 rounded-xl hover:bg-slate-50 hover:border-red-600 transition-all active:scale-95 shadow-sm"><ChevronRight size={20}/></button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 text-center bg-slate-200/80 border-b border-black">
            {daysOfWeek.map(day => <div key={day} className="py-2 md:py-4 text-[6px] sm:text-[7px] md:text-[8px] lg:text-[10px] font-black uppercase tracking-tighter text-black px-0.5">{day}</div>)}
          </div>

          <div className="grid grid-cols-7 auto-rows-fr">
            {currentWeekData.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="min-h-[250px] bg-slate-200/30 border border-black"></div>;
              
              const dow = new Date(year, month, day).getDay();
              const dateKey = `${year}-${month + 1}-${day}`;
              const holidayName = holidays[dateKey];
              const morningAgent = !holidayName ? resolveAgent(assignments[`${dateKey}-morning`]) : null;
              const afternoonAgent = !holidayName ? resolveAgent(assignments[`${dateKey}-afternoon`]) : null;
              
              return (
                <div key={day} className={`min-h-[250px] border ${holidayName ? 'border-red-500 bg-red-50/40' : 'border-black'} p-3 md:p-4 transition-colors ${!holidayName && (dow === 0 ? 'bg-slate-200' : 'bg-slate-100 hover:bg-white')} flex flex-col relative overflow-hidden`}>
                  
                  {/* Feriado Watermark */}
                  {holidayName && (
                    <div className="absolute inset-0 flex items-center justify-center -rotate-45 pointer-events-none z-0">
                      <span className="text-red-500/10 text-4xl md:text-6xl font-black uppercase tracking-widest leading-none text-center">{holidayName}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <span className={`text-xl md:text-2xl font-black ${holidayName ? 'text-red-600' : 'text-black'}`}>{day}</span>
                    {holidayName ? (
                        <span className="text-[8px] font-black uppercase text-red-600">Feriado</span>
                    ) : dow === 0 ? (
                        <span className="text-[8px] font-black uppercase text-black">Encerrado</span>
                    ) : null}
                  </div>
                  
                  {(dow !== 0 || holidayName) && (
                    <div className="space-y-3 flex-1 flex flex-col relative z-10">
                      {holidayName ? (
                         <div className="flex-1 p-2 rounded-xl border-2 border-red-500 bg-white/80 backdrop-blur-sm text-center flex flex-col items-center justify-center transition-all shadow-sm">
                            <span className="text-[10px] md:text-xs font-black uppercase text-red-600 opacity-90 mb-1">Feriado Nacional</span>
                            <span className="text-sm md:text-base font-black uppercase leading-tight whitespace-normal break-words text-red-600">{holidayName}</span>
                         </div>
                      ) : dow !== 0 ? (
                        <>
                          <div onClick={() => isAdmin && setAssignmentModal({ isOpen: true, day, shift: 'morning' })} className={`flex-1 p-2 rounded-xl border-2 border-dashed text-center flex flex-col items-center justify-center transition-all ${morningAgent ? 'border-transparent text-white shadow-md' : 'border-slate-300 text-slate-500'} ${isAdmin ? 'cursor-pointer hover:border-red-400 bg-white/80' : 'cursor-default bg-white/50'}`} style={morningAgent ? { backgroundColor: morningAgent.color } : {}}>
                            <span className="text-[9px] font-black uppercase opacity-70 mb-1">Manhã</span>
                            <span className="pdf-agent-name text-xs md:text-sm font-black uppercase leading-tight whitespace-normal break-words">
                              {morningAgent ? (
                                <>
                                  {String(morningAgent.firstName || '')}
                                  <br />
                                  {String(morningAgent.lastName || '')}
                                </>
                              ) : '+ Atribuir'}
                            </span>
                          </div>
                          {dow !== 6 && (
                            <div onClick={() => isAdmin && setAssignmentModal({ isOpen: true, day, shift: 'afternoon' })} className={`flex-1 p-2 rounded-xl border-2 border-dashed text-center flex flex-col items-center justify-center transition-all ${afternoonAgent ? 'border-transparent text-white shadow-md' : 'border-slate-300 text-slate-500'} ${isAdmin ? 'cursor-pointer hover:border-red-400 bg-white/80' : 'cursor-default bg-white/50'}`} style={afternoonAgent ? { backgroundColor: afternoonAgent.color } : {}}>
                              <span className="text-[9px] font-black uppercase opacity-70 mb-1">Tarde</span>
                              <span className="pdf-agent-name text-xs md:text-sm font-black uppercase leading-tight whitespace-normal break-words">
                                {afternoonAgent ? (
                                  <>
                                    {String(afternoonAgent.firstName || '')}
                                    <br />
                                    {String(afternoonAgent.lastName || '')}
                                  </>
                                ) : '+ Atribuir'}
                              </span>
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};


// ============================================================================
// COMPONENTE PRINCIPAL (APP)
// ============================================================================
const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState(null);
  
  const isDevEnv = typeof __initial_auth_token !== 'undefined' && __initial_auth_token;
  const isAdmin = isDevEnv || (user && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
  
  // States da UI
  const [activeView, setActiveView] = useState('calendar');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedAgentForFile, setSelectedAgentForFile] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [icsModalOpen, setIcsModalOpen] = useState(false);
  const [bulkEmailModalOpen, setBulkEmailModalOpen] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // Vacation Intervals
  const [absenceDateStart, setAbsenceDateStart] = useState('');
  const [absenceDateEnd, setAbsenceDateEnd] = useState('');
  const [newAgentAbsenceStart, setNewAgentAbsenceStart] = useState('');
  const [newAgentAbsenceEnd, setNewAgentAbsenceEnd] = useState('');
  
  const fileInputRef = useRef(null);
  const [agents, setAgents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentWeekIndex, setCurrentWeekIndex] = useState(() => {
    const d = new Date();
    const fDay = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
    return Math.floor((fDay + d.getDate() - 1) / 7);
  });
  
  // Data State
  const [assignments, setAssignments] = useState({});
  const [assignmentModal, setAssignmentModal] = useState({ isOpen: false, day: null, shift: null });
  const [newAgent, setNewAgent] = useState({ firstName: '', lastName: '', email: '', phone: '', color: '#d50000', weeklyAbsences: [], absences: [] });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const holidays = useMemo(() => getPTnationalHolidays(year), [year]);

  const resolveAgent = useCallback((val) => {
    if (!val) return null;
    const id = typeof val === 'object' ? val.id : val;
    const found = agents.find(a => a.id === id);
    return found || (typeof val === 'object' ? val : null);
  }, [agents]);

  useEffect(() => {
    const scripts = ["https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js", "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"];
    scripts.forEach(src => { const script = document.createElement('script'); script.src = src; script.async = true; document.body.appendChild(script); });
  }, []);

  useEffect(() => {
    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) signInWithCustomToken(auth, __initial_auth_token).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && currentUser.email) {
        const email = currentUser.email.toLowerCase();
        const isDevEnvLocal = typeof __initial_auth_token !== 'undefined' && __initial_auth_token;
        if (!isDevEnvLocal && !email.endsWith('@kwportugal.pt')) {
          await signOut(auth); setUser(null); setLoginError("Acesso Restrito: Deve utilizar o email profissional."); setLoading(false); return;
        }
      }
      setUser(currentUser); setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setLoginError(null);
    try {
      if (firebaseConfig.apiKey === "PREENCHER_AQUI") return setLoginError("Erro: Chaves do Firebase não configuradas.");
      const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error) { setLoginError("Acesso negado. Verifica se autorizaste o domínio."); }
  };

  const handleLogout = async () => { try { await signOut(auth); } catch (error) { console.error("Erro ao sair:", error); } };

  useEffect(() => {
    if (!user || user.isAnonymous) return;
    const unsub = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'agents', 'list'), (snapshot) => {
      if (snapshot.exists()) setAgents(snapshot.data().list || []);
    }, () => setErrorMessage("Erro ao ler base de dados (Consultores)."));
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user || user.isAnonymous) return;
    const unsub = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'scales', `${year}-${month + 1}`), (snapshot) => {
      setAssignments(snapshot.exists() ? snapshot.data().assignments || {} : {});
    }, () => console.error("Erro ao carregar escalas"));
    return () => unsub();
  }, [user, year, month]);

  const saveScaleToCloud = async (data) => {
    if (!isAdmin) return;
    setIsSaving(true);
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'scales', `${year}-${month + 1}`), { assignments: data, lastUpdated: new Date().toISOString() }); } 
    catch (err) { setErrorMessage("Falha ao guardar escala."); } finally { setIsSaving(false); }
  };

  const saveAgentsToCloud = async (list) => {
    if (!isAdmin) return;
    setIsSaving(true);
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'agents', 'list'), { list }); } 
    catch (err) { setErrorMessage("Falha ao atualizar consultores."); } finally { setIsSaving(false); }
  };

  // V2.8: Lógica de Check Availability com Turnos
  const checkAvailability = useCallback((agentId, day, shift) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dow = new Date(year, month, day).getDay();
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return { available: true };
    if (agent.absences?.includes(dateStr)) return { available: false, reason: 'Férias' };
    
    // Fallback de retrocompatibilidade (Dia inteiro registado como número)
    if (agent.weeklyAbsences?.includes(dow)) return { available: false, reason: `Folga Fixa` };
    
    // Verificação de Turnos V2.8 (Ex: "1-morning")
    if (shift && agent.weeklyAbsences?.includes(`${dow}-${shift}`)) {
      return { available: false, reason: `Folga Manhã/Tarde` };
    }

    return { available: true };
  }, [agents, year, month]);

  const autoGenerateScale = async () => {
    if (!isAdmin) return;
    if (agents.length < 2) return setErrorMessage("Adicione pelo menos 2 consultores para gerar a escala.");
    
    const newAssignments = {};
    const shiftCounts = {};
    agents.forEach(a => shiftCounts[a.id] = 0);
    let prevDayLastShiftAgentId = null; 

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${month + 1}-${day}`;
      if (holidays[dateKey]) { prevDayLastShiftAgentId = null; continue; }

      const dow = new Date(year, month, day).getDay();
      if (dow === 0) { prevDayLastShiftAgentId = null; continue; }
      
      const shifts = dow === 6 ? ['morning'] : ['morning', 'afternoon'];
      let currentDayAgents = []; 

      for (const shift of shifts) {
        const available = agents.filter(a => {
          if (!checkAvailability(a.id, day, shift).available) return false; // V2.8 Passa shift
          if (currentDayAgents.includes(a.id)) return false;
          if (shift === 'morning' && a.id === prevDayLastShiftAgentId) return false;
          return true;
        }).sort((a, b) => shiftCounts[a.id] - shiftCounts[b.id]);

        if (available.length > 0) {
          const chosen = available[0];
          newAssignments[`${year}-${month + 1}-${day}-${shift}`] = chosen.id;
          shiftCounts[chosen.id]++;
          currentDayAgents.push(chosen.id);
          if (shift === shifts[shifts.length - 1]) prevDayLastShiftAgentId = chosen.id;
        } else {
          if (shift === shifts[shifts.length - 1]) prevDayLastShiftAgentId = null;
        }
      }
    }
    await saveScaleToCloud(newAssignments);
  };

  const handleUpdateAgent = async (updated) => {
    if (!isAdmin) return;
    const newList = agents.map(a => a.id === updated.id ? updated : a);
    setAgents(newList);
    await saveAgentsToCloud(newList);
    setIsEditingProfile(false);
  };

  const getAgentsWithShifts = useMemo(() => {
    const shiftMap = {};
    Object.entries(assignments).forEach(([key, val]) => {
      const agent = resolveAgent(val);
      if (!agent) return;
      if (!shiftMap[agent.id]) shiftMap[agent.id] = { agent, shifts: [] };
      shiftMap[agent.id].shifts.push(key);
    });
    return Object.values(shiftMap).sort((a, b) => String(a.agent.firstName || '').localeCompare(String(b.agent.firstName || '')));
  }, [assignments, resolveAgent]);

  // V2.8: Função Genérica para Ligar/Desligar Folgas Semanais
  const handleToggleAbsence = (agent, setAgent, key, dayIndex) => {
    let current = [...(agent.weeklyAbsences || [])];
    
    if (typeof key === 'number') {
        if (current.includes(key)) current = current.filter(k => k !== key);
        else current.push(key);
    } else {
        const isFullDay = current.includes(dayIndex);
        if (isFullDay) {
            current = current.filter(k => k !== dayIndex);
            if (key.includes('morning')) current.push(`${dayIndex}-afternoon`);
            else current.push(`${dayIndex}-morning`);
        } else {
            if (current.includes(key)) current = current.filter(k => k !== key);
            else current.push(key);
        }
    }
    setAgent({ ...agent, weeklyAbsences: current });
  };
  
  const isAbsentCheck = (agent, key, dayIndex) => {
      const w = agent.weeklyAbsences || [];
      return w.includes(key) || w.includes(dayIndex);
  };

  // --- Funções de Exportação ---
  const handleFileUpload = async (e) => {
    if (!isAdmin) return;
    const file = e.target.files[0]; if (!file) return;
    if (!window.XLSX) return setErrorMessage("A biblioteca de leitura de Excel ainda está a carregar.");
    setIsSaving(true);
    try {
      const data = await file.arrayBuffer(); const workbook = window.XLSX.read(data);
      const json = window.XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      const newAgents = json.map((row, index) => {
        const nome = row['Nome'] || row['nome'] || '';
        if (!nome) return null;
        return {
          id: `${Date.now()}-${index}`, firstName: String(nome), lastName: String(row['Apelido'] || row['apelido'] || ''),
          email: String(row['Email'] || row['email'] || ''), phone: String(row['Telefone'] || row['telefone'] || row['Contacto'] || ''),
          color: '#d50000', weeklyAbsences: [], absences: []
        };
      }).filter(Boolean);
      if (newAgents.length > 0) { const updated = [...agents, ...newAgents]; setAgents(updated); await saveAgentsToCloud(updated); } 
      else setErrorMessage("Não foi possível importar. Verifique se o ficheiro tem a coluna 'Nome'.");
    } catch (error) { setErrorMessage("Erro ao ler o ficheiro Excel."); } finally { setIsSaving(false); e.target.value = null; }
  };

  const exportAgentsToExcel = () => {
    if (!isAdmin) return;
    if (!window.XLSX) return setErrorMessage("Biblioteca a carregar.");
    if (agents.length === 0) return setErrorMessage("Sem dados para exportar.");
    try {
      const dataToExport = agents.map(agent => ({
        'Nome': agent.firstName, 'Apelido': agent.lastName, 'Email': agent.email, 'Telefone': agent.phone || '',
        'Ausências Pontuais': agent.absences?.map(d => d.split('-').reverse().join('/')).join(', ') || ''
      }));
      const worksheet = window.XLSX.utils.json_to_sheet(dataToExport); worksheet['!cols'] = [{wch: 15}, {wch: 15}, {wch: 30}, {wch: 15}, {wch: 25}, {wch: 35}];
      const workbook = window.XLSX.utils.book_new(); window.XLSX.utils.book_append_sheet(workbook, worksheet, "Consultores");
      window.XLSX.writeFile(workbook, `Base_Dados_KW_Coastline_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) { setErrorMessage("Erro ao gerar Excel."); }
  };

  const exportAccountingToExcel = () => {
    if (!isAdmin) return;
    if (!window.XLSX) return setErrorMessage("Biblioteca a carregar.");
    const stats = {}; agents.forEach(a => { stats[a.id] = { agent: a, morning: 0, afternoon: 0, weekday: 0, weekend: 0, total: 0 }; });
    Object.entries(assignments).forEach(([key, val]) => {
      const agent = resolveAgent(val); if (!agent || !stats[agent.id]) return;
      const [y, m, d, shiftType] = key.split('-'); const dow = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).getDay();
      if (shiftType === 'morning') stats[agent.id].morning++; else stats[agent.id].afternoon++;
      if (dow === 0 || dow === 6) stats[agent.id].weekend++; else stats[agent.id].weekday++;
      stats[agent.id].total++;
    });
    const sortedStats = Object.values(stats).sort((a, b) => b.total - a.total || String(a.agent.firstName || '').localeCompare(String(b.agent.firstName || '')));
    try {
      const dataToExport = sortedStats.map(({ agent, morning, afternoon, weekday, weekend, total }) => ({
        'Consultor': `${agent.firstName} ${agent.lastName}`, 'Turnos Manhã': morning, 'Turnos Tarde': afternoon, 'Dias Úteis': weekday, 'Fim-de-semana': weekend, 'Total': total
      }));
      const worksheet = window.XLSX.utils.json_to_sheet(dataToExport); worksheet['!cols'] = [{wch: 25}, {wch: 15}, {wch: 15}, {wch: 22}, {wch: 22}, {wch: 15}];
      const workbook = window.XLSX.utils.book_new(); window.XLSX.utils.book_append_sheet(workbook, worksheet, `Contabilidade ${months[month]}`);
      window.XLSX.writeFile(workbook, `Contabilidade_KW_Coastline_${months[month]}_${year}.xlsx`);
    } catch (err) { setErrorMessage("Erro ao exportar."); }
  };

  // V2.8 PDF UPDATE
  const exportToPDF = async () => {
    if (!window.jspdf || !window.html2canvas) return setErrorMessage("Ferramentas a carregar.");
    setIsGeneratingPDF(true);
    try {
      const input = document.getElementById('calendar-to-export');
      const canvas = await window.html2canvas(input, {
        scale: 3, useCORS: true, logging: false, backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const calendar = clonedDoc.getElementById('calendar-to-export');
          if (calendar) {
            calendar.style.width = '1440px'; calendar.style.overflow = 'visible'; calendar.style.height = 'auto';
            
            // Forçar layout flex-col para a célula mãe (impede bugs de quebra visual)
            calendar.querySelectorAll('.day-cell').forEach(c => {
                c.style.height = 'auto';
                c.style.minHeight = '150px';
                c.style.display = 'flex'; 
                c.style.flexDirection = 'column';
                c.style.overflow = 'visible';
            });
            
            calendar.querySelectorAll('.day-cell > div').forEach(div => {
                div.style.overflow = 'visible';
                div.style.height = 'auto';
            });
            
            calendar.querySelectorAll('.day-cell div[style*="background-color"], .day-cell div.border-red-500, .day-cell div.border-dashed').forEach(b => { 
                b.style.padding = '8px 4px'; 
                b.style.height = 'auto'; 
                b.style.minHeight = '48px'; 
                b.style.marginBottom = '6px';
                b.style.minWidth = '0';
                b.style.maxWidth = '90%';
                b.style.width = '90%';
                b.style.marginLeft = 'auto';
                b.style.marginRight = 'auto';
            });
            
            calendar.querySelectorAll('.pdf-agent-name').forEach(label => {
                label.style.display = 'block';
                label.style.width = '100%';
                label.style.maxWidth = '100%';
                label.style.minWidth = '0';
                label.style.whiteSpace = 'normal';
                label.style.overflow = 'visible';
                label.style.textOverflow = 'clip';
                label.style.wordBreak = 'normal';
                label.style.overflowWrap = 'anywhere';
                label.style.lineHeight = '1.2';
                label.style.fontSize = '20px';
                label.style.fontWeight = 'bold';
                label.style.letterSpacing = '0';
                label.style.textAlign = 'center';
            });
            
            const nav = calendar.querySelector('.no-print-pdf'); if (nav) nav.style.display = 'none';
          }
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const ratio = pdf.getImageProperties(imgData).width / pdf.getImageProperties(imgData).height;
      const renderWidth = pdf.internal.pageSize.getWidth() - 20; let renderHeight = renderWidth / ratio;
      if (renderHeight > (pdf.internal.pageSize.getHeight() - 30)) renderHeight = pdf.internal.pageSize.getHeight() - 30;
      pdf.setFontSize(16); pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0, 0, 0); pdf.text("Escala ", 10, 12);
      pdf.setTextColor(180, 1, 1); pdf.text("KW ", 10 + pdf.getTextWidth("Escala "), 12);
      pdf.setTextColor(0, 0, 0); pdf.text("Coastline", 10 + pdf.getTextWidth("Escala ") + pdf.getTextWidth("KW "), 12);
      pdf.addImage(imgData, 'PNG', 10, 18, renderWidth, renderHeight);
      pdf.save(`Escala_KW_Coastline_${months[month]}_${year}.pdf`);
    } catch (err) { setErrorMessage("Erro ao processar PDF."); } finally { setIsGeneratingPDF(false); }
  };

  const generateMockAgents = async () => {
    if (!isAdmin) return;
    const firstNames = ["João", "Maria", "Pedro", "Ana", "Ricardo", "Sofia"];
    const lastNames = ["Silva", "Santos", "Ferreira", "Oliveira", "Pereira", "Costa"];
    const mock = firstNames.map((f, i) => ({
      id: (Date.now() + i).toString(), firstName: f, lastName: lastNames[i], email: `${f.toLowerCase()}@kwportugal.pt`,
      phone: `91${Math.floor(1000000 + Math.random() * 9000000)}`, color: '#d50000', weeklyAbsences: [], absences: []
    }));
    await saveAgentsToCloud([...agents, ...mock]);
  };

  const downloadICS = (agentData) => {
    const { agent, shifts } = agentData;
    let icsString = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//KW Coastline//Escalas//PT\r\nCALSCALE:GREGORIAN\r\n";
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    shifts.forEach((key) => {
      const [y, m, d, shiftType] = key.split('-'); const pad = (n) => n.padStart(2, '0');
      const dateStr = `${y}${pad(m)}${pad(d)}`;
      const startTime = shiftType === 'morning' ? '100000' : '140000'; const endTime = shiftType === 'morning' ? '140000' : '180000';
      icsString += `BEGIN:VEVENT\r\nUID:${key}-${agent.id}@kwcoastline.pt\r\nDTSTAMP:${timestamp}\r\nDTSTART:${dateStr}T${startTime}\r\nDTEND:${dateStr}T${endTime}\r\nSUMMARY:${shiftType === 'morning' ? 'Turno Manhã' : 'Turno Tarde'} - KW Coastline\r\nBEGIN:VALARM\r\nTRIGGER:-P1D\r\nACTION:DISPLAY\r\nDESCRIPTION:Lembrete: O teu turno na KW Coastline é amanhã!\r\nEND:VALARM\r\nEND:VEVENT\r\n`;
    });
    icsString += "END:VCALENDAR\r\n";
    const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `Escala_${agent.firstName}_${agent.lastName}_${months[month]}_${year}.ics`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const sendEmailWithICS = (data) => {
    if (!data.agent.email) return alert("Este consultor não tem e-mail registado!");
    downloadICS(data);
    const shiftText = [...data.shifts].sort((a, b) => parseInt(a.split('-')[2]) - parseInt(b.split('-')[2])).map(key => `- Dia ${key.split('-')[2]} de ${months[month]}: ${key.split('-')[3] === 'morning' ? 'Manhã (10:00 - 14:00)' : 'Tarde (14:00 - 18:00)'}`).join('\n');
    window.open(`mailto:${data.agent.email}?subject=${encodeURIComponent(`Escala KW Coastline - ${months[month]} ${year}`)}&body=${encodeURIComponent(`Olá ${data.agent.firstName},\n\nAqui estão os teus turnos para o mês de ${months[month]} ${year}:\n\n${shiftText}\n\n[ATENÇÃO: Em anexo encontras o ficheiro de calendário gerado para ti. Adiciona-o ao teu telemóvel para teres os alarmes automáticos].\n\nObrigado,\nEquipa KW Coastline`)}`, '_blank');
  };

  // --- RENDERIZAÇÃO INICIAL E LOGIN ---
  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6">
      <div className="text-center space-y-6 animate-pulse">
        <RefreshCw className="w-16 h-16 animate-spin mx-auto text-red-600" />
        <div className="flex flex-col items-center"><div className="flex items-center gap-3"><span className="font-black text-5xl text-red-600 italic">KW</span><span className="font-black text-2xl text-white uppercase tracking-tighter">Coastline</span></div><p className="text-[10px] uppercase font-black tracking-[0.5em] text-slate-500 italic mt-4">A carregar sistema master...</p></div>
      </div>
    </div>
  );

  if (!user || user.isAnonymous) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="bg-slate-800/80 backdrop-blur-xl p-10 md:p-14 rounded-[48px] shadow-2xl max-w-md w-full text-center relative z-10 animate-in zoom-in-95 duration-500">
         <div className="flex items-center justify-center gap-2 mb-2"><span className="font-black text-5xl text-red-600 italic tracking-tighter">KW</span><span className="font-black text-3xl uppercase tracking-tight text-white">Coastline</span></div>
         <p className="text-xs text-slate-400 font-bold mb-12 uppercase tracking-[0.3em]">Gestão de Escalas</p>
         <h2 className="text-xl font-black mb-6">Acesso Reservado</h2>
         <p className="text-sm text-slate-400 mb-8 leading-relaxed text-balance">Inicia sessão com a tua conta autorizada Google.</p>
         <button onClick={handleGoogleLogin} className="w-full bg-white text-slate-900 font-black uppercase text-xs tracking-widest py-5 px-6 rounded-2xl hover:bg-slate-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4"><svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>Entrar com Google</button>
         {loginError && <div className="mt-6 p-4 bg-red-900/30 rounded-2xl"><p className="text-red-400 text-xs font-bold">{String(loginError)}</p></div>}
      </div>
    </div>
  );

  // --- MAIN APP RENDER ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col md:flex-row overflow-x-hidden">
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; } input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; } input[type="color"]::-webkit-color-swatch { border: none; border-radius: 4px; }`}</style>

      {/* SIDEBAR V2.8 (Collapsible via State) */}
      <nav className={`hidden md:flex fixed left-0 top-0 h-full w-64 bg-slate-900 text-white z-40 border-r border-slate-800 shadow-2xl flex-col transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-10 border-b border-slate-800 text-center shrink-0">
          <div className="flex items-center justify-center gap-2 mb-2"><span className="font-black text-4xl text-red-600 italic">KW</span><span className="font-black text-xl uppercase tracking-tight">Coastline</span></div>
          <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Market Center Management</span>
        </div>
        <div className="mt-12 px-6 space-y-4 flex-1">
          <button onClick={() => setActiveView('calendar')} className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all ${activeView === 'calendar' ? 'bg-red-600 shadow-xl shadow-red-900/40 translate-x-1' : 'text-slate-400 hover:bg-slate-800'}`}><LayoutDashboard size={20} /> <span className="font-bold text-sm">Escala Mensal</span></button>
          <button onClick={() => { setActiveView('weekly'); setCurrentDate(new Date()); setCurrentWeekIndex(Math.floor((new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() + new Date().getDate() - 1) / 7)); }} className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all ${activeView === 'weekly' ? 'bg-red-600 shadow-xl shadow-red-900/40 translate-x-1' : 'text-slate-400 hover:bg-slate-800'}`}><CalendarDays size={20} /> <span className="font-bold text-sm">Vista Semanal</span></button>
          <button onClick={() => setActiveView('database')} className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all ${activeView === 'database' ? 'bg-red-600 shadow-xl shadow-red-900/40 translate-x-1' : 'text-slate-400 hover:bg-slate-800'}`}><Database size={20} /> <span className="font-bold text-sm">Consultores</span></button>
          <button onClick={() => setActiveView('accounting')} className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all ${activeView === 'accounting' ? 'bg-red-600 shadow-xl shadow-red-900/40 translate-x-1' : 'text-slate-400 hover:bg-slate-800'}`}><Calculator size={20} /> <span className="font-bold text-sm">Contabilidade</span></button>
        </div>
        <div className="p-6 border-t border-slate-800 flex flex-col gap-4">
           {user && !user.isAnonymous && user.email && (
             <div className="flex items-center gap-3 px-2">
               <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-black text-xs">
                 {user.email[0].toUpperCase()}
               </div>
               <div className="overflow-hidden">
                 <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">{isAdmin ? 'Admin' : 'Leitura'}</p>
                 <p className="text-xs font-bold text-slate-300 truncate">{String(user.email)}</p>
               </div>
             </div>
           )}
           <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-red-500 transition-all"><LogOut size={16} /> <span className="font-bold text-xs uppercase">Sair</span></button>
           <div className="flex items-center justify-between px-2 pt-2 border-t border-slate-800"><span className="text-[10px] uppercase font-black tracking-widest text-slate-700">Versão</span><span className="text-[10px] font-black text-red-600 bg-red-600/10 px-2 py-0.5 rounded">V2.8</span></div>
        </div>
      </nav>

      {/* MOBILE HEADER */}
      <header className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2"><span className="font-black text-2xl text-red-600 italic">KW</span><span className="font-bold text-sm uppercase tracking-tight">Coastline</span></div>
        <div className="flex gap-2">
          <button onClick={() => setActiveView('calendar')} className={`p-2 rounded-lg ${activeView === 'calendar' ? 'bg-red-600' : 'bg-slate-800'}`}><LayoutDashboard size={18}/></button>
          <button onClick={() => { setActiveView('weekly'); setCurrentDate(new Date()); setCurrentWeekIndex(Math.floor((new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() + new Date().getDate() - 1) / 7)); }} className={`p-2 rounded-lg ${activeView === 'weekly' ? 'bg-red-600' : 'bg-slate-800'}`}><CalendarDays size={18}/></button>
          <button onClick={() => setActiveView('database')} className={`p-2 rounded-lg ${activeView === 'database' ? 'bg-red-600' : 'bg-slate-800'}`}><Database size={18}/></button>
          <button onClick={() => setActiveView('accounting')} className={`p-2 rounded-lg ${activeView === 'accounting' ? 'bg-red-600' : 'bg-slate-800'}`}><Calculator size={18}/></button>
          <button onClick={handleLogout} className="p-2 rounded-lg bg-slate-800 text-red-500"><LogOut size={18}/></button>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL (Área Central) com margem dinâmica */}
      <div className={`w-full flex flex-col min-h-screen transition-all duration-300 ${isSidebarOpen ? 'md:pl-64' : 'pl-0'}`}>
        <header className="bg-white/95 backdrop-blur-md border-b min-h-[5rem] py-3 hidden md:flex flex-wrap items-center justify-between px-6 lg:px-8 sticky top-0 z-30 shadow-sm gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-all">
              <Menu size={20} />
            </button>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tighter text-slate-800">
                {activeView === 'calendar' ? 'Gestão de Escalas' : activeView === 'weekly' ? 'Vista Semanal' : activeView === 'accounting' ? 'Contabilidade Mensal' : 'Equipa KW Coastline'}
              </h2>
              <div className="flex items-center gap-2 text-green-500 text-[10px] font-black uppercase mt-1">
                <Cloud size={12} className={(isSaving || isGeneratingPDF) ? "text-red-600 animate-spin" : ""} />
                {isSaving ? "A Sincronizar..." : isGeneratingPDF ? "A processar PDF..." : "Base de Dados Online"}
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 lg:gap-3">
            {(activeView === 'calendar' || activeView === 'weekly') && (
              <>
                {activeView === 'calendar' && <button onClick={exportToPDF} disabled={isGeneratingPDF} className="bg-slate-900 text-white px-4 py-2.5 rounded-xl hover:bg-red-600 transition-all font-black text-[10px] uppercase flex items-center gap-2 shadow-sm disabled:opacity-50"><Download size={14} className={isGeneratingPDF ? "animate-bounce" : ""} /> Exportar PDF</button>}
                {isAdmin && (
                  <>
                    <button onClick={() => setIcsModalOpen(true)} className="bg-sky-600 text-white px-4 py-2.5 rounded-xl hover:bg-slate-900 transition-all font-black text-[10px] uppercase flex items-center gap-2 shadow-sm"><CalendarPlus size={14} /> Convites .ics</button>
                    {activeView === 'calendar' && <button onClick={() => setBulkEmailModalOpen(true)} className="bg-sky-600 text-white px-4 py-2.5 rounded-xl hover:bg-slate-900 transition-all font-black text-[10px] uppercase flex items-center gap-2 shadow-sm"><Users size={14} /> Email p/ Todos</button>}
                    {activeView === 'calendar' && <button onClick={autoGenerateScale} className="bg-red-600 text-white px-4 py-2.5 rounded-xl hover:bg-slate-900 transition-all font-black text-[10px] uppercase flex items-center gap-2 shadow-sm"><Sparkles size={14} /> Gerar Automática</button>}
                    {activeView === 'calendar' && <button onClick={() => setShowClearConfirm(true)} className="bg-white border-2 border-slate-100 text-slate-400 px-4 py-2.5 rounded-xl hover:text-red-600 transition-all font-black text-[10px] uppercase flex items-center gap-2"><Eraser size={14} /> Limpar</button>}
                  </>
                )}
              </>
            )}
            {activeView === 'database' && isAdmin && (
              <>
                <input type="file" accept=".xlsx, .xls, .csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                <button onClick={exportAgentsToExcel} className="bg-sky-600 text-white px-4 py-2.5 rounded-xl hover:bg-slate-900 transition-all font-black text-[10px] uppercase flex items-center gap-2 shadow-sm"><Download size={14} /> Exportar</button>
                <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-slate-900 transition-all font-black text-[10px] uppercase flex items-center gap-2 shadow-sm"><Upload size={14} /> Importar</button>
                <button onClick={generateMockAgents} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-slate-900 transition-all font-black text-[10px] uppercase flex items-center gap-2 shadow-sm"><UserCheck size={14} /> Mock 20</button>
                <button onClick={() => setShowDeleteAllConfirm(true)} className="bg-red-600 text-white px-4 py-2.5 rounded-xl hover:bg-red-700 transition-all font-black text-[10px] uppercase flex items-center gap-2 shadow-sm ml-auto"><Trash2 size={14} /> Apagar Todos</button>
              </>
            )}
            {activeView === 'accounting' && isAdmin && (
              <button onClick={exportAccountingToExcel} className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-slate-900 transition-all font-black text-[10px] uppercase flex items-center gap-2 shadow-sm"><Download size={14} /> Exportar Relatório</button>
            )}
          </div>
        </header>

        <main className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full flex-1">
          {errorMessage && (
            <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-6 rounded-2xl flex items-start gap-4 animate-in fade-in shadow-sm">
              <AlertCircle className="text-red-500 shrink-0" size={24} />
              <div className="flex-1"><p className="text-sm font-black text-red-800 uppercase tracking-tight">Status Sistema:</p><p className="text-xs text-red-700 mt-1 font-medium">{String(errorMessage)}</p></div>
              <button onClick={() => setErrorMessage(null)} className="ml-auto p-2 hover:bg-red-200 rounded-xl transition-colors"><X size={20} className="text-red-500" /></button>
            </div>
          )}

          {activeView === 'accounting' && <Contabilidade agents={agents} assignments={assignments} month={month} year={year} setCurrentDate={setCurrentDate} resolveAgent={resolveAgent} />}
          {activeView === 'calendar' && <Calendario year={year} month={month} daysInMonth={daysInMonth} firstDayOfMonth={firstDayOfMonth} assignments={assignments} isAdmin={isAdmin} setAssignmentModal={setAssignmentModal} resolveAgent={resolveAgent} setCurrentDate={setCurrentDate} holidays={holidays} />}
          {activeView === 'weekly' && <VistaSemanal year={year} month={month} daysInMonth={daysInMonth} firstDayOfMonth={firstDayOfMonth} assignments={assignments} isAdmin={isAdmin} setAssignmentModal={setAssignmentModal} resolveAgent={resolveAgent} currentWeekIndex={currentWeekIndex} setCurrentWeekIndex={setCurrentWeekIndex} setCurrentDate={setCurrentDate} holidays={holidays} />}
          
          {activeView === 'database' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
              {isAdmin && (
                <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-[32px] shadow-xl border border-slate-200">
                  <h3 className="text-xs font-black uppercase tracking-[0.4em] mb-6 text-red-600 flex items-center gap-3"><UserPlus size={20} /> Novo Registo na Cloud</h3>
                  <form onSubmit={async (e) => { e.preventDefault(); if (newAgent.firstName && newAgent.lastName) { const agentToSave = { ...newAgent, id: Date.now().toString() }; const newList = [...agents, agentToSave]; setAgents(newList); await saveAgentsToCloud(newList); setNewAgent({ firstName: '', lastName: '', email: '', phone: '', color: '#d50000', weeklyAbsences: [], absences: [] }); } }} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <input required className="bg-slate-50 rounded-xl p-4 text-sm font-bold border-2 border-transparent focus:border-red-600 outline-none" placeholder="Nome" value={newAgent.firstName} onChange={e => setNewAgent({...newAgent, firstName: e.target.value})}/>
                      <input required className="bg-slate-50 rounded-xl p-4 text-sm font-bold border-2 border-transparent focus:border-red-600 outline-none" placeholder="Apelido" value={newAgent.lastName} onChange={e => setNewAgent({...newAgent, lastName: e.target.value})}/>
                      <input required className="bg-slate-50 rounded-xl p-4 text-sm font-bold border-2 border-transparent focus:border-red-600 outline-none" placeholder="Email" value={newAgent.email} onChange={e => setNewAgent({...newAgent, email: e.target.value})}/>
                      <input className="bg-slate-50 rounded-xl p-4 text-sm font-bold border-2 border-transparent focus:border-red-600 outline-none" placeholder="Telefone" value={newAgent.phone} onChange={e => setNewAgent({...newAgent, phone: e.target.value})}/>
                    </div>
                    
                    {/* V2.8 Form UI Modifications */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-50/50 p-6 md:p-8 rounded-[24px] border-2 border-slate-100">
                       
                       {/* Folgas por Turno */}
                       <div className="space-y-4">
                         <div className="flex items-center gap-3 border-b pb-3"><RefreshCw size={16} className="text-red-600" /><h4 className="text-[10px] font-black uppercase text-slate-500">Folgas Semanais Fixas</h4></div>
                         <div className="space-y-2">
                           {/* Segunda a Sexta */}
                           {[1, 2, 3, 4, 5].map(d => (
                             <div key={d} className="flex items-center justify-between p-2.5 bg-white border rounded-xl shadow-sm">
                               <span className="text-[10px] font-black uppercase w-12 text-slate-700">{daysOfWeek[d].substring(0,3)}</span>
                               <div className="flex gap-2">
                                 <button type="button" onClick={() => handleToggleAbsence(newAgent, setNewAgent, `${d}-morning`, d)} className={`px-4 py-1.5 text-[9px] font-bold uppercase rounded-lg transition-colors ${isAbsentCheck(newAgent, `${d}-morning`, d) ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>Manhã</button>
                                 <button type="button" onClick={() => handleToggleAbsence(newAgent, setNewAgent, `${d}-afternoon`, d)} className={`px-4 py-1.5 text-[9px] font-bold uppercase rounded-lg transition-colors ${isAbsentCheck(newAgent, `${d}-afternoon`, d) ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>Tarde</button>
                               </div>
                             </div>
                           ))}
                           {/* Sabado e Domingo */}
                           <div className="grid grid-cols-2 gap-2 mt-2">
                             {[6, 0].map(d => (
                               <div key={d} className="flex items-center justify-between p-2.5 bg-white border rounded-xl shadow-sm">
                                 <span className="text-[10px] font-black uppercase text-slate-700">{daysOfWeek[d].substring(0,3)}</span>
                                 <button type="button" onClick={() => handleToggleAbsence(newAgent, setNewAgent, d, d)} className={`px-4 py-1.5 text-[9px] font-bold uppercase rounded-lg transition-colors ${isAbsentCheck(newAgent, d, d) ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>Dia Completo</button>
                               </div>
                             ))}
                           </div>
                         </div>
                       </div>
                       
                       {/* Ausencias & Cor V2.8 */}
                       <div className="space-y-6">
                         <div className="space-y-4">
                           <div className="flex items-center gap-3 border-b pb-3"><CalendarDays size={16} className="text-red-600" /><h4 className="text-[10px] font-black uppercase text-slate-500">Ausências Pontuais (Férias)</h4></div>
                           <div className="flex flex-col gap-3">
                             <div className="flex gap-2">
                               <input type="date" className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none" value={newAgentAbsenceStart} onChange={e => setNewAgentAbsenceStart(e.target.value)} title="Data de Início" />
                               <span className="flex items-center font-black text-slate-300">até</span>
                               <input type="date" className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none" value={newAgentAbsenceEnd} onChange={e => setNewAgentAbsenceEnd(e.target.value)} title="Data de Fim (Opcional)" />
                             </div>
                             <button type="button" onClick={() => { 
                               if (!newAgentAbsenceStart) return; 
                               const end = newAgentAbsenceEnd || newAgentAbsenceStart;
                               const range = getDatesInRange(newAgentAbsenceStart, end);
                               const unique = [...new Set([...newAgent.absences, ...range])].sort();
                               setNewAgent({...newAgent, absences: unique}); 
                               setNewAgentAbsenceStart(''); setNewAgentAbsenceEnd(''); 
                             }} className="bg-slate-900 text-white px-4 py-2.5 rounded-xl hover:bg-red-600 flex items-center justify-center gap-2 text-xs font-black uppercase">
                               <Plus size={14}/> Adicionar Intervalo
                             </button>
                           </div>
                           <div className="flex flex-wrap gap-1.5 mt-2">
                             {(newAgent.absences || []).map(date => (<span key={date} className="bg-white border px-2 py-1 rounded text-[9px] font-black font-mono shadow-sm">{String(date).split('-').reverse().join('/')}</span>))}
                           </div>
                         </div>
                         
                         <div className="space-y-4">
                           <div className="flex items-center gap-3 border-b pb-3"><h4 className="text-[10px] font-black uppercase text-slate-500">Aparência do Calendário</h4></div>
                           <div className="flex items-center gap-4 bg-white border p-3 rounded-xl shadow-sm">
                             <input type="color" value={newAgent.color} onChange={e => setNewAgent({...newAgent, color: e.target.value})} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
                             <div className="flex-1"><span className="block text-[10px] font-black uppercase text-slate-800">Escolha a Cor (RGB)</span><span className="block text-[9px] text-slate-400 font-mono">{newAgent.color}</span></div>
                           </div>
                         </div>
                       </div>
                    </div>
                    
                    <button type="submit" className="w-full bg-red-600 text-white p-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">Registar Consultor na Cloud</button>
                  </form>
                </div>
              )}
              
              <div className="bg-white rounded-2xl md:rounded-[32px] shadow-xl border border-slate-200 overflow-x-auto custom-scrollbar">
                <table className="w-full text-left min-w-[800px]">
                  <thead><tr className="bg-slate-50/50 border-b border-slate-100"><th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Consultor</th><th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Contactos Cloud</th><th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Folgas</th>{isAdmin && <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">Ações</th>}</tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {agents.map(agent => (
                      <tr key={agent.id} onClick={() => { setSelectedAgentForFile(agent); setIsEditingProfile(false); }} className="hover:bg-slate-50 cursor-pointer transition-all group">
                        <td className="px-6 py-4 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-[16px] flex items-center justify-center text-white text-lg font-black shadow-md shrink-0" style={{ backgroundColor: agent.color }}>{agent.firstName?.[0]?.toUpperCase() || '?'}</div>
                          <div><p className="font-black text-slate-800 uppercase text-sm md:text-base leading-tight truncate max-w-[150px]">{String(agent.firstName || '')} {String(agent.lastName || '')}</p><p className="text-[9px] text-red-600 mt-0.5 uppercase font-black tracking-widest">KW Agent</p></div>
                        </td>
                        <td className="px-6 py-4"><div className="space-y-1"><div className="flex items-center gap-2 text-slate-500 font-bold text-xs"><Mail size={12} /> {String(agent.email || '')}</div><div className="flex items-center gap-2 text-slate-400 font-bold text-xs"><Phone size={12} /> {agent.phone ? String(agent.phone) : '---'}</div></div></td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {agent.weeklyAbsences?.length > 0 ? (
                                <span className="text-[9px] font-black px-2 py-1 bg-red-50 text-red-600 rounded-md border border-red-100">{agent.weeklyAbsences.length} Folgas Atribuídas</span>
                            ) : (
                                <span className="text-[9px] font-black text-slate-300">Sem folgas</span>
                            )}
                          </div>
                        </td>
                        {isAdmin && <td className="px-6 py-4 text-right md:opacity-0 md:group-hover:opacity-100 transition-all"><button onClick={async (e) => { e.stopPropagation(); if(window.confirm(`Remover ${agent.firstName || 'este consultor'}?`)) { const newList = agents.filter(a => a.id !== agent.id); setAgents(newList); await saveAgentsToCloud(newList); } }} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white"><Trash2 size={16} /></button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* --- MODAIS DE GESTÃO --- */}
      {selectedAgentForFile && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-5xl rounded-3xl md:rounded-[40px] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="p-6 md:p-8 text-white relative shrink-0" style={{ backgroundColor: selectedAgentForFile.color }}>
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-24 h-24 rounded-[32px] bg-white flex items-center justify-center text-3xl font-black shadow-xl shrink-0" style={{ color: selectedAgentForFile.color }}>{selectedAgentForFile.firstName?.[0]?.toUpperCase() || '?'}</div>
                <div className="flex-1 text-center md:text-left w-full">
                  {isEditingProfile ? (
                    <div className="flex gap-3">
                      <input className="bg-white/20 border-2 border-white/40 rounded-xl px-4 py-2 text-xl font-black uppercase text-white outline-none w-full" value={selectedAgentForFile.firstName || ''} onChange={(e) => setSelectedAgentForFile({...selectedAgentForFile, firstName: e.target.value})} />
                      <input className="bg-white/20 border-2 border-white/40 rounded-xl px-4 py-2 text-xl font-black uppercase text-white outline-none w-full" value={selectedAgentForFile.lastName || ''} onChange={(e) => setSelectedAgentForFile({...selectedAgentForFile, lastName: e.target.value})} />
                    </div>
                  ) : (
                    <h2 className="text-4xl font-black uppercase tracking-tighter">{String(selectedAgentForFile.firstName || '')} {String(selectedAgentForFile.lastName || '')}</h2>
                  )}
                </div>
                <div className="flex gap-2">
                  {isAdmin && !isEditingProfile && <button onClick={() => setIsEditingProfile(true)} className="p-4 bg-white/10 rounded-2xl hover:bg-white/20 text-white flex gap-2 font-black uppercase text-[10px]"><Pencil size={16}/> Editar</button>}
                  <button onClick={() => { setSelectedAgentForFile(null); setIsEditingProfile(false); setAbsenceDateStart(''); setAbsenceDateEnd(''); }} className="p-4 bg-black/10 rounded-2xl hover:bg-black/20 text-white"><X size={20} /></button>
                </div>
              </div>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Coluna Esquerda: Contactos e Férias */}
                <div className="space-y-8">
                  <div className="space-y-4"><h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] border-b pb-2">Contactos</h4><div className="space-y-3"><div className="flex items-center gap-3"><Mail className="text-slate-300" size={18}/> {isEditingProfile ? <input className="bg-slate-50 border-2 rounded-lg px-3 py-1.5 w-full outline-none" value={selectedAgentForFile.email} onChange={e => setSelectedAgentForFile({...selectedAgentForFile, email: e.target.value})} /> : String(selectedAgentForFile.email || '')}</div><div className="flex items-center gap-3"><Phone className="text-slate-300" size={18}/> {isEditingProfile ? <input className="bg-slate-50 border-2 rounded-lg px-3 py-1.5 w-full outline-none" value={selectedAgentForFile.phone} onChange={e => setSelectedAgentForFile({...selectedAgentForFile, phone: e.target.value})} /> : String(selectedAgentForFile.phone || 'Sem Telefone')}</div></div>
                  {isEditingProfile && (
                     <div className="mt-6 flex items-center gap-4 bg-slate-50 border p-3 rounded-xl">
                       <input type="color" value={selectedAgentForFile.color} onChange={e => setSelectedAgentForFile({...selectedAgentForFile, color: e.target.value})} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
                       <div className="flex-1"><span className="block text-[10px] font-black uppercase text-slate-800">Escolha a Cor (RGB)</span></div>
                     </div>
                  )}</div>
                  
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] border-b pb-2">Ausências Pontuais (Férias)</h4>
                    {isAdmin && (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <input type="date" className="flex-1 bg-slate-50 border-2 rounded-xl px-3 py-1.5 text-xs font-bold outline-none" value={absenceDateStart} onChange={e => setAbsenceDateStart(e.target.value)} title="Início" />
                          <span className="flex items-center font-black text-slate-300">até</span>
                          <input type="date" className="flex-1 bg-slate-50 border-2 rounded-xl px-3 py-1.5 text-xs font-bold outline-none" value={absenceDateEnd} onChange={e => setAbsenceDateEnd(e.target.value)} title="Fim" />
                        </div>
                        <button onClick={() => { 
                          if (!absenceDateStart) return; 
                          const end = absenceDateEnd || absenceDateStart;
                          const range = getDatesInRange(absenceDateStart, end);
                          const cur = selectedAgentForFile.absences || []; 
                          const unique = [...new Set([...cur, ...range])].sort();
                          setSelectedAgentForFile({...selectedAgentForFile, absences: unique}); 
                          setAbsenceDateStart(''); setAbsenceDateEnd('');
                        }} className="bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-red-600 text-xs font-black uppercase flex items-center justify-center gap-2"><Plus size={14}/> Adicionar Ausência</button>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {(selectedAgentForFile.absences || []).map(date => (<div key={date} className="bg-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-2"><span className="text-[9px] font-black font-mono">{String(date).split('-').reverse().join('/')}</span>{isAdmin && <button onClick={() => setSelectedAgentForFile({...selectedAgentForFile, absences: selectedAgentForFile.absences.filter(d => d !== date)})} className="text-red-400"><X size={12} /></button>}</div>))}
                    </div>
                  </div>
                </div>

                {/* Coluna Direita: Nova UI de Folgas de Turno V2.8 */}
                <div className="space-y-4">
                  <div className="flex gap-2 border-b-2 pb-2"><RefreshCw className="text-red-600" size={16} /><h4 className="text-[10px] font-black uppercase text-slate-400">Folgas Fixas</h4></div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                     {/* Dias Úteis */}
                     {[1, 2, 3, 4, 5].map(d => (
                        <div key={d} className="flex items-center justify-between p-2.5 bg-white border rounded-xl shadow-sm">
                          <span className="text-[10px] font-black uppercase w-12 text-slate-700">{daysOfWeek[d].substring(0,3)}</span>
                          <div className="flex gap-2">
                            <button disabled={!isAdmin} onClick={() => handleToggleAbsence(selectedAgentForFile, setSelectedAgentForFile, `${d}-morning`, d)} className={`px-4 py-1.5 text-[9px] font-bold uppercase rounded-lg transition-colors ${isAbsentCheck(selectedAgentForFile, `${d}-morning`, d) ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400'} ${isAdmin && 'hover:bg-slate-200'}`}>Manhã</button>
                            <button disabled={!isAdmin} onClick={() => handleToggleAbsence(selectedAgentForFile, setSelectedAgentForFile, `${d}-afternoon`, d)} className={`px-4 py-1.5 text-[9px] font-bold uppercase rounded-lg transition-colors ${isAbsentCheck(selectedAgentForFile, `${d}-afternoon`, d) ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400'} ${isAdmin && 'hover:bg-slate-200'}`}>Tarde</button>
                          </div>
                        </div>
                      ))}
                      {/* Fins de semana */}
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {[6, 0].map(d => (
                          <div key={d} className="flex items-center justify-between p-2.5 bg-white border rounded-xl shadow-sm">
                            <span className="text-[10px] font-black uppercase text-slate-700">{daysOfWeek[d].substring(0,3)}</span>
                            <button disabled={!isAdmin} onClick={() => handleToggleAbsence(selectedAgentForFile, setSelectedAgentForFile, d, d)} className={`px-4 py-1.5 text-[9px] font-bold uppercase rounded-lg transition-colors ${isAbsentCheck(selectedAgentForFile, d, d) ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400'} ${isAdmin && 'hover:bg-slate-200'}`}>Dia Completo</button>
                          </div>
                        ))}
                      </div>
                  </div>
                </div>

              </div>
            </div>
            
            <div className="p-6 bg-slate-50 border-t flex justify-end gap-3 shrink-0">{isEditingProfile ? (<><button onClick={() => { setIsEditingProfile(false); setSelectedAgentForFile(agents.find(a => a.id === selectedAgentForFile.id)); }} className="px-6 py-3 rounded-xl font-black uppercase text-[10px] text-slate-400">Cancelar</button><button onClick={() => handleUpdateAgent(selectedAgentForFile)} className="bg-green-600 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] hover:bg-green-700 flex gap-2"><Save size={16}/> Guardar</button></>) : (<button onClick={() => { setSelectedAgentForFile(null); setAbsenceDateStart(''); setAbsenceDateEnd(''); }} className="bg-slate-900 text-white px-10 py-3 rounded-xl font-black uppercase text-[10px] hover:bg-red-600">Fechar Ficha</button>)}</div>
          </div>
        </div>
      )}

      {assignmentModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center z-[100] p-4 animate-in zoom-in-95">
          <div className="bg-white w-full max-w-lg rounded-[48px] overflow-hidden shadow-2xl">
            <div className="bg-slate-900 p-10 text-white relative"><h3 className="text-2xl font-black uppercase">Turno {assignmentModal.shift === 'morning' ? 'Manhã' : 'Tarde'}</h3><button onClick={() => setAssignmentModal({ isOpen: false, day: null, shift: null })} className="absolute top-8 right-8 text-slate-400 hover:text-white"><X size={24} /></button></div>
            <div className="p-8 space-y-2 max-h-[450px] overflow-y-auto custom-scrollbar bg-slate-50/30">
              {agents.map(a => {
                const av = checkAvailability(a.id, assignmentModal.day, assignmentModal.shift);
                return (
                  <button key={a.id} onClick={async () => { if (av.available) { const k = `${year}-${month + 1}-${assignmentModal.day}-${assignmentModal.shift}`; const n = { ...assignments, [k]: a.id }; setAssignments(n); await saveScaleToCloud(n); setAssignmentModal({ isOpen: false, day: null, shift: null }); } }} className={`w-full text-left p-4 rounded-3xl flex justify-between group ${av.available ? 'bg-white shadow-sm hover:border-red-500 border border-transparent' : 'opacity-30 bg-slate-100'}`}><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl shrink-0" style={{ backgroundColor: a.color }}></div><span className="font-black text-sm uppercase">{String(a.firstName || '')} {String(a.lastName || '')}</span></div>{av.available ? <Plus size={16} className="text-slate-300 group-hover:text-red-600" /> : <span className="text-[8px] font-black uppercase text-red-600 border border-red-200 px-2 py-1 rounded-lg">{av.reason}</span>}</button>
                );
              })}
            </div>
            <div className="p-6 bg-slate-50 border-t text-center"><button onClick={async () => { const k = `${year}-${month + 1}-${assignmentModal.day}-${assignmentModal.shift}`; const n = { ...assignments }; delete n[k]; setAssignments(n); await saveScaleToCloud(n); setAssignmentModal({ isOpen: false, day: null, shift: null }); }} className="text-[10px] font-black uppercase text-slate-400 hover:text-red-600">Vincular/Remover Consultor</button></div>
          </div>
        </div>
      )}

      {icsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center z-[100] p-4 animate-in zoom-in-95">
          <div className="bg-white w-full max-w-3xl rounded-[40px] md:rounded-[48px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-sky-600 p-8 md:p-10 text-white relative shrink-0"><h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter leading-none flex items-center gap-3"><CalendarPlus size={28}/> Envios de Escala e Calendário</h3><button onClick={() => setIcsModalOpen(false)} className="absolute top-8 right-8 text-sky-200 hover:text-white"><X size={24} /></button></div>
            <div className="p-6 md:p-8 space-y-3 overflow-y-auto custom-scrollbar bg-slate-50/50 flex-1">
              {getAgentsWithShifts.length === 0 ? <p className="text-center py-10 text-slate-400 font-bold uppercase text-[10px]">Escala vazia</p> : getAgentsWithShifts.map(data => (
                <div key={data.agent.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0" style={{ backgroundColor: data.agent.color }}>{data.agent.firstName?.[0]?.toUpperCase() || '?'}</div>
                    <div><h4 className="font-black text-sm uppercase">{String(data.agent.firstName || '')} {String(data.agent.lastName || '')}</h4><p className="text-[10px] font-bold text-slate-400 uppercase">{data.shifts.length} Turnos agendados</p></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => sendEmailWithICS(data)} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-3 rounded-xl font-black text-[10px] uppercase hover:bg-emerald-600 hover:text-white"><Send size={16} /> Enviar Email</button>
                    <button onClick={() => downloadICS(data)} className="flex items-center gap-2 bg-sky-50 text-sky-600 px-4 py-3 rounded-xl font-black text-[10px] uppercase hover:bg-sky-600 hover:text-white"><Download size={16} /> Baixar .ics</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {bulkEmailModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center z-[100] p-4 animate-in zoom-in-95">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-sky-600 p-8 text-white relative shrink-0"><h3 className="text-xl md:text-2xl font-black uppercase flex items-center gap-3"><Users size={28}/> Envio em Massa (BCC)</h3><button onClick={() => setBulkEmailModalOpen(false)} className="absolute top-8 right-8 text-sky-200 hover:text-white"><X size={24} /></button></div>
            <div className="p-8 space-y-6 bg-slate-50/50 flex-1">
              <div className="bg-white p-5 rounded-3xl border shadow-sm space-y-3"><div className="flex gap-3"><div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black">1</div><h4 className="font-black text-sm uppercase">Descarregar PDF</h4></div><button onClick={exportToPDF} disabled={isGeneratingPDF} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase flex justify-center gap-2 hover:bg-red-600"><Download size={16} /> {isGeneratingPDF ? "A Processar..." : "Exportar PDF"}</button></div>
              <div className="bg-white p-5 rounded-3xl border shadow-sm space-y-3"><div className="flex gap-3"><div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black">2</div><h4 className="font-black text-sm uppercase">Abrir E-mail</h4></div><a href={`mailto:?bcc=${encodeURIComponent(agents.map(a => a.email).filter(Boolean).join(','))}&subject=${encodeURIComponent(`Escala KW Coastline - ${months[month]} ${year}`)}&body=${encodeURIComponent(`Olá Colega,\n\nEm anexo as tuas escalas.\n\nObrigado.`)}`} target="_blank" rel="noopener noreferrer" className="w-full bg-sky-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase flex justify-center gap-2 hover:bg-sky-700"><Send size={16} /> Criar E-mail (BCC)</a></div>
            </div>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 bg-slate-900/95 flex items-center justify-center z-[100] p-6">
          <div className="bg-white w-full max-w-md rounded-[48px] p-12 text-center animate-in zoom-in-95"><div className="w-20 h-20 bg-red-50 rounded-[28px] flex justify-center items-center text-red-600 mx-auto mb-8"><Eraser size={40} /></div><h3 className="text-2xl font-black uppercase">Limpar Escala?</h3><div className="mt-12 space-y-3"><button onClick={async () => { await saveScaleToCloud({}); setShowClearConfirm(false); }} className="w-full bg-red-600 text-white py-5 rounded-3xl font-black uppercase text-xs">Sim, Limpar tudo</button><button onClick={() => setShowClearConfirm(false)} className="w-full py-5 text-slate-400 font-black uppercase text-xs">Cancelar</button></div></div>
        </div>
      )}

      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-slate-900/95 flex items-center justify-center z-[100] p-6">
          <div className="bg-red-600 w-full max-w-md rounded-[48px] p-12 text-center border-4 border-red-500 animate-pulse"><div className="w-20 h-20 bg-white/20 rounded-[28px] flex justify-center items-center text-white mx-auto mb-8"><Trash2 size={40} /></div><h3 className="text-3xl font-black uppercase text-white">Apagar Todos?</h3><div className="mt-10 space-y-3 animate-none"><button onClick={async () => { await saveAgentsToCloud([]); setAgents([]); setShowDeleteAllConfirm(false); }} className="w-full bg-white text-red-600 py-5 rounded-3xl font-black uppercase text-xs">Sim, Apagar Todos!</button><button onClick={() => setShowDeleteAllConfirm(false)} className="w-full py-5 text-red-200 font-black uppercase text-xs">Cancelar</button></div></div>
        </div>
      )}
    </div>
  );
};

export default App;