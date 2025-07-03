<?php
/**
 * verification_required.php - Page shown when user email verification is needed (Refactored)
 * This version uses the centralized context injection system.
 */

// 1. Manejar sesión y autenticación.
// auth_check.php se asegura de que haya un usuario en la sesión.
require_once 'dao/users/auth_check.php';

// 2. Lógica específica de esta página: si el usuario ya está verificado,
// no debería estar aquí. Lo redirigimos a su perfil.
if (isset($_SESSION['user']['verified']) && $_SESSION['user']['verified'] == 1) {
    // Para la redirección, podemos usar la URL base que se definirá en el inyector.
    // Incluimos el inyector primero para obtener la URL.
    require_once 'dao/users/context_injector.php';
    header('Location: ' . $appContextForJS['app']['baseURL'] . 'profile.php');
    exit;
}

// 3. Si el usuario no está verificado, procedemos a incluir el inyector
// para configurar el resto de la página.
require_once 'dao/users/context_injector.php';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Verification Required - Premium Freight</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="css/styles.css">
    <style>
        body {
            background: linear-gradient(135deg, #034C8C 0%, #023b6a 100%);
            min-height: 100vh;
            font-family: 'Inter', sans-serif;
        }
        .verification-container { max-width: 600px; margin: 50px auto; background: white; border-radius: 15px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #034C8C 0%, #023b6a 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 40px; }
        .icon-container { text-align: center; margin-bottom: 30px; }
        .verification-icon { font-size: 4rem; color: #f59e0b; margin-bottom: 20px; }
        .steps { background: #f8f9fa; border-radius: 10px; padding: 25px; margin: 20px 0; }
        .step { display: flex; align-items: flex-start; margin-bottom: 15px; }
        .step:last-child { margin-bottom: 0; }
        .step-number { background: #034C8C; color: white; width: 25px; height: 25px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 15px; flex-shrink: 0; }
        .step-content { flex: 1; }
        .email-display { background: #e3f2fd; border: 1px solid #2196f3; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center; font-family: monospace; font-size: 1.1em; color: #034C8C; font-weight: bold; }
        .btn-resend { background: linear-gradient(135deg, #10B981 0%, #059669 100%); border: none; padding: 12px 30px; border-radius: 8px; color: white; font-weight: 600; transition: all 0.3s ease; }
        .btn-resend:hover { background: linear-gradient(135deg, #059669 0%, #047857 100%); transform: translateY(-2px); }
        .btn-logout { background: linear-gradient(135deg, #6B7280 0%, #4B5563 100%); border: none; padding: 10px 25px; border-radius: 8px; color: white; font-weight: 500; transition: all 0.3s ease; }
        .btn-logout:hover { background: linear-gradient(135deg, #4B5563 0%, #374151 100%); }
        .warning-box { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .warning-box .fas { color: #f59e0b; margin-right: 10px; }
    </style>

    <!-- ================== SISTEMA DE CONTEXTO CENTRALIZADO ================== -->
    <?php
        // El inyector ya fue requerido en la parte superior del script.
    ?>
    <!-- Incluir el módulo de configuración JS. -->
    <script src="js/config.js"></script>
    <!-- ==================================================================== -->
</head>
<body>
    <div class="container">
        <div class="verification-container">
            <div class="header">
                <h1><i class="fas fa-shield-alt"></i> Account Verification</h1>
                <p class="mb-0">Premium Freight System</p>
            </div>
            
            <div class="content">
                <div class="icon-container">
                    <i class="fas fa-envelope-circle-check verification-icon"></i>
                </div>
                
                <h3 class="text-center mb-4">Welcome <?php echo htmlspecialchars($appContextForJS['user']['name']); ?>!</h3>
                
                <p class="text-center mb-4">
                    To complete your registration and use all system features, 
                    you need to verify your email address.
                </p>
                
                <div class="email-display">
                    <i class="fas fa-envelope"></i> <?php echo htmlspecialchars($appContextForJS['user']['email']); ?>
                </div>
                
                <div class="warning-box">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>IMPORTANT!</strong> Before clicking the verification link, 
                    please follow these steps to ensure you receive all our notifications:
                </div>
                
                <div class="steps">
                    <h5 class="mb-3"><i class="fas fa-list-check"></i> Steps to configure your email:</h5>
                    <div class="step">
                        <div class="step-number">1</div>
                        <div class="step-content"><strong>Look for our email</strong><br>Check your inbox and SPAM folder for an email from <code>pruebasjesus@grammermx.com</code></div>
                    </div>
                    <div class="step">
                        <div class="step-number">2</div>
                        <div class="step-content"><strong>Mark as "Not SPAM"</strong><br>If it's in SPAM, mark the email as "Not Junk" or "Not SPAM"</div>
                    </div>
                    <div class="step">
                        <div class="step-number">3</div>
                        <div class="step-content"><strong>Add to safe contacts</strong><br>Add <code>pruebasjesus@grammermx.com</code> to your safe senders or contacts list</div>
                    </div>
                    <div class="step">
                        <div class="step-number">4</div>
                        <div class="step-content"><strong>Click to verify</strong><br>Only after completing the previous steps, click the "Verify Account" button in the email</div>
                    </div>
                </div>
                
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    <strong>Why is this necessary?</strong> Corporate email systems often mark 
                    automated emails as SPAM. By following these steps, you ensure you receive all 
                    important notifications from the Premium Freight system.
                </div>
                
                <div class="text-center mt-4">
                    <button class="btn btn-resend me-3" onclick="resendEmail()">
                        <i class="fas fa-paper-plane"></i> Resend Email
                    </button>
                    <a href="dao/users/logout.php" class="btn btn-logout">
                        <i class="fas fa-sign-out-alt"></i> Log Out
                    </a>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script>
        function resendEmail() {
            Swal.fire({
                title: 'Reenviando correo...',
                text: 'Por favor espera mientras enviamos el correo de verificación',
                allowOutsideClick: false,
                showConfirmButton: false,
                willOpen: () => {
                    Swal.showLoading();
                }
            });

            // Usamos el objeto de configuración global para las URLs y el ID de usuario.
            fetch(window.PF_CONFIG.app.mailerURL + 'PFmailVerification.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'resend',
                    user_id: window.PF_CONFIG.user.id
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: '¡Correo Enviado!',
                        text: 'Hemos reenviado el correo de verificación. Por favor revisa tu bandeja de entrada.',
                        timer: 3000,
                        timerProgressBar: true
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: data.message || 'Error al enviar el correo'
                    });
                }
            })
            .catch(error => {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error de conexión. Por favor intenta de nuevo.'
                });
            });
        }
    </script>
</body>
</html>
