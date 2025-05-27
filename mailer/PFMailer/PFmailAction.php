<?php
/**
 * PFmailAction.php - Procesa acciones de email para Premium Freight
 * 
 * Este archivo maneja las acciones de aprobar/rechazar que vienen
 * desde los enlaces en los correos electrónicos. Recibe un token único
 * y un tipo de acción, valida el token contra la base de datos y 
 * ejecuta la acción correspondiente sobre la orden.
 */

// 1. Importar la configuración global
require_once __DIR__ . '/config.php';

// 2. Establecer códigos de respuesta HTTP apropiados
http_response_code(200);

// 3. Importar las clases necesarias para procesamiento
require_once 'PFmailer.php';

// Clase para manejar acciones de correo
class PFMailAction {
    private $db;
    
    public function __construct() {
        // 1. Inicializar conexión a la base de datos
        $con = new LocalConector();
        $this->db = $con->conectar();
    }
    
    /**
     * Procesa una acción basada en un token
     * 
     * @param string $token Token único de la acción
     * @param string $action Tipo de acción (approve/reject)
     * @return array Resultado del procesamiento
     */
    public function processAction($token, $action) {
        try {
            // 1. Verificar si el token existe y no ha sido usado
            $sql = "SELECT * FROM EmailActionTokens WHERE token = ? AND is_used = 0";
            $stmt = $this->db->prepare($sql);
            $stmt->bind_param("s", $token);
            $stmt->execute();
            $result = $stmt->get_result();
            
            // 2. Validar si se encontró un token válido
            if ($result->num_rows === 0) {
                return [
                    'success' => false,
                    'message' => 'El token proporcionado no es válido o ya ha sido utilizado.'
                ];
            }
            
            // 3. Obtener datos del token
            $tokenData = $result->fetch_assoc();
            $orderId = $tokenData['order_id'];
            $userId = $tokenData['user_id'];
            $tokenAction = $tokenData['action'];
            
            // 4. Verificar que la acción solicitada coincida con la del token
            if ($action !== $tokenAction) {
                return [
                    'success' => false,
                    'message' => 'La acción solicitada no coincide con la acción autorizada por el token.'
                ];
            }
            
            // 5. Ejecutar la acción correspondiente según el tipo
            if ($action === 'approve') {
                // 5.1. Lógica para aprobar la orden
                $result = $this->approveOrder($orderId, $userId);
                
                // // 5.2. Si la orden ya estaba aprobada, no marcar el token como usado
                // // para permitir que otros aprobadores lo utilicen si es necesario
                // if (isset($result['alreadyApproved']) && $result['alreadyApproved']) {
                //     // No marcar el token como usado
                //     return $result;
                // }
            } else {
                // 5.3. Lógica para rechazar la orden
                $result = $this->rejectOrder($orderId, $userId);
            }
            
            // 6. Marcar el token como usado
            $this->markTokenAsUsed($token);
            
            // 7. Retornar el resultado de la operación
            return $result;
        } catch (Exception $e) {
            // 8. Manejar cualquier excepción que ocurra durante el proceso
            return [
                'success' => false,
                'message' => 'Error al procesar la acción: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Aprueba una orden
     * 
     * @param int $orderId ID de la orden a aprobar
     * @param int $userId ID del usuario que aprueba
     * @return array Resultado de la operación
     */
    private function approveOrder($orderId, $userId) {
        try {
            // 1. Registrar para diagnóstico - Crea una entrada en el archivo de log con fecha y hora actual
            $logFile = __DIR__ . '/action_debug.log';
            file_put_contents($logFile, date('Y-m-d H:i:s') . " - Aprobando orden #$orderId por usuario #$userId\n", FILE_APPEND);
            
            // 2. Obtener el valor actual de aprobación y el nivel requerido, y el id del Status
            $getCurrentSql = "SELECT PFA.act_approv, PF.required_auth_level, PF.status_id
                              FROM PremiumFreightApprovals PFA 
                              JOIN PremiumFreight PF ON PFA.premium_freight_id = PF.id
                              WHERE PFA.premium_freight_id = ?";
            
            $getCurrentStmt = $this->db->prepare($getCurrentSql);
            
            // 3. Validar que la consulta se haya preparado correctamente
            if (!$getCurrentStmt) {
                file_put_contents($logFile, "Error preparando consulta para obtener valores actuales: " . $this->db->error . "\n", FILE_APPEND);
                throw new Exception("Error al preparar la consulta para obtener valores actuales: " . $this->db->error);
            }
            
            // 4. Vincular parámetros y ejecutar la consulta
            $getCurrentStmt->bind_param("i", $orderId);
            
            if (!$getCurrentStmt->execute()) {
                file_put_contents($logFile, "Error ejecutando consulta para obtener valores actuales: " . $getCurrentStmt->error . "\n", FILE_APPEND);
                throw new Exception("Error al ejecutar la consulta para obtener valores actuales: " . $getCurrentStmt->error);
            }
            
            // 5. Obtener el resultado de la consulta
            $currentResult = $getCurrentStmt->get_result();
            
            // 6. Procesar según si existe o no el registro de aprobación
            if ($currentResult->num_rows > 0) {
                // 6.1. Obtener datos actuales de aprobación
                $currentData = $currentResult->fetch_assoc();
                $currentApproval = (int)$currentData['act_approv'];
                $requiredLevel = (int)$currentData['required_auth_level'];
                $currentStatus = (int)$currentData['status_id'];
                
                // 6.2. Verificar si ya está en el nivel máximo
                if ($currentApproval >= $requiredLevel) {
                    file_put_contents($logFile, "La orden ya está completamente aprobada (nivel $currentApproval, requerido $requiredLevel)\n", FILE_APPEND);
                    return [
                        'success' => true,
                        'message' => "La orden #$orderId ya está completamente aprobada.",
                        // 'alreadyApproved' => true
                    ];
                }
                
                // 6.3. Incrementar en 1 el nivel de aprobación actual
                $newApprovalLevel = $currentApproval + 1;
                
                // 6.4. Actualizar con el nuevo nivel incrementado
                $updateSql = "UPDATE PremiumFreightApprovals SET act_approv = ?, approval_date = NOW() WHERE premium_freight_id = ?";
                $updateStmt = $this->db->prepare($updateSql);
                
                // 6.5. Validar preparación de consulta
                if (!$updateStmt) {
                    file_put_contents($logFile, "Error preparando consulta de aprobación: " . $this->db->error . "\n", FILE_APPEND);
                    throw new Exception("Error al preparar la consulta de aprobación: " . $this->db->error);
                }
                
                // 6.6. Ejecutar actualización
                $updateStmt->bind_param("ii", $newApprovalLevel, $orderId);
                
                if (!$updateStmt->execute()) {
                    file_put_contents($logFile, "Error ejecutando consulta de aprobación: " . $updateStmt->error . "\n", FILE_APPEND);
                    throw new Exception("Error al ejecutar la consulta de aprobación: " . $updateStmt->error);
                }
                
                // 6.7. Registrar resultado de la actualización
                $affectedRows = $updateStmt->affected_rows;
                file_put_contents($logFile, "Filas actualizadas en PremiumFreightApprovals: $affectedRows, nuevo nivel: $newApprovalLevel\n", FILE_APPEND);
                
                // 6.8. Verificar si con esta aprobación alcanzó el nivel requerido
                $fullyApproved = ($newApprovalLevel >= $requiredLevel);
                
                // 6.9. Actualizar el status_id en PremiumFreight según el nivel de aprobación
                $newStatusId = 2; // En proceso por defecto
                
                if ($fullyApproved) {
                    $newStatusId = 3; // Completamente aprobado
                    file_put_contents($logFile, "Orden alcanzó nivel completo de aprobación. Status actualizado a 'aprobado' (3)\n", FILE_APPEND);
                } else {
                    file_put_contents($logFile, "Orden en proceso de aprobación. Status actualizado a 'en proceso' (2)\n", FILE_APPEND);
                }
                
                // 6.10. Solo actualizar si el estado ha cambiado
                if ($currentStatus != $newStatusId) {
                    $statusSql = "UPDATE PremiumFreight SET status_id = ? WHERE id = ?";
                    $statusStmt = $this->db->prepare($statusSql);
                    $statusStmt->bind_param("ii", $newStatusId, $orderId);
                    
                    if (!$statusStmt->execute()) {
                        file_put_contents($logFile, "Error actualizando status_id en PremiumFreight: " . $statusStmt->error . "\n", FILE_APPEND);
                        throw new Exception("Error al actualizar status_id en PremiumFreight: " . $statusStmt->error);
                    }
                    
                    $statusAffectedRows = $statusStmt->affected_rows;
                    file_put_contents($logFile, "Status actualizado a $newStatusId. Filas afectadas: $statusAffectedRows\n", FILE_APPEND);
                } else {
                    file_put_contents($logFile, "No se actualizó el status_id ya que ya tiene el valor correcto: $currentStatus\n", FILE_APPEND);
                }
            } else {
                // 7. Si no existe el registro, crear uno nuevo con nivel 1
                $insertSql = "INSERT INTO PremiumFreightApprovals (premium_freight_id, act_approv, user_id, approval_date) 
                             VALUES (?, 1, ?, NOW())";
                $insertStmt = $this->db->prepare($insertSql);
                $insertStmt->bind_param("ii", $orderId, $userId);
                
                // 7.1. Ejecutar la inserción
                if (!$insertStmt->execute()) {
                    file_put_contents($logFile, "Error insertando aprobación: " . $insertStmt->error . "\n", FILE_APPEND);
                    throw new Exception("Error al insertar la aprobación: " . $insertStmt->error);
                }
                
                file_put_contents($logFile, "Creado nuevo registro de aprobación con nivel 1\n", FILE_APPEND);
                
                // 7.2. Actualizar el estado en PremiumFreight a "en proceso" (2)
                $statusSql = "UPDATE PremiumFreight SET status_id = 2 WHERE id = ?";
                $statusStmt = $this->db->prepare($statusSql);
                $statusStmt->bind_param("i", $orderId);
                
                if (!$statusStmt->execute()) {
                    file_put_contents($logFile, "Error actualizando status_id inicial en PremiumFreight: " . $statusStmt->error . "\n", FILE_APPEND);
                    throw new Exception("Error al actualizar status_id inicial en PremiumFreight: " . $statusStmt->error);
                }
                
                file_put_contents($logFile, "Status inicial actualizado a 'en proceso' (1)\n", FILE_APPEND);
            }
            
            // 8. Verificar si está completamente aprobada para enviar notificaciones
            $isFullyApproved = false;
            
            if ($currentResult->num_rows > 0) {
                // 8.1. Si actualizó un registro existente
                $isFullyApproved = ($newApprovalLevel >= $requiredLevel);
            }
            
            // 9. Enviar notificaciones automáticamente
            try {
                // 9.1. Inicializar mailer
                $mailer = new PFMailer();
                
                if ($isFullyApproved) {
                    // 9.2. Si está completamente aprobada, notificar al creador
                    $mailer->sendStatusNotification($orderId, 'approved');
                    file_put_contents($logFile, "Notificación de aprobación completa enviada al creador de la orden #$orderId\n", FILE_APPEND);
                } else {
                    // 9.3. Si aún necesita más aprobaciones, notificar al siguiente aprobador
                    $mailer->sendApprovalNotification($orderId);
                    file_put_contents($logFile, "Notificación enviada al siguiente aprobador para la orden #$orderId\n", FILE_APPEND);
                }
            } catch (Exception $e) {
                // 9.4. Registrar el error pero no interrumpir el flujo
                file_put_contents($logFile, "Error enviando notificaciones: " . $e->getMessage() . "\n", FILE_APPEND);
            }
            
            // 10. Registrar la acción exitosa
            file_put_contents($logFile, "Orden #$orderId aprobada exitosamente\n", FILE_APPEND);
            
            // 11. Retornar resultado exitoso
            return [
                'success' => true,
                'message' => "La orden #$orderId ha sido aprobada exitosamente."
            ];
        } catch (Exception $e) {
            // 12. Registrar el error en caso de excepción
            file_put_contents($logFile, "Error aprobando orden: " . $e->getMessage() . "\n", FILE_APPEND);
            
            // 13. Retornar resultado de error
            return [
                'success' => false,
                'message' => "Error al aprobar la orden: " . $e->getMessage()
            ];
        }
    }
    
    /**
     * Rechaza una orden
     * 
     * @param int $orderId ID de la orden a rechazar
     * @param int $userId ID del usuario que rechaza
     * @return array Resultado de la operación
     */
    private function rejectOrder($orderId, $userId) {
        try {
            // 1. Registrar para diagnóstico - Crear entrada en archivo de log
            $logFile = __DIR__ . '/action_debug.log';
            file_put_contents($logFile, date('Y-m-d H:i:s') . " - Rechazando orden #$orderId por usuario #$userId\n", FILE_APPEND);
            
            // 2. Actualizar PremiumFreight para marcar la orden como rechazada (status_id = 4)
            $updateSql = "UPDATE PremiumFreight SET status_id = 4 WHERE id = ?";
            
            $updateStmt = $this->db->prepare($updateSql);
            
            // 3. Validar preparación de consulta
            if (!$updateStmt) {
                file_put_contents($logFile, "Error preparando consulta de rechazo: " . $this->db->error . "\n", FILE_APPEND);
                throw new Exception("Error al preparar la consulta de rechazo: " . $this->db->error);
            }
            
            // 4. Vincular parámetros y ejecutar consulta
            $updateStmt->bind_param("i", $orderId);
            
            if (!$updateStmt->execute()) {
                file_put_contents($logFile, "Error ejecutando consulta de rechazo: " . $updateStmt->error . "\n", FILE_APPEND);
                throw new Exception("Error al ejecutar la consulta de rechazo: " . $updateStmt->error);
            }
            
            // 5. Registrar resultado de la actualización
            $affectedRows = $updateStmt->affected_rows;
            file_put_contents($logFile, "Filas actualizadas en PremiumFreight: $affectedRows\n", FILE_APPEND);
            
            // 6. Verificar si se actualizó alguna fila
            if ($affectedRows === 0) {
                // 6.1. Verificar si la orden existe
                $checkSql = "SELECT COUNT(*) as total FROM PremiumFreight WHERE id = ?";
                $checkStmt = $this->db->prepare($checkSql);
                $checkStmt->bind_param("i", $orderId);
                $checkStmt->execute();
                $checkResult = $checkStmt->get_result();
                $totalOrders = $checkResult->fetch_assoc()['total'];
                
                // 6.2. Validar si la orden existe
                if ($totalOrders === 0) {
                    file_put_contents($logFile, "La orden #$orderId no existe\n", FILE_APPEND);
                    throw new Exception("La orden #$orderId no existe en el sistema");
                } else {
                    // 6.3. Si la orden existe pero no se actualizó, podría ser que ya estuviera rechazada
                    $statusSql = "SELECT status_id FROM PremiumFreight WHERE id = ?";
                    $statusStmt = $this->db->prepare($statusSql);
                    $statusStmt->bind_param("i", $orderId);
                    $statusStmt->execute();
                    $statusResult = $statusStmt->get_result();
                    $currentStatus = $statusResult->fetch_assoc()['status_id'];
                    
                    file_put_contents($logFile, "La orden existe pero no se actualizó. Estado actual: $currentStatus\n", FILE_APPEND);
                    
                    // 6.4. Verificar si ya estaba rechazada
                    if ($currentStatus == 4) {
                        // La orden ya estaba rechazada
                        return [
                            'success' => true,
                            'message' => "La orden #$orderId ya estaba marcada como rechazada."
                        ];
                    }
                }
            }
            
            // 7. También registrar el rechazo en la tabla de aprobaciones si existe
            $rejectSql = "UPDATE PremiumFreightApprovals SET act_approv = 0, 
                          approval_date = NOW(), user_id = ? WHERE premium_freight_id = ?";
            $rejectStmt = $this->db->prepare($rejectSql);
            $rejectStmt->bind_param("ii", $userId, $orderId);
            $rejectStmt->execute();
            
            // 8. Enviar notificación de rechazo al creador
            try {
                // 8.1. Inicializar mailer
                $mailer = new PFMailer();
                
                // 8.2. Obtener información del usuario que rechazó
                $userSql = "SELECT id, name, authorization_level FROM User WHERE id = ?";
                $userStmt = $this->db->prepare($userSql);
                $userStmt->bind_param("i", $userId);
                $userStmt->execute();
                $userResult = $userStmt->get_result();
                $rejectorInfo = null;
                
                // 8.3. Obtener datos del usuario si existe
                if ($userResult->num_rows > 0) {
                    $userData = $userResult->fetch_assoc();
                    $rejectorInfo = [
                        'id' => $userData['id'],
                        'name' => $userData['name'],
                        'level' => $userData['authorization_level']
                    ];
                }
                
                // 8.4. Enviar notificación de rechazo
                $mailer->sendStatusNotification($orderId, 'rejected', $rejectorInfo);
                file_put_contents($logFile, "Notificación de rechazo enviada al creador de la orden #$orderId\n", FILE_APPEND);
            } catch (Exception $e) {
                // 8.5. Registrar el error pero no interrumpir el flujo
                file_put_contents($logFile, "Error enviando notificación de rechazo: " . $e->getMessage() . "\n", FILE_APPEND);
            }
            
            // 9. Registrar la acción exitosa
            file_put_contents($logFile, "Orden #$orderId rechazada exitosamente\n", FILE_APPEND);
            
            // 10. Retornar resultado exitoso
            return [
                'success' => true,
                'message' => "La orden #$orderId ha sido rechazada."
            ];
        } catch (Exception $e) {
            // 11. Registrar el error en caso de excepción
            file_put_contents($logFile, "Error rechazando orden: " . $e->getMessage() . "\n", FILE_APPEND);
            
            // 12. Retornar resultado de error
            return [
                'success' => false,
                'message' => "Error al rechazar la orden: " . $e->getMessage()
            ];
        }
    }
    
    /**
     * Marca un token como usado
     */
    private function markTokenAsUsed($token) {
        // 1. Preparar consulta para marcar el token como usado
        $sql = "UPDATE EmailActionTokens SET is_used = 1, used_at = NOW() WHERE token = ?";
        // 2. Preparar statement
        $stmt = $this->db->prepare($sql);
        // 3. Vincular parámetros
        $stmt->bind_param("s", $token);
        // 4. Ejecutar la actualización
        $stmt->execute();
    }
    
    /**
     * Valida un token de acción por correo
     * 
     * @param string $token - Token a validar
     * @return array|false - Información del token si es válido, false en caso contrario
     */
    public function validateToken($token) {
        try {
            // 1. Registrar para diagnóstico - Crear entrada en archivo de log
            $logFile = __DIR__ . '/action_debug.log';
            file_put_contents($logFile, date('Y-m-d H:i:s') . " - Validando token: {$token}\n", FILE_APPEND);

            // 2. Preparar la consulta para obtener la información del token
            $sql = "SELECT token, order_id, user_id, action, created_at 
                    FROM EmailActionTokens 
                    WHERE token = ? 
                    AND created_at > DATE_SUB(NOW(), INTERVAL 72 HOUR)
                    AND is_used = 0
                    LIMIT 1";
            
            $stmt = $this->db->prepare($sql);
            
            // 3. Verificar si se preparó correctamente la consulta
            if (!$stmt) {
                file_put_contents($logFile, "Error al preparar consulta de token: " . $this->db->error . "\n", FILE_APPEND);
                return false;
            }
            
            // 4. Vincular parámetros y ejecutar consulta
            $stmt->bind_param("s", $token);
            
            if (!$stmt->execute()) {
                file_put_contents($logFile, "Error al ejecutar consulta de token: " . $stmt->error . "\n", FILE_APPEND);
                return false;
            }
            
            // 5. Obtener el resultado de la consulta
            $result = $stmt->get_result();
            
            // 6. Verificar si se encontró un token válido
            if ($result->num_rows === 0) {
                file_put_contents($logFile, "Token no encontrado o expirado: {$token}\n", FILE_APPEND);
                return false;
            }
            
            // 7. Obtener la información del token y registrarla
            $tokenInfo = $result->fetch_assoc();
            file_put_contents($logFile, "Token válido encontrado: " . json_encode($tokenInfo) . "\n", FILE_APPEND);
            
            // 8. Marcar el token como usado para evitar su reutilización
            $updateSql = "UPDATE EmailActionTokens SET used = 1, used_at = NOW() WHERE token = ?";
            $updateStmt = $this->db->prepare($updateSql);
            $updateStmt->bind_param("s", $token);
            $updateStmt->execute();
            
            // 9. Retornar la información del token
            return $tokenInfo;
        } catch (Exception $e) {
            // 10. Registrar cualquier error y retornar false
            file_put_contents($logFile, "Error en validateToken: " . $e->getMessage() . "\n", FILE_APPEND);
            return false;
        }
    }
}

// 1. Inicializar variables para seguimiento de errores
$error = false;
$errorMessage = '';

// 2. Verificar si se recibieron los parámetros necesarios
if (!isset($_GET['action']) || !isset($_GET['token'])) {
    $error = true;
    $errorMessage = 'Faltan parámetros requeridos para procesar la acción';
} else {
    // 3. Obtener los parámetros
    $action = $_GET['action'];
    $token = $_GET['token'];
    
    // 4. Validar acción (debe ser approve o reject)
    if ($action !== 'approve' && $action !== 'reject') {
        $error = true;
        $errorMessage = 'Acción inválida';
    }
}

// 5. Registrar la acción solicitada para depuración
$logFile = __DIR__ . '/action_debug.log';
file_put_contents($logFile, date('Y-m-d H:i:s') . " - Solicitud recibida: acción={$action}, token={$token}\n", FILE_APPEND);

// 6. Solo si no hay errores, continuamos con la validación
if (!$error) {
    try {
        // 6.1. Inicializar la clase de acción
        $mailAction = new PFMailAction();
        
        // 6.2. Verificar el token y obtener los detalles de la acción
        $tokenInfo = $mailAction->validateToken($token);
        
        // 6.3. Validar si el token es válido
        if (!$tokenInfo) {
            $error = true;
            $errorMessage = 'Token inválido o expirado';
            file_put_contents($logFile, date('Y-m-d H:i:s') . " - Token inválido: {$token}\n", FILE_APPEND);
        } else {
            // 6.4. Verificar que la acción solicitada coincida con la acción del token
            if ($tokenInfo['action'] !== $action) {
                $error = true;
                $errorMessage = 'La acción solicitada no coincide con la autorizada por el token';
                file_put_contents($logFile, date('Y-m-d H:i:s') . " - Acción no coincide: solicitada={$action}, token={$tokenInfo['action']}\n", FILE_APPEND);
            }
        }
    } catch (Exception $e) {
        // 6.5. Manejar excepciones en la validación
        $error = true;
        $errorMessage = 'Error al validar el token: ' . $e->getMessage();
        file_put_contents($logFile, date('Y-m-d H:i:s') . " - Excepción: {$e->getMessage()}\n", FILE_APPEND);
    }
}

// 7. Si todo está correcto, procesamos la acción
if (!$error) {
    try {
        // 7.1. Registrar inicio del procesamiento de la acción
        file_put_contents($logFile, date('Y-m-d H:i:s') . " - Procesando acción {$action} para orden {$tokenInfo['order_id']} por usuario {$tokenInfo['user_id']}\n", FILE_APPEND);
        
        // 7.2. Ejecutar la acción según el parámetro recibido
        if ($action === 'approve') {
            // 7.2.1. Procesar aprobación
            $result = $mailAction->processApprove($tokenInfo['order_id'], $tokenInfo['user_id']);
            if ($result && $result['success']) {
                // 7.2.2. Registrar aprobación exitosa
                file_put_contents($logFile, date('Y-m-d H:i:s') . " - Aprobación exitosa\n", FILE_APPEND);
                showSuccess($result['message'], isset($result['additionalInfo']) ? $result['additionalInfo'] : '');
            } else {
                // 7.2.3. Registrar error en aprobación
                file_put_contents($logFile, date('Y-m-d H:i:s') . " - Error en aprobación: {$result['message']}\n", FILE_APPEND);
                showError($result['message']);
            }
        } else if ($action === 'reject') {
            // 7.2.4. Procesar rechazo
            $result = $mailAction->processReject($tokenInfo['order_id'], $tokenInfo['user_id']);
            if ($result && $result['success']) {
                // 7.2.5. Registrar rechazo exitoso
                file_put_contents($logFile, date('Y-m-d H:i:s') . " - Rechazo exitoso\n", FILE_APPEND);
                showSuccess($result['message']);
            } else {
                // 7.2.6. Registrar error en rechazo
                file_put_contents($logFile, date('Y-m-d H:i:s') . " - Error en rechazo: {$result['message']}\n", FILE_APPEND);
                showError($result['message']);
            }
        } else {
            // 7.2.7. Manejar acción desconocida (caso que no debería ocurrir por la validación previa)
            file_put_contents($logFile, date('Y-m-d H:i:s') . " - Acción desconocida: {$action}\n", FILE_APPEND);
            showError('Acción desconocida');
        }
        
        // 7.3. Detener ejecución adicional
        exit();
        
    } catch (Exception $e) {
        // 7.4. Manejar excepciones durante el procesamiento
        file_put_contents($logFile, date('Y-m-d H:i:s') . " - Excepción procesando acción: {$e->getMessage()}\n", FILE_APPEND);
        showError('Error al procesar la acción: ' . $e->getMessage());
    }
} else {
    // 8. Si hubo un error en la validación, mostrar mensaje
    file_put_contents($logFile, date('Y-m-d H:i:s') . " - Error final: {$errorMessage}\n", FILE_APPEND);
    showError($errorMessage);
}

/**
 * Muestra un mensaje de éxito
 * 
 * @param string $message Mensaje a mostrar al usuario
 */
function showSuccess($message, $additionalInfo = '') {
    // 1. Usar la constante URL global definida en config.php
    global $URL;
    
    // 2. Generar HTML con mensaje de éxito
    echo "<!DOCTYPE html>
    <html lang='es'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>Acción Realizada Correctamente</title>
        <style>
            body { 
                font-family: 'Merriweather', Arial, sans-serif; 
                text-align: center; 
                margin-top: 50px; 
                background-color: #f8f9fa;
                color: #333;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 40px 20px;
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .success { 
                color: #28a745; 
                font-size: 24px; 
                margin-bottom: 20px; 
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .success::before {
                content: '✓';
                display: inline-block;
                margin-right: 10px;
                background-color: #28a745;
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                line-height: 30px;
            }
            .message { 
                margin-bottom: 30px; 
                line-height: 1.6;
            }
            .additional-info {
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 4px;
                margin-bottom: 20px;
                font-size: 14px;
                color: #555;
            }
            .btn { 
                display: inline-block; 
                padding: 12px 24px; 
                background-color: #034C8C; 
                color: white; 
                text-decoration: none; 
                border-radius: 4px; 
                font-weight: bold;
                transition: background-color 0.3s;
            }
            .btn:hover {
                background-color: #023b6a;
            }
            .logo {
                margin-bottom: 20px;
                max-width: 150px;
            }
        </style>
    </head>
    <body>
        <div class='container'>
            <img src='" . URLPF . "assets\logo\logo.png' alt='Premium Freight Logo' class='logo'>
            <div class='success'>¡Acción Exitosa!</div>
            <div class='message'>$message</div>
            " . ($additionalInfo ? "<div class='additional-info'>$additionalInfo</div>" : "") . "
            <a href='" . URLPF . "orders.php' class='btn'>Ver Órdenes</a>
        </div>
    </body>
    </html>";
    // 3. Finalizar ejecución
    exit;
}

/**
 * Muestra un mensaje de error
 * 
 * @param string $message Mensaje de error a mostrar al usuario
 */
function showError($message) {
    // 1. Usar la constante URL global definida en config.php
    global $URL;
    
    // 2. Generar HTML con mensaje de error
    echo "<!DOCTYPE html>
    <html lang='es'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>Error en la Acción</title>
        <style>
            body { 
                font-family: 'Merriweather', Arial, sans-serif; 
                text-align: center; 
                margin-top: 50px; 
                background-color: #f8f9fa;
                color: #333;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 40px 20px;
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .error { 
                color: #dc3545; 
                font-size: 24px; 
                margin-bottom: 20px; 
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .error::before {
                content: '✗';
                display: inline-block;
                margin-right: 10px;
                background-color: #dc3545;
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                line-height: 30px;
            }
            .message { 
                margin-bottom: 30px; 
                line-height: 1.6;
            }
            .btn { 
                display: inline-block; 
                padding: 12px 24px; 
                background-color: #034C8C; 
                color: white; 
                text-decoration: none; 
                border-radius: 4px; 
                font-weight: bold;
                transition: background-color 0.3s;
            }
            .btn:hover {
                background-color: #023b6a;
            }
            .logo {
                margin-bottom: 20px;
                max-width: 150px;
            }
        </style>
    </head>
    <body>
        <div class='container'>
            <img src='" . URLPF . "assets\logo\logo.png' alt='Premium Freight Logo' class='logo'>
            <div class='error'>Error</div>
            <div class='message'>$message</div>
            <a href='" . URLPF . "orders.php' class='btn'>Ver Órdenes</a>
        </div>
    </body>
    </html>";
    // 3. Finalizar ejecución
    exit;
}
?>