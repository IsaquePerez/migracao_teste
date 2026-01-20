import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';
import { useAuth } from '../../context/AuthContext'; 
import { DefectModal } from '../../components/DefectModal'; 
import './styles.css';

export function QADefeitos() {
  const { user } = useAuth();

  // --- TRAVA DE SEGURANÇA VISUAL ---
  // Aguarda o AuthContext carregar o usuário antes de renderizar
  if (!user) {
      return <div className="loading-text" style={{marginTop: '50px'}}>Carregando sessão...</div>;
  }

  // --- LÓGICA DE PERMISSÃO CORRIGIDA (Baseada no seu JSON) ---
  // O backend retorna user.role = "admin" ou "user"
  const isAdmin = user.role === 'admin';
  
  // Se não for admin, assumimos que é runner (modo leitura)
  const isRunner = !isAdmin;

  // --- ESTADOS ---
  const [defeitos, setDefeitos] = useState([]);
  const [usuarios, setUsuarios] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState(null);
  
  const { error } = useSnackbar();

  // --- FILTROS ---
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);
  const [statusSearchText, setStatusSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const statusHeaderRef = useRef(null);
  const [sevSearchText, setSevSearchText] = useState('');
  const [selectedSev, setSelectedSev] = useState('');
  const [isSevOpen, setIsSevOpen] = useState(false);
  const sevHeaderRef = useRef(null);
  const [respSearchText, setRespSearchText] = useState('');
  const [selectedResp, setSelectedResp] = useState('');
  const [isRespOpen, setIsRespOpen] = useState(false);
  const respHeaderRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const truncate = (str, n = 30) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str || '';

  // --- EFEITOS ---
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setShowSuggestions(false);
      if (statusHeaderRef.current && !statusHeaderRef.current.contains(event.target)) {
        if (!selectedStatus) { setIsStatusOpen(false); setStatusSearchText(''); }
      }
      if (sevHeaderRef.current && !sevHeaderRef.current.contains(event.target)) {
        if (!selectedSev) { setIsSevOpen(false); setSevSearchText(''); }
      }
      if (respHeaderRef.current && !respHeaderRef.current.contains(event.target)) {
        if (!selectedResp) { setIsRespOpen(false); setRespSearchText(''); }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedStatus, selectedSev, selectedResp]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [defResponse, userResponse] = await Promise.all([
            api.get('/defeitos'),
            api.get('/usuarios/')
        ]);
        setDefeitos(Array.isArray(defResponse) ? defResponse : []);
        setUsuarios(Array.isArray(userResponse) ? userResponse : []);
      } catch (err) {
        error("Erro ao carregar dados.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedStatus, selectedSev, selectedResp]);

  const filteredDefeitos = defeitos.filter(d => {
    // FILTRO DE SEGURANÇA DO RUNNER
    // Se quiser que o Runner veja APENAS o que ele criou ou é responsável, descomente abaixo.
    // Nota: precisa garantir que 'd.responsavel_id' corresponda ao ID do usuário no JSON.
    /*
    if (isRunner) {
        // Exemplo: se o usuário só pode ver tickets onde ele é o responsável
        // if (String(d.responsavel_id) !== String(user.id)) return false;
    }
    */

    if (selectedStatus && d.status !== selectedStatus) return false;
    if (selectedSev && d.severidade !== selectedSev) return false;
    if (selectedResp && String(d.responsavel_id) !== String(selectedResp)) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const titulo = d.titulo || d.nome || '';
      const desc = d.descricao || '';
      const idStr = String(d.id);
      if (!titulo.toLowerCase().includes(term) && !desc.toLowerCase().includes(term) && !idStr.includes(term)) {
            return false;
      }
    }
    return true;
  });

  const globalSuggestions = searchTerm === '' ? filteredDefeitos.slice(0, 5) : filteredDefeitos.slice(0, 5);
  const totalPages = Math.ceil(filteredDefeitos.length / itemsPerPage);
  const currentDefeitos = filteredDefeitos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginate = (n) => setCurrentPage(n);

  const statusOptions = [{label: 'Aberto', value: 'aberto'}, {label: 'Corrigido', value: 'corrigido'}, {label: 'Fechado', value: 'fechado'}, {label: 'Rejeitado', value: 'rejeitado'}];
  const filteredStatusHeader = statusOptions.filter(o => o.label.toLowerCase().includes(statusSearchText.toLowerCase()));
  const sevOptions = [{label: 'Crítico', value: 'critico'}, {label: 'Alto', value: 'alto'}, {label: 'Médio', value: 'medio'}, {label: 'Baixo', value: 'baixo'}];
  const filteredSevHeader = sevOptions.filter(o => o.label.toLowerCase().includes(sevSearchText.toLowerCase()));
  const filteredRespHeader = usuarios.filter(u => u.nome.toLowerCase().includes(respSearchText.toLowerCase())).slice(0, 5);

  const getRespName = (id) => { const u = usuarios.find(user => String(user.id) == String(id)); return u ? u.nome : '-'; };
  const getStatusBadge = (s) => `badge-status-${s}`;
  const getSeveridadeBadge = (s) => `badge-sev-${s}`;

  const handleRowClick = (defeito) => setSelectedDefect(defeito);
  const handleCloseModal = () => setSelectedDefect(null);
  const handleDefectUpdated = async () => {
      const response = await api.get('/defeitos');
      setDefeitos(Array.isArray(response) ? response : []);
  };

  return (
    <main className="container">
      
      <DefectModal 
        isOpen={!!selectedDefect}
        onClose={handleCloseModal}
        defect={selectedDefect}
        onUpdate={handleDefectUpdated}
        readOnly={isRunner} 
      />

      <section className="card" style={{ marginTop: 0 }}>
        <div className="toolbar">
          <h3 className="page-title">{isRunner ? "Meus Defeitos" : "Gestão de Defeitos"}</h3>
          <div className="toolbar-actions">
            <div ref={wrapperRef} className="search-wrapper" style={{width: '300px'}}>
                <input type="text" placeholder="Buscar..." className="search-input" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} />
                <span className="search-icon">🔍</span>
                {showSuggestions && (<ul className="custom-dropdown">{globalSuggestions.length === 0 ? (<li style={{color:'#999'}}>Sem resultados.</li>) : (globalSuggestions.map(d => (<li key={d.id} onClick={() => { setSearchTerm(d.titulo || d.nome); setShowSuggestions(false); }}><div style={{display:'flex',justifyContent:'space-between'}}><span>{truncate(d.titulo || d.nome, 25)}</span><span style={{fontSize:'0.75rem',color:'#9ca3af'}}>#{d.id}</span></div></li>)))}</ul>)}
            </div>
          </div>
        </div>

        {loading ? <div className="loading-text">Carregando...</div> : (
            <div className="table-wrap">
                <div className="content-area">
                    <table>
                        <thead>
                            <tr>
                                <th style={{width: '50px'}}>ID</th>
                                <th style={{width: '35%'}}>Título / Descrição</th>
                                
                                <th style={{width: '15%', textAlign: 'center', verticalAlign: 'middle'}}>
                                    <div className="th-filter-container" ref={sevHeaderRef} style={{justifyContent: 'center'}}>
                                        {isSevOpen || selectedSev ? (
                                            <div style={{position: 'relative', width: '100%'}}>
                                                <input autoFocus type="text" className={`th-search-input ${selectedSev ? 'active' : ''}`} placeholder="Sev..." value={selectedSev && sevSearchText === '' ? selectedSev : sevSearchText} onChange={(e) => { setSevSearchText(e.target.value); if(selectedSev) setSelectedSev(''); }} onClick={(e) => e.stopPropagation()} />
                                                <button className="btn-clear-filter" onClick={(e) => { e.stopPropagation(); if(selectedSev){setSelectedSev('');setSevSearchText('')}else{setIsSevOpen(false);setSevSearchText('')} }}>✕</button>
                                                {(!selectedSev || sevSearchText) && <ul className="custom-dropdown" style={{width: '100%', top: '32px', left: 0}}><li onClick={() => { setSelectedSev(''); setSevSearchText(''); setIsSevOpen(false); }}><span style={{color:'#3b82f6'}}>Todos</span></li>{filteredSevHeader.map(o=><li key={o.value} onClick={()=>{setSelectedSev(o.value);setSevSearchText('');setIsSevOpen(true)}}>{o.label}</li>)}</ul>}
                                            </div>
                                        ) : <div className="th-label" onClick={() => setIsSevOpen(true)} title="Filtrar">SEVERIDADE <span className="filter-icon">▼</span></div>}
                                    </div>
                                </th>

                                <th style={{width: '15%', textAlign: 'center', verticalAlign: 'middle'}}>
                                    <div className="th-filter-container" ref={statusHeaderRef} style={{justifyContent: 'center'}}>
                                        {isStatusOpen || selectedStatus ? (
                                            <div style={{position: 'relative', width: '100%'}}>
                                                <input autoFocus type="text" className={`th-search-input ${selectedStatus ? 'active' : ''}`} placeholder="Status..." value={selectedStatus && statusSearchText === '' ? selectedStatus : statusSearchText} onChange={(e) => { setStatusSearchText(e.target.value); if(selectedStatus) setSelectedStatus(''); }} onClick={(e) => e.stopPropagation()} />
                                                <button className="btn-clear-filter" onClick={(e) => { e.stopPropagation(); if(selectedStatus){setSelectedStatus('');setStatusSearchText('')}else{setIsStatusOpen(false);setStatusSearchText('')} }}>✕</button>
                                                {(!selectedStatus || statusSearchText) && <ul className="custom-dropdown" style={{width: '100%', top: '32px', left: 0}}><li onClick={() => { setSelectedStatus(''); setStatusSearchText(''); setIsStatusOpen(false); }}><span style={{color:'#3b82f6'}}>Todos</span></li>{filteredStatusHeader.map(o=><li key={o.value} onClick={()=>{setSelectedStatus(o.value);setStatusSearchText('');setIsStatusOpen(true)}}>{o.label}</li>)}</ul>}
                                            </div>
                                        ) : <div className="th-label" onClick={() => setIsStatusOpen(true)} title="Filtrar">STATUS <span className="filter-icon">▼</span></div>}
                                    </div>
                                </th>

                                <th style={{width: '15%', verticalAlign: 'middle'}}>
                                    <div className="th-filter-container" ref={respHeaderRef}>
                                        {isRespOpen || selectedResp ? (
                                            <div style={{position: 'relative', width: '100%'}}>
                                                <input autoFocus type="text" className={`th-search-input ${selectedResp ? 'active' : ''}`} placeholder="Resp..." value={selectedResp && respSearchText === '' ? truncate(getRespName(selectedResp), 10) : respSearchText} onChange={(e) => { setRespSearchText(e.target.value); if(selectedResp) setSelectedResp(''); }} onClick={(e) => e.stopPropagation()} />
                                                <button className="btn-clear-filter" onClick={(e) => { e.stopPropagation(); if(selectedResp){setSelectedResp('');setRespSearchText('')}else{setIsRespOpen(false);setRespSearchText('')} }}>✕</button>
                                                {(!selectedResp || respSearchText) && <ul className="custom-dropdown" style={{width: '100%', top: '32px', left: 0}}><li onClick={() => { setSelectedResp(''); setRespSearchText(''); setIsRespOpen(false); }}><span style={{color:'#3b82f6'}}>Todos</span></li>{filteredRespHeader.map(u=><li key={u.id} onClick={()=>{setSelectedResp(String(u.id));setRespSearchText('');setIsRespOpen(true)}}>{truncate(u.nome,15)}</li>)}</ul>}
                                            </div>
                                        ) : <div className="th-label" onClick={() => setIsRespOpen(true)} title="Filtrar">RESPONSÁVEL <span className="filter-icon">▼</span></div>}
                                    </div>
                                </th>

                                <th style={{width: '10%', textAlign: 'right'}}>Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDefeitos.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="no-results" style={{textAlign: 'center', padding: '20px', color: '#64748b'}}>
                                        Nenhum defeito encontrado.
                                    </td>
                                </tr>
                            ) : (
                                currentDefeitos.map(d => (
                                    <tr key={d.id} onClick={() => handleRowClick(d)} className="selectable-row" title="Clique para ver detalhes">
                                        <td className="cell-id">#{d.id}</td>
                                        <td>
                                            <div className="cell-name">{truncate(d.titulo || d.nome, 40)}</div>
                                            <div style={{fontSize: '0.75rem', color: '#64748b'}}>{truncate(d.descricao, 50)}</div>
                                        </td>
                                        <td style={{textAlign: 'center'}}><span className={`badge ${getSeveridadeBadge(d.severidade)}`}>{d.severidade ? d.severidade.toUpperCase() : '-'}</span></td>
                                        <td style={{textAlign: 'center'}}><span className={`badge ${getStatusBadge(d.status)}`}>{d.status ? d.status.toUpperCase() : '-'}</span></td>
                                        <td><span className="cell-resp">{d.responsavel_id ? truncate(getRespName(d.responsavel_id), 15) : <span style={{color:'#cbd5e1'}}>-</span>}</span></td>
                                        <td style={{textAlign: 'right', fontSize: '0.85rem'}}>{new Date(d.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {filteredDefeitos.length > 0 && (
                    <div className="pagination-container">
                        <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="pagination-btn nav-btn">‹</button>
                        {Array.from({length: totalPages}, (_, i) => (
                            <button key={i+1} onClick={() => paginate(i+1)} className={`pagination-btn ${currentPage === i+1 ? 'active' : ''}`}>{i+1}</button>
                        )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
                        <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="pagination-btn nav-btn">›</button>
                    </div>
                )}
            </div>
        )}
      </section>
    </main>
  );
}