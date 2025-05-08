/*===== MENU SHOW Y HIDDEN =====*/ 
const navMenu = document.getElementById('nav-menu'),
      toggleMenu = document.getElementById('nav-toggle'),
      closeMenu = document.getElementById('nav-close')

/*SHOW*/ 
toggleMenu.addEventListener('click', ()=>{
    navMenu.classList.toggle('show')
})

/*HIDDEN*/
closeMenu.addEventListener('click', ()=>{
    navMenu.classList.remove('show')
})

/*===== ACTIVE AND REMOVE MENU =====*/
const navLink = document.querySelectorAll('.nav__link');   

function linkAction(){
  /*Active link*/
  navLink.forEach(n => n.classList.remove('active'));
  this.classList.add('active');
  
  /*Remove menu mobile*/
  navMenu.classList.remove('show')
}
navLink.forEach(n => n.addEventListener('click', linkAction));

function createHeader(authLevel) {

    console.log('Authorization Level:', authLevel);
    // Detecta la página actual
    const currentPage = window.location.pathname.split('/').pop();

    // Helper para marcar el enlace activo
    function navLink(href, text) {
        const isActive = href === currentPage ? 'active' : '';
        return `<li class="nav__item"><a href="${href}" class="nav__link ${isActive}">${text}</a></li>`;
    }

    let navItems = '';
    if (authLevel === 0) {
        navItems += navLink('profile.php', 'My Profile');
        navItems += navLink('newOrder.php', 'New Order');
        navItems += navLink('#', 'Manual');
    } else {
        navItems += navLink('profile.php', 'My Profile');
        navItems += navLink('newOrder.php', 'New Order');
        navItems += navLink('orders.php', 'Generated Orders');
        navItems += navLink('register.php', 'Add User');
        navItems += navLink('google.com', 'Charts');
        navItems += navLink('#', 'Manual');
    }

    // Si está logueado, muestra logout
    if (window.userName) {
        navItems += navLink('dao/users/logout.php', 'Log Out');
    }

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

    document.getElementById('header-container').innerHTML = headerHTML;
}

// Espera a que el DOM esté listo y window.authorizationLevel esté disponible
document.addEventListener('DOMContentLoaded', function() {
    createHeader(window.authorizationLevel || 0);

    // Vuelve a enlazar los eventos del menú
    const navMenu = document.getElementById('nav-menu'),
        toggleMenu = document.getElementById('nav-toggle'),
        closeMenu = document.getElementById('nav-close');

    toggleMenu.addEventListener('click', ()=>{ navMenu.classList.toggle('show') });
    closeMenu.addEventListener('click', ()=>{ navMenu.classList.remove('show') });

    const navLink = document.querySelectorAll('.nav__link');   
    function linkAction(){
        navLink.forEach(n => n.classList.remove('active'));
        this.classList.add('active');
        navMenu.classList.remove('show')
    }
    navLink.forEach(n => n.addEventListener('click', linkAction));
});