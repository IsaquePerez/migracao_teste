import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import './styles.css';

export function AdminModulos() {
  const [modulos, setModulos] = useState([]);
  const [sistemas, setSistemas] = useState([]);
  const [form, setForm] = useState({ nome: '', descricao: '', sistema_id: '' });
  const [editingId, setEditingId] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [moduloToDelete, setModuloToDelete] = useState(null);
    
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null); 

  const filteredModulos = modulos.filter(m => 
      m.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const truncate = (str, n = 30) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str;

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

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
        toast.error("Erro ao carregar dados.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.sistema_id) return toast.warning("Selecione um Sistema Pai.");

    const nomeNormalizado = form.nome.trim().toLowerCase();
    const sistemaIdSelecionado = parseInt(form.sistema_id);

    const duplicado = modulos.some(m => 
        m.sistema_id === sistemaIdSelecionado && 
        m.nome.trim().toLowerCase() === nomeNormalizado && 
        m.id !== editingId
    );

    if (duplicado) return toast.warning("Já existe um módulo com este nome.");

    try {
      const payload = { ...form, sistema_id: sistemaIdSelecionado };
      if (editingId) {
          await api.put(`/modulos/${editingId}`, payload);
          toast.success("Módulo atualizado!");
      } else {
          await api.post("/modulos/", { ...payload, ativo: true });
          toast.success("Módulo criado!");
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
      setForm({ nome: modulo.nome, descricao: modulo.descricao, sistema_id: modulo.sistema_id });
      setEditingId(modulo.id);
  };
  
  const toggleActive = async (modulo) => {
      try {
          const novoStatus = !modulo.ativo;
          await api.put(`/modulos/${modulo.id}`, { ativo: novoStatus });
          toast.success(`Módulo ${novoStatus ? 'ativado' : 'desativado'}.`);
          setModulos(prev => prev.map(m => m.id === modulo.id ? { ...m, ativo: novoStatus } : m));
      } catch(e) { toast.error("Erro ao alterar status."); }
  };

  const requestDelete = (modulo) => {
      setModuloToDelete(modulo);
      setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
      if (!moduloToDelete) return;
      try {
          await api.delete(`/modulos/${moduloToDelete.id}`);
          toast.success("Excluído.");
          setModulos(prev => prev.filter(m => m.id !== moduloToDelete.id));
          if (editingId === moduloToDelete.id) handleCancel();
      } catch (error) { toast.error("Não foi possível excluir."); } 
      finally { setModuloToDelete(null); }
  };

  const getSistemaName = (id) => sistemas.find(s => s.id === id)?.nome || '-';
  const sistemasAtivos = sistemas.filter(s => s.ativo);

  const opcoesParaMostrar = searchTerm === '' 
    ? [...modulos].sort((a, b) => b.id - a.id).slice(0, 5) 
    : modulos.filter(m => m.nome.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 8);

  return (
    <main className="container grid">
      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir?"
        message={`Confirmar exclusão de "${moduloToDelete?.nome}"?`}
        confirmText="Sim"
        isDanger={true}
      />

      <section className="card form-card">
        <h2 className="section-title">{editingId ? 'Editar Módulo' : 'Novo Módulo'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div>
                <label className="input-label">Sistema Pai</label>
                <select value={form.sistema_id} onChange={e => setForm({...form, sistema_id: e.target.value})} className="form-control">
                    <option value="">Selecione...</option>
                    {sistemasAtivos.map(s => <option key={s.id} value={s.id}>{truncate(s.nome)}</option>)}
                </select>
            </div>
            <div>
                <label className="input-label">Nome do Módulo</label>
                <input required value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Ex: Contas a Pagar" className="form-control" />
            </div>
            <div>
                <label className="input-label">Descrição</label>
                <input value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Descrição opcional..." className="form-control" />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn primary">{editingId ? 'Atualizar' : 'Salvar'}</button>
            {editingId && <button type="button" onClick={handleCancel} className="btn">Cancelar</button>}
          </div>
        </form>
      </section>

      <section className="card">
        <div className="toolbar">
            <h2 className="page-title">Módulos</h2>
            <div ref={wrapperRef} className="search-wrapper">
                <input 
                    type="text" 
                    placeholder="Buscar..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    className="search-input"
                />
                <span className="search-icon">🔍</span>
                {showSuggestions && opcoesParaMostrar.length > 0 && (
                    <ul className="custom-dropdown">
                        {opcoesParaMostrar.map(m => (
                            <li key={m.id} onClick={() => { setSearchTerm(m.nome); setShowSuggestions(false); }}>
                                {truncate(m.nome, 30)}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>

        <div className="table-wrap">
            {modulos.length === 0 ? <p className="no-results">Nenhum módulo cadastrado.</p> : (
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
                             <tr><td colSpan="4" className="no-results">Nada encontrado.</td></tr>
                        ) : (
                            filteredModulos.map(m => (
                                <tr key={m.id} onClick={() => handleSelectRow(m)} className={editingId === m.id ? 'selected' : 'selectable'} style={{opacity: m.ativo ? 1 : 0.6}}>
                                    <td className="cell-name">
                                        <strong title={m.nome}>{truncate(m.nome)}</strong>
                                        <div title={m.descricao}>{truncate(m.descricao, 40)}</div>
                                    </td>
                                    <td style={{verticalAlign: 'middle'}}>
                                        <span className="badge system">{truncate(getSistemaName(m.sistema_id), 20)}</span>
                                    </td>
                                    <td style={{textAlign: 'center', verticalAlign: 'middle'}}>
                                        <span onClick={(e) => { e.stopPropagation(); toggleActive(m); }} className={`badge ${m.ativo ? 'on' : 'off'}`}>
                                            {m.ativo ? 'Ativo' : 'Inativo'}
                                        </span>                                        
                                    </td>
                                    <td className="cell-actions">
                                        <button onClick={(e) => { e.stopPropagation(); requestDelete(m); }} className="btn danger small">🗑️</button>
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