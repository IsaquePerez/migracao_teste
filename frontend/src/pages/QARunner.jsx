import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { DefectModal } from '../components/DefectModal';

/* ==========================================================================
   COMPONENTE: QA RUNNER (EXECUTOR DE TESTES)
   Refatorado para Clean Code e UX Moderno (Sonner + Modais)
   ========================================================================== */
export function QARunner() {
  const { user } = useAuth();
  
  // --- ESTADOS DE DADOS ---
  const [tarefas, setTarefas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeExecucao, setActiveExecucao] = useState(null);

  // --- ESTADOS DE INTERFACE & CONTROLE ---
  const [galleryImages, setGalleryImages] = useState(null);
  
  // Controle do Passo Falho (para abrir o modal de defeito)
  const [currentFailedStep, setCurrentFailedStep] = useState(null);
  const [isDefectModalOpen, setIsDefectModalOpen] = useState(false);

  // Controle Genérico do Modal de Confirmação
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDanger: false
  });

  /* ==========================================================================
     CARREGAMENTO INICIAL
     ========================================================================== */
  useEffect(() => { loadMinhasTarefas(); }, []);

  const loadMinhasTarefas = async () => {
    setLoading(true);
    try {
        const data = await api.get("/testes/minhas-tarefas");
        setTarefas(Array.isArray(data) ? data : []);
    } catch (e) { 
        console.error(e);
        toast.error("Não foi possível carregar suas tarefas.");
    } finally { 
        setLoading(false); 
    }
  };

  /* ==========================================================================
     LÓGICA DE SELEÇÃO E EXECUÇÃO
     ========================================================================== */
  const selectTask = async (t) => {
      if (activeExecucao?.id === t.id) return;
      
      try {
          const data = await api.get(`/testes/execucoes/${t.id}`);
          setActiveExecucao(data);
          
          // Inicia a execução automaticamente se estiver pendente
          if (data.status_geral === 'pendente') {
              await api.put(`/testes/execucoes/${t.id}/finalizar?status=em_progresso`);
              // Atualiza status localmente na lista lateral
              setTarefas(prev => prev.map(task => 
                task.id === t.id ? {...task, status_geral: 'em_progresso'} : task
              ));
              toast.info(`Iniciando execução: ${t.caso_teste?.nome}`);
          }
      } catch (e) { 
          toast.error("Erro ao carregar detalhes da execução.");
      }
  };

  const handleStepAction = (passoId, acao) => {
      if (acao === 'aprovado') {
          updatePasso(passoId, 'aprovado');
          toast.success("Passo aprovado.");
      } else {
          // Abre modal de defeito
          setCurrentFailedStep(passoId);
          setIsDefectModalOpen(true);
      }
  };

  const updatePasso = async (passoId, status) => {
      try {
          await api.put(`/testes/passos/${passoId}`, { status });
          
          const updatedPassos = activeExecucao.passos_executados.map(p => {
              if(p.id === passoId) return { ...p, status };
              return p;
          });
          setActiveExecucao(prev => ({ ...prev, passos_executados: updatedPassos }));
      } catch (error) {
          toast.error("Erro ao atualizar passo.");
      }
  };

  // --- FINALIZAÇÃO DO TESTE ---
  const requestFinishExecution = () => {
    const allPassed = activeExecucao.passos_executados.every(p => p.status === 'aprovado');
    const statusFinal = allPassed ? 'passou' : 'falhou';

    setConfirmModal({
        isOpen: true,
        title: "Finalizar Teste?",
        message: `O teste será finalizado como "${statusFinal.toUpperCase()}". Deseja continuar?`,
        isDanger: !allPassed,
        onConfirm: () => finishExecutionConfirm(statusFinal)
    });
  };

  const finishExecutionConfirm = async (statusFinal) => {
      try {
          await api.put(`/testes/execucoes/${activeExecucao.id}/finalizar?status=${statusFinal}`);
          setActiveExecucao(prev => ({ ...prev, status_geral: statusFinal }));
          toast.success(`Teste finalizado: ${statusFinal.toUpperCase()}`);
          loadMinhasTarefas(); 
      } catch (error) {
          toast.error("Erro ao finalizar execução.");
      }
  };

  /* ==========================================================================
     GERENCIAMENTO DE EVIDÊNCIAS (IMAGENS)
     ========================================================================== */
  const parseEvidencias = (evidenciaString) => {
      if (!evidenciaString) return [];
      try {
          const parsed = JSON.parse(evidenciaString);
          return Array.isArray(parsed) ? parsed : [evidenciaString];
      } catch (e) { return [evidenciaString]; }
  };

  const handleFileUpload = async (e, passoId) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      const promise = fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/testes/passos/${passoId}/evidencia`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
          body: formData
      }).then(async (res) => {
          if (!res.ok) throw await res.json();
          return res.json();
      });

      toast.promise(promise, {
          loading: 'Enviando evidência...',
          success: (data) => {
              const novaListaJSON = JSON.stringify(data.lista_completa || [data.url]); 
              const updatedPassos = activeExecucao.passos_executados.map(p => {
                  if(p.id === passoId) return { ...p, evidencias: novaListaJSON };
                  return p;
              });
              setActiveExecucao(prev => ({ ...prev, passos_executados: updatedPassos }));
              return 'Evidência anexada!';
          },
          error: (err) => `Erro no upload: ${err.detail || 'Falha desconhecida'}`
      });
  };

  // --- REMOÇÃO DE EVIDÊNCIA ---
  const requestDeleteEvidence = (passoId, urlToDelete) => {
      setConfirmModal({
          isOpen: true,
          title: "Remover Evidência?",
          message: "Esta ação não pode ser desfeita. A imagem será desvinculada.",
          isDanger: true,
          onConfirm: () => confirmDeleteEvidence(passoId, urlToDelete)
      });
  };

  const confirmDeleteEvidence = async (passoId, urlToDelete) => {
      try {
          const passo = activeExecucao.passos_executados.find(p => p.id === passoId);
          const listaAtual = parseEvidencias(passo.evidencias);
          const novaLista = listaAtual.filter(url => url !== urlToDelete);
          const novoJSON = JSON.stringify(novaLista);

          await api.put(`/testes/passos/${passoId}`, { evidencias: novoJSON });
          
          const updatedPassos = activeExecucao.passos_executados.map(p => {
              if(p.id === passoId) return { ...p, evidencias: novoJSON };
              return p;
          });
          setActiveExecucao(prev => ({ ...prev, passos_executados: updatedPassos }));
          
          if (galleryImages) setGalleryImages(null); // Fecha galeria se aberta
          toast.success("Evidência removida.");
      } catch (error) { 
          toast.error("Erro ao remover evidência."); 
      }
  };

  /* ==========================================================================
     GERENCIAMENTO DE DEFEITOS (CALLBACK DO MODAL)
     ========================================================================== */
  const handleDefectConfirm = async (defectData) => {
      try {
          const passoFalho = activeExecucao.passos_executados.find(p => p.id === currentFailedStep);
          // Usa evidências do passo se o defeito não tiver específicas (simplificação)
          let evidenciasFinais = defectData.evidencias;
          if (!evidenciasFinais && passoFalho && passoFalho.evidencias) {
              evidenciasFinais = passoFalho.evidencias;
          }

          await api.post("/defeitos/", { 
              ...defectData, 
              evidencias: evidenciasFinais, 
              status: 'aberto', 
              execucao_teste_id: activeExecucao.id 
          });

          await updatePasso(currentFailedStep, 'reprovado');
          toast.success("Defeito registrado e passo reprovado.");
          setIsDefectModalOpen(false);
      } catch (error) { 
          console.error(error);
          toast.error("Erro ao registrar defeito."); 
      }
  };

  // --- HELPERS VISUAIS ---
  const getCardColor = (status) => {
      switch(status) {
          case 'passou': return '#10b981';
          case 'falhou': return '#ef4444'; 
          case 'em_progresso': return '#3b82f6'; 
          default: return '#cbd5e1'; 
      }
  };

  return (
    <main className="container">
      {/* MODAIS GLOBAIS DA PÁGINA */}
      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isDanger={confirmModal.isDanger}
      />

      <DefectModal 
        isOpen={isDefectModalOpen}
        onClose={() => setIsDefectModalOpen(false)}
        onConfirm={handleDefectConfirm}
      />

      {/* TELA PRINCIPAL */}
      <h2 className="section-title">Minhas Tarefas</h2>
      
      <div className="qa-runner-grid">
          
          {/* COLUNA 1: LISTA DE TAREFAS */}
          <div style={{overflowY: 'auto', height: '100%', paddingRight: '5px'}}>
              {loading ? <p>A carregar...</p> : (
                  tarefas.length === 0 ? <div className="card muted">Você não tem tarefas atribuídas.</div> : (
                      tarefas.map(t => (
                          <div key={t.id} onClick={() => selectTask(t)} className="card" 
                            style={{
                                cursor: 'pointer', marginBottom: '15px', 
                                borderLeft: `5px solid ${getCardColor(t.status_geral)}`,
                                backgroundColor: activeExecucao?.id === t.id ? '#eff6ff' : 'white',
                                transition: 'all 0.2s'
                            }}>
                              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                                  <h4 style={{margin: '0 0 5px 0', color: '#1e293b'}}>{t.caso_teste?.nome}</h4>
                                  <span className="badge" style={{fontSize: '0.7rem', backgroundColor: '#f3f4f6', color: '#334155'}}>
                                      {t.status_geral.toUpperCase()}
                                  </span>
                              </div>
                              <small className="muted">Projeto: {t.ciclo_teste?.projeto_id || 'N/A'}</small>
                          </div>
                      ))
                  )
              )}
          </div>

          {/* COLUNA 2: PLAYER DE EXECUÇÃO */}
          <div style={{height: '100%', overflowY: 'auto'}}>
              {activeExecucao ? (
                  <div className="card" style={{minHeight: '100%'}}>
                      <div style={{borderBottom: '1px solid #f1f5f9', paddingBottom: '15px', marginBottom: '20px', display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                          <div>
                            <h2 style={{margin: '0 0 5px 0'}}>{activeExecucao.caso_teste.nome}</h2>
                            <span className="muted" style={{fontSize:'0.9rem'}}>{activeExecucao.caso_teste.descricao}</span>
                          </div>
                          
                          {activeExecucao.status_geral !== 'passou' && activeExecucao.status_geral !== 'falhou' && (
                             <button onClick={requestFinishExecution} className="btn primary">
                                Finalizar Teste
                             </button>
                          )}
                      </div>

                      <div className="steps-list">
                          {[...activeExecucao.passos_executados].sort((a,b) => a.passo_template.ordem - b.passo_template.ordem).map((p) => {
                              const evidenciasList = parseEvidencias(p.evidencias);
                              return (
                                  <div key={p.id} style={{
                                      display: 'grid', gridTemplateColumns: '40px 1fr 140px', 
                                      gap: '20px', padding: '20px', borderBottom: '1px solid #f1f5f9',
                                      backgroundColor: p.status === 'aprovado' ? '#f0fdf4' : (p.status === 'reprovado' ? '#fef2f2' : 'white'),
                                      borderRadius: '8px', marginBottom: '10px', transition: 'background-color 0.3s'
                                  }}>
                                      <div style={{fontWeight:'bold', color:'#001C42', fontSize: '1.2rem'}}>#{p.passo_template.ordem}</div>
                                      
                                      {/* DETALHES DO PASSO */}
                                      <div>
                                          <div style={{fontWeight:600, fontSize: '1.05rem', marginBottom:'5px'}}>{p.passo_template.acao}</div>
                                          <div style={{color:'#059669', fontSize:'0.95rem', marginBottom:'15px', padding:'8px', backgroundColor:'rgba(16, 185, 129, 0.1)', borderRadius:'6px'}}>
                                              <strong>Esperado:</strong> {p.passo_template.resultado_esperado}
                                          </div>
                                          
                                          {/* EVIDÊNCIAS */}
                                          <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center'}}>
                                              {evidenciasList.length < 3 && (
                                                  <label className="btn small" style={{backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px'}}>
                                                      <span>📷</span> Anexar
                                                      <input type="file" accept="image/*" style={{display:'none'}} onChange={(e) => handleFileUpload(e, p.id)} />
                                                  </label>
                                              )}
                                              {evidenciasList.map((url, idx) => (
                                                  <div key={idx} className="evidence-chip">
                                                      <span style={{cursor: 'pointer', textDecoration: 'underline'}} onClick={() => setGalleryImages(evidenciasList)}>Imagem {idx + 1}</span>
                                                      <button 
                                                        className="delete-btn" 
                                                        onClick={(e) => { e.stopPropagation(); requestDeleteEvidence(p.id, url); }}
                                                        title="Remover imagem"
                                                      >
                                                        ✕
                                                      </button>
                                                  </div>
                                              ))}
                                          </div>
                                      </div>

                                      {/* AÇÕES */}
                                      <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                          <button 
                                            onClick={() => handleStepAction(p.id, 'aprovado')} 
                                            className="btn btn-approve"
                                            disabled={p.status === 'aprovado'}
                                            style={{opacity: p.status === 'aprovado' ? 0.5 : 1}}
                                          >
                                            {p.status === 'aprovado' ? 'Aprovado' : 'Aprovar'}
                                          </button>
                                          
                                          <button 
                                            onClick={() => handleStepAction(p.id, 'reprovado')} 
                                            className="btn btn-reject"
                                            disabled={p.status === 'reprovado'}
                                            style={{opacity: p.status === 'reprovado' ? 0.5 : 1}}
                                          >
                                            {p.status === 'reprovado' ? 'Falhou' : 'Falhar'}
                                          </button>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              ) : (
                <div className="card muted" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '1.2rem' }}>
                    👈 Selecione uma tarefa para iniciar
                </div>
              )}
          </div>
      </div>

      {/* MODAL DE GALERIA (Full Screen) */}
      {galleryImages && (
          <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}} onClick={() => setGalleryImages(null)}>
              <div style={{display:'flex', gap:'20px', overflowX: 'auto', maxWidth: '90%', padding:'20px', scrollSnapType: 'x mandatory'}}>
                  {galleryImages.map((url, idx) => (
                      <div key={idx} style={{textAlign:'center', color:'white', minWidth: '100%', scrollSnapAlign: 'center'}}>
                          <img src={url} alt={`Evidência ${idx+1}`} style={{maxHeight: '80vh', maxWidth:'100%', border: '2px solid white', borderRadius: '8px'}} onClick={(e) => e.stopPropagation()} />
                          <div style={{marginTop:'15px', fontSize:'1.2rem'}}>Imagem {idx + 1} de {galleryImages.length}</div>
                      </div>
                  ))}
              </div>
              <button className="btn" style={{marginTop:'20px', background:'white', color:'black', fontWeight:'bold'}} onClick={() => setGalleryImages(null)}>Fechar Galeria</button>
          </div>
      )}
    </main>
  );
}