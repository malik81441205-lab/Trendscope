/* ============================================================
   YouTube Global Trends Analyzer — Script
   ============================================================ */

// ─── Configuration ──────────────────────────────────────────

let autoRefreshInterval = null;

// ─── DOM Elements ───────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const countrySelect = $("country-select");
const fetchBtn = $("fetch-btn");
const refreshBtn = $("refresh-btn");
const autoRefreshToggle = $("auto-refresh-toggle");
const loadingOverlay = $("loading-overlay");
const statsBar = $("stats-bar");
const messageContainer = $("message-container");
const messageText = $("message-text");
const messageBox = $("message-box");
const retryBtn = $("retry-btn");
const videoGrid = $("video-grid");
const categorySection = $("category-section");
const categoryBadges = $("category-badges");
const keywordSection = $("keyword-section");
const keywordCloud = $("keyword-cloud");

// ─── Categories Cache ───────────────────────────────────────
let categoriesMap = {};

// ─── Event Listeners ────────────────────────────────────────
fetchBtn.addEventListener("click", () => handleFetch());
refreshBtn.addEventListener("click", () => handleFetch());
retryBtn.addEventListener("click", () => handleFetch());

autoRefreshToggle.addEventListener("change", (e) => {
    if (e.target.checked) {
        handleFetch();
        autoRefreshInterval = setInterval(() => handleFetch(), 60000);
    } else {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
});

// ─── Main Fetch Handler ────────────────────────────────────
async function handleFetch() {
    const country = countrySelect.value;

    showLoading(true);
    hideMessage();

    try {
        // Fetch categories and trends in parallel
        const [trendsRes, categoriesRes] = await Promise.all([
            fetch(`${API_BASE}/api/trends?country=${country}`),
            fetch(`${API_BASE}/api/categories?country=${country}`),
        ]);

        const trendsData = await trendsRes.json();
        const categoriesData = await categoriesRes.json();

        // Handle error responses
        if (!trendsRes.ok) {
            showLoading(false);
            showMessage(trendsData.message || "Unable to fetch data. Please try again.", true);
            return;
        }

        // Store categories
        if (categoriesData.categories) {
            categoriesMap = categoriesData.categories;
        }

        // Handle empty results
        if (!trendsData.videos || trendsData.videos.length === 0) {
            showLoading(false);
            showMessage(trendsData.message || "No trending videos available for this region.");
            clearResults();
            return;
        }

        // Render everything
        renderStats(trendsData.videos);
        renderVideos(trendsData.videos);
        renderCategories(trendsData.videos);
        renderKeywords(trendsData.videos);

        showLoading(false);
    } catch (error) {
        console.error("Fetch error:", error);
        showLoading(false);
        showMessage("Unable to fetch data. Please check your connection and try again.", true);
    }
}

// ─── Render Stats Bar ──────────────────────────────────────
function renderStats(videos) {
    const totalViews = videos.reduce((sum, v) => sum + v.viewCount, 0);
    const totalLikes = videos.reduce((sum, v) => sum + v.likeCount, 0);
    const totalComments = videos.reduce((sum, v) => sum + v.commentCount, 0);

    $("stat-total-value").textContent = videos.length;
    $("stat-views-value").textContent = formatNumber(totalViews);
    $("stat-likes-value").textContent = formatNumber(totalLikes);
    $("stat-comments-value").textContent = formatNumber(totalComments);

    statsBar.classList.remove("hidden");
}

// ─── Render Video Cards ────────────────────────────────────
function renderVideos(videos) {
    videoGrid.innerHTML = "";

    videos.forEach((video, index) => {
        const card = document.createElement("div");
        card.className = "video-card";
        card.style.animationDelay = `${index * 0.06}s`;
        card.onclick = () => window.open(`https://www.youtube.com/watch?v=${video.id}`, "_blank");

        card.innerHTML = `
      <div class="thumbnail-wrap">
        <img src="${video.thumbnail}" alt="${escapeHtml(video.title)}" loading="lazy" />
        <div class="thumbnail-overlay">
          <div class="play-icon">▶</div>
        </div>
      </div>
      <div class="card-body">
        <p class="video-title">${escapeHtml(video.title)}</p>
        <p class="channel-name">${escapeHtml(video.channelTitle)}</p>
        <div class="video-stats">
          <span class="video-stat">
            <span class="video-stat-icon">👁️</span> ${formatNumber(video.viewCount)}
          </span>
          <span class="video-stat">
            <span class="video-stat-icon">❤️</span> ${formatNumber(video.likeCount)}
          </span>
          <span class="video-stat">
            <span class="video-stat-icon">💬</span> ${formatNumber(video.commentCount)}
          </span>
        </div>
      </div>
    `;

        videoGrid.appendChild(card);
    });
}

// ─── Render Category Insights ──────────────────────────────
function renderCategories(videos) {
    const counts = {};
    videos.forEach((v) => {
        const catName = categoriesMap[v.categoryId] || `Category ${v.categoryId}`;
        counts[catName] = (counts[catName] || 0) + 1;
    });

    // Sort by count descending
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    categoryBadges.innerHTML = "";
    sorted.forEach(([name, count]) => {
        const badge = document.createElement("span");
        badge.className = "category-badge";
        badge.innerHTML = `${escapeHtml(name)} <span class="category-count">${count}</span>`;
        categoryBadges.appendChild(badge);
    });

    categorySection.classList.remove("hidden");
}

// ─── Render Keywords ───────────────────────────────────────
function renderKeywords(videos) {
    // Extract words from titles
    const stopWords = new Set([
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
        "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do",
        "does", "did", "will", "would", "could", "should", "may", "might", "can",
        "this", "that", "these", "those", "it", "its", "i", "you", "he", "she", "we",
        "they", "me", "him", "her", "us", "them", "my", "your", "his", "our", "their",
        "not", "no", "so", "if", "by", "from", "up", "out", "how", "what", "which",
        "who", "when", "where", "why", "all", "each", "every", "both", "few", "more",
        "most", "other", "some", "such", "than", "too", "very", "just", "about",
        "new", "one", "two", "de", "la", "el", "en", "los", "las", "del", "un", "una",
        "ft", "vs", "se", "da", "di", "le", "des", "et", "der", "die", "und", "das",
        "|", "-", "–", "&", "#", "@", "!", "?",
    ]);

    const wordCounts = {};
    videos.forEach((v) => {
        const words = v.title
            .toLowerCase()
            .replace(/[^\w\s]/g, " ")
            .split(/\s+/)
            .filter((w) => w.length > 2 && !stopWords.has(w) && !/^\d+$/.test(w));

        words.forEach((w) => {
            wordCounts[w] = (wordCounts[w] || 0) + 1;
        });
    });

    const sorted = Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);

    if (sorted.length === 0) {
        keywordSection.classList.add("hidden");
        return;
    }

    const maxCount = sorted[0][1];

    keywordCloud.innerHTML = "";
    sorted.forEach(([word, count]) => {
        const tag = document.createElement("span");
        const ratio = count / maxCount;
        let sizeClass = "";
        if (ratio > 0.7) sizeClass = "large";
        else if (ratio > 0.4) sizeClass = "medium";

        tag.className = `keyword-tag ${sizeClass}`;
        tag.textContent = word;
        tag.title = `${count} occurrence${count > 1 ? "s" : ""}`;
        keywordCloud.appendChild(tag);
    });

    keywordSection.classList.remove("hidden");
}

// ─── Utility Functions ─────────────────────────────────────
function formatNumber(num) {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + "B";
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return num.toString();
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function showLoading(show) {
    if (show) {
        loadingOverlay.classList.remove("hidden");
        fetchBtn.disabled = true;
        refreshBtn.disabled = true;
    } else {
        loadingOverlay.classList.add("hidden");
        fetchBtn.disabled = false;
        refreshBtn.disabled = false;
    }
}

function showMessage(text, showRetry = false) {
    messageText.textContent = text;
    retryBtn.style.display = showRetry ? "inline-flex" : "none";
    messageContainer.classList.remove("hidden");
}

function hideMessage() {
    messageContainer.classList.add("hidden");
}

function clearResults() {
    videoGrid.innerHTML = "";
    statsBar.classList.add("hidden");
    categorySection.classList.add("hidden");
    keywordSection.classList.add("hidden");
}
