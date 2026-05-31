// ─── ADMIN DASHBOARD LOGIC ───────────────────────────────────────────────

let charts = {};
let usersList = [];

document.addEventListener("DOMContentLoaded", () => {
    // Clock
    setInterval(() => {
        document.getElementById("live-clock").textContent = new Date().toLocaleString();
    }, 1000);

    // Initial load - don't block
    setupTabs();
    setupLogout();
    loadOverview();

    // Mobile Menu
    const menuBtn = document.getElementById('mobile-menu-btn');
    const overlay = document.getElementById('mobile-overlay');
    if(menuBtn && overlay) {
        menuBtn.addEventListener('click', () => document.body.classList.add('sidebar-open'));
        overlay.addEventListener('click', () => document.body.classList.remove('sidebar-open'));
        
        // Auto close on nav item click (mobile)
        document.querySelectorAll('.admin-nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) document.body.classList.remove('sidebar-open');
            });
        });
    }

    // Setup polling for live widgets
    setInterval(loadActivityFeed, 30000); // 30s
});

// ─── TAB MANAGEMENT ───
function setupTabs() {
    const navItems = document.querySelectorAll('.admin-nav-item[data-target]');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Update active state in nav
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Show corresponding tab
            const targetId = item.getAttribute('data-target');
            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
            document.getElementById(`tab-${targetId}`).classList.add('active');

            // Update Page Title
            const tabName = item.textContent.trim();
            document.getElementById('page-title').textContent = tabName;

            // Load data based on tab
            if (targetId === 'overview') loadOverview();
            else if (targetId === 'users') loadUsers();
            else if (targetId === 'trends') loadTrends();
            else if (targetId === 'activity') loadActivityFeed();
            else if (targetId === 'settings') loadSettings();
            else if (targetId === 'feedback') loadFeedback();
        });
    });

    // Search functionality
    document.getElementById("user-search").addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = usersList.filter(u => u.email.toLowerCase().includes(query) || (u.full_name && u.full_name.toLowerCase().includes(query)));
        renderUsersTable(filtered);
    });
}

function setupLogout() {
    document.getElementById("logout-btn").addEventListener("click", async () => {
        try {
            await fetch("https://trendscope-production-3708.up.railway.app/api/logout", { method: "POST", credentials: "include" });
            localStorage.removeItem("admin");
            window.location.href = "admin-login.html";
        } catch(e) {
            console.error(e);
        }
    });
}

// ─── API HELPERS ───
async function fetchAdmin(endpoint, options = {}) {
    options.credentials = 'include';
    const res = await fetch(`https://trendscope-production-3708.up.railway.app/api/admin/${endpoint}`, options);
    if (res.status === 401 || res.status === 403) {
        window.location.href = "admin-login.html";
        throw new Error("Unauthorized");
    }
    return res.json();
}

// ─── OVERVIEW TAB ───
let overviewChartData = null;

async function loadOverview() {
    try {
        const stats = await fetchAdmin('overview');
        document.getElementById('stat-total-users').textContent = stats.totalUsers || 0;
        document.getElementById('stat-active-users').textContent = stats.activeUsers || 0;
        document.getElementById('stat-total-trends').textContent = stats.totalTrends || 0;
        document.getElementById('stat-api-requests').textContent = stats.apiRequests || 0;
        
        overviewChartData = stats.chartData;

        // Render charts gracefully
        if (typeof Chart !== 'undefined') {
            renderCharts();
        } else {
            console.warn("Chart.js failed to load. Charts will not be rendered.");
        }
    } catch(e) {
        console.error("Overview error", e);
        document.getElementById('stat-total-users').textContent = 'Error';
    }
}

