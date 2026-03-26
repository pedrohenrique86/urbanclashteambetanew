const express = require("express");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");
const { query, transaction } = require("../config/database");
const emailService = require("../services/emailService");
const {
  generateToken,
  createSession,
  invalidateSession,
  invalidateAllSessions,
  authenticateToken,
} = require("../middleware/auth");

const router = express.Router();
const crypto = require("crypto");
const url = require("url");

// Rate limiting específico para autenticação
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 5, // máximo 5 tentativas por IP
  message: { error: "Muitas tentativas de login, tente novamente em 1 minuto" },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 3, // máximo 3 registros por IP por hora
  message: { error: "Muitos registros, tente novamente em 5 minutos" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validações
const registerValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Email inválido"),
  body("username")
    .isLength({ min: 3, max: 20 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage(
      "Username deve ter 3-20 caracteres e conter apenas letras, números e underscore",
    ),
  body("password")
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Senha deve ter pelo menos 8 caracteres, incluindo maiúscula, minúscula, número e símbolo",
    ),
  body("birth_date")
    .optional()
    .isISO8601()
    .withMessage("Data de nascimento deve estar no formato YYYY-MM-DD"),
  body("country")
    .optional()
    .isLength({ min: 2, max: 3 })
    .matches(/^[A-Z]{2,3}$/)
    .withMessage("Código do país deve ter 2-3 letras maiúsculas (ex: BR, US)"),
];

const loginValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Email inválido"),
  body("password").notEmpty().withMessage("Senha é obrigatória"),
];

// POST /api/auth/register - Registrar novo usuário
router.post(
  "/register",
  registerLimiter,
  registerValidation,
  async (req, res) => {
    try {
      // Verificar erros de validação
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: errors.array(),
        });
      }

      const { email, username, password, birth_date, country } = req.body;

      // Verificar se email já existe
      const emailExists = await query("SELECT id FROM users WHERE email = $1", [
        email,
      ]);

      if (emailExists.rows.length > 0) {
        return res.status(409).json({
          error: "E-mail já cadastrado",
          message:
            "Este e-mail já está em uso. Por favor, faça login ou use outro e-mail.",
        });
      }

      // Verificar se username já existe
      const usernameExists = await query(
        "SELECT id FROM users WHERE username = $1",
        [username],
      );

      if (usernameExists.rows.length > 0) {
        return res.status(409).json({ error: "Username já está em uso" });
      }

      // Hash da senha
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Gerar token de confirmação
      const confirmationToken = emailService.generateConfirmationToken();

      // Criar usuário e perfil em uma transação
      const result = await transaction(async (client) => {
        // Inserir usuário
        const userResult = await client.query(
          `INSERT INTO users (email, username, password_hash, email_confirmation_token, birth_date, country) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, username, birth_date, country`,
          [
            email,
            username,
            passwordHash,
            confirmationToken,
            birth_date || null,
            country || null,
          ],
        );

        const user = userResult.rows[0];

        // Perfil será criado quando o usuário escolher a facção

        return user;
      });

      // Enviar email de confirmação
      try {
        await emailService.sendConfirmationEmail(email, confirmationToken);
      } catch (emailError) {
        console.error(
          "❌ Erro ao enviar email de confirmação:",
          emailError.message,
        );
        // Não falhar o registro se o email não puder ser enviado
      }

      res.status(201).json({
        message: "Usuário registrado com sucesso",
        user: {
          id: result.id,
          email: result.email,
          username: result.username,
        },
        emailSent: true,
      });
    } catch (error) {
      console.error("❌ Erro no registro:", error.message);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },
);

