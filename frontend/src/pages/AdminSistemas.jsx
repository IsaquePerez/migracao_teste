import { useState, useEffect, useRef } from 'react'; // 1. Adicionado useRef
import { toast } from 'sonner';
import { api } from '../services/api';
import { ConfirmationModal } from '../components/ConfirmationModal'; 

/* ==========================================================================
   COMPONENTE: ADMIN SISTEMAS
   ========================================================================== */
export function AdminSistemas() {
  // --- ESTADOS ---
  const [sistemas, setSistemas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nome: '', descricao: '' });
  const [editingId, setEditingId] = useState(null);
  
  // Estados para Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sistemaToDelete, setSistemaToDelete] = useState(null);
  
  // --- ESTADOS DA BUSCA CUSTOMIZADA (NOVO) ---
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  const LIMITS = { nome: 50, descricao: 100 };

  // --- LÓGICA DO DROPDOWN ---
  // Se vazio: mostra os 5 últimos criados (ID decrescente)
  // Se tem texto: filtra e mostra até 8 resultados
  const opcoesParaMostrar = searchTerm === '' 
    ? [...sistemas].sort((a, b) => b.id - a.id).slice(0, 5) 
    : sistemas.filter(s => s.nome.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 8);

  // --- FILTRO DA TABELA (Mantém a tabela reativa) ---
  const filteredSistemas = sistemas.filter(s => 
      s.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- FUNÇÃO AUXILIAR DE TRUNCATE ---
  const truncate = (str, n = 40) => {
    return (str && str.length > n) ? str.substr(0, n - 1) + '...' : str;
  };

  // --- CARREGAMENTO INICIAL ---
  useEffect(() => { loadSistemas(); }, []);

  // --- FECHAR SUGESTÕES AO CLICAR FORA ---
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const loadSistemas = async () => {
    setLoading(true);
    try {
      const data = await api.get("/sistemas/");
      setSistemas(Array.isArray(data) ? data : []);
    } catch (error) { 
      console.error(error); 
      toast.error("Erro ao carregar sistemas."); 
    } finally { 
      setLoading(false); 
    }
  };

  // --- HANDLERS (AÇÕES) ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validação de Duplicidade
    const nomeNormalizado = form.nome.trim().toLowerCase();
    const duplicado = sistemas.some(s => 
        s.nome.trim().toLowerCase() === nomeNormalizado && 
        s.id !== editingId
    );

    if (duplicado) {
        return toast.warning("Já existe um Sistema com este nome.");
    }

    try {
      if (editingId) {
        await api.put(`/sistemas/${editingId}`, form);
        toast.success("Sistema atualizado!");
      } else {
        await api.post("/sistemas/", { ...form, ativo: true });
        toast.success("Sistema criado!");
      }
      handleCancel();
      loadSistemas(); 
    } catch (error) { 
      toast.error(error.message || "Erro ao salvar."); 
    }
  };

  const handleCancel = () => {
      setForm({ nome: '', descricao: '' });
      setEditingId(null);
  };

  const handleSelectRow = (s) => {
    setForm({ nome: s.nome, descricao: s.descricao });
    setEditingId(s.id);
  };

  const toggleActive = async (sistema) => {
      try {
          const novoStatus = !sistema.ativo;
          await api.put(`/sistemas/${sistema.id}`, { ativo: novoStatus });
          toast.success(`Sistema ${novoStatus ? 'ativado' : 'desativado'}.`);
          setSistemas(prev => prev.map(s => s.id === sistema.id ? {...s, ativo: novoStatus} : s));
      } catch(e) { 
          toast.error("Erro ao alterar status."); 
      }
  };

  const requestDelete = (sistema) => {
      setSistemaToDelete(sistema);
      setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
      if (!sistemaToDelete) return;
      try {
          await api.delete(`/sistemas/${sistemaToDelete.id}`);
          toast.success(`Sistema excluído com sucesso.`);
          loadSistemas();
          if (editingId === sistemaToDelete.id) handleCancel();
      } catch (error) {
          toast.error(error.message || "Erro ao excluir (verifique vínculos).");
      } finally {
          setSistemaToDelete(null); 
      }
  };

  /* ==========================================================================
     RENDERIZAÇÃO (JSX)
     ========================================================================== */
  return (
    <main className="container grid">
      <style>{`
        tr.selectable { transition: background-color 0.2s; }
        tr.selectable:hover { background-color: #f1f5f9 !important; cursor: pointer; }
        tr.selected { background-color: #e0f2fe !important; }

        /* CSS DO DROPDOWN (IGUAL AS OUTRAS PAGINAS) */
        .custom-dropdown {
          position: absolute;
          top: 105%;
          left: 0;
          width: 100%;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          z-index: 50;
          max-height: 250px;
          overflow-y: auto;
          list-style: none;
          padding: 5px 0;
          margin: 0;
        }
        .custom-dropdown li {
          padding: 10px 15px;
          border-bottom: 1px solid #f1f5f9;
          cursor: pointer;
          font-size: 0.9rem;
          color: #334155;
          display: flex;
          align-items: center;
        }
        .custom-dropdown li:last-child { border-bottom: none; }
        .custom-dropdown li:hover { 
            background-color: #f1f5f9; 
            color: #0f172a; 
            font-weight: 500;
        }
      `}</style>
      
      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir Sistema?"
        message={`Tem a certeza que deseja excluir "${sistemaToDelete?.nome}"?`}
        confirmText="Sim, Excluir"
        isDanger={true}
      />

      {/* --- FORMULÁRIO DE CADASTRO --- */}
      <section className="card">
        <h2 className="section-title">{editingId ? 'Editar' : 'Novo Sistema'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div>
                <label>Nome</label>
                <input required maxLength={LIMITS.nome} value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} />
            </div>
            <div>
                <label>Descrição</label>
                <input maxLength={LIMITS.descricao} value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />
            </div>
          </div>
          <div className="actions" style={{marginTop: '20px', display: 'flex', gap: '10px'}}>
            <button type="submit" className="btn primary">{editingId ? 'Salvar' : 'Criar'}</button>
            {editingId && <button type="button" onClick={handleCancel} className="btn">Cancelar</button>}
          </div>
        </form>
      </section>

      {/* --- TABELA DE LISTAGEM --- */}
      <section className="card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
            <h2 className="section-title" style={{margin: 0}}>Sistemas</h2>
            
            {/* Input de Busca com Dropdown */}
            <div ref={wrapperRef} style={{position: 'relative', width: '250px'}}>
                <input 
                    type="text" 
                    placeholder="Buscar..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    style={{
                        width: '100%',
                        padding: '8px 35px 8px 12px', 
                        borderRadius: '6px', 
                        border: '1px solid #cbd5e1', 
                        fontSize: '0.9rem',
                        height: '38px',
                        boxSizing: 'border-box'
                    }}
                />
                <span style={{position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8'}}>
                    🔍
                </span>

                {/* MENU SUSPENSO */}
                {showSuggestions && opcoesParaMostrar.length > 0 && (
                    <ul className="custom-dropdown">
                        {opcoesParaMostrar.map(s => (
                            <li 
                                key={s.id} 
                                onClick={() => {
                                    setSearchTerm(s.nome);
                                    setShowSuggestions(false);
                                }}
                            >
                                {truncate(s.nome, 30)}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>

        <div className="table-wrap">
            {loading ? <p style={{padding:'20px', textAlign:'center'}}>Carregando...</p> : (
                <table>
                    <thead>
                        <tr>
                            <th style={{textAlign: 'left'}}>Nome</th>
                            <th style={{textAlign: 'right'}}>Status</th>
                            <th style={{textAlign: 'right'}}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSistemas.length === 0 ? (
                            <tr>
                                <td colSpan="3" style={{textAlign: 'center', padding: '20px', color: '#64748b'}}>
                                    {sistemas.length === 0 ? "Nenhum sistema cadastrado." : `Nenhum resultado para "${searchTerm}"`}
                                </td>
                            </tr>
                        ) : (
                            filteredSistemas.map(s => (
                                <tr 
                                    key={s.id} 
                                    onClick={() => handleSelectRow(s)} 
                                    className={editingId === s.id ? 'selected' : 'selectable'} 
                                    style={{opacity: s.ativo ? 1 : 0.6}}
                                >
                                    <td style={{verticalAlign: 'middle'}}>
                                        <strong title={s.nome}>{truncate(s.nome)}</strong>
                                        <div className="muted" style={{fontSize: '0.8rem'}} title={s.descricao}>
                                            {truncate(s.descricao, 40)}
                                        </div>
                                    </td>

                                    <td style={{textAlign: 'right', whiteSpace: 'nowrap', verticalAlign: 'middle'}}>
                                        <span 
                                            onClick={(e) => { e.stopPropagation(); toggleActive(s); }} 
                                            className={`badge ${s.ativo ? 'on' : 'off'}`} 
                                            style={{marginRight:'10px', cursor:'pointer'}}
                                        >
                                            {s.ativo ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>

                                    <td style={{textAlign: 'right', verticalAlign: 'middle'}}>
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                requestDelete(s); 
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
      </section>
    </main>
  );
}