function renderCharts() {
    const ctxTraffic = document.getElementById('trafficChart');
    const ctxCategory = document.getElementById('categoryChart');

    if (charts.traffic) charts.traffic.destroy();
    if (charts.category) charts.category.destroy();

    // Chart.js default styling for dark mode
    Chart.defaults.color = '#a1a1aa';
    Chart.defaults.borderColor = 'rgba(255,255,255,0.05)';
    Chart.defaults.font.family = "'Inter', sans-serif";

    const trafficData = overviewChartData?.traffic || { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [120, 190, 300, 250, 200, 320, 400] };
    const categoryData = overviewChartData?.categories || { labels: ['Gaming', 'Entertainment', 'Music', 'Tech'], values: [35, 45, 10, 10] };

    // Create Gradient for Line Chart
    let gradient = null;
    if (ctxTraffic) {
        const ctx = ctxTraffic.getContext('2d');
        gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(0, 255, 136, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 255, 136, 0.0)');
    }

    charts.traffic = new Chart(ctxTraffic, {
        type: 'line',
        data: {
            labels: trafficData.labels,
            datasets: [{
                label: 'New Users',
                data: trafficData.values,
                borderColor: '#00ff88',
                backgroundColor: gradient || 'rgba(0, 255, 136, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: '#050505',
                pointBorderColor: '#00ff88',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.4, // Smooth curves
                fill: true
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                tooltip: {
                    backgroundColor: 'rgba(5, 5, 5, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#a1a1aa',
                    borderColor: 'rgba(0, 255, 136, 0.2)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: { label: (context) => `+${context.parsed.y} Users` }
                },
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.02)' }, border: { display: false } },
                x: { grid: { display: false }, border: { display: false } }
            }
        }
    });

    charts.category = new Chart(ctxCategory, {
        type: 'doughnut',
        data: {
            labels: categoryData.labels,
            datasets: [{
                data: categoryData.values,
                backgroundColor: ['#00ff88', '#818cf8', '#fb7185', '#facc15', '#38bdf8', '#c084fc'],
                borderWidth: 2,
                borderColor: '#1e1e24'
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            cutout: '75%',
            plugins: {
                legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true } },
                tooltip: {
                    backgroundColor: 'rgba(5, 5, 5, 0.9)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12
                }
            }
        }
    });
}

