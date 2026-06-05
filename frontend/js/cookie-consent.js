/* ═══════════════════════════════════════════════════════════════
   CookieConsent — Production Consent Manager for TrendScope
   GDPR-ready · Extensible · Zero dependencies
   ═══════════════════════════════════════════════════════════════ */

const CookieConsent = (() => {
    'use strict';

    // ─── Configuration ───
    const STORAGE_KEY = 'ts_cookie_consent';
    const CONSENT_VERSION = '1.0';

    // Tracking cookie patterns to clear on rejection
    const TRACKING_COOKIE_PATTERNS = [
        /^_ga/,      // Google Analytics
        /^_gid/,     // Google Analytics
        /^_gat/,     // Google Analytics
        /^_gcl/,     // Google Ads
        /^_clck/,    // Microsoft Clarity
        /^_clsk/,    // Microsoft Clarity
        /^_fbp/,     // Meta Pixel
        /^_fbc/,     // Meta Pixel
    ];

    // ─── State ───
    let _changeCallbacks = [];
    let _analyticsLoaded = false;

    // ─── DOM references (lazy-initialized) ───
    let _banner = null;
    let _modalOverlay = null;
    let _toggleAnalytics = null;
    let _togglePreferences = null;


    /* ════════════════════════════════════════════════════════════
       CORE API
       ════════════════════════════════════════════════════════════ */

    /**
     * Get the current consent object, or null if not yet set.
     * @returns {{ necessary: boolean, analytics: boolean, preferences: boolean, timestamp: string, version: string } | null}
     */
    function getConsent() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            // Validate shape
            if (typeof data.necessary !== 'boolean' || typeof data.analytics !== 'boolean' || typeof data.preferences !== 'boolean') {
                return null;
            }
            return data;
        } catch {
            return null;
        }
    }

    /** @returns {boolean} */
    function hasAnalyticsConsent() {
        const c = getConsent();
        return c ? c.analytics === true : false;
    }

    /** @returns {boolean} */
    function hasPreferenceConsent() {
        const c = getConsent();
        return c ? c.preferences === true : false;
    }

    /** Accept all cookie categories */
    function acceptAll() {
        _saveConsent({ necessary: true, analytics: true, preferences: true });
        _hideBanner();
        _hideModal();
        _onConsentChanged();
    }

    /** Reject all optional cookies */
    function rejectAll() {
        _saveConsent({ necessary: true, analytics: false, preferences: false });
        _hideBanner();
        _hideModal();
        _clearTrackingCookies();
        _onConsentChanged();
    }

    /**
     * Save granular preferences.
     * @param {{ analytics: boolean, preferences: boolean }} opts
     */
    function savePreferences(opts) {
        _saveConsent({
            necessary: true,
            analytics: !!opts.analytics,
            preferences: !!opts.preferences,
        });
        _hideBanner();
        _hideModal();
        if (!opts.analytics) _clearTrackingCookies();
        _onConsentChanged();
    }

    /** Open the cookie settings modal */
    function openSettings() {
        _ensureDOMReady(() => {
            _cacheElements();
            // Sync toggles with current consent
            const c = getConsent();
            if (_toggleAnalytics) _toggleAnalytics.checked = c ? c.analytics : false;
            if (_togglePreferences) _togglePreferences.checked = c ? c.preferences : false;
            _hideBanner();
            _showModal();
        });
    }

    /**
     * Register a callback for consent changes.
     * @param {function} cb - Called with the new consent object
     */
    function onConsentChange(cb) {
        if (typeof cb === 'function') _changeCallbacks.push(cb);
    }


    /* ════════════════════════════════════════════════════════════
       INTERNAL HELPERS
       ════════════════════════════════════════════════════════════ */

    function _saveConsent(data) {
        const consent = {
            necessary: data.necessary,
            analytics: data.analytics,
            preferences: data.preferences,
            timestamp: new Date().toISOString(),
            version: CONSENT_VERSION,
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
        } catch (e) {
            console.warn('[CookieConsent] Failed to save consent:', e);
        }
    }

    function _onConsentChanged() {
        const consent = getConsent();
        _changeCallbacks.forEach(cb => {
            try { cb(consent); } catch (e) { console.error('[CookieConsent] Callback error:', e); }
        });
        // Attempt to load analytics if newly consented
        if (consent && consent.analytics && !_analyticsLoaded) {
            _loadAnalyticsScripts();
        }
    }

    function _clearTrackingCookies() {
        const cookies = document.cookie.split(';');
        cookies.forEach(cookie => {
            const name = cookie.split('=')[0].trim();
            if (TRACKING_COOKIE_PATTERNS.some(p => p.test(name))) {
                // Clear for current domain and common variations
                const domains = [window.location.hostname, '.' + window.location.hostname];
                domains.forEach(domain => {
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`;
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
                });
            }
        });
    }

    function _cacheElements() {
        if (!_banner) _banner = document.getElementById('cc-banner');
        if (!_modalOverlay) _modalOverlay = document.getElementById('cc-modal-overlay');
        if (!_toggleAnalytics) _toggleAnalytics = document.getElementById('cc-toggle-analytics');
        if (!_togglePreferences) _togglePreferences = document.getElementById('cc-toggle-preferences');
    }

    function _showBanner() {
        _cacheElements();
        if (_banner) _banner.classList.add('active');
    }

    function _hideBanner() {
        _cacheElements();
        if (_banner) _banner.classList.remove('active');
    }

    function _showModal() {
        _cacheElements();
        if (_modalOverlay) {
            _modalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function _hideModal() {
        _cacheElements();
        if (_modalOverlay) {
            _modalOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    function _ensureDOMReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }


    /* ════════════════════════════════════════════════════════════
       ANALYTICS SCRIPT INJECTION GUARDS
       These stubs are ready for production use. Replace the
       placeholder IDs with real tracking IDs to activate.
       ════════════════════════════════════════════════════════════ */

    function _loadAnalyticsScripts() {
        if (_analyticsLoaded) return;
        _analyticsLoaded = true;

        // ── Google Analytics (gtag.js) ──
        // To enable: replace 'G-XXXXXXXXXX' with your GA4 measurement ID
        _injectGA('G-XXXXXXXXXX');

        // ── Microsoft Clarity ──
        // To enable: replace 'CLARITY_ID' with your Clarity project ID
        _injectClarity('CLARITY_ID');

        // ── Meta Pixel ──
        // To enable: replace 'META_PIXEL_ID' with your Pixel ID
        _injectMetaPixel('META_PIXEL_ID');

        // ── Google Ads ──
        // To enable: replace 'AW-XXXXXXXXX' with your Google Ads ID
        _injectGoogleAds('AW-XXXXXXXXX');
    }

    function _injectGA(measurementId) {
        if (measurementId === 'G-XXXXXXXXXX') return; // Placeholder — skip
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
        document.head.appendChild(script);
        window.dataLayer = window.dataLayer || [];
        function gtag(){ window.dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', measurementId, { anonymize_ip: true });
    }

    function _injectClarity(projectId) {
        if (projectId === 'CLARITY_ID') return; // Placeholder — skip
        (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", projectId);
    }

    function _injectMetaPixel(pixelId) {
        if (pixelId === 'META_PIXEL_ID') return; // Placeholder — skip
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
        document,'script','https://connect.facebook.net/en_US/fbevents.js');
        window.fbq('init', pixelId);
        window.fbq('track', 'PageView');
    }

    function _injectGoogleAds(adsId) {
        if (adsId === 'AW-XXXXXXXXX') return; // Placeholder — skip
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${adsId}`;
        document.head.appendChild(script);
        window.dataLayer = window.dataLayer || [];
        function gtag(){ window.dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', adsId);
    }


    /* ════════════════════════════════════════════════════════════
       INITIALIZATION & EVENT BINDING
       ════════════════════════════════════════════════════════════ */

    function _bindEvents() {
        _cacheElements();

        // Banner buttons
        const btnAccept = document.getElementById('cc-btn-accept');
        const btnReject = document.getElementById('cc-btn-reject');
        const btnCustomize = document.getElementById('cc-btn-customize');
        if (btnAccept) btnAccept.addEventListener('click', acceptAll);
        if (btnReject) btnReject.addEventListener('click', rejectAll);
        if (btnCustomize) btnCustomize.addEventListener('click', openSettings);

        // Modal buttons
        const modalClose = document.getElementById('cc-modal-close');
        const modalSave = document.getElementById('cc-modal-save');
        const modalAcceptAll = document.getElementById('cc-modal-accept-all');
        if (modalClose) modalClose.addEventListener('click', _hideModal);
        if (modalAcceptAll) modalAcceptAll.addEventListener('click', acceptAll);
        if (modalSave) {
            modalSave.addEventListener('click', () => {
                savePreferences({
                    analytics: _toggleAnalytics ? _toggleAnalytics.checked : false,
                    preferences: _togglePreferences ? _togglePreferences.checked : false,
                });
            });
        }

        // Click outside modal to close
        if (_modalOverlay) {
            _modalOverlay.addEventListener('click', (e) => {
                if (e.target === _modalOverlay) _hideModal();
            });
        }

        // Escape key closes modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && _modalOverlay && _modalOverlay.classList.contains('active')) {
                _hideModal();
            }
        });

        // "Manage Cookies" footer link
        const manageCookiesLinks = document.querySelectorAll('[data-cc-open-settings]');
        manageCookiesLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                openSettings();
            });
        });
    }

    function _init() {
        _ensureDOMReady(() => {
            _bindEvents();

            const consent = getConsent();

            if (!consent) {
                // First visit — show banner
                _showBanner();
            } else {
                // Returning user — load analytics if consented
                if (consent.analytics) {
                    _loadAnalyticsScripts();
                }
            }
        });
    }

    // Auto-initialize
    _init();


    /* ════════════════════════════════════════════════════════════
       PUBLIC API
       ════════════════════════════════════════════════════════════ */

    return {
        getConsent,
        hasAnalyticsConsent,
        hasPreferenceConsent,
        openSettings,
        acceptAll,
        rejectAll,
        savePreferences,
        onConsentChange,
    };

})();
