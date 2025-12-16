import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import '../styles/login.css';

export function Login() {
  const navigate = useNavigate();
  // Adicionamos 'logout' e 'isAuthenticated' para verificar e limpar a sessão
  const { login, logout, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // EFEITO DE SEGURANÇA:
  // Se o utilizador chegar a esta página (ex: clicando em "Voltar" no navegador)
  // e ainda estiver autenticado, fazemos logout forçado.
  useEffect(() => {
    if (isAuthenticated) {
      logout();
    }
  }, [isAuthenticated, logout]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post("/login", { username, password });
      
      // Normalização de dados (caso o backend não envie tudo)
      if (!data.role) data.role = username.toLowerCase().includes("admin") ? "admin" : "user";
      if (!data.username) data.username = username;

      login(data);
      if (data.role === 'admin') {
          navigate('/admin', { replace: true });
      } else {
          navigate('/qa/runner', { replace: true });
      }

    } catch (err) {
      console.error(err);
      setError(err.message || "Falha no login. Verifique as credenciais.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-login-wrapper">

      <main className="container narrow">
        <section className="login-card">
          <h1 className="login-section-title">Login</h1>

          {error && (
            <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form-grid">
            <div>
              <input 
                type="text" 
                id="username"
                required 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                placeholder="Usuário" 
              />
            </div>
            <div>
              <input 
                type="password" 
                id="password"
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                placeholder="Senha" 
              />
            </div>
            
            <div className="actions" style={{ gridColumn: '1/-1' }}>
              <button type="submit" className="login-btn primary" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </form>
        </section>
      </main>

      <div className="image-half">
        <img src="/logoveritus-login.png" alt="Veritus" className="right-half-image" />
      </div>

    </div>
  );
}