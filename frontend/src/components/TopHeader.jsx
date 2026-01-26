import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Logout } from './icons/Logout';
import { List } from './icons/List';

export function TopHeader({ toggleSidebar }) {
  const { user, logout } = useAuth();

  const [isHovered, setIsHovered] = useState(false);

  const nomeCompleto = user?.nome || 'Usuário';
  const primeiroNome = nomeCompleto.trim().split(" ")[0];

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button className="btn-mobile-menu" onClick={toggleSidebar} title="Abrir Menu"><List /></button>
        
        <div style={{ 
            marginLeft: '-10px', 
            display: 'flex', 
            alignItems: 'center' 
        }}>
            <img 
              src="/logoveritus.png" 
              alt="Veritus" 
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              style={{ 
                height: '40px', 
                marginRight: '8px',
                transition: 'all 0.3s ease',
                transform: isHovered ? 'scale(1.2)' : 'scale(1.0)',
                filter: 'drop-shadow(0px 5px 10px rgba(0,0,0, 0.5))'
                // filter: 'drop-shadow(0px 5px 10px rgba(100,100,100, 0.5))' (adicionar quando tiver tema claro/escuro)
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
          <button
            onClick={logout}
            className="btn danger header-logout-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
          <Logout />
            Sair
          </button>
      </div>
    </header>
  );
}