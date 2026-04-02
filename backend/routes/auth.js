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
const { getGameState } = require("../services/gameStateService");
const { loadPlayerState } = require("../services/playerStateService");

const router = express.Router();
const crypto = require("crypto");
const { google } = require("googleapis");
const url = require("url");

// Configuração do Cliente OAuth2
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  // A URI de redirecionamento é gerenciada no frontend, mas precisa ser autorizada no Google Console
);

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

// POST /api/auth/check-email - Verificar se o email já existe
router.post(
  "/check-email",
  [body("email").isEmail().normalizeEmail().withMessage("Email inválido")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Email inválido",
          details: errors.array(),
        });
      }

      const { email } = req.body;
      const emailExists = await query("SELECT id, is_email_confirmed FROM users WHERE email = $1", [
        email,
      ]);
      
      if (emailExists.rows.length > 0) {
        res.json({ 
          exists: true, 
          confirmed: emailExists.rows[0].is_email_confirmed 
        });
      } else {
        res.json({ exists: false, confirmed: false });
      }
    } catch (error) {
      console.error("❌ Erro ao verificar email:", error.message);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },
);

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
      "SELECT id, email, username, password_hash, is_email_confirmed, google_id FROM users WHERE email = $1",
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

    console.log("👤 Verificando status de confirmação de email para:", {
      email: user.email,
      is_email_confirmed: user.is_email_confirmed,
    });
    // Verificar se email foi confirmado ANTES de checar a senha
    if (!user.is_email_confirmed) {
      return res.status(403).json({
        error: "Email não confirmado",
        message: "Por favor, confirme seu email antes de fazer login. Verifique sua caixa de entrada.",
      });
    }

    // Verificar senha
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ 
        error: "Senha incorreta",
        message: "Email ou senha incorretos. Você tem cadastro conosco, mas a senha informada não coincide. Deseja recuperar sua senha?" 
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

    const { password_hash, ...userWithoutPassword } = user;

    // Gerar token JWT
    const token = generateToken(user.id);

    // Criar sessão no banco
    await createSession(user.id, token);

    // Atualizar último login (comentado temporariamente pois a coluna last_login não existe na tabela user_profiles)
    /*
    await query(
      "UPDATE user_profiles SET last_login = NOW() WHERE user_id = $1",
      [user.id],
    );
    */

    const gameState = await getGameState();

    // Buscar perfil do usuário (reutilizando a consulta se possível ou fazendo uma nova)
    const profileResult = await query(
      "SELECT * FROM user_profiles WHERE user_id = $1",
      [user.id],
    );

    res.json({
      token,
      user: { ...userWithoutPassword, profile: profileResult.rows[0] || null },
      gameState,
      isFirstLogin,
    });
  } catch (error) {
    console.error("❌ Erro no login:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Rota para iniciar o fluxo de autenticação do Google
router.get("/google/start", (req, res) => {
  try {
    const { code_challenge, code_challenge_method, intent, redirect_uri, country } =
      req.query;

    if (!code_challenge || !redirect_uri) {
      return res.status(400).json({
        error: "Parâmetros code_challenge e redirect_uri são obrigatórios",
      });
    }

    const scopes = [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ];

    // Criar uma nova instância ou garantir que a URI seja passada corretamente
    // para evitar problemas de concorrência em produção
    const authUrlClient = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri,
    );

    const authorizeUrl = authUrlClient.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "select_account",
      // Passa o intent E o país no state para sobreviver ao redirecionamento do Google
      state: JSON.stringify({ intent, country: country || null }),
      code_challenge: code_challenge,
      code_challenge_method: code_challenge_method || "S256",
    });

    // Em vez de retornar a URL como JSON, redireciona o usuário diretamente
    res.redirect(authorizeUrl);
  } catch (error) {
    console.error("❌ Erro ao iniciar autenticação Google:", error.message);
    res.status(500).json({ error: "Erro ao iniciar autenticação com Google" });
  }
});

