/**
 * Premium Freight - Header Component
 * Generates the navigation header dynamically based on user authorization level
 */

function createHeader(authLevel) {
    console.log('Authorization Level:', authLevel);
    
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
        navItems += navLink('google.com', 'Charts');
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
        <ion-icon name="menu-outline" class="header__toggle" id="nav-toggle"></ion-icon>
        <nav class="nav" id="nav-menu">
            <div class="nav__content bd-grid">
                <ion-icon name="close-outline" class="nav__close" id="nav-close"></ion-icon>
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

    // Setup mobile menu toggle
    const navMenu = document.getElementById('nav-menu'),
          toggleMenu = document.getElementById('nav-toggle'),
          closeMenu = document.getElementById('nav-close');

    if (toggleMenu && navMenu) {
        toggleMenu.addEventListener('click', () => navMenu.classList.toggle('show'));
    }
    
    if (closeMenu && navMenu) {
        closeMenu.addEventListener('click', () => navMenu.classList.remove('show'));
    }

    // Setup navigation link active state
    const navLinks = document.querySelectorAll('.nav__link');   
    
    function linkAction() {
        navLinks.forEach(link => link.classList.remove('active'));
        this.classList.add('active');
        navMenu.classList.remove('show');
    }
    
    navLinks.forEach(link => link.addEventListener('click', linkAction));
});