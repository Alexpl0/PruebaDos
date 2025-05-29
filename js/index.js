/**
 * index.js
 * Maneja la funcionalidad de login para la aplicación Premium Freight
 * Incluye validación de formularios y gestión de sesiones
 */

// Funcionalidad para mostrar/ocultar contraseña
document.addEventListener('DOMContentLoaded', function() {
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            // Cambiar el tipo de input
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Cambiar el icono
            if (type === 'text') {
                togglePassword.classList.remove('fa-eye-slash');
                togglePassword.classList.add('fa-eye');
            } else {
                togglePassword.classList.remove('fa-eye');
                togglePassword.classList.add('fa-eye-slash');
            }
        });
    }
});

// Lógica para la interacción del formulario de login al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    // Agregar event listener para enviar el formulario con Enter
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                loginUsuario();
            }
        });
    }
    
    const passwordInput = document.getElementById('password');
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
            // Debug: Log de la información del usuario recibida
            console.log('=== LOGIN SUCCESS DATA ===');
            console.log('User data received:', data.data);
            console.log('User plant:', data.data.plant);
            console.log('==========================');

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
                // Crear mensaje personalizado con información de la planta
                const userName = data.data.name || 'Usuario';
                const userPlant = data.data.plant;
                const authLevel = data.data.authorization_level;
                
                let welcomeMessage = `¡Bienvenido, ${userName}!`;
                
                // Agregar información de la planta si existe
                if (userPlant && userPlant !== null && userPlant !== '') {
                    welcomeMessage += `\nPlanta: ${userPlant}`;
                } else {
                    welcomeMessage += '\nAcceso Global (Sin planta asignada)';
                }
                
                // Agregar nivel de autorización
                welcomeMessage += `\nNivel de autorización: ${authLevel}`;

                // Mostrar mensaje de éxito con información detallada
                Swal.fire({
                    icon: 'success',
                    title: 'Inicio de Sesión Exitoso',
                    html: `
                        <div style="text-align: left; font-size: 14px;">
                            <p><strong>¡Bienvenido, ${userName}!</strong></p>
                            <p><i class="fas fa-building"></i> <strong>Planta:</strong> ${userPlant || 'Acceso Global'}</p>
                            <p><i class="fas fa-user-shield"></i> <strong>Nivel de autorización:</strong> ${authLevel}</p>
                            <p><i class="fas fa-envelope"></i> <strong>Email:</strong> ${data.data.email}</p>
                        </div>
                    `,
                    timer: 3000,
                    showConfirmButton: true,
                    confirmButtonText: 'Continuar'
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