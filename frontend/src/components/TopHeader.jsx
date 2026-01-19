import { useAuth } from '../context/AuthContext';

export function TopHeader({ toggleSidebar }) {
  const { user, logout } = useAuth();
  
  const nomeCompleto = user?.nome || 'Usuário';

  const primeiroNome = nomeCompleto.trim().split(" ")[0];

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button className="btn-mobile-menu" onClick={toggleSidebar} title="Abrir Menu">☰</button>
        
        <div style={{ 
            marginLeft: '-10px', 
            display: 'flex', 
            alignItems: 'center' 
        }}>
            <img 
                src="/logoveritus.png" 
                alt="Veritus" 
                style={{ 
                    height: '40px', 
                    marginRight: '8px' 
                }} 
            />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div className="header-user-badge">
              <span 
                className="header-user-name"
                title={nomeCompleto} 
                style={{
                  display: 'inline-block',
                  maxWidth: '100px',   
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  verticalAlign: 'middle'
                }}
              >
                {primeiroNome}
              </span>
          </div>
          <button onClick={logout} className="btn danger header-logout-btn">
              Sair
          </button>
      </div>
    </header>
  );
}