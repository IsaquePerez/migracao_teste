import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from '../../context/SnackbarContext';
import { 
  PieChart, Pie, Cell, 
  Tooltip, Legend, ResponsiveContainer,
  LineChart, Line 
} from 'recharts';
import { Pencil } from 'lucide-react';
import { api } from '../../services/api';
import './styles.css'; 
import { SmartTable } from '../../components/SmartTable';

// --- Mapeamento de Cores e Funções Auxiliares ---
const STATUS_COLORS = {
  'passou': '#10b981', 'falhou': '#ef4444', 'bloqueado': '#f59e0b', 
  'pendente': '#94a3b8', 'em_progresso': '#3b82f6', 'em_execucao': '#3b82f6'
};
const SEVERITY_COLORS = {
  'critico': '#991b1b', 'alto': '#ef4444', 'medio': '#f59e0b', 'baixo': '#3b82f6'
};

const getStatusColor = (s) => { if(!s) return '#cbd5e1'; return STATUS_COLORS[s.toLowerCase().replace(' ','_')] || '#cbd5e1'; };
const getSeverityColor = (s) => { if(!s) return '#cbd5e1'; return SEVERITY_COLORS[s.toLowerCase().trim()] || '#8884d8'; };

export function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // --- ESTADOS DO MODAL DE DETALHES ---
  const [activeDetail, setActiveDetail] = useState(null);
  const [detailsData, setDetailsData] = useState([]); // Dados reais da lista
  const [loadingDetails, setLoadingDetails] = useState(false); // Loading do modal

  const { error } = useSnackbar();
  const navigate = useNavigate(); 
  const detailsRef = useRef(null);

  // --- Carrega KPIs Iniciais ---
  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await api.get('/dashboard/');
        setData(response);
      } catch (err) {
        error("Erro ao carregar dashboard.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [error]);

  // --- Carrega Detalhes quando abre o Modal ---
  useEffect(() => {
    if (activeDetail === 'projetos') {
      fetchProjectsList();
    }
    // Se tiver outros cards clicáveis (ex: ciclos), adicione 'else if' aqui
  }, [activeDetail]);

  const fetchProjectsList = async () => {
    setLoadingDetails(true);
    try {
        // Chama a API real de listagem de projetos
        const response = await api.get('/projetos/');
        setDetailsData(Array.isArray(response) ? response : []); 
    } catch (err) {
        error("Erro ao carregar lista de projetos.");
    } finally {
        setLoadingDetails(false);
    }
  };

  const handleEditProject = (id) => {
    console.log(`Navegando para edição do projeto ${id}`);
    navigate(`/projetos/${id}`); 
  };

  // --- COLUNAS DINÂMICAS PARA A TABELA DE PROJETOS ---
  const colunasProjetos = [
    { header: 'ID', accessor: 'id', width: '50px' },
    { header: 'Nome do Projeto', accessor: 'nome' },
    { 
      header: 'Responsável', 
      accessor: 'responsavel',
      render: (item) => {
         // O backend pode retornar o nome direto ou um objeto { id, nome }
         // Ajuste conforme seu schema. Geralmente lista simples retorna nome ou ID.
         if (typeof item.responsavel === 'object') return item.responsavel?.nome || '-';
         return item.responsavel || '-'; 
      }
    },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (item) => {
        // Normaliza status para comparação (backend manda 'ativo', 'concluido' etc)
        const statusMap = {
            'ativo': { bg: '#dcfce7', color: '#166534', label: 'Ativo' },
            'em_pausa': { bg: '#fef9c3', color: '#854d0e', label: 'Em Pausa' },
            'concluido': { bg: '#dbeafe', color: '#1e40af', label: 'Concluído' },
            'arquivado': { bg: '#f3f4f6', color: '#374151', label: 'Arquivado' }
        };
        // Fallback se o status não estiver no mapa
        const style = statusMap[item.status?.toLowerCase()] || { bg: '#f3f4f6', color: '#374151', label: item.status };

        return (
          <span style={{
            padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold',
            backgroundColor: style.bg,
            color: style.color
          }}>
            {style.label}
          </span>
        ) 
      }
    },
    {
      header: 'Ação',
      accessor: 'id_action', // Use um accessor diferente para não confundir a SmartTable
      width: '80px',
      render: (item) => (
        <button 
          onClick={(e) => {
             e.stopPropagation();
             handleEditProject(item.id);
          }}
          style={{
            background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px',
            padding: '6px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center',
            transition: 'all 0.2s'
          }}
          title="Editar Projeto"
        >
          <Pencil size={16} />
        </button>
      )
    }
  ];

  if (loading) return <div className="loading-container">Carregando indicadores...</div>;
  if (!data) return <div className="no-data">Sem dados para exibir.</div>;

  const statusExecucaoData = data.charts?.status_execucao || [];
  const defeitosSeveridadeData = data.charts?.defeitos_por_severidade || [];

  return (
    <main className="container dashboard-container">
      <h2 className="section-title">Visão Geral do QA</h2>

      {/* --- GRID DE KPIS --- */}
      <div className="kpi-grid">
        
        {/* CARD PROJETOS (CLICÁVEL) */}
        <div 
          onClick={() => setActiveDetail('projetos')} 
          style={{ cursor: 'pointer' }}
          title="Clique para ver lista de projetos"
        >
          <KpiCard 
            value={data.kpis.total_projetos} label="PROJETOS ATIVOS" color="#3b82f6" 
            gradient="linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)"
          />
        </div>

        {/* OUTROS CARDS (AINDA NÃO CLICÁVEIS - Pode implementar igual acima) */}
        <KpiCard value={data.kpis.total_ciclos_ativos} label="CICLOS RODANDO" color="#10b981" gradient="linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)" />
        <KpiCard value={data.kpis.total_casos_teste} label="TOTAL DE CASOS" color="#8b5cf6" gradient="linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)" />
        <KpiCard value={`${data.kpis.taxa_sucesso_ciclos}%`} label="TAXA DE SUCESSO" color="#059669" gradient="linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)" />
        <KpiCard value={data.kpis.total_defeitos_abertos} label="BUGS ABERTOS" color="#ef4444" gradient="linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)" />
        <KpiCard value={data.kpis.total_defeitos_criticos} label="BUGS CRÍTICOS" color="#991b1b" gradient="linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)" />
        <KpiCard value={data.kpis.total_pendentes} label="TESTES PENDENTES" color="#282768" gradient="linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)" />
        <KpiCard value={data.kpis.total_aguardando_reteste} label="AGUARDANDO RETESTE" color="#6366f1" gradient="linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)" />
      </div>

      {/* --- GRÁFICOS --- */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">Status de Execução</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={statusExecucaoData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" nameKey="label">
                {statusExecucaoData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || getStatusColor(entry.label)} stroke="none"/>
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, name.toUpperCase()]} />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Defeitos por Severidade</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={defeitosSeveridadeData} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                {defeitosSeveridadeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getSeverityColor(entry.label)} stroke="none" />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, `Severidade: ${name}`]} />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* --- MODAL DE DETALHES --- */}
      {activeDetail === 'projetos' && (
        <div className="dash-modal-overlay" onClick={() => setActiveDetail(null)}>
           <div className="dash-modal-content" onClick={e => e.stopPropagation()}>
              <div className="dash-modal-header">
                 <h3>Detalhamento: Projetos Ativos</h3>
                 <button className="dash-close-btn" onClick={() => setActiveDetail(null)}>&times;</button>
              </div>
              
              <div className="dash-modal-body">
                 {loadingDetails ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                        Carregando lista de projetos...
                    </div>
                 ) : (
                    <SmartTable 
                        data={detailsData} 
                        columns={colunasProjetos}
                        title="Lista de Projetos Encontrados"
                    />
                 )}
              </div>
           </div>
        </div>
      )}
    </main>
  );
}

function KpiCard({ value, label, color, gradient }) {
  const fakeData = Array.from({length: 8}, () => ({ val: 30 + Math.random() * 50 }));
  return (
    <div className="kpi-card" style={{ borderLeft: `5px solid ${color}`, background: gradient || '#ffffff' }}>
      <div className="kpi-content">
        <h3 className="kpi-value" style={{ color: '#1e293b' }}>{value}</h3>
        <span className="kpi-label" style={{ color: '#475569' }}>{label}</span>
      </div>
      <div className="kpi-chart-mini">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={fakeData}>
            <Line type="monotone" dataKey="val" stroke={color} strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}