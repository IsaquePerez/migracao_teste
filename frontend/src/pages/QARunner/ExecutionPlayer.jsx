import styles from './styles.module.css';

export function ExecutionPlayer({ tasks, execution, onStart, onFinish, onStepAction, onUpload, onDeleteEvidence, onViewGallery }) {
  
  if (!tasks || tasks.length === 0) {
    return <div className={styles.emptyState}>Sem tarefas.</div>;
  }
  
  else if (!execution) {
    return <div className={styles.emptyState}>Selecione uma tarefa para iniciar</div>;
  }

  const steps = execution.passos_executados || [];
  const isComplete = steps.length > 0 && steps.every(p => p.status === 'aprovado' || p.status === 'reprovado');

  const passosSorted = [...(execution.passos_executados || [])].sort((a, b) => 
    (a.passo_template?.ordem || 0) - (b.passo_template?.ordem || 0)
  );

  return (
    <div className={styles.playerArea}>
      <div className={styles.playerCard}>
        
        <div className={styles.executionHeader}>
          <div>
            <h2 className={styles.executionTitle}>{execution.caso_teste.nome}</h2>
            <span className={styles.executionDesc}>{execution.caso_teste.descricao}</span>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            {execution.status_geral === 'pendente' && (
                <button 
                  onClick={onStart} 
                  className="btn primary" 
                  style={{ backgroundColor: '#10b981' }} 
                >
                  Iniciar Teste
                </button>
            )}

            {execution.status_geral === 'em_progresso' && (
                <button 
                  onClick={onFinish} 
                  className="btn primary"
                  disabled={!isComplete}
                  title={!isComplete ? "Resolva todos os passos para finalizar" : ""}
                >
                  Finalizar Teste
                </button>
            )}
          </div>
        </div>

        <div className={styles.stepsList}>
          {execution.status_geral === 'pendente' ? (
            <div className={styles.emptyState} style={{ padding: '40px' }}>
              Clique no botão <strong>"Iniciar Teste"</strong> acima para começar a registrar os passos.
            </div>
          ) : (
            passosSorted.length > 0 ? (
                passosSorted.map((p) => {
                   let evidenciasList = [];
                   try {
                       evidenciasList = p.evidencias ? (Array.isArray(p.evidencias) ? p.evidencias : JSON.parse(p.evidencias)) : [];
                   } catch (e) {
                       evidenciasList = [];
                   }

                   const template = p.passo_template || { acao: "Erro", resultado_esperado: "---", ordem: 0 };
                   
                   let statusClass = '';
                   if(p.status === 'aprovado') statusClass = styles.stepApproved;
                   if(p.status === 'reprovado') statusClass = styles.stepFailed;

                   return (
                       <div key={p.id} className={`${styles.stepItem} ${statusClass}`}>
                           <div className={styles.stepNumber}>#{template.ordem}</div>
                           
                           <div style={{ minWidth: 0 }}> 
                               <div className={styles.stepAction}>{template.acao}</div>
                               <div className={styles.stepExpected}><strong>Esperado:</strong> {template.resultado_esperado}</div>
                               
                               <div className={styles.evidenceArea}>
                                   {evidenciasList.length < 3 && (
                                       <label className={styles.btnUpload}><span>📷</span> Anexar
                                           <input 
                                               type="file" 
                                               alpha="image/*" 
                                               style={{ display: 'none' }} 
                                               onChange={(e) => onUpload(e, p.id)} 
                                           />
                                       </label>
                                   )}
                                   {evidenciasList.map((url, idx) => (
                                       <div key={idx} className={styles.evidenceChip}>
                                           <span 
                                               className={styles.evidenceLink} 
                                               onClick={() => onViewGallery(evidenciasList)}
                                           >
                                               Imagem {idx + 1}
                                           </span>
                                           <button 
                                               className={styles.deleteBtn} 
                                               onClick={(e) => { e.stopPropagation(); onDeleteEvidence(p.id, url); }}
                                           >
                                               ✕
                                           </button>
                                       </div>
                                   ))}
                               </div>
                           </div>

                           <div className={styles.stepActionsCol}>
                               <button 
                                 onClick={() => onStepAction(p.id, 'aprovado')} 
                                 className="btn btn-approve" 
                                 disabled={p.status === 'aprovado' || execution.status_geral !== 'em_progresso'} 
                                 style={{ opacity: p.status === 'aprovado' ? 0.5 : 1 }}
                               >
                                   {p.status === 'aprovado' ? 'Aprovado' : 'Aprovar'}
                               </button>
                               <button 
                                 onClick={() => onStepAction(p.id, 'reprovado')} 
                                 className="btn btn-reject" 
                                 disabled={p.status === 'reprovado' || execution.status_geral !== 'em_progresso'} 
                                 style={{ opacity: p.status === 'reprovado' ? 0.5 : 1 }}
                               >
                                   {p.status === 'reprovado' ? 'Falhou' : 'Falhar'}
                               </button>
                           </div>
                       </div>
                   );
                })
            ) : <div className={styles.emptyState}>Nenhum passo encontrado.</div>
          )}
        </div>
      </div>
    </div>
  );
}