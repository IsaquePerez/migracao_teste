import { Link, useLocation } from 'react-router-dom';

export function Sidebar({ role, isOpen, closeSidebar }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? 'active' : '';
  const handleNavClick = () => { if (window.innerWidth < 768) closeSidebar(); };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
       <div className="brand-wrap"><img src="/logoge.svg" alt="GE" className="brand-logo-ge" /></div>
       <div className="brand-wrap sidebar-brand-separator">
         <img src="/logoveritus.png" alt="Veritus" className="brand-logo-vt" /><div className="brand">Veritus</div>
       </div>
       <nav onClick={handleNavClick}>
         {role === 'admin' && (
           <>
             <div className="nav-section">ADMINISTRAÇÃO</div>
             <Link to="/admin" className={isActive('/admin')}>Dashboard Hub</Link>
             <Link to="/admin/users" className={isActive('/admin/users')}>Acessos</Link>
             <div className="nav-section">ESTRUTURA</div>
             <Link to="/admin/sistemas" className={isActive('/admin/sistemas')}>Sistemas</Link>
             <Link to="/admin/modulos" className={isActive('/admin/modulos')}>Módulos</Link>
             <Link to="/admin/projetos" className={isActive('/admin/projetos')}>Projetos</Link>
             <div className="nav-section">PLANEJAMENTO</div>
             <Link to="/admin/ciclos" className={isActive('/admin/ciclos')}>Ciclos</Link>
             <Link to="/admin/casos" className={isActive('/admin/casos')}>Casos de Testes</Link>
             <div className="nav-section">MONITORAMENTO</div>
             <Link to="/qa/defeitos" className={isActive('/qa/defeitos')}>Gestão de Defeitos</Link>
           </>
         )}
         {role === 'user' && (
           <>
              <div className="nav-section">MINHA ÁREA</div>
              <Link to="/qa/runner" className={isActive('/qa/runner')}>Minhas Tarefas</Link>
              <div className="nav-section">QUALIDADE</div>
              <Link to="/qa/defeitos" className={isActive('/qa/defeitos')}>Meus Reportes</Link>
           </>
         )}
       </nav>
    </aside>
  );
}