document.getElementById('register-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const data = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value.trim()
    };

    fetch('https://grammermx.com/Jesus/PruebaDos/dao/users/daoSingin.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            Swal.fire('Success!', res.mensaje, 'success').then(() => {
                window.location.href = 'index.php';
            });
        } else {
            Swal.fire('Error', res.mensaje, 'error');
        }
    })
    .catch(() => {
        Swal.fire('Error', 'Unable to register the user.', 'error');
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.querySelector('#password');
    
    togglePassword.addEventListener('click', function() {
        // Toggle the type attribute
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // Toggle the icon - cambio a FontAwesome
        const iconClass = type === 'password' ? 'fa-eye' : 'fa-eye-slash';
        this.innerHTML = `<i class="fas ${iconClass}"></i>`;
    });
    
    // Inicializar con el icono FontAwesome
    togglePassword.innerHTML = '<i class="fas fa-eye"></i>';
});