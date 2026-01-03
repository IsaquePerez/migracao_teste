import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';

export function ProtectedLayout({ roles }) {
  const { user, isAuthenticated, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (loading) return <div className="loading-screen">Carregando...</div>;
  if (!isAuthenticated || !user) return <Navigate to="/" replace />;
  
  const userRole = user.role || user.nivel_acesso?.nome || 'user'; 
  if (roles && !roles.includes(userRole)) return <Navigate to="/" replace />;

  return (
    <div className="app-layout">
      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)} />
      <Sidebar role={userRole} isOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />
      
      <div className="main-content">
         <TopHeader toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} /> 
         
         <div id="main-content-scroll" className="content-scroll-area"> 
            <Outlet />
         </div>
      </div>
    </div>
  );
}