import React from "react";
import { useState, useRef, useEffect } from "react";
import { apiClient } from "../lib/supabaseClient"; // Agora usando apenas o apiClient local

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
    // PKCE: Criar o code verifier e o code challenge
    const generateRandomString = (length: number) => {
      const possible =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let text = "";
      for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      }
      return text;
    };

    const sha256 = async (plain: string) => {
      const encoder = new TextEncoder();
      const data = encoder.encode(plain);
      return window.crypto.subtle.digest("SHA-256", data);
    };

    const base64urlencode = (a: ArrayBuffer) => {
      return btoa(String.fromCharCode(...new Uint8Array(a)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    };

    const codeVerifier = generateRandomString(128);
    sessionStorage.setItem("google_code_verifier", codeVerifier);
    sessionStorage.setItem("google_auth_intent", intent); // Salva o intent

    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64urlencode(hashed);

    const apiBase =
      import.meta.env?.VITE_API_URL || "http://localhost:3001/api";
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const params = new URLSearchParams({
      redirect_uri: redirectUri,
      intent: intent,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const startUrl = `${apiBase}/auth/google/start?${params.toString()}`;

    window.location.href = startUrl;
  };

  // Função para validar palavrões (simulação de API)
  const checkProfanity = async (username: string): Promise<boolean> => {
    // Simulação de API anti-palavrões
    const profanityWords = ["admin", "test", "fuck", "shit", "damn", "bitch"];
    return profanityWords.some((word) => username.toLowerCase().includes(word));
  };

  // Função para verificar se um email existe e está confirmado usando a função serverless
  const checkEmailExists = async (
    email: string,
  ): Promise<{ exists: boolean; confirmed: boolean }> => {
    try {
      // Aguardar um pouco antes de verificar para evitar verificações prematuras
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Chama a API do backend para verificar o email
      const response = await fetch(
        "http://localhost:3001/api/auth/check-email",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: { error?: string } = {};
        if (errorText) {
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            // O erro de parsing é intencional se a resposta não for JSON
          }
        }
        throw new Error(errorData.error || "Erro ao verificar email");
      }

      // Retorna o resultado da função serverless
      const responseText = await response.text();

      if (responseText) {
        try {
          const result = JSON.parse(responseText);
          return result;
        } catch (e) {
          // Em caso de erro no parsing, não assumimos automaticamente que o email existe e está confirmado
          // Em vez disso, retornamos que o email não existe para forçar o usuário a se registrar
          return { exists: false, confirmed: false };
        }
      }
      // Se não houver resposta, não assumimos automaticamente que o email existe e está confirmado
      // Em vez disso, retornamos que o email não existe para forçar o usuário a se registrar
      return { exists: false, confirmed: false };
    } catch (error) {
      // Em caso de erro, não assumimos automaticamente que o usuário existe e está confirmado
      // Em vez disso, retornamos que o email não existe para forçar o usuário a se registrar
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
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [showRegisterOption, setShowRegisterOption] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Função para reenviar o email de confirmação
  const handleResendConfirmation = async () => {
    // Evita múltiplos cliques durante o cooldown ou processamento
    if (isResending || resendCooldown > 0) return;

    setIsResending(true);

    try {
      await apiClient.resendConfirmation(registeredEmail);

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
    let countdownInterval: NodeJS.Timeout | null = null;

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

    if (activeTab === "register") {
      try {
        const isValid = await validateForm();
        if (isValid) {
          // Registrar o usuário na API local
          const authData = await apiClient.register(
            formData.email,
            formData.username,
            formData.password,
            formData.birthDate || undefined,
            formData.country || undefined,
          );

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
        const message =
          error instanceof Error
            ? error.message
            : "Ocorreu um erro durante o registro.";
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
        const data = await apiClient.login(formData.email, formData.password);

        // Verificar se o usuário já escolheu uma facção
        if (data.user) {
          try {
            // Tentar obter os dados do perfil
            const profileData = await apiClient.getUserProfile();

            // Delay adicional para processamento
            await new Promise((resolve) => setTimeout(resolve, 1500));

            // Fechar o modal
            onClose();
            setIsProcessing(false);

            // Verificar se é o primeiro login (após confirmação de email)
            // O backend já envia isFirstLogin baseado na verificação de last_login
            const isFirstLogin = data.isFirstLogin;

            // Redirecionar com base na facção e se é primeiro login
            if (isFirstLogin || !profileData?.faction) {
              // Se for primeiro login ou não tiver facção, redirecionar para a página de seleção
              window.location.href = "/faction-selection";
            } else {
              // Delay antes de redirecionar para o dashboard
              await new Promise((resolve) => setTimeout(resolve, 1000));
              window.location.href = "/dashboard";
            }
          } catch (profileError) {
            // Se houver erro ao buscar o perfil, redirecionar para a página de seleção
            onClose();
            setIsProcessing(false);
            window.location.href = "/faction-selection";
          }
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Ocorreu um erro durante o login.";
        setErrors({ form: message });
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
        await apiClient.forgotPassword(formData.email);

        // Só exibe a mensagem de sucesso se o email existir, estiver confirmado e o email de recuperação for enviado com sucesso
        setSuccessMessage(
          "Enviamos um email com instruções para redefinir sua senha. Por favor, verifique sua caixa de entrada.",
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
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
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
          className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl w-full max-w-2xl p-4 sm:p-5 md:p-6 relative border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
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

          {/* Title */}
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-orbitron mb-1 flex items-center justify-center">
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
            <p className="text-gray-400 text-sm">
              {activeTab === "login" && "Acesse sua conta"}
              {activeTab === "register" && "Crie sua conta"}
              {activeTab === "forgot-password" && "Recupere sua senha"}
            </p>
          </div>

          <div className="flex gap-2 mb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as AuthMode);
                  setErrors({});
                  setSuccessMessage("");
                  setShowResendConfirmation(false);
                  setShowRegisterOption(false);
                }}
                className={`flex-1 px-2 sm:px-3 py-1 sm:py-2 rounded-lg font-orbitron text-xs sm:text-sm transition-colors
                ${
                  activeTab === tab.id
                    ? "bg-orange-500 text-white shadow-lg"
                    : "bg-gray-700 hover:bg-gray-600 text-gray-300"
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
              </div>
            )}
            {/* LOGIN FORM */}
            {activeTab === "login" && (
              <>
                <div>
                  <label className="block mb-2 text-white font-exo">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full p-3 bg-gray-700 rounded-lg text-white border border-gray-600 focus:border-orange-500 focus:outline-none transition-colors"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="seu@email.com"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-white font-exo">
                    Senha
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full p-3 bg-gray-700 rounded-lg text-white border border-gray-600 focus:border-orange-500 focus:outline-none transition-colors"
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    placeholder="Sua senha"
                  />
                </div>
              </>
            )}

            {/* REGISTER FORM */}
            {activeTab === "register" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block mb-2 text-white font-exo">
                    Nome de usuário *
                  </label>
                  <input
                    type="text"
                    required
                    className={`w-full p-3 bg-gray-700 rounded-lg text-white border transition-colors ${
                      errors.username
                        ? "border-red-500"
                        : "border-gray-600 focus:border-orange-500"
                    } focus:outline-none`}
                    value={formData.username}
                    onChange={(e) =>
                      handleInputChange("username", e.target.value)
                    }
                    placeholder="4-10 caracteres"
                    minLength={4}
                    maxLength={10}
                  />
                  {errors.username && (
                    <p className="text-red-400 text-sm mt-1">
                      {errors.username}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block mb-2 text-white font-exo">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    className={`w-full p-3 bg-gray-700 rounded-lg text-white border transition-colors ${
                      errors.email
                        ? "border-red-500"
                        : "border-gray-600 focus:border-orange-500"
                    } focus:outline-none`}
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="seu@email.com"
                  />
                  {errors.email && (
                    <p className="text-red-400 text-sm mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block mb-2 text-white font-exo">
                    Confirmar Email *
                  </label>
                  <input
                    type="email"
                    required
                    className={`w-full p-3 bg-gray-700 rounded-lg text-white border transition-colors ${
                      errors.confirmEmail
                        ? "border-red-500"
                        : "border-gray-600 focus:border-orange-500"
                    } focus:outline-none`}
                    value={formData.confirmEmail}
                    onChange={(e) =>
                      handleInputChange("confirmEmail", e.target.value)
                    }
                    placeholder="Confirme seu email"
                  />
                  {errors.confirmEmail && (
                    <p className="text-red-400 text-sm mt-1">
                      {errors.confirmEmail}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block mb-2 text-white font-exo">
                    Senha *
                  </label>
                  <input
                    type="password"
                    required
                    className={`w-full p-3 bg-gray-700 rounded-lg text-white border transition-colors ${
                      errors.password
                        ? "border-red-500"
                        : "border-gray-600 focus:border-orange-500"
                    } focus:outline-none`}
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    placeholder="8-12 chars, maiúsculas+minúsculas+números"
                    minLength={8}
                    maxLength={12}
                  />
                  {errors.password && (
                    <p className="text-red-400 text-sm mt-1">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block mb-2 text-white font-exo">
                    Confirmar Senha *
                  </label>
                  <input
                    type="password"
                    required
                    className={`w-full p-3 bg-gray-700 rounded-lg text-white border transition-colors ${
                      errors.confirmPassword
                        ? "border-red-500"
                        : "border-gray-600 focus:border-orange-500"
                    } focus:outline-none`}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      handleInputChange("confirmPassword", e.target.value)
                    }
                    placeholder="Confirme sua senha"
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-400 text-sm mt-1">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block mb-2 text-white font-exo">
                    Data de Nascimento *
                  </label>
                  <input
                    type="date"
                    required
                    className={`w-full p-3 bg-gray-700 rounded-lg text-white border transition-colors ${
                      errors.birthDate
                        ? "border-red-500"
                        : "border-gray-600 focus:border-orange-500"
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
                    <p className="text-red-400 text-sm mt-1">
                      {errors.birthDate}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block mb-2 text-white font-exo">
                    País *
                  </label>
                  <div className="relative" ref={countryDropdownRef}>
                    <div
                      className={`w-full p-3 bg-gray-700 rounded-lg text-white border transition-colors ${
                        errors.country
                          ? "border-red-500"
                          : "border-gray-600 focus:border-orange-500"
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
                            className="mr-2"
                          />
                          {countries.find((c) => c.code === formData.country)
                            ?.name || "Selecione seu país"}
                        </>
                      ) : (
                        "Selecione seu país"
                      )}
                      <svg
                        className="w-4 h-4 ml-auto"
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
                      <div className="absolute z-10 w-full bottom-full mb-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {countries.map((country) => (
                          <div
                            key={country.code}
                            className="flex items-center p-3 hover:bg-gray-700 cursor-pointer"
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
                              className="mr-2"
                            />
                            {country.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {errors.country && (
                    <p className="text-red-400 text-sm mt-1">
                      {errors.country}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* FORGOT PASSWORD FORM */}
            {activeTab === "forgot-password" && (
              <div>
                <label className="block mb-2 text-white font-exo">Email</label>
                <input
                  type="email"
                  required
                  className="w-full p-3 bg-gray-700 rounded-lg text-white border border-gray-600 focus:border-orange-500 focus:outline-none transition-colors"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isValidating || isProcessing}
              className="w-full md:col-span-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-orbitron py-3 rounded-lg transition-all hover:scale-105 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center mt-4"
            >
              {isValidating ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Validando...
                </span>
              ) : isProcessing ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processando...
                </span>
              ) : (
                <>
                  {activeTab === "login" && "Entrar"}
                  {activeTab === "register" && "Registrar"}
                  {activeTab === "forgot-password" && "Recuperar Senha"}
                </>
              )}
            </button>

            {activeTab === "login" && googleEnabled && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => handleGoogleLogin("login")}
                  className="w-full bg-white text-black font-orbitron py-3 rounded-lg transition-all hover:scale-[1.01] shadow border border-gray-300 flex items-center justify-center gap-2"
                >
                  <span className="w-5 h-5 rounded bg-white text-black flex items-center justify-center font-extrabold">
                    G
                  </span>
                  <span>Continuar com Google</span>
                </button>
              </div>
            )}

            {activeTab === "register" && googleEnabled && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => handleGoogleLogin("register")}
                  className="w-full bg-white text-black font-orbitron py-3 rounded-lg transition-all hover:scale-[1.01] shadow border border-gray-300 flex items-center justify-center gap-2"
                >
                  <span className="w-5 h-5 rounded bg-white text-black flex items-center justify-center font-extrabold">
                    G
                  </span>
                  <span>Registrar com Google</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
