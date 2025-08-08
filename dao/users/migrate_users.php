<?php
require_once __DIR__ . '/../db/cors_config.php';
// migrate_users.php (Versión 2)
// --- INSTRUCCIONES ---
// 1. Sube este archivo a la misma carpeta donde está tu 'daoUserAdmin.php'.
// 2. Sube el archivo 'migration_interface.html' a la misma carpeta.
// 3. Abre 'migration_interface.html' en tu navegador para iniciar el proceso.
// 4. Una vez que la migración sea exitosa, BORRA AMBOS archivos de tu servidor.

// --- NO MODIFICAR ESTE ARCHIVO ---

header('Content-Type: application/json');
set_time_limit(300); // Aumenta el tiempo de ejecución a 5 minutos

// Incluimos los archivos necesarios
include_once('../db/PFDB.php');
require_once('PasswordManager.php');

$logMessages = [];
$response = [
    'success' => false,
    'migrated' => 0,
    'skipped' => 0,
    'errors' => 0,
    'log' => ''
];

try {
    // Establecemos conexión con la base de datos
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->set_charset("utf8mb4");
    $logMessages[] = "Conexión a la base de datos exitosa.";

    // 1. Obtenemos todos los usuarios de la tabla antigua 'CUENTAS'
    $sqlSelectOld = "SELECT Correo, Usuario, PASSWORD FROM CUENTAS";
    $result = $conex->query($sqlSelectOld);

    if ($result === false) {
        throw new Exception("Error al consultar la tabla 'CUENTAS': " . $conex->error);
    }

    $totalUsers = $result->num_rows;
    $logMessages[] = "Se encontraron $totalUsers usuarios en la tabla 'CUENTAS' para migrar.";
    $logMessages[] = "-------------------------------------------------";
    
    // Preparamos la sentencia para insertar en la nueva tabla 'User'
    $sqlInsertNew = "INSERT INTO `User` (name, email, password, role, authorization_level, plant, verified) VALUES (?, ?, ?, ?, ?, ?, ?)";
    $insertStmt = $conex->prepare($sqlInsertNew);

    if ($insertStmt === false) {
        throw new Exception("Error al preparar la sentencia de inserción: " . $conex->error);
    }

    // Array para rastrear correos ya procesados en esta ejecución
    $processedEmails = [];

    // 2. Iteramos sobre cada usuario para procesarlo e insertarlo
    while ($row = $result->fetch_assoc()) {
        $email = trim($row['Correo']);
        $name = $row['Usuario'];
        $plainPassword = $row['PASSWORD']; // Usamos la columna PASSWORD

        // --- NUEVA VALIDACIÓN: Revisar duplicados en el origen ---
        if (isset($processedEmails[$email])) {
            $logMessages[] = "[OMITIDO] El email '$email' está duplicado en los datos de origen. Se procesó solo la primera aparición.";
            $response['skipped']++;
            continue;
        }
        $processedEmails[$email] = true; // Marcar como procesado

        // Verificamos si el email ya existe en la nueva tabla
        $checkStmt = $conex->prepare("SELECT id FROM `User` WHERE email = ?");
        $checkStmt->bind_param("s", $email);
        $checkStmt->execute();
        $checkStmt->store_result();

        if ($checkStmt->num_rows > 0) {
            $logMessages[] = "[OMITIDO] El usuario con email '$email' ya existe en la tabla 'User'.";
            $response['skipped']++;
            $checkStmt->close();
            continue;
        }
        $checkStmt->close();

        // 3. Encriptamos la contraseña
        $encryptedPassword = PasswordManager::prepareForStorage($plainPassword);

        // 4. Asignamos los valores fijos (con la planta actualizada)
        $role = 'Worker';
        $authorization_level = 0;
        $plant = '3310'; // --- CAMBIO: Planta actualizada a 3310 ---
        $verified = 1;

        // 5. Insertamos el nuevo registro
        $insertStmt->bind_param(
            "ssssisi",
            $name,
            $email,
            $encryptedPassword,
            $role,
            $authorization_level,
            $plant,
            $verified
        );

        if ($insertStmt->execute()) {
            $logMessages[] = "[ÉXITO] Usuario '$name' ($email) migrado.";
            $response['migrated']++;
        } else {
            $logMessages[] = "[ERROR] No se pudo migrar a '$name' ($email). Error: " . $insertStmt->error;
            $response['errors']++;
        }
    }

    $response['success'] = true;
    $logMessages[] = "-------------------------------------------------";
    $logMessages[] = "Proceso de migración finalizado.";

    // Cerramos la conexión y la sentencia
    $insertStmt->close();
    $result->free();
    $conex->close();

} catch (Exception $e) {
    $response['success'] = false;
    $logMessages[] = "\n--- !!! ERROR CRÍTICO !!! ---";
    $logMessages[] = "Error: " . $e->getMessage();
}

$response['log'] = implode("\n", $logMessages);
echo json_encode($response);
?>
