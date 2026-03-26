import React, { useState, useEffect, useRef } from "react";
import { apiClient } from "../lib/supabaseClient";
import { useToast } from "../contexts/ToastContext";
import { Country, countries } from "../utils/countries";
import { useNavigate } from "react-router-dom";

type AuthMode = "login" | "register" | "forgot-password";

interface AuthModalProps {
  onClose: () => void;
  initialMode?: AuthMode;
}

export default function AuthModal({
  onClose,
  initialMode = "login",
}: AuthModalProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
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
  const [authMethodError, setAuthMethodError] = useState<string | null>(null); // Para erros específicos de método de autenticação
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [resendEmail, setResendEmail] = useState("");

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

    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const params = new URLSearchParams({
      redirect_uri: redirectUri,
      intent: intent,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const startUrl = `/api/auth/google/start?${params.toString()}`;

    try {
      setIsProcessing(true);
      const response = await fetch(startUrl);
      const data = await response.json();

      if (response.ok && data.authorizeUrl) {
        window.location.href = data.authorizeUrl;
      } else {
        throw new Error(
          data.error || "URL de autorização não recebida do servidor.",
        );
      }
    } catch (error: any) {
      console.error("Erro ao iniciar login com Google:", error.message);
      setErrors({
        form:
          error.message ||
          "Não foi possível iniciar o login com Google. Tente novamente.",
      });
      setIsProcessing(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" })); // Limpa o erro ao digitar
    setAuthMethodError(null); // Limpa erro de método de autenticação
  };

  const validateForm = async (mode: AuthMode) => {
    const newErrors: Record<string, string> = {};
    setIsValidating(true);

    // Validações comuns
    if (!formData.email) {
      newErrors.email = "Email é obrigatório";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }

    if (mode === "register") {
      if (formData.email !== formData.confirmEmail) {
        newErrors.confirmEmail = "Emails não coincidem";
      }
      if (!formData.username) {
        newErrors.username = "Username é obrigatório";
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        newErrors.username =
          "Username deve conter apenas letras, números e underscore";
      } else if (
        formData.username.length < 3 ||
        formData.username.length > 20
      ) {
        newErrors.username = "Username deve ter entre 3 e 20 caracteres";
      }

      if (!formData.password) {
        newErrors.password = "Senha é obrigatória";
      } else if (formData.password.length < 8) {
        newErrors.password = "Senha deve ter no mínimo 8 caracteres";
      } else if (
        !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(
          formData.password,
        )
      ) {
        newErrors.password =
          "Senha deve incluir maiúscula, minúscula, número e símbolo";
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Senhas não coincidem";
      }
      if (!formData.country) {
        newErrors.country = "País é obrigatório";
      }
    } else if (mode === "login") {
      if (!formData.password) {
        newErrors.password = "Senha é obrigatória";
      }
    }

    setErrors(newErrors);
    setIsValidating(false);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setAuthMethodError(null);
    setIsProcessing(true);

    const isValid = await validateForm(activeTab);
    if (!isValid) {
      setIsProcessing(false);
      return;
    }

    try {
      if (activeTab === "login") {
        const response = await apiClient.login(
          formData.email,
          formData.password,
        );
        showToast("Login realizado com sucesso!", "success");

        if (response.isFirstLogin) {
          navigate("/faction-selection");
        } else {
          onClose();
          navigate("/dashboard");
        }
      } else if (activeTab === "register") {
        await apiClient.register(
          formData.email,
          formData.username,
          formData.password,
          formData.birthDate || undefined,
          formData.country || undefined,
        );
        showToast(
          "Registro realizado! Verifique seu email para confirmar a conta.",
          "success",
        );
        onClose();
      } else if (activeTab === "forgot-password") {
        await apiClient.forgotPassword(formData.email);
        showToast(
          "Se o email estiver registrado, um link de redefinição será enviado.",
          "info",
        );
        onClose();
      }
    } catch (error: any) {
      console.error("Erro de autenticação:", error);
      if (error.response && error.response.data) {
        const { error: apiError, message: apiMessage } = error.response.data;
        if (apiError === "Login com provedor externo") {
          setAuthMethodError(apiMessage);
        } else if (apiError === "Email não confirmado") {
          setErrors({ form: apiMessage });
          setResendEmail(formData.email);
          setShowResendConfirmation(true);
        } else {
          setErrors({ form: apiMessage || apiError || "Erro desconhecido" });
        }
      } else {
        setErrors({ form: "Erro de conexão. Tente novamente." });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResendConfirmation = async () => {
    setIsProcessing(true);
    try {
      await apiClient.resendConfirmation(resendEmail);
      showToast("Email de confirmação reenviado!", "success");
      setShowResendConfirmation(false);
      setResendEmail("");
    } catch (error: any) {
      console.error("Erro ao reenviar confirmação:", error);
      setErrors({
        form:
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Erro ao reenviar email.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCountrySelect = (countryCode: string) => {
    const selectedCountry = countries.find((c) => c.code === countryCode);
    if (selectedCountry) {
      handleInputChange("country", selectedCountry.code);
      setIsCountryDropdownOpen(false);
    }
  };

  const getCountryName = (code: string) => {
    const country = countries.find((c) => c.code === code);
    return country ? country.name : "Selecione um País";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full relative border border-gray-700">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
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

        <div className="p-6 pt-0">
          <div className="flex gap-2 mb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as AuthMode);
                  setErrors({});
                  setAuthMethodError(null);
                  setShowResendConfirmation(false);
                  setResendEmail("");
                }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-orbitron transition-colors ${
                  activeTab === tab.id
                    ? "bg-orange-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Erro de método de autenticação (ex: "Este email foi cadastrado com Google") */}
            {authMethodError && (
              <div
                className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-4"
                role="alert"
              >
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
                  <p className="text-sm mt-2">
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      className="text-blue-600 hover:text-blue-800 underline font-bold"
                      disabled={isProcessing}
                    >
                      Reenviar email de confirmação
                    </button>
                  </p>
                )}
              </div>
            )}

            {/* LOGIN FORM */}
            {(activeTab === "login" || activeTab === "register") && (
              <div className="mb-4">
                <label className="block mb-2 text-white font-exo">Email</label>
                <input
                  type="email"
                  required
                  className="w-full p-3 bg-gray-700 rounded-lg text-white border border-gray-600 focus:border-orange-500 focus:outline-none transition-colors"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="seu@email.com"
                />
                {errors.email && (
                  <p className="text-red-400 text-sm mt-1">{errors.email}</p>
                )}
              </div>
            )}

            {activeTab === "register" && (
              <div className="mb-4">
                <label className="block mb-2 text-white font-exo">
                  Confirmar Email
                </label>
                <input
                  type="email"
                  required
                  className="w-full p-3 bg-gray-700 rounded-lg text-white border border-gray-600 focus:border-orange-500 focus:outline-none transition-colors"
                  value={formData.confirmEmail}
                  onChange={(e) =>
                    handleInputChange("confirmEmail", e.target.value)
                  }
                  placeholder="confirme seu email"
                />
                {errors.confirmEmail && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.confirmEmail}
                  </p>
                )}
              </div>
            )}

            {activeTab === "register" && (
              <div className="mb-4">
                <label className="block mb-2 text-white font-exo">
                  Username
                </label>
                <input
                  type="text"
                  required
                  className="w-full p-3 bg-gray-700 rounded-lg text-white border border-gray-600 focus:border-orange-500 focus:outline-none transition-colors"
                  value={formData.username}
                  onChange={(e) =>
                    handleInputChange("username", e.target.value)
                  }
                  placeholder="seu_username"
                />
                {errors.username && (
                  <p className="text-red-400 text-sm mt-1">{errors.username}</p>
                )}
              </div>
            )}

            {(activeTab === "login" || activeTab === "register") && (
              <div className="mb-4">
                <label className="block mb-2 text-white font-exo">Senha</label>
                <input
                  type="password"
                  required
                  className="w-full p-3 bg-gray-700 rounded-lg text-white border border-gray-600 focus:border-orange-500 focus:outline-none transition-colors"
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  placeholder="sua senha"
                />
                {errors.password && (
                  <p className="text-red-400 text-sm mt-1">{errors.password}</p>
                )}
              </div>
            )}

            {activeTab === "register" && (
              <div className="mb-4">
                <label className="block mb-2 text-white font-exo">
                  Confirmar Senha
                </label>
                <input
                  type="password"
                  required
                  className="w-full p-3 bg-gray-700 rounded-lg text-white border border-gray-600 focus:border-orange-500 focus:outline-none transition-colors"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  placeholder="confirme sua senha"
                />
                {errors.confirmPassword && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            )}

            {activeTab === "register" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block mb-2 text-white font-exo">
                    Data de Nascimento (Opcional)
                  </label>
                  <input
                    type="date"
                    className="w-full p-3 bg-gray-700 rounded-lg text-white border border-gray-600 focus:border-orange-500 focus:outline-none transition-colors"
                    value={formData.birthDate}
                    onChange={(e) =>
                      handleInputChange("birthDate", e.target.value)
                    }
                  />
                  {errors.birthDate && (
                    <p className="text-red-400 text-sm mt-1">
                      {errors.birthDate}
                    </p>
                  )}
                </div>
                <div className="relative" ref={countryDropdownRef}>
                  <label className="block mb-2 text-white font-exo">País</label>
                  <button
                    type="button"
                    onClick={() =>
                      setIsCountryDropdownOpen(!isCountryDropdownOpen)
                    }
                    className="w-full p-3 bg-gray-700 rounded-lg text-white border border-gray-600 focus:border-orange-500 focus:outline-none transition-colors flex justify-between items-center"
                  >
                    <span>{getCountryName(formData.country)}</span>
                    <svg
                      className={`w-4 h-4 transform transition-transform ${
                        isCountryDropdownOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      ></path>
                    </svg>
                  </button>
                  {isCountryDropdownOpen && (
                    <div className="absolute z-10 w-full bg-gray-700 border border-gray-600 rounded-lg mt-1 max-h-48 overflow-y-auto">
                      {countries.map((country: Country) => (
                        <div
                          key={country.code}
                          onClick={() => handleCountrySelect(country.code)}
                          className="p-3 hover:bg-gray-600 cursor-pointer text-white"
                        >
                          {country.name}
                        </div>
                      ))}
                    </div>
                  )}
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
              {isProcessing ? (
                <span className="flex items-center">
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
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    className="w-5 h-5"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    ></path>
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    ></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                  <span>Login/Registro Google</span>
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
