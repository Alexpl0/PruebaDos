<?php
// normalize_locations.php (Versión 4 - Lógica de coincidencia mejorada)
// --- INSTRUCCIONES ---
// 1. Sube este archivo a la carpeta 'dao/'.
// 2. Sube la nueva versión de 'normalization_interface.html' a la misma carpeta.
// 3. Abre 'normalization_interface.html' en tu navegador para iniciar.
// 4. Al finalizar, BORRA TODOS los archivos generados del servidor.

header('Content-Type: application/json');
set_time_limit(600); // Aumenta el tiempo de ejecución a 10 minutos
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
    'log' => '',
    'unmatched_data' => [] 
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

    // --- PASO 2: Obtener todos los registros de la tabla MALA ('FROM_CITY') ---
    $sqlBad = "SELECT id, COMPANY_FROM, CITY_FROM, STATE_FROM, ZIP_FROM FROM FROM_CITY";
    $resultBad = $conex->query($sqlBad);
    if ($resultBad === false) throw new Exception("Error al leer la tabla 'FROM_CITY': " . $conex->error);
    
    $logMessages[] = "Se encontraron " . $resultBad->num_rows . " registros en la tabla 'FROM_CITY' para procesar.";
    $logMessages[] = "Iniciando proceso de comparación y actualización...";
    $logMessages[] = "-------------------------------------------------";

    // --- PASO 3: Preparar la sentencia de UPDATE para eficiencia ---
    $sqlUpdate = "UPDATE FROM_CITY SET COMPANY_FROM = ?, CITY_FROM = ?, STATE_FROM = ?, ZIP_FROM = ? WHERE id = ?";
    $stmtUpdate = $conex->prepare($sqlUpdate);
    if ($stmtUpdate === false) throw new Exception("Error al preparar la sentencia UPDATE: " . $conex->error);

    // --- PASO 4: Iterar, comparar, actualizar y mapear ---
    $idMapping = [];
    $unmatchedRows = []; 

    while ($badRow = $resultBad->fetch_assoc()) {
        $matchFound = false;
        foreach ($goodLocations as $goodRow) {
            
            // !! CAMBIO: Lógica de coincidencia extendida !!
            // Condición 1: Coincide ZIP Y (Ciudad O Estado)
            $zipCondition = trim($badRow['ZIP_FROM']) === trim($goodRow['zip']) &&
                (
                    strcasecmp(trim($badRow['CITY_FROM']), trim($goodRow['city'])) == 0 ||
                    strcasecmp(trim($badRow['STATE_FROM']), trim($goodRow['state'])) == 0
                );

            // Condición 2: Coincide Compañía Y Estado
            $companyStateCondition = strcasecmp(trim($badRow['COMPANY_FROM']), trim($goodRow['company_name'])) == 0 &&
                                     strcasecmp(trim($badRow['STATE_FROM']), trim($goodRow['state'])) == 0;

            if ($zipCondition || $companyStateCondition) {
                $goodId = $goodRow['id'];
                $badId = $badRow['id'];
                $stmtUpdate->bind_param("ssssi", $goodRow['company_name'], $goodRow['city'], $goodRow['state'], $goodRow['zip'], $badId);

                if ($stmtUpdate->execute()) {
                    $logMessages[] = "[ÉXITO] ID Malo: $badId -> Actualizado y mapeado a ID Bueno: $goodId.";
                    $response['summary']['updated']++;
                    if (!isset($idMapping[$goodId])) $idMapping[$goodId] = [];
                    $idMapping[$goodId][] = $badId;
                } else {
                    $logMessages[] = "[ERROR] ID Malo: $badId -> No se pudo actualizar. Error: " . $stmtUpdate->error;
                    $response['summary']['errors']++;
                }
                
                $matchFound = true;
                break;
            }
        }

        if (!$matchFound) {
            $logMessages[] = "[AVISO] ID Malo: " . $badRow['id'] . " -> No se encontró coincidencia.";
            $response['summary']['unmatched']++;
            $unmatchedRows[] = $badRow; 
        }
    }

    // --- PASO 5: Preparar los datos de los no encontrados ---
    if (!empty($unmatchedRows)) {
        $logMessages[] = "-------------------------------------------------";
        $logMessages[] = "Se encontraron " . count($unmatchedRows) . " registros sin coincidencia.";
        $response['unmatched_data'] = $unmatchedRows;
        
        file_put_contents('unmatched_records.json', json_encode($unmatchedRows, JSON_PRETTY_PRINT));
    }

    $response['success'] = true;
    $response['mapping'] = $idMapping;
    $logMessages[] = "-------------------------------------------------";
    $logMessages[] = "Proceso de normalización finalizado.";

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
