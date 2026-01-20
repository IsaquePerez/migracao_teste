import React, { useState } from 'react';
import { api } from '../services/api'; 
import './DefectModal.css';

export function DefectModal({ isOpen, onClose, defect, onUpdate, readOnly = false }) {
  if (!isOpen || !defect) return null;

  const [loading, setLoading] = useState(false);
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
  const [pendingDownload, setPendingDownload] = useState(null);

  // Formata data
  const formattedDate = defect.created_at 
    ? new Date(defect.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' })
    : '-';

  const forceDownload = async (url, filename) => {
    try {
      const response = await fetch(url, { method: 'GET', mode: 'cors', cache: 'no-cache' });
      if (!response.ok) throw new Error('Erro rede');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      alert("Erro ao baixar. Tente salvar manualmente.");
    }
  };

  const handleEvidenceClick = (e, url, index) => {
    e.preventDefault(); e.stopPropagation();
    setPendingDownload({ url, index });
    setShowDownloadConfirm(true);
  };

  const confirmDownload = () => {
    if (!pendingDownload) return;
    const { url, index } = pendingDownload;
    const ext = url.split('.').pop().split('?')[0] || 'jpg';
    const filename = `Evidencia_Defeito_${defect.id}_${index + 1}.${ext}`;
    forceDownload(url, filename);
    setShowDownloadConfirm(false);
    setPendingDownload(null);
  };

  const cancelDownload = () => { setShowDownloadConfirm(false); setPendingDownload(null); };

  const handleStatusChange = async (novoStatus) => {
    setLoading(true);
    try {
      await api.put(`/defeitos/${defect.id}`, { status: novoStatus });
      if (onUpdate) onUpdate(); 
      onClose(); 
    } catch (error) { alert("Erro ao atualizar."); } finally { setLoading(false); }
  };

  const evidencias = (() => {
    if (!defect.evidencias) return [];
    if (Array.isArray(defect.evidencias)) return defect.evidencias;
    try { return JSON.parse(defect.evidencias); } catch { return []; }
  })();

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* IMPORTANTE: O 'download-confirm-overlay' deve estar aqui fora ou 
          dentro, mas com z-index maior no CSS (ver arquivo abaixo) 
      */}
      
      {showDownloadConfirm && (
        <div className="download-confirm-overlay" onClick={cancelDownload}>
            <div className="download-confirm-box" onClick={e => e.stopPropagation()}>
                <h3>Baixar Arquivo?</h3>
                <p>O arquivo será salvo no seu computador.</p>
                <div className="confirm-actions">
                    <button className="btn-blue ghost" onClick={cancelDownload}>Cancelar</button>
                    <button className="btn-blue primary" onClick={confirmDownload}>Sim, Baixar</button>
                </div>
            </div>
        </div>
      )}

      <div className="modal-content defect-dashboard" onClick={e => e.stopPropagation()}>
        {/* --- HEADER --- */}
        <div className="defect-header">
          <div className="header-left">
            <span className={`badge-pill ${defect.severidade}`}>
              {defect.severidade?.toUpperCase() || "MÉDIO"}
            </span>
            <span className="defect-id">#{defect.id}</span>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {/* --- BODY --- */}
        <div className="defect-body">
          
          <div className="defect-main-info">
            <h1 className="defect-title">{defect.titulo || defect.nome || "Defeito sem título"}</h1>
            
            {/* GRID DE INFORMAÇÕES */}
            <div className="context-grid-container">
                <div className="info-grid">
                    <div className="info-item">
                        <span className="info-label">Caso de Teste</span>
                        <span className="info-value" title={defect.caso_teste_nome}>{defect.caso_teste_nome || "-"}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Passo do Teste</span>
                        <span className="info-value" >
                            {defect.passo_nome || defect.passo_falha || "N/A"}
                        </span>
                    </div>
                    
                    <div className="info-item">
                        <span className="info-label">Projeto</span>
                        <span className="info-value">{defect.projeto_nome || "-"}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Data Envio</span>
                        <span className="info-value">{formattedDate}</span>
                    </div>

                    <div className="info-item">
                        <span className="info-label">Tester (Runner)</span>
                        <span className="info-value">{defect.responsavel_teste_nome || "-"}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Gerente Projeto</span>
                        <span className="info-value">{defect.responsavel_projeto_nome || "-"}</span>
                    </div>
                </div>

                {(defect.passo_descricao || defect.passo_falha) && (
                    <div className="failure-step-card">
                        <div className="step-alert">                            
                            <div className="step-content">
                                <strong>Detalhe da Falha:</strong>
                                <p>{defect.passo_descricao || defect.passo_falha}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <span className="section-label">Descrição do Problema</span>
            <div className="description-text">{defect.descricao}</div>

            {defect.logs_erro && (
              <>
                <span className="section-label">Logs do Sistema</span>
                <div className="logs-box">
                  <pre>{defect.logs_erro}</pre>
                </div>
              </>
            )}
          </div>

          {/* SIDEBAR (ANEXOS) */}
          <div className="defect-sidebar">
            <div className="sidebar-title">Anexos ({evidencias.length})</div>
            <div className="files-list">
              {evidencias.length > 0 ? (
                evidencias.map((url, idx) => (
                  <div key={idx} className="file-card" onClick={(e) => handleEvidenceClick(e, url, idx)}>
                    <img src={url} className="file-thumb" alt="evidencia" />
                    <div className="file-meta">
                        <span className="file-name">Evidência {idx + 1}</span>
                        <span className="file-action">Clique para baixar</span>
                    </div>
                    <div className="download-icon">⬇</div>
                  </div>
                ))
              ) : (
                <div style={{color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem'}}>Nenhum anexo.</div>
              )}
            </div>
          </div>
        </div>

        {/* --- FOOTER --- */}
        {!readOnly ? (
            <div className="defect-footer">
              <div className="status-indicator">
                Status: <span className="status-badge-text">{defect.status?.toUpperCase()}</span>
              </div>
              
              <div className="actions-group">
                {defect.status === 'aberto' && (
                  <>
                    <button className="btn-blue ghost" onClick={() => handleStatusChange('rejeitado')} disabled={loading}>Rejeitar</button>
                    <button className="btn-blue primary" onClick={() => handleStatusChange('corrigido')} disabled={loading}>Enviar p/ Reteste</button>
                  </>
                )}
                {defect.status === 'corrigido' && (
                  <>
                    <button className="btn-blue secondary" onClick={() => handleStatusChange('aberto')}>Reprovar</button>
                    <button className="btn-blue primary" onClick={() => handleStatusChange('fechado')}>Aprovar & Fechar</button>
                  </>
                )}
                {(defect.status === 'fechado' || defect.status === 'rejeitado') && (
                    <span style={{color: '#10b981', fontWeight: '600'}}>Processo Finalizado.</span>
                )}
              </div>
            </div>
        ) : (
            <div className="defect-footer" style={{justifyContent: 'center', background: '#f8fafc'}}>
                <div className="status-indicator">Modo Visualização</div>
            </div>
        )}
      </div>
    </div>
  );
}