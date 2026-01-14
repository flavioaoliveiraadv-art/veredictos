
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import ProcessesPage from './pages/ProcessesPage';
import AgendaPage from './pages/AgendaPage';
import TasksPage from './pages/TasksPage';
import FinancePage from './pages/FinancePage';
import ReportsPage from './pages/ReportsPage';
import LoginPage from './pages/LoginPage';
import NotificationModal from './components/NotificationModal';
import { Cliente, Processo, Prazo, Financeiro, Recurso, HistoricoAlteracao, Andamento } from './types';

// Extend ImportMeta for Vite environment variables
interface ImportMeta {
  readonly env: {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    [key: string]: string | boolean | undefined;
  };
}
import { INITIAL_CLIENTES, INITIAL_PROCESSOS, INITIAL_HISTORICO, INITIAL_PRAZOS } from './data/mockData';
import { getTodayBR, compareDatesBR } from './utils/formatters';

import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('legalpro_auth') === 'true';
  });

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [prazos, setPrazos] = useState<Prazo[]>([]);
  const [financeiro, setFinanceiro] = useState<Financeiro[]>([]);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [andamentos, setAndamentos] = useState<Andamento[]>([]);
  const [historico, setHistorico] = useState<HistoricoAlteracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [hasCheckedNotifications, setHasCheckedNotifications] = useState(false);
  const [lastSync, setLastSync] = useState<string>(new Date().toISOString());

  // Load Initial Data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Try to load from Supabase
        const { data: dbData, error } = await supabase
          .from('system_data')
          .select('*')
          .single();

        if (dbData && !error) {
          setClientes(dbData.clientes || []);
          setProcessos(dbData.processos || []);
          setPrazos(dbData.prazos || []);
          setFinanceiro(dbData.financeiro || []);
          setRecursos(dbData.recursos || []);
          setAndamentos(dbData.andamentos || []);
          setHistorico(dbData.historico || []);
          setLastSync(dbData.last_updated || new Date().toISOString());
        } else {
          // Fallback to LocalStorage (Migration)
          const savedClientes = localStorage.getItem('legalpro_clientes');
          const savedProcessos = localStorage.getItem('legalpro_processos');
          const savedPrazos = localStorage.getItem('legalpro_prazos');
          const savedFinanceiro = localStorage.getItem('legalpro_financeiro');
          const savedRecursos = localStorage.getItem('legalpro_recursos');
          const savedAndamentos = localStorage.getItem('legalpro_andamentos');
          const savedHistorico = localStorage.getItem('legalpro_historico');

          const safeParse = (data: string | null, fallback: any) => {
            try { return data ? JSON.parse(data) : fallback; } catch { return fallback; }
          };

          setClientes(safeParse(savedClientes, INITIAL_CLIENTES));
          setProcessos(safeParse(savedProcessos, INITIAL_PROCESSOS));
          setPrazos(safeParse(savedPrazos, INITIAL_PRAZOS));
          setFinanceiro(safeParse(savedFinanceiro, []));
          setRecursos(safeParse(savedRecursos, []));
          setAndamentos(safeParse(savedAndamentos, []));
          setHistorico(safeParse(savedHistorico, INITIAL_HISTORICO));
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Subscribe to Realtime Changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_data',
          filter: 'id=eq.global_state'
        },
        (payload: any) => {
          const newData = payload.new;
          if (newData && newData.last_updated) {
            // Only update if the remote data is newer than our last known sync
            setLastSync(current => {
              if (new Date(newData.last_updated).getTime() > new Date(current).getTime()) {
                setClientes(newData.clientes || []);
                setProcessos(newData.processos || []);
                setPrazos(newData.prazos || []);
                setFinanceiro(newData.financeiro || []);
                setRecursos(newData.recursos || []);
                setAndamentos(newData.andamentos || []);
                setHistorico(newData.historico || []);
                return newData.last_updated;
              }
              return current;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Sync with Supabase on any change
  useEffect(() => {
    if (loading) return;

    const saveData = async () => {
      const timestamp = new Date().toISOString();
      const payload = {
        clientes,
        processos,
        prazos,
        financeiro,
        recursos,
        andamentos,
        historico,
        last_updated: timestamp
      };

      // Save to LocalStorage for fallback
      localStorage.setItem('legalpro_clientes', JSON.stringify(clientes));
      localStorage.setItem('legalpro_processos', JSON.stringify(processos));
      localStorage.setItem('legalpro_prazos', JSON.stringify(prazos));
      localStorage.setItem('legalpro_financeiro', JSON.stringify(financeiro));
      localStorage.setItem('legalpro_recursos', JSON.stringify(recursos));
      localStorage.setItem('legalpro_andamentos', JSON.stringify(andamentos));
      localStorage.setItem('legalpro_historico', JSON.stringify(historico));

      // Save to Supabase (Upsert)
      try {
        await supabase
          .from('system_data')
          .upsert({ id: 'global_state', ...payload });

        // Update our local sync tracking to avoid re-pulling what we just sent
        setLastSync(timestamp);
      } catch (err) {
        console.error('Error syncing with Supabase:', err);
      }
    };

    const timeout = setTimeout(saveData, 1000); // Debounce
    return () => clearTimeout(timeout);
  }, [clientes, processos, prazos, financeiro, recursos, andamentos, historico, loading]);

  // Handle Notifications on Login
  useEffect(() => {
    if (isAuthenticated && !loading && !hasCheckedNotifications && prazos.length > 0) {
      const todayBR = getTodayBR();
      const hasAlerts = prazos.filter(p =>
        !p.concluido &&
        !p.cancelado &&
        compareDatesBR(p.dataVencimento, todayBR) <= 0
      ).length > 0;

      if (hasAlerts) {
        setShowNotificationModal(true);
      }
      setHasCheckedNotifications(true);
    }
  }, [isAuthenticated, loading, prazos, hasCheckedNotifications]);

  const overdueAlerts = prazos.filter(p => !p.concluido && !p.cancelado && compareDatesBR(p.dataVencimento, getTodayBR()) < 0);
  const todayAlerts = prazos.filter(p => !p.concluido && !p.cancelado && p.dataVencimento === getTodayBR());

  const handleLogin = (status: boolean) => {
    setIsAuthenticated(status);
    sessionStorage.setItem('legalpro_auth', status.toString());
    if (status) {
      window.location.hash = '#/';
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('legalpro_auth');
    localStorage.removeItem('legalpro_auth'); // Final cleanup of legacy key
    window.location.hash = '#/';
  };

  const sortedClientes = React.useMemo(() => {
    return [...clientes].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [clientes]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1726] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => handleLogin(true)} />;
  }

  return (
    <Router>
      <div className="flex h-screen bg-[#f8fafc]">
        <Sidebar onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Routes>
            <Route path="/" element={<DashboardPage clientes={sortedClientes} processos={processos} prazos={prazos} financeiro={financeiro} />} />
            <Route path="/clientes" element={<ClientsPage clientes={sortedClientes} setClientes={setClientes} processos={processos} setProcessos={setProcessos} financeiro={financeiro} historico={historico} setHistorico={setHistorico} />} />
            <Route path="/processos" element={<ProcessesPage processos={processos} setProcessos={setProcessos} clientes={sortedClientes} setPrazos={setPrazos} prazos={prazos} recursos={recursos} setRecursos={setRecursos} andamentos={andamentos} setAndamentos={setAndamentos} historico={historico} setHistorico={setHistorico} financeiro={financeiro} />} />
            <Route path="/agenda" element={<AgendaPage prazos={prazos} processos={processos} clientes={sortedClientes} financeiro={financeiro} />} />
            <Route path="/tarefas" element={<TasksPage prazos={prazos} setPrazos={setPrazos} processos={processos} clientes={sortedClientes} financeiro={financeiro} historico={historico} setHistorico={setHistorico} />} />
            <Route path="/financeiro" element={<FinancePage financeiro={financeiro} setFinanceiro={setFinanceiro} clientes={sortedClientes} processos={processos} prazos={prazos} />} />
            <Route path="/relatorios/*" element={<ReportsPage clientes={sortedClientes} processos={processos} prazos={prazos} financeiro={financeiro} recursos={recursos} andamentos={andamentos} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {showNotificationModal && (
        <NotificationModal
          overdue={overdueAlerts}
          today={todayAlerts}
          clientes={sortedClientes}
          processos={processos}
          onClose={() => setShowNotificationModal(false)}
          onViewTasks={() => {
            setShowNotificationModal(false);
            window.location.hash = '#/tarefas';
          }}
        />
      )}
    </Router>
  );
};

export default App;
// Deployment: 2026-01-07 - Redeploy trigger
