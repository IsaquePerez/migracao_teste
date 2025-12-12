import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { ConfirmationModal } from '../components/ConfirmationModal';

export function AdminModulos() {
  const [modulos, setModulos] = useState([]);
  const [sistemas, setSistemas] = useState([]);
  const [form, setForm] = useState({ nome: '', descricao: '', sistema_id: '' });
  const [editingId, setEditingId] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [moduloToDelete, setModuloToDelete] = useState(null);

  // Estado para busca
  const [searchTerm, setSearchTerm] = useState('');

  // Filtro
  const filteredModulos = modulos.filter(m => 
      m.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Função auxiliar de truncate
  const truncate = (str, n = 40) => {
    return (str && str.length > n) ? str.substr(0, n - 1) + '...' : str;
  };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
        const [mods, sis] = await Promise.all([
            api.get("/modulos/"),
            api.get("/sistemas/")
        ]);
        setModulos(mods);
        setSistemas(sis);
        
        const ativos = sis.filter(s => s.ativo);
        if (ativos.length > 0 && !form.sistema_id) {
            setForm(f => ({ ...f, sistema_id: ativos[0].id }));
        }
    } catch (e) { 
        console.error(e); 
        toast.error("Erro ao carregar dados.");
    }
  };

  /* ==========================================================================
     AÇÕES DE FORMULÁRIO (SALVAR)
     ========================================================================== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.sistema_id) {
        return toast.warning("Selecione um Sistema Pai.");
    }

    // Validação de Duplicidade
    const nomeNormalizado = form.nome.trim().toLowerCase();
    const sistemaIdSelecionado = parseInt(form.sistema_id);

    const duplicado = modulos.some(m => {
        const mesmoSistema = m.sistema_id === sistemaIdSelecionado;
        const mesmoNome = m.nome.trim().toLowerCase() === nomeNormalizado;
        const naoEhOProprio = m.id !== editingId;
        return mesmoSistema && mesmoNome && naoEhOProprio;
    });

    if (duplicado) {
        return toast.warning("Já existe um módulo com este nome neste sistema.");
    }

    try {
      const payload = { ...form, sistema_id: sistemaIdSelecionado };
      
      if (editingId) {
          await api.put(`/modulos/${editingId}`, payload);
          toast.success("Módulo atualizado com sucesso!");
      } else {
          await api.post("/modulos/", { ...payload, ativo: true });
          toast.success("Módulo criado com sucesso!");
      }
      
      handleCancel();
      const updatedMods = await api.get("/modulos/");
      setModulos(updatedMods);

    } catch (error) { 
        toast.error(error.message || "Erro ao salvar módulo."); 
    }
  };

  const handleCancel = () => {
      setEditingId(null);
      setForm(f => ({...f, nome:'', descricao:''})); 
  };

  const handleSelectRow = (modulo) => {
      setForm({
          nome: modulo.nome, 
          descricao: modulo.descricao, 
          sistema_id: modulo.sistema_id
      });
      setEditingId(modulo.id);
  };
  
  const toggleActive = async (modulo) => {
      try {
          const novoStatus = !modulo.ativo;
          await api.put(`/modulos/${modulo.id}`, { ativo: novoStatus });
          toast.success(`Módulo ${novoStatus ? 'ativado' : 'desativado'}.`);
          // Atualiza localmente para feedback instantâneo
          setModulos(prev => prev.map(m => m.id === modulo.id ? { ...m, ativo: novoStatus } : m));
      } catch(e) { 
          toast.error("Erro ao alterar status."); 
      }
  };

  const requestDelete = (modulo) => {
      setModuloToDelete(modulo);
      setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
      if (!moduloToDelete) return;
      try {
          await api.delete(`/modulos/${moduloToDelete.id}`);
          toast.success("Módulo excluído.");
          setModulos(prev => prev.filter(m => m.id !== moduloToDelete.id));
          if (editingId === moduloToDelete.id) handleCancel();
      } catch (error) {
          toast.error(error.message || "Não foi possível excluir.");
      } finally {
          setModuloToDelete(null);
      }
  };

  const getSistemaName = (id) => sistemas.find(s => s.id === id)?.nome || 'Sistema Removido';
  const sistemasAtivos = sistemas.filter(s => s.ativo);

  return (
    <main className="container grid">
      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir Módulo?"
        message={`Tem a certeza que deseja excluir o módulo "${moduloToDelete?.nome}"?`}
        confirmText="Sim, Excluir"
        isDanger={true}
      />

      <section className="card">
        <h2 className="section-title">{editingId ? 'Editar Módulo' : 'Novo Módulo'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div>
                <label>Sistema Pai</label>
                <select 
                    value={form.sistema_id} 
                    onChange={e => setForm({...form, sistema_id: e.target.value})} 
                >
                    <option value="">Selecione um sistema...</option>
                    {sistemasAtivos.map(s => <option key={s.id} value={s.id}>{truncate(s.nome, 30)}</option>)}
                </select>
            </div>
            <div>
                <label>Nome do Módulo</label>
                <input 
                    required 
                    value={form.nome} 
                    onChange={e => setForm({...form, nome: e.target.value})} 
                    placeholder="Ex: Contas a Pagar" 
                />
            </div>
            <div>
                <label>Descrição</label>
                <input 
                    value={form.descricao} 
                    onChange={e => setForm({...form, descricao: e.target.value})} 
                    placeholder="Descrição funcional..."
                />
            </div>
          </div>
          
          <div className="actions" style={{marginTop: '15px', display: 'flex', gap: '10px'}}>
            <button type="submit" className="btn primary">
                {editingId ? 'Atualizar' : 'Salvar'}
            </button>
            {editingId && (
                <button type="button" onClick={handleCancel} className="btn">
                    Cancelar
                </button>
            )}
          </div>
        </form>
      </section>

      <section className="card">
        {/* Cabeçalho da Tabela com Busca */}
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
            <h2 className="section-title" style={{margin: 0}}>Módulos Cadastrados</h2>
            <div style={{position: 'relative'}}>
                <input 
                    type="text" 
                    placeholder="Pesquisar módulo..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        padding: '8px 35px 8px 12px', 
                        borderRadius: '6px', 
                        border: '1px solid #cbd5e1', 
                        fontSize: '0.9rem',
                        minWidth: '250px'
                    }}
                />
                <span style={{position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8'}}>🔍</span>
            </div>
        </div>

        <div className="table-wrap">
            {modulos.length === 0 ? <p className="muted" style={{textAlign:'center', padding:'20px'}}>Nenhum módulo cadastrado.</p> : (
                <table>
                    <thead>
                        <tr>
                            <th style={{textAlign: 'left'}}>Módulo</th>
                            <th style={{textAlign: 'left'}}>Sistema</th>
                            <th style={{textAlign: 'center'}}>Status</th>
                            <th style={{textAlign: 'right'}}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredModulos.length === 0 ? (
                             <tr><td colSpan="4" style={{textAlign:'center', padding:'20px'}}>Nenhum módulo encontrado para "{searchTerm}".</td></tr>
                        ) : (
                            filteredModulos.map(m => (
                                <tr 
                                    key={m.id} 
                                    onClick={() => handleSelectRow(m)}
                                    className={editingId === m.id ? 'selected' : 'selectable'}
                                    style={{opacity: m.ativo ? 1 : 0.6}}
                                >
                                    <td style={{verticalAlign: 'middle'}}>
                                        <strong title={m.nome}>{truncate(m.nome)}</strong>
                                        <div className="muted" style={{fontSize: '0.8rem'}} title={m.descricao}>
                                            {truncate(m.descricao, 40)}
                                        </div>
                                    </td>
                                    <td style={{verticalAlign: 'middle'}}>
                                        <span className="badge" style={{backgroundColor: '#e0f2fe', color: '#0369a1'}} title={getSistemaName(m.sistema_id)}>
                                            {truncate(getSistemaName(m.sistema_id), 20)}
                                        </span>
                                    </td>
                                    
                                    {/* Status Centralizado */}
                                    <td style={{textAlign: 'center', verticalAlign: 'middle'}}>
                                        <span 
                                            onClick={(e) => { e.stopPropagation(); toggleActive(m); }}
                                            className={`badge ${m.ativo ? 'on' : 'off'}`}
                                            title="Clique para alternar"
                                            style={{cursor: 'pointer'}}
                                        >
                                            {m.ativo ? 'Ativo' : 'Inativo'}
                                        </span>                                    
                                    </td>
                                    
                                    {/* Ações Alinhadas à Direita */}
                                    <td style={{textAlign: 'right', verticalAlign: 'middle'}}>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); requestDelete(m); }}
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