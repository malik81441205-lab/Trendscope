/* ═══════════════════════════════════════════════════════════════
   SCROLL REVEAL & INTERACTIVE ANIMATIONS — TrendScope
   Uses IntersectionObserver for performant scroll-triggered effects
   ═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ─── SCROLL REVEAL ─────────────────────────────────────────
    function initScrollReveal() {
        const revealElements = document.querySelectorAll(
            '.reveal, .reveal-scale, .reveal-left, .reveal-right, .reveal-flip'
        );
        if (!revealElements.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
        );

        revealElements.forEach((el) => observer.observe(el));
    }

    // ─── AUTO-ADD REVEAL TO SECTIONS ───────────────────────────
    function autoTagRevealElements() {
        const selectors = [
            { selector: '.stat-card', cls: 'reveal' },
            { selector: '.panel-card', cls: 'reveal' },
            { selector: '.comparison-card', cls: 'reveal-scale' },
            { selector: '.video-card', cls: 'reveal' },
            { selector: '.channel-item', cls: 'reveal-left' },
            { selector: '.kw-item', cls: 'reveal-right' },
            { selector: '.about-card', cls: 'reveal-flip' },
            { selector: '.testimonial-card', cls: 'reveal' },
            { selector: '.saved-trend-card', cls: 'reveal' },
            { selector: '.chart-panel', cls: 'reveal-scale' },
            { selector: '.history-section', cls: 'reveal' },
            { selector: '.growth-section', cls: 'reveal' },
            { selector: '.testimonials-section', cls: 'reveal' },
            { selector: '.footer', cls: 'reveal' },
        ];

        selectors.forEach(({ selector, cls }) => {
            document.querySelectorAll(selector).forEach((el, i) => {
                if (!el.classList.contains('reveal') &&
                    !el.classList.contains('reveal-scale') &&
                    !el.classList.contains('reveal-left') &&
                    !el.classList.contains('reveal-right') &&
                    !el.classList.contains('reveal-flip') &&
                    !el.classList.contains('visible')) {
                    el.classList.add(cls);
                    // Stagger delay for grids
                    if (i < 6) el.classList.add(`delay-${i + 1}`);
                }
            });
        });
    }

    // ─── CURSOR GLOW EFFECT ────────────────────────────────────
    function initCursorGlow() {
        if (window.innerWidth < 768) return; // Skip on mobile

        const glow = document.createElement('div');
        glow.className = 'cursor-glow';
        document.body.appendChild(glow);

        let mouseX = 0, mouseY = 0;
        let glowX = 0, glowY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            glow.classList.add('active');
        });

        document.addEventListener('mouseleave', () => {
            glow.classList.remove('active');
        });

        function animateGlow() {
            glowX += (mouseX - glowX) * 0.15;
            glowY += (mouseY - glowY) * 0.15;
            glow.style.left = glowX + 'px';
            glow.style.top = glowY + 'px';
            requestAnimationFrame(animateGlow);
        }
        animateGlow();
    }

    // ─── SMOOTH SCROLL FOR NAV LINKS ───────────────────────────
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach((link) => {
            link.addEventListener('click', (e) => {
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    // ─── RIPPLE EFFECT ON BUTTONS ──────────────────────────────
    function initRippleEffect() {
        const rippleTargets = document.querySelectorAll(
            '.country-btn, .cat-btn, .time-btn, .audience-btn, .icon-btn, .auth-action-btn'
        );
        rippleTargets.forEach((btn) => btn.classList.add('btn-ripple'));
    }

    // ─── PARALLAX ON STAT CARDS ────────────────────────────────
    function initStatParallax() {
        if (window.innerWidth < 768) return;

        const cards = document.querySelectorAll('.stat-card');
        cards.forEach((card) => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                card.style.transform = `translateY(-2px) perspective(600px) rotateX(${y * -4}deg) rotateY(${x * 4}deg)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }

    // ─── VIDEO CARD TILT EFFECT ────────────────────────────────
    function initVideoTilt() {
        if (window.innerWidth < 768) return;

        const grid = document.getElementById('video-grid');
        if (!grid) return;

        grid.addEventListener('mousemove', (e) => {
            const card = e.target.closest('.video-card');
            if (!card) return;
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            card.style.transform = `translateY(-4px) perspective(800px) rotateX(${y * -3}deg) rotateY(${x * 3}deg)`;
        });

        grid.addEventListener('mouseleave', (e) => {
            const card = e.target.closest('.video-card');
            if (card) card.style.transform = '';
        }, true);
    }

    // ─── INITIALIZE ────────────────────────────────────────────
    function init() {
        autoTagRevealElements();
        initScrollReveal();
        initCursorGlow();
        initSmoothScroll();
        initRippleEffect();
        initStatParallax();
        initVideoTilt();

        // Re-run auto-tag when DOM changes (e.g. after dynamic content loads)
        const mutObs = new MutationObserver(() => {
            autoTagRevealElements();
            initScrollReveal();
        });
        mutObs.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
