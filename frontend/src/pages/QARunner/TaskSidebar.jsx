import styles from './styles.module.css';

export function TaskSidebar({ tasks, loading, activeExecId, onSelect }) {
  if (loading) return <div className={styles.sidebar}>Carregando...</div>;
  
  if (!tasks || tasks.length === 0) {
    return <div className={`${styles.sidebar} muted`}>Sem tarefas.</div>;
  }

  const getStatusClass = (status) => {
    if (status === 'passou') return styles.statusPassed;
    if (status === 'falhou') return styles.statusFailed;
    if (status === 'em_progresso') return styles.statusInProgress;
    return '';
  };

  return (
    <div className={styles.sidebar}>
      {tasks.map(t => (
        <div 
          key={t.id} 
          onClick={() => onSelect(t)} 
          className={`${styles.taskCard} ${getStatusClass(t.status_geral)} ${activeExecId === t.id ? styles.active : ''}`}
        >
          <div className={styles.taskHeader}>
            <h4 className={styles.taskTitle}>{t.caso_teste?.nome}</h4>
            <span className={styles.taskBadge}>{t.status_geral}</span>
          </div>
          <small className={styles.taskProject}>Projeto: {t.ciclo_teste?.projeto_id || 'N/A'}</small>
        </div>
      ))}
    </div>
  );
}