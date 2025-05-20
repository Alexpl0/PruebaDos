/**
 * Premium Freight - Header Component
 * Generates the navigation header dynamically based on user authorization level
 */

function createHeader(authLevel) {
    // Detect current page
    const currentPage = window.location.pathname.split('/').pop();

    /**
     * Helper function to create standard navigation links
     * @param {string} href - Link URL
     * @param {string} text - Link text
     * @param {string} iconClass - Clase de FontAwesome para el icono (opcional)
     * @returns {string} HTML for nav item
     */
    function navLink(href, text, iconClass = '') {
        const isActive = href === currentPage ? 'active' : '';
        const iconHTML = iconClass ? `<i class="${iconClass} nav__link-icon"></i>` : '';
        return `<li class="nav__item"><a href="${href}" class="nav__link ${isActive}">${iconHTML} ${text}</a></li>`;
    }

    // Build navigation items based on authorization level
    let navItems = '';
    
    if (authLevel === 0) {
        // Regular user navigation
        navItems += navLink('profile.php', 'My Profile', 'fas fa-user');
        navItems += navLink('newOrder.php', 'New Order', 'fas fa-plus-circle');
        navItems += navLink('#', 'Manual', 'fas fa-book');
    } else {
        // Admin navigation
        navItems += navLink('profile.php', 'My Profile', 'fas fa-user-shield');
        navItems += navLink('newOrder.php', 'New Order', 'fas fa-plus-circle');
        navItems += navLink('orders.php', 'Generated Orders', 'fas fa-list-alt');
        navItems += navLink('adminUsers.php', 'Admin User', 'fas fa-users-cog');
        navItems += navLink('dashboard.php', 'Charts', 'fas fa-chart-bar');
        navItems += navLink('#', 'Manual', 'fas fa-book');
    }

    // Add logout link if user is logged in
    if (window.userName) {
        navItems += navLink('dao/users/logout.php', 'Log Out', 'fas fa-sign-out-alt');
    }

    // Construct the header HTML
    const headerHTML = `
    <header class="header">
        <a href="index.php" class="header__logo">GRAMMER</a>
        <i class="fas fa-bars header__toggle" id="nav-toggle"></i>
        <nav class="nav" id="nav-menu">
            <div class="nav__content bd-grid">
                <i class="fas fa-times nav__close" id="nav-close"></i>
                <div class="nav__perfil">
                    <div class="nav__img">
                        <img src="assets/logo/logo.png" alt="logoGRAMMER">
                    </div>
                    <div>
                        <a href="#" class="nav__name">SPECIAL FREIGHT</a>
                        ${window.userName ? `<span class="nav__profesion">${window.userName}</span>` : ''}
                    </div>
                </div> 
                <div class="nav__menu">
                    <ul class="nav__list">
                        ${navItems}
                    </ul>
                </div>
            </div>
        </nav>
    </header>
    `;

    // Insert header into the DOM
    document.getElementById('header-container').innerHTML = headerHTML;
}

/**
 * Initialize header functionality once DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    // Create header with user's authorization level
    createHeader(window.authorizationLevel || 0);

    // Pequeño retraso para asegurar que los elementos del DOM estén disponibles
    setTimeout(function() {
        /*===== MENU SHOW Y HIDDEN =====*/
        const navMenu = document.getElementById('nav-menu');
        const toggleMenu = document.getElementById('nav-toggle');
        const closeMenu = document.getElementById('nav-close');

        // Verificar que los elementos existen antes de añadir los event listeners
        if (!navMenu || !toggleMenu || !closeMenu) {
            console.error('Elementos de navegación no encontrados:', { navMenu, toggleMenu, closeMenu });
            return;
        }

        /*SHOW*/ 
        toggleMenu.addEventListener('click', () => {
            navMenu.classList.toggle('show');
            
            // Ocultar el botón de hamburguesa cuando el menú está abierto
            toggleMenu.style.display = 'none';
            toggleMenu.classList.add('hide-toggle');
            
            // Añadir clase al body para controlar el scroll
            document.body.classList.add('menu-open');
        });

        /*HIDDEN*/
        closeMenu.addEventListener('click', () => {
            navMenu.classList.remove('show');
            
            // Volver a mostrar el botón hamburguesa con un ligero retraso
            setTimeout(() => {
                toggleMenu.style.display = 'block';
                toggleMenu.classList.remove('hide-toggle');
                document.body.classList.remove('menu-open');
            }, 300); // Coincide con la duración de la transición CSS
        });

        /*===== ACTIVE AND REMOVE MENU =====*/
        const navLinks = document.querySelectorAll('.nav__link');

        function linkAction() {
            // Active link - quitar active de todos y añadir al actual
            navLinks.forEach(n => n.classList.remove('active'));
            this.classList.add('active');
            
            // Remove menu mobile
            navMenu.classList.remove('show');
            
            // Restaurar visibilidad del botón hamburguesa
            setTimeout(() => {
                toggleMenu.style.display = 'block';
                toggleMenu.classList.remove('hide-toggle');
                document.body.classList.remove('menu-open');
            }, 300);
        }

        // Añadir event listener a todos los enlaces
        navLinks.forEach(n => n.addEventListener('click', linkAction));
    }, 100);
});