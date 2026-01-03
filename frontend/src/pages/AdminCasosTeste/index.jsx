import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import './styles.css';

export function AdminCasosTeste() {
  const [projetos, setProjetos] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [usuarios, setUsuarios] = useState([]); 
  const [casos, setCasos] = useState([]);
  
  const [selectedProjeto, setSelectedProjeto] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list');
  const [editingId, setEditingId] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [casoToDelete, setCasoToDelete] = useState(null);

  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    pre_condicoes: '',
    criterios_aceitacao: '',
    prioridade: 'media',
    responsavel_id: '',
    ciclo_id: '',
    passos: [{ ordem: 1, acao: '', resultado_esperado: '' }]
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  const opcoesParaMostrar = searchTerm === '' 
    ? [...casos].sort((a, b) => b.id - a.id).slice(0, 5) 
    : casos.filter(c => c.nome.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 8);

  const filteredCasos = casos.filter(c => 
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.prioridade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const truncate = (str, n = 30) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str || '';
  
  useEffect(() => {
    const loadBasics = async () => {
      try {
        const [projData, userData] = await Promise.all([
          api.get("/projetos"),
          api.get("/usuarios/") 
        ]);
        setProjetos(projData || []);
        setUsuarios(userData || []);
        
        const ativos = (projData || []).filter(p => p.status === 'ativo');
        if (ativos.length > 0) {
          setSelectedProjeto(ativos[0].id);
        }
      } catch (e) {
        toast.error("Erro ao carregar dados básicos.");
      }
    };
    loadBasics();
  }, []);

  useEffect(() => {
    if (selectedProjeto) loadDadosProjeto(selectedProjeto);
  }, [selectedProjeto]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const loadDadosProjeto = async (projId) => {
    setLoading(true);
    try {
      const [casosData, ciclosData] = await Promise.all([
        api.get(`/testes/projetos/${projId}/casos`),
        api.get(`/testes/projetos/${projId}/ciclos`)
      ]);
      setCasos(Array.isArray(casosData) ? casosData : []);
      setCiclos(Array.isArray(ciclosData) ? ciclosData : []);
    } catch (error) {
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const currentProject = projetos.find(p => p.id == selectedProjeto);
  const isProjectActive = currentProject?.status === 'ativo';

  const handleReset = () => {
    setForm({
      nome: '', descricao: '', pre_condicoes: '', criterios_aceitacao: '',
      prioridade: 'media', responsavel_id: '', ciclo_id: '',
      passos: [{ ordem: 1, acao: '', resultado_esperado: '' }]
    });
    setEditingId(null);
    setView('list');
  };

  const handleNew = () => {
    if (!isProjectActive) return toast.warning(`Projeto ${currentProject?.status?.toUpperCase() || 'Inativo'}. Criação bloqueada.`);
    handleReset();
    setView('form');
  };

  const handleEdit = (caso) => {
    setForm({
      nome: caso.nome,
      descricao: caso.descricao || '',
      pre_condicoes: caso.pre_condicoes || '',
      criterios_aceitacao: caso.criterios_aceitacao || '',
      prioridade: caso.prioridade,
      responsavel_id: caso.responsavel_id || '',
      ciclo_id: '', 
      passos: caso.passos && caso.passos.length > 0 ? caso.passos.map(p => ({...p})) : [{ ordem: 1, acao: '', resultado_esperado: '' }]
    });
    setEditingId(caso.id);
    setView('form');
  };

  const addStep = () => {
    setForm(prev => ({
      ...prev,
      passos: [...prev.passos, { ordem: prev.passos.length + 1, acao: '', resultado_esperado: '' }]
    }));
  };

  const removeStep = (index) => {
    if (form.passos.length === 1) return toast.info("O teste precisa de pelo menos 1 passo.");
    const newPassos = form.passos.filter((_, i) => i !== index).map((p, i) => ({ ...p, ordem: i + 1 }));
    setForm(prev => ({ ...prev, passos: newPassos }));
  };

  const updateStep = (index, field, value) => {
    const newPassos = [...form.passos];
    newPassos[index][field] = value;
    setForm(prev => ({ ...prev, passos: newPassos }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProjeto) return toast.error("Selecione um projeto.");
    if (!form.nome.trim()) return toast.warning("Título obrigatório.");
    
    const passosValidos = form.passos.filter(p => p.acao && p.acao.trim() !== '');
    if (passosValidos.length === 0) return toast.warning("Preencha ao menos um passo.");

    const payload = {
        ...form,
        projeto_id: parseInt(selectedProjeto),
        responsavel_id: form.responsavel_id ? parseInt(form.responsavel_id) : null,
        ciclo_id: form.ciclo_id ? parseInt(form.ciclo_id) : null,
        passos: passosValidos
    };

    try {
      if (editingId) {
        await api.put(`/testes/casos/${editingId}`, payload);
        toast.success("Cenário atualizado!");
      } else {
        await api.post(`/testes/projetos/${selectedProjeto}/casos`, payload);
        toast.success("Cenário salvo!");
      }
      handleReset();
      loadDadosProjeto(selectedProjeto);
    } catch (error) {
      toast.error(error.message || "Erro ao salvar.");
    }
  };

  const handleDelete = async () => {
      if (!casoToDelete) return;
      try {
        await api.delete(`/testes/casos/${casoToDelete.id}`);
        toast.success("Cenário excluído.");
        loadDadosProjeto(selectedProjeto);
      } catch (e) { 
          toast.error("Erro ao excluir."); 
      } finally {
         setIsDeleteModalOpen(false);
         setCasoToDelete(null);
      }
  };

  return (
    <main className="container">
      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Excluir Caso de Teste?"
        message={`Deseja excluir "${casoToDelete?.nome}"? O histórico será perdido.`}
        confirmText="Sim, Excluir"
        isDanger={true}
      />

      {view === 'form' && (
        <div style={{maxWidth: '100%', margin: '0 auto'}}>
          <form onSubmit={handleSubmit}>
            
            <section className="card form-section">
              <div className="form-header">
                 <h3 className="form-title">{editingId ? 'Editar Cenário' : 'Novo Cenário'}</h3>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                  <div>
                    <label className="input-label">Título do Cenário <span className="required-asterisk">*</span></label>
                    <input 
                       value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} 
                       placeholder="Ex: Validar fluxo de checkout"
                       className="form-control"
                    />
                  </div>
                  <div className="form-grid">
                      <div>
                        <label>Prioridade</label>
                        <select 
                            value={form.prioridade} onChange={e => setForm({...form, prioridade: e.target.value})}
                            className="form-control bg-gray"
                        >
                           <option value="alta">Alta</option>
                           <option value="media">Média</option>
                           <option value="baixa">Baixa</option>
                        </select>
                      </div>
                      <div>
                        <label>Pré-condições</label>
                        <input value={form.pre_condicoes} onChange={e => setForm({...form, pre_condicoes: e.target.value})} className="form-control" />
                      </div>
                  </div>
                  <div>
                    <label>Objetivo / Critérios</label>
                    <input value={form.criterios_aceitacao} onChange={e => setForm({...form, criterios_aceitacao: e.target.value})} className="form-control" />
                  </div>
              </div>
            </section>

            <section className="card form-section">
              <h3 className="section-subtitle">Alocação (Opcional)</h3>
              <div className="form-grid">
                  <div>
                    <label>Ciclo (Sprint)</label>
                    <select 
                        value={form.ciclo_id} onChange={e => setForm({...form, ciclo_id: e.target.value})}
                        className="form-control bg-gray"
                        disabled={!!editingId}
                    >
                       <option value="">Apenas Salvar na Biblioteca</option>
                       {ciclos.map(c => <option key={c.id} value={c.id}>{truncate(c.nome, 25)} ({c.status})</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Responsável</label>
                    <select 
                        value={form.responsavel_id} onChange={e => setForm({...form, responsavel_id: e.target.value})}
                        className="form-control bg-gray"
                    >
                        <option value="">Definir depois</option>
                        {usuarios.filter(u => u.ativo).map(u => (
                            <option key={u.id} value={u.id}>{truncate(u.nome, 30)}</option>
                        ))}
                    </select>
                </div>
              </div>
            </section>

            <section className="card">
               <div className="steps-header-row">
                 <h3 className="section-subtitle" style={{marginBottom: 0}}>Passos do Teste</h3>
                 <button type="button" onClick={addStep} className="btn btn-add-step">+ Passo</button>
               </div>
               <div className="steps-container">
                 {form.passos.map((passo, idx) => (
                   <div key={idx} className="step-row">
                      <div className="step-index">{idx + 1}</div>
                      <input 
                        placeholder="Ação (Ex: Clicar em Entrar)" 
                        value={passo.acao} 
                        onChange={e => updateStep(idx, 'acao', e.target.value)}
                        className="form-control small-text" 
                      />
                      <input 
                        placeholder="Resultado Esperado" 
                        value={passo.resultado_esperado} 
                        onChange={e => updateStep(idx, 'resultado_esperado', e.target.value)}
                        className="form-control small-text" 
                      />
                      <button type="button" onClick={() => removeStep(idx)} className="btn danger small btn-remove-step">✕</button>
                   </div>
                 ))}
               </div>
               <div className="form-actions">
                  <button type="button" onClick={handleReset} className="btn">Cancelar</button>
                  <button type="submit" className="btn primary">{editingId ? 'Salvar Alterações' : 'Salvar Cenário'}</button>
               </div>
            </section>
          </form>
        </div>
      )}

      {view === 'list' && (
        <section className="card" style={{marginTop: 0}}>
           
           <div className="toolbar">
               
               <h3 className="page-title">Casos de Teste</h3>
               
               <div className="toolbar-actions">
                   
                   <div className="filter-group">
                       <span className="filter-label">PROJETO:</span>
                       <select 
                        value={selectedProjeto} onChange={e => setSelectedProjeto(e.target.value)}
                        className="select-filter"
                       >
                        {projetos.filter(p => p.status === 'ativo').map(p => (
                            <option key={p.id} value={p.id}>{truncate(p.nome, 25)}</option>
                        ))}
                       </select>
                   </div>
                   
                   <button 
                        onClick={handleNew} className="btn primary btn-new" disabled={!isProjectActive} 
                        style={{
                            opacity: isProjectActive ? 1 : 0.5, 
                            cursor: isProjectActive ? 'pointer' : 'not-allowed'
                        }}
                   >
                    Novo Cenário
                   </button>
                   
                   <div className="separator"></div>

                   <div ref={wrapperRef} className="search-wrapper">
                        <input 
                            type="text" placeholder="Buscar..." value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)} onFocus={() => setShowSuggestions(true)}
                            className="search-input"
                        />
                        <span className="search-icon">🔍</span>
                        
                        {showSuggestions && opcoesParaMostrar.length > 0 && (
                            <ul className="custom-dropdown">
                                {opcoesParaMostrar.map(c => (
                                    <li key={c.id} onClick={() => { setSearchTerm(c.nome); setShowSuggestions(false); }}>
                                        <span>
                                            {truncate(c.nome, 20)}
                                            <span style={{fontSize:'0.75rem', color:'#9ca3af', marginLeft:'8px'}}>({c.prioridade})</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                   </div>
               </div>
           </div>

           {loading ? <div className="loading-text">Carregando dados...</div> : (
             <div className="table-wrap">
               {casos.length === 0 ? (
                 <div className="empty-container">
                    <p style={{marginBottom: '10px'}}>Nenhum caso de teste encontrado.</p>
                    {isProjectActive && <button onClick={handleNew} className="btn primary small">Criar o primeiro</button>}
                 </div>
               ) : (
                 <table>
                   <thead>
                     <tr>
                       <th style={{width: '50px'}}>ID</th>
                       <th style={{width: '35%'}}>Cenário</th>
                       <th style={{width: '10%', textAlign: 'center'}}>Prioridade</th>
                       <th style={{width: '20%'}}>Responsável</th>
                       <th style={{width: '10%', textAlign: 'center'}}>Passos</th>
                       <th style={{width: '10%', textAlign: 'right'}}>Ações</th>
                     </tr>
                   </thead>
                   <tbody>
                     {filteredCasos.length === 0 ? (
                       <tr><td colSpan="6" className="no-results">Sem resultados para "{searchTerm}"</td></tr>
                     ) : (
                       filteredCasos.map(c => (
                           <tr key={c.id} className="selectable" onClick={() => handleEdit(c)}>
                               <td className="cell-id">#{c.id}</td>
                               <td>
                                   <div className="cell-name" title={c.nome}>{truncate(c.nome, 40)}</div>
                               </td>
                               <td className="cell-priority">
                                   <span className="badge priority-badge">{c.prioridade}</span>
                               </td>
                               <td>
                                   <span className="cell-resp">{c.responsavel ? truncate(c.responsavel.nome, 20) : '-'}</span>
                               </td>
                               <td className="cell-steps">
                                   {c.passos?.length || 0}
                               </td>
                               <td className="cell-actions">
                                   <button 
                                       onClick={(e) => { e.stopPropagation(); setCasoToDelete(c); setIsDeleteModalOpen(true); }} 
                                       className="btn danger small btn-action-icon"
                                       title="Excluir"
                                   >
                                       🗑️
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