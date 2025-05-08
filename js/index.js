// Lógica para enviar los datos del login por fetch a daoUserLogin.php

document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            this.setAttribute('name', type === 'password' ? 'eye-off-outline' : 'eye-outline');
        });
    }
});

// Mueve la función fuera del DOMContentLoaded para que sea global
function loginUsuario() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!email || !password) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Por favor ingresa tu correo y contraseña.'
        });
        return;
    }

    fetch('https://grammermx.com/Jesus/PruebaDos/dao/users/daoLogin.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            fetch('https://grammermx.com/Jesus/PruebaDos/dao/users/loginSession.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data.data)
            })
            .then(() => {
                Swal.fire({
                    icon: 'success',
                    title: 'Bienvenido',
                    text: 'Inicio de sesión exitoso.'

                }).then(() => {
                    window.location.href = 'google.com';
                    
                });
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.mensaje || 'Credenciales incorrectas.'
            });
        }
    })
    .catch(error => {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Ocurrió un error al iniciar sesión.'
        });
        console.error(error);
    });
}