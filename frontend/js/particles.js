class ParticleSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.orbs = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.width = 0;
        this.height = 0;
        this.frameCount = 0;
        this.isRunning = true;

        this.init();
        window.addEventListener('resize', () => this.resize());
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        // Pause when tab is hidden for performance
        document.addEventListener('visibilitychange', () => {
            this.isRunning = !document.hidden;
            if (this.isRunning) this.animate();
        });

        this.animate();
    }

    init() {
        this.resize();

        // Particles - reduced density for performance
        const particleCount = Math.min(Math.floor(window.innerWidth / 40), 35);
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                radius: Math.random() * 1.2 + 0.4,
                vx: (Math.random() - 0.5) * 0.12,
                vy: (Math.random() - 0.5) * 0.12,
                alpha: Math.random() * 0.35 + 0.08,
                pulseSpeed: Math.random() * 0.01 + 0.005,
                pulsePhase: Math.random() * Math.PI * 2
            });
        }

        // Large glowing background orbs
        const orbColors = [
            { r: 74, g: 222, b: 128 },   // Green
            { r: 56, g: 189, b: 248 },   // Blue
            { r: 244, g: 63, b: 94 },    // Red
            { r: 251, g: 146, b: 60 }    // Orange
        ];
        for (let i = 0; i < 4; i++) {
            this.orbs.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                radius: Math.random() * 180 + 120,
                vx: (Math.random() - 0.5) * 0.15,
                vy: (Math.random() - 0.5) * 0.15,
                color: orbColors[i],
                alpha: 0.012 + Math.random() * 0.008,
                pulsePhase: Math.random() * Math.PI * 2
            });
        }
    }

    resize() {
        const parent = this.canvas.parentElement;
        if (!parent) return;
        this.width = parent.clientWidth;
        this.height = parent.clientHeight || window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    animate() {
        if (!this.isRunning) return;

        this.frameCount++;
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw Orbs with subtle pulse
        this.orbs.forEach(orb => {
            orb.x += orb.vx;
            orb.y += orb.vy;
            orb.pulsePhase += 0.003;

            // Mouse interaction - gentle repulsion
            const dx = orb.x - this.mouseX;
            const dy = orb.y - this.mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 300) {
                const force = (300 - dist) / 300 * 0.3;
                orb.x += (dx / dist) * force;
                orb.y += (dy / dist) * force;
            }

            // Wrap around
            if (orb.x < -orb.radius) orb.x = this.width + orb.radius;
            if (orb.x > this.width + orb.radius) orb.x = -orb.radius;
            if (orb.y < -orb.radius) orb.y = this.height + orb.radius;
            if (orb.y > this.height + orb.radius) orb.y = -orb.radius;

            const pulseAlpha = orb.alpha + Math.sin(orb.pulsePhase) * 0.005;

            this.ctx.beginPath();
            const grad = this.ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
            grad.addColorStop(0, `rgba(${orb.color.r}, ${orb.color.g}, ${orb.color.b}, ${pulseAlpha})`);
            grad.addColorStop(0.5, `rgba(${orb.color.r}, ${orb.color.g}, ${orb.color.b}, ${pulseAlpha * 0.4})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            this.ctx.fillStyle = grad;
            this.ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Draw Particles with pulse
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.pulsePhase += p.pulseSpeed;

            // Wrap around
            if (p.x < 0) p.x = this.width;
            if (p.x > this.width) p.x = 0;
            if (p.y < 0) p.y = this.height;
            if (p.y > this.height) p.y = 0;

            const pulseAlpha = p.alpha * (0.7 + Math.sin(p.pulsePhase) * 0.3);

            this.ctx.globalAlpha = pulseAlpha;
            this.ctx.fillStyle = '#4ade80';
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Draw connections (optimized - skip every other frame)
        if (this.frameCount % 2 === 0) {
            this.ctx.lineWidth = 0.4;
            for (let i = 0; i < this.particles.length; i++) {
                for (let j = i + 1; j < this.particles.length; j++) {
                    const dx = this.particles[i].x - this.particles[j].x;
                    const dy = this.particles[i].y - this.particles[j].y;
                    const dist = dx * dx + dy * dy;

                    if (dist < 10000) { // sqrt(10000) = 100
                        const alpha = (100 - Math.sqrt(dist)) / 100 * 0.06;
                        this.ctx.globalAlpha = alpha;
                        this.ctx.strokeStyle = '#4ade80';
                        this.ctx.beginPath();
                        this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                        this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                        this.ctx.stroke();
                    }
                }
            }
        }

        this.ctx.globalAlpha = 1;
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only init particles on desktop
    if (window.innerWidth >= 768) {
        new ParticleSystem('particles-bg');
    }
});
