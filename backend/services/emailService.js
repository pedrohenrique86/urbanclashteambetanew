require("dotenv").config();
const nodemailer = require("nodemailer");
const crypto = require("crypto");

class EmailService {
  constructor() {
    try {
      this.fromEmail = "noreply@urbanclashteam.com";
      this.frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      this.transporter = null;
      this.initializeTransporter();
    } catch (error) {
      console.error("Error initializing EmailService:", error);
      this.transporter = null;
    }
  }

  initializeTransporter() {
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      this.transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true, // use SSL
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });
      console.log("✅ Email configurado com Gmail");
    } else {
      console.log(
        "⚠️  Email não configurado. Emails serão apenas logados no console.",
      );
      console.log("💡 Para configurar Gmail:");
      console.log("   - GMAIL_USER=seu-email@gmail.com");
      console.log("   - GMAIL_APP_PASSWORD=sua-senha-de-app");
    }
  }

  generateConfirmationToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  async sendEmail(to, subject, html) {
    if (!this.transporter) {
      console.log(`📧 [SIMULADO] Email para: ${to}`);
      console.log(`📧 [SIMULADO] Assunto: ${subject}`);
      return { success: true, message: "Email simulado" };
    }

    const mailOptions = {
      from: `"Urban Clash Team" <${process.env.GMAIL_USER}>`,
      replyTo: this.fromEmail,
      to: to,
      subject: subject,
      html: html,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email enviado para ${to}: ${info.messageId}`);
      return { success: true, message: "Email enviado com sucesso" };
    } catch (error) {
      console.error("❌ Erro ao enviar email:", error.message);
      return { success: false, message: "Erro ao enviar email" };
    }
  }

  async sendConfirmationEmail(email, token) {
    const confirmationUrl = `${this.frontendUrl}/confirm-email?token=${token}`;
    const html = `<div><h2>Bem-vindo(a) ao Urban Clash Team!</h2><p>Clique para confirmar seu email e escolher sua facção: <a href="${confirmationUrl}">Confirmar Email e Escolher Facção</a></p></div>`;
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
}

module.exports = new EmailService();
