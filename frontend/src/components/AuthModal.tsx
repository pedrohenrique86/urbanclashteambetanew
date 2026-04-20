import React from "react";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useUserProfileContext } from "../contexts/UserProfileContext";
import { startGoogleLoginFlow } from '../services/authService';

type AuthMode = "login" | "register" | "forgot-password";

interface Country {
  code: string;
  name: string;
  flag?: string; // Opcional, mantido para compatibilidade
}

// Lista de países em ordem alfabética pelo nome em português
const countries: Country[] = [
  { code: "ZA", name: "África do Sul" },
  { code: "DE", name: "Alemanha" },
  { code: "AR", name: "Argentina" },
  { code: "AU", name: "Austrália" },
  { code: "AT", name: "Áustria" },
  { code: "BE", name: "Bélgica" },
  { code: "BR", name: "Brasil" },
  { code: "BG", name: "Bulgária" },
  { code: "CA", name: "Canadá" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colômbia" },
  { code: "KR", name: "Coreia do Sul" },
  { code: "CR", name: "Costa Rica" },
  { code: "HR", name: "Croácia" },
  { code: "DK", name: "Dinamarca" },
  { code: "EG", name: "Egito" },
  { code: "SV", name: "El Salvador" },
  { code: "EC", name: "Equador" },
  { code: "SK", name: "Eslováquia" },
  { code: "SI", name: "Eslovênia" },
  { code: "ES", name: "Espanha" },
  { code: "US", name: "Estados Unidos" },
  { code: "EE", name: "Estônia" },
  { code: "PH", name: "Filipinas" },
  { code: "FI", name: "Finlândia" },
  { code: "FR", name: "França" },
  { code: "GR", name: "Grécia" },
  { code: "GT", name: "Guatemala" },
  { code: "NL", name: "Holanda" },
  { code: "HN", name: "Honduras" },
  { code: "HU", name: "Hungria" },
  { code: "IN", name: "Índia" },
  { code: "ID", name: "Indonésia" },
  { code: "IE", name: "Irlanda" },
  { code: "IS", name: "Islândia" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Itália" },
  { code: "JP", name: "Japão" },
  { code: "LV", name: "Letônia" },
  { code: "LT", name: "Lituânia" },
  { code: "LU", name: "Luxemburgo" },
  { code: "MY", name: "Malásia" },
  { code: "MT", name: "Malta" },
  { code: "MX", name: "México" },
  { code: "NI", name: "Nicarágua" },
  { code: "NO", name: "Noruega" },
  { code: "NZ", name: "Nova Zelândia" },
  { code: "PA", name: "Panamá" },
  { code: "PY", name: "Paraguai" },
  { code: "PE", name: "Peru" },
  { code: "PL", name: "Polônia" },
  { code: "PT", name: "Portugal" },
  { code: "GB", name: "Reino Unido" },
  { code: "CZ", name: "República Tcheca" },
  { code: "RO", name: "Romênia" },
  { code: "RU", name: "Rússia" },
  { code: "SG", name: "Singapura" },
  { code: "SE", name: "Suécia" },
  { code: "CH", name: "Suíça" },
  { code: "TH", name: "Tailândia" },
  { code: "TR", name: "Turquia" },
  { code: "UA", name: "Ucrânia" },
  { code: "UY", name: "Uruguai" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnã" },
];

interface AuthModalProps {
  onClose: () => void;
  initialMode?: "login" | "register";
}

export default function AuthModal({
  onClose,
  initialMode = "login",
}: AuthModalProps) {
  const { refreshProfile } = useUserProfileContext();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AuthMode>(
    initialMode === "register" ? "register" : "login",
  );
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    confirmEmail: "",
    password: "",
    confirmPassword: "",
    birthDate: "",
    country: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Fechar o dropdown quando clicar fora dele
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCountryDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");
    if (error === "google_user_not_found") {
      setErrors({
        form: "Usuário não encontrado. Por favor, registre-se primeiro.",
      });
    }
  }, []);

  const tabs = [
    { id: "login", label: "Login" },
    { id: "register", label: "Registrar" },
    { id: "forgot-password", label: "Recuperar Senha" },
  ];

  const googleEnabled =
    (import.meta.env?.VITE_GOOGLE_OAUTH_ENABLED ?? "true") !== "false";

  const handleGoogleLogin = async (intent: "login" | "register") => {
    // Chama a função centralizada, passando a intenção e o país (se disponível)
    await startGoogleLoginFlow(intent, formData.country);
  };

  // Função para validar palavrões (simulação de API)
  const checkProfanity = async (username: string): Promise<boolean> => {
    // Simulação de API anti-palavrões
    const profanityWords = ["admin", "test", "fuck", "shit", "damn", "bitch"];
    return profanityWords.some((word) => username.toLowerCase().includes(word));
  };

  // Função para verificar se um email existe e está confirmado usando o apiClient
  const checkEmailExists = async (
    email: string,
  ): Promise<{ exists: boolean; confirmed: boolean }> => {
    try {
      // Aguardar um pouco antes de verificar para evitar verificações prematuras
      await new Promise((resolve) => setTimeout(resolve, 500));

      const { data } = await api.post("/auth/check-email", { email });
      return data;
    } catch (error) {
      // Em caso de erro (ex: falha de rede), não assumimos que o usuário existe.
      // Retornamos que o email não existe para forçar o usuário a se registrar ou tentar novamente.
      console.error("Erro ao verificar email:", error);
      return { exists: false, confirmed: false };
    }
  };

  const validateForm = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};
    setIsValidating(true);

    // Validação do nome de usuário
    if (formData.username.length < 4 || formData.username.length > 10) {
      newErrors.username = "Nome de usuário deve ter entre 4-10 caracteres";
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username =
        "Nome de usuário deve conter apenas letras, números e _";
    } else {
      const hasProfanity = await checkProfanity(formData.username);
      if (hasProfanity) {
        newErrors.username = "Nome de usuário contém palavras inadequadas";
      }
    }

    // Validação do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = "Email inválido";
    }

    // Validação da confirmação de email
    if (formData.email !== formData.confirmEmail) {
      newErrors.confirmEmail = "Emails não coincidem";
    }

    // Validação da senha
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,12}$/;
    if (!passwordRegex.test(formData.password)) {
      newErrors.password =
        "Senha deve ter 8-12 chars, maiúsculas, minúsculas e números";
    }

    // Validação da confirmação de senha
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Senhas não coincidem";
    }

    // Validação da data de nascimento
    if (formData.birthDate) {
      const birthYear = new Date(formData.birthDate).getFullYear();
      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;
      if (age < 18) {
        newErrors.birthDate = "Você deve ser maior de 18 anos";
      }
    } else {
      newErrors.birthDate = "Data de nascimento é obrigatória";
    }

    // Validação do país
    if (!formData.country) {
      newErrors.country = "Selecione seu país";
    }

    setErrors(newErrors);
    setIsValidating(false);
    return Object.keys(newErrors).length === 0;
  };

  const [successMessage, setSuccessMessage] = useState("");
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [authMethodError, setAuthMethodError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [showRegisterOption, setShowRegisterOption] = useState(false);
  const [showForgotPasswordOption, setShowForgotPasswordOption] =
    useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Função para reenviar o email de confirmação
  const handleResendConfirmation = async () => {
    // Evita múltiplos cliques durante o cooldown ou processamento
    if (isResending || resendCooldown > 0) return;

    setIsResending(true);

    try {
      await api.post("/auth/resend-confirmation", { email: registeredEmail });

      // Limpar mensagens de erro ao reenviar com sucesso
      setErrors({});
      setSuccessMessage(
        "Email de confirmação reenviado com sucesso! Verifique sua caixa de entrada e spam.",
      );

      // Inicia o cooldown de 60 segundos (1 minuto)
      setResendCooldown(60);
    } catch (error: unknown) {
      let errorMessage = "Ocorreu um erro desconhecido.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Se for erro de rate limiting (429), extrair o tempo restante
      if (
        errorMessage.includes("Aguarde") &&
        errorMessage.includes("segundos")
      ) {
        const match = errorMessage.match(/(\d+) segundos/);
        if (match) {
          const remainingTime = parseInt(match[1]);
          setResendCooldown(remainingTime);
        }
      }

      setErrors({ form: `Erro ao reenviar confirmação: ${errorMessage}` });
    } finally {
      setIsResending(false);
    }
  };

  // Efeito para gerenciar o contador de cooldown e limpar quando o componente for desmontado
  useEffect(() => {
    let countdownInterval: ReturnType<typeof setInterval> | null = null;

    // Se houver um cooldown ativo, iniciar o contador
    if (resendCooldown > 0) {
      countdownInterval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            if (countdownInterval) clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // Cleanup quando o componente for desmontado
    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
      setResendCooldown(0);
    };
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Impedir múltiplos cliques definindo isProcessing como true imediatamente
    setIsProcessing(true);

    setSuccessMessage("");
    setShowResendConfirmation(false);
    setShowRegisterOption(false); // Resetar opção de registro
    setShowForgotPasswordOption(false); // Resetar opção de esqueci a senha
    setAuthMethodError(null);
    setErrors({});

    if (activeTab === "register") {
      try {
        const isValid = await validateForm();
        if (isValid) {
          const { data: authData } = await api.post("/auth/register", {
            email: formData.email,
            username: formData.username,
            password: formData.password,
            birth_date: formData.birthDate || undefined,
            country: formData.country || undefined,
          });

          // O perfil será criado automaticamente pelo trigger do banco de dados
          // quando o usuário selecionar sua facção na próxima página
          if (authData.user) {
            // Opcional: pode-se adicionar um log de backend aqui se necessário
          }

          // Armazenar o email registrado para exibir na tela de sucesso
          setRegisteredEmail(formData.email);

          // Ativar a tela de sucesso
          setRegistrationSuccess(true);

          // Limpar o formulário
          setFormData({
            username: "",
            email: "",
            confirmEmail: "",
            password: "",
            confirmPassword: "",
            birthDate: "",
            country: "",
          });
        }
      } catch (error: unknown) {
        let message = "Ocorreu um erro durante o registro.";
        if (error instanceof Error) {
          // Tratamento específico para erro de e-mail já cadastrado (409 Conflict)
          if ((error as any).response?.status === 409) {
            const responseData = (error as any).response?.data;
            message = responseData?.message || "Este e-mail já está em uso.";
          } else {
            message = error.message;
          }
        }
        setErrors({ form: message });
      } finally {
        setIsProcessing(false); // Sempre finalizar o processamento, mesmo em caso de erro
      }
    } else if (activeTab === "login") {
      try {
        // Verificar se o email existe e está confirmado antes de tentar fazer login
        const { exists, confirmed } = await checkEmailExists(formData.email);

        if (!exists) {
          // Email não cadastrado - mostrar mensagem clara e opção de registro
          setErrors({
            form: "Este email não foi encontrado no banco de dados. Você precisa fazer cadastro primeiro para poder jogar.",
          });
          // Armazenar o email para facilitar o registro
          setRegisteredEmail(formData.email);
          // Mostrar opção de registro
          setShowRegisterOption(true);
          setIsProcessing(false);
          return;
        }

        if (!confirmed) {
          // Email cadastrado mas não confirmado - mostrar mensagem e opção de reenvio
          setErrors({
            form: "Você fez cadastro mas ainda não confirmou seu email. É necessário confirmar o email para fazer login.",
          });
          // Armazenar o email não confirmado para possível reenvio
          setRegisteredEmail(formData.email);
          // Mostrar opção de reenvio
          setShowResendConfirmation(true);
          setIsProcessing(false);
          return;
        }

        // Se o email existe e está confirmado, tentar fazer login
        const { data: authData } = await api.post("/auth/login", {
          email: formData.email,
          password: formData.password,
        });

        if (authData.user) {
          try {
            // Se o userData não veio completo na resposta do Login, buscamos no /me
            let userData = authData.user;
            if (!userData) {
              const { data: meData } = await api.get("/auth/me");
              userData = meData.user;
            }

            // Registra token e usuario: UserProfileContext reage via useEffect
            await login(authData.token, userData);

            // Apenas fecha o modal. O ProtectedRoute cuidará do redirecionamento.
            onClose();
            
            // Navega para o dashboard. O ProtectedRoute irá interceptar e decidir o destino final.
            navigate("/dashboard", { replace: true });
          } catch (authError) {
            console.error("Erro durante o processo de autenticação/redirecionamento:", authError);
            navigate("/dashboard", { replace: true });
          }
        }
      } catch (error: any) {
        // DEBUG: Logar o objeto de erro completo para diagnóstico

        // Se for um erro 409, é um erro de método de autenticação (ex: usuário do Google tentando login com senha)
        if (error.response?.status === 409) {
          setAuthMethodError(
            error.response.data.message ||
              "Conflito de método de autenticação.",
          );
        } else {
          // Para outros erros (401-credenciais inválidas, 500), use o estado de erro geral
          const errorType = error.response?.data?.error;
          const message =
            error.response?.data?.message ||
            error.message ||
            "Ocorreu um erro durante o login.";

          setErrors({ form: message });

          // Se o erro for senha incorreta, mostrar opção de recuperar
          if (errorType === "Senha incorreta, você pode recuperar sua senha!") {
            setShowForgotPasswordOption(true);
            setRegisteredEmail(formData.email);
          }
        }
        setIsProcessing(false);
      }
    } else if (activeTab === "forgot-password") {
      try {
        // Verificar se o email existe e está confirmado antes de enviar o email de recuperação
        const { exists, confirmed } = await checkEmailExists(formData.email);

        if (!exists) {
          // Email não cadastrado - mostrar mensagem clara e opção de registro
          setErrors({
            form: "Este email não foi encontrado no banco de dados. Você precisa fazer cadastro primeiro para poder recuperar senha.",
          });
          // Armazenar o email para facilitar o registro
          setRegisteredEmail(formData.email);
          // Mostrar opção de registro
          setShowRegisterOption(true);
          setIsProcessing(false);
          return;
        }

        if (!confirmed) {
          // Email cadastrado mas não confirmado - mostrar mensagem e opção de reenvio
          setErrors({
            form: "Você tem cadastro mas ainda não confirmou seu email. É necessário confirmar o email antes de recuperar a senha.",
          });
          // Armazenar o email não confirmado para possível reenvio
          setRegisteredEmail(formData.email);
          // Mostrar opção de reenvio
          setShowResendConfirmation(true);
          setIsProcessing(false);
          return;
        }

        // Se o email existe e está confirmado, enviar o email de recuperação
        await api.post("/auth/forgot-password", { email: formData.email });

        // Só exibe a mensagem de sucesso se o email existir, estiver confirmado e o email de recuperação for enviado com sucesso
        setSuccessMessage(
          "Enviamos um email com instruções para redefinir sua senha. Por favor, verifique sua caixa de entrada ou spam, ATENÇÃO você receberá o e-mail se já tiver sido cadastrado!",
        );
        setIsProcessing(false); // Finalizar processamento após sucesso
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Ocorreu um erro durante a recuperação de senha.";
        setErrors({ form: message });
        setIsProcessing(false); // Finalizar processamento em caso de erro
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 pt-[120px] sm:pt-[60px] z-50 overflow-hidden"
      onClick={onClose}
    >
      {registrationSuccess ? (
        <div
          className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl w-full max-w-2xl p-4 sm:p-6 md:p-8 relative border border-gray-700 shadow-2xl text-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Botão de fechar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors duration-200 z-10"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Ícone de sucesso */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg
                className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          {/* Título */}
          <h2 className="text-xl sm:text-2xl md:text-3xl font-orbitron mb-2 sm:mb-3 md:mb-4 text-transparent bg-gradient-to-r from-green-400 to-green-600 bg-clip-text font-bold">
            CADASTRO REALIZADO!
          </h2>

          {/* Mensagem */}
          <div className="mb-8 space-y-4">
            <p className="text-white text-base sm:text-lg font-exo">
              Seu cadastro foi efetuado com sucesso!
            </p>
            <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600 inline-block">
              <p className="text-gray-300 mb-2">
                Enviamos um email de confirmação para:
              </p>
              <p className="text-orange-400 font-semibold">{registeredEmail}</p>
            </div>
            <p className="text-gray-300">
              Por favor, verifique sua caixa de entrada e clique no link de
              confirmação.
            </p>
            <p className="text-gray-300">
              Após confirmar, você será direcionado para escolher sua facção
              antes de acessar o dashboard.
            </p>
          </div>

          {/* Botão de fechar */}
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-orbitron py-2 sm:py-3 text-sm sm:text-base rounded-lg transition-all hover:scale-105 shadow-lg"
          >
            ENTENDIDO
          </button>
        </div>
      ) : (
        <div
          className="bg-zinc-950/90 backdrop-blur-xl rounded-xl w-full max-w-xl p-4 sm:p-5 pt-10 sm:pt-12 relative border border-white/10 shadow-[0_0_50px_rgba(255,100,0,0.1)] max-h-[calc(100vh-140px)] sm:max-h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Tech Decorative Corners */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-orange-500/50 rounded-tl-xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-orange-500/50 rounded-br-xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-orange-500 transition-all duration-300 z-10 bg-white/5 hover:bg-orange-500/10 p-1.5 rounded-md"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div className="flex gap-1 mb-4 p-1 bg-black/50 border border-white/5 rounded-lg relative z-10 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as AuthMode);
                  setErrors({});
                  setSuccessMessage("");
                  setShowResendConfirmation(false);
                  setShowRegisterOption(false);
                  setShowForgotPasswordOption(false);
                  setAuthMethodError(null);
                }}
                className={`flex-1 min-w-[100px] px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-md font-orbitron text-[9px] sm:text-[11px] font-black tracking-widest uppercase transition-all duration-300
                ${
                  activeTab === tab.id
                    ? "bg-gradient-to-b from-orange-500/20 to-orange-600/5 border border-orange-500/50 text-orange-400 shadow-[inset_0_1px_10px_rgba(255,100,0,0.2)]"
                    : "bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mensagem de sucesso */}
            {successMessage && (
              <div
                className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4"
                role="alert"
              >
                <span className="block sm:inline">{successMessage}</span>
              </div>
            )}

            {/* Mensagem de Erro de Método de Autenticação (Google vs Manual) */}
            {authMethodError && (
              <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-4">
                <span className="block sm:inline font-medium">
                  {authMethodError}
                </span>
                <p className="text-sm mt-2">
                  Você pode{" "}
                  <button
                    type="button"
                    onClick={() => handleGoogleLogin("login")}
                    className="text-blue-600 hover:text-blue-800 underline font-bold"
                  >
                    entrar com o Google
                  </button>{" "}
                  ou, se preferir,{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethodError(null);
                      setActiveTab("forgot-password");
                    }}
                    className="text-blue-600 hover:text-blue-800 underline font-bold"
                  >
                    definir uma senha
                  </button>{" "}
                  para sua conta.
                </p>
              </div>
            )}

            {/* Erro geral do formulário */}
            {errors.form && (
              <div
                className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
                role="alert"
              >
                <span className="block sm:inline">{errors.form}</span>

                {/* Opção de reenvio de confirmação para emails não confirmados */}
                {showResendConfirmation && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 mb-3 font-medium">
                      Não recebeu o email de confirmação?
                    </p>
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      disabled={isResending || resendCooldown > 0}
                      className={`w-full font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors ${
                        isResending || resendCooldown > 0
                          ? "bg-gray-400 cursor-not-allowed text-gray-600"
                          : "bg-orange-600 hover:bg-orange-700 text-white"
                      }`}
                    >
                      {isResending
                        ? "Reenviando email..."
                        : resendCooldown > 0
                          ? `Aguarde ${resendCooldown}s para reenviar`
                          : "Reenviar email de confirmação"}
                    </button>

                    {/* Barra de progresso do cooldown */}
                    {resendCooldown > 0 && (
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-orange-500 h-2 rounded-full transition-all duration-1000"
                            style={{
                              width: `${((60 - resendCooldown) / 60) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-center">
                          {resendCooldown}s restantes
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-gray-600 mt-3 text-center">
                      Email será reenviado para:{" "}
                      <span className="font-medium text-orange-600">
                        {registeredEmail}
                      </span>
                    </p>
                  </div>
                )}

                {/* Opção de registro para emails não cadastrados */}
                {showRegisterOption && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-700 mb-3 font-medium">
                      Email não encontrado no sistema. Deseja criar uma conta?
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("register");
                        // Preencher o email no formulário de registro
                        setFormData((prev) => ({
                          ...prev,
                          email: registeredEmail,
                          confirmEmail: registeredEmail,
                        }));
                        setErrors({});
                        setShowRegisterOption(false);
                        setSuccessMessage("");
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
                    >
                      Criar nova conta
                    </button>
                    <p className="text-xs text-gray-600 mt-3 text-center">
                      Nova conta será criada com:{" "}
                      <span className="font-medium text-green-600">
                        {registeredEmail}
                      </span>
                    </p>
                  </div>
                )}

                {/* Opção de recuperar senha para senhas incorretas */}
                {showForgotPasswordOption && (
                  <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-orange-700 mb-3 font-medium">
                      Esqueceu sua senha?
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("forgot-password");
                        setErrors({});
                        setShowForgotPasswordOption(false);
                        setSuccessMessage("");
                      }}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
                    >
                      Recuperar minha senha
                    </button>
                    <p className="text-xs text-gray-600 mt-3 text-center">
                      Serão enviadas instruções para:{" "}
                      <span className="font-medium text-orange-600">
                        {registeredEmail}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}
            {/* LOGIN FORM */}
            {activeTab === "login" && (
              <div className="space-y-4">
                <div>
                  <label className="block mb-1.5 text-gray-400 font-orbitron text-[10px] tracking-widest uppercase font-bold">
                    Email_ID
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full p-3 bg-zinc-900/80 rounded-sm text-sm font-mono text-gray-300 border border-white/10 focus:border-orange-500/50 focus:bg-orange-500/5 focus:shadow-[0_0_15px_rgba(255,150,0,0.15)] focus:outline-none transition-all duration-300 placeholder:text-gray-700"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="user@network.com"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-gray-400 font-orbitron text-[10px] tracking-widest uppercase font-bold">
                    Passkey
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full p-2.5 bg-zinc-900/80 rounded-sm text-sm font-mono text-gray-300 border border-white/10 focus:border-orange-500/50 focus:bg-orange-500/5 focus:shadow-[0_0_15px_rgba(255,150,0,0.15)] focus:outline-none transition-all duration-300 placeholder:text-gray-700"
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {/* REGISTER FORM */}
            {activeTab === "register" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                <div className="md:col-span-2">
                  <label className="block mb-1.5 text-gray-400 font-orbitron text-[10px] tracking-widest uppercase font-bold">
                    Nome de Agente *
                  </label>
                  <input
                    type="text"
                    required
                    className={`w-full p-2.5 bg-zinc-900/80 rounded-sm text-sm font-mono text-gray-300 border transition-all duration-300 ${
                      errors.username
                        ? "border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                        : "border-white/10 focus:border-orange-500/50 focus:bg-orange-500/5 focus:shadow-[0_0_15px_rgba(255,150,0,0.15)]"
                    } focus:outline-none placeholder:text-gray-700`}
                    value={formData.username}
                    onChange={(e) =>
                      handleInputChange("username", e.target.value)
                    }
                    placeholder="4-10 caracteres"
                    minLength={4}
                    maxLength={10}
                  />
                  {errors.username && (
                    <p className="text-red-400 text-xs font-mono mt-1">
                      {errors.username}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block mb-1.5 text-gray-400 font-orbitron text-[10px] tracking-widest uppercase font-bold">
                    Email_ID *
                  </label>
                  <input
                    type="email"
                    required
                    className={`w-full p-2.5 bg-zinc-900/80 rounded-sm text-sm font-mono text-gray-300 border transition-all duration-300 ${
                      errors.email
                        ? "border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                        : "border-white/10 focus:border-orange-500/50 focus:bg-orange-500/5 focus:shadow-[0_0_15px_rgba(255,150,0,0.15)]"
                    } focus:outline-none placeholder:text-gray-700`}
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="user@network.com"
                  />
                  {errors.email && (
                    <p className="text-red-400 text-xs font-mono mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block mb-1.5 text-gray-400 font-orbitron text-[10px] tracking-widest uppercase font-bold">
                    Confirmar Email *
                  </label>
                  <input
                    type="email"
                    required
                    className={`w-full p-2.5 bg-zinc-900/80 rounded-sm text-sm font-mono text-gray-300 border transition-all duration-300 ${
                      errors.confirmEmail
                        ? "border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                        : "border-white/10 focus:border-orange-500/50 focus:bg-orange-500/5 focus:shadow-[0_0_15px_rgba(255,150,0,0.15)]"
                    } focus:outline-none placeholder:text-gray-700`}
                    value={formData.confirmEmail}
                    onChange={(e) =>
                      handleInputChange("confirmEmail", e.target.value)
                    }
                    placeholder="Confirmar identificação"
                  />
                  {errors.confirmEmail && (
                    <p className="text-red-400 text-xs font-mono mt-1">
                      {errors.confirmEmail}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block mb-1.5 text-gray-400 font-orbitron text-[10px] tracking-widest uppercase font-bold">
                    Nova Passkey *
                  </label>
                  <input
                    type="password"
                    required
                    className={`w-full p-2.5 bg-zinc-900/80 rounded-sm text-sm font-mono text-gray-300 border transition-all duration-300 ${
                      errors.password
                        ? "border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                        : "border-white/10 focus:border-orange-500/50 focus:bg-orange-500/5 focus:shadow-[0_0_15px_rgba(255,150,0,0.15)]"
                    } focus:outline-none placeholder:text-gray-700`}
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    placeholder="Min 8 chars, alfanumérico"
                    minLength={8}
                    maxLength={12}
                  />
                  {errors.password && (
                    <p className="text-red-400 text-xs font-mono mt-1">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block mb-1.5 text-gray-400 font-orbitron text-[10px] tracking-widest uppercase font-bold">
                    Confirmar Passkey *
                  </label>
                  <input
                    type="password"
                    required
                    className={`w-full p-2.5 bg-zinc-900/80 rounded-sm text-sm font-mono text-gray-300 border transition-all duration-300 ${
                      errors.confirmPassword
                        ? "border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                        : "border-white/10 focus:border-orange-500/50 focus:bg-orange-500/5 focus:shadow-[0_0_15px_rgba(255,150,0,0.15)]"
                    } focus:outline-none placeholder:text-gray-700`}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      handleInputChange("confirmPassword", e.target.value)
                    }
                    placeholder="Repita a senha"
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-400 text-xs font-mono mt-1">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block mb-1.5 text-gray-400 font-orbitron text-[10px] tracking-widest uppercase font-bold">
                    Data Operacional *
                  </label>
                  <input
                    type="date"
                    required
                    className={`w-full p-2.5 bg-zinc-900/80 rounded-sm text-sm font-mono text-gray-400 border transition-all duration-300 ${
                      errors.birthDate
                        ? "border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                        : "border-white/10 focus:border-orange-500/50 focus:bg-orange-500/5 focus:shadow-[0_0_15px_rgba(255,150,0,0.15)]"
                    } focus:outline-none`}
                    value={formData.birthDate}
                    onChange={(e) =>
                      handleInputChange("birthDate", e.target.value)
                    }
                    max={
                      new Date(
                        new Date().setFullYear(new Date().getFullYear() - 18),
                      )
                        .toISOString()
                        .split("T")[0]
                    }
                  />
                  {errors.birthDate && (
                    <p className="text-red-400 text-xs font-mono mt-1">
                      {errors.birthDate}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block mb-1.5 text-gray-400 font-orbitron text-[10px] tracking-widest uppercase font-bold">
                    Região *
                  </label>
                  <div className="relative" ref={countryDropdownRef}>
                    <div
                      className={`w-full p-2.5 bg-zinc-900/80 rounded-sm text-sm font-mono text-gray-400 border transition-all duration-300 ${
                        errors.country
                          ? "border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                          : "border-white/10 focus:border-orange-500/50 focus:bg-orange-500/5 focus:shadow-[0_0_15px_rgba(255,150,0,0.15)]"
                      } focus:outline-none flex items-center cursor-pointer`}
                      onClick={() =>
                        setIsCountryDropdownOpen(!isCountryDropdownOpen)
                      }
                    >
                      {formData.country ? (
                        <>
                          <img
                            src={`https://flagcdn.com/24x18/${formData.country.toLowerCase()}.png`}
                            srcSet={`https://flagcdn.com/48x36/${formData.country.toLowerCase()}.png 2x`}
                            width="24"
                            height="18"
                            alt={
                              countries.find((c) => c.code === formData.country)
                                ?.name || ""
                            }
                            className="mr-3 filter brightness-90 grayscale-[0.2]"
                          />
                          <span className="text-gray-300">
                            {countries.find((c) => c.code === formData.country)?.name}
                          </span>
                        </>
                      ) : (
                        "SELECIONAR REGIÃO"
                      )}
                      <svg
                        className="w-4 h-4 ml-auto text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d={
                            isCountryDropdownOpen
                              ? "M5 15l7-7 7 7"
                              : "M19 9l-7 7-7-7"
                          }
                        />
                      </svg>
                    </div>

                    {isCountryDropdownOpen && (
                      <div className="absolute z-10 w-full bottom-full mb-1 bg-zinc-950 border border-white/10 rounded-sm shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
                        {countries.map((country) => (
                          <div
                            key={country.code}
                            className="flex items-center p-3 hover:bg-orange-500/10 cursor-pointer font-mono text-sm text-gray-400 hover:text-white transition-colors"
                            onClick={() => {
                              handleInputChange("country", country.code);
                              setIsCountryDropdownOpen(false);
                            }}
                          >
                            <img
                              src={`https://flagcdn.com/24x18/${country.code.toLowerCase()}.png`}
                              srcSet={`https://flagcdn.com/48x36/${country.code.toLowerCase()}.png 2x`}
                              width="24"
                              height="18"
                              alt={country.name}
                              className="mr-3 filter brightness-90 grayscale-[0.2]"
                            />
                            {country.name.toUpperCase()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {errors.country && (
                    <p className="text-red-400 text-xs font-mono mt-1">
                      {errors.country}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* FORGOT PASSWORD FORM */}
            {activeTab === "forgot-password" && (
              <div className="space-y-4">
                <div>
                  <label className="block mb-1.5 text-gray-400 font-orbitron text-[10px] tracking-widest uppercase font-bold">Email_ID</label>
                  <input
                    type="email"
                    required
                    className="w-full p-3 bg-zinc-900/80 rounded-sm text-sm font-mono text-gray-300 border border-white/10 focus:border-orange-500/50 focus:bg-orange-500/5 focus:shadow-[0_0_15px_rgba(255,150,0,0.15)] focus:outline-none transition-all duration-300 placeholder:text-gray-700"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="user@network.com"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isValidating || isProcessing}
              className="w-full md:col-span-2 group relative overflow-hidden bg-orange-600/20 border border-orange-500/50 hover:bg-orange-500 hover:border-orange-400 text-orange-500 hover:text-black font-orbitron font-black tracking-widest uppercase py-3 sm:py-3.5 mt-4 rounded-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-orange-600/20 disabled:hover:text-orange-500 flex items-center justify-center shadow-[inset_0_0_15px_rgba(255,100,0,0.2)] hover:shadow-[0_0_20px_rgba(255,100,0,0.4)]"
            >
              {/* Scanline effect on button */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />

              {isValidating || isProcessing ? (
                <span className="flex items-center justify-center gap-3 relative z-10">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  {isValidating ? "VERIFICANDO..." : "PROCESSANDO..."}
                </span>
              ) : (
                <span className="relative z-10 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-current rotate-45 group-hover:animate-ping" />
                  {activeTab === "login" && "INICIAR SESSÃO"}
                  {activeTab === "register" && "ESTABELECER CONEXÃO"}
                  {activeTab === "forgot-password" && "RESTAURAR ACESSO"}
                  <div className="w-1.5 h-1.5 bg-current rotate-45 group-hover:animate-ping" />
                </span>
              )}
            </button>

            {activeTab === "login" && googleEnabled && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => handleGoogleLogin("login")}
                  className="w-full bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/30 font-orbitron text-xs font-bold tracking-widest uppercase py-2.5 sm:py-3 rounded-sm transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden group"
                >
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    className="w-5 h-5 transition-transform group-hover:scale-110"
                  >
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                  <span>AUTENTICAÇÃO GOOGLE</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}