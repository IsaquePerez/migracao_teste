import { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { Users, User, ChevronDown, Activity, Bug, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';
import './styles.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function RunnerDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null); 
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const { error } = useSnackbar();

  // BUSCA USUARIOS
  useEffect(() => {
    api.get('/usuarios/')
      .then(resp => setUsers(resp || []))
      .catch(() => error("Erro ao carregar lista de usuários."));
  }, [error]);

  // BUSCA DADOS DE PERFORMANCE
  useEffect(() => {
    async function loadPerformance() {
      setLoading(true);
      try {
        const params = selectedUser ? { user_id: selectedUser.id } : {};
        const response = await api.get('/dashboard-runners/performance', { params });
        setData(response);
      } catch (err) {
        error("Erro ao carregar métricas de performance.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadPerformance();
  }, [selectedUser, error]);

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setIsDropdownOpen(false);
  };

  if (loading && !data) return <div className="loading-container">Carregando performance...</div>;

  const safeData = data || {};
  const isTeamView = !selectedUser;

  return (
    <main className="container performance-container">
      
      {/* HEADER E DROPDOWN */}
      <div className="performance-header">
        <div>
          <h2 className="section-title">
            {isTeamView ? 'Performance da Equipe' : `Performance: ${selectedUser.nome}`}
          </h2>
          <p className="section-subtitle">
            {isTeamView 
              ? 'Análise de saúde do produto e ritmo do time' 
              : 'Análise individual de entrega e qualidade'}
          </p>
        </div>

        <div className="user-dropdown-wrapper">
          <button 
            className="dropdown-trigger-btn"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="dropdown-trigger-content">
                {isTeamView ? <Users size={18} /> : <User size={18} />}
                <span>{isTeamView ? 'Visão Geral (Equipe)' : selectedUser.nome}</span>
            </div>
            <ChevronDown size={16} />
          </button>

          {isDropdownOpen && (
            <div className="dropdown-menu-list">
              <div 
                className={`dropdown-item ${isTeamView ? 'active' : ''}`}
                onClick={() => handleUserSelect(null)}
              >
                <Users size={16} />
                <span>Visão da Equipe</span>
              </div>
              <div className="dropdown-divider"></div>
              {users.map(u => (
                <div 
                  key={u.id} 
                  className={`dropdown-item ${selectedUser?.id === u.id ? 'active' : ''}`}
                  onClick={() => handleUserSelect(u)}
                >
                  <User size={16} />
                  <span>{u.nome}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* GRID DE KPIS */}
      <div className="kpi-grid">
        {isTeamView ? (
          <>
            <KPICard 
              label="Taxa de Aprovação" 
              value={`${safeData.stats_equipe?.taxa_aprovacao || 0}%`}
              icon={<CheckCircle size={24} color="#10b981" />}
              desc="Testes com sucesso vs falhas"
              color="#10b981"
            />
            <KPICard 
              label="Densidade de Defeitos" 
              value={safeData.stats_equipe?.densidade_defeitos || 0}
              icon={<Bug size={24} color="#ef4444" />}
              desc="Bugs encontrados por execução"
              color="#ef4444"
            />
            <KPICard 
              label="Execuções Totais" 
              value={safeData.stats_equipe?.total_executions || 0} 
              icon={<Activity size={24} color="#3b82f6" />} 
              desc="Volume total no período"
              color="#3b82f6"
            />
            <KPICard 
              label="Bugs Totais" 
              value={safeData.stats_equipe?.total_defects || 0} 
              icon={<AlertTriangle size={24} color="#f59e0b" />} 
              desc="Total de defeitos reportados"
              color="#f59e0b"
            />
          </>
        ) : (
          <>
            <KPICard 
              label="Caçador de Bugs" 
              value={safeData.stats_testador?.bugs_reportados || 0}
              icon={<Bug size={24} color="#ef4444" />}
              desc="Defeitos únicos reportados"
              color="#ef4444"
            />
            <KPICard 
              label="Produtividade" 
              value={safeData.stats_testador?.total_execucoes || 0}
              icon={<Activity size={24} color="#3b82f6" />}
              desc="Casos de teste executados"
              color="#3b82f6"
            />
            <KPICard 
              label="Taxa de Bloqueio" 
              value={`${safeData.stats_testador?.taxa_bloqueio || 0}%`}
              icon={<AlertTriangle size={24} color="#f59e0b" />}
              desc="% de testes impedidos"
              color="#f59e0b"
            />
            <KPICard 
              label="Rigor (Aprovações)" 
              value={`${(100 - (safeData.stats_testador?.taxa_bloqueio || 0)).toFixed(1)}%`}
              icon={<CheckCircle size={24} color="#10b981" />}
              desc="Estimativa de fluxo limpo"
              color="#10b981"
            />
          </>
        )}
      </div>

      {/* GRAFICOS */}
      <div className="charts-grid">
        
        {/* VELOCIDADE */}
        <div className="chart-card">
          <h3 className="chart-title">{isTeamView ? 'Velocidade da Equipe (30 dias)' : 'Ritmo de Trabalho Individual'}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={safeData.grafico_velocidade || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{fontSize: 12}} />
              <YAxis tick={{fontSize: 12}} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* STATUS E RIGOR */}
        <div className="chart-card">
          <h3 className="chart-title">{isTeamView ? 'Status Global' : 'Perfil de Rigor'}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={safeData.grafico_rigor || []}
                cx="50%" cy="50%"
                innerRadius={60} outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {(safeData.grafico_rigor || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TOP OFENSORES */}
      <div className="chart-card full-width">
        <h3 className="chart-title">Módulos Mais Críticos (Top Ofensores)</h3>
        <ResponsiveContainer width="100%" height={250}>
            <BarChart layout="vertical" data={safeData.grafico_top_modulos || []} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" />
              <YAxis dataKey="label" type="category" width={150} tick={{fontSize: 12}} />
              <Tooltip cursor={{fill: 'transparent'}} />
              <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={25} />
            </BarChart>
        </ResponsiveContainer>
      </div>

    </main>
  );
}

function KPICard({ label, value, icon, desc, color }) {
  return (
    <div className="kpi-card" style={{ borderLeft: `5px solid ${color}` }}>
      <div className="kpi-header">
        <div className="kpi-icon-box" style={{ background: `${color}15` }}>
            {icon}
        </div>
        <h3 className="kpi-value">{value}</h3>
      </div>
      <div>
        <span className="kpi-label">{label}</span>
        <span className="kpi-desc">{desc}</span>
      </div>
    </div>
  );
}