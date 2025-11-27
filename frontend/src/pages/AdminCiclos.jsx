import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function AdminCiclos() {
  const [projetos, setProjetos] = useState([]);
  const [selectedProjeto, setSelectedProjeto] = useState('');
  const [ciclos, setCiclos] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estado de Visualização e Edição
  const [view, setView] = useState('list'); // 'list' ou 'form'
  const [editingId, setEditingId] = useState(null);

  // Estado do Form
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    status: 'planejado'
  });

  // 1. Carregar Projetos
  useEffect(() => {
    api.get("/projetos").then(data => {
      setProjetos(data);
      if (data.length > 0) setSelectedProjeto(data[0].id);
    });
  }, []);

  // 2. Carregar Ciclos ao mudar projeto
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

  // --- AÇÕES CRUD ---

  const handleEdit = (ciclo) => {
    setForm({
      nome: ciclo.nome,
      descricao: ciclo.descricao || '',
      // Converte a data ISO do backend para YYYY-MM-DD que o input date aceita
      data_inicio: ciclo.data_inicio ? ciclo.data_inicio.split('T')[0] : '',
      data_fim: ciclo.data_fim ? ciclo.data_fim.split('T')[0] : '',
      status: ciclo.status
    });
    setEditingId(ciclo.id);
    setView('form');
  };

  const handleDelete = async (id) => {
    if(!confirm("Tem a certeza que deseja excluir este ciclo? Isso apagará todas as execuções vinculadas!")) return;
    try {
        await api.delete(`/testes/ciclos/${id}`);
        alert("Ciclo excluído.");
        loadCiclos(selectedProjeto);
    } catch (e) { 
        console.error(e);
        alert("Erro ao excluir."); 
    }
  };

  const handleCancel = () => {
    setView('list');
    setEditingId(null);
    setForm({ nome: '', descricao: '', data_inicio: '', data_fim: '', status: 'planejado' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProjeto) return alert("Selecione um projeto!");

    try {
      const payload = { 
          ...form, 
          projeto_id: parseInt(selectedProjeto),
          data_inicio: form.data_inicio ? new Date(form.data_inicio).toISOString() : null,
          data_fim: form.data_fim ? new Date(form.data_fim).toISOString() : null
      };

      if (editingId) {
          // UPDATE
          await api.put(`/testes/ciclos/${editingId}`, payload);
          alert("Ciclo atualizado!");
      } else {
          // CREATE
          await api.post(`/testes/projetos/${selectedProjeto}/ciclos`, payload);
          alert("Ciclo criado!");
      }
      
      handleCancel();
      loadCiclos(selectedProjeto);

    } catch (error) {
      alert("Erro ao salvar: " + (error.message || "Verifique os dados"));
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
      {/* HEADER */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <div>
           <h2 className="section-title" style={{marginBottom: '5px', border: 'none'}}>Gestão de Ciclos (Sprints)</h2>
           <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
             <label style={{fontSize: '0.9rem', fontWeight: 600}}>Projeto:</label>
             <select 
                value={selectedProjeto} 
                onChange={e => setSelectedProjeto(e.target.value)}
                style={{padding: '5px', borderRadius: '4px', border: '1px solid #ccc'}}
             >
                {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
             </select>
           </div>
        </div>
        
        {view === 'list' && (
           <button onClick={() => { setView('form'); setEditingId(null); setForm({ nome: '', descricao: '', data_inicio: '', data_fim: '', status: 'planejado' }); }} className="btn primary">
             + Novo Ciclo
           </button>
        )}
        {view === 'form' && (
           <button onClick={handleCancel} className="btn">Voltar</button>
        )}
      </div>

      {/* FORMULÁRIO */}
      {view === 'form' && (
        <section className="card">
          <h3 style={{marginTop:0}}>{editingId ? 'Editar Ciclo' : 'Novo Ciclo'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
               <div style={{gridColumn: '1/-1'}}>
                 <label>Nome do Ciclo / Sprint</label>
                 <input required value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Ex: Sprint 32 - Release Mensal" />
               </div>
               
               <div style={{gridColumn: '1/-1'}}>
                 <label>Descrição / Objetivo</label>
                 <textarea 
                    value={form.descricao} 
                    onChange={e => setForm({...form, descricao: e.target.value})}
                    style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px'}}
                 />
               </div>

               <div>
                 <label>Data Início</label>
                 <input type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} />
               </div>
               
               <div>
                 <label>Data Fim</label>
                 <input type="date" value={form.data_fim} onChange={e => setForm({...form, data_fim: e.target.value})} />
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
              <button type="submit" className="btn primary">{editingId ? 'Salvar Alterações' : 'Criar Ciclo'}</button>
              <button type="button" onClick={handleCancel} className="btn">Cancelar</button>
            </div>
          </form>
        </section>
      )}

      {/* LISTAGEM */}
      {view === 'list' && (
        <section className="card">
           {loading ? <p>Carregando...</p> : (
             <div className="table-wrap">
               {ciclos.length === 0 ? <p className="muted">Nenhum ciclo encontrado para este projeto.</p> : (
                 <table>
                   <thead>
                     <tr>
                       <th>ID</th>
                       <th>Nome</th>
                       <th>Período</th>
                       <th>Status</th>
                       <th>Ações</th>
                     </tr>
                   </thead>
                   <tbody>
                     {ciclos.map(c => (
                       <tr key={c.id}>
                         <td>#{c.id}</td>
                         <td>
                           <strong>{c.nome}</strong><br/>
                           <span style={{fontSize:'0.85em', color:'#6b7280'}}>{c.descricao}</span>
                         </td>
                         <td>
                            {c.data_inicio ? new Date(c.data_inicio).toLocaleDateString() : 'N/A'} 
                            {' até '} 
                            {c.data_fim ? new Date(c.data_fim).toLocaleDateString() : 'N/A'}
                         </td>
                         <td>
                            <span className="badge" style={{backgroundColor: getStatusColor(c.status)}}>
                                {c.status}
                            </span>
                         </td>
                         <td>
                            <button onClick={() => handleEdit(c)} className="btn" style={{fontSize: '0.8rem', marginRight: '5px', padding: '4px 8px'}}>Editar</button>
                            <button onClick={() => handleDelete(c.id)} className="btn danger" style={{fontSize: '0.8rem', padding: '4px 8px'}}>Excluir</button>
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