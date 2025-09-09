/**
 * Premium Freight - Responsive Header Component (Definitive Fix)
 * - Dynamically injects Driver.js dependencies to ensure they are loaded.
 * - Reads user context from `window.PF_CONFIG`.
 * - Creates the header on DOMContentLoaded.
 * - Initializes the tour system only after Driver.js has successfully loaded.
 * - Added Charts dropdown menu with Dashboard and Weekly Performance options.
 */

// Se mantiene la ruta de importación correcta.
import { initContextualHelp } from './tours/tour-manager.js';

/**
 * Dynamically loads a script and returns a promise that resolves when the script is loaded.
 * @param {string} src The source URL of the script.
 * @returns {Promise<void>}
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });
}

/**
 * Dynamically loads a stylesheet.
 * @param {string} href The URL of the stylesheet.
 */
function loadStyle(href) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
}

/**
 * Creates a navigation link with active state detection
 * @param {string} href - The URL of the link
 * @param {string} text - The text to display
 * @param {string} iconClass - The icon class for the link
 * @returns {string} HTML string for the navigation link
 */
function navLink(href, text, iconClass = '') {
    const currentPage = window.location.pathname.split('/').pop() || 'index.php';
    const isActive = href === currentPage ? 'active' : '';
    const iconHTML = iconClass ? `<i class="${iconClass} nav__link-icon"></i>` : '';
    return `<li class="nav__item"><a href="${href}" class="nav__link ${isActive}">${iconHTML} ${text}</a></li>`;
}

/**
 * Creates a dropdown navigation menu for Charts section
 * @returns {string} HTML string for the charts dropdown
 */
function createChartsDropdown() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.php';
    const chartsPages = ['dashboard.php', 'weeklyPerformance.php'];
    const isChartsActive = chartsPages.includes(currentPage) ? 'active' : '';
    
    return `
        <li class="nav__item nav__item-dropdown dropdown">
            <a href="#" class="nav__link ${isChartsActive}" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="fas fa-chart-bar nav__link-icon"></i> Analytics
            </a>
            <ul class="dropdown-menu">
                <li>
                    <a class="dropdown-item ${currentPage === 'dashboard.php' ? 'active' : ''}" href="dashboard.php">
                        <i class="fas fa-tachometer-alt me-2"></i> Main Dashboard
                    </a>
                </li>
                <li>
                    <a class="dropdown-item ${currentPage === 'weeklyPerformance.php' ? 'active' : ''}" href="weeklyPerformance.php">
                        <i class="fas fa-chart-line me-2"></i> Weekly Performance
                    </a>
                </li>
            </ul>
        </li>
    `;
}

/**
 * Creates a dropdown navigation menu for New Order section
 * @returns {string} HTML string for the new order dropdown
 */
function createNewOrderDropdown() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.php';
    const newOrderPages = ['newOrder.php'];
    const quotesPages = ['quotes.php']; // Para cotizaciones/index.php
    const currentPath = window.location.pathname;
    
    // Check if we're in the quotes section
    const isInQuotesSection = currentPath.includes('cotizaciones/');
    const isNewOrderActive = newOrderPages.includes(currentPage) || isInQuotesSection ? 'active' : '';
    
    return `
        <li class="nav__item nav__item-dropdown dropdown">
            <a href="#" class="nav__link ${isNewOrderActive}" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="fas fa-plus-circle nav__link-icon"></i> New Order
            </a>
            <ul class="dropdown-menu">
                <li>
                    <a class="dropdown-item ${currentPage === 'newOrder.php' ? 'active' : ''}" href="newOrder.php">
                        <i class="fas fa-shipping-fast me-2"></i> New Order
                    </a>
                </li>
                <li>
                    <a class="dropdown-item ${isInQuotesSection ? 'active' : ''}" href="cotizaciones/index.php">
                        <i class="fas fa-calculator me-2"></i> Quotes
                    </a>
                </li>
            </ul>
        </li>
    `;
}

/**
 * Creates the header HTML based on the user context.
 * @param {boolean} isPublicPage - If it is a public page (login, etc.)
 */
function createHeader(isPublicPage = false) {
    if (isPublicPage) {
        createPublicHeader();
        return;
    }

    const user = window.PF_CONFIG?.user || { authorizationLevel: 0, name: null, id: null };
    const authLevel = user.authorizationLevel;
    const userName = user.name;
    const userId = user.id;

    const helpDropdownHTML = `
        <li class="nav__item nav__item-dropdown dropdown" id="help-nav-item" style="display: none;">
            <a href="#" class="nav__link" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="fas fa-question-circle nav__link-icon"></i> Help
            </a>
            <ul class="dropdown-menu" id="help-dropdown-menu">
                <li><a class="dropdown-item" href="#">Loading...</a></li>
            </ul>
        </li>
    `;

    let navItems = '';
    
    // User-level based navigation logic with updated New Order dropdown
    if (userId === 36 ) { // Super User
        navItems += navLink('profile.php', 'My Profile', 'fas fa-user-shield');
        navItems += createNewOrderDropdown(); // 👈 Updated: New Order dropdown instead of single link
        navItems += navLink('orders.php', 'Generated Orders', 'fas fa-list-alt');
        navItems += navLink('adminUsers.php', 'Admin User', 'fas fa-users-cog');
        navItems += createChartsDropdown();
        navItems += helpDropdownHTML;
    } else if (authLevel > 0) { // Admin
        navItems += navLink('profile.php', 'My Profile', 'fas fa-user-shield');
        navItems += createNewOrderDropdown(); // 👈 Updated: New Order dropdown instead of single link
        navItems += navLink('orders.php', 'Generated Orders', 'fas fa-list-alt');
        navItems += createChartsDropdown();
        navItems += helpDropdownHTML;
    } else { // Regular User
        navItems += navLink('profile.php', 'My Profile', 'fas fa-user');
        navItems += createNewOrderDropdown(); // 👈 Updated: New Order dropdown instead of single link
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
        <li class="nav__item nav__item-dropdown dropdown" id="help-nav-item" style="display: none;">
            <a href="#" class="nav__link" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="fas fa-question-circle nav__link-icon"></i> Help
            </a>
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
// 1. Build the basic page structure as soon as the HTML is parsed.
document.addEventListener('DOMContentLoaded', function() {
    if (typeof window.APP_CONTEXT !== 'undefined' && typeof window.PF_CONFIG === 'undefined') {
        window.PF_CONFIG = window.APP_CONTEXT;
    }
    const currentPage = window.location.pathname.split('/').pop() || 'index.php';
    const publicPages = ['index.php', 'register.php', 'recovery.php', 'password_reset.php', 'verification_required.php'];
    const isPublicPage = publicPages.includes(currentPage);
    createHeader(isPublicPage);

    // Load Driver.js and initialize the help system
    const driverCSS = 'https://cdn.jsdelivr.net/npm/driver.js@latest/dist/driver.css';
    const driverJS = 'https://cdn.jsdelivr.net/npm/driver.js@latest/dist/driver.js.iife.js';

    loadStyle(driverCSS);
    loadScript(driverJS)
        .then(() => {
            // Let the tour manager handle everything, including showing the menu.
            initContextualHelp(); 
        })
        .catch(error => {
            console.error(error);
            // Hide the help menu if the script fails to load
            const helpNavItem = document.getElementById('help-nav-item');
            if (helpNavItem) {
                helpNavItem.style.display = 'none';
            }
        });

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