// ─── USERS TAB ───
async function loadUsers() {
    try {
        usersList = await fetchAdmin('users');
        renderUsersTable(usersList);
    } catch(e) {
        console.error("User load error", e);
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById("users-tbody");
    tbody.innerHTML = users.map(u => `
        <tr>
            <td style="color:#a1a1aa;">#${u.id}</td>
            <td>
                <div style="font-weight: 600; color: white;">${u.full_name || 'N/A'}</div>
                <div style="font-size: 12px; color: #a1a1aa;">${u.email}</div>
            </td>
            <td><span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}">${u.role}</span></td>
            <td style="font-size: 12px; color: #a1a1aa;">${new Date(u.created_at).toLocaleDateString()}</td>
            <td style="font-size: 12px; color: #a1a1aa;">${u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td>
            <td>
                ${u.role === 'user' ? `<button class="btn btn-primary" style="padding: 4px 8px; font-size: 11px;" onclick="changeRole(${u.id}, 'admin')">Make Admin</button>` 
                                    : `<button class="btn btn-primary" style="padding: 4px 8px; font-size: 11px;" onclick="changeRole(${u.id}, 'user')">Revoke Admin</button>`}
                <button class="btn btn-danger" style="padding: 4px 8px; font-size: 11px; margin-left: 4px;" onclick="deleteUser(${u.id})">Delete</button>
            </td>
        </tr>
    `).join("");
}

window.changeRole = async (id, newRole) => {
    if(!confirm(`Change role to ${newRole}?`)) return;
    await fetchAdmin(`users/${id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
    });
    loadUsers();
};

window.deleteUser = async (id) => {
    if(!confirm('Delete this user permanently?')) return;
    await fetchAdmin(`users/${id}`, { method: 'DELETE' });
    loadUsers();
};

// ─── TRENDS TAB ───
async function loadTrends() {
    try {
        const data = await fetchAdmin('monitoring');
        
        // Fast growing
        const ftBody = document.getElementById("fast-trends-tbody");
        ftBody.innerHTML = data.fastestGrowing.map(t => {
            const rawThumbSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="68" style="background:#27272a"><text x="60" y="34" fill="#a1a1aa" font-family="sans-serif" font-size="12" text-anchor="middle" dominant-baseline="middle">No Thumb</text></svg>`;
            const rawAvatarSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" style="background:#4f46e5"><text x="16" y="16" fill="#ffffff" font-family="sans-serif" font-size="14" text-anchor="middle" dominant-baseline="middle">${(t.channel_name || 'C').charAt(0).toUpperCase()}</text></svg>`;
            
            const thumbFallback = `data:image/svg+xml;utf8,${encodeURIComponent(rawThumbSvg)}`;
            const avatarFallback = `data:image/svg+xml;utf8,${encodeURIComponent(rawAvatarSvg)}`;
            
            const thumb = t.thumbnail_url || thumbFallback;
            const avatar = t.channel_avatar || avatarFallback;
            
            return `
            <tr>
                <td>
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <img src="${thumb}" class="trend-thumbnail" alt="Thumbnail" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='${thumbFallback}';">
                        <div>
                            <div style="font-weight: 600; color: white; max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.title}</div>
                            <div style="font-size: 12px; color: #a1a1aa; display: flex; align-items: center; gap: 6px; margin-top: 4px;">
                                <img src="${avatar}" class="channel-avatar" alt="Avatar" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='${avatarFallback}';">
                                ${t.channel_name}
                            </div>
                        </div>
                    </div>
                </td>
                <td style="font-family: 'Space Grotesk', sans-serif;">${parseInt(t.views).toLocaleString()}</td>
                <td><span style="color: #00ff88; font-weight: 600;">+${t.growth_rate}%</span></td>
            </tr>
            `;
        }).join("");

        // Suspicious
        const suspBody = document.getElementById("suspicious-tbody");
        suspBody.innerHTML = data.suspicious.map(t => {
            const rawThumbSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="68" style="background:#27272a"><text x="60" y="34" fill="#a1a1aa" font-family="sans-serif" font-size="12" text-anchor="middle" dominant-baseline="middle">No Thumb</text></svg>`;
            const thumbFallback = `data:image/svg+xml;utf8,${encodeURIComponent(rawThumbSvg)}`;
            const thumb = t.thumbnail_url || thumbFallback;
            
            return `
            <tr>
                <td>
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <img src="${thumb}" class="trend-thumbnail" alt="Thumbnail" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='${thumbFallback}';">
                        <div>
                            <div style="font-weight: 600; color: white; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.title}</div>
                            <div style="font-size: 12px; color: #fb7185; margin-top: 4px; display: flex; align-items: center; gap: 4px;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                Low Engagement Rate
                            </div>
                        </div>
                    </div>
                </td>
                <td>
                    <button class="btn btn-danger" onclick="deleteTrend(${t.id})">Remove</button>
                </td>
            </tr>
            `;
        }).join("");
        
        if(data.suspicious.length === 0) suspBody.innerHTML = "<tr><td colspan='2' style='text-align:center; padding: 32px;'>No suspicious trends detected.</td></tr>";

    } catch(e) {
        console.error(e);
    }
}

window.deleteTrend = async (id) => {
    if(!confirm('Remove this trend from the system?')) return;
    await fetchAdmin(`trends/${id}`, { method: 'DELETE' });
    loadTrends();
}

// ─── ACTIVITY FEED ───
async function loadActivityFeed() {
    try {
        const logs = await fetchAdmin('activity');
        const container = document.getElementById("activity-feed-container");
        
        if (logs.length === 0) {
            container.innerHTML = "<div style='padding: 24px; text-align: center; color: #a1a1aa;'>No system logs recorded yet.</div>";
            return;
        }

        container.innerHTML = logs.map(log => {
            const time = new Date(log.created_at).toLocaleTimeString();
            let color = "var(--text)";
            if(log.event_type.includes("delete")) color = "#fb7185";
            if(log.event_type.includes("change") || log.event_type.includes("update")) color = "#facc15";
            
            return `
                <div class="feed-item">
                    <div>
                        <div style="margin-bottom: 4px;">
                            <span class="badge badge-low" style="margin-right: 8px;">${log.event_type}</span>
                            <span style="color: ${color}; font-size: 14px; font-weight: 500;">${log.message}</span>
                        </div>
                        <div class="feed-time">By: ${log.user_email || 'System'}</div>
                    </div>
                    <div class="feed-time">${time}</div>
                </div>
            `;
        }).join("");
    } catch(e) {
        console.error(e);
    }
}

// ─── SETTINGS ───
async function loadSettings() {
    try {
        const settings = await fetchAdmin('settings');
        if(settings.maintenance_mode) document.getElementById('set-maintenance').value = settings.maintenance_mode;
        if(settings.allow_signups) document.getElementById('set-signups').value = settings.allow_signups;
        if(settings.data_retention_days) document.getElementById('set-retention').value = settings.data_retention_days;
    } catch(e) {}
}

document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const settings = {
        maintenance_mode: document.getElementById('set-maintenance').value,
        allow_signups: document.getElementById('set-signups').value,
        data_retention_days: document.getElementById('set-retention').value
    };
    
    try {
        await fetchAdmin('settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings })
        });
        alert("Settings saved successfully");
    } catch(e) {
        alert("Failed to save settings");
    }
});

// ─── FEEDBACK TAB ───
async function loadFeedback() {
    try {
        const res = await fetch("https://trendscope-production-3708.up.railway.app/api/feedback", {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem('adminToken') || ''}`
            },
            credentials: 'include'
        });
        
        if (res.status === 401 || res.status === 403) {
            window.location.href = "admin-login.html";
            return;
        }

        const data = await res.json();
        renderFeedbackTable(data.feedbacks || []);
    } catch(e) {
        console.error("Feedback load error", e);
    }
}

