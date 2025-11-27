import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function AdminProjetos() {
  const [projetos, setProjetos] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  
  // Estado do Form
  const [form, setForm] = useState({
    nome: '', 
    descricao: '', 
    modulo_id: '', 
    responsavel_id: '',
    status: 'ativo'
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
        const [projData, modData, userData] = await Promise.all([
            api.get("/projetos/"),
            api.get("/modulos/"),
            api.get("/usuarios/")
        ]);
        setProjetos(projData);
        setModulos(modData);
        setUsuarios(userData);
        
        // Pre-selecionar o primeiro módulo se disponível
        if (modData.length > 0) setForm(f => ({ ...f, modulo_id: modData[0].id }));
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.modulo_id) return alert("Selecione um módulo!");

    const payload = {
        ...form,
        modulo_id: parseInt(form.modulo_id),
        // O sistema_id deve vir do módulo selecionado (backend requirement)
        sistema_id: modulos.find(m => m.id == form.modulo_id)?.sistema_id,
        responsavel_id: form.responsavel_id ? parseInt(form.responsavel_id) : null
    };

    try {
        if (editingId) await api.put(`/projetos/${editingId}`, payload);
        else await api.post("/projetos/", payload);
        
        alert("Projeto salvo!");
        setEditingId(null);
        setForm(f => ({ ...f, nome: '', descricao: '' }));
        const updated = await api.get("/projetos/");
        setProjetos(updated);
    } catch (err) { alert("Erro ao salvar projeto: " + err.message); }
  };

  return (
    <main className="container grid">
      <section className="card">
        <h2 className="section-title">{editingId ? 'Editar Projeto' : 'Novo Projeto'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div>
                <label>Módulo Pai</label>
                <select value={form.modulo_id} onChange={e => setForm({...form, modulo_id: e.target.value})} required>
                    <option value="">Selecione...</option>
                    {modulos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
            </div>
            <div>
                <label>Responsável (Lider)</label>
                <select value={form.responsavel_id} onChange={e => setForm({...form, responsavel_id: e.target.value})}>
                    <option value="">Sem responsável</option>
                    {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
            </div>
            <div style={{gridColumn: '1/-1'}}>
                <label>Nome do Projeto</label>
                <input required value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Ex: Refatoração do Login" />
            </div>
            <div style={{gridColumn: '1/-1'}}>
                <label>Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="ativo">Ativo</option>
                    <option value="pausado">Pausado</option>
                    <option value="finalizado">Finalizado</option>
                </select>
            </div>
          </div>
          <button type="submit" className="btn primary" style={{marginTop:'15px'}}>Salvar Projeto</button>
        </form>
      </section>

      <section className="card">
        <h2 className="section-title">Lista de Projetos</h2>
        <div className="table-wrap">
            <table>
                <thead><tr><th>Projeto</th><th>Módulo</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                    {projetos.map(p => (
                        <tr key={p.id}>
                            <td><strong>{p.nome}</strong></td>
                            <td>{modulos.find(m => m.id === p.modulo_id)?.nome || '-'}</td>
                            <td><span className={`badge ${p.status === 'ativo' ? 'on' : 'off'}`}>{p.status}</span></td>
                            <td>
                                <button onClick={() => { 
                                    setForm({
                                        nome: p.nome, descricao: p.descricao, 
                                        modulo_id: p.modulo_id, responsavel_id: p.responsavel_id || '', status: p.status
                                    }); 
                                    setEditingId(p.id); 
                                }} className="btn">Editar</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </section>
    </main>
  );
}