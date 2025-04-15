<?php
// Iniciar la sesión para almacenar el estado de inicio de sesión si es necesario
session_start();
include_once('dao/db/db.php'); // Incluir la clase de conexión a la base de datos

// --- Obtener datos del formulario de inicio de sesión (asumiendo método POST) ---
// Usar filter_input para una sanitización básica
$usuario = filter_input(INPUT_POST, 'user', FILTER_SANITIZE_STRING);
$password_attempt = $_POST['password'] ?? ''; // Obtener la contraseña directamente para su verificación

// Validación básica: Verificar si los campos están vacíos
if (empty($usuario) || empty($password_attempt)) {
    // Manejar error: Redirigir de vuelta al login con un mensaje de error
    // echo json_encode(['success' => false, 'message' => 'Usuario y contraseña son requeridos.']);
    header('Location: index.php?error=emptyfields'); // Ejemplo de redirección
    exit();
}

try {
    $con = new LocalConector();
    $conex = $con->conectar();

    // --- Preparar la sentencia SQL para buscar el usuario ---
    // Usar sentencias preparadas para prevenir inyección SQL
    $stmt = $conex->prepare("SELECT ID, USUARIO, PASSWORD, ROL FROM `CUENTAS` WHERE USUARIO = ? LIMIT 1");
    if (!$stmt) {
        throw new Exception("Error al preparar la sentencia: " . $conex->error);
    }

    $stmt->bind_param("s", $usuario); // "s" significa que el parámetro es una cadena
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        // --- Usuario encontrado, obtener los datos ---
        $user_data = $result->fetch_assoc();
        $stored_hashed_password = $user_data['PASSWORD'];

        // --- Verificar la contraseña enviada contra el hash almacenado ---
        if (password_verify($password_attempt, $stored_hashed_password)) {
            // --- ¡Contraseña correcta! ---
            // Inicio de sesión exitoso. Guardar información del usuario en la sesión, redirigir, etc.
            $_SESSION['user_id'] = $user_data['ID'];
            $_SESSION['user_usuario'] = $user_data['USUARIO'];
            $_SESSION['user_rol'] = $user_data['ROL'];

            // echo json_encode(['success' => true, 'message' => '¡Login exitoso!']);
            header('Location: dashboard.php'); // Redirigir a un área para usuarios autenticados
            exit();

        } else {
            // --- Contraseña incorrecta ---
            // echo json_encode(['success' => false, 'message' => 'Contraseña incorrecta.']);
            header('Location: index.php?error=wrongpwd'); // Ejemplo de redirección
            exit();
        }

    } else {
        // --- Usuario no encontrado ---
        // echo json_encode(['success' => false, 'message' => 'Usuario no encontrado.']);
        header('Location: index.php?error=nouser'); // Ejemplo de redirección
        exit();
    }

    $stmt->close();
    $conex->close();

} catch (Exception $e) {
    // Manejar errores de base de datos u otras excepciones
    // Registrar el error para depuración: error_log($e->getMessage());
    // echo json_encode(['success' => false, 'message' => 'Error del servidor: ' . $e->getMessage()]);
    header('Location: index.php?error=dberror'); // Ejemplo de redirección
    exit();
}
?>