import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { ConfirmationModal } from '../components/ConfirmationModal';

/* ==========================================================================
   COMPONENTE: ADMIN USUÁRIOS
   Gestão de acessos, criação de logins e permissões.
   ========================================================================== */
export function AdminUsers() {
  /* ==========================================================================
     ESTADOS
     ========================================================================== */
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estado de Seleção (Edição)
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [form, setForm] = useState({
    nome: '',
    username: '',
    email: '',
    senha: '',
    nivel_acesso_id: 2 
  });

  // Estados do Modal de Exclusão
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // 1. ESTADO DE BUSCA
  const [searchTerm, setSearchTerm] = useState('');

  // 2. FILTRO (Nome, Username ou Email)
  const filteredUsers = users.filter(u => 
      u.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 3. AUXILIARES
  const truncate = (str, n = 40) => {
    if (!str) return '';
    return str.length > n ? str.substr(0, n - 1) + '...' : str;
  };

  /* ==========================================================================
     CARREGAMENTO INICIAL
     ========================================================================== */
  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.get("/usuarios/");
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar lista de utilizadores.");
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================================
     GESTÃO DO FORMULÁRIO
     ========================================================================== */
  const handleSelect = (user) => {
    setSelectedUser(user);
    setForm({
      nome: user.nome || '',
      username: user.username || '', 
      email: user.email || '',
      senha: '', // Senha nunca vem do backend por segurança
      nivel_acesso_id: user.nivel_acesso_id || 2
    });
  };

  const handleClear = () => {
    setSelectedUser(null);
    setForm({ nome: '', username: '', email: '', senha: '', nivel_acesso_id: 2 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // --- VALIDAÇÃO MANUAL (Substitui o 'required' do navegador) ---
    if (!form.nome.trim()) return toast.warning("O Nome Completo é obrigatório.");
    if (!form.username.trim()) return toast.warning("O Username é obrigatório.");
    if (!form.email.trim()) return toast.warning("O Email é obrigatório.");
    
    // Validação de senha apenas para novos usuários
    if (!selectedUser && !form.senha) {
        return toast.warning("A senha é obrigatória para novos utilizadores.");
    }

    try {
      if (selectedUser) {
        // Edição: Monta payload dinâmico (só envia senha se foi alterada)
        const payload = {
          nome: form.nome,
          username: form.username,
          email: form.email,
          nivel_acesso_id: parseInt(form.nivel_acesso_id)
        };
        if (form.senha) payload.senha = form.senha;

        await api.put(`/usuarios/${selectedUser.id}`, payload);
        toast.success("Utilizador atualizado com sucesso!");
      } else {
        // Criação
        const payload = {
          nome: form.nome,
          username: form.username,
          email: form.email,
          senha: form.senha,
          nivel_acesso_id: parseInt(form.nivel_acesso_id),
          ativo: true
        };
        await api.post("/usuarios/", payload);
        toast.success("Novo utilizador criado!");
      }
      
      handleClear();
      loadUsers(); 
    } catch (error) {
      // Exibe mensagem de erro do backend (ex: Email duplicado)
      toast.error(error.message || "Erro ao salvar utilizador.");
    }
  };

  /* ==========================================================================
     AÇÕES DE STATUS E EXCLUSÃO
     ========================================================================== */
  const toggleActive = async (user) => {
      try {
          const novoStatus = !user.ativo;
          await api.put(`/usuarios/${user.id}`, { ativo: novoStatus });
          
          toast.success(`Acesso de ${user.nome.split(' ')[0]} ${novoStatus ? 'ativado' : 'bloqueado'}.`);
          
          // Atualiza lista e seleção localmente
          setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ativo: novoStatus } : u));
          if (selectedUser?.id === user.id) {
              setSelectedUser(prev => ({ ...prev, ativo: novoStatus }));
          }
      } catch (error) { 
          toast.error("Erro ao alterar status."); 
      }
  };

  const requestDelete = () => {
      if (!selectedUser) return;
      
      // Regra de segurança visual
      if (selectedUser.nivel_acesso?.nome === 'admin') {
          return toast.error("Não é permitido excluir contas de Administrador.");
      }

      setUserToDelete(selectedUser);
      setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
      if (!userToDelete) return;
      try {
        await api.delete(`/usuarios/${userToDelete.id}`);
        toast.success("Utilizador excluído.");
        handleClear();
        loadUsers();
      } catch (error) { 
          toast.error(error.message || "O usuário possui vínculos e não pode ser excluído."); 
      } finally {
          setUserToDelete(null);
      }
  };

  /* ==========================================================================
     RENDERIZAÇÃO
     ========================================================================== */
  return (
    <main className="container grid">
      <style>{`
        .selected { background-color: #e0f2fe !important; }
        .selectable:hover { background-color: #f1f5f9; cursor: pointer; }
      `}</style>
      
      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir Utilizador?"
        message={`Tem a certeza que deseja apagar a conta de "${userToDelete?.nome}"?`}
        confirmText="Sim, Excluir"
        isDanger={true}
      />

      {/* COLUNA 1: FORMULÁRIO */}
      <section className="card">
        <h2 className="section-title">
          {selectedUser ? 'Editar Utilizador' : 'Novo User'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{gridTemplateColumns: '1fr'}}>
            <div>
              <label>Nome Completo</label>
              <input 
                type="text"
                value={form.nome} 
                onChange={e => setForm({...form, nome: e.target.value})} 
                placeholder="ex.: João Silva"
                maxLength={50}
              />
            </div>
            <div>
              <label>Username / ID (Único)</label>
              <input 
                type="text"
                value={form.username} 
                onChange={e => setForm({...form, username: e.target.value})} 
                placeholder="ex.: jsilva"
                maxLength={20}
                style={{fontFamily: 'monospace'}}
              />
            </div>
            <div>
              <label>Email (Login)</label>
              <input 
                type="email"
                value={form.email} 
                onChange={e => setForm({...form, email: e.target.value})} 
                placeholder="ex.: joao@empresa.com"
              />
            </div>
            <div>
              <label>Tipo de Utilizador</label>
              <select 
                value={form.nivel_acesso_id} 
                onChange={e => setForm({...form, nivel_acesso_id: e.target.value})}
              >
                <option value="2">Testador (Padrão)</option>
                <option value="1">Administrador</option>
              </select>
            </div>
            <div>
              <label>
                {selectedUser ? 'Nova Senha (opcional)' : 'Senha'}
              </label>
              <input 
                type="password" 
                value={form.senha} 
                onChange={e => setForm({...form, senha: e.target.value})} 
                placeholder={selectedUser ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
              />
            </div>
          </div>
          
          <div className="actions" style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
            <button type="submit" className="btn primary">
              {selectedUser ? 'Atualizar' : 'Salvar'}
            </button>
            
            {selectedUser && (
              <>
                <button 
                    type="button" 
                    onClick={() => toggleActive(selectedUser)} 
                    className="btn" 
                    style={{backgroundColor: selectedUser.ativo ? '#f59e0b' : '#10b981', color: 'white'}}
                >
                    {selectedUser.ativo ? 'Bloquear' : 'Ativar'}
                </button>
                
                <button 
                    type="button" 
                    onClick={requestDelete} 
                    className="btn danger"
                >
                    Excluir
                </button>
                
                <button type="button" onClick={handleClear} className="btn">
                    Cancelar
                </button>
              </>
            )}
          </div>
        </form>
      </section>

      {/* COLUNA 2: LISTA DE UTILIZADORES COM BUSCA */}
      <section className="card">
        {/* HEADER COM BUSCA */}
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
            <h2 className="section-title" style={{margin: 0}}>Utilizadores</h2>
            <div style={{position: 'relative'}}>
                <input 
                    type="text" 
                    placeholder="Buscar nome, user ou email..." 
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

        <div className="table-wrap">
          {loading ? <p style={{textAlign:'center', padding:'20px'}} className="muted">A carregar...</p> : (
            <table>
              <thead>
                <tr>
                  <th style={{textAlign: 'left'}}>Username</th>
                  <th style={{textAlign: 'left'}}>Nome</th>
                  <th style={{textAlign: 'left'}}>Email</th>
                  <th style={{textAlign: 'center'}}>Tipo</th>
                  <th style={{textAlign: 'right'}}>Status</th>
                </tr>
              </thead>
              <tbody>
                {/* 4. USA LISTA FILTRADA */}
                {filteredUsers.length === 0 ? (
                    <tr><td colSpan="5" style={{textAlign:'center', padding:'20px'}}>Nenhum usuário encontrado para "{searchTerm}".</td></tr>
                ) : (
                    filteredUsers.map(u => (
                      <tr 
                        key={u.id} 
                        onClick={() => handleSelect(u)} 
                        className={selectedUser?.id === u.id ? 'selected' : 'selectable'}
                        title="Clique para editar"
                      >
                        <td style={{verticalAlign: 'middle'}}>
                            <strong style={{color: '#0369a1', fontFamily: 'monospace'}}>
                                {u.username || '-'}
                            </strong>
                        </td>
                        <td style={{verticalAlign: 'middle'}}>
                            {truncate(u.nome, 20)}
                        </td>
                        <td style={{fontSize: '0.85rem', verticalAlign: 'middle'}}>{truncate(u.email, 25)}</td>
                        <td style={{textAlign: 'center', verticalAlign: 'middle'}}>
                          <span className="badge" style={{
                              backgroundColor: u.nivel_acesso?.nome === 'admin' ? '#fee2e2' : '#e0f2fe', 
                              color: u.nivel_acesso?.nome === 'admin' ? '#991b1b' : '#075985'
                          }}>
                              {u.nivel_acesso?.nome || 'N/A'}
                          </span>
                        </td>
                        <td style={{textAlign: 'right', verticalAlign: 'middle'}}>
                          <span className={`badge ${u.ativo ? 'on' : 'off'}`}>
                            {u.ativo ? 'Ativo' : 'Bloq.'}
                          </span>
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