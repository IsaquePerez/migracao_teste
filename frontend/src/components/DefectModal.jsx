import React, { useState } from 'react';
import { api } from '../services/api'; 
import { X, CheckCircle, ExternalLink, AlertTriangle, Calendar } from 'lucide-react';
import { useSnackbar } from '../context/SnackbarContext';
import { useAuth } from '../context/AuthContext';
import './DefectModal.css';

export function DefectModal({ executionGroup, onClose }) {
  if (!executionGroup) return null;

  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const { success, error } = useSnackbar();

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // --- Parser atualizado para ler Ação e Resultado Esperado ---
  const parseDefectInfo = (fullTitle) => {
    if (!fullTitle) return { cleanTitle: "", acao: null, esperado: null };

    // Tenta formato novo com separador: "Título (DetalhesPasso: Acao ||| Esperado)"
    const matchNew = fullTitle.match(/^(.*) \(DetalhesPasso: (.*) \|\|\| (.*)\)$/);
    if (matchNew) {
        return { 
            cleanTitle: matchNew[1], 
            acao: matchNew[2], 
            esperado: matchNew[3] 
        };
    }

    // Fallback para o formato antigo: "Título (Passo: Acao)"
    const matchOld = fullTitle.match(/^(.*) \(Passo: (.*)\)$/);
    if (matchOld) {
         return { cleanTitle: matchOld[1], acao: matchOld[2], esperado: null };
    }

    return { cleanTitle: fullTitle, acao: null, esperado: null };
  };

  const handleFixAll = async () => {
    if (!window.confirm("Isso marcará todos os defeitos como 'Corrigido' e enviará a execução para 'Reteste'. Confirmar?")) return;
    
    setProcessing(true);
    try {
      const promises = executionGroup.defeitos.map(def => 
        api.put(`/defeitos/${def.id}`, { 
          status: 'corrigido',
          titulo: def.titulo,
          descricao: def.descricao,
          severidade: def.severidade
        })
      );

      await Promise.all(promises);
      success("Todos os defeitos corrigidos! Tarefa enviada para Reteste.");
      onClose(true); 
    } catch (err) {
      console.error(err);
      error("Erro ao atualizar defeitos.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className="modal-content defect-group-modal" onClick={e => e.stopPropagation()}>
        
        <div className="modal-header">
          <div>
            <h3>Gestão de Falhas - Execução #{executionGroup.id}</h3>
            <span className="subtitle">
              {executionGroup.projeto_nome} &gt; {executionGroup.caso_teste_nome}
            </span>
          </div>
          <button className="close-btn" onClick={() => onClose(false)}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body scrollable">
          <div className="alert-info">           
            <p>
              O Runner <strong>{executionGroup.responsavel_teste_nome}</strong> reportou 
              <strong> {executionGroup.defeitos.length} problema(s)</strong> neste teste.
            </p>
          </div>

          <div className="defects-list">
            {executionGroup.defeitos.map((defect, index) => {
              // Extrai as informações
              const { cleanTitle, acao, esperado } = parseDefectInfo(defect.titulo);

              return (
                <div key={defect.id} className="defect-card">
                  
                  <div className="defect-card-header">
                    <div className="header-left-group">
                      <span className={`badge severity-${defect.severidade}`}>
                          {defect.severidade?.toUpperCase() || "MÉDIO"}
                      </span>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <h4 style={{ margin: 0 }}>#{index + 1} - {cleanTitle}</h4>
                        
                        {/* Exibição detalhada do passo e esperado */}
                        {acao && (
                           <div style={{ fontSize: '0.85em', color: '#555', display: 'flex', flexDirection: 'column' }}>
                              <span><strong>Ação:</strong> {acao}</span>
                              {esperado && (
                                <span><strong>Resultado Esperado:</strong> {esperado}</span>
                              )}
                           </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="header-right-group">
                      <span className="defect-timestamp" title="Data do reporte">
                          <Calendar size={12} style={{marginRight: '4px'}} />
                          {formatDateTime(defect.created_at)}
                      </span>
                      <span className={`status-tag status-${defect.status}`}>
                          {defect.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="defect-content">
                      <p className="defect-desc">{defect.descricao}</p>
                      
                      {defect.logs_erro && (
                          <div className="log-box">
                              <strong>Log/Erro:</strong>
                              <pre>{defect.logs_erro}</pre>
                          </div>
                      )}

                      {defect.evidencias && Array.isArray(defect.evidencias) && defect.evidencias.length > 0 && (
                      <div className="evidence-links">
                          <strong>Evidências Anexadas:</strong>
                          <div className="evidence-grid">
                          {defect.evidencias.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="evidence-pill">
                              <ExternalLink size={14} /> Ver Evidência {i + 1}
                              </a>
                          ))}
                          </div>
                      </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={() => onClose(false)} disabled={processing}>
            Analisar Depois
          </button>
          
          {user?.role !== 'user' && (
            <button 
                className="btn-success" 
                onClick={handleFixAll} 
                disabled={processing}
            >
                {processing ? 'Processando...' : 'Corrigir Tudo e Retestar'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}