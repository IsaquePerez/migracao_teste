import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import './styles.css';

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list');
  const [editingId, setEditingId] = useState(null);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    ativo: true,
    nivel_acesso_id: 2 
  });

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.get("/usuarios/");
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({ nome: '', email: '', senha: '', ativo: true, nivel_acesso_id: 2 });
    setEditingId(null);
    setView('list');
  };

  const handleEdit = (item) => {
    setForm({
      nome: item.nome,
      email: item.email,
      senha: '', 
      ativo: item.ativo,
      nivel_acesso_id: item.nivel_acesso_id || 2
    });
    setEditingId(item.id);
    setView('form');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.email.trim()) return toast.warning("Nome e Email são obrigatórios.");
    
    
    if (!editingId && !form.senha) return toast.warning("Senha é obrigatória para novos usuários.");

    try {
      const payload = { ...form };
      if (editingId && !payload.senha) delete payload.senha; 
      if (editingId) {
        await api.put(`/usuarios/${editingId}`, payload);
        toast.success("Usuário atualizado!");
      } else {
        await api.post("/usuarios/", payload);
        toast.success("Usuário criado!");
      }
      handleReset();
      loadData();
    } catch (error) {
      toast.error("Erro ao salvar usuário.");
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/usuarios/${itemToDelete.id}`);
      toast.success("Usuário removido.");
      loadData();
    } catch (e) {
      toast.error("Erro ao excluir.");
    } finally {
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  return (
    <main className="container">
      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Remover Usuário?"
        message={`Deseja remover "${itemToDelete?.nome}"?`}
        isDanger={true}
      />

      {view === 'form' && (
        <div style={{maxWidth: '800px', margin: '0 auto'}}>
          <form onSubmit={handleSubmit}>
            <section className="card form-section">
              <div className="form-header">
                 <h3 className="form-title">{editingId ? 'Editar Usuário' : 'Novo Usuário'}</h3>
              </div>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                  <div className="form-grid">
                    <div>
                        <label className="input-label">Nome Completo <span className="required-asterisk">*</span></label>
                        <input 
                        value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} 
                        className="form-control"
                        />
                    </div>
                    <div>
                        <label className="input-label">Email <span className="required-asterisk">*</span></label>
                        <input 
                        type="email"
                        value={form.email} onChange={e => setForm({...form, email: e.target.value})} 
                        className="form-control"
                        />
                    </div>
                  </div>

                  <div className="form-grid">
                    <div>
                        <label className="input-label">
                            {editingId ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}
                        </label>
                        <input 
                        type="password"
                        value={form.senha} onChange={e => setForm({...form, senha: e.target.value})} 
                        className="form-control"
                        />
                    </div>
                    <div>
                        <label className="input-label">Nível de Acesso</label>
                        <select 
                            value={form.nivel_acesso_id} onChange={e => setForm({...form, nivel_acesso_id: parseInt(e.target.value)})}
                            className="form-control bg-gray"
                        >
                        <option value={1}>Admin</option>
                        <option value={2}>User / QA</option>
                        </select>
                    </div>
                  </div>

                  <div>
                    <label className="input-label">Status</label>
                    <div style={{display:'flex', gap:'20px', alignItems:'center'}}>
                        <label style={{display:'flex', alignItems:'center', gap:'8px', cursor:'pointer'}}>
                            <input type="radio" checked={form.ativo === true} onChange={() => setForm({...form, ativo: true})} />
                            Ativo
                        </label>
                        <label style={{display:'flex', alignItems:'center', gap:'8px', cursor:'pointer'}}>
                            <input type="radio" checked={form.ativo === false} onChange={() => setForm({...form, ativo: false})} />
                            Inativo
                        </label>
                    </div>
                  </div>
              </div>

              <div className="form-actions">
                  <button type="button" onClick={handleReset} className="btn">Cancelar</button>
                  <button type="submit" className="btn primary">Salvar</button>
              </div>
            </section>
          </form>
        </div>
      )}

      {view === 'list' && (
        <section className="card" style={{marginTop: 0}}>
           <div className="toolbar">
               <h3 className="page-title">Usuários</h3>
               <div className="toolbar-actions">
                   <div className="search-wrapper">
                        <input 
                            type="text" placeholder="Buscar usuário..." value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        <span className="search-icon">🔍</span>
                   </div>
                   <button onClick={() => setView('form')} className="btn primary btn-new">Novo Usuário</button>
               </div>
           </div>

           {loading ? <div className="loading-text">Carregando...</div> : (
             <div className="table-wrap">
               <table>
                 <thead>
                   <tr>
                     <th style={{width: '60px'}}>ID</th>
                     <th>Nome</th>
                     <th>Email</th>
                     <th>Role</th>
                     <th style={{textAlign: 'center'}}>Status</th>
                     <th style={{textAlign: 'right'}}>Ações</th>
                   </tr>
                 </thead>
                 <tbody>
                   {users.filter(u => u.nome.toLowerCase().includes(searchTerm.toLowerCase())).map(item => (
                     <tr key={item.id} className="selectable" onClick={() => handleEdit(item)}>
                         <td className="cell-id">#{item.id}</td>
                         <td className="cell-name">{item.nome}</td>
                         <td style={{color:'#64748b'}}>{item.email}</td>
                         <td>
                             <span style={{fontWeight:'bold', color: item.nivel_acesso_id === 1 ? '#7c3aed' : '#2563eb'}}>
                                 {item.nivel_acesso_id === 1 ? 'ADMIN' : 'USER'}
                             </span>
                         </td>
                         <td className="cell-status">
                             <span className={`status-badge ${item.ativo ? 'ativo' : 'inativo'}`}>
                                 {item.ativo ? 'Ativo' : 'Inativo'}
                             </span>
                         </td>
                         <td className="cell-actions">
                             <button 
                                 onClick={(e) => { e.stopPropagation(); setItemToDelete(item); setIsDeleteModalOpen(true); }} 
                                 className="btn danger small btn-action-icon"
                             >
                                 🗑️
                             </button>
                         </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           )}
        </section>
      )}
    </main>
  );
}