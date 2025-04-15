<?php
require_once __DIR__ . "/dao/db/db.php";

try {
    // Supón que tienes una conexión $conn desde db.php
    $conn = new LocalConector();
    $conex = $conn->conectar();

    $user = $_POST['user'] ?? '';

    if ($user) {
        $sql = "SELECT `IdUser`, `Username`, `Mail`, `Password`, `ROL` FROM `Usuarios` WHERE `Username` = ?";
        $stmt = $conex->prepare($sql);
        $stmt->bind_param("s", $user);
        $stmt->execute();
        $result = $stmt->get_result();

        $data = $result->fetch_assoc();

        // Imprime el resultado como JSON
        header('Content-Type: application/json');
        echo json_encode($data);
    } else {
        echo json_encode(['error' => 'No user provided']);
    }

    $stmt->close(); // Cierra la declaración preparada.
    $conex->close(); // Cierra la conexión a la base de datos.

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
}