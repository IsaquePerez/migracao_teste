import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function AdminSistemas() {
  const [sistemas, setSistemas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nome: '', descricao: '' });
  const [editingId, setEditingId] = useState(null);

  // --- LIMITES DE CARACTERES ---
  const LIMITS = {
      nome: 50,
      descricao: 100
  };

  useEffect(() => { loadSistemas(); }, []);

  const loadSistemas = async () => {
    setLoading(true);
    try {
      const data = await api.get("/sistemas/");
      setSistemas(Array.isArray(data) ? data : []);
    } catch (error) { console.error(error); alert("Erro ao carregar sistemas."); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) await api.put(`/sistemas/${editingId}`, form);
      else await api.post("/sistemas/", { ...form, ativo: true });
      
      alert("Salvo com sucesso!");
      handleCancel();
      loadSistemas();
    } catch (error) { alert("Erro ao salvar sistema."); }
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
          loadSistemas();
      } catch(e) { alert("Erro ao atualizar status."); }
  };

  return (
    <main className="container grid">
      <section className="card">
        <h2 className="section-title">{editingId ? 'Editar Sistema' : 'Novo Sistema'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            
            {/* CAMPO NOME COM LIMITE */}
            <div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <label>Nome do Sistema</label>
                    <span style={{fontSize: '0.75rem', color: '#94a3b8'}}>
                        {form.nome.length}/{LIMITS.nome}
                    </span>
                </div>
                <input 
                    required 
                    maxLength={LIMITS.nome} // Limita a digitação
                    value={form.nome} 
                    onChange={e => setForm({...form, nome: e.target.value})} 
                    placeholder="Ex: ERP Financeiro" 
                />
            </div>

            {/* CAMPO DESCRIÇÃO COM LIMITE */}
            <div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <label>Descrição</label>
                    <span style={{fontSize: '0.75rem', color: '#94a3b8'}}>
                        {form.descricao.length}/{LIMITS.descricao}
                    </span>
                </div>
                <input 
                    maxLength={LIMITS.descricao} // Limita a digitação
                    value={form.descricao} 
                    onChange={e => setForm({...form, descricao: e.target.value})} 
                    placeholder="Breve descrição..." 
                />
            </div>

          </div>
          <div className="actions" style={{marginTop: '15px', display: 'flex', gap: '10px'}}>
            <button type="submit" className="btn primary">{editingId ? 'Atualizar' : 'Salvar'}</button>
            {editingId && <button type="button" onClick={handleCancel} className="btn">Cancelar Seleção</button>}
          </div>
        </form>
      </section>

      <section className="card">
        <h2 className="section-title">Sistemas Registrados</h2>
        <div className="table-wrap">
            <table>
                <thead><tr><th>Nome</th><th>Descrição</th><th>Status</th></tr></thead>
                <tbody>
                    {sistemas.map(s => (
                        <tr 
                            key={s.id} 
                            onClick={() => handleSelectRow(s)}
                            className={editingId === s.id ? 'selected' : 'selectable'}
                            style={{opacity: s.ativo ? 1 : 0.6}}
                        >
                            <td title={s.nome}>
                                <strong>
                                    {s.nome.length > 30 
                                        ? s.nome.substring(0, 30) + '...' 
                                        : s.nome}
                                </strong>
                            </td>
                            
                            {/* Dica: Title mostra o texto completo se passar o mouse */}
                            <td title={s.descricao}>
                                {s.descricao.length > 50 ? s.descricao.substring(0, 30) + '...' : s.descricao}
                            </td>
                            
                            <td>
                                <span 
                                    onClick={(e) => { e.stopPropagation(); toggleActive(s); }}
                                    className="badge" 
                                    title="Clique para alterar"
                                    style={{
                                        cursor: 'pointer',
                                        backgroundColor: s.ativo ? '#eef2ff' : '#fee2e2', 
                                        color: s.ativo ? '#3730a3' : '#b91c1c'
                                    }}
                                >
                                    {s.ativo ? 'Ativo' : 'Inativo'}
                                </span>
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