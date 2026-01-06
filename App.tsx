
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

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('legalpro_auth') === 'true';
  });

  const [clientes, setClientes] = useState<Cliente[]>(() => {
    const saved = localStorage.getItem('legalpro_clientes');
    return saved ? JSON.parse(saved) : INITIAL_CLIENTES;
  });

  const [processos, setProcessos] = useState<Processo[]>(() => {
    const saved = localStorage.getItem('legalpro_processos');
    return saved ? JSON.parse(saved) : INITIAL_PROCESSOS;
  });

  const [prazos, setPrazos] = useState<Prazo[]>(() => {
    const saved = localStorage.getItem('legalpro_prazos');
    return saved ? JSON.parse(saved) : INITIAL_PRAZOS;
  });

  const [financeiro, setFinanceiro] = useState<Financeiro[]>(() => {
    const saved = localStorage.getItem('legalpro_financeiro');
    return saved ? JSON.parse(saved) : [];
  });

  const [recursos, setRecursos] = useState<Recurso[]>(() => {
    const saved = localStorage.getItem('legalpro_recursos');
    return saved ? JSON.parse(saved) : [];
  });

  const [historico, setHistorico] = useState<HistoricoAlteracao[]>(() => {
    const saved = localStorage.getItem('legalpro_historico');
    return saved ? JSON.parse(saved) : INITIAL_HISTORICO;
  });

  useEffect(() => {
    localStorage.setItem('legalpro_clientes', JSON.stringify(clientes));
    localStorage.setItem('legalpro_processos', JSON.stringify(processos));
    localStorage.setItem('legalpro_prazos', JSON.stringify(prazos));
    localStorage.setItem('legalpro_financeiro', JSON.stringify(financeiro));
    localStorage.setItem('legalpro_recursos', JSON.stringify(recursos));
    localStorage.setItem('legalpro_historico', JSON.stringify(historico));
  }, [clientes, processos, prazos, financeiro, recursos, historico]);

  const handleLogin = (status: boolean) => {
    setIsAuthenticated(status);
    localStorage.setItem('legalpro_auth', status.toString());
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('legalpro_auth');
  };

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
