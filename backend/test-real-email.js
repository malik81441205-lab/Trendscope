const path = require("path");
require("dotenv").config();

const emailService = require("./services/emailService");

async function run() {
    console.log("--- TEST: Sending Real Transactional Email via Brevo ---");
    console.log(`Using Sender: "${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`);
    
    let res = await emailService.sendVerificationCodeEmail("trendsanalyzer7@gmail.com", "777888");
    console.log("Result:", res);
}

run();
