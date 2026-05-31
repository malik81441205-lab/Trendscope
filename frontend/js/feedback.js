// ─── Feedback System ──────────────────────────────────────────────────
let selectedRating = 0;

function toggleFeedbackModal() {
    const modal = document.getElementById('feedback-modal-overlay');
    if (!modal) return;
    
    if (modal.classList.contains('active')) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    } else {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        resetFeedbackForm();
    }
}

function resetFeedbackForm() {
    document.getElementById('fb-name').value = '';
    document.getElementById('fb-email').value = '';
    document.getElementById('fb-message').value = '';
    setRating(0);
    const msgEl = document.getElementById('fb-msg');
    if(msgEl) {
        msgEl.textContent = '';
        msgEl.className = 'fb-msg';
    }
}

function setRating(rating) {
    selectedRating = rating;
    const stars = document.querySelectorAll('.fb-star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

async function submitFeedback(event) {
    event.preventDefault();
    
    const name = document.getElementById('fb-name').value.trim();
    const email = document.getElementById('fb-email').value.trim();
    const message = document.getElementById('fb-message').value.trim();
    const msgEl = document.getElementById('fb-msg');
    const submitBtn = document.getElementById('fb-submit-btn');

    if (!selectedRating) {
        msgEl.textContent = 'Please select a rating.';
        msgEl.className = 'fb-msg error';
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    msgEl.textContent = '';

    try {
        const response = await fetch('https://trendscope-production-3708.up.railway.app/api/feedback', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                email,
                rating: selectedRating,
                message
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to submit feedback');
        }

        msgEl.textContent = 'Thank you for your feedback!';
        msgEl.className = 'fb-msg success';
        
        // Hide modal after a short delay
        setTimeout(() => {
            toggleFeedbackModal();
        }, 2000);

    } catch (error) {
        msgEl.textContent = error.message;
        msgEl.className = 'fb-msg error';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Feedback';
    }
}

// Close modal when clicking outside
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('feedback-modal-overlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                toggleFeedbackModal();
            }
        });
    }

    // Handle ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay && overlay.classList.contains('active')) {
            toggleFeedbackModal();
        }
    });

    // Load public testimonials on page load
    loadPublicTestimonials();
});

// ─── Public Testimonials Rendering ──────────────────────────────────────
async function loadPublicTestimonials() {
    const container = document.getElementById('testimonials-container');
    if (!container) return; // Not on a page with testimonials

    try {
        const res = await fetch('https://trendscope-production-3708.up.railway.app/api/public-feedback');
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to load testimonials');

        if (!data.feedbacks || data.feedbacks.length === 0) {
            container.innerHTML = '<div class="testimonials-empty">No testimonials yet. Be the first to leave feedback!</div>';
            return;
        }

        container.innerHTML = data.feedbacks.map(t => {
            let stars = "";
            for (let i = 0; i < 5; i++) {
                stars += `<span style="color: ${i < t.rating ? '#4ade80' : 'var(--border2)'};">★</span>`;
            }
            
            // Generate deterministic avatar URL
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=0D8ABC&color=fff&size=80&bold=true`;

            return `
                <div class="testimonial-card">
                    <div class="t-header">
                        <div class="t-user">
                            <img src="${avatarUrl}" alt="${t.name}" class="t-avatar">
                            <div class="t-info">
                                <span class="t-name">${t.name}</span>
                                <span class="t-date">${new Date(t.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div class="t-stars">${stars}</div>
                    </div>
                    <div class="t-message">"${t.message}"</div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading testimonials:', error);
        container.innerHTML = '<div class="testimonials-empty" style="color: #f43f5e;">Failed to load testimonials.</div>';
    }
}
