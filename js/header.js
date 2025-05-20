/**
 * Premium Freight - Componente de Header
 * Genera el encabezado de navegación dinámicamente según el nivel de autorización del usuario
 * y gestiona las interacciones del menú móvil.
 */

function createHeader(authLevel) {
    // Detecta la página actual
    const currentPage = window.location.pathname.split('/').pop() || 'index.php';

    /**
     * Función para crear enlaces de navegación con iconos
     * @param {string} href - URL del enlace
     * @param {string} text - Texto del enlace
     * @param {string} iconClass - Clase de FontAwesome para el icono
     * @returns {string} HTML para el ítem de navegación
     */
    function navLink(href, text, iconClass = '') {
        const isActive = href === currentPage ? 'active' : '';
        const iconHTML = iconClass ? `<i class="${iconClass} nav__link-icon"></i>` : '';
        return `<li class="nav__item"><a href="${href}" class="nav__link ${isActive}">${iconHTML} ${text}</a></li>`;
    }

    // Construye los elementos de navegación según el nivel de autorización
    let navItems = '';
    
    if (authLevel === 0) { // Usuario regular
        navItems += navLink('profile.php', 'My Profile', 'fas fa-user');
        navItems += navLink('newOrder.php', 'New Order', 'fas fa-plus-circle');
        navItems += navLink('#', 'Manual', 'fas fa-book');
    } else { // Usuario administrador
        navItems += navLink('profile.php', 'My Profile', 'fas fa-user-shield');
        navItems += navLink('newOrder.php', 'New Order', 'fas fa-plus-circle');
        navItems += navLink('orders.php', 'Generated Orders', 'fas fa-list-alt');
        navItems += navLink('adminUsers.php', 'Admin User', 'fas fa-users-cog');
        navItems += navLink('dashboard.php', 'Charts', 'fas fa-chart-bar');
        navItems += navLink('#', 'Manual', 'fas fa-book');
    }

    // Añade enlace de cierre de sesión si el usuario está conectado
    if (window.userName) {
        navItems += navLink('dao/users/logout.php', 'Log Out', 'fas fa-sign-out-alt');
    }

    // Construye el HTML del header
    const headerHTML = `
    <header class="header">
        <a href="index.php" class="header__logo">GRAMMER</a>
        <i class="fas fa-bars header__toggle" id="nav-toggle"></i>
        
        <nav class="nav" id="nav-menu">
            <div class="nav__content">
                <i class="fas fa-times nav__close" id="nav-close"></i>
                
                <div class="nav__perfil">
                    <div class="nav__img">
                        <img src="assets/logo/logo.png" alt="Grammer Logo">
                    </div>
                    <div>
                        <a href="#" class="nav__name">SPECIAL FREIGHT</a>
                        ${window.userName ? `<span class="nav__user-name">${window.userName}</span>` : ''}
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

    // Inserta el header en el DOM
    document.getElementById('header-container').innerHTML = headerHTML;
}

/**
 * Inicializa la funcionalidad del header cuando el DOM está cargado
 */
document.addEventListener('DOMContentLoaded', function() {
    // Crea el header con el nivel de autorización del usuario
    createHeader(window.authorizationLevel || 0);

    // Espera a que todos los elementos estén disponibles en el DOM
    setTimeout(function() {
        // Elementos del DOM para la interacción con el menú
        const navMenu = document.getElementById('nav-menu');
        const toggleMenu = document.getElementById('nav-toggle');
        const closeMenu = document.getElementById('nav-close');
        const navLinks = document.querySelectorAll('.nav__link');
        
        /**
         * Abre el menú móvil
         */
        function openMobileMenu() {
            if (navMenu && toggleMenu) {
                navMenu.classList.add('show');
                toggleMenu.classList.add('hide-toggle');
                document.body.classList.add('menu-open');
            }
        }
        
        /**
         * Cierra el menú móvil
         */
        function closeMobileMenu() {
            if (navMenu && toggleMenu) {
                navMenu.classList.remove('show');
                
                // Retrasa mostrar el botón hamburguesa para evitar parpadeos
                setTimeout(() => {
                    if (!navMenu.classList.contains('show')) {
                        toggleMenu.classList.remove('hide-toggle');
                    }
                    document.body.classList.remove('menu-open');
                }, 300); // Coincide con la duración de la transición CSS
            }
        }
        
        // Agrega eventos a los botones de menú
        if (toggleMenu) {
            toggleMenu.addEventListener('click', openMobileMenu);
        }
        
        if (closeMenu) {
            closeMenu.addEventListener('click', closeMobileMenu);
        }
        
        // Configura eventos para los enlaces de navegación
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                // Establece el estado activo
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
                
                // Cierra el menú móvil si está abierto
                if (navMenu && navMenu.classList.contains('show')) {
                    closeMobileMenu();
                }
            });
        });
    }, 100); // Pequeño retraso para asegurar que el DOM está listo
});