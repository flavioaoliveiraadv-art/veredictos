
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import ProcessesPage from './pages/ProcessesPage';
import AgendaPage from './pages/AgendaPage';
import TasksPage from './pages/TasksPage';
import FinancePage from './pages/FinancePage';
import LoginPage from './pages/LoginPage';
import { Cliente, Processo, Prazo, Financeiro, Recurso, HistoricoAlteracao } from './types';
import { INITIAL_CLIENTES, INITIAL_PROCESSOS, INITIAL_HISTORICO, INITIAL_PRAZOS } from './data/mockData';

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
  const [historico, setHistorico] = useState<HistoricoAlteracao[]>([]);
  const [loading, setLoading] = useState(true);

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
          setHistorico(dbData.historico || []);
        } else {
          // Fallback to LocalStorage (Migration)
          const savedClientes = localStorage.getItem('legalpro_clientes');
          const savedProcessos = localStorage.getItem('legalpro_processos');
          const savedPrazos = localStorage.getItem('legalpro_prazos');
          const savedFinanceiro = localStorage.getItem('legalpro_financeiro');
          const savedRecursos = localStorage.getItem('legalpro_recursos');
          const savedHistorico = localStorage.getItem('legalpro_historico');

          setClientes(savedClientes ? JSON.parse(savedClientes) : INITIAL_CLIENTES);
          setProcessos(savedProcessos ? JSON.parse(savedProcessos) : INITIAL_PROCESSOS);
          setPrazos(savedPrazos ? JSON.parse(savedPrazos) : INITIAL_PRAZOS);
          setFinanceiro(savedFinanceiro ? JSON.parse(savedFinanceiro) : []);
          setRecursos(savedRecursos ? JSON.parse(savedRecursos) : []);
          setHistorico(savedHistorico ? JSON.parse(savedHistorico) : INITIAL_HISTORICO);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Sync with Supabase on any change
  useEffect(() => {
    if (loading) return;

    const saveData = async () => {
      const payload = {
        clientes,
        processos,
        prazos,
        financeiro,
        recursos,
        historico,
        last_updated: new Date().toISOString()
      };

      // Save to LocalStorage for fallback
      localStorage.setItem('legalpro_clientes', JSON.stringify(clientes));
      localStorage.setItem('legalpro_processos', JSON.stringify(processos));
      localStorage.setItem('legalpro_prazos', JSON.stringify(prazos));
      localStorage.setItem('legalpro_financeiro', JSON.stringify(financeiro));
      localStorage.setItem('legalpro_recursos', JSON.stringify(recursos));
      localStorage.setItem('legalpro_historico', JSON.stringify(historico));

      // Save to Supabase (Upsert)
      try {
        await supabase
          .from('system_data')
          .upsert({ id: 'global_state', ...payload });
      } catch (err) {
        console.error('Error syncing with Supabase:', err);
      }
    };

    const timeout = setTimeout(saveData, 1000); // Debounce
    return () => clearTimeout(timeout);
  }, [clientes, processos, prazos, financeiro, recursos, historico, loading]);

  const handleLogin = (status: boolean) => {
    setIsAuthenticated(status);
    sessionStorage.setItem('legalpro_auth', status.toString());
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('legalpro_auth');
    localStorage.removeItem('legalpro_auth'); // Final cleanup of legacy key
  };

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
            <Route path="/" element={<DashboardPage clientes={clientes} processos={processos} prazos={prazos} financeiro={financeiro} />} />
            <Route path="/clientes" element={<ClientsPage clientes={clientes} setClientes={setClientes} processos={processos} setProcessos={setProcessos} financeiro={financeiro} historico={historico} setHistorico={setHistorico} />} />
            <Route path="/processos" element={<ProcessesPage processos={processos} setProcessos={setProcessos} clientes={clientes} setPrazos={setPrazos} prazos={prazos} recursos={recursos} setRecursos={setRecursos} historico={historico} setHistorico={setHistorico} financeiro={financeiro} />} />
            <Route path="/agenda" element={<AgendaPage prazos={prazos} processos={processos} clientes={clientes} financeiro={financeiro} />} />
            <Route path="/tarefas" element={<TasksPage prazos={prazos} setPrazos={setPrazos} processos={processos} clientes={clientes} financeiro={financeiro} historico={historico} setHistorico={setHistorico} />} />
            <Route path="/financeiro" element={<FinancePage financeiro={financeiro} setFinanceiro={setFinanceiro} clientes={clientes} processos={processos} prazos={prazos} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
// Deployment: 2026-01-07 - Redeploy trigger
