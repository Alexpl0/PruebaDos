/**
 * Premium Freight - Header Component
 * Generates the navigation header dynamically based on user authorization level
 */

function createHeader(authLevel) {
    // console.log('Authorization Level:', authLevel);
    
    // Detect current page
    const currentPage = window.location.pathname.split('/').pop();

    /**
     * Helper function to create standard navigation links
     * @param {string} href - Link URL
     * @param {string} text - Link text
     * @returns {string} HTML for nav item
     */
    function navLink(href, text) {
        const isActive = href === currentPage ? 'active' : '';
        return `<li class="nav__item"><a href="${href}" class="nav__link ${isActive}">${text}</a></li>`;
    }

    // Build navigation items based on authorization level
    let navItems = '';
    
    if (authLevel === 0) {
        // Regular user navigation
        navItems += navLink('profile.php', 'My Profile');
        navItems += navLink('newOrder.php', 'New Order');
        navItems += navLink('#', 'Manual');
    } else {
        // Admin navigation
        navItems += navLink('profile.php', 'My Profile');
        navItems += navLink('newOrder.php', 'New Order');
        navItems += navLink('orders.php', 'Generated Orders');
        navItems += navLink('adminUsers.php', 'Admin User');
        navItems += navLink('dashboard.php', 'Charts');
        navItems += navLink('#', 'Manual');
    }

    // Add logout link if user is logged in
    if (window.userName) {
        navItems += navLink('dao/users/logout.php', 'Log Out');
    }

    // Construct the header HTML
    const headerHTML = `
    <header class="header">
        <a href="#" class="header__logo">GRAMMER</a>
        <i class="fas fa-bars header__toggle" id="nav-toggle" style="color: white !important"></i>
        <nav class="nav" id="nav-menu">
            <div class="nav__content bd-grid">
                <i class="fas fa-times nav__close" id="nav-close" style="color: white !important; z-index: 1100;"></i>
                <div class="nav__perfil">
                    <div class="nav__img">
                        <img src="assets/logo/logo.png" alt="logoGRAMMER">
                    </div>
                    <div>
                        <a href="#" class="nav__name">SPECIAL FREIGHT</a>
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

    // Usa setTimeout para asegurarte de que los elementos estén en el DOM
    setTimeout(function() {
        // Setup mobile menu toggle
        const navMenu = document.getElementById('nav-menu');
        const toggleMenu = document.getElementById('nav-toggle');
        const closeMenu = document.getElementById('nav-close');
        
        console.log('Elementos de navegación:', {navMenu, toggleMenu, closeMenu});
        
        // Modifica el addEventListener del toggleMenu
        if (toggleMenu && navMenu) {
            toggleMenu.addEventListener('click', () => {
                console.log('Toggle menu clicked');
                navMenu.classList.toggle('show');
                
                // Ocultar inmediatamente el botón hamburguesa
                toggleMenu.style.display = 'none'; // Ocultación inmediata
                toggleMenu.classList.add('hide-toggle'); // Clase CSS para mantenerlo oculto
                
                // Añadir clase al body para posible control adicional
                document.body.classList.add('menu-open');
            });
        }
        
        // Modifica el addEventListener del closeMenu
        if (closeMenu && navMenu) {
            closeMenu.addEventListener('click', () => {
                console.log('Close menu clicked');
                navMenu.classList.remove('show');
                
                // Volver a mostrar el botón hamburguesa con un ligero retraso
                setTimeout(() => {
                    // Retraso pequeño para evitar parpadeos
                    toggleMenu.style.display = 'block';
                    toggleMenu.classList.remove('hide-toggle');
                    document.body.classList.remove('menu-open');
                }, 300); // 300ms es el tiempo aproximado de la transición del menú
            });
        }
        
        // Setup navigation link active state
        const navLinks = document.querySelectorAll('.nav__link');   
        
        function linkAction() {
            navLinks.forEach(link => link.classList.remove('active'));
            this.classList.add('active');
            navMenu.classList.remove('show');
            
            // Volver a mostrar el botón hamburguesa cuando se hace clic en un enlace
            if (toggleMenu) {
                toggleMenu.classList.remove('hide-toggle');
            }
        }
        
        navLinks.forEach(link => link.addEventListener('click', linkAction));
    }, 100); // Un pequeño retraso para asegurar que el DOM está listo
});