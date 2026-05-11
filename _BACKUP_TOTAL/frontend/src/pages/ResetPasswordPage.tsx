import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { login } = useAuth();

  useEffect(() => {
    // Extrair token da URL (tanto query parameter quanto hash)
    const url = new URL(window.location.href);
    
    // Primeiro, tentar pegar do query parameter (?token=)
    const queryToken = url.searchParams.get("token");
    
    // Se não encontrar, tentar pegar do hash (#type=recovery&token=)
    let hashToken = null;
    if (!queryToken && url.hash) {
      const hashParam = url.hash.substring(1); // Remove o # do início
      const hashParams = new URLSearchParams(hashParam);
      const type = hashParams.get("type");
      if (type === "recovery") {
        hashToken = hashParams.get("token");
      }
    }
    
    const finalToken = queryToken || hashToken;
    
    if (finalToken) {
      setToken(finalToken);
    } else {
      // Se não encontrar token válido
      setMessage({
        text: "Link de recuperação inválido. Por favor, solicite um novo link.",
        type: "error"
      });
     }
   }, []);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8 || password.length > 12) {
      return "A senha deve ter entre 8 e 12 caracteres";
    }
    
    if (!/[A-Z]/.test(password)) {
      return "A senha deve conter pelo menos uma letra maiúscula";
    }
    
    if (!/[a-z]/.test(password)) {
      return "A senha deve conter pelo menos uma letra minúscula";
    }
    
    if (!/[0-9]/.test(password)) {
      return "A senha deve conter pelo menos um número";
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar senha
    const passwordError = validatePassword(password);
    if (passwordError) {
      setMessage({ text: passwordError, type: "error" });
      return;
    }
    
    // Verificar se as senhas coincidem
    if (password !== confirmPassword) {
      setMessage({ text: "As senhas não coincidem", type: "error" });
      return;
    }
    
    setLoading(true);
    
    try {
      // Atualizar a senha usando o token
      const { data } = await api.post("/auth/reset-password", { token, password });
      
      if (data.token) {
        await login(data.token, data.user);
      }
      
      setMessage({ 
        text: "Senha atualizada com sucesso! Você será redirecionado para a página inicial.", 
        type: "success" 
      });
      
      // Redirecionar para a página inicial após 3 segundos
      setTimeout(() => {
        navigate("/");
      }, 3000);
      
    } catch (error: any) {
      console.error("Erro ao atualizar senha:", error.message);
      setMessage({ 
        text: `Erro ao atualizar senha: ${error.message}`, 
        type: "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/90 backdrop-blur-xl rounded-2xl w-full max-w-md p-6 relative border border-gray-700/50 shadow-2xl">
        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-orbitron mb-1 flex items-center justify-center">
            <span className="text-transparent bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text font-bold">
              URBAN
            </span>
            <span className="mx-1 text-transparent bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text font-bold">
              CLASH
            </span>
            <span className="text-transparent bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text font-bold">
              TEAM
            </span>
          </h2>
          <p className="text-gray-400 text-sm">Redefinir sua senha</p>
        </div>

        {message && (
          <div 
            className={`${message.type === "success" ? "bg-green-100 border-green-400 text-green-700" : "bg-red-100 border-red-400 text-red-700"} px-4 py-3 rounded relative mb-4`} 
            role="alert"
          >
            <span className="block sm:inline">{message.text}</span>
          </div>
        )}

        {!token && message?.type !== "success" && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">Este link de recuperação de senha é inválido ou expirou. Por favor, solicite um novo link na página inicial.</span>
          </div>
        )}

        {token && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-2 text-white font-exo">Nova Senha</label>
              <input
                type="password"
                required
                className="w-full p-3 bg-gray-700 rounded-lg text-white border border-gray-600 focus:border-orange-500 focus:outline-none transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8-12 chars, maiúsculas+minúsculas+números"
                minLength={8}
                maxLength={12}
              />
            </div>
            
            <div>
              <label className="block mb-2 text-white font-exo">Confirmar Nova Senha</label>
              <input
                type="password"
                required
                className="w-full p-3 bg-gray-700 rounded-lg text-white border border-gray-600 focus:border-orange-500 focus:outline-none transition-colors"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme sua nova senha"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-orbitron py-3 rounded-lg transition-all hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-4"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Atualizando...
                </span>
              ) : (
                "Atualizar Senha"
              )}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <a href="/" className="text-orange-400 hover:text-orange-300 transition-colors">
            Voltar para a página inicial
          </a>
        </div>
      </div>
    </div>
  );
}