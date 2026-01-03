import { useAuth } from '../context/AuthContext';

export function TopHeader({ toggleSidebar }) {
  const { user, logout } = useAuth();
  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button className="btn-mobile-menu" onClick={toggleSidebar} title="Abrir Menu">☰</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div className="header-user-badge">
              <span className="header-user-name">{user?.nome || 'Usuário'}</span>
          </div>
          <button onClick={logout} className="btn danger header-logout-btn">
             Sair
          </button>
      </div>
    </header>
  );
}