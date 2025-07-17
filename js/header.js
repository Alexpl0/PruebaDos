/**
 * Premium Freight - Responsive Header Component (Versión corregida)
 * - Carga Driver.js dinámicamente con mejores validaciones
 * - Evita duplicaciones de carga
 * - Manejo de errores mejorado
 */

import { initContextualHelp } from './tours/tour-manager.js';

/**
 * Dinamicamente carga un script y retorna una promesa
 * @param {string} src La URL del script
 * @returns {Promise<void>}
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        // Verificar si el script ya está cargado
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => {
            console.log(`Script cargado exitosamente: ${src}`);
            resolve();
        };
        script.onerror = () => {
            console.error(`Error al cargar script: ${src}`);
            reject(new Error(`Failed to load script: ${src}`));
        };
        document.head.appendChild(script);
    });
}

/**
 * Dinamicamente carga un stylesheet
 * @param {string} href La URL del stylesheet
 */
function loadStyle(href) {
    // Verificar si el stylesheet ya está cargado
    if (document.querySelector(`link[href="${href}"]`)) {
        return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
}

/**
 * Crea el header HTML basado en el contexto del usuario
 * @param {boolean} isPublicPage - Si es una página pública
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
    const currentPage = window.location.pathname.split('/').pop() || 'index.php';

    function navLink(href, text, iconClass = '') {
        const isActive = href === currentPage ? 'active' : '';
        const iconHTML = iconClass ? `<i class="${iconClass} nav__link-icon"></i>` : '';
        return `<li class="nav__item"><a href="${href}" class="nav__link ${isActive}">${iconHTML} ${text}</a></li>`;
    }

    const helpDropdownHTML = `
        <li class="nav__item nav__item-dropdown" id="help-nav-item" style="display: none;">
            <a href="#" class="nav__link">
                <i class="fas fa-question-circle nav__link-icon"></i> Help
            </a>
            <ul class="dropdown-menu" id="help-dropdown-menu">
                <li><a class="dropdown-item" href="#">Loading...</a></li>
            </ul>
        </li>
    `;

    let navItems = '';
    // Lógica de navegación basada en nivel de usuario
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
    } else { // Usuario regular
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
        <li class="nav__item nav__item-dropdown" id="help-nav-item" style="display: none;">
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
 * Inicializa Driver.js con validaciones mejoradas
 */
async function initializeDriverJS() {
    const driverCSS = 'https://cdn.jsdelivr.net/npm/driver.js@latest/dist/driver.css';
    const driverJS = 'https://cdn.jsdelivr.net/npm/driver.js@latest/dist/driver.js.iife.js';

    try {
        // Cargar CSS
        loadStyle(driverCSS);
        
        // Cargar JS
        await loadScript(driverJS);
        
        // Verificar que Driver.js se cargó correctamente
        if (typeof window.driver === 'undefined' || typeof window.driver.driver !== 'function') {
            throw new Error('Driver.js no se cargó correctamente');
        }
        
        console.log('Driver.js cargado y validado exitosamente');
        
        // Inicializar el sistema de ayuda
        initContextualHelp();
        
        // Mostrar el menú de ayuda
        const helpNavItem = document.getElementById('help-nav-item');
        if (helpNavItem) {
            helpNavItem.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error al cargar Driver.js:', error);
        
        // Ocultar el menú de ayuda si hay error
        const helpNavItem = document.getElementById('help-nav-item');
        if (helpNavItem) {
            helpNavItem.style.display = 'none';
        }
        
        // Mostrar error al usuario si SweetAlert está disponible
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'Sistema de ayuda no disponible',
                text: 'El sistema de ayuda interactiva no se pudo cargar. La aplicación funcionará normalmente.',
                timer: 3000,
                timerProgressBar: true
            });
        }
    }
}

/**
 * Inicializa los listeners del menú móvil
 */
function initMobileMenuListeners() {
    const navMenu = document.getElementById('nav-menu');
    const toggleMenu = document.getElementById('nav-toggle');
    const closeMenu = document.getElementById('nav-close');
    
    if (navMenu && toggleMenu && closeMenu) {
        toggleMenu.addEventListener('click', () => {
            navMenu.classList.toggle('show');
        });
        
        closeMenu.addEventListener('click', () => {
            navMenu.classList.remove('show');
        });
    }
}

/**
 * Inicialización principal
 */
document.addEventListener('DOMContentLoaded', function() {
    // Configurar contexto si es necesario
    if (typeof window.APP_CONTEXT !== 'undefined' && typeof window.PF_CONFIG === 'undefined') {
        window.PF_CONFIG = window.APP_CONTEXT;
    }
    
    // Determinar si es página pública
    const currentPage = window.location.pathname.split('/').pop() || 'index.php';
    const publicPages = ['index.php', 'register.php', 'recovery.php', 'password_reset.php', 'verification_required.php'];
    const isPublicPage = publicPages.includes(currentPage);
    
    // Crear header
    createHeader(isPublicPage);
    
    // Inicializar menú móvil para páginas privadas
    if (!isPublicPage) {
        setTimeout(initMobileMenuListeners, 100);
    }
    
    // Inicializar Driver.js de manera asíncrona
    initializeDriverJS();
});