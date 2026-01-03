import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import styles from './styles.module.css';

export function Login() {
  const navigate = useNavigate();
  const { login, logout, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]); 
  
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
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const response = await api.post("/login/", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      
      const data = response; 
      if (!data.role) data.role = "user";
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
    <div className={styles.wrapper}>
      <main className={`${styles.container} ${styles.loginContainer}`}>
        <section className={styles.card}>
          <h1 className={styles.title}>Login</h1>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div>
              <input 
                type="text" 
                id="username"
                required 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                placeholder="Usuário" 
                className={styles.input}
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
                className={styles.input}
              />
            </div>
            
            <div style={{ gridColumn: '1/-1' }}>
              <button type="submit" className={styles.button} disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </form>
        </section>
      </main>

      <div className={styles.imageHalf}>
        <img src="/logoveritus-login.png" alt="Veritus" className={styles.rightHalfImage} />
      </div>

      {error && (
        <div className={styles.snackbar}>
          {error}
        </div>
      )}
    </div>
  );
}