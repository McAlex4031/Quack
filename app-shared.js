// ============================================================
// QUACK — Fonctions partagées entre toutes les pages
// Doit être chargé APRÈS supabase-config.js
// ============================================================

const EMOJIS = ['🥸', '🦆', '🥳', '🤡', '👻', '🐶', '🐽', '🌸', '🥐', '🌎', '🔥', '🏅', '🏆', '⚽️', '🏀', '🏐', '⛔️', '👑', '🗿', '🤨', '💰', '🤪', '😀'];

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🔥', '😮'];

const ROLE_INFO = {
    user: { badge: '👤', label: 'Utilisateur' },
    moderator: { badge: '🛡️', label: 'Modérateur' },
    creator: { badge: '⭐', label: 'Créateur' }
};

const NAV_ITEMS = [
    { id: 'accueil', icon: '🏠', label: 'Accueil', href: 'accueil.html', ready: true },
    { id: 'chat', icon: '🌎', label: 'Chat mondial', href: 'chat-mondial.html', ready: true },
    { id: 'mp', icon: '💬', label: 'Messages privés', href: 'messages-prives.html', ready: true },
    { id: 'groupes', icon: '👥', label: 'Groupes', href: 'groupes.html', ready: true },
    { id: 'profil', icon: '👤', label: 'Profil', href: null, ready: false },
    { id: 'parametres', icon: '⚙️', label: 'Paramètres', href: null, ready: false }
];

/**
 * Vérifie qu'une session existe et que le compte n'est pas banni.
 * Redirige vers connexion.html si besoin. Renvoie le profil sinon.
 */
async function requireAuth() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        window.location.href = 'connexion.html';
        return null;
    }

    const { data: ban } = await supabaseClient
        .from('banned_users')
        .select('reason')
        .eq('user_id', user.id)
        .maybeSingle();

    if (ban) {
        await supabaseClient.auth.signOut();
        window.location.href = 'connexion.html?banned=' + encodeURIComponent(ban.reason);
        return null;
    }

    const { data: profile, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error || !profile) {
        await supabaseClient.auth.signOut();
        window.location.href = 'connexion.html';
        return null;
    }

    return profile;
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'connexion.html';
}

function roleInfo(role) {
    return ROLE_INFO[role] || ROLE_INFO.user;
}

function formatTime(isoString) {
    const d = new Date(isoString);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str === null || str === undefined ? '' : str;
    return div.innerHTML;
}

/**
 * Construit la barre de navigation (colonne fixe sur desktop, tiroir
 * rétractable sur mobile) et l'injecte dans #sidebar-root.
 */
function renderSidebar(activeId, currentUser) {
    const root = document.getElementById('sidebar-root');
    if (!root) return;

    const info = roleInfo(currentUser.role);

    const navHtml = NAV_ITEMS.map(function (item) {
        const isActive = item.id === activeId ? 'active' : '';
        if (item.ready) {
            return '<a href="' + item.href + '" class="nav-link ' + isActive + '">' +
                '<span class="nav-icon">' + item.icon + '</span><span>' + item.label + '</span>' +
                '</a>';
        }
        return '<button type="button" class="nav-link nav-link--soon" data-soon="' + escapeHtml(item.label) + '">' +
            '<span class="nav-icon">' + item.icon + '</span><span>' + item.label + '</span>' +
            '<span class="soon-tag">bientôt</span>' +
            '</button>';
    }).join('');

    root.innerHTML =
        '<button type="button" class="mobile-toggle" id="mobileToggle" aria-label="Ouvrir le menu">☰</button>' +
        '<div class="sidebar-overlay" id="sidebarOverlay"></div>' +
        '<aside class="sidebar" id="sidebar">' +
        '  <div class="sidebar-logo">🦆 <span>Quack</span></div>' +
        '  <nav class="sidebar-nav">' + navHtml + '</nav>' +
        '  <div class="sidebar-user">' +
        '    <div class="sidebar-user-emoji">' + currentUser.emoji + '</div>' +
        '    <div class="sidebar-user-info">' +
        '      <div class="sidebar-user-name">' + escapeHtml(currentUser.display_name) + '</div>' +
        '      <div class="sidebar-user-badge">' + info.badge + ' ' + info.label + '</div>' +
        '    </div>' +
        '    <button type="button" class="sidebar-logout" id="logoutBtn" title="Se déconnecter">🚪</button>' +
        '  </div>' +
        '</aside>';

    document.getElementById('logoutBtn').addEventListener('click', logout);

    document.querySelectorAll('.nav-link--soon').forEach(function (btn) {
        btn.addEventListener('click', function () {
            showToast(btn.dataset.soon + ' arrive bientôt 🦆');
        });
    });

    const toggle = document.getElementById('mobileToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    function closeMenu() {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
    }

    toggle.addEventListener('click', function () {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
    });
    overlay.addEventListener('click', closeMenu);
}

function truncate(str, maxLen) {
    if (!str) return '';
    return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

/**
 * Recherche des utilisateurs par identifiant (pour démarrer un MP).
 * Exclut l'utilisateur courant des résultats.
 */
async function searchUsers(query, excludeUserId) {
    const trimmed = (query || '').trim();
    if (trimmed.length === 0) return [];

    let request = supabaseClient
        .from('users')
        .select('id, username, display_name, emoji, role')
        .ilike('username', '%' + trimmed + '%')
        .limit(10);

    if (excludeUserId) request = request.neq('id', excludeUserId);

    const { data } = await request;
    return data || [];
}

function showToast(message) {
    let toast = document.getElementById('globalToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'globalToast';
        toast.className = 'global-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(function () {
        toast.classList.remove('show');
    }, 2800);
}
