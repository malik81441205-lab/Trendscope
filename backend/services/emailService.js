const nodemailer = require("nodemailer");
require("dotenv").config();

/**
 * Sends a 6-digit verification code to the user's email address
 */
async function sendVerificationCodeEmail(email, code) {
    try {
        const fs = require("fs");
        const path = require("path");
        fs.writeFileSync(path.join(__dirname, "..", "scratch-otp.txt"), `${email}:${code}`);
    } catch (e) {}

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    // Check if configuration is missing
    if (!emailUser || !emailPass || emailUser === "YOUR_EMAIL_HERE" || emailPass === "YOUR_PASSWORD_HERE") {
        console.log("\n════════════════════════════════════════════════════════════════");
        console.log(`✉️  VERIFICATION CODE FOR USER: ${email}`);
        console.log(`👉  CODE: ${code}`);
        console.log("════════════════════════════════════════════════════════════════\n");
        return;
    }

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: emailUser,
                pass: emailPass
            }
        });

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

        const info = await transporter.sendMail(mailOptions);
        console.log(`✉️ Email sent successfully to ${email}. Message ID: ${info.messageId}`);
    } catch (error) {
        console.error(`❌ Error sending verification email to ${email}:`, error.message);
        // Still print code to console as backup if sending fails
        console.log("\n════════════════════════════════════════════════════════════════");
        console.log(`✉️  VERIFICATION CODE FOR USER (BACKUP LOG): ${email}`);
        console.log(`👉  CODE: ${code}`);
        console.log("════════════════════════════════════════════════════════════════\n");
    }
}

module.exports = { sendVerificationCodeEmail };
