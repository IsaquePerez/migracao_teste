import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from '../../context/SnackbarContext'; 
import { api } from '../../services/api';
import styles from './styles.module.css';

export function Login() {
  const navigate = useNavigate();
  const { login, logout, isAuthenticated } = useAuth();
  
  const { error: snackError, success: snackSuccess, warning: snackWarning } = useSnackbar();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (isAuthenticated) {
      logout();
    }
  }, [isAuthenticated, logout]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username.trim()) {
      snackWarning("Por favor, informe o usuário.");
      return;
    }

    if (!password.trim()) {
      snackWarning("Por favor, informe a senha.");
      return;
    }

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
      
      const nomeExibicao = data.nome || data.username || "Usuário";
      
      snackSuccess(`Bem-vindo, ${nomeExibicao}!`);
      
      if (data.role === 'admin') {
           navigate('/admin', { replace: true });
      } else {
           navigate('/qa/runner', { replace: true });
      }

    } catch (err) {
      console.error(err);
      
      const mensagemBackend = err.response?.data?.detail || err.response?.data?.message;
      snackError(mensagemBackend || err.message || "Falha no login. Verifique as credenciais.");
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
    </div>
  );
}