import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { ConfirmationModal } from '../components/ConfirmationModal'; 

/* ==========================================================================
   COMPONENTE: ADMIN SISTEMAS
   ========================================================================== */
export function AdminSistemas() {
  const [sistemas, setSistemas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nome: '', descricao: '' });
  const [editingId, setEditingId] = useState(null);

  // --- ESTADOS DO MODAL DE EXCLUSÃO ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sistemaToDelete, setSistemaToDelete] = useState(null);

  const LIMITS = { nome: 50, descricao: 100 };

  // Carregamento Inicial
  useEffect(() => { loadSistemas(); }, []);

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

  // Salvar (Criar ou Editar)
  const handleSubmit = async (e) => {
    e.preventDefault();

    // --- NOVA VALIDAÇÃO DE DUPLICIDADE ---
    const nomeNormalizado = form.nome.trim().toLowerCase();
    const duplicado = sistemas.some(s => 
        s.nome.trim().toLowerCase() === nomeNormalizado && 
        s.id !== editingId
    );

    if (duplicado) {
        return toast.warning("Já existe um Sistema com este nome.");
    }
    // -------------------------------------

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
          loadSistemas();
      } catch(e) { 
          toast.error("Erro ao alterar status."); 
      }
  };

  // --- LÓGICA DO MODAL ---
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
  const truncate = (str, n = 40) => {
    return (str && str.length > n) ? str.substr(0, n - 1) + '...' : str;
  };

  return (
    <main className="container grid">
      <style>{`
        tr.selectable { transition: background-color 0.2s; }
        tr.selectable:hover { background-color: #f1f5f9 !important; cursor: pointer; }
        tr.selected { background-color: #e0f2fe !important; }
      `}</style>
      
      {/* O componente Modal fica aqui, invisível até ser chamado */}
      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir Sistema?"
        message={`Tem a certeza que deseja excluir "${sistemaToDelete?.nome}"?`}
        confirmText="Sim, Excluir"
        isDanger={true}
      />

      {/* Formulário */}
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

      <section className="card">
        <h2 className="section-title">Sistemas</h2>
        <div className="table-wrap">
            {loading ? <p>Carregando...</p> : (
                <table>
                    <thead>
                        <tr>
                            {/* Coluna Nome (Alinhada à Esquerda - Padrão) */}
                            <th style={{textAlign: 'left'}}>Nome</th>
                            
                            {/* Coluna Status (Alinhada à Direita para bater com o badge) */}
                            <th style={{textAlign: 'right'}}>Status</th>
                            
                            {/* Coluna Ações (Alinhada à Direita) */}
                            <th style={{textAlign: 'right'}}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sistemas.map(s => (
                            <tr 
                                key={s.id} 
                                onClick={() => handleSelectRow(s)} 
                                className={editingId === s.id ? 'selected' : 'selectable'} 
                                style={{opacity: s.ativo ? 1 : 0.6}}
                            >
                                {/* Célula do Nome: Adicionado verticalAlign middle */}
                                <td style={{verticalAlign: 'middle'}}>
                                    <strong title={s.nome}>
                                        {truncate(s.nome)} 
                                    </strong>
                                    <div className="muted" style={{fontSize: '0.8rem'}} title={s.descricao}>
                                        {truncate(s.descricao, 40)}
                                    </div>
                                </td>

                                {/* Célula do Status: Adicionado verticalAlign middle e Mantido right */}
                                <td style={{textAlign: 'right', whiteSpace: 'nowrap', verticalAlign: 'middle'}}>
                                    <span 
                                        onClick={(e) => { e.stopPropagation(); toggleActive(s); }} 
                                        className={`badge ${s.ativo ? 'on' : 'off'}`} 
                                        style={{marginRight:'10px', cursor:'pointer'}}
                                    >
                                        {s.ativo ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>

                                {/* Célula de Ações: Adicionado align right e verticalAlign middle */}
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
                        ))}
                    </tbody>
                </table>
            )}
        </div>
      </section>
    </main>
  );
}