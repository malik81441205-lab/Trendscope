// ═══════════════════════════════════════════════════════════════
// AUTH GATE SYSTEM — TrendScope Premium Analytics
// Google reCAPTCHA v2 Integration
// ═══════════════════════════════════════════════════════════════

const AuthGate = (() => {


    let _token = null;
    let _user = null;
    let _pendingAction = null;
    let _verificationEmail = '';
    let _recaptchaSiteKey = '';
    let _recaptchaLoginWidgetId = null;
    let _recaptchaSignupWidgetId = null;
    let _recaptchaReady = false;

    // Reserved usernames (mirrored from backend)
    const RESERVED_NAMES = ['admin','administrator','root','system','superadmin','moderator','mod','support','helpdesk','trendscope','vidvoyage','api','null','undefined','test'];

    // ─── Token/User Management ───────────────────────────────
    // JWT token is now stored in HttpOnly cookie (set by server)
    // localStorage only stores non-sensitive user display info
    function getToken() {
        // Token is in HttpOnly cookie — we can't read it from JS
        // We use the presence of user info as a hint that we might be logged in
        // Actual validation happens server-side via the cookie
        if (_token) return _token;
        _token = localStorage.getItem('auth_token');
        return _token;
    }

    function setToken(token, remember) {
        _token = token;
        // Keep a copy in localStorage as a "logged in" indicator
        // The real auth happens via HttpOnly cookie
        localStorage.setItem('auth_token', token);
        if (remember) localStorage.setItem('auth_remember', '1');
    }

    function clearToken() {
        _token = null;
        _user = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_remember');
        localStorage.removeItem('user');
    }

    function getUser() {
        if (_user) return _user;
        try { _user = JSON.parse(localStorage.getItem('user') || 'null'); } catch(e) { _user = null; }
        return _user;
    }

    function setUser(user) {
        _user = user;
        localStorage.setItem('user', JSON.stringify(user));
    }

    function isAuthenticated() {
        return !!getUser() && !!getToken();
    }

    // ─── Auth Fetch (cookies sent automatically) ────────────
    function authFetch(url, opts = {}) {
        // Auto-prepend backend host for relative /api/ calls
        if (url.startsWith('/api/')) {
            url = API_BASE + url;
        }
        // credentials: 'include' ensures HttpOnly cookies are sent cross-origin
        opts.credentials = 'include';
        // Add Authorization header fallback using token from localStorage
        const token = getToken();
        if (token) {
            opts.headers = {
                ...opts.headers,
                'Authorization': `Bearer ${token}`
            };
        }
        return fetch(url, opts);
    }

    function authHeaders() {
        // Kept for backward compatibility but cookies handle auth now
        return {};
    }

    // ─── Session Verification ───────────────────────────────
    async function verifySession() {
        // Try to verify with cookie (sent automatically)
        // Also try localStorage token as fallback indicator
        const hasLocalUser = !!getUser();
        try {
            const res = await fetch(`${API_BASE}/api/verify-token`, { credentials: 'include' });
            if (!res.ok) { clearToken(); onUnauthenticated(); return false; }
            const data = await res.json();
            if (data.valid && data.user) { setUser(data.user); _token = localStorage.getItem('auth_token'); onAuthenticated(); return true; }
            clearToken(); onUnauthenticated(); return false;
        } catch (e) {
            if (!hasLocalUser) { onUnauthenticated(); }
            return false;
        }
    }

    // ─── Gate Interceptor ───────────────────────────────────
    function requireAuth(callback) {
        if (isAuthenticated()) { callback(); return; }
        _pendingAction = callback;
        showModal();
    }

    // ─── UI State Management ────────────────────────────────
    function onAuthenticated() {
        const u = getUser();
        const authContainer = document.getElementById('auth-buttons-container');
        const ud = document.getElementById('user-display');
        
        if (authContainer) authContainer.style.display = 'none';
        
        if (ud && u) {
            const displayName = u.full_name || u.email;
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D8ABC&color=fff&size=64&bold=true`;
            
            ud.innerHTML = `
                <div class="user-profile" title="Click to logout">
                    <img src="${avatarUrl}" alt="Avatar">
                    <div class="user-details">
                        <span class="user-name">${displayName}</span>
                        <span class="user-logout">Logout</span>
                    </div>
                </div>
            `;
            ud.style.display = 'block';
            ud.onclick = () => { logout(); };
        }
        document.querySelectorAll('.analytics-locked').forEach(el => el.classList.remove('analytics-locked'));
        if (typeof window.currentUserId !== 'undefined' && u) window.currentUserId = u.id;
    }

    function onUnauthenticated() {
        const authContainer = document.getElementById('auth-buttons-container');
        const ud = document.getElementById('user-display');
        
        if (authContainer) authContainer.style.display = 'flex';
        if (ud) ud.style.display = 'none';
        
        if (typeof window.currentUserId !== 'undefined') window.currentUserId = null;
    }

    async function logout() {
        // Call server to clear HttpOnly cookie
        try { await fetch(`${API_BASE}/api/logout`, { method: 'POST', credentials: 'include' }); } catch(e) {}
        clearToken();
        onUnauthenticated();
        if (typeof window.savedTrendIds !== 'undefined') window.savedTrendIds = new Set();
        if (typeof window.currentUserId !== 'undefined') window.currentUserId = null;
        showToastMsg('Logged out successfully');
        if (typeof renderVideoGrid === 'function') renderVideoGrid();
    }

    // ─── Modal Control ──────────────────────────────────────
    function showModal() {
        const overlay = document.getElementById('auth-gate-overlay');
        if (!overlay) return;
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        switchTab('login');
        // Reset reCAPTCHA widgets when modal opens
        resetRecaptchaWidgets();
    }

    function hideModal() {
        const overlay = document.getElementById('auth-gate-overlay');
        if (!overlay) return;
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        clearFormErrors();
    }

    function switchTab(tab) {
        document.querySelectorAll('.ag-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.ag-form-panel').forEach(p => p.classList.remove('active'));
        const btn = document.querySelector(`.ag-tab-btn[data-tab="${tab}"]`);
        const panel = document.getElementById(`ag-${tab}-panel`);
        if (btn) btn.classList.add('active');
        if (panel) panel.classList.add('active');
        clearFormErrors();
    }

    // ─── Google reCAPTCHA v2 ────────────────────────────────
    async function loadRecaptchaSiteKey() {
        try {
            const res = await fetch(`${API_BASE}/api/recaptcha-key`);
            const data = await res.json();
            _recaptchaSiteKey = data.siteKey || '';
        } catch (e) {
            console.warn('Could not load reCAPTCHA site key');
            _recaptchaSiteKey = '';
        }
    }

    function renderRecaptchaWidgets() {
        if (!_recaptchaSiteKey || !window.grecaptcha || !window.grecaptcha.render) return;
        if (_recaptchaReady) return;

        const loginContainer = document.getElementById('ag-recaptcha-login');
        const signupContainer = document.getElementById('ag-recaptcha-signup');

        if (loginContainer && loginContainer.childElementCount === 0) {
            try {
                _recaptchaLoginWidgetId = grecaptcha.render('ag-recaptcha-login', {
                    sitekey: _recaptchaSiteKey,
                    theme: 'dark',
                    size: 'normal',
                    callback: () => clearFormErrors()
                });
            } catch(e) { /* already rendered */ }
        }

        if (signupContainer && signupContainer.childElementCount === 0) {
            try {
                _recaptchaSignupWidgetId = grecaptcha.render('ag-recaptcha-signup', {
                    sitekey: _recaptchaSiteKey,
                    theme: 'dark',
                    size: 'normal',
                    callback: () => clearFormErrors()
                });
            } catch(e) { /* already rendered */ }
        }

        _recaptchaReady = true;
    }

    function resetRecaptchaWidgets() {
        if (!window.grecaptcha) return;
        try {
            if (_recaptchaLoginWidgetId !== null) grecaptcha.reset(_recaptchaLoginWidgetId);
            if (_recaptchaSignupWidgetId !== null) grecaptcha.reset(_recaptchaSignupWidgetId);
        } catch(e) { /* widget not yet rendered */ }
    }

    function getRecaptchaToken(widgetId) {
        if (!window.grecaptcha || widgetId === null) return '';
        try { return grecaptcha.getResponse(widgetId); } catch(e) { return ''; }
    }

    // ─── Password Strength ──────────────────────────────────
    function checkPasswordStrength(pw) {
        let score = 0;
        if (pw.length >= 6) score++;
        if (pw.length >= 10) score++;
        if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
        if (/\d/.test(pw)) score++;
        if (/[^a-zA-Z0-9]/.test(pw)) score++;
        const levels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
        const colors = ['', '#f43f5e', '#fb923c', '#facc15', '#4ade80', '#22d3ee'];
        return { score, label: levels[score] || 'Weak', color: colors[score] || '#f43f5e' };
    }

    function updateStrengthIndicator(pw) {
        const bar = document.getElementById('ag-strength-bar');
        const label = document.getElementById('ag-strength-label');
        if (!bar || !label) return;
        if (!pw) { bar.style.width = '0%'; label.textContent = ''; return; }
        const s = checkPasswordStrength(pw);
        bar.style.width = (s.score * 20) + '%';
        bar.style.background = s.color;
        label.textContent = s.label;
        label.style.color = s.color;
    }

    // ─── Error/Success Display ──────────────────────────────
    function showError(formId, msg) {
        const el = document.getElementById(formId + '-error');
        if (el) { el.textContent = msg; el.style.display = 'block'; }
    }

    function showSuccess(formId, msg) {
        const el = document.getElementById(formId + '-success');
        if (el) { el.textContent = msg; el.style.display = 'block'; }
    }

    function showFieldError(fieldId, msg) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.add('is-invalid');
        }
        let errSpanId = '';
        if (fieldId === 'ag-signup-name') errSpanId = 'ag-err-name';
        else if (fieldId === 'ag-signup-email') errSpanId = 'ag-err-email';
        else if (fieldId === 'ag-signup-password') errSpanId = 'ag-err-password';
        else if (fieldId === 'ag-signup-confirm') errSpanId = 'ag-err-confirm';
        else if (fieldId === 'ag-signup-country') errSpanId = 'ag-err-country';
        else if (fieldId === 'ag-signup-gender') errSpanId = 'ag-err-gender';
        else if (fieldId === 'ag-recaptcha-signup') errSpanId = 'ag-err-recaptcha';
        
        if (errSpanId) {
            const errSpan = document.getElementById(errSpanId);
            if (errSpan) {
                errSpan.textContent = msg;
                errSpan.classList.add('active');
            }
        }
    }

    function clearFieldErrors() {
        document.querySelectorAll('.ag-input, .ag-recaptcha-widget').forEach(el => {
            el.classList.remove('is-invalid');
        });
        document.querySelectorAll('.ag-field-error').forEach(el => {
            el.textContent = '';
            el.classList.remove('active');
        });
    }

    function focusAndScrollToFirstInvalid() {
        const panel = document.getElementById('ag-signup-panel');
        if (!panel) return;
        const firstInvalid = panel.querySelector('.is-invalid');
        if (firstInvalid) {
            if (typeof firstInvalid.focus === 'function') {
                firstInvalid.focus();
            }
            firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function handleSignupError(errorMsg) {
        if (!errorMsg) return;
        const msg = errorMsg.toLowerCase();
        if (msg.includes('email')) {
            showFieldError('ag-signup-email', errorMsg);
            focusAndScrollToFirstInvalid();
        } else if (msg.includes('name')) {
            showFieldError('ag-signup-name', errorMsg);
            focusAndScrollToFirstInvalid();
        } else if (msg.includes('password') || msg.includes('passwords')) {
            showFieldError('ag-signup-password', errorMsg);
            focusAndScrollToFirstInvalid();
        } else if (msg.includes('country')) {
            showFieldError('ag-signup-country', errorMsg);
            focusAndScrollToFirstInvalid();
        } else if (msg.includes('gender')) {
            showFieldError('ag-signup-gender', errorMsg);
            focusAndScrollToFirstInvalid();
        } else if (msg.includes('captcha') || msg.includes('verification')) {
            showFieldError('ag-recaptcha-signup', errorMsg);
            focusAndScrollToFirstInvalid();
        } else {
            showError('ag-signup', errorMsg);
        }
    }

    function clearFormErrors() {
        document.querySelectorAll('.ag-error, .ag-success').forEach(el => { el.textContent = ''; el.style.display = 'none'; });
        clearFieldErrors();
    }

    function showToastMsg(msg) {
        if (typeof showToast === 'function') { showToast(msg); return; }
        let t = document.getElementById('toast-msg');
        if (!t) { t = document.createElement('div'); t.id = 'toast-msg'; t.style.cssText = "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#4ade80;color:#000;padding:12px 24px;border-radius:8px;z-index:99999;font-size:14px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.4);opacity:0;transition:opacity 0.3s;pointer-events:none;"; document.body.appendChild(t); }
        t.textContent = msg; t.style.opacity = '1';
        setTimeout(() => t.style.opacity = '0', 3000);
    }

    // ─── Login Handler ──────────────────────────────────────
    async function handleLogin(e) {
        e.preventDefault();
        clearFormErrors();
        const email = document.getElementById('ag-login-email').value.trim();
        const password = document.getElementById('ag-login-password').value;
        const remember = document.getElementById('ag-remember-me')?.checked || false;

        if (!email || !password) { showError('ag-login', 'Please fill in all fields.'); return; }

        // Get reCAPTCHA token
        const recaptchaToken = getRecaptchaToken(_recaptchaLoginWidgetId);
        if (_recaptchaSiteKey && !recaptchaToken) {
            showError('ag-login', 'Please complete the CAPTCHA verification.');
            return;
        }

        const btn = document.getElementById('ag-login-btn');
        btn.textContent = 'Authenticating...'; btn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/api/login`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password, rememberMe: remember, recaptchaToken })
            });
            const data = await res.json();
            if (res.ok && data.token) {
                setToken(data.token, remember);
                setUser(data.user);
                onAuthenticated();
                hideModal();
                showToastMsg('Welcome back, ' + (data.user.full_name || data.user.email) + '!');
                if (_pendingAction) { const fn = _pendingAction; _pendingAction = null; setTimeout(fn, 300); }
                if (typeof loadSavedTrendIds === 'function') loadSavedTrendIds();
            } else if (data.verification_required) {
                _verificationEmail = data.email || email;
                switchTab('verify');
                document.getElementById('ag-verify-email-display').textContent = _verificationEmail;
                showError('ag-verify', data.error || 'Verification required.');
                resetRecaptchaWidgets();
            } else {
                showError('ag-login', data.error || 'Login failed');
                resetRecaptchaWidgets();
            }
        } catch (err) {
            showError('ag-login', 'Connection error. Please try again.');
        } finally {
            btn.textContent = 'Secure Sign In'; btn.disabled = false;
        }
    }

    // ─── Signup Handler ─────────────────────────────────────
    async function handleSignup(e) {
        e.preventDefault();
        clearFormErrors();
        const full_name = document.getElementById('ag-signup-name').value.trim();
        const email = document.getElementById('ag-signup-email').value.trim();
        const password = document.getElementById('ag-signup-password').value;
        const confirm = document.getElementById('ag-signup-confirm').value;

        let hasErrors = false;

        // Name Validation
        if (!full_name) {
            showFieldError('ag-signup-name', 'Full name is required.');
            hasErrors = true;
        } else if (!/^[a-zA-Z]/.test(full_name)) {
            showFieldError('ag-signup-name', 'Name must start with a letter.');
            hasErrors = true;
        } else if (!/^[a-zA-Z][a-zA-Z0-9 ]*$/.test(full_name)) {
            showFieldError('ag-signup-name', 'Only letters, numbers and spaces allowed.');
            hasErrors = true;
        } else {
            const normalized = full_name.replace(/\s+/g, '').toLowerCase();
            if (RESERVED_NAMES.includes(normalized)) {
                showFieldError('ag-signup-name', `The name "${full_name}" is reserved and cannot be used.`);
                hasErrors = true;
            }
        }

        // Email Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            showFieldError('ag-signup-email', 'Email address is required.');
            hasErrors = true;
        } else if (!emailRegex.test(email)) {
            showFieldError('ag-signup-email', 'Please enter a valid email address.');
            hasErrors = true;
        }

        // Password Validation
        if (!password) {
            showFieldError('ag-signup-password', 'Password is required.');
            hasErrors = true;
        } else if (password.length < 6) {
            showFieldError('ag-signup-password', 'Password must be at least 6 characters.');
            hasErrors = true;
        } else {
            const s = checkPasswordStrength(password);
            if (s.score < 2) {
                showFieldError('ag-signup-password', 'Password must contain letters and numbers.');
                hasErrors = true;
            }
        }

        // Confirm Password Validation
        if (!confirm) {
            showFieldError('ag-signup-confirm', 'Please confirm your password.');
            hasErrors = true;
        } else if (password !== confirm) {
            showFieldError('ag-signup-confirm', 'Passwords do not match.');
            hasErrors = true;
        }

        // reCAPTCHA Validation
        const recaptchaToken = getRecaptchaToken(_recaptchaSignupWidgetId);
        if (_recaptchaSiteKey && !recaptchaToken) {
            showFieldError('ag-recaptcha-signup', 'Please complete the CAPTCHA verification.');
            hasErrors = true;
        }

        if (hasErrors) {
            focusAndScrollToFirstInvalid();
            return;
        }

        const country = document.getElementById('ag-signup-country')?.value || '';
        const gender = document.getElementById('ag-signup-gender')?.value || '';

        const btn = document.getElementById('ag-signup-btn');
        btn.textContent = 'Creating Account...'; btn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/api/signup`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ full_name, email, password, confirm_password: confirm, country, gender, recaptchaToken })
            });
            const data = await res.json();
            if (res.ok && data.verification_required) {
                _verificationEmail = data.email || email;
                switchTab('verify');
                document.getElementById('ag-verify-email-display').textContent = _verificationEmail;
                showSuccess('ag-verify', data.message || 'Verification code sent to your email.');
            } else if (res.ok && data.token) {
                setToken(data.token, false);
                setUser(data.user);
                onAuthenticated();
                hideModal();
                showToastMsg('Account created! Welcome, ' + (data.user.full_name) + '! 🎉');
                if (_pendingAction) { const fn = _pendingAction; _pendingAction = null; setTimeout(fn, 300); }
            } else {
                handleSignupError(data.error || 'Signup failed');
                resetRecaptchaWidgets();
            }
        } catch (err) {
            showError('ag-signup', 'Connection error. Please try again.');
        } finally {
            btn.textContent = 'Create Secure Account'; btn.disabled = false;
        }
    }

    // ─── Forgot Password ────────────────────────────────────
    async function handleForgotPassword() {
        const email = document.getElementById('ag-login-email').value.trim();
        if (!email) { showError('ag-login', 'Enter your email above, then click Forgot Password.'); return; }

        const recaptchaToken = getRecaptchaToken(_recaptchaLoginWidgetId);
        if (_recaptchaSiteKey && !recaptchaToken) {
            showError('ag-login', 'Please complete the CAPTCHA before requesting a reset.');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/forgot-password`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, recaptchaToken })
            });
            const data = await res.json();
            if (res.ok) {
                showSuccess('ag-login', data.message || 'If this email is registered, a reset link has been sent.');
            } else {
                showError('ag-login', data.error || 'Request failed.');
            }
            resetRecaptchaWidgets();
        } catch (e) {
            showError('ag-login', 'Connection error.');
        }
    }

    // ─── Verification Handler ──────────────────────────────────
    async function handleVerify(e) {
        e.preventDefault();
        clearFormErrors();
        const code = document.getElementById('ag-verify-code').value.trim();

        if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
            showError('ag-verify', 'Please enter a valid 6-digit verification code.');
            return;
        }

        const btn = document.getElementById('ag-verify-btn');
        btn.textContent = 'Verifying...'; btn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/api/verify-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: _verificationEmail, code })
            });
            const data = await res.json();
            if (res.ok && data.token) {
                setToken(data.token, false);
                setUser(data.user);
                onAuthenticated();
                hideModal();
                showToastMsg('Account verified! Welcome to TrendScope. 🎉');
                if (_pendingAction) { const fn = _pendingAction; _pendingAction = null; setTimeout(fn, 300); }
                if (typeof loadSavedTrendIds === 'function') loadSavedTrendIds();
            } else {
                showError('ag-verify', data.error || 'Verification failed. Please check the code.');
            }
        } catch (err) {
            showError('ag-verify', 'Connection error. Please try again.');
        } finally {
            btn.textContent = 'Verify Account'; btn.disabled = false;
        }
    }

    async function handleResendCode(e) {
        e.preventDefault();
        clearFormErrors();

        if (!_verificationEmail) {
            showError('ag-verify', 'Unable to determine email. Please reload and try again.');
            return;
        }

        const link = document.getElementById('ag-resend-code');
        link.textContent = 'Sending...';
        link.style.pointerEvents = 'none';

        try {
            const res = await fetch(`${API_BASE}/api/resend-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: _verificationEmail })
            });
            const data = await res.json();
            if (res.ok) {
                showSuccess('ag-verify', data.message || 'Verification code resent.');
                document.getElementById('ag-verify-code').value = '';
            } else {
                showError('ag-verify', data.error || 'Resend failed. Please try again.');
            }
        } catch (err) {
            showError('ag-verify', 'Connection error.');
        } finally {
            link.textContent = 'Resend Code';
            link.style.pointerEvents = 'auto';
        }
    }

    // ─── Init ───────────────────────────────────────────────
    async function init() {
        // Load reCAPTCHA site key from backend
        await loadRecaptchaSiteKey();

        // Tab switching
        document.querySelectorAll('.ag-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });
        // Form submissions
        const loginForm = document.getElementById('ag-login-form');
        const signupForm = document.getElementById('ag-signup-form');
        const verifyForm = document.getElementById('ag-verify-form');
        if (loginForm) loginForm.addEventListener('submit', handleLogin);
        if (signupForm) signupForm.addEventListener('submit', handleSignup);
        if (verifyForm) verifyForm.addEventListener('submit', handleVerify);

        const resendLink = document.getElementById('ag-resend-code');
        if (resendLink) resendLink.addEventListener('click', handleResendCode);

        // Close modal
        const closeBtn = document.getElementById('ag-close-btn');
        if (closeBtn) closeBtn.addEventListener('click', hideModal);
        const overlay = document.getElementById('auth-gate-overlay');
        if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) hideModal(); });
        // Password strength
        const spw = document.getElementById('ag-signup-password');
        if (spw) spw.addEventListener('input', () => updateStrengthIndicator(spw.value));
        // Forgot password
        const fpLink = document.getElementById('ag-forgot-pw');
        if (fpLink) fpLink.addEventListener('click', (e) => { e.preventDefault(); handleForgotPassword(); });

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') hideModal();
        });

        // Load reCAPTCHA script if site key is available
        if (_recaptchaSiteKey) {
            loadRecaptchaScript();
        }
    }

    // ─── Google OAuth Handler ───────────────────────────────────
    async function handleGoogleLogin(response) {
        clearFormErrors();
        try {
            const res = await fetch(`${API_BASE}/api/google-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ googleToken: response.credential })
            });
            const data = await res.json();
            if (res.ok && data.token) {
                setToken(data.token, true); // remember me for Google
                setUser(data.user);
                onAuthenticated();
                hideModal();
                showToastMsg('Welcome, ' + (data.user.full_name || data.user.email) + '! 🌍');
                if (_pendingAction) { const fn = _pendingAction; _pendingAction = null; setTimeout(fn, 300); }
                if (typeof loadSavedTrendIds === 'function') loadSavedTrendIds();
            } else {
                showError('ag-login', data.error || 'Google Login failed');
            }
        } catch (err) {
            showError('ag-login', 'Connection error. Please try again.');
        }
    }

    function loadRecaptchaScript() {
        if (document.getElementById('recaptcha-script')) return;
        const script = document.createElement('script');
        script.id = 'recaptcha-script';
        script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoaded&render=explicit';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
    }

    // Public API
    return {
        init, verifySession, requireAuth, isAuthenticated, authFetch, authHeaders,
        showModal, hideModal, switchTab, getUser, logout, getToken,
        renderRecaptchaWidgets, handleGoogleLogin
    };
})();

// Global callback for reCAPTCHA script load
function onRecaptchaLoaded() {
    AuthGate.renderRecaptchaWidgets();
}

// Global callback for Google Sign-In
function handleGoogleLoginResponse(response) {
    AuthGate.handleGoogleLogin(response);
}

document.addEventListener('DOMContentLoaded', () => { AuthGate.init(); });
