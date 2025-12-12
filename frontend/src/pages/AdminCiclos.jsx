import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { api } from '../services/api';
import { ConfirmationModal } from '../components/ConfirmationModal';

export function AdminCiclos() {
  const [projetos, setProjetos] = useState([]);
  const [selectedProjeto, setSelectedProjeto] = useState('');
  const [ciclos, setCiclos] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    nome: '', descricao: '', data_inicio: '', data_fim: '', status: 'planejado'
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [cicloToDelete, setCicloToDelete] = useState(null);

  // 1. ESTADO DE BUSCA
  const [searchTerm, setSearchTerm] = useState('');

  // 2. FILTRO (Nome ou ID)
  const filteredCiclos = ciclos.filter(c => 
      c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 3. AUXILIARES
  const truncate = (str, n = 40) => {
    return (str && str.length > n) ? str.substr(0, n - 1) + '...' : str;
  };

  const formatForInput = (dateString) => dateString ? dateString.split('T')[0] : '';
  const formatDateTable = (dateString) => dateString ? new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-';
  const getHojeISO = () => new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];

  const getStatusColor = (st) => {
      switch(st) {
          case 'em_execucao': return '#dbeafe'; 
          case 'concluido': return '#dcfce7';   
          case 'atrasado': return '#fee2e2';    
          default: return '#f3f4f6';            
      }
  };

  const renderProgress = (concluidos, total) => {
      if (!total || total === 0) return <span style={{fontSize:'0.8rem', color:'#94a3b8'}}>Sem testes</span>;
      const pct = Math.round((concluidos / total) * 100);
      let color = '#3b82f6';
      if (pct === 100) color = '#10b981';
      
      return (
          <div style={{width: '100%', maxWidth: '120px'}}>
              <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.75rem', marginBottom:'2px', fontWeight:'600', color: '#475569'}}>
                  <span>{pct}%</span>
                  <span>{concluidos}/{total}</span>
              </div>
              <div style={{width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden'}}>
                  <div style={{width: `${pct}%`, height: '100%', backgroundColor: color, transition: 'width 0.5s'}}></div>
              </div>
          </div>
      );
  };

  useEffect(() => {
    const fetchProjetos = async () => {
        try {
            const data = await api.get("/projetos");
            setProjetos(data || []);
            const ativos = data.filter(p => p.status === 'ativo');
            if (ativos.length > 0) setSelectedProjeto(ativos[0].id);
        } catch (e) {
            console.error(e);
            toast.error("Erro ao carregar lista de projetos.");
        }
    };
    fetchProjetos();
  }, []);

  useEffect(() => {
    if (selectedProjeto) loadCiclos(selectedProjeto);
  }, [selectedProjeto]);

  const loadCiclos = async (projId) => {
    setLoading(true);
    try {
      const data = await api.get(`/testes/projetos/${projId}/ciclos`);
      setCiclos(Array.isArray(data) ? data : []);
    } catch (error) { 
        console.error(error); 
        toast.error("Erro ao carregar ciclos.");
    } finally { 
        setLoading(false); 
    }
  };

  const currentProject = projetos.find(p => p.id == selectedProjeto);
  const isProjectActive = currentProject?.status === 'ativo';

  const handleNew = () => {
      if (!isProjectActive) {
          return toast.warning(`Projeto ${currentProject?.status?.toUpperCase()}. Criação de ciclos bloqueada.`);
      }
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

  const handleCancel = () => { setView('list'); setEditingId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedProjeto) return toast.warning("Selecione um projeto!");
    if (!form.nome.trim()) return toast.warning("O nome do ciclo é obrigatório.");
    if (!form.data_inicio || !form.data_fim) return toast.warning("As datas de início e fim são obrigatórias.");
    if (form.data_inicio > form.data_fim) return toast.warning("A data de início não pode ser maior que a data fim.");

    try {
      const payload = { 
          ...form, projeto_id: parseInt(selectedProjeto),
          data_inicio: new Date(form.data_inicio).toISOString(),
          data_fim: new Date(form.data_fim).toISOString()
      };
      
      if (editingId) { 
          await api.put(`/testes/ciclos/${editingId}`, payload); 
          toast.success("Ciclo atualizado com sucesso!"); 
      } else { 
          await api.post(`/testes/projetos/${selectedProjeto}/ciclos`, payload); 
          toast.success("Ciclo criado com sucesso!"); 
      }
      
      handleCancel(); 
      loadCiclos(selectedProjeto);
    } catch (error) { 
        toast.error(error.message || "Erro ao salvar ciclo."); 
    }
  };

  const requestDelete = (ciclo) => {
      setCicloToDelete(ciclo);
      setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
      if (!cicloToDelete) return;
      try { 
          await api.delete(`/testes/ciclos/${cicloToDelete.id}`); 
          toast.success("Ciclo excluído."); 
          loadCiclos(selectedProjeto); 
      } catch (e) { 
          toast.error("Erro ao excluir ciclo (verifique execuções vinculadas)."); 
      } finally {
          setCicloToDelete(null);
      }
  };

  const navbarTarget = document.getElementById('header-actions');

  return (
    <main className="container">
      <style>{`tr.hover-row:hover { background-color: #f1f5f9 !important; cursor: pointer; }`}</style>

      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir Ciclo?"
        message={`Tem a certeza que deseja excluir o ciclo "${cicloToDelete?.nome}"? Todo o histórico de execução vinculado será perdido.`}
        confirmText="Sim, Excluir"
        isDanger={true}
      />
      
      {navbarTarget && createPortal(
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
           <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
             <span style={{fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase'}}>Projeto:</span>
             <select 
                value={selectedProjeto} 
                onChange={e => setSelectedProjeto(e.target.value)}
                style={{
                    padding: '6px 10px', 
                    borderRadius: '4px', 
                    border: '1px solid #cbd5e1', 
                    fontSize: '0.9rem', 
                    backgroundColor: '#fff',
                    maxWidth: '300px'
                }}
             >
                {projetos.filter(p => p.status === 'ativo').map(p => (
                    <option key={p.id} value={p.id} title={p.nome}>
                        {truncate(p.nome, 30)}
                    </option>
                ))}
             </select>
           </div>
           {view === 'list' ? (
             <button 
                onClick={handleNew} 
                className="btn primary" 
                disabled={!isProjectActive} 
                style={{height: '34px', opacity: isProjectActive ? 1 : 0.5, cursor: isProjectActive ? 'pointer' : 'not-allowed', fontSize: '0.9rem'}}
             >
                Novo Ciclo
             </button>
           ) : (
             <button onClick={handleCancel} className="btn" style={{height: '34px', fontSize: '0.9rem'}}>Voltar</button>
           )}
        </div>,
        navbarTarget
      )}

      {view === 'form' && (
        <section className="card">
          <h3 style={{marginTop:0}}>{editingId ? 'Editar Ciclo' : 'Novo Ciclo'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
               <div style={{gridColumn: '1/-1'}}>
                 <label>Nome do Ciclo / Sprint</label>
                 <input 
                    value={form.nome} 
                    onChange={e => setForm({...form, nome: e.target.value})} 
                    placeholder="Ex: Sprint 32" 
                 />
               </div>
               <div style={{gridColumn: '1/-1'}}>
                 <label>Descrição</label>
                 <textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px'}}/>
               </div>
               <div>
                 <label>Início</label>
                 <input 
                    type="date" 
                    value={form.data_inicio} 
                    onChange={e => setForm({...form, data_inicio: e.target.value})} 
                    min={!editingId ? getHojeISO() : undefined}
                 />
               </div>
               <div>
                 <label>Fim</label>
                 <input 
                    type="date" 
                    value={form.data_fim} 
                    onChange={e => setForm({...form, data_fim: e.target.value})} 
                    min={form.data_inicio}
                 />
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
        <section className="card" style={{marginTop:'20px'}}>
           {/* HEADER DA TABELA COM BUSCA */}
           <div style={{paddingBottom: '15px', borderBottom: '1px solid #f1f5f9', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
               <span style={{fontWeight: 600, color: '#64748b'}}>
                   {ciclos.length} ciclo(s) encontrado(s)
               </span>
               <div style={{position: 'relative'}}>
                    <input 
                        type="text" 
                        placeholder="Buscar por nome..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            padding: '8px 30px 8px 10px', 
                            borderRadius: '6px', 
                            border: '1px solid #cbd5e1', 
                            fontSize: '0.85rem',
                            minWidth: '220px'
                        }}
                    />
                    <span style={{position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)'}}>🔍</span>
               </div>
           </div>

           {loading ? <p>Carregando...</p> : (
             <div className="table-wrap">
               {ciclos.length === 0 ? (
                   <div style={{textAlign: 'center', padding: '40px', color: '#94a3b8'}}>
                       <p>Nenhum ciclo encontrado.</p>
                       {isProjectActive && <button onClick={handleNew} className="btn primary">Criar primeiro ciclo</button>}
                   </div>
               ) : (
                 <table>
                   <thead>
                       <tr>
                           <th>Nome</th>
                           <th>Período</th>
                           <th>Status</th>
                           <th>Progresso</th>
                           <th style={{textAlign: 'right'}}>Ações</th>
                       </tr>
                   </thead>
                   <tbody>
                     {/* 4. USA A LISTA FILTRADA */}
                     {filteredCiclos.length === 0 ? (
                        <tr><td colSpan="5" style={{textAlign:'center', padding:'20px'}}>Nenhum ciclo encontrado para "{searchTerm}".</td></tr>
                     ) : (
                        filteredCiclos.map(c => (
                            <tr key={c.id} className="hover-row" onClick={() => handleEdit(c)} title="Clique para editar">
                                <td>
                                    <div style={{fontWeight:600, color:'#334155'}}>{truncate(c.nome, 30)}</div>
                                    <div style={{fontSize:'0.8rem', color:'#94a3b8'}}>#{c.id} • {truncate(c.descricao, 40)}</div>
                                </td>
                                <td style={{whiteSpace: 'nowrap', fontSize: '0.85rem'}}>
                                    {formatDateTable(c.data_inicio)} até {formatDateTable(c.data_fim)}
                                </td>
                                <td>
                                    <span className="badge" style={{backgroundColor: getStatusColor(c.status)}}>
                                        {c.status.replace('_', ' ').toUpperCase()}
                                    </span>
                                </td>
                                <td style={{minWidth: '140px'}}>
                                    {renderProgress(c.testes_concluidos, c.total_testes)}
                                </td>
                                <td style={{textAlign: 'right'}}>
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            requestDelete(c); 
                                        }} 
                                        className="btn danger small" 
                                        style={{fontSize: '0.8rem', padding: '4px 8px'}}
                                    >
                                        Excluir
                                    </button>
                                </td>
                            </tr>
                        ))
                     )}
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