import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [impactData, setImpactData] = useState(null);
  
  // ESTADO DO FORMULÁRIO ATUALIZADO
  // Removemos campos que não existem no seu DB (credencial, departamento, etc)
  // Adicionamos senha e nivel_acesso_id
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    nivel_acesso_id: 2 // Valor padrão: 2 (Testador/User)
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.get("/usuarios/");
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar utilizadores.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (user) => {
    setSelectedUser(user);
    // Ao selecionar, preenchemos o formulário com os dados existentes
    setForm({
      nome: user.nome || '',
      email: user.email || '',
      senha: '',
      nivel_acesso_id: user.nivel_acesso_id || 2
    });
  };

  const handleClear = () => {
    setSelectedUser(null);
    // Reseta para o estado inicial (pronto para criar novo)
    setForm({ nome: '', email: '', senha: '', nivel_acesso_id: 2 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (selectedUser) {
        // --- MODO EDIÇÃO (UPDATE) ---
        // Prepara o payload apenas com campos que podem ser alterados
        const payload = {
          nome: form.nome,
          email: form.email,
          nivel_acesso_id: parseInt(form.nivel_acesso_id)
        };
        // Só envia a senha se o admin tiver digitado algo novo
        if (form.senha) {
          payload.senha = form.senha;
        }

        await api.put(`/usuarios/${selectedUser.id}`, payload);
        alert("Utilizador atualizado com sucesso!");

      } else {
        // --- MODO CRIAÇÃO (CREATE) ---
        // Validação básica
        if (!form.senha) {
          alert("Para criar um novo utilizador, a senha é obrigatória.");
          return;
        }

        const payload = {
          nome: form.nome,
          email: form.email,
          senha: form.senha,
          nivel_acesso_id: parseInt(form.nivel_acesso_id),
          ativo: true
        };

        await api.post("/usuarios/", payload);
        alert("Utilizador criado com sucesso!");
      }

      handleClear();
      loadUsers(); // Recarrega a lista

    } catch (error) {
      console.error(error);
      // Tenta mostrar a mensagem de erro que vem da API (ex: "Email já cadastrado")
      const msg = error.message || "Erro ao salvar.";
      alert(`Erro: ${msg}`);
    }
  };

  // Função para ativar/desativar (opcional, se quiser adicionar botão depois)
  const toggleActive = async (user) => {
      try {
          // 1. Calcula o novo estado
          const novoStatus = !user.ativo;
          
          // 2. Chama a API para atualizar no servidor
          await api.put(`/usuarios/${user.id}`, { ativo: novoStatus });
          
          // 3. ATUALIZAÇÃO IMEDIATA DA UI:
          // Atualiza o utilizador selecionado para refletir a mudança no botão instantaneamente
          setSelectedUser({ ...user, ativo: novoStatus });
          
          // 4. Recarrega a lista para garantir que tudo está sincronizado
          loadUsers();
          
      } catch (error) { 
          console.error(error);
          alert("Erro ao alterar status."); 
      }
  }

  const handleDelete = async () => {
      if (!selectedUser || !confirm(`Tem a certeza que deseja apagar ${selectedUser.nome}?`)) return;
      try {
          await api.delete(`/usuarios/${selectedUser.id}`);
          alert("Apagado com sucesso!");
          handleClear();
          loadUsers();
      } catch (error) { alert("O usuário é vinculado a informações no banco de dados!"); }
  }

  return (
    <main className="container grid">
      {/* --- CARD DO FORMULÁRIO --- */}
      <section className="card">
        <h2 className="section-title">
          {selectedUser ? 'Editar Utilizador' : 'Novo User'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {/* Nome */}
            <div>
              <label>Nome Completo</label>
              <input 
                type="text" required
                value={form.nome} 
                onChange={e => setForm({...form, nome: e.target.value})} 
                placeholder="ex.: João Silva"
                maxLength={50}
              />
            </div>

            {/* Email */}
            <div>
              <label>Email (Login)</label>
              <input 
                type="email" required
                value={form.email} 
                onChange={e => setForm({...form, email: e.target.value})} 
                placeholder="ex.: joao@empresa.com"
              />
            </div>

            {/* Nível de Acesso */}
            <div>
              <label>Tipo de Utilizador</label>
              <select 
                value={form.nivel_acesso_id} 
                onChange={e => setForm({...form, nivel_acesso_id: e.target.value})}
                required
              >
                {/* IDs baseados no seu seed: 1=Admin, 2=User */}
                <option value="2">Testador (Padrão)</option>
                <option value="1">Administrador</option>
              </select>
            </div>

            {/* Senha */}
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
          
          {/* Botões de Ação */}
          <div className="actions" style={{justifyContent: 'flex-start', gap: '10px', display: 'flex', marginTop: '20px'}}>
            <button type="submit" className="btn primary">
              {selectedUser ? 'Atualizar Dados' : 'Salvar'}
            </button>
            
            {selectedUser && (
              <>
                <button type="button" onClick={() => toggleActive(selectedUser)} className="btn" style={{backgroundColor: selectedUser.ativo ? '#f59e0b' : '#10b981', color: 'white'}}>
                    {selectedUser.ativo ? 'Desativar' : 'Ativar'}
                </button>
                {selectedUser.nivel_acesso?.nome !== 'admin' && (
                  <button type="button" onClick={handleDelete} className="btn danger">
                      Excluir
                  </button>
                )}
                <button type="button" onClick={handleClear} className="btn">
                    Cancelar Seleção
                </button>
              </>
            )}
          </div>
        </form>
      </section>

      {/* --- CARD DA LISTA --- */}
      <section className="card">
        <h2 className="section-title">Utilizadores Cadastrados</h2>
        <div className="table-wrap">
          {loading ? <p>A carregar...</p> : (
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Tipo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr 
                    key={u.id || u.email} 
                    onClick={() => handleSelect(u)} 
                    className={selectedUser?.email === u.email ? 'selected' : 'selectable'}
                    style={{cursor: 'pointer'}}
                  >
                    {/* ALTERAÇÃO AQUI: split(' ')[0] pega só a primeira palavra */}
                    <td style={{
                        maxWidth: '120px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }} title={u.nome}>
                        <strong>{u.nome?.split(' ')[0]}</strong>
                    </td>
                    
                    <td>{u.email}</td>
                    <td>
                      {/* Mostra o nome bonito vindo do banco */}
                      <span style={{backgroundColor: u.nivel_acesso?.nome === 'admin' ? '#fee2e2' : '#e0f2fe', padding: '2px 6px', borderRadius: '10px', fontSize: '0.85em', color: u.nivel_acesso?.nome === 'admin' ? '#991b1b' : '#075985'}}>
                         {u.nivel_acesso?.descricao || u.nivel_acesso?.nome || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.ativo ? 'on' : 'off'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
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