import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import './styles.css';

export function AdminCiclos() {
  const [ciclos, setCiclos] = useState([]);
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
    status: 'ativo',
    projeto_id: ''
  });

  const [searchTerm, setSearchTerm] = useState('');

  // Carrega projetos e ciclos
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ciclosData, projetosData] = await Promise.all([
        api.get("/testes/ciclos"), 
        api.get("/projetos")
      ]);
      setCiclos(Array.isArray(ciclosData) ? ciclosData : []);
      setProjetos(Array.isArray(projetosData) ? projetosData : []);
    } catch (error) {
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({ nome: '', descricao: '', data_inicio: '', data_fim: '', status: 'ativo', projeto_id: '' });
    setEditingId(null);
    setView('list');
  };

  const handleEdit = (item) => {
    setForm({
      nome: item.nome,
      descricao: item.descricao || '',
      data_inicio: item.data_inicio ? item.data_inicio.split('T')[0] : '',
      data_fim: item.data_fim ? item.data_fim.split('T')[0] : '',
      status: item.status,
      projeto_id: item.projeto_id || ''
    });
    setEditingId(item.id);
    setView('form');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.projeto_id) return toast.warning("Nome e Projeto são obrigatórios.");

    try {
      if (editingId) {
        await api.put(`/testes/ciclos/${editingId}`, form);
        toast.success("Ciclo atualizado!");
      } else {
        await api.post(`/testes/projetos/${form.projeto_id}/ciclos`, form);
        toast.success("Ciclo criado!");
      }
      handleReset();
      loadData();
    } catch (error) {
      toast.error("Erro ao salvar ciclo.");
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/testes/ciclos/${itemToDelete.id}`);
      toast.success("Ciclo excluído.");
      loadData();
    } catch (e) {
      toast.error("Erro ao excluir.");
    } finally {
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const getProjetoName = (id) => projetos.find(p => p.id === id)?.nome || '-';

  return (
    <main className="container">
      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Excluir Ciclo?"
        message={`Deseja excluir "${itemToDelete?.nome}"?`}
        isDanger={true}
      />

      {view === 'form' && (
        <div style={{maxWidth: '800px', margin: '0 auto'}}>
          <form onSubmit={handleSubmit}>
            <section className="card form-section">
              <div className="form-header">
                 <h3 className="form-title">{editingId ? 'Editar Ciclo' : 'Novo Ciclo'}</h3>
              </div>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                  <div>
                    <label className="input-label">Projeto Pai <span className="required-asterisk">*</span></label>
                    <select 
                        value={form.projeto_id} onChange={e => setForm({...form, projeto_id: e.target.value})}
                        className="form-control bg-gray"
                        disabled={!!editingId} 
                    >
                       <option value="">Selecione um projeto...</option>
                       {projetos.filter(p => p.status === 'ativo').map(p => (
                           <option key={p.id} value={p.id}>{p.nome}</option>
                       ))}
                    </select>
                  </div>

                  <div>
                    <label className="input-label">Nome do Ciclo <span className="required-asterisk">*</span></label>
                    <input 
                       value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} 
                       className="form-control" placeholder="Ex: Sprint 24"
                    />
                  </div>
                  
                  <div className="form-grid">
                      <div>
                        <label className="input-label">Data Início</label>
                        <input type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} className="form-control" />
                      </div>
                      <div>
                        <label className="input-label">Data Fim</label>
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
               <h3 className="page-title">Ciclos de Teste</h3>
               <div className="toolbar-actions">
                   <div className="search-wrapper">
                        <input 
                            type="text" placeholder="Buscar ciclo..." value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        <span className="search-icon">🔍</span>
                   </div>
                   <button onClick={() => setView('form')} className="btn primary btn-new">Novo Ciclo</button>
               </div>
           </div>

           {loading ? <div className="loading-text">Carregando...</div> : (
             <div className="table-wrap">
               <table>
                 <thead>
                   <tr>
                     <th style={{width: '60px'}}>ID</th>
                     <th>Ciclo</th>
                     <th>Projeto</th>
                     <th style={{textAlign: 'center'}}>Status</th>
                     <th style={{textAlign: 'right'}}>Ações</th>
                   </tr>
                 </thead>
                 <tbody>
                   {ciclos.filter(c => c.nome.toLowerCase().includes(searchTerm.toLowerCase())).map(item => (
                     <tr key={item.id} className="selectable" onClick={() => handleEdit(item)}>
                         <td className="cell-id">#{item.id}</td>
                         <td className="cell-name">{item.nome}</td>
                         <td style={{color:'#64748b'}}>{getProjetoName(item.projeto_id)}</td>
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
             </div>
           )}
        </section>
      )}
    </main>
  );
}