import styles from './styles.module.css';

export function EvidenceGallery({ images, onClose }) {
  if (!images) return null;

  return (
    <div className={styles.galleryOverlay} onClick={onClose}>
      <div className={styles.galleryTrack}>
        {images.map((url, idx) => (
          <div key={idx} className={styles.galleryItem}>
            <img 
              src={url} 
              alt={`Evidência ${idx+1}`} 
              className={styles.galleryImg} 
              onClick={(e) => e.stopPropagation()} 
            />
            <div style={{marginTop:'15px', fontSize:'1.2rem'}}>Imagem {idx + 1}</div>
          </div>
        ))}
      </div>
      <button 
        className="btn" 
        style={{marginTop:'20px', background:'white', color:'black'}} 
        onClick={onClose}
      >
        Fechar Galeria
      </button>
    </div>
  );
}