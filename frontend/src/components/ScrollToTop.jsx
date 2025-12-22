import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // 1. Tenta resetar o scroll da janela (padrão)
    window.scrollTo(0, 0);

    // 2. Tenta resetar o scroll do container interno (seu layout atual)
    // Precisamos garantir que sua div de conteúdo tenha este ID
    const mainContainer = document.getElementById('main-content-scroll');
    if (mainContainer) {
      mainContainer.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant' // Remove a animação para ser imediato
      });
    }
  }, [pathname]); // Dispara sempre que a rota mudar

  return null;
};

export default ScrollToTop;