// Rota de callback do Google
router.post("/google/callback", async (req, res) => {
  const { code, code_verifier, intent: bodyIntent, redirect_uri, country: bodyCountry, state: stateStr } = req.body;

  // Extrair intent e country do parâmetro 'state' (mais confiável, sobrevive ao redirect)
  let intent = bodyIntent || "login";
  let countryFromState = bodyCountry || null;
  try {
    if (stateStr) {
      const stateObj = JSON.parse(stateStr);
      if (stateObj.intent) intent = stateObj.intent;
      if (stateObj.country) countryFromState = stateObj.country;
    }
  } catch(e) { /* ignora JSON inválido */ }

  if (!code || !code_verifier) {
    return res
      .status(400)
      .json({ error: "Código de autorização e verificador são obrigatórios" });
  }

  try {
    console.log("DEBUG: 1. Iniciando try-catch no Google Callback.");
    console.log("DEBUG: req.body:", req.body);

    // Criar cliente específico para esta transação de callback
    const callbackClient = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri,
    );

    // Trocar o código por tokens
    const { tokens } = await callbackClient.getToken({
      code: code,
      codeVerifier: code_verifier,
    });
    callbackClient.setCredentials(tokens);
    console.log("DEBUG: 3. Tokens obtidos com sucesso.");

    // Obter informações do usuário
    const oauth2 = google.oauth2({ version: "v2", auth: callbackClient });
    const { data: userInfo } = await oauth2.userinfo.get();
    console.log("DEBUG: 4. Informações do usuário Google obtidas:", userInfo);

    // Função auxiliar para validar e normalizar o código do país
    const getValidCountryCode = (code) => {
      if (typeof code !== 'string' || code.length < 2 || code.length > 3) return null;
      const upperCode = code.toUpperCase();
      // Adicionar uma lista de códigos válidos seria ideal, mas por agora validamos o formato
      if (upperCode.match(/^[A-Z]{2,3}$/)) {
        return upperCode;
      }
      return null;
    };

    // Lógica de determinação de país com ordem de precedência
    let country = null;

    // 1. Prioridade máxima: País enviado pelo frontend (via state)
    if (countryFromState) {
      country = getValidCountryCode(countryFromState);
      console.log(`DEBUG: País determinado via state do frontend: ${country}`);
    }

    // 2. Segunda prioridade: Inferência via Google locale
    if (!country && userInfo.locale) {
      const localeParts = userInfo.locale.split(/[-_]/);
      const regionCode = localeParts.length > 1 ? localeParts[localeParts.length - 1] : localeParts[0];
      country = getValidCountryCode(regionCode);
      console.log(`DEBUG: País inferido do locale '${userInfo.locale}': ${country}`);
    }

    // 3. Terceira prioridade: Fallback via header do Cloudflare
    if (!country && req.headers['cf-ipcountry']) {
      const cfCountry = req.headers['cf-ipcountry'];
      // Ignorar valores inválidos como 'XX' ou 'T1'
      if (cfCountry !== 'XX' && cfCountry !== 'T1') {
        country = getValidCountryCode(cfCountry);
        console.log(`DEBUG: País obtido do header Cloudflare 'cf-ipcountry': ${country}`);
      }
    }
    
    console.log(`DEBUG: País final determinado para o usuário: ${country}`);

    const { id: google_id, email, name, picture } = userInfo;
    console.log("DEBUG: 5. google_id:", google_id, "email:", email);

    if (!email) {
      console.log("DEBUG: 6. Email não retornado pela Google.");
      return res.status(400).json({ error: "Email não retornado pela Google" });
    }

    // Verificar se o usuário já existe
    console.log("DEBUG: 7. Verificando usuário por google_id:", google_id);
    let userResult = await query("SELECT * FROM users WHERE google_id = $1", [
      google_id,
    ]);
    let user = userResult.rows[0];
    let isFirstLogin = false;
    console.log("DEBUG: 8. Resultado da busca por google_id:", user);

    if (!user) {
      console.log(
        "DEBUG: 9. Usuário não encontrado por google_id. Tentando por email:",
        email,
      );
      // Se não encontrou por google_id, tenta por email para vincular contas
      userResult = await query("SELECT * FROM users WHERE email = $1", [email]);
      user = userResult.rows[0];
      console.log("DEBUG: 10. Resultado da busca por email:", user);

      if (user) {
        console.log(
          "DEBUG: 11. Usuário encontrado por email. Vinculando Google ID.",
        );
        // Usuário com este email já existe, vincular a conta Google
        // E também atualizar o país se ele estiver nulo, usando o valor determinado
        const updateResult = await query(
          `UPDATE users SET 
           google_id = $1, 
           is_email_confirmed = TRUE,
           country = COALESCE(users.country, $3)
           WHERE id = $2 RETURNING *`,
          [google_id, user.id, country],
        );
        user = updateResult.rows[0]; // Atualiza o objeto user com os dados do BD
        console.log(
          `DEBUG: 12. Conta vinculada. País atualizado para ${user.country} se era nulo.`,
        );
      } else {
        console.log("DEBUG: 13. Usuário não existe. Criando novo usuário.");
        // Usuário não existe, criar um novo
        isFirstLogin = true;
        let baseUsername = name.replace(/\s/g, "_").substring(0, 10); // Substitui espaços por _ e limita a 10 caracteres
        if (!baseUsername) {
          baseUsername = "user"; // Fallback se o nome estiver vazio
        }
        let uniqueUsername = baseUsername;
        let counter = 0;
        let usernameExistsInDb = true;

        while (usernameExistsInDb) {
          const existingUsernameCheck = await query(
            "SELECT id FROM users WHERE username = $1",
            [uniqueUsername],
          );
          if (existingUsernameCheck.rows.length === 0) {
            usernameExistsInDb = false;
          } else {
            counter++;
            uniqueUsername = `${baseUsername}${counter}`;
          }
        }

        const newUserResult = await query(
          `INSERT INTO users (username, email, google_id, is_email_confirmed, country)
           VALUES ($1, $2, $3, true, $4) RETURNING *`,
          [uniqueUsername, email, google_id, country],
        );
        user = newUserResult.rows[0];
        console.log("DEBUG: 14. Novo usuário criado:", user);
      }
    } else {
      // Usuário já existe e logou com Google antes. Apenas atualiza o país se necessário.
      if (country && !user.country) {
        console.log("DEBUG: Usuário existente sem país, atualizando.");
        const updateResult = await query(
          `UPDATE users 
           SET country = $2
           WHERE id = $1
           RETURNING *`,
          [user.id, country]
        );
        user = updateResult.rows[0];
        console.log("DEBUG: País do usuário existente atualizado:", user);
      }
    }

    console.log("DEBUG: 15. Usuário final para login:", user);
    // A partir daqui, 'user' existe e está logado
    const token = generateToken(user.id);
    console.log("DEBUG: 16. Token JWT gerado.");
    await createSession(user.id, token);
    console.log("DEBUG: 17. Sessão criada.");

    // Buscar perfil para retornar ao frontend
    const profileResult = await query(
      "SELECT * FROM user_profiles WHERE user_id = $1",
      [user.id],
    );
    console.log("DEBUG: 18. Perfil do usuário buscado:", profileResult.rows[0]);

    // Se é o primeiro login, o perfil ainda não existe
    if (profileResult.rows.length === 0) {
      isFirstLogin = true;
      console.log(
        "DEBUG: 19. isFirstLogin definido como true (perfil não encontrado).",
      );
    }

    console.log("DEBUG: 20. Enviando resposta JSON.");
    const gameState = await getGameState();
    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      token,
      user: { ...userWithoutPassword, profile: profileResult.rows[0] || null },
      gameState,
      isFirstLogin,
    });
  } catch (error) {
    console.error("❌ Erro no callback do Google:", error.message);
    if (error.response?.data) {
      console.error("Detalhes do erro da API Google:", error.response.data);
    }
    res.status(500).json({ error: "Falha na autenticação com Google" });
  }
});

