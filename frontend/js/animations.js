/* ═══════════════════════════════════════════════════════════════
   SCROLL REVEAL & INTERACTIVE ANIMATIONS — TrendScope
   Uses IntersectionObserver for performant scroll-triggered effects
   ═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ─── SCROLL REVEAL ─────────────────────────────────────────
    function initScrollReveal() {
        const revealElements = document.querySelectorAll(
            '.reveal, .reveal-scale, .reveal-left, .reveal-right, .reveal-flip, .reveal-blur, .reveal-bounce'
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
            { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
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
                    !el.classList.contains('reveal-blur') &&
                    !el.classList.contains('reveal-bounce') &&
                    !el.classList.contains('visible')) {
                    el.classList.add(cls);
                    if (i < 8) el.classList.add(`delay-${i + 1}`);
                }
            });
        });
    }

    // ─── CURSOR GLOW EFFECT ────────────────────────────────────
    function initCursorGlow() {
        if (window.innerWidth < 768) return;

        const glow = document.createElement('div');
        glow.className = 'cursor-glow';
        document.body.appendChild(glow);

        let mouseX = 0, mouseY = 0;
        let glowX = 0, glowY = 0;
        let rafId = null;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            glow.classList.add('active');
        });

        document.addEventListener('mouseleave', () => {
            glow.classList.remove('active');
        });

        function animateGlow() {
            glowX += (mouseX - glowX) * 0.12;
            glowY += (mouseY - glowY) * 0.12;
            glow.style.left = glowX + 'px';
            glow.style.top = glowY + 'px';
            rafId = requestAnimationFrame(animateGlow);
        }
        animateGlow();

        // Cleanup on page hide
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                cancelAnimationFrame(rafId);
            } else {
                animateGlow();
            }
        });
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
                card.style.transform = `translateY(-3px) perspective(600px) rotateX(${y * -5}deg) rotateY(${x * 5}deg)`;
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

        let currentCard = null;

        grid.addEventListener('mousemove', (e) => {
            const card = e.target.closest('.video-card');
            if (!card) return;
            if (currentCard !== card) {
                if (currentCard) currentCard.style.transform = '';
                currentCard = card;
            }
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            card.style.transform = `translateY(-5px) perspective(800px) rotateX(${y * -4}deg) rotateY(${x * 4}deg)`;
        });

        grid.addEventListener('mouseleave', () => {
            if (currentCard) {
                currentCard.style.transform = '';
                currentCard = null;
            }
        }, true);
    }

    // ─── COMPARISON CARD TILT ──────────────────────────────────
    function initComparisonTilt() {
        if (window.innerWidth < 768) return;

        document.querySelectorAll('.comparison-card').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                card.style.transform = `translateY(-6px) scale(1.02) perspective(600px) rotateX(${y * -3}deg) rotateY(${x * 3}deg)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }

    // ─── ABOUT CARD TILT ───────────────────────────────────────
    function initAboutCardTilt() {
        if (window.innerWidth < 768) return;

        document.querySelectorAll('.about-card').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                card.style.transform = `translateY(-8px) perspective(600px) rotateX(${y * -3}deg) rotateY(${x * 3}deg)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }

    // ─── MAGNETIC BUTTON EFFECT ────────────────────────────────
    function initMagneticButtons() {
        if (window.innerWidth < 768) return;

        document.querySelectorAll('.fab-bottom, .feedback-fab').forEach(btn => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px) scale(1.05)`;
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = '';
            });
        });
    }

    // ─── STAGGER REVEAL FOR DYNAMIC CONTENT ────────────────────
    function initStaggerReveal() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        // Check for video cards
                        if (node.classList && node.classList.contains('video-card')) {
                            node.classList.add('reveal');
                            setTimeout(() => node.classList.add('visible'), 50);
                        }
                        // Check children
                        if (node.querySelectorAll) {
                            node.querySelectorAll('.video-card').forEach((card, i) => {
                                card.classList.add('reveal');
                                card.style.transitionDelay = `${i * 0.05}s`;
                                setTimeout(() => card.classList.add('visible'), 50 + i * 50);
                            });
                        }
                    }
                });
            });
        });

        const videoGrid = document.getElementById('video-grid');
        if (videoGrid) {
            observer.observe(videoGrid, { childList: true });
        }
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
        initComparisonTilt();
        initAboutCardTilt();
        initMagneticButtons();
        initStaggerReveal();

        // Re-run auto-tag when DOM changes
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
