import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import './styles.css';

export function AdminProjetos() {
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list');
  const [editingId, setEditingId] = useState(null);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    status: 'ativo'
  });

  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = projetos.filter(p => 
      p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.get("/projetos");
      setProjetos(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Erro ao carregar projetos.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({ nome: '', descricao: '', data_inicio: '', data_fim: '', status: 'ativo' });
    setEditingId(null);
    setView('list');
  };

  const handleEdit = (item) => {
    setForm({
      nome: item.nome,
      descricao: item.descricao || '',
      data_inicio: item.data_inicio ? item.data_inicio.split('T')[0] : '',
      data_fim: item.data_fim ? item.data_fim.split('T')[0] : '',
      status: item.status
    });
    setEditingId(item.id);
    setView('form');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return toast.warning("Nome é obrigatório.");

    try {
      if (editingId) {
        await api.put(`/projetos/${editingId}`, form);
        toast.success("Projeto atualizado!");
      } else {
        await api.post("/projetos", form);
        toast.success("Projeto criado!");
      }
      handleReset();
      loadData();
    } catch (error) {
      toast.error("Erro ao salvar projeto.");
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/projetos/${itemToDelete.id}`);
      toast.success("Projeto excluído.");
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
        title="Excluir Projeto?"
        message={`Deseja excluir "${itemToDelete?.nome}"?`}
        isDanger={true}
      />

      {view === 'form' && (
        <div style={{maxWidth: '800px', margin: '0 auto'}}>
          <form onSubmit={handleSubmit}>
            <section className="card form-section">
              <div className="form-header">
                 <h3 className="form-title">{editingId ? 'Editar Projeto' : 'Novo Projeto'}</h3>
              </div>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                  <div>
                    <label className="input-label">Nome do Projeto <span className="required-asterisk">*</span></label>
                    <input 
                       value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} 
                       className="form-control" placeholder="Ex: E-commerce 2.0"
                    />
                  </div>
                  
                  <div>
                    <label className="input-label">Descrição</label>
                    <textarea 
                       value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} 
                       className="form-control" rows="3"
                    />
                  </div>

                  <div className="form-grid">
                      <div>
                        <label className="input-label">Data Início</label>
                        <input type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} className="form-control" />
                      </div>
                      <div>
                        <label className="input-label">Data Fim (Prevista)</label>
                        <input type="date" value={form.data_fim} onChange={e => setForm({...form, data_fim: e.target.value})} className="form-control" />
                      </div>
                  </div>

                  <div>
                    <label className="input-label">Status</label>
                    <select 
                        value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                        className="form-control bg-gray"
                    >
                       <option value="ativo">Ativo</option>
                       <option value="concluido">Concluído</option>
                       <option value="cancelado">Cancelado</option>
                    </select>
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
               <h3 className="page-title">Projetos</h3>
               <div className="toolbar-actions">
                   <div className="search-wrapper">
                        <input 
                            type="text" placeholder="Buscar projeto..." value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        <span className="search-icon">🔍</span>
                   </div>
                   <button onClick={() => setView('form')} className="btn primary btn-new">Novo Projeto</button>
               </div>
           </div>

           {loading ? <div className="loading-text">Carregando...</div> : (
             <div className="table-wrap">
               {projetos.length === 0 ? (
                 <div className="empty-container">Nenhum projeto cadastrado.</div>
               ) : (
                 <table>
                   <thead>
                     <tr>
                       <th style={{width: '60px'}}>ID</th>
                       <th>Nome</th>
                       <th>Descrição</th>
                       <th style={{textAlign: 'center'}}>Status</th>
                       <th style={{textAlign: 'right'}}>Ações</th>
                     </tr>
                   </thead>
                   <tbody>
                     {filteredData.map(item => (
                       <tr key={item.id} className="selectable" onClick={() => handleEdit(item)}>
                           <td className="cell-id">#{item.id}</td>
                           <td className="cell-name">{item.nome}</td>
                           <td style={{color:'#64748b'}}>{item.descricao}</td>
                           <td className="cell-status">
                               <span className={`status-badge ${item.status}`}>{item.status}</span>
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
           )}
        </section>
      )}
    </main>
  );
}