// POST /api/auth/logout - Logout do usuário
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    await invalidateSession(req.user.id, token);
    
    // Retorna o gameState público para que a página de redirecionamento (Home)
    // possa renderizar o cronômetro imediatamente sem nova requisição.
    const gameState = await getGameState();
    res.json({ message: "Logout bem-sucedido", gameState });
  } catch (error) {
    console.error("❌ Erro no logout:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// GET /api/auth/me - Obter informações do usuário autenticado
router.get("/me", authenticateToken, async (req, res) => {
  try {
    // O middleware authenticateToken já adicionou o user.id ao req.user
    const userResult = await query(
      "SELECT id, email, username, is_email_confirmed, google_id FROM users WHERE id = $1",
      [req.user.id],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const user = userResult.rows[0];

    // Buscar perfil do usuário
    const profileResult = await query(
      "SELECT * FROM user_profiles WHERE user_id = $1",
      [user.id],
    );

    const gameState = await getGameState();

    res.json({
      user: { ...user, profile: profileResult.rows[0] || null },
      gameState
    });
  } catch (error) {
    console.error("❌ Erro ao obter informações do usuário:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /api/auth/confirm-email - Confirmar email
router.post("/confirm-email", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res
      .status(400)
      .json({ error: "Token de confirmação é obrigatório" });
  }

  try {
    const userResult = await query(
      "SELECT id, email, username, is_email_confirmed, google_id FROM users WHERE email_confirmation_token = $1",
      [token],
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: "Token de confirmação inválido" });
    }

    const user = userResult.rows[0];

    await query(
      "UPDATE users SET is_email_confirmed = TRUE, email_confirmation_token = NULL WHERE id = $1",
      [user.id],
    );

    // Auto-login: Gera sessão e token imediatamente para evitar redirecionamento para Home deslogado
    const authToken = generateToken(user.id);
    await createSession(user.id, authToken);

    // Verifica se é o primeiro acesso (sem perfil)
    const profileResult = await query(
      "SELECT id FROM user_profiles WHERE user_id = $1",
      [user.id]
    );
    const isFirstLogin = profileResult.rows.length === 0;
    const gameState = await getGameState();

    // Constrói a resposta base
    const response = {
      message: "Email confirmado com sucesso",
      token: authToken,
      user: { ...user, is_email_confirmed: true, profile: null },
      gameState,
      isFirstLogin,
    };

    // Se for o primeiro login, adiciona o campo de redirecionamento
    if (isFirstLogin) {
      response.redirectTo = "/faction-selection";
    }

    res.json(response);
  } catch (error) {
    console.error("❌ Erro ao confirmar email:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /api/auth/resend-confirmation - Reenviar email de confirmação
router.post("/resend-confirmation", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email é obrigatório" });
  }

  try {
    const userResult = await query(
      "SELECT id, is_email_confirmed FROM users WHERE email = $1",
      [email],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const user = userResult.rows[0];

    if (user.is_email_confirmed) {
      return res.status(400).json({ error: "Email já confirmado" });
    }

    const newConfirmationToken = emailService.generateConfirmationToken();

    await query(
      "UPDATE users SET email_confirmation_token = $1 WHERE id = $2",
      [newConfirmationToken, user.id],
    );

    await emailService.sendConfirmationEmail(email, newConfirmationToken);

    res.json({ message: "Email de confirmação reenviado com sucesso" });
  } catch (error) {
    console.error("❌ Erro ao reenviar email de confirmação:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /api/auth/forgot-password - Solicitar redefinição de senha
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email é obrigatório" });
  }

  try {
    const userResult = await query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);

    if (userResult.rows.length === 0) {
      // Para segurança, não informar se o email existe ou não
      return res.json({
        message:
          "Se o email estiver registrado, um link de redefinição será enviado.",
      });
    }

    const userId = userResult.rows[0].id;
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hora

    await query(
      "UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3",
      [resetToken, resetTokenExpires, userId],
    );

    await emailService.sendPasswordResetEmail(email, resetToken);

    res.json({
      message:
        "Se o email estiver registrado, um link de redefinição será enviado.",
    });
  } catch (error) {
    console.error("❌ Erro ao solicitar redefinição de senha:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /api/auth/reset-password - Redefinir senha
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res
      .status(400)
      .json({ error: "Token e nova senha são obrigatórios" });
  }

  try {
    const userResult = await query(
      "SELECT id FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()",
      [token],
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: "Token inválido ou expirado" });
    }

    const userId = userResult.rows[0].id;
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await query(
      "UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2",
      [passwordHash, userId],
    );

    res.json({ message: "Senha redefinida com sucesso" });
  } catch (error) {
    console.error("❌ Erro ao redefinir senha:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

module.exports = router;