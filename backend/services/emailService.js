require("dotenv").config();
const sgMail = require("@sendgrid/mail");
const crypto = require("crypto");

class EmailService {
  constructor() {
    try {
      this.frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      this.isEmailConfigured = false;
      this.initializeEmailProvider();
    } catch (error) {
      console.error("❌ Erro ao inicializar o EmailService:", error);
      this.isEmailConfigured = false;
    }
  }

  initializeEmailProvider() {
    const apiKey = process.env.SENDGRID_API_KEY;
    const sender = process.env.SENDGRID_VERIFIED_SENDER;

    if (apiKey && sender) {
      sgMail.setApiKey(apiKey);
      this.isEmailConfigured = true;
      console.log("✅ Email configurado com SendGrid.");
    } else {
      console.log(
        "⚠️  Email não configurado. Verifique SENDGRID_API_KEY e SENDGRID_VERIFIED_SENDER.",
      );
      console.log("💡 Emails serão apenas logados no console.");
    }
  }

  generateConfirmationToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  async sendEmail(to, subject, html, text) {
    if (!this.isEmailConfigured) {
      console.log(`\n📧 [SIMULADO] Email para: ${to}`);
      console.log(`📧 [SIMULADO] Assunto: ${subject}\n`);
      return { success: true, message: "Email simulado no console" };
    }

    const msg = {
      to: to,
      from: {
        name: "Urban Clash Team",
        email: process.env.SENDGRID_VERIFIED_SENDER,
      },
      subject: subject,
      html: html,
      text: text || html.replace(/<[^>]*>?/gm, ""), // Usa o texto passado ou gera a partir do HTML
    };

    try {
      await sgMail.send(msg);
      console.log(`✅ Email enviado para ${to} via SendGrid.`);
      return { success: true, message: "Email enviado com sucesso" };
    } catch (error) {
      console.error("❌ Erro detalhado ao enviar email via SendGrid:", error);
      if (error.response) {
        // O erro do SendGrid vem com detalhes no corpo da resposta
        console.error("❌ Detalhes do erro SendGrid:", error.response.body);
      }
      return { success: false, message: "Erro ao enviar email" };
    }
  }

  async sendConfirmationEmail(email, token) {
    const confirmationUrl = `${this.frontendUrl}/confirm-email?token=${token}`;
    const text = `Bem-vindo(a) ao Urban Clash Team!\n\nPara confirmar seu email e escolher sua facção, copie e cole o seguinte link no seu navegador:\n${confirmationUrl}`;
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
      text,
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
}

module.exports = new EmailService();
