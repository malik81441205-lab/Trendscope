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
});
