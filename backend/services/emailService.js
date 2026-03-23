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
    const fromEmail = `Urban Clash Team <${process.env.EMAIL_FROM}>`;

    if (apiKey && fromEmail) {
      this.resend = new Resend(apiKey);
      this.isEmailConfigured = true;
      console.log("✅ Email configurado com Resend.");
    } else {
      console.log(
        "⚠️  Email não configurado. Verifique RESEND_API_KEY e EMAIL_FROM.",
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

    const fromEmail = process.env.EMAIL_FROM;
    const replyToEmail = process.env.EMAIL_REPLY_TO;

    try {
      await this.resend.emails.send({
        from: fromEmail,
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
    const html = `<div><h2>Bem-vindo, ${username}!</h2><p>Sua conta foi ativada com sucesso!</p></div>`;
    return await this.sendEmail(email, "Bem-vindo ao Urban Clash Team!", html);
  }

  // TODO: Implementar a lógica de envio de aviso de rodada
  async sendRoundWarningEmail(email, roundInfo) {
    const subject = `Atenção: A rodada ${roundInfo.name} está prestes a começar!`;
    const html = `<div><h2>Aviso de Rodada</h2><p>A rodada ${roundInfo.name} começará em breve. Prepare-se!</p></div>`;
    return await this.sendEmail(email, subject, html);
  }
}

module.exports = new EmailService();
