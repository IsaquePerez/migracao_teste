import { useState, useEffect, useRef } from 'react';
import { api, getSession } from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import './styles.css';

export function QADefeitos() {
  const isAdmin = getSession().role === 'admin';
  const [defeitos, setDefeitos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [galleryImages, setGalleryImages] = useState(null);
  
  // --- ESTADOS DA BUSCA ---
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  const { success, error } = useSnackbar();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [defectToDelete, setDefectToDelete] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => { 
    loadDefeitos(); 
    
    const handleClickOutside = (event) => {
        if (!event.target.closest('.status-cell')) {
            setOpenMenuId(null);
        }
        if (searchRef.current && !searchRef.current.contains(event.target)) {
            setShowDropdown(false);
        }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const loadDefeitos = async () => {
    setLoading(true);
    try {
      const data = await api.get("/defeitos/");
      setDefeitos(Array.isArray(data) ? data : []);
    } catch (err) { 
        error("Erro ao carregar defeitos.");
    }
    finally { setLoading(false); }
  };

  const handleUpdateStatus = async (id, newStatus) => {    
    setOpenMenuId(null); 
    try {
        await api.put(`/defeitos/${id}`, { status: newStatus });        
        success(`Status atualizado para ${newStatus.toUpperCase()}`);
        loadDefeitos(); 
    } catch (e) { 
        error("Erro ao atualizar status."); 
    }
  };
  
  const requestDelete = (defeito) => {
      setDefectToDelete(defeito);
      setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
      if (!defectToDelete) return;
      try {
          await api.delete(`/defeitos/${defectToDelete.id}`);
          success(`Defeito excluído.`);
          loadDefeitos();
      } catch (err) {
          error("Erro ao excluir.");
      } finally {
          setDefectToDelete(null); 
      }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  const getSeveridadeColor = (sev) => {
      switch(sev) {
          case 'critico': return '#b91c1c'; 
          case 'alto': return '#ef4444'; 
          case 'medio': return '#f59e0b'; 
          default: return '#10b981'; 
      }
  };

  const parseEvidencias = (evidenciaString) => {
      if (!evidenciaString) return [];
      if (typeof evidenciaString === 'string' && evidenciaString.trim().startsWith('http') && !evidenciaString.trim().startsWith('[')) {
          return [evidenciaString];
      }
      try {
          const parsed = JSON.parse(evidenciaString);
          return Array.isArray(parsed) ? parsed : [evidenciaString];
      } catch (e) { return [evidenciaString]; }
  };

  const openGallery = (evidencias) => {
      const lista = parseEvidencias(evidencias);
      if (lista.length > 0) setGalleryImages(lista);
  };

  const toggleMenu = (id) => {
    if (!isAdmin) return;
    setOpenMenuId(openMenuId === id ? null : id);
  };

  // --- LÓGICA DE FILTRO E ORDENAÇÃO ---
  const filteredDefeitos = defeitos
    .filter(d => {
        const nomeTeste = d.execucao?.caso_teste?.nome || '';
        return nomeTeste.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => b.id - a.id);

  // --- DROPDOWN ---
  const dropdownOptions = searchTerm === '' 
    ? [...defeitos].sort((a, b) => b.id - a.id).slice(0, 5) 
    : filteredDefeitos.slice(0, 5);

  const truncate = (str, n = 35) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str || '';

  // --- PAGINAÇÃO ---
  const totalPages = Math.ceil(filteredDefeitos.length / itemsPerPage);
  
  if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;

  const currentDefeitos = filteredDefeitos.slice(indexOfFirstItem, indexOfLastItem);

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
        onConfirm={() => { confirmDelete(); setIsDeleteModalOpen(false); }}
        title="Excluir Defeito?"
        message={`Deseja excluir "${defectToDelete?.titulo || ''}"?`}
        confirmText="Sim, Excluir"
        isDanger={true}
      />
      
      <section className="card">
        <div className="toolbar" style={{ flexWrap: 'wrap', gap: '15px' }}>
            <h2 className="section-title">Gestão de Defeitos</h2>
            
            <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto', alignItems: 'center' }}>
                <button onClick={loadDefeitos} className="btn">Atualizar</button>
                <div className="separator"></div>
                
                <div className="search-wrapper" ref={searchRef} style={{ position: 'relative', width: '250px' }}>
                    <input 
                        type="text" 
                        placeholder="Buscar..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setShowDropdown(true)}
                        style={{
                            padding: '8px 0px 8px 8px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            width: '100%',
                            fontSize: '0.9rem',
                            outline: 'none'
                        }}
                    />
                    <span className="search-icon">🔍</span>
                    
                    {showDropdown && dropdownOptions.length > 0 && (
                        <ul className="dropdown-list" style={{
                            position: 'absolute', top: '100%', left: 0, right: 0,
                            backgroundColor: 'white', border: '1px solid #e2e8f0',
                            borderRadius: '6px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            zIndex: 1000, listStyle: 'none', margin: '5px 0 0 0',
                            padding: 0, maxHeight: '200px', overflowY: 'auto'
                        }}>
                            {dropdownOptions.map((d) => {
                                const nomeTeste = d.execucao?.caso_teste?.nome || 'Sem nome';
                                return (
                                    <li 
                                        key={d.id} 
                                        onClick={() => {
                                            setSearchTerm(nomeTeste);
                                            setShowDropdown(false);
                                        }}
                                        style={{
                                            padding: '10px 12px', cursor: 'pointer',
                                            borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem',
                                            color: '#334155', display: 'flex', justifyContent: 'space-between'
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f8fafc'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                    >
                                        <span>{truncate(nomeTeste, 25)}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>

        {loading ? <p>Carregando...</p> : (
          <div className="table-wrap">
            <div className="content-area">
                {filteredDefeitos.length === 0 ? (
                    <div style={{padding: '20px', textAlign: 'center', color: '#64748b'}}>
                        {searchTerm ? 'Nenhum teste encontrado com esse nome.' : 'Nenhum defeito registrado.'}
                    </div>
                ) : (
                <table style={{ borderCollapse: 'separate', borderSpacing: '0 5px' }}>
                    <thead>
                    <tr>
                        <th>ID</th>
                        <th>Origem</th>
                        <th>Erro</th>
                        <th>Evidências</th>
                        <th>Severidade</th>
                        <th>Status</th>
                        <th style={{textAlign: 'right'}}>Data</th>
                        <th style={{textAlign: 'right'}}>Ações</th>
                    </tr>
                    </thead>
                    <tbody>                    
                    {currentDefeitos.map(d => {
                        const temEvidencia = d.evidencias && parseEvidencias(d.evidencias).length > 0;
                        return (
                            <tr key={d.id}>
                                <td className="col-id">#{d.id}</td>
                                <td className="col-origin">
                                    <div><strong>{d.execucao?.caso_teste?.nome || 'Teste Removido'}</strong></div>
                                    <div>
                                        {!d.execucao?.responsavel ? (
                                            <span className="resp-badge resp-unknown">Desconhecido</span>
                                        ) : (
                                            <span className={`resp-badge ${d.execucao.responsavel.ativo ? 'resp-active' : 'resp-inactive'}`}>
                                                {d.execucao.responsavel.nome} {d.execucao.responsavel.ativo ? '' : '(Inativo)'}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="col-error">
                                    <strong>{d.titulo}</strong>
                                    <div className="desc" title={d.descricao}>{d.descricao}</div>
                                </td>
                                <td>
                                    {temEvidencia ? (
                                        <button onClick={() => openGallery(d.evidencias)} className="btn-view">Ver</button>
                                    ) : <span style={{color: '#cbd5e1'}}>-</span>}
                                </td>
                                <td>
                                    <span className="col-severity" style={{color: getSeveridadeColor(d.severidade)}}>
                                        {d.severidade}
                                    </span>
                                </td>                                
                                <td className="status-cell" style={{ position: 'relative' }}> 
                                    {isAdmin ? (                                 
                                            <>
                                                <button 
                                                    onClick={() => toggleMenu(d.id)}
                                                    className={`status-badge status-${d.status || 'aberto'} status-dropdown-btn`}
                                                >
                                                    {d.status} <span>▼</span>
                                                </button>
                                                {openMenuId === d.id && (
                                                    <div className="dropdown-menu">
                                                        {['aberto', 'em_teste', 'corrigido', 'fechado'].map(opt => (
                                                            <div 
                                                                key={opt}
                                                                onClick={() => handleUpdateStatus(d.id, opt)}
                                                                className={`dropdown-item ${d.status === opt ? 'active' : ''}`}
                                                            >
                                                                {opt.replace('_', ' ')}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                    ) : (                                         
                                            <span className={`status-badge status-${d.status || 'aberto'}`}>
                                                {d.status}
                                            </span>
                                    )}
                                </td>
                                <td className="col-date">{formatDate(d.created_at)}</td>
                                <td style={{textAlign: 'right'}}>
                                    <button onClick={(e) => { e.stopPropagation(); requestDelete(d); }} className="btn danger small">🗑️</button>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
                )}
            </div>

            {/* Paginação agora é exibida SEMPRE, sem condição if */}
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

      {galleryImages && (
          <div className="gallery-overlay" onClick={() => setGalleryImages(null)}>
              <div className="gallery-track">
                  {galleryImages.map((url, idx) => {
                      const filename = url.split('/').pop();
                      const downloadUrl = `http://localhost:8000/api/v1/testes/evidencias/download/${filename}`;
                      return (
                        <div key={idx} className="gallery-item">
                            <img src={url} alt={`Evidência ${idx+1}`} className="gallery-img" onClick={(e) => e.stopPropagation()} />
                            <div style={{ marginTop:'15px', display:'flex', alignItems:'center', justifyContent:'center', gap:'15px', color:'white' }}> 
                                <span style={{fontSize: '1.1rem'}}>Imagem {idx + 1}</span>
                                {isAdmin && (
                                    <a href={downloadUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} 
                                        style={{ textDecoration: 'none', background: 'white', color: '#333', padding: '5px 12px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
                                        title="Baixar esta evidência"
                                    >
                                        ⬇️ Baixar
                                    </a>
                                )}
                            </div>
                        </div>
                      );
                  })}
              </div>
              <button className="btn" style={{marginTop:'20px', background:'rgba(255,255,255,0.2)', color:'white', border:'1px solid white'}} onClick={() => setGalleryImages(null)}>
                  Fechar Galeria
              </button>
          </div>
      )}
    </main>
  );
}