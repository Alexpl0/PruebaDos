/**
 * index.js
 * Maneja la funcionalidad de login para la aplicación Premium Freight
 * Incluye validación de formularios y gestión de sesiones
 */

// Lógica para la interacción del formulario de login al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    // Configurar la funcionalidad del botón para mostrar/ocultar contraseña
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            // Cambiar entre tipo 'password' y 'text' para mostrar u ocultar
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            
            // Cambiar el icono según si la contraseña es visible o no
            this.setAttribute('name', type === 'password' ? 'eye-off-outline' : 'eye-outline');
        });
    }
    
    // Agregar event listener para enviar el formulario con Enter
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                loginUsuario();
            }
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                loginUsuario();
            }
        });
    }
    
    // Configurar el botón de login si existe
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        loginButton.addEventListener('click', loginUsuario);
    }
});

/**
 * Función para procesar el login de usuario
 * Valida los campos y envía la solicitud al servidor
 */
function loginUsuario() {
    // Obtener valores del formulario
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    // Validación básica del lado del cliente
    if (!email || !password) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Por favor ingresa tu correo y contraseña.'
        });
        return;
    }
    
    // Verificar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Por favor ingresa un correo electrónico válido.'
        });
        return;
    }

    // Mostrar indicador de carga
    Swal.fire({
        title: 'Procesando...',
        text: 'Verificando credenciales',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    // Enviar solicitud de login al servidor usando la URL global
    fetch(URL + 'dao/users/daoLogin.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(response => {
        // Verificar si la respuesta es exitosa
        if (!response.ok) {
            throw new Error('Error en la conexión con el servidor');
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            // Si el login es exitoso, establecer la sesión
            fetch(URL + 'dao/users/loginSession.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data.data)
            })
            .then(sessionResponse => {
                if (!sessionResponse.ok) {
                    throw new Error('Error al establecer la sesión');
                }
                return sessionResponse.text();
            })
            .then(() => {
                // Mostrar mensaje de éxito y redirigir
                Swal.fire({
                    icon: 'success',
                    title: 'Bienvenido',
                    text: 'Inicio de sesión exitoso.',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = 'newOrder.php';
                });
            });
        } else {
            // Mostrar mensaje de error si las credenciales son incorrectas
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.mensaje || 'Credenciales incorrectas.'
            });
        }
    })
    .catch(error => {
        // Manejar errores de red o del servidor
        console.error('Error durante el proceso de login:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Ocurrió un error al iniciar sesión. Por favor, intenta nuevamente.'
        });
    });
}

/**
 * Verificación de disponibilidad de la variable URL
 * En caso de que el script se cargue antes que la variable esté definida
 */
if (typeof URL === 'undefined') {
    console.warn('URL global variable is not defined. Make sure this script runs after the URL is defined in your PHP page.');
    // Fallback a URL hardcodeada solo como último recurso
    window.URL = window.URL || 'https://grammermx.com/Jesus/PruebaDos/';
}