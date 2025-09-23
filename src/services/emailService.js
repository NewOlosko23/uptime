import { Resend } from "resend";

const resend = new Resend("re_Pdqo6bbP_4ZrnS2GovxanQZJd3eng6edS");

// Email templates
const templates = {
  emailVerification: (data) => ({
    subject: "Verify your email address",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify your email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3175e3; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; background: #3175e3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Avodal Uptime</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.name}!</h2>
              <p>Thank you for signing up for Avodal Uptime. To complete your registration, please verify your email address by clicking the button below:</p>
              <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p>${data.verificationUrl}</p>
              <p>This link will expire in 24 hours.</p>
            </div>
            <div class="footer">
              <p>If you didn't create an account with Avodal Uptime, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  passwordReset: (data) => ({
    subject: "Reset your password",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset your password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3175e3; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; background: #3175e3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.name}!</h2>
              <p>We received a request to reset your password for your Avodal Uptime account. Click the button below to reset your password:</p>
              <a href="${data.resetUrl}" class="button">Reset Password</a>
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p>${data.resetUrl}</p>
              <div class="warning">
                <strong>Important:</strong> This link will expire in 10 minutes for security reasons.
              </div>
              <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from Avodal Uptime.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  monitorAlert: (data) => ({
    subject: `🚨 Monitor Alert: ${data.monitorName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Monitor Alert</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${
              data.status === "down" ? "#ef4444" : "#22c55e"
            }; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .status { display: inline-block; padding: 8px 16px; border-radius: 20px; color: white; font-weight: bold; }
            .status.up { background: #22c55e; }
            .status.down { background: #ef4444; }
            .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Monitor Alert</h1>
            </div>
            <div class="content">
              <h2>${data.alertName}</h2>
              <p>Your monitor <strong>${
                data.monitorName
              }</strong> has triggered an alert.</p>
              
              <div class="details">
                <h3>Monitor Details:</h3>
                <p><strong>URL:</strong> ${data.monitorUrl}</p>
                <p><strong>Status:</strong> <span class="status ${
                  data.status
                }">${data.status.toUpperCase()}</span></p>
                <p><strong>Response Time:</strong> ${data.responseTime}ms</p>
                <p><strong>Last Check:</strong> ${new Date(
                  data.lastCheck
                ).toLocaleString()}</p>
                ${
                  data.errorMessage
                    ? `<p><strong>Error:</strong> ${data.errorMessage}</p>`
                    : ""
                }
              </div>
              
              <p>You can view more details and manage your monitors in your <a href="${
                process.env.CLIENT_URL
              }/dashboard">dashboard</a>.</p>
            </div>
            <div class="footer">
              <p>This is an automated alert from Avodal Uptime.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  incidentUpdate: (data) => ({
    subject: `📢 Incident Update: ${data.incidentTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Incident Update</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3175e3; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .status { display: inline-block; padding: 8px 16px; border-radius: 20px; color: white; font-weight: bold; }
            .status.investigating { background: #f59e0b; }
            .status.identified { background: #ef4444; }
            .status.monitoring { background: #3b82f6; }
            .status.resolved { background: #22c55e; }
            .update { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3175e3; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Incident Update</h1>
            </div>
            <div class="content">
              <h2>${data.incidentTitle}</h2>
              <p><strong>Status:</strong> <span class="status ${
                data.status
              }">${data.status.toUpperCase()}</span></p>
              
              <div class="update">
                <h3>Latest Update:</h3>
                <p>${data.updateMessage}</p>
                <p><em>Posted: ${new Date(
                  data.updateTimestamp
                ).toLocaleString()}</em></p>
              </div>
              
              <p>You can view the full incident details on your <a href="${
                process.env.CLIENT_URL
              }/dashboard/incidents">status page</a>.</p>
            </div>
            <div class="footer">
              <p>This is an automated update from Avodal Uptime.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),
};

// Send email function
export const sendEmail = async ({ to, subject, template, data, html }) => {
  try {
    let emailContent;

    if (template && templates[template]) {
      emailContent = templates[template](data);
    } else if (html) {
      emailContent = { subject, html };
    } else {
      throw new Error("Either template or html content must be provided");
    }

    const result = await resend.emails.send({
      from: "Avodal Uptime <noreply@avodal.com>",
      to: Array.isArray(to) ? to : [to],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    console.log("Email sent successfully:", result);
    return result;
  } catch (error) {
    console.error("Email sending failed:", error);
    throw error;
  }
};

// Send monitor alert email
// Send test email for monitor
export const sendTestEmail = async (userEmail, monitor) => {
  try {
    const emailData = {
      alertName: "Test Alert",
      monitorName: monitor.name,
      monitorUrl: monitor.url,
      status: "up",
      responseTime: 150,
      lastCheck: new Date().toISOString(),
      errorMessage: null
    };

    const emailTemplate = templates.monitorAlert(emailData);
    
    const result = await resend.emails.send({
      from: "Avodal Uptime <noreply@avodal.com>",
      to: [userEmail],
      subject: "🧪 Test Email - Monitor Alert",
      html: emailTemplate.html,
    });

    console.log("Test email sent successfully:", result);
    return result;
  } catch (error) {
    console.error("Error sending test email:", error);
    throw error;
  }
};

export const sendMonitorAlert = async (alert, monitor, incident = null) => {
  const recipients = alert.channels.email.recipients.map((r) => r.email);

  const emailData = {
    alertName: alert.name,
    monitorName: monitor.name,
    monitorUrl: monitor.url,
    status: monitor.lastStatus,
    responseTime: monitor.lastResponseTime,
    lastCheck: monitor.lastCheck,
    errorMessage: incident ? incident.description : null,
  };

  return sendEmail({
    to: recipients,
    template: "monitorAlert",
    data: emailData,
  });
};

// Send incident update email
export const sendIncidentUpdate = async (incident, update) => {
  // Get all subscribers for the incident's monitors
  const StatusPage = (await import("../models/StatusPage.js")).default;
  const statusPages = await StatusPage.find({
    monitors: { $in: incident.affectedServices },
  });

  const subscribers = [];
  statusPages.forEach((page) => {
    page.subscribers.forEach((sub) => {
      if (sub.isActive && !subscribers.find((s) => s.email === sub.email)) {
        subscribers.push(sub.email);
      }
    });
  });

  if (subscribers.length === 0) return;

  const emailData = {
    incidentTitle: incident.title,
    status: update.status,
    updateMessage: update.message,
    updateTimestamp: update.timestamp,
  };

  return sendEmail({
    to: subscribers,
    template: "incidentUpdate",
    data: emailData,
  });
};
