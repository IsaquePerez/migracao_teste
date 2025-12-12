import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // Importante para o Portal da Navbar
import { toast } from 'sonner';
import { api } from '../services/api';
import { ConfirmationModal } from '../components/ConfirmationModal';

/* ==========================================================================
   COMPONENTE: ADMIN CASOS DE TESTE
   ========================================================================== */
export function AdminCasosTeste() {
  // --- ESTADOS ---
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

  // --- BUSCA E FILTROS ---
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCasos = casos.filter(c => 
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.prioridade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- AUXILIARES ---
  const truncate = (str, n = 30) => {
    if (!str) return '';
    return str.length > n ? str.substr(0, n - 1) + '...' : str;
  };

  const inputStyle = {
    width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '4px',
    fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box'
  };

  // --- CARREGAMENTO INICIAL ---
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
      toast.error("Erro ao carregar casos de teste.");
    } finally {
      setLoading(false);
    }
  };

  const currentProject = projetos.find(p => p.id == selectedProjeto);
  // Se o projeto não for encontrado ou não estiver ativo, bloqueia criação
  const isProjectActive = currentProject?.status === 'ativo';

  // --- HANDLERS ---
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
    if (!isProjectActive) {
        return toast.warning(`Projeto ${currentProject?.status?.toUpperCase() || 'Inativo'}. Criação bloqueada.`);
    }
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
      ciclo_id: '', // Ciclo é opcional na edição do caso base
      passos: caso.passos && caso.passos.length > 0 
              ? caso.passos.map(p => ({...p})) 
              : [{ ordem: 1, acao: '', resultado_esperado: '' }]
    });
    setEditingId(caso.id);
    setView('form');
  };

  const handleCancel = () => { setView('list'); setEditingId(null); };

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
    if (!selectedProjeto) return toast.error("Erro: Projeto não selecionado.");
    if (!form.nome || !form.nome.trim()) return toast.warning("O Título do Cenário é obrigatório.");
    
    const passosValidos = form.passos.filter(p => p.acao && p.acao.trim() !== '');
    if (passosValidos.length === 0) return toast.warning("Preencha a 'Ação' de pelo menos um passo.");

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
        toast.success("Caso de teste atualizado!");
      } else {
        await api.post(`/testes/projetos/${selectedProjeto}/casos`, payload);
        toast.success("Teste salvo na biblioteca.");
      }
      handleReset();
      loadDadosProjeto(selectedProjeto);
    } catch (error) {
      toast.error(error.message || "Falha ao salvar caso de teste.");
    }
  };

  const requestDelete = (caso) => {
      setCasoToDelete(caso);
      setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
      if (!casoToDelete) return;
      try {
        await api.delete(`/testes/casos/${casoToDelete.id}`);
        toast.success("Caso de teste excluído (histórico limpo).");
        loadDadosProjeto(selectedProjeto);
      } catch (e) { 
          toast.error("Erro ao excluir. Tente novamente."); 
      } finally {
          setCasoToDelete(null);
      }
  };

  // Pega o elemento do DOM para o Portal (Navbar Superior)
  const navbarTarget = document.getElementById('header-actions');

  /* ==========================================================================
     RENDERIZAÇÃO
     ========================================================================== */
  return (
    <main className="container">
      <style>{`
        .hover-row { transition: background-color 0.2s ease-in-out; cursor: pointer;}
        .hover-row:hover { background-color: #f1f5f9 !important; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: 500; }
      `}</style>
      
      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir Caso de Teste?"
        message={`Deseja excluir "${casoToDelete?.nome}"? Todo o histórico de execução vinculado será apagado.`}
        confirmText="Sim, Excluir"
        isDanger={true}
      />

      {/* --- NAVBAR SUPERIOR (Portal) --- */}
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
                // Desabilita se não tiver projeto ativo selecionado
                disabled={!isProjectActive} 
                style={{height: '34px', opacity: isProjectActive ? 1 : 0.5, cursor: isProjectActive ? 'pointer' : 'not-allowed', fontSize: '0.9rem'}}
             >
                Novo Cenário
             </button>
           ) : (
             <button onClick={handleCancel} className="btn" style={{height: '34px', fontSize: '0.9rem'}}>Voltar</button>
           )}
        </div>,
        navbarTarget
      )}

      {/* --- FORMULÁRIO --- */}
      {view === 'form' && (
        <div style={{maxWidth: '100%', margin: '0 auto'}}>
          <form onSubmit={handleSubmit}>
            {/* ... Seção de Detalhes ... */}
            <section className="card" style={{marginBottom: '20px', padding: '25px'}}>
              <h3 style={{marginTop: 0, marginBottom: '20px', color: '#334155', fontSize: '1.1rem', fontWeight: 700}}>Detalhes do Cenário</h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151'}}>Título do Cenário <span style={{color:'#ef4444'}}>*</span></label>
                    <input 
                       value={form.nome} 
                       onChange={e => setForm({...form, nome: e.target.value})} 
                       placeholder="Ex: Validar pagamento"
                       style={{...inputStyle, fontSize: '1rem'}}
                    />
                  </div>
                  <div className="form-grid">
                      <div>
                        <label>Prioridade</label>
                        <select 
                            value={form.prioridade} 
                            onChange={e => setForm({...form, prioridade: e.target.value})}
                            style={{...inputStyle, backgroundColor: '#f3f4f6'}}
                        >
                           <option value="alta">Alta</option>
                           <option value="media">Média</option>
                           <option value="baixa">Baixa</option>
                        </select>
                      </div>
                      <div>
                        <label>Pré-condições</label>
                        <input 
                          value={form.pre_condicoes} 
                          onChange={e => setForm({...form, pre_condicoes: e.target.value})} 
                          style={inputStyle}
                        />
                      </div>
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151'}}>Objetivo / Critérios</label>
                    <input
                       value={form.criterios_aceitacao} 
                       onChange={e => setForm({...form, criterios_aceitacao: e.target.value})}
                       style={inputStyle}
                    />
                  </div>
              </div>
            </section>

            {/* ... Seção de Alocação ... */}
            <section className="card" style={{marginBottom: '20px', padding: '25px'}}>
              <h3 style={{marginTop: 0, marginBottom: '20px', color: '#334155', fontSize: '1.1rem', fontWeight: 700}}>Alocação (Opcional)</h3>
              <div className="form-grid">
                  <div>
                    <label>Ciclo (Sprint)</label>
                    <select 
                        value={form.ciclo_id} 
                        onChange={e => setForm({...form, ciclo_id: e.target.value})}
                        style={{...inputStyle, backgroundColor: '#f3f4f6'}}
                        disabled={!!editingId}
                    >
                       <option value="">Apenas Salvar na Biblioteca</option>
                       {ciclos.map(c => <option key={c.id} value={c.id}>{truncate(c.nome, 20)} ({c.status})</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Responsável (Apenas Testadores)</label>
                    <select 
                        value={form.responsavel_id} 
                        onChange={e => setForm({...form, responsavel_id: e.target.value})}
                        style={{...inputStyle, backgroundColor: '#f3f4f6'}}
                    >
                        <option value="">Definir depois</option>
                        {usuarios
                            .filter(u => u.ativo && u.nivel_acesso?.nome === 'testador')
                            .map(u => (
                                <option key={u.id} value={u.id}>
                                    {truncate(u.nome, 30)}
                                </option>
                            ))
                        }
                    </select>
                </div>
              </div>
            </section>

            {/* ... Seção de Passos ... */}
            <section className="card" style={{padding: '25px'}}>
               <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                 <h3 style={{margin: 0, color: '#334155', fontSize: '1.1rem', fontWeight: 700}}>Passos</h3>
                 <button type="button" onClick={addStep} className="btn" style={{backgroundColor: '#eef2ff', color: '#3730a3'}}>+ Adicionar Passo</button>
               </div>
               <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                 {form.passos.map((passo, idx) => (
                   <div key={idx} style={{display: 'grid', gridTemplateColumns: '40px 1fr 50px', gap: '15px', alignItems: 'start', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                      <div style={{fontSize: '1.1rem', fontWeight: 'bold', color: '#64748b', textAlign: 'center', paddingTop: '8px'}}>{idx + 1}</div>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                         <input 
                            placeholder="Ação" 
                            value={passo.acao} 
                            onChange={e => updateStep(idx, 'acao', e.target.value)}
                            style={{...inputStyle, backgroundColor: 'white'}} 
                         />
                         <input 
                            placeholder="Resultado Esperado" 
                            value={passo.resultado_esperado} 
                            onChange={e => updateStep(idx, 'resultado_esperado', e.target.value)}
                            style={{...inputStyle, backgroundColor: 'white', color: '#059669'}} 
                         />
                      </div>
                      <div style={{textAlign: 'right'}}>
                          <button type="button" onClick={() => removeStep(idx)} className="btn" style={{backgroundColor: '#fee2e2', color: '#b91c1c', width: '36px', height: '36px', padding: 0}}>✕</button>
                      </div>
                   </div>
                 ))}
               </div>
               <div className="actions" style={{marginTop: '30px', borderTop: '1px solid #e5e7eb', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '15px'}}>
                  <button type="button" onClick={handleReset} className="btn" style={{backgroundColor: '#fff', border: '1px solid #cbd5e1', color: '#475569'}}>Cancelar</button>
                  <button type="submit" className="btn primary">{editingId ? 'Salvar Alterações' : 'Salvar Caso de Teste'}</button>
               </div>
            </section>
          </form>
        </div>
      )}

      {/* --- LISTAGEM --- */}
      {view === 'list' && (
        <section className="card" style={{marginTop: '20px'}}> {/* Margin top igual ao AdminCiclos */}
           
           {/* Header de Busca e Total - ESTRUTURA IGUAL A DE CICLOS */}
           <div style={{paddingBottom: '15px', borderBottom: '1px solid #f1f5f9', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
               <span style={{fontWeight: 600, color: '#64748b'}}>
                   {filteredCasos.length} caso(s) encontrado(s)
               </span>
               <div style={{position: 'relative'}}>
                    <input 
                        type="text" 
                        placeholder="Buscar cenário ou prioridade..." 
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
                    <span style={{position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8'}}>🔍</span>
               </div>
           </div>

           {loading ? <p style={{padding:'20px', textAlign:'center'}}>Carregando...</p> : (
             <div className="table-wrap">
               {casos.length === 0 ? (
                 <div style={{textAlign: 'center', padding: '40px', color: '#94a3b8'}}>
                    <p>Nenhum caso de teste para este projeto.</p>
                    {projetos.length > 0 && isProjectActive && <button onClick={handleNew} className="btn primary" style={{marginTop:'10px'}}>Criar Primeiro</button>}
                 </div>
               ) : (
                 <table>
                   <thead>
                     <tr>
                       <th style={{width: '50px', textAlign: 'left'}}>ID</th>
                       <th style={{textAlign: 'left'}}>Cenário</th>
                       <th style={{textAlign: 'center'}}>Prioridade</th>
                       <th style={{textAlign: 'left'}}>Responsável</th>
                       <th style={{textAlign: 'center'}}>Passos</th>
                       <th style={{textAlign: 'right'}}>Ações</th>
                     </tr>
                   </thead>
                   <tbody>
                     {filteredCasos.length === 0 ? (
                        <tr><td colSpan="6" style={{textAlign:'center', padding:'20px', color: '#64748b'}}>Nenhum caso encontrado para "{searchTerm}".</td></tr>
                     ) : (
                        filteredCasos.map(c => (
                            <tr key={c.id} className="hover-row" onClick={() => handleEdit(c)} title="Clique para editar">
                                <td style={{color: '#64748b', verticalAlign: 'middle'}}>#{c.id}</td>
                                <td style={{verticalAlign: 'middle'}}>
                                    <div style={{fontWeight: 600}} title={c.nome}>
                                        {truncate(c.nome, 45)}
                                    </div>
                                </td>
                                <td style={{textAlign: 'center', verticalAlign: 'middle'}}>
                                    <span className="badge" style={{backgroundColor: '#f3f4f6'}}>
                                        {c.prioridade}
                                    </span>
                                </td>
                                <td style={{verticalAlign: 'middle'}}>
                                    {c.responsavel ? truncate(c.responsavel.nome, 20) : '-'}
                                </td>
                                <td style={{textAlign: 'center', verticalAlign: 'middle'}}>
                                    {c.passos?.length || 0}
                                </td>
                                <td style={{textAlign: 'right', verticalAlign: 'middle'}}>
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            requestDelete(c); 
                                        }} 
                                        className="btn danger small"
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