function renderFeedbackTable(feedbacks) {
    const tbody = document.getElementById("feedback-tbody");
    if (!feedbacks || feedbacks.length === 0) {
        tbody.innerHTML = "<tr><td colspan='7' style='text-align:center; padding: 32px;'>No feedback received yet.</td></tr>";
        return;
    }

    tbody.innerHTML = feedbacks.map(f => {
        let stars = "";
        for (let i = 0; i < 5; i++) {
            stars += `<span style="color: ${i < f.rating ? '#f59e0b' : 'var(--border2)'};">★</span>`;
        }

        let statusBadge = "";
        if (f.is_hidden) {
            statusBadge = `<span style="padding: 4px 8px; background: rgba(244,63,94,0.1); color: #f43f5e; border-radius: 4px; font-size: 11px; font-weight: 600;">Hidden</span>`;
        } else if (f.is_approved) {
            statusBadge = `<span style="padding: 4px 8px; background: rgba(74,222,128,0.1); color: #4ade80; border-radius: 4px; font-size: 11px; font-weight: 600;">Approved</span>`;
        } else {
            statusBadge = `<span style="padding: 4px 8px; background: rgba(245,158,11,0.1); color: #f59e0b; border-radius: 4px; font-size: 11px; font-weight: 600;">Pending</span>`;
        }

        return `
        <tr>
            <td style="font-size: 12px; color: #a1a1aa;">${new Date(f.created_at).toLocaleString()}</td>
            <td style="font-weight: 600; color: white;">${f.name}</td>
            <td style="color: #a1a1aa;">${f.email}</td>
            <td style="font-size: 16px;">${stars}</td>
            <td style="max-width: 300px;">
                <div style="color: #a1a1aa; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 6px; font-size: 13px;">
                    ${f.message}
                </div>
            </td>
            <td>${statusBadge}</td>
            <td>
                <div style="display: flex; gap: 8px;">
                    ${!f.is_approved ? `<button onclick="approveFeedback(${f.id})" style="padding: 4px 8px; background: #4ade80; color: #000; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600;">Approve</button>` : ''}
                    <button onclick="toggleFeedbackVisibility(${f.id})" style="padding: 4px 8px; background: var(--bg3); color: var(--text); border: 1px solid var(--border2); border-radius: 4px; cursor: pointer; font-size: 11px;">${f.is_hidden ? 'Unhide' : 'Hide'}</button>
                    <button onclick="deleteFeedback(${f.id})" style="padding: 4px 8px; background: rgba(244,63,94,0.1); color: #f43f5e; border: 1px solid rgba(244,63,94,0.2); border-radius: 4px; cursor: pointer; font-size: 11px;">Delete</button>
                </div>
            </td>
        </tr>
        `;
    }).join("");
}

// Feedback Admin Actions
async function adminFeedbackAction(id, endpoint, method = 'PUT') {
    try {
        const res = await fetch(`https://trendscope-production-3708.up.railway.app/api/admin/feedback/${endpoint}/${id}`, {
            method,
            headers: { "Authorization": `Bearer ${localStorage.getItem('adminToken') || ''}` },
            credentials: 'include'
        });
        if (res.ok) {
            loadFeedback(); // Reload table
        } else {
            const data = await res.json();
            alert(data.error || "Action failed");
        }
    } catch (e) {
        alert("Action failed. See console.");
        console.error(e);
    }
}

function approveFeedback(id) {
    if (confirm("Approve this feedback to display publicly?")) {
        adminFeedbackAction(id, 'approve');
    }
}

function toggleFeedbackVisibility(id) {
    adminFeedbackAction(id, 'hide');
}

function deleteFeedback(id) {
    if (confirm("Are you sure you want to permanently delete this feedback?")) {
        adminFeedbackAction(id, '', 'DELETE'); // Route is /api/admin/feedback/:id
    }
}