// POST /api/auth/login - Login do usuário
router.post("/login", authLimiter, loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Buscar usuário
    const userResult = await query(
      "SELECT id, email, username, password_hash, is_email_confirmed FROM users WHERE email = $1",
      [email],
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }

    const user = userResult.rows[0];

    // Se o usuário tem um google_id, ele se cadastrou com o Google.
    // Como esta é a rota de login com senha, devemos impedi-lo e instruí-lo.
    // A exceção é se ele também tiver um hash de senha (cadastrou-se manualmente e depois vinculou o Google).
    if (user.google_id && !user.password_hash) {
      return res.status(409).json({
        error: "Login com provedor externo",
        message:
          "Este email foi cadastrado usando uma conta Google. Por favor, faça login com o Google.",
      });
    }

    // Verificar senha
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }

    // Verificar se email foi confirmado
    if (!user.is_email_confirmed) {
      return res.status(403).json({
        error: "Email não confirmado",
        message: "Por favor, confirme seu email antes de fazer login",
      });
    }

    // Verificar se o usuário já tem um perfil criado.
    // Se não houver perfil, é o primeiro login.
    const profileResultForCheck = await query(
      "SELECT id FROM user_profiles WHERE user_id = $1",
      [user.id],
    );

    const isFirstLogin = profileResultForCheck.rows.length === 0;
    console.log(
      "👤 Verificação de primeiro login (baseado na existência do perfil):",
      {
        isFirstLogin,
      },
    );

    // Gerar token JWT
    const token = generateToken(user.id);

    // Criar sessão no banco
    await createSession(user.id, token);

    // Atualizar último login
    await query(
      "UPDATE user_profiles SET last_login = NOW() WHERE user_id = $1",
      [user.id],
    );

    // Buscar perfil do usuário (reutilizando a consulta se possível ou fazendo uma nova)
    const profileResult = await query(
      "SELECT * FROM user_profiles WHERE user_id = $1",
      [user.id],
    );

    res.json({
      message: "Login realizado com sucesso",
      token,
      isFirstLogin,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        profile: profileResult.rows[0] || null,
      },
    });
  } catch (error) {
    console.error("❌ Erro no login:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /api/auth/logout - Logout do usuário
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      await invalidateSession(req.user.id, token);
    }

    res.json({ message: "Logout realizado com sucesso" });
  } catch (error) {
    console.error("❌ Erro no logout:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /api/auth/logout-all - Logout de todas as sessões
router.post("/logout-all", authenticateToken, async (req, res) => {
  try {
    await invalidateAllSessions(req.user.id);
    res.json({ message: "Logout de todas as sessões realizado com sucesso" });
  } catch (error) {
    console.error("❌ Erro no logout geral:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /api/auth/confirm-email - Confirmar email
router.post("/confirm-email", async (req, res) => {
  try {
    const { token } = req.body;
    console.log("🔍 Tentativa de confirmação de email com token:", token);

    // Primeiro, verificar se o token existe na base de dados
    const tokenCheckResult = await query(
      "SELECT id, email, username, is_email_confirmed FROM users WHERE email_confirmation_token = $1",
      [token],
    );

    console.log(
      "📊 Resultado da busca por token:",
      tokenCheckResult.rows.length > 0
        ? "Token encontrado"
        : "Token não encontrado",
    );

    if (tokenCheckResult.rows.length === 0) {
      console.log("❌ Token não encontrado na base de dados");
      return res.status(400).json({
        error: "Token de confirmação inválido",
      });
    }

    const user = tokenCheckResult.rows[0];
    console.log("👤 Usuário encontrado:", {
      id: user.id,
      email: user.email,
      is_confirmed: user.is_email_confirmed,
    });

    if (user.is_email_confirmed) {
      console.log(
        "✅ Email já confirmado anteriormente - permitindo acesso para completar fluxo",
      );

      // Gerar token de autenticação para usuário já confirmado
      const authToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      // Sessão será gerenciada pelo frontend via localStorage

      return res.json({
        message: "Email já confirmado - acesso liberado",
        token: authToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
        isFirstLogin: true,
        redirectTo: "/faction-selection",
      });
    }

    // Buscar usuário pelo token apenas se não estiver confirmado
    const userResult = await query(
      "SELECT id, email, username FROM users WHERE email_confirmation_token = $1 AND is_email_confirmed = false",
      [token],
    );

    if (userResult.rows.length === 0) {
      console.log(
        "❌ Erro inesperado: usuário não encontrado na segunda consulta",
      );
      return res.status(400).json({
        error: "Erro interno na confirmação",
      });
    }

    const confirmedUser = userResult.rows[0];
    console.log("✅ Confirmando email para usuário:", confirmedUser.email);

    // Confirmar email mas manter o token por mais tempo para permitir o fluxo completo
    await query("UPDATE users SET is_email_confirmed = true WHERE id = $1", [
      confirmedUser.id,
    ]);

    // Agendar invalidação do token após 30 minutos para dar tempo ao usuário
    setTimeout(
      async () => {
        try {
          await query(
            "UPDATE users SET email_confirmation_token = NULL WHERE id = $1 AND email_confirmation_token = $2",
            [confirmedUser.id, token],
          );
          console.log(
            "🕐 Token de confirmação invalidado após timeout para usuário:",
            confirmedUser.email,
          );
        } catch (error) {
          console.error(
            "❌ Erro ao invalidar token após timeout:",
            error.message,
          );
        }
      },
      30 * 60 * 1000,
    ); // 30 minutos

    console.log("✅ Email confirmado com sucesso na base de dados");

    // Enviar email de boas-vindas
    try {
      await emailService.sendWelcomeEmail(
        confirmedUser.email,
        confirmedUser.username,
      );
      console.log("📧 Email de boas-vindas enviado");
    } catch (emailError) {
      console.error(
        "❌ Erro ao enviar email de boas-vindas:",
        emailError.message,
      );
    }

    // Gerar token de autenticação após confirmação
    const authToken = jwt.sign(
      {
        userId: confirmedUser.id,
        email: confirmedUser.email,
        username: confirmedUser.username,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // Sessão será gerenciada pelo frontend via localStorage
    console.log("🔑 Token JWT gerado para usuário:", confirmedUser.email);

    console.log("🎉 Confirmação de email concluída com sucesso");
    res.json({
      message: "Email confirmado com sucesso",
      token: authToken, // Enviamos o token para permitir login automático
      user: {
        id: confirmedUser.id,
        email: confirmedUser.email,
        username: confirmedUser.username,
      },
      isFirstLogin: true, // Indica que é o primeiro login
      redirectTo: "/faction-selection", // Redireciona para seleção de facção
    });
  } catch (error) {
    console.error("❌ Erro na confirmação de email:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /api/auth/resend-confirmation - Reenviar email de confirmação
router.post("/resend-confirmation", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email é obrigatório" });
    }

    // Buscar usuário
    const userResult = await query(
      "SELECT id, email, username, is_email_confirmed, last_confirmation_email_sent FROM users WHERE email = $1",
      [email],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const user = userResult.rows[0];

    if (user.is_email_confirmed) {
      return res.status(400).json({ error: "Email já foi confirmado" });
    }

    // Verificar rate limiting (1 minuto)
    if (user.last_confirmation_email_sent) {
      const lastSent = new Date(user.last_confirmation_email_sent);
      const now = new Date();
      const timeDiff = (now - lastSent) / 1000; // diferença em segundos

      if (timeDiff < 60) {
        const remainingTime = Math.ceil(60 - timeDiff);
        return res.status(429).json({
          error: `Aguarde ${remainingTime} segundos antes de solicitar um novo email de confirmação`,
        });
      }
    }

    // Gerar novo token
    const confirmationToken = emailService.generateConfirmationToken();

    // Atualizar token e timestamp do último envio no banco
    await query(
      "UPDATE users SET email_confirmation_token = $1, last_confirmation_email_sent = NOW() WHERE id = $2",
      [confirmationToken, user.id],
    );

    // Enviar email
    await emailService.sendConfirmationEmail(user.email, confirmationToken);

    res.json({ message: "Email de confirmação reenviado com sucesso" });
  } catch (error) {
    console.error("❌ Erro ao reenviar confirmação:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /api/auth/forgot-password - Solicitar recuperação de senha
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email é obrigatório" });
    }

    // Buscar usuário
    const userResult = await query(
      "SELECT id, email, username FROM users WHERE email = $1",
      [email],
    );

    // Sempre retornar sucesso por segurança (não revelar se email existe)
    if (userResult.rows.length === 0) {
      return res.json({
        message: "Se o email existir, você receberá instruções de recuperação",
      });
    }

    const user = userResult.rows[0];

    // Gerar token de recuperação
    const resetToken = emailService.generateConfirmationToken();
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // Expira em 1 hora

    // Salvar token no banco
    await query(
      "UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3",
      [resetToken, resetExpires, user.id],
    );

    // Enviar email
    await emailService.sendPasswordResetEmail(user.email, resetToken);

    res.json({
      message: "Se o email existir, você receberá instruções de recuperação",
    });
  } catch (error) {
    console.error("❌ Erro na recuperação de senha:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /api/auth/reset-password - Redefinir senha
router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Token é obrigatório"),
    body("password")
      .isLength({ min: 8 })
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      )
      .withMessage(
        "Senha deve ter pelo menos 8 caracteres, incluindo maiúscula, minúscula, número e símbolo",
      ),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: errors.array(),
        });
      }

      const { token, password } = req.body;

      // Buscar usuário pelo token
      const userResult = await query(
        "SELECT id FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()",
        [token],
      );

      if (userResult.rows.length === 0) {
        return res.status(400).json({ error: "Token inválido ou expirado" });
      }

      const user = userResult.rows[0];

      // Hash da nova senha
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Atualizar senha e limpar token
      await query(
        "UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2",
        [passwordHash, user.id],
      );

      // Invalidar todas as sessões do usuário
      await invalidateAllSessions(user.id);

      res.json({ message: "Senha redefinida com sucesso" });
    } catch (error) {
      console.error("❌ Erro na redefinição de senha:", error.message);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },
);

// GET /api/auth/me - Obter dados do usuário logado
router.get("/me", authenticateToken, async (req, res) => {
  try {
    // Buscar perfil do usuário
    const profileResult = await query(
      "SELECT * FROM user_profiles WHERE user_id = $1",
      [req.user.id],
    );

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        username: req.user.username,
        profile: profileResult.rows[0] || null,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar dados do usuário:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /api/auth/check-email - Verificar se um email existe e está confirmado
router.post("/check-email", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email não fornecido" });
    }

    console.log(`Verificando email: ${email}`);

    // Buscar usuário pelo email
    const userResult = await query(
      "SELECT id, email, is_email_confirmed FROM users WHERE email = $1",
      [email],
    );

    // Verificar se encontrou algum usuário
    const exists = userResult.rows.length > 0;
    const confirmed = exists ? userResult.rows[0].is_email_confirmed : false;

    console.log(`Email: ${email}, Existe: ${exists}, Confirmado: ${confirmed}`);
    if (exists) {
      const user = userResult.rows[0];
      console.log(
        `Detalhes do usuário: ID=${user.id}, Email confirmado: ${user.is_email_confirmed}`,
      );
    }

    // Retornar o resultado
    return res.json({
      exists,
      confirmed,
    });
  } catch (error) {
    console.error("Erro ao verificar email:", error);
    return res.status(500).json({ error: "Erro ao verificar email" });
  }
});

// Google OAuth
const stateStore = new Map();

function base64url(input) {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function getRedirectUri(req) {
  const q = req.query.redirect_uri || req.body?.redirect_uri;
  if (q) return q;
  const frontend = process.env.FRONTEND_URL || "http://localhost:5173";
  return `${frontend.replace(/\/+$/, "")}/auth/google/callback`;
}

function getNext(req) {
  return req.query.next || req.body?.next || "/faction-selection";
}

async function exchangeCodeForTokens(code, redirectUri, codeVerifier) {
  const params = new url.URLSearchParams();
  params.set("client_id", process.env.GOOGLE_CLIENT_ID || "");
  params.set("client_secret", process.env.GOOGLE_CLIENT_SECRET || "");
  params.set("code", code);
  params.set("redirect_uri", redirectUri);
  params.set("grant_type", "authorization_code");
  if (codeVerifier) {
    params.set("code_verifier", codeVerifier);
  }

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!r.ok) {
    const errorBody = await r.text();
    console.error("Google token exchange failed:", errorBody);
    throw new Error(`Google API Error: ${errorBody}`);
  }
  return await r.json();
}

function decodeIdToken(token) {
  if (!token) {
    console.error("decodeIdToken failed: received null or undefined token");
    throw new Error("ID token is missing");
  }
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid ID token format");
    }
    const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(payload);
  } catch (e) {
    console.error("Failed to decode id_token", e);
    throw new Error(`Failed to decode id_token: ${e.message}`);
  }
}

router.get("/google/start", (req, res) => {
  try {
    const { code_challenge, code_challenge_method } = req.query;

    const state = base64url(crypto.randomBytes(16));
    const redirectUri = getRedirectUri(req);
    const next = getNext(req);
    const intent = req.query.intent || "login";
    stateStore.set(state, { redirectUri, next, intent });

    const params = new url.URLSearchParams();
    params.set("client_id", process.env.GOOGLE_CLIENT_ID || "");
    params.set("redirect_uri", redirectUri);
    params.set("response_type", "code");
    params.set(
      "scope",
      "openid email profile https://www.googleapis.com/auth/userinfo.profile",
    );
    params.set("state", state);
    if (code_challenge && code_challenge_method) {
      params.set("code_challenge", code_challenge);
      params.set("code_challenge_method", code_challenge_method);
    }
    params.set("access_type", "offline");
    params.set("prompt", "consent");

    const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.redirect(302, googleUrl);
  } catch (e) {
    console.error("Google start error:", e);
    res.status(500).json({ error: "google_start_failed" });
  }
});

router.post("/google/callback", async (req, res) => {
  const { code, redirect_uri, code_verifier } = req.body;
  if (!code || !redirect_uri) {
    return res.status(400).json({ error: "Missing code or redirect_uri" });
  }

  try {
    const tokens = await exchangeCodeForTokens(
      code,
      redirect_uri,
      code_verifier,
    );
    if (!tokens || !tokens.id_token) {
      return res.status(500).json({ error: "token_exchange_failed" });
    }

    const profile = decodeIdToken(tokens.id_token);
    const email = profile.email || "";
    if (!email) {
      return res.status(400).json({ error: "email_required" });
    }

    const emailRes = await query(
      "SELECT id, email, username, is_email_confirmed FROM users WHERE email = $1",
      [email],
    );

    const isNewUser = emailRes.rows.length === 0;
    console.log(
      `[AUTH_DEBUG] Verificando usuário: ${email}. É novo? ${isNewUser}`,
    );

    let userId;
    let isFirstLogin = false;
    if (isNewUser) {
      // User does not exist, create them automatically
      console.log(`[AUTH_DEBUG] Usuário novo com email ${email}. Criando...`);
      const unameBase =
        (profile.name || email.split("@")[0] || "user")
          .replace(/[^a-zA-Z0-9_]/g, "_")
          .slice(0, 20) || "user";
      let uname = unameBase;
      let isUnameUnique = false;
      for (let tries = 0; tries < 100; tries++) {
        const finalUname =
          tries === 0
            ? unameBase
            : `${unameBase.slice(0, 18 - String(tries).length)}${tries}`;
        const exists = await query("SELECT 1 FROM users WHERE username = $1", [
          finalUname,
        ]);
        if (exists.rows.length === 0) {
          uname = finalUname;
          isUnameUnique = true;
          break;
        }
      }

      if (!isUnameUnique) {
        // Se não encontrar um nome único após 100 tentativas, adiciona um hash aleatório
        uname = `${unameBase.slice(0, 10)}_${crypto.randomBytes(4).toString("hex")}`;
      }
      const rnd = crypto.randomBytes(16).toString("hex");
      const hash = await bcrypt.hash(rnd, 12);

      let country = null;
      try {
        // TENTATIVA 3: Obter país via API de GeoIP
        // Pega o IP do header (produção) ou da conexão (desenvolvimento)
        const ip = (
          req.headers["x-forwarded-for"] ||
          req.socket.remoteAddress ||
          ""
        )
          .split(",")[0]
          .trim();
        console.log(`[AUTH_DEBUG] IP detectado para GeoIP: ${ip}`);

        // Evita chamar a API para IPs locais/inválidos
        if (ip && ip !== "::1" && ip !== "127.0.0.1") {
          const geoResponse = await axios.get(
            `http://ip-api.com/json/${ip}?fields=status,message,countryCode`,
          );
          if (
            geoResponse.data &&
            geoResponse.data.status === "success" &&
            geoResponse.data.countryCode
          ) {
            country = geoResponse.data.countryCode.toUpperCase();
            console.log(
              `[AUTH_DEBUG] País detectado via GeoIP API: ${country}`,
            );
          } else {
            console.log(
              `[AUTH_DEBUG] Resposta da API GeoIP não continha país:`,
              geoResponse.data.message || "sem mensagem",
            );
          }
        } else {
          console.log(
            `[AUTH_DEBUG] IP local ou inválido, pulando busca de país.`,
          );
        }
      } catch (geoError) {
        console.error(
          `[AUTH_DEBUG] Erro ao buscar país via GeoIP: ${geoError.message}. O cadastro continuará sem país.`,
        );
        country = null; // Garante que o cadastro não falhe por erro na API de geo
      }

      const ins = await transaction(async (client) => {
        const userResult = await client.query(
          `INSERT INTO users (email, username, password_hash, is_email_confirmed, country) 
           VALUES ($1, $2, $3, true, $4) RETURNING id`,
          [email, uname, hash, country],
        );
        const newUserId = userResult.rows[0].id;
        // Perfil será criado na escolha da facção
        return { id: newUserId };
      });
      userId = ins.id;
      isFirstLogin = true;
    } else {
      // User exists, proceed with login
      userId = emailRes.rows[0].id;
      const profileResult = await query(
        "SELECT 1 FROM user_profiles WHERE user_id = $1",
        [userId],
      );
      if (profileResult.rows.length === 0) {
        isFirstLogin = true;
        console.log(
          `[AUTH_DEBUG] Usuário existente sem perfil. Forçando isFirstLogin = true.`,
        );
      } else {
        isFirstLogin = false; // Garantir que seja false se o perfil existir
        console.log(
          `[AUTH_DEBUG] Usuário existente com perfil. isFirstLogin = false.`,
        );
      }
    }

    // Passo Final: Gerar um token de sessão da NOSSA aplicação, como no login manual
    console.log(
      `[AUTH_DEBUG] Gerando token de aplicação para o usuário: ${userId}`,
    );
    const appToken = generateToken(userId);

    // Criar a sessão no nosso banco de dados
    await createSession(userId, appToken);

    console.log(
      `[AUTH_DEBUG] Sessão criada. Valor FINAL de isFirstLogin a ser enviado: ${isFirstLogin}`,
    );

    res.json({
      message: isFirstLogin
        ? "Usuário criado com sucesso via Google."
        : "Login com Google bem-sucedido.",
      token: appToken, // O token da nossa aplicação para o frontend
      isFirstLogin,
      next: getNext(req),
    });
  } catch (e) {
    console.error("Google POST callback error:", e);
    res.status(500).json({ error: `CALLBACK_FAIL: ${e.message}` });
  }
});

module.exports = router;
