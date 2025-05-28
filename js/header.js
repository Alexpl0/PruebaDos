/**
 * Premium Freight - Componente Header Responsivo
 * 
 * Este componente maneja:
 * 1. Generación dinámica del header basado en el nivel de autorización del usuario
 * 2. Navegación responsiva adaptable a diferentes tamaños de pantalla
 * 3. Interactividad del menú móvil con transiciones suaves
 * 4. Manejo dinámico del estado activo de los enlaces
 */

/**
 * Crea el HTML del header según el nivel de autorización del usuario
 * @param {number} authLevel - Nivel de autorización del usuario (0=usuario regular, >0=administrador)
 */
function createHeader(authLevel) {
    // Detecta la página actual para marcar el enlace correspondiente como activo
    const currentPage = window.location.pathname.split('/').pop() || 'index.php';

    /**
     * Genera el HTML para un enlace de navegación
     * @param {string} href - URL del enlace
     * @param {string} text - Texto visible del enlace
     * @param {string} iconClass - Clase FontAwesome para el icono (opcional)
     * @returns {string} HTML del ítem de navegación
     */
    function navLink(href, text, iconClass = '') {
        // Determina si este enlace debe marcarse como activo
        const isActive = href === currentPage ? 'active' : '';
        
        // Genera el HTML del icono si se proporcionó una clase
        const iconHTML = iconClass ? `<i class="${iconClass} nav__link-icon"></i>` : '';
        
        // Retorna el HTML completo del enlace
        return `<li class="nav__item"><a href="${href}" class="nav__link ${isActive}">${iconHTML} ${text}</a></li>`;
    }

    // Construye los elementos de navegación según el nivel de autorización
    let navItems = '';
    
    if (authLevel === 0) {
        // Menú para usuario regular
        navItems += navLink('profile.php', 'My Profile', 'fas fa-user');
        navItems += navLink('newOrder.php', 'New Order', 'fas fa-plus-circle');
        navItems += navLink('#', 'Manual', 'fas fa-book');
    } else {
        // Menú para administrador con opciones adicionales
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

    // Determine menu type class based on authorization level
    const menuTypeClass = authLevel === 0 ? 'reduced-menu' : 'full-menu';
    
    // Construye el HTML completo del header con navegación responsiva
    const headerHTML = `
    <header class="header ${menuTypeClass}">
        <!-- Logo y toggle solo visibles en móvil -->
        <a href="index.php" class="header__logo">GRAMMER</a>
        <i class="fas fa-bars header__toggle" id="nav-toggle"></i>
        
        <!-- Navegación principal - se adapta entre móvil y desktop -->
        <nav class="nav" id="nav-menu">
            <div class="nav__content bd-grid">
                <!-- Botón de cierre solo visible en móvil -->
                <i class="fas fa-times nav__close" id="nav-close"></i>
                
                <!-- Perfil/Logo de la aplicación -->
                <div class="nav__perfil">
                    <div class="nav__img">
                        <img src="assets/logo/logo.png" alt="logoGRAMMER">
                    </div>
                    <div>
                        <a href="#" class="nav__name">SPECIAL FREIGHT</a>
                        ${window.userName ? `<span class="nav__profesion">${window.userName}</span>` : ''}
                    </div>
                </div> 
                
                <!-- Menú de navegación principal - items generados dinámicamente -->
                <div class="nav__menu">
                    <ul class="nav__list">
                        ${navItems}
                    </ul>
                </div>
            </div>
        </nav>
    </header>
    `;

    // Inserta el header en el contenedor designado
    document.getElementById('header-container').innerHTML = headerHTML;
}

// Find where your navigation links are created and add:
const links = [
    { url: 'profile.php', text: 'My Profile', icon: 'fas fa-user' },
    { url: 'newOrder.php', text: 'New Order', icon: 'fas fa-plus-circle' },
    { url: '#', text: 'Manual', icon: 'fas fa-book' },
    { url: 'myorders.php', text: 'My Orders', icon: 'fa-list-check' }, // Add this line
];

/**
 * Inicializa la funcionalidad del header una vez que el DOM está completamente cargado
 */
document.addEventListener('DOMContentLoaded', function() {
    // Crea el header con el nivel de autorización del usuario (o 0 si no está definido)
    createHeader(window.authorizationLevel || 0);

    // Pequeño retraso para asegurar que todos los elementos del DOM estén disponibles
    setTimeout(function() {
        /**
         * CONFIGURACIÓN DEL MENÚ MÓVIL
         * Maneja la apertura/cierre del menú lateral en dispositivos móviles
         */
        
        // Obtiene referencias a los elementos del DOM necesarios
        const navMenu = document.getElementById('nav-menu');
        const toggleMenu = document.getElementById('nav-toggle');
        const closeMenu = document.getElementById('nav-close');

        // Verificación de seguridad: asegura que los elementos existen antes de continuar
        if (!navMenu || !toggleMenu || !closeMenu) {
            console.error('Elementos de navegación no encontrados:', { navMenu, toggleMenu, closeMenu });
            return;
        }

        /**
         * Maneja el evento de apertura del menú móvil
         * - Muestra el menú lateral
         * - Oculta el botón hamburguesa
         * - Bloquea el scroll del body para evitar interacciones en segundo plano
         */
        toggleMenu.addEventListener('click', () => {
            // Muestra el menú lateral añadiendo la clase 'show'
            navMenu.classList.toggle('show');
            
            // Oculta el botón hamburguesa mientras el menú está abierto
            toggleMenu.style.display = 'none';
            toggleMenu.classList.add('hide-toggle');
            
            // Bloquea el scroll del body para evitar interacciones en segundo plano
            document.body.classList.add('menu-open');
        });

        /**
         * Maneja el evento de cierre del menú móvil
         * - Oculta el menú lateral
         * - Restaura el botón hamburguesa
         * - Desbloquea el scroll del body
         */
        closeMenu.addEventListener('click', () => {
            // Oculta el menú lateral removiendo la clase 'show'
            navMenu.classList.remove('show');
            
            // Restaura el botón hamburguesa con un pequeño retraso para evitar parpadeos
            setTimeout(() => {
                toggleMenu.style.display = 'block';
                toggleMenu.classList.remove('hide-toggle');
                
                // Desbloquea el scroll del body
                document.body.classList.remove('menu-open');
            }, 300); // 300ms coincide con la duración de la transición CSS
        });

        /**
         * MANEJO DE ENLACES ACTIVOS
         * Configura la interacción con los enlaces de navegación
         */
        const navLinks = document.querySelectorAll('.nav__link');

        /**
         * Función que se ejecuta al hacer clic en un enlace
         * - Marca el enlace como activo
         * - Cierra el menú móvil si está abierto
         */
        function linkAction() {
            // Quita la clase 'active' de todos los enlaces y la añade al actual
            navLinks.forEach(n => n.classList.remove('active'));
            this.classList.add('active');
            
            // Si estamos en vista móvil, cierra el menú lateral
            if (window.innerWidth < 1000 && navMenu.classList.contains('show')) {
                navMenu.classList.remove('show');
                
                // Restaura el botón hamburguesa
                setTimeout(() => {
                    toggleMenu.style.display = 'block';
                    toggleMenu.classList.remove('hide-toggle');
                    document.body.classList.remove('menu-open');
                }, 300);
            }
        }

        // Añade el evento click a todos los enlaces de navegación
        navLinks.forEach(n => n.addEventListener('click', linkAction));
        
        /**
         * LISTENERS ADICIONALES
         * Para mejorar la experiencia de usuario
         */
        
        // Cierra el menú cuando se redimensiona la ventana a desktop
        window.addEventListener('resize', function() {
            if (window.innerWidth >= 1000 && navMenu.classList.contains('show')) {
                navMenu.classList.remove('show');
                toggleMenu.style.display = 'block';
                toggleMenu.classList.remove('hide-toggle');
                document.body.classList.remove('menu-open');
            }
        });
        
    }, 100); // 100ms de retraso para asegurar que el DOM está completamente listo
});