/**
 * Premium Freight - Responsive Header Component (Final Fix)
 * - Reads user context from `window.PF_CONFIG`.
 * - Creates the header on DOMContentLoaded.
 * - Initializes the tour system on window.load to ensure external scripts are ready.
 */

import { initContextualHelp } from './tour/tour-manager.js';

/**
 * Creates the header HTML based on the user context.
 * @param {boolean} isPublicPage - If it is a public page (login, etc.)
 */
function createHeader(isPublicPage = false) {
    // This function's internal logic remains the same.
    if (isPublicPage) {
        createPublicHeader();
        return;
    }

    const user = window.PF_CONFIG?.user || { authorizationLevel: 0, name: null, id: null };
    const authLevel = user.authorizationLevel;
    const userName = user.name;
    const userId = user.id;

    const currentPage = window.location.pathname.split('/').pop() || 'index.php';

    function navLink(href, text, iconClass = '') {
        const isActive = href === currentPage ? 'active' : '';
        const iconHTML = iconClass ? `<i class="${iconClass} nav__link-icon"></i>` : '';
        return `<li class="nav__item"><a href="${href}" class="nav__link ${isActive}">${iconHTML} ${text}</a></li>`;
    }

    const helpDropdownHTML = `
        <li class="nav__item nav__item-dropdown" id="help-nav-item">
            <a href="#" class="nav__link">
                <i class="fas fa-question-circle nav__link-icon"></i> Help
            </a>
            <ul class="dropdown-menu" id="help-dropdown-menu">
                <li><a class="dropdown-item" href="#">Loading...</a></li>
            </ul>
        </li>
    `;

    let navItems = '';

    if (userId === 36) { // Super User
        navItems += navLink('profile.php', 'My Profile', 'fas fa-user-shield');
        navItems += navLink('newOrder.php', 'New Order', 'fas fa-plus-circle');
        navItems += navLink('orders.php', 'Generated Orders', 'fas fa-list-alt');
        navItems += navLink('adminUsers.php', 'Admin User', 'fas fa-users-cog');
        navItems += navLink('dashboard.php', 'Charts', 'fas fa-chart-bar');
        navItems += helpDropdownHTML;
    } else if (authLevel > 0) { // Admin
        navItems += navLink('profile.php', 'My Profile', 'fas fa-user-shield');
        navItems += navLink('newOrder.php', 'New Order', 'fas fa-plus-circle');
        navItems += navLink('orders.php', 'Generated Orders', 'fas fa-list-alt');
        navItems += navLink('dashboard.php', 'Charts', 'fas fa-chart-bar');
        navItems += helpDropdownHTML;
    } else { // Regular User
        navItems += navLink('profile.php', 'My Profile', 'fas fa-user');
        navItems += navLink('newOrder.php', 'New Order', 'fas fa-plus-circle');
        navItems += navLink('myorders.php', 'My Orders', 'fas fa-list-check');
        navItems += helpDropdownHTML;
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
                    <div class="nav__img"><img src="assets/logo/imagen.png" alt="logoGRAMMER"></div>
                    <div>
                        <a class="nav__name">SPECIAL FREIGHT</a>
                        ${userName ? `<span class="nav__profesion">${userName}</span>` : ''}
                    </div>
                </div> 
                <div class="nav__menu"><ul class="nav__list">${navItems}</ul></div>
            </div>
        </nav>
    </header>
    `;

    document.getElementById('header-container').innerHTML = headerHTML;
}

function createPublicHeader() {
    const helpDropdownHTML = `
        <li class="nav__item nav__item-dropdown" id="help-nav-item">
            <a href="#" class="nav__link"><i class="fas fa-question-circle nav__link-icon"></i> Help</a>
            <ul class="dropdown-menu" id="help-dropdown-menu">
                <li><a class="dropdown-item" href="#">Loading...</a></li>
            </ul>
        </li>
    `;
    const headerHTML = `
    <header class="header public-header">
        <div class="public-header__content">
            <div class="public-header__logo">
                <img src="assets/logo/imagen.png" alt="GRAMMER" class="public-header__logo-img">
                <span class="public-header__logo-text">SPECIAL FREIGHT</span>
            </div>
            <nav><ul class="nav__list public-nav__list">${helpDropdownHTML}</ul></nav>
        </div>
    </header>
    `;
    document.getElementById('header-container').innerHTML = headerHTML;
}

/**
 * Main initialization logic.
 */
// 1. First, build the basic page structure as soon as the HTML is parsed.
document.addEventListener('DOMContentLoaded', function() {
    if (typeof window.APP_CONTEXT !== 'undefined' && typeof window.PF_CONFIG === 'undefined') {
        window.PF_CONFIG = window.APP_CONTEXT;
    }

    const currentPage = window.location.pathname.split('/').pop() || 'index.php';
    const publicPages = ['index.php', 'register.php', 'recovery.php', 'password_reset.php', 'verification_required.php'];
    const isPublicPage = publicPages.includes(currentPage);

    createHeader(isPublicPage);

    // Attach mobile menu listeners
    if (!isPublicPage) {
        setTimeout(function() {
            const navMenu = document.getElementById('nav-menu');
            const toggleMenu = document.getElementById('nav-toggle');
            const closeMenu = document.getElementById('nav-close');
            if (navMenu && toggleMenu && closeMenu) {
                toggleMenu.addEventListener('click', () => { navMenu.classList.toggle('show'); });
                closeMenu.addEventListener('click', () => { navMenu.classList.remove('show'); });
            }
        }, 100);
    }
});

// 2. Then, once ALL resources (including external scripts) are loaded, initialize the interactive help.
window.addEventListener('load', function() {
    initContextualHelp();
});
