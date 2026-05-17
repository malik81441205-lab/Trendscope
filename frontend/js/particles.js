class ParticleSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.orbs = [];
        this.width = 0;
        this.height = 0;
        
        this.init();
        window.addEventListener('resize', () => this.resize());
        this.animate();
    }

    init() {
        this.resize();
        
        // Tiny particles - much lower density
        const particleCount = Math.min(window.innerWidth / 35, 40);
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                radius: Math.random() * 1.0 + 0.5,
                vx: (Math.random() - 0.5) * 0.15,
                vy: (Math.random() - 0.5) * 0.15,
                alpha: Math.random() * 0.3 + 0.1
            });
        }
        
        // Large glowing background orbs - incredibly faint
        const orbColors = [
            'rgba(74, 222, 128, 0.015)', // Green
            'rgba(56, 189, 248, 0.015)', // Blue
            'rgba(244, 63, 94, 0.01)'   // Red
        ];
        for (let i = 0; i < 3; i++) {
            this.orbs.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                radius: Math.random() * 150 + 150,
                vx: (Math.random() - 0.5) * 0.2,
                vy: (Math.random() - 0.5) * 0.2,
                color: orbColors[i % orbColors.length]
            });
        }
    }

    resize() {
        // Find closest relative parent if any
        const parent = this.canvas.parentElement;
        this.width = parent.clientWidth;
        this.height = parent.clientHeight || window.innerHeight; // fallback if parent has no height
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    animate() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw Orbs
        this.orbs.forEach(orb => {
            orb.x += orb.vx;
            orb.y += orb.vy;
            
            if (orb.x < -orb.radius) orb.x = this.width + orb.radius;
            if (orb.x > this.width + orb.radius) orb.x = -orb.radius;
            if (orb.y < -orb.radius) orb.y = this.height + orb.radius;
            if (orb.y > this.height + orb.radius) orb.y = -orb.radius;
            
            this.ctx.beginPath();
            const grad = this.ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
            grad.addColorStop(0, orb.color);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            this.ctx.fillStyle = grad;
            this.ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Draw Particles
        this.ctx.fillStyle = '#4ade80';
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            
            if (p.x < 0) p.x = this.width;
            if (p.x > this.width) p.x = 0;
            if (p.y < 0) p.y = this.height;
            if (p.y > this.height) p.y = 0;
            
            this.ctx.globalAlpha = p.alpha;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // Draw connections
        this.ctx.lineWidth = 0.5;
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 100) {
                    this.ctx.globalAlpha = (100 - dist) / 100 * 0.08;
                    this.ctx.strokeStyle = '#4ade80';
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.stroke();
                }
            }
        }
        
        this.ctx.globalAlpha = 1;
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ParticleSystem('particles-bg');
});
