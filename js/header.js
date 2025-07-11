/**
 * Premium Freight - Componente Header Responsivo (Refactorizado)
 * * Lee el contexto del usuario desde `window.PF_CONFIG` para generar el header.
 */

/**
 * Crea el HTML del header según el contexto del usuario.
 * @param {boolean} isPublicPage - Si es una página pública (login, etc.)
 */
function createHeader(isPublicPage = false) {
    if (isPublicPage) {
        createPublicHeader();
        return;
    }

    // Obtener datos del usuario desde el objeto de configuración global.
    const user = window.PF_CONFIG?.user || { authorizationLevel: 0, name: null };
    const authLevel = user.authorizationLevel;
    const userName = user.name;

    const currentPage = window.location.pathname.split('/').pop() || 'index.php';

    function navLink(href, text, iconClass = '') {
        const isActive = href === currentPage ? 'active' : '';
        const iconHTML = iconClass ? `<i class="${iconClass} nav__link-icon"></i>` : '';
        return `<li class="nav__item"><a href="${href}" class="nav__link ${isActive}">${iconHTML} ${text}</a></li>`;
    }

    let navItems = '';
    if (authLevel === 0) {
        navItems += navLink('profile.php', 'My Profile', 'fas fa-user');
        navItems += navLink('newOrder.php', 'New Order', 'fas fa-plus-circle');
        navItems += navLink('myorders.php', 'My Orders', 'fas fa-list-check');
        navItems += navLink('#', 'Manual', 'fas fa-book');
    } else {
        navItems += navLink('profile.php', 'My Profile', 'fas fa-user-shield');
        navItems += navLink('newOrder.php', 'New Order', 'fas fa-plus-circle');
        navItems += navLink('orders.php', 'Generated Orders', 'fas fa-list-alt');
        navItems += navLink('adminUsers.php', 'Admin User', 'fas fa-users-cog');
        navItems += navLink('dashboard.php', 'Charts', 'fas fa-chart-bar');
        navItems += navLink('#', 'Manual', 'fas fa-book');
    }

    if (userName) {
        navItems += navLink('dao/users/logout.php', 'Log Out', 'fas fa-sign-out-alt');
    }

    const menuTypeClass = authLevel === 0 ? 'reduced-menu' : 'full-menu';
    
    const headerHTML = `
    <header class="header ${menuTypeClass}">
        <a href="index.php" class="header__logo">GRAMMER</a>
        <i class="fas fa-bars header__toggle" id="nav-toggle"></i>
        <nav class="nav" id="nav-menu">
            <div class="nav__content bd-grid">
                <i class="fas fa-times nav__close" id="nav-close"></i>
                <div class="nav__perfil">
                    <div class="nav__img">
                        <img src="assets/logo/imagen.png" alt="logoGRAMMER">
                    </div>
                    <div>
                        <a class="nav__name">SPECIAL FREIGHT</a>
                        ${userName ? `<span class="nav__profesion">${userName}</span>` : ''}
                    </div>
                </div> 
                <div class="nav__menu">
                    <ul class="nav__list">${navItems}</ul>
                </div>
            </div>
        </nav>
    </header>
    `;

    document.getElementById('header-container').innerHTML = headerHTML;
}

/**
 * Crea un header simplificado para páginas públicas.
 */
function createPublicHeader() {
    const headerHTML = `
    <header class="header public-header">
        <div class="public-header__content">
            <div class="public-header__logo">
                <img src="assets/logo/imagen.png" alt="GRAMMER" class="public-header__logo-img">
                <span class="public-header__logo-text">SPECIAL FREIGHT</span>
            </div>
        </div>
    </header>
    `;
    document.getElementById('header-container').innerHTML = headerHTML;
}

/**
 * Inicializa la funcionalidad del header.
 */
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.php';
    const publicPages = ['index.php', 'register.php', 'recovery.php', 'password_reset.php'];
    const isPublicPage = publicPages.includes(currentPage);

    createHeader(isPublicPage);

    if (isPublicPage) {
        return;
    }

    setTimeout(function() {
        const navMenu = document.getElementById('nav-menu');
        const toggleMenu = document.getElementById('nav-toggle');
        const closeMenu = document.getElementById('nav-close');

        if (!navMenu || !toggleMenu || !closeMenu) return;

        toggleMenu.addEventListener('click', () => {
            navMenu.classList.toggle('show');
            toggleMenu.style.display = 'none';
            document.body.classList.add('menu-open');
        });

        closeMenu.addEventListener('click', () => {
            navMenu.classList.remove('show');
            setTimeout(() => {
                toggleMenu.style.display = 'block';
                document.body.classList.remove('menu-open');
            }, 300);
        });

        const navLinks = document.querySelectorAll('.nav__link');
        navLinks.forEach(n => n.addEventListener('click', function() {
            navLinks.forEach(link => link.classList.remove('active'));
            this.classList.add('active');
        }));
    }, 100);
});
