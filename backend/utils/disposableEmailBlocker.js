// Blacklist-based validation system for disposable/temporary email providers
const DISPOSABLE_DOMAINS = new Set([
    "mailinator.com",
    "yopmail.com",
    "tempmail.com",
    "guerrillamail.com",
    "10minutemail.com",
    "dispostable.com",
    "getairmail.com",
    "sharklasers.com",
    "maildrop.cc",
    "temp-mail.org",
    "fakeinbox.com",
    "throwawaymail.com",
    "mailnesia.com",
    "mailcatch.com"
]);

/**
 * Checks if a given email address belongs to a disposable email provider.
 * @param {string} email - The email to check
 * @returns {boolean} - True if it's disposable, false otherwise
 */
function isDisposableEmail(email) {
    if (!email || typeof email !== "string") return false;
    
    const cleanEmail = email.trim().toLowerCase();
    const domain = cleanEmail.split("@")[1];
    
    if (!domain) return false;
    
    return DISPOSABLE_DOMAINS.has(domain);
}

module.exports = {
    isDisposableEmail,
    DISPOSABLE_DOMAINS
};
