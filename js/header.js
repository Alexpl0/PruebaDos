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

    /**
     * Helper function to create dropdown navigation menu
     * @param {string} text - Dropdown button text
     * @param {Array} items - Array of dropdown items with href and text properties
     * @returns {string} HTML for dropdown menu
     */
    function navDropdown(text, items) {
        const currentPageActive = items.some(item => item.href === currentPage) ? 'active' : '';
        
        // Create dropdown items links
        const dropdownItems = items.map(item => {
            const isActive = item.href === currentPage ? 'active' : '';
            return `<a href="${item.href}" class="dropdown-item ${isActive}">${item.text}</a>`;
        }).join('');
        
        return `
            <li class="nav__item dropdown">
                <a href="#" class="nav__link dropdown-toggle ${currentPageActive}" id="userManagementDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                    ${text} <i class="fas fa-caret-down"></i>
                </a>
                <div class="dropdown-menu" aria-labelledby="userManagementDropdown">
                    ${dropdownItems}
                </div>
            </li>
        `;
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
        
        // User management dropdown menu
        navItems += navDropdown('User Management', [
            {href: 'register.php', text: 'Add User'},
            {href: 'admin_user.php', text: 'Admin User'}
        ]);
        
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
    const navLinks = document.querySelectorAll('.nav__link:not(.dropdown-toggle)');   
    
    function linkAction() {
        navLinks.forEach(link => link.classList.remove('active'));
        this.classList.add('active');
        navMenu.classList.remove('show');
    }
    
    navLinks.forEach(link => link.addEventListener('click', linkAction));
    
    // Handle mobile dropdown toggle
    if (window.innerWidth <= 899) {
        const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
        
        dropdownToggles.forEach(toggle => {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                const dropdownMenu = this.nextElementSibling;
                dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
            });
        });
    }
});