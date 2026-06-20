const nodemailer = require("nodemailer");
require("dotenv").config();

/**
 * Sends a 6-digit verification code to the user's email address
 * @returns {Promise<{success: boolean, fallbackToConsole: boolean, error: string|null}>}
 */
async function sendVerificationCodeEmail(email, code) {
    console.log(`[EmailService] Attempting to send verification code to ${email}...`);

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    console.log(`[EmailService] SMTP Configuration check - EMAIL_USER: ${emailUser ? "Configured" : "Missing"}, EMAIL_PASS: ${emailPass ? "Configured" : "Missing"}`);

    const isMissingConfig = !emailUser || !emailPass || emailUser === "YOUR_EMAIL_HERE" || emailPass === "YOUR_PASSWORD_HERE";

    const timestamp = new Date().toISOString();
    
    // Function to handle logging OTP to console and writing to scratch-otp.txt
    const fallbackToConsoleAndFile = (isBackup = false) => {
        try {
            const fs = require("fs");
            const path = require("path");
            fs.writeFileSync(
                path.join(__dirname, "..", "scratch-otp.txt"),
                `${email}:${code}\nTimestamp:${timestamp}`
            );
            console.log(`[EmailService] Verification code successfully saved to scratch-otp.txt`);
        } catch (e) {
            console.error(`[EmailService] Failed to write verification code to scratch-otp.txt:`, e.message);
        }

        const label = isBackup ? "✉️  VERIFICATION CODE FOR USER (BACKUP LOG)" : "✉️  VERIFICATION CODE FOR USER";
        console.log("\n════════════════════════════════════════════════════════════════");
        console.log(label);
        console.log(`👉  USER: ${email}`);
        console.log(`👉  CODE: ${code}`);
        console.log(`👉  TIMESTAMP: ${timestamp}`);
        console.log("════════════════════════════════════════════════════════════════\n");
    };

    if (isMissingConfig) {
        console.log(`[EmailService] SMTP credentials are not configured or are set to placeholder values. Falling back to Console and File.`);
        fallbackToConsoleAndFile(false);
        return { success: true, fallbackToConsole: true, error: null };
    }

    const host = "smtp.gmail.com";
    const resolvedAddress = "N/A";

    try {
        console.log(`[EmailService] Initializing SMTP transporter...`);
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            connectionTimeout: 30000,
            greetingTimeout: 30000,
            socketTimeout: 30000
        });

        console.log(`[EmailService] Verifying SMTP transport connection...`);
        try {
            await transporter.verify();
            console.log(`[EmailService] SMTP transporter verify connection: SUCCESS`);
            console.log(`- SMTP Host: ${host}`);
            console.log(`- Resolved Address: ${resolvedAddress}`);
            console.log(`- Status: SUCCESS`);
        } catch (verifyError) {
            console.error(`[EmailService] SMTP transporter verify connection: FAILURE`);
            console.error(`- SMTP Host: ${host}`);
            console.error(`- Resolved Address: ${resolvedAddress}`);
            console.error(`- Error: ${verifyError.message}`);
            throw verifyError;
        }

        const mailOptions = {
            from: `"TrendScope" <${emailUser}>`,
            to: email,
            subject: `${code} is your TrendScope verification code`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background-color: #0b0c10; color: #c5c6c7; border: 1px solid #1f2833; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                    <div style="text-align: center; margin-bottom: 25px;">
                        <h2 style="color: #66fcf1; margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 1px;">TrendScope</h2>
                        <p style="color: #45f3ff; margin: 5px 0 0 0; font-size: 12px; font-weight: 600; text-transform: uppercase;">Premium Analytics</p>
                    </div>
                    <div style="background-color: #1f2833; padding: 25px; border-radius: 6px; border-left: 4px solid #66fcf1; margin-bottom: 25px;">
                        <p style="margin-top: 0; font-size: 15px; line-height: 1.5;">Welcome to TrendScope! Please verify your email address to unlock premium analytics dashboards.</p>
                        <p style="font-size: 14px;">Your verification code is:</p>
                        <div style="text-align: center; margin: 25px 0;">
                            <span style="display: inline-block; font-size: 36px; font-weight: bold; color: #66fcf1; letter-spacing: 8px; padding: 12px 24px; background-color: #0b0c10; border: 1px solid #1f2833; border-radius: 4px; font-family: monospace;">${code}</span>
                        </div>
                        <p style="margin-bottom: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">This code will expire in 15 minutes. If you did not sign up for a TrendScope account, you can safely ignore this email.</p>
                    </div>
                    <div style="text-align: center; font-size: 11px; color: #808080; border-top: 1px solid #1f2833; padding-top: 20px;">
                        © 2026 TrendScope. All rights reserved.
                    </div>
                </div>
            `
        };

        console.log(`[EmailService] Sending email to ${email}...`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`✉️ Email sent successfully to ${email}. Message ID: ${info.messageId}`);
        console.log(`[EmailService] SMTP Transmission Success Status:`);
        console.log(`- SMTP Host: ${host}`);
        console.log(`- Resolved Address: ${resolvedAddress}`);
        console.log(`- Success: true`);
        return { success: true, fallbackToConsole: false, error: null };
    } catch (error) {
        console.error(`❌ Error sending verification email to ${email}:`, error.message);
        console.log(`[EmailService] SMTP Transmission Failure Status:`);
        console.log(`- SMTP Host: ${host}`);
        console.log(`- Resolved Address: ${resolvedAddress}`);
        console.log(`- Success: false`);
        console.log(`- Failure Reason: ${error.message}`);
        console.log(`[EmailService] SMTP transmission failed. Falling back to Console and File.`);
        fallbackToConsoleAndFile(true);
        return { success: false, fallbackToConsole: true, error: error.message };
    }
}

module.exports = { sendVerificationCodeEmail };
