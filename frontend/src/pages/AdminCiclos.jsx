import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function AdminCiclos() {
  const [projetos, setProjetos] = useState([]);
  const [selectedProjeto, setSelectedProjeto] = useState('');
  const [ciclos, setCiclos] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [view, setView] = useState('list');
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    status: 'planejado'
  });

  // --- CARREGAMENTO INICIAL ---
  useEffect(() => {
    api.get("/projetos").then(data => {
      setProjetos(data);
      // Seleciona o primeiro projeto ATIVO por padrão
      const ativos = data.filter(p => p.status === 'ativo');
      if (ativos.length > 0) setSelectedProjeto(ativos[0].id);
    });
  }, []);

  useEffect(() => {
    if (selectedProjeto) loadCiclos(selectedProjeto);
  }, [selectedProjeto]);

  const loadCiclos = async (projId) => {
    setLoading(true);
    try {
      const data = await api.get(`/testes/projetos/${projId}/ciclos`);
      setCiclos(Array.isArray(data) ? data : []);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  // --- LÓGICA DE BLOQUEIO DO PROJETO ---
  const currentProject = projetos.find(p => p.id == selectedProjeto);
  const isProjectActive = currentProject?.status === 'ativo';

  // --- HELPERS ---
  const formatForInput = (dateString) => dateString ? dateString.split('T')[0] : '';
  
  const formatDateTable = (dateString) => {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const getHojeISO = () => {
      const hoje = new Date();
      return new Date(hoje.getTime() - (hoje.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  };

  // --- AÇÕES ---
  
  // Função unificada para criar novo (usada no Header e no Empty State)
  const handleNew = () => {
      if (!isProjectActive) return alert(`Projeto ${currentProject?.status}. Criação bloqueada.`);
      
      setView('form');
      setEditingId(null);
      setForm({ nome: '', descricao: '', data_inicio: '', data_fim: '', status: 'planejado' });
  };

  const handleEdit = (ciclo) => {
    setForm({
      nome: ciclo.nome,
      descricao: ciclo.descricao || '',
      data_inicio: formatForInput(ciclo.data_inicio),
      data_fim: formatForInput(ciclo.data_fim),
      status: ciclo.status
    });
    setEditingId(ciclo.id);
    setView('form');
  };

  const handleDelete = async (id) => {
    if(!confirm("Tem a certeza que deseja excluir este ciclo?")) return;
    try {
        await api.delete(`/testes/ciclos/${id}`);
        loadCiclos(selectedProjeto);
    } catch (e) { alert("Erro ao excluir."); }
  };

  const handleCancel = () => {
    setView('list');
    setEditingId(null);
    setForm({ nome: '', descricao: '', data_inicio: '', data_fim: '', status: 'planejado' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProjeto) return alert("Selecione um projeto!");
    if (!form.data_inicio || !form.data_fim) return alert("Preencha as datas.");

    try {
      const payload = { 
          ...form, 
          projeto_id: parseInt(selectedProjeto),
          data_inicio: new Date(form.data_inicio).toISOString(),
          data_fim: new Date(form.data_fim).toISOString()
      };

      if (editingId) {
          await api.put(`/testes/ciclos/${editingId}`, payload);
          alert("Ciclo atualizado!");
      } else {
          await api.post(`/testes/projetos/${selectedProjeto}/ciclos`, payload);
          alert("Ciclo criado!");
      }
      handleCancel();
      loadCiclos(selectedProjeto);
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar: " + (error.response?.data?.detail || error.message));
    }
  };

  const getStatusColor = (st) => {
      switch(st) {
          case 'em_execucao': return '#dbeafe';
          case 'concluido': return '#dcfce7';
          case 'atrasado': return '#fee2e2';
          default: return '#f3f4f6';
      }
  };

  return (
    <main className="container">
      <style>{`
        tr.hover-row { transition: background-color 0.2s; }
        tr.hover-row:hover { background-color: #f1f5f9 !important; cursor: pointer; }
      `}</style>

      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', paddingBottom: '15px', borderBottom: '1px solid #e5e7eb'}}>
        <div>
           <h2 style={{margin: 0, color: '#1e293b'}}>Gestão de Ciclos</h2>
           <p className="muted" style={{margin: '5px 0 0 0'}}>Gerencie Sprints e períodos de execução.</p>
        </div>
        
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
           {/* SELETOR DE PROJETO */}
           <div style={{textAlign: 'right'}}>
             <label style={{display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', marginBottom: '2px'}}>PROJETO ATIVO</label>
             <select 
                value={selectedProjeto} 
                onChange={e => setSelectedProjeto(e.target.value)}
                style={{padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', minWidth: '200px', fontWeight: 500}}
             >
                {projetos
                    .filter(p => p.status === 'ativo')
                    .map(p => <option key={p.id} value={p.id}>{p.nome}</option>)
                }
             </select>
           </div>
           
           {/* BOTÃO DE AÇÃO NO HEADER */}
           {view === 'list' ? (
             <button 
                onClick={handleNew} 
                className="btn primary"
                style={{
                    height: '40px', padding: '0 20px',
                    opacity: isProjectActive ? 1 : 0.5,
                    cursor: isProjectActive ? 'pointer' : 'not-allowed'
                }}
                disabled={!isProjectActive}
                title={!isProjectActive ? `Projeto ${currentProject?.status}: criação bloqueada` : 'Novo Ciclo'}
             >
               Novo Ciclo
             </button>
           ) : (
             <button onClick={handleCancel} className="btn" style={{height: '40px'}}>Voltar à Lista</button>
           )}
        </div>
      </div>

      {view === 'form' && (
        <section className="card">
          <h3 style={{marginTop:0}}>{editingId ? 'Editar Ciclo' : 'Novo Ciclo'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
               <div style={{gridColumn: '1/-1'}}>
                 <label>Nome do Ciclo / Sprint</label>
                 <input required value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Ex: Sprint 32" />
               </div>
               <div style={{gridColumn: '1/-1'}}>
                 <label>Descrição</label>
                 <textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px'}}/>
               </div>
               <div>
                 <label>Início</label>
                 <input type="date" required value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} min={!editingId ? getHojeISO() : undefined}/>
               </div>
               <div>
                 <label>Fim</label>
                 <input type="date" required value={form.data_fim} onChange={e => setForm({...form, data_fim: e.target.value})} min={form.data_inicio}/>
               </div>
               <div>
                 <label>Status</label>
                 <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="planejado">Planejado</option>
                    <option value="em_execucao">Em Execução</option>
                    <option value="concluido">Concluído</option>
                    <option value="pausado">Pausado</option>
                 </select>
               </div>
            </div>
            <div className="actions" style={{marginTop: '20px', display: 'flex', gap: '10px'}}>
              <button type="submit" className="btn primary">{editingId ? 'Salvar' : 'Criar'}</button>
              <button type="button" onClick={handleCancel} className="btn">Cancelar</button>
            </div>
          </form>
        </section>
      )}

      {view === 'list' && (
        <section className="card">
           {loading ? <p>Carregando...</p> : (
             <div className="table-wrap">
               {ciclos.length === 0 ? (
                 <div style={{textAlign: 'center', padding: '40px', color: '#94a3b8'}}>
                    <p style={{fontSize: '1.2rem', marginBottom: '15px'}}>Nenhum ciclo encontrado.</p>
                    {/* BOTÃO DO EMPTY STATE (COM A MESMA LÓGICA DE BLOQUEIO) */}
                    <button 
                        onClick={handleNew} 
                        className="btn primary"
                        disabled={!isProjectActive}
                        title={!isProjectActive ? "Projeto não está ativo" : ""}
                        style={{
                            opacity: isProjectActive ? 1 : 0.5, 
                            cursor: isProjectActive ? 'pointer' : 'not-allowed'
                        }}
                    >
                        Crie o primeiro ciclo agora
                    </button>
                 </div>
               ) : (
                 <table>
                   <thead><tr><th>ID</th><th>Nome</th><th>Período</th><th>Status</th><th style={{textAlign: 'right'}}>Ações</th></tr></thead>
                   <tbody>
                     {ciclos.map(c => (
                       <tr key={c.id} className="hover-row" onClick={() => handleEdit(c)} title="Clique para editar">
                         <td style={{color: '#94a3b8'}}>#{c.id}</td>
                         <td><strong>{c.nome}</strong><br/><span style={{fontSize:'0.85em', color:'#6b7280'}}>{c.descricao}</span></td>
                         <td>{formatDateTable(c.data_inicio)} até {formatDateTable(c.data_fim)}</td>
                         <td><span className="badge" style={{backgroundColor: getStatusColor(c.status)}}>{c.status.replace('_', ' ').toUpperCase()}</span></td>
                         <td style={{textAlign: 'right'}}>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="btn danger" style={{fontSize: '0.8rem', padding: '4px 8px'}}>Excluir</button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               )}
             </div>
           )}
        </section>
      )}
    </main>
  );
}