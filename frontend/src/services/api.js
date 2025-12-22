// frontend/src/services/api.js

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export const getSession = () => ({
  token: sessionStorage.getItem("token"),
  username: sessionStorage.getItem("username"),
  role: sessionStorage.getItem("role"),
  nome: sessionStorage.getItem("nome"),
});

export const clearSession = () => {
  sessionStorage.clear();
  window.location.href = "/"; 
};

async function request(endpoint, options = {}) {
  const { token } = getSession();
  
  // Mescla headers passados (do Login.jsx) com os padrões
  const headers = new Headers(options.headers || {});
  
  if (token) headers.append("Authorization", `Bearer ${token}`);
  
  // --- CORREÇÃO DE OURO ---
  // Só adiciona application/json se NÃO for FormData nem URLSearchParams
  // e se o cabeçalho ainda não tiver sido definido manualmente.
  const isFormData = options.body instanceof FormData || options.body instanceof URLSearchParams;
  
  if (!headers.has("Content-Type") && !isFormData) {
    headers.append("Content-Type", "application/json");
  }

  const config = {
    ...options,
    headers,
  };

  const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  try {
    const response = await fetch(url, config);
    
    if (response.status === 401 || response.status === 403) {
      clearSession();
      throw new Error("Sessão expirada.");
    }

    // Tenta fazer parse do JSON, mas não falha se não houver corpo (ex: 204 No Content)
    // Se der erro no parse (como um erro HTML do servidor), retorna objeto vazio ou texto
    const data = response.status !== 204 
      ? await response.json().catch(() => ({})) 
      : {};
    
    if (!response.ok) {
        // Tenta pegar o detalhe do erro do FastAPI (geralmente data.detail)
        const errorMessage = data.detail 
            ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail))
            : (data.message || "Erro na requisição");
            
        throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

// --- CORREÇÃO NOS MÉTODOS DE ENVIO ---
// Agora aceitam 'options' extra e não convertem pra JSON se não precisar

export const api = {
  get: (endpoint, options = {}) => request(endpoint, { method: "GET", ...options }),
  
  post: (endpoint, body, options = {}) => {
    const isBinary = body instanceof FormData || body instanceof URLSearchParams;
    return request(endpoint, { 
        method: "POST", 
        body: isBinary ? body : JSON.stringify(body),
        ...options 
    });
  },
  
  put: (endpoint, body, options = {}) => {
    const isBinary = body instanceof FormData || body instanceof URLSearchParams;
    return request(endpoint, { 
        method: "PUT", 
        body: isBinary ? body : JSON.stringify(body),
        ...options 
    });
  },
  
  delete: (endpoint, body, options = {}) => {
      // Delete pode ter corpo opcional
      const isBinary = body instanceof FormData || body instanceof URLSearchParams;
      return request(endpoint, { 
          method: "DELETE", 
          body: body ? (isBinary ? body : JSON.stringify(body)) : null,
          ...options 
      });
  },
};