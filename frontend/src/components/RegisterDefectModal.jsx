import React, { useState, useEffect } from 'react';
import './RegisterDefectModal.css';

export function RegisterDefectModal({ isOpen, onClose, onConfirm, initialData }) {
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    severidade: 'medio'
  });
  
  const [files, setFiles] = useState([]); // Novos arquivos para upload
  const [existingImages, setExistingImages] = useState([]); // URLs já salvas (modo edição)

  // --- EFEITO: CARREGAR DADOS NA EDIÇÃO ---
  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        titulo: initialData.titulo || '',
        descricao: initialData.descricao || '',
        severidade: initialData.severidade || 'medio'
      });
      
      // Se tiver evidências salvas (URLs), carrega elas
      let loadedImages = [];
      try {
        const ev = initialData.evidencias;
        loadedImages = typeof ev === 'string' ? JSON.parse(ev) : (ev || []);
      } catch { loadedImages = []; }
      setExistingImages(loadedImages);
      
    } else if (isOpen) {
      // Modo Novo: Limpa tudo
      setFormData({ titulo: '', descricao: '', severidade: 'medio' });
      setFiles([]);
      setExistingImages([]);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!formData.titulo || !formData.descricao) {
      alert("Por favor, preencha título e descrição.");
      return;
    }
    // Envia tudo: dados, novos arquivos E as imagens antigas que sobraram
    onConfirm({ ...formData, files, existingImages }); 
    
    // Limpa
    setFormData({ titulo: '', descricao: '', severidade: 'medio' });
    setFiles([]);
    setExistingImages([]);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const totalCount = files.length + existingImages.length + selectedFiles.length;
    
    if (totalCount > 3) {
        alert("Máximo de 3 evidências no total.");
        return;
    }
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="register-overlay" onClick={onClose}>
      <div className="register-box" onClick={e => e.stopPropagation()}>
        
        <div className="register-header">
          <h3 className="register-title">
            {initialData ? 'Editar Falha (Rascunho)' : 'Registrar Falha'}
          </h3>
          <button className="register-close" onClick={onClose}>&times;</button>
        </div>

        <div className="register-body">
          <div className="form-group">
            <label className="form-label">Título</label>
            <input 
              type="text" className="form-input" 
              value={formData.titulo}
              onChange={e => setFormData({...formData, titulo: e.target.value})}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Impacto</label>
            <select 
              className="form-select"
              value={formData.severidade}
              onChange={e => setFormData({...formData, severidade: e.target.value})}
            >
              <option value="baixo">🟢 Baixo</option>
              <option value="medio">🟡 Médio</option>
              <option value="alto">🟠 Alto</option>
              <option value="critico">🔴 Crítico</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Evidências (Máx: 3)</label>
            
            <div className="selected-files-list">
                {/* Imagens Já Salvas (Edição) */}
                {existingImages.map((url, index) => (
                    <div key={`existing-${index}`} className="file-item-badge" style={{borderColor: '#10b981', color: '#047857', background: '#ecfdf5'}}>
                        <span className="file-name-truncate">Imagem Salva {index + 1}</span>
                        <button onClick={() => removeExistingImage(index)} className="btn-remove-file">×</button>
                    </div>
                ))}

                {/* Novos Arquivos */}
                {files.map((file, index) => (
                    <div key={`new-${index}`} className="file-item-badge">
                        <span className="file-name-truncate">{file.name}</span>
                        <button onClick={() => removeFile(index)} className="btn-remove-file">×</button>
                    </div>
                ))}
            </div>

            {(files.length + existingImages.length) < 3 && (
                <div className="file-input-wrapper" onClick={() => document.getElementById('modal-file-upload').click()}>
                    <input 
                        id="modal-file-upload" type="file" hidden multiple accept="image/*"
                        onChange={handleFileChange}
                    />
                    <span className="file-input-text">Clique para anexar</span>
                </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Descrição</label>
            <textarea 
              className="form-textarea"
              value={formData.descricao}
              onChange={e => setFormData({...formData, descricao: e.target.value})}
            />
          </div>
        </div>

        <div className="register-footer">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-confirm" onClick={handleSubmit}>
            {initialData ? 'Salvar Alterações' : 'Confirmar Falha'}
          </button>
        </div>

      </div>
    </div>
  );
}