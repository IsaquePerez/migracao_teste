import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { useSnackbar } from '../../context/SnackbarContext'; 
import './styles.css';

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list');
  const [editingId, setEditingId] = useState(null);
  
  // 2. Extraindo as funções do contexto
  const { success, error, warning } = useSnackbar();
  
  // ESTADOS DA BUSCA (DROPDOWN)
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  // CONFIGURAÇÃO DA PAGINAÇÃO
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [form, setForm] = useState({
    nome: '',
    username: '', 
    email: '',
    senha: '',
    ativo: true,
    nivel_acesso_id: 2 
  });

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Fecha o dropdown se clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await api.get("/usuarios/");
      const data = response.data || response; 
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      error("Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({ nome: '', username: '', email: '', senha: '', ativo: true, nivel_acesso_id: 2 });
    setEditingId(null);
    setView('list');
  };

  const handleEdit = (item) => {
    setForm({
      nome: item.nome,
      username: item.username || '', 
      email: item.email,
      senha: '', 
      ativo: item.ativo,
      nivel_acesso_id: item.nivel_acesso_id || 2
    });
    setEditingId(item.id);
    setView('form');
  };

  const handleToggleStatus = () => {
    const storedUser = localStorage.getItem('user');
    const loggedUser = storedUser ? JSON.parse(storedUser) : {};

    if (editingId === loggedUser.id && form.ativo === true) {
        return error("Você não pode desativar seu próprio usuário!");
    }
    setForm({ ...form, ativo: !form.ativo });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.email.trim()) return warning("Nome e Email são obrigatórios.");
    if (!editingId && !form.senha) return warning("Senha é obrigatória para novos usuários.");

    if (form.username && form.username.trim() !== '') {
        const usernameExists = users.some(u => 
            u.username?.toLowerCase() === form.username.trim().toLowerCase() && u.id !== editingId 
        );
        if (usernameExists) return warning(`O username "${form.username}" já está em uso.`);
    }
    const emailExists = users.some(u => 
        u.email.toLowerCase() === form.email.trim().toLowerCase() && u.id !== editingId 
    );
    if (emailExists) return warning(`O email "${form.email}" já está cadastrado.`);

    try {
      const payload = { ...form };
      if (editingId && !payload.senha) delete payload.senha; 
      if (!payload.username) delete payload.username; 

      if (editingId) {
        await api.put(`/usuarios/${editingId}`, payload);
        success("Usuário atualizado!");
      } else {
        await api.post("/usuarios/", payload);
        success("Usuário criado!");
      }
      handleReset();
      loadData();
    } catch (err) {
      const msg = err.response?.data?.detail || "Erro ao salvar usuário.";
      error(typeof msg === 'string' ? msg : "Erro ao salvar.");
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/usuarios/${itemToDelete.id}`);
      success("Usuário removido.");
      loadData();
    } catch (e) {
      error("Erro ao excluir.");
    } finally {
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  // LÓGICA DE FILTRO DA TABELA
  const filteredUsers = users.filter(u => {
    const term = searchTerm.toLowerCase();
    const matchName = (u.nome || '').toLowerCase().includes(term);
    const matchEmail = (u.email || '').toLowerCase().includes(term);
    const matchUsername = (u.username || '').toLowerCase().includes(term);
    return matchName || matchEmail || matchUsername;
  });

  const truncate = (str, n = 25) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str;

  const dropdownOptions = searchTerm === '' 
    ? [...users].sort((a, b) => b.id - a.id).slice(0, 5) 
    : filteredUsers.slice(0, 5);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const getPaginationGroup = () => {
    const maxButtons = 5;
    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) {
        start = Math.max(1, end - maxButtons + 1);
    }
    const pages = [];
    for (let i = start; i <= end; i++) {
        pages.push(i);
    }
    return pages;
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
                        <input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="form-control" />
                    </div>
                    <div>
                        <label className="input-label">Username</label>
                        <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="form-control" placeholder="Ex: joao.qa" />
                    </div>
                  </div>
                  <div>
                    <label className="input-label">Email <span className="required-asterisk">*</span></label>
                    <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="form-control" />
                  </div>
                  <div className="form-grid">
                    <div>
                        <label className="input-label">{editingId ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}</label>
                        <input type="password" value={form.senha} onChange={e => setForm({...form, senha: e.target.value})} className="form-control" />
                    </div>
                    <div>
                        <label className="input-label">Nível de Acesso</label>
                        <select value={form.nivel_acesso_id} onChange={e => setForm({...form, nivel_acesso_id: parseInt(e.target.value)})} className="form-control bg-gray">
                        <option value={1}>Admin</option>
                        <option value={2}>User / QA</option>
                        </select>
                    </div>
                  </div>
              </div>
              <div className="form-actions">
                  <button 
                    type="button" 
                    onClick={handleToggleStatus} 
                    className={`btn ${form.ativo ? 'danger' : 'success'}`}
                    style={{ marginRight: 'auto' }}
                  >
                    {form.ativo ? 'Desativar Usuário' : 'Ativar Usuário'}
                  </button>
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
                  <button onClick={() => setView('form')} className="btn primary btn-new">Novo Usuário</button>
                  <div className="separator"></div>
                   <div className="search-wrapper" ref={searchRef}>
                        <input 
                            type="text" 
                            placeholder="Buscar..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => setShowDropdown(true)}
                            className="search-input"
                        />
                        <span className="search-icon">🔍</span>
                        {showDropdown && dropdownOptions.length > 0 && (
                            <ul className="dropdown-list">
                                {dropdownOptions.map((u) => (
                                    <li 
                                        key={u.id} 
                                        className="dropdown-item"
                                        onClick={() => {
                                            setSearchTerm(u.nome || u.username);
                                            setShowDropdown(false);
                                        }}
                                    >
                                        {truncate(u.nome || u.username, 25)}
                                    </li>
                                ))}
                            </ul>
                        )}
                   </div>

               </div>
           </div>

           {loading ? <div className="loading-text">Carregando...</div> : (
             <div className="table-wrap">
               <div className="content-area">
                   {filteredUsers.length === 0 ? (
                     <div className="empty-container">Nenhum usuário encontrado para "{searchTerm}"</div>
                   ) : (
                     <table>
                       <thead>
                         <tr>
                           <th style={{width: '60px'}}>ID</th>
                           <th>Nome / Username</th>
                           <th>Email</th>
                           <th>Role</th>
                           <th style={{textAlign: 'center'}}>Status</th>
                           <th style={{textAlign: 'right'}}>Ações</th>
                         </tr>
                       </thead>
                       <tbody>
                         {currentUsers.map(item => (
                           <tr key={item.id} className="selectable" onClick={() => handleEdit(item)}>
                               <td className="cell-id">#{item.id}</td>
                               <td>
                                   <div className="cell-name">{item.nome}</div>
                                   {item.username && (
                                      <div style={{fontSize:'0.75rem', color:'#94a3b8', marginTop:'2px'}}>#{item.username}</div>
                                   )}
                               </td>
                               <td style={{color:'#64748b'}}>{item.email}</td>
                               <td>
                                   <span className="roles">
                                       {item.nivel_acesso_id === 1 ? 'ADMIN' : 'USER'}
                                   </span>
                               </td>
                               <td className="cell-status">
                                   <span 
                                      style={{
                                          backgroundColor: item.ativo ? '#001C42' : '#0F2B66', 
                                          color: '#ffffff'
                                      }} 
                                      className="status-badge"
                                   >
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
                   )}
               </div>

               <div className="pagination-container">
                  <button onClick={() => paginate(1)} disabled={currentPage === 1 || totalPages === 0} className="pagination-btn nav-btn" title="Primeira">«</button>
                  <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1 || totalPages === 0} className="pagination-btn nav-btn" title="Anterior">‹</button>

                  {getPaginationGroup().map((item) => (
                    <button
                      key={item}
                      onClick={() => paginate(item)}
                      className={`pagination-btn ${currentPage === item ? 'active' : ''}`}
                    >
                      {item}
                    </button>
                  ))}

                  {totalPages === 0 && (
                      <button className="pagination-btn active" disabled>1</button>
                  )}

                  <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="pagination-btn nav-btn" title="Próxima">›</button>
                  <button onClick={() => paginate(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="pagination-btn nav-btn" title="Última">»</button>
               </div>
             </div>
           )}
        </section>
      )}
    </main>
  );
}