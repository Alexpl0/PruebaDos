<?php
session_start(); // Iniciar sesión para mantener el estado del usuario entre las páginas.
include_once("ConexionBD.php"); // Incluye el archivo de conexión a la base de datos.

try {
    // Crear una conexión usando la clase `LocalConector`
    $con = new LocalConector(); // Crea una instancia de la clase LocalConector.
    $conex = $con->conectar(); // Establece la conexión a la base de datos.

    // Consulta para obtener las solicitudes con estatus 2 y el nombre del estatus
    $sql = "
        SELECT 
            s.IdSolicitud,  -- Identificador único de la solicitud.
            s.FolioSolicitud,  -- Número de folio de la solicitud.
            s.Nombre AS NombreSolicitante,  -- Nombre del solicitante.
            ar.NombreArea,  -- Nombre del área a la que pertenece la solicitud.
            COALESCE(a.Nombre, 'Pendiente') AS NombreAprobador,  -- Nombre del aprobador, 'Pendiente' si no hay aprobador asignado.
            COALESCE(e.NombreEstatus, 'Pendiente') AS NombreEstatus  -- Estado de la solicitud, 'Pendiente' si no tiene estado asignado.
        FROM 
            Solicitudes s  -- Tabla de solicitudes.
        LEFT JOIN 
            Aprobadores a ON s.FolioSolicitud = a.FolioSolicitud  -- Une con la tabla de aprobadores usando el FolioSolicitud.
        LEFT JOIN 
            Estatus e ON a.IdEstatus = e.IdEstatus  -- Une con la tabla de estatus usando el IdEstatus.
        LEFT JOIN 
            Area ar ON s.IdArea = ar.IdArea  -- Une con la tabla de áreas usando el IdArea.
        WHERE 
            s.IdEstatus = 2;  -- Filtra las solicitudes que tienen un IdEstatus igual a 2.
    ";
    $stmt = $conex->prepare($sql); // Prepara la consulta SQL para su ejecución.


    if (!$stmt) { // Verifica si la preparación de la consulta fue exitosa.
        throw new Exception("Error en la preparación de la consulta: " . $conex->error); // Lanza una excepción si hay un error en la preparación.
    }

    $stmt->execute(); // Ejecuta la consulta preparada.
    $result = $stmt->get_result(); // Obtiene el resultado de la consulta.

    $solicitudes = []; // Inicializa un array para almacenar las solicitudes.
    while ($row = $result->fetch_assoc()) { // Itera sobre cada fila del resultado.
        $solicitudes[] = $row; // Agrega la fila actual al array de solicitudes.
    }

    $stmt->close(); // Cierra la declaración preparada.
    $conex->close(); // Cierra la conexión a la base de datos.

    // Devolver respuesta JSON
    echo json_encode([ // Convierte el array en formato JSON.
        'status' => 'success', // Indica que la operación fue exitosa.
        'data' => $solicitudes // Los datos de las solicitudes obtenidas.
    ]);
} catch (Exception $e) { // Captura cualquier excepción que ocurra dentro del bloque try.
    echo json_encode([ // Convierte el array en formato JSON.
        'status' => 'error', // Indica que hubo un error.
        'message' => 'Error en la consulta: ' . $e->getMessage() // Mensaje de error.
    ]);
}
?>