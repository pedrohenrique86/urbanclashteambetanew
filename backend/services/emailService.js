require("dotenv").config();
const { Resend } = require("resend");
const crypto = require("crypto");

class EmailService {
  constructor() {
    try {
      this.frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      this.resend = null;
      this.isEmailConfigured = false;
      this.initializeEmailProvider();
    } catch (error) {
      console.error("❌ Erro ao inicializar o EmailService:", error);
      this.isEmailConfigured = false;
    }
  }

  initializeEmailProvider() {
    const apiKey = process.env.RESEND_API_KEY;
    // Procura por FROM_EMAIL (novo padrão) ou EMAIL_FROM (padrão antigo) para retrocompatibilidade
    const fromEmail = process.env.FROM_EMAIL || process.env.EMAIL_FROM;

    if (apiKey && fromEmail) {
      this.resend = new Resend(apiKey);
      this.isEmailConfigured = true;
      console.log("✅ Email configurado com Resend.");
    } else {
      console.log(
        "⚠️  Email não configurado. Verifique RESEND_API_KEY e (FROM_EMAIL ou EMAIL_FROM).",
      );
      console.log("💡 Emails serão apenas logados no console.");
    }
  }

  generateConfirmationToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  async sendEmail(to, subject, html) {
    if (!this.isEmailConfigured || !this.resend) {
      console.log(`\n📧 [SIMULADO] Email para: ${to}`);
      console.log(`📧 [SIMULADO] Assunto: ${subject}\n`);
      return { success: true, message: "Email simulado no console" };
    }

    const fromAddress = `Urban Clash Team <${process.env.FROM_EMAIL || process.env.EMAIL_FROM}>`;
    const replyToEmail = process.env.EMAIL_REPLY_TO;

    try {
      await this.resend.emails.send({
        from: fromAddress, // CORRIGIDO: Agora usa a variável correta
        to: to,
        subject: subject,
        html: html,
        ...(replyToEmail && { reply_to: replyToEmail }), // Adiciona reply_to se existir
      });
      console.log(`✅ Email enviado para ${to} via Resend.`);
      return { success: true, message: "Email enviado com sucesso" };
    } catch (error) {
      console.error("❌ Erro detalhado ao enviar email via Resend:", error);
      return { success: false, message: "Erro ao enviar email" };
    }
  }

  async sendConfirmationEmail(email, token) {
    const confirmationUrl = `${this.frontendUrl}/confirm-email?token=${token}`;
    const html = `
      <div style="font-family: sans-serif; line-height: 1.5;">
        <h2>Bem-vindo(a) ao Urban Clash Team!</h2>
        <p>Clique no botão abaixo para confirmar seu email e escolher sua facção.</p>
        <p style="margin: 2rem 0;">
          <a href="${confirmationUrl}" style="background-color: #f97316; color: white; padding: 1rem 1.5rem; text-decoration: none; border-radius: 8px; font-weight: bold;">Confirmar Email e Escolher Facção</a>
        </p>
        <p>Se o botão não funcionar, copie e cole o seguinte link no seu navegador:</p>
        <p><a href="${confirmationUrl}">${confirmationUrl}</a></p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0;">
        <p style="font-size: 0.8rem; color: #6b7280;">Você recebeu este email porque se cadastrou no Urban Clash Team. Se você não se cadastrou, por favor, ignore esta mensagem.</p>
      </div>
    `;
    return await this.sendEmail(
      email,
      "Confirme seu email e escolha sua facção",
      html,
    );
  }

  async sendPasswordResetEmail(email, token) {
    const resetUrl = `${this.frontendUrl}/reset-password#type=recovery&token=${token}`;
    const html = `<div><h2>Recuperação de Senha</h2><p>Clique para redefinir: <a href="${resetUrl}">Redefinir Senha</a></p></div>`;
    return await this.sendEmail(
      email,
      "Recuperação de senha - Urban Clash Team",
      html,
    );
  }

  async sendWelcomeEmail(email, username) {
    const subject = "Bem-vindo ao Urban Clash Team!";
    // Constrói a URL completa para a imagem. Essencial para clientes de e-mail.
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3002";
    const bannerUrl = `${backendUrl}/images/banner_boas_vindas.png`;

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
              body { margin: 0; padding: 0; background-color: #121212; font-family: Arial, sans-serif; }
              .container { width: 100%; max-width: 600px; margin: 0 auto; background-color: #1E1E1E; color: #E0E0E0; }
              .header { text-align: center; }
              .header img { max-width: 100%; height: auto; display: block; }
              .content { padding: 20px; text-align: center; }
              .content h1 { color: #f97316; }
              .footer { padding: 20px; text-align: center; font-size: 12px; color: #757575; }
          </style>
      </head>
      <body>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                  <td style="padding: 20px 0;">
                      <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse;" class="container">
                          <tr>
                              <td align="center" class="header">
                                  <img src="${bannerUrl}" alt="Bem-vindo ao Urban Clash Team" />
                              </td>
                          </tr>
                          <tr>
                              <td class="content">
                                  <h1>Bem-vindo(a) à arena, ${username}!</h1>
                              </td>
                          </tr>
                          <tr>
                              <td class="footer">
                                  <p>&copy; ${new Date().getFullYear()} Urban Clash Team. Todos os direitos reservados.</p>
                              </td>
                          </tr>
                      </table>
                  </td>
              </tr>
          </table>
      </body>
      </html>
    `;

    return await this.sendEmail(email, subject, html);
  }

  // TODO: Implementar a lógica de envio de aviso de rodada
  async sendRoundWarningEmail(email, roundInfo) {
    const subject = `Atenção: A rodada ${roundInfo.name} está prestes a começar!`;
    const html = `<div><h2>Aviso de Rodada</h2><p>A rodada ${roundInfo.name} começará em breve. Prepare-se!</p></div>`;
    return await this.sendEmail(email, subject, html);
  }
}

module.exports = new EmailService();
