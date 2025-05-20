/**
 * Premium Freight - Header Component
 * Generates the navigation header dynamically based on user authorization level
 * and manages mobile menu interactions.
 */

function createHeader(authLevel) {
    const currentPage = window.location.pathname.split('/').pop() || 'index.php'; // Default to index.php if path is empty

    function navLink(href, text, iconClass = '') {
        const isActive = href === currentPage ? 'active' : '';
        const iconHTML = iconClass ? `<i class="${iconClass} nav__link-icon"></i> ` : '';
        return `<li class="nav__item"><a href="${href}" class="nav__link ${isActive}">${iconHTML}${text}</a></li>`;
    }

    let navItems = '';
    if (authLevel === 0) { // Regular user
        navItems += navLink('profile.php', 'My Profile', 'fas fa-user');
        navItems += navLink('newOrder.php', 'New Order', 'fas fa-plus-circle');
        navItems += navLink('#', 'Manual', 'fas fa-book');
    } else { // Admin user
        navItems += navLink('profile.php', 'My Profile', 'fas fa-user-shield');
        navItems += navLink('newOrder.php', 'New Order', 'fas fa-plus-circle');
        navItems += navLink('orders.php', 'Generated Orders', 'fas fa-list-alt');
        navItems += navLink('adminUsers.php', 'Admin User', 'fas fa-users-cog');
        navItems += navLink('dashboard.php', 'Charts', 'fas fa-chart-bar');
        navItems += navLink('#', 'Manual', 'fas fa-book');
    }

    if (window.userName) {
        navItems += navLink('dao/users/logout.php', 'Log Out', 'fas fa-sign-out-alt');
    }

    const headerHTML = `
    <header class="header">
        <a href="index.php" class="header__logo">GRAMMER</a>
        <i class="fas fa-bars header__toggle" id="nav-toggle"></i>
        <nav class="nav" id="nav-menu">
            <div class="nav__content"> {/* Removed bd-grid from here, apply to children if needed or style nav__content directly */}
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
                {/* You can add a .nav__social section here if needed */}
            </div>
        </nav>
    </header>
    `;
    document.getElementById('header-container').innerHTML = headerHTML;
}

document.addEventListener('DOMContentLoaded', function() {
    createHeader(window.authorizationLevel || 0);

    // DOM elements for menu interaction (ensure they exist after createHeader)
    const navMenu = document.getElementById('nav-menu');
    const toggleMenu = document.getElementById('nav-toggle');
    const closeMenu = document.getElementById('nav-close');
    const navLinks = document.querySelectorAll('.nav__link');

    function openMobileMenu() {
        if (navMenu && toggleMenu) {
            navMenu.classList.add('show');
            toggleMenu.classList.add('hide-toggle'); // Hide hamburger
            document.body.classList.add('menu-open');
        }
    }

    function closeMobileMenu() {
        if (navMenu && toggleMenu) {
            navMenu.classList.remove('show');
            // Delay showing hamburger to avoid flicker and allow menu to slide out
            setTimeout(() => {
                if (!navMenu.classList.contains('show')) { // Ensure it's still closed
                    toggleMenu.classList.remove('hide-toggle');
                }
            }, 300); // Match CSS transition duration if possible
            document.body.classList.remove('menu-open');
        }
    }

    if (toggleMenu) {
        toggleMenu.addEventListener('click', openMobileMenu);
    }

    if (closeMenu) {
        closeMenu.addEventListener('click', closeMobileMenu);
    }

    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            // Set active state
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            // Close mobile menu if it's open (usually for anchor links or same-page nav)
            // For actual page navigation, the menu will disappear anyway.
            // This is more for SPAs or if links don't cause a full page reload.
            if (navMenu && navMenu.classList.contains('show')) {
                closeMobileMenu();
            }
        });
    });
});