<?php
// normalize_locations.php
// --- INSTRUCCIONES ---
// 1. Sube este archivo a la carpeta 'dao/'.
// 2. Sube 'normalization_interface.html' a la misma carpeta.
// 3. Abre 'normalization_interface.html' en tu navegador para iniciar.
// 4. Al finalizar, BORRA AMBOS archivos del servidor.

header('Content-Type: application/json');
set_time_limit(600); // Aumenta el tiempo de ejecución a 10 minutos por si son muchos registros
ini_set('memory_limit', '512M'); // Aumenta el límite de memoria

// Incluimos la conexión a la BD
include_once('../db/PFDB.php');

// Preparamos la respuesta
$response = [
    'success' => false,
    'summary' => [
        'updated' => 0,
        'unmatched' => 0,
        'errors' => 0,
    ],
    'mapping' => [],
    'log' => ''
];
$logMessages = [];

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->set_charset("utf8mb4");
    $logMessages[] = "Conexión a la base de datos exitosa.";

    // --- PASO 1: Obtener todos los registros de la tabla BUENA ('Location') ---
    $goodLocations = [];
    $sqlGood = "SELECT id, company_name, city, state, zip FROM Location";
    $resultGood = $conex->query($sqlGood);
    if ($resultGood === false) throw new Exception("Error al leer la tabla 'Location': " . $conex->error);
    
    while ($row = $resultGood->fetch_assoc()) {
        $goodLocations[] = $row;
    }
    $resultGood->free();
    $logMessages[] = "Se cargaron " . count($goodLocations) . " registros de la tabla normalizada 'Location'.";
    $logMessages[] = "-------------------------------------------------";

    // --- PASO 2: Obtener todos los registros de la tabla MALA ('DESTINO') ---
    $sqlBad = "SELECT id, COMPANY_DEST, CITY_DEST, STATE_DEST, ZIP_DEST FROM DESTINO";
    $resultBad = $conex->query($sqlBad);
    if ($resultBad === false) throw new Exception("Error al leer la tabla 'DESTINO': " . $conex->error);
    
    $logMessages[] = "Se encontraron " . $resultBad->num_rows . " registros en la tabla 'DESTINO' para procesar.";
    $logMessages[] = "Iniciando proceso de comparación y actualización...";
    $logMessages[] = "-------------------------------------------------";

    // --- PASO 3: Preparar la sentencia de UPDATE para eficiencia ---
    $sqlUpdate = "UPDATE DESTINO SET COMPANY_DEST = ?, CITY_DEST = ?, STATE_DEST = ?, ZIP_DEST = ? WHERE id = ?";
    $stmtUpdate = $conex->prepare($sqlUpdate);
    if ($stmtUpdate === false) throw new Exception("Error al preparar la sentencia UPDATE: " . $conex->error);

    // --- PASO 4: Iterar, comparar, actualizar y mapear ---
    $idMapping = [];

    while ($badRow = $resultBad->fetch_assoc()) {
        $matchFound = false;
        foreach ($goodLocations as $goodRow) {
            // Lógica de coincidencia: ZIP es igual Y (CIUDAD es igual O ESTADO es igual)
            // Se usa trim() para limpiar espacios y strcasecmp() para ignorar mayúsculas/minúsculas
            if (
                trim($badRow['DESTZIP']) === trim($goodRow['zip']) &&
                (
                    strcasecmp(trim($badRow['DESTCITY']), trim($goodRow['city'])) == 0 ||
                    strcasecmp(trim($badRow['DESTSTATE']), trim($goodRow['state'])) == 0
                )
            ) {
                // --- Coincidencia encontrada ---
                $goodId = $goodRow['id'];
                $badId = $badRow['id'];

                // Actualizamos el registro en la tabla 'DESTINO'
                $stmtUpdate->bind_param("ssssi", 
                    $goodRow['company_name'], 
                    $goodRow['city'], 
                    $goodRow['state'], 
                    $goodRow['zip'], 
                    $badId
                );

                if ($stmtUpdate->execute()) {
                    $logMessages[] = "[ÉXITO] ID Malo: $badId -> Actualizado y mapeado a ID Bueno: $goodId.";
                    $response['summary']['updated']++;

                    // Guardamos la relación en nuestro mapa
                    if (!isset($idMapping[$goodId])) {
                        $idMapping[$goodId] = [];
                    }
                    $idMapping[$goodId][] = $badId;

                } else {
                    $logMessages[] = "[ERROR] ID Malo: $badId -> No se pudo actualizar. Error: " . $stmtUpdate->error;
                    $response['summary']['errors']++;
                }
                
                $matchFound = true;
                break; // Pasamos al siguiente registro malo una vez que encontramos su par
            }
        }

        if (!$matchFound) {
            $logMessages[] = "[AVISO] ID Malo: " . $badRow['id'] . " -> No se encontró coincidencia en la tabla 'Location'.";
            $response['summary']['unmatched']++;
        }
    }

    $response['success'] = true;
    $response['mapping'] = $idMapping;
    $logMessages[] = "-------------------------------------------------";
    $logMessages[] = "Proceso de normalización finalizado.";

    // Guardar el mapeo en un archivo JSON para descarga
    file_put_contents('id_relations.json', json_encode($idMapping, JSON_PRETTY_PRINT));


    $stmtUpdate->close();
    $resultBad->free();
    $conex->close();

} catch (Exception $e) {
    $response['success'] = false;
    $logMessages[] = "\n--- !!! ERROR CRÍTICO !!! ---";
    $logMessages[] = "Error: " . $e->getMessage();
}

$response['log'] = implode("\n", $logMessages);
echo json_encode($response);
?>
