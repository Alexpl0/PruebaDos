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
require_once __DIR__ . '/PFmailUtils.php';

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
            // Registrar inicio de procesamiento
            logAction("Iniciando processAction para token={$token}, acción={$action}", 'PROCESSACTION');
            
            // Iniciar transacción para asegurar atomicidad
            $this->db->begin_transaction();
            
            // Bloquear el registro para evitar race conditions
            $sql = "SELECT * FROM EmailActionTokens WHERE token = ? FOR UPDATE";
            $stmt = $this->db->prepare($sql);
            $stmt->bind_param("s", $token);
            $stmt->execute();
            $result = $stmt->get_result();
            
            // Validar si se encontró un token válido
            if ($result->num_rows === 0) {
                $this->db->rollback();
                logAction("Token no encontrado en la base de datos: {$token}", 'PROCESSACTION');
                return [
                    'success' => false,
                    'message' => 'El token proporcionado no es válido.'
                ];
            }
            
            // Obtener datos del token
            $tokenData = $result->fetch_assoc();
            
            // Verificar si el token ya ha sido usado
            if ($tokenData['is_used'] == 1) {
                $this->db->rollback();
                logAction("Token ya utilizado: {$token}", 'PROCESSACTION');
                return [
                    'success' => false,
                    'message' => 'El token ya ha sido utilizado previamente.'
                ];
            }
            
            $orderId = $tokenData['order_id'];
            $userId = $tokenData['user_id'];
            $tokenAction = $tokenData['action'];
            
            // Verificar que la acción solicitada coincida con la del token
            if ($action !== $tokenAction) {
                $this->db->rollback();
                logAction("Acción solicitada ({$action}) no coincide con la del token ({$tokenAction})", 'PROCESSACTION');
                return [
                    'success' => false,
                    'message' => 'La acción solicitada no coincide con la acción autorizada por el token.' 
                ];
            }
            
            // Marcar el token como usado inmediatamente para evitar múltiples ejecuciones
            if (!$this->markTokenAsUsed($token)) {
                $this->db->rollback();
                logAction("Error al marcar token como usado: {$token}", 'PROCESSACTION');
                return [
                    'success' => false,
                    'message' => 'Error al procesar la acción. No se pudo marcar el token como utilizado.'
                ];
            }
            
            // Ejecutar la acción correspondiente según el tipo
            $result = ($action === 'approve') 
                ? $this->approveOrder($orderId, $userId)
                : $this->rejectOrder($orderId, $userId);
            
            // Si todo salió bien, confirmar los cambios
            if ($result['success']) {
                $this->db->commit();
                logAction("Acción {$action} completada exitosamente para orden #{$orderId}", 'PROCESSACTION');
            } else {
                $this->db->rollback();
                logAction("Error en acción {$action} para orden #{$orderId}: {$result['message']}", 'PROCESSACTION');
            }
            
            // Retornar el resultado de la operación
            return $result;
        } catch (Exception $e) {
            // En caso de error, revertir los cambios
            $this->db->rollback();
            
            // Manejar cualquier excepción que ocurra durante el proceso
            logAction("Excepción en processAction: " . $e->getMessage(), 'PROCESSACTION');
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
            // 1. Registrar para diagnóstico
            logAction("Aprobando orden #{$orderId} por usuario #{$userId}", 'APPROVEORDER');
            
            // 2. Obtener el valor actual de aprobación y el nivel requerido, y el id del Status
            $getCurrentSql = "SELECT PFA.act_approv, PF.required_auth_level, PF.status_id
                              FROM PremiumFreightApprovals PFA 
                              JOIN PremiumFreight PF ON PFA.premium_freight_id = PF.id
                              WHERE PFA.premium_freight_id = ?";
            
            $getCurrentStmt = $this->db->prepare($getCurrentSql);
            
            // 3. Validar que la consulta se haya preparado correctamente
            if (!$getCurrentStmt) {
                logAction("Error preparando consulta para obtener valores actuales: " . $this->db->error, 'APPROVEORDER');
                throw new Exception("Error al preparar la consulta para obtener valores actuales: " . $this->db->error);
            }
            
            // 4. Vincular parámetros y ejecutar la consulta
            $getCurrentStmt->bind_param("i", $orderId);
            
            if (!$getCurrentStmt->execute()) {
                logAction("Error ejecutando consulta para obtener valores actuales: " . $getCurrentStmt->error, 'APPROVEORDER');
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
                
                logAction("Datos actuales - Aprobación: {$currentApproval}, Requerido: {$requiredLevel}, Status: {$currentStatus}", 'APPROVEORDER');
                
                // 6.2. Verificar si ya está en el nivel máximo
                if ($currentApproval >= $requiredLevel) {
                    logAction("La orden ya está completamente aprobada (nivel $currentApproval, requerido $requiredLevel)", 'APPROVEORDER');
                    return [
                        'success' => true,
                        'message' => "La orden #{$orderId} ya está completamente aprobada."
                    ];
                }
                
                // 6.3. Incrementar en 1 el nivel de aprobación actual
                $newApprovalLevel = $currentApproval + 1;
                logAction("Incrementando nivel de aprobación de {$currentApproval} a {$newApprovalLevel}", 'APPROVEORDER');
                
                // 6.4. Actualizar con el nuevo nivel incrementado
                $updateSql = "UPDATE PremiumFreightApprovals SET act_approv = ?, approval_date = NOW() WHERE premium_freight_id = ?";
                $updateStmt = $this->db->prepare($updateSql);
                
                // 6.5. Validar preparación de consulta
                if (!$updateStmt) {
                    logAction("Error preparando consulta de aprobación: " . $this->db->error, 'APPROVEORDER');
                    throw new Exception("Error al preparar la consulta de aprobación: " . $this->db->error);
                }
                
                // 6.6. Ejecutar actualización
                $updateStmt->bind_param("ii", $newApprovalLevel, $orderId);
                
                if (!$updateStmt->execute()) {
                    logAction("Error ejecutando consulta de aprobación: " . $updateStmt->error, 'APPROVEORDER');
                    throw new Exception("Error al ejecutar la consulta de aprobación: " . $updateStmt->error);
                }
                
                // 6.7. Registrar resultado de la actualización
                $affectedRows = $updateStmt->affected_rows;
                logAction("Filas actualizadas en PremiumFreightApprovals: $affectedRows, nuevo nivel: $newApprovalLevel", 'APPROVEORDER');
                
                // 6.8. Verificar si con esta aprobación alcanzó el nivel requerido
                $fullyApproved = ($newApprovalLevel >= $requiredLevel);
                
                // 6.9. Actualizar el status_id en PremiumFreight según el nivel de aprobación
                $newStatusId = 2; // En proceso por defecto
                
                if ($fullyApproved) {
                    $newStatusId = 3; // Completamente aprobado
                    logAction("Orden alcanzó nivel completo de aprobación. Status actualizado a 'aprobado' (3)", 'APPROVEORDER');
                } else {
                    logAction("Orden en proceso de aprobación. Status actualizado a 'en proceso' (2)", 'APPROVEORDER');
                }
                
                // 6.10. Solo actualizar si el estado ha cambiado
                if ($currentStatus != $newStatusId) {
                    $statusSql = "UPDATE PremiumFreight SET status_id = ? WHERE id = ?";
                    $statusStmt = $this->db->prepare($statusSql);
                    $statusStmt->bind_param("ii", $newStatusId, $orderId);
                    
                    if (!$statusStmt->execute()) {
                        logAction("Error actualizando status_id en PremiumFreight: " . $statusStmt->error, 'APPROVEORDER');
                        throw new Exception("Error al actualizar status_id en PremiumFreight: " . $statusStmt->error);
                    }
                    
                    $statusAffectedRows = $statusStmt->affected_rows;
                    logAction("Status actualizado a $newStatusId. Filas afectadas: $statusAffectedRows", 'APPROVEORDER');
                } else {
                    logAction("No se actualizó el status_id ya que ya tiene el valor correcto: $currentStatus", 'APPROVEORDER');
                }
            } else {
                // 7. Si no existe el registro, crear uno nuevo con nivel 1
                logAction("No existe registro de aprobación, creando nuevo con nivel 1", 'APPROVEORDER');
                
                $insertSql = "INSERT INTO PremiumFreightApprovals (premium_freight_id, act_approv, user_id, approval_date) 
                             VALUES (?, 1, ?, NOW())";
                $insertStmt = $this->db->prepare($insertSql);
                $insertStmt->bind_param("ii", $orderId, $userId);
                
                // 7.1. Ejecutar la inserción
                if (!$insertStmt->execute()) {
                    logAction("Error insertando aprobación: " . $insertStmt->error, 'APPROVEORDER');
                    throw new Exception("Error al insertar la aprobación: " . $insertStmt->error);
                }
                
                logAction("Creado nuevo registro de aprobación con nivel 1", 'APPROVEORDER');
                
                // 7.2. Actualizar el estado en PremiumFreight a "en proceso" (2)
                $statusSql = "UPDATE PremiumFreight SET status_id = 2 WHERE id = ?";
                $statusStmt = $this->db->prepare($statusSql);
                $statusStmt->bind_param("i", $orderId);
                
                if (!$statusStmt->execute()) {
                    logAction("Error actualizando status_id inicial en PremiumFreight: " . $statusStmt->error, 'APPROVEORDER');
                    throw new Exception("Error al actualizar status_id inicial en PremiumFreight: " . $statusStmt->error);
                }
                
                logAction("Status inicial actualizado a 'en proceso' (2)", 'APPROVEORDER');
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
                    logAction("Notificación de aprobación completa enviada al creador de la orden #{$orderId}", 'APPROVEORDER');
                } else {
                    // 9.3. Si aún necesita más aprobaciones, notificar al siguiente aprobador
                    $mailer->sendApprovalNotification($orderId);
                    logAction("Notificación enviada al siguiente aprobador para la orden #{$orderId}", 'APPROVEORDER');
                }
            } catch (Exception $e) {
                // 9.4. Registrar el error pero no interrumpir el flujo
                logAction("Error enviando notificaciones: " . $e->getMessage(), 'APPROVEORDER');
            }
            
            // 10. Registrar la acción exitosa
            logAction("Orden #{$orderId} aprobada exitosamente", 'APPROVEORDER');
            
            // 11. Retornar resultado exitoso
            return [
                'success' => true,
                'message' => "La orden #{$orderId} ha sido aprobada exitosamente."
            ];
        } catch (Exception $e) {
            // 12. Registrar el error en caso de excepción
            logAction("Error aprobando orden: " . $e->getMessage(), 'APPROVEORDER');
            
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
            // 1. Registrar para diagnóstico
            logAction("Rechazando orden #{$orderId} por usuario #{$userId}", 'REJECTORDER');
            
            // 2. Actualizar PremiumFreight para marcar la orden como rechazada (status_id = 4)
            $updateSql = "UPDATE PremiumFreight SET status_id = 4 WHERE id = ?";
            
            $updateStmt = $this->db->prepare($updateSql);
            
            // 3. Validar preparación de consulta
            if (!$updateStmt) {
                logAction("Error preparando consulta de rechazo: " . $this->db->error, 'REJECTORDER');
                throw new Exception("Error al preparar la consulta de rechazo: " . $this->db->error);
            }
            
            // 4. Vincular parámetros y ejecutar consulta
            $updateStmt->bind_param("i", $orderId);
            
            if (!$updateStmt->execute()) {
                logAction("Error ejecutando consulta de rechazo: " . $updateStmt->error, 'REJECTORDER');
                throw new Exception("Error al ejecutar la consulta de rechazo: " . $updateStmt->error);
            }
            
            // 5. Registrar resultado de la actualización
            $affectedRows = $updateStmt->affected_rows;
            logAction("Filas actualizadas en PremiumFreight: $affectedRows", 'REJECTORDER');
            
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
                    logAction("La orden #{$orderId} no existe", 'REJECTORDER');
                    throw new Exception("La orden #{$orderId} no existe en el sistema");
                } else {
                    // 6.3. Si la orden existe pero no se actualizó, podría ser que ya estuviera rechazada
                    $statusSql = "SELECT status_id FROM PremiumFreight WHERE id = ?";
                    $statusStmt = $this->db->prepare($statusSql);
                    $statusStmt->bind_param("i", $orderId);
                    $statusStmt->execute();
                    $statusResult = $statusStmt->get_result();
                    $currentStatus = $statusResult->fetch_assoc()['status_id'];
                    
                    logAction("La orden existe pero no se actualizó. Estado actual: $currentStatus", 'REJECTORDER');
                    
                    // 6.4. Verificar si ya estaba rechazada
                    if ($currentStatus == 4) {
                        // La orden ya estaba rechazada
                        return [
                            'success' => true,
                            'message' => "La orden #{$orderId} ya estaba marcada como rechazada."
                        ];
                    }
                }
            }
            
            // 7. También registrar el rechazo en la tabla de aprobaciones si existe
            $rejectSql = "UPDATE PremiumFreightApprovals SET act_approv = 99, 
                          approval_date = NOW(), user_id = ? WHERE premium_freight_id = ?";
            $rejectStmt = $this->db->prepare($rejectSql);
            $rejectStmt->bind_param("ii", $userId, $orderId);
            $rejectStmt->execute();
            
            logAction("Registro de aprobación actualizado con código de rechazo (99)", 'REJECTORDER');
            
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
                    logAction("Información del usuario que rechaza: " . $userData['name'] . " (nivel " . $userData['authorization_level'] . ")", 'REJECTORDER');
                }
                
                // 8.4. Enviar notificación de rechazo
                $mailer->sendStatusNotification($orderId, 'rejected', $rejectorInfo);
                logAction("Notificación de rechazo enviada al creador de la orden #{$orderId}", 'REJECTORDER');
            } catch (Exception $e) {
                // 8.5. Registrar el error pero no interrumpir el flujo
                logAction("Error enviando notificación de rechazo: " . $e->getMessage(), 'REJECTORDER');
            }
            
            // 9. Registrar la acción exitosa
            logAction("Orden #{$orderId} rechazada exitosamente", 'REJECTORDER');
            
            // 10. Retornar resultado exitoso
            return [
                'success' => true,
                'message' => "La orden #{$orderId} ha sido rechazada."
            ];
        } catch (Exception $e) {
            // 11. Registrar el error en caso de excepción
            logAction("Error rechazando orden: " . $e->getMessage(), 'REJECTORDER');
            
            // 12. Retornar resultado de error
            return [
                'success' => false,
                'message' => "Error al rechazar la orden: " . $e->getMessage()
            ];
        }
    }
    
    /**
     * Marca un token como usado
     * 
     * @param string $token Token a marcar como usado
     * @return bool True si se marcó correctamente, False en caso contrario
     */
    private function markTokenAsUsed($token) {
        logAction("Marcando token como usado: {$token}", 'MARKTOKENUSED');
        
        // Preparar consulta para marcar el token como usado
        $sql = "UPDATE EmailActionTokens SET is_used = 1, used_at = NOW() WHERE token = ?";
        // Preparar statement
        $stmt = $this->db->prepare($sql);
        // Vincular parámetros
        $stmt->bind_param("s", $token);
        // Ejecutar la actualización
        $result = $stmt->execute();
        
        // Log the result
        logAction("Resultado de marcar token: " . ($result ? "exitoso" : "fallido: " . $stmt->error), 'MARKTOKENUSED');
        
        return $result;
    }
    
    /**
     * Valida un token de acción por correo
     * 
     * @param string $token - Token a validar
     * @return array|false - Información del token si es válido, false en caso contrario
     */
    public function validateToken($token) {
        try {
            // 1. Registrar para diagnóstico
            logAction("Validando token: {$token}", 'VALIDATETOKEN');

            // 2. Preparar la consulta para obtener la información del token
            $sql = "SELECT token, order_id, user_id, action, created_at, is_used 
                    FROM EmailActionTokens 
                    WHERE token = ? 
                    AND created_at > DATE_SUB(NOW(), INTERVAL 72 HOUR)
                    LIMIT 1";
            
            $stmt = $this->db->prepare($sql);
            
            // 3. Verificar si se preparó correctamente la consulta
            if (!$stmt) {
                logAction("Error al preparar consulta de token: " . $this->db->error, 'VALIDATETOKEN');
                return false;
            }
            
            // 4. Vincular parámetros y ejecutar consulta
            $stmt->bind_param("s", $token);
            
            if (!$stmt->execute()) {
                logAction("Error al ejecutar consulta de token: " . $stmt->error, 'VALIDATETOKEN');
                return false;
            }
            
            // 5. Obtener el resultado de la consulta
            $result = $stmt->get_result();
            
            // 6. Verificar si se encontró un token válido
            if ($result->num_rows === 0) {
                logAction("Token no encontrado o expirado: {$token}", 'VALIDATETOKEN');
                return false;
            }
            
            // 7. Obtener la información del token y registrarla
            $tokenInfo = $result->fetch_assoc();
            
            // 8. Verificar si el token ya ha sido usado
            if ($tokenInfo['is_used'] == 1) {
                logAction("Token ya utilizado: {$token}", 'VALIDATETOKEN');
                return [
                    'is_used' => true,
                    'token' => $token,
                    'action' => $tokenInfo['action']
                ];
            }
            
            logAction("Token válido encontrado: Order ID {$tokenInfo['order_id']}, Action: {$tokenInfo['action']}", 'VALIDATETOKEN');
            
            // 9. Retornar la información del token
            return $tokenInfo;
        } catch (Exception $e) {
            // 10. Registrar cualquier error y retornar false
            logAction("Error en validateToken: " . $e->getMessage(), 'VALIDATETOKEN');
            return false;
        }
    }
    
    /**
     * Valida un token de acción en bloque por correo
     * 
     * @param string $token - Token de bloque a validar
     * @return array|false - Información del token si es válido, false en caso contrario
     */
    public function validateBulkToken($token) {
        try {
            // 1. Registrar para diagnóstico
            logAction("Validando token en bloque: {$token}", 'VALIDATEBULKTOKEN');

            // 2. Preparar la consulta para obtener la información del token en bloque
            $sql = "SELECT token, user_id, action, order_ids, created_at, is_used 
                    FROM EmailBulkActionTokens 
                    WHERE token = ? 
                    AND created_at > DATE_SUB(NOW(), INTERVAL 72 HOUR)
                    LIMIT 1";
            
            $stmt = $this->db->prepare($sql);
            
            // 3. Verificar si se preparó correctamente la consulta
            if (!$stmt) {
                logAction("Error al preparar consulta de token en bloque: " . $this->db->error, 'VALIDATEBULKTOKEN');
                return false;
            }
            
            // 4. Vincular parámetros y ejecutar consulta
            $stmt->bind_param("s", $token);
            
            if (!$stmt->execute()) {
                logAction("Error al ejecutar consulta de token en bloque: " . $stmt->error, 'VALIDATEBULKTOKEN');
                return false;
            }
            
            // 5. Obtener el resultado de la consulta
            $result = $stmt->get_result();
            
            // 6. Verificar si se encontró un token válido
            if ($result->num_rows === 0) {
                logAction("Token en bloque no encontrado o expirado: {$token}", 'VALIDATEBULKTOKEN');
                return false;
            }
            
            // 7. Obtener la información del token y registrarla
            $tokenInfo = $result->fetch_assoc();
            
            // 8. Verificar si el token ya ha sido usado
            if ($tokenInfo['is_used'] == 1) {
                logAction("Token en bloque ya utilizado: {$token}", 'VALIDATEBULKTOKEN');
                return [
                    'is_used' => true,
                    'token' => $token,
                    'action' => $tokenInfo['action']
                ];
            }
            
            // 9. Decodificar y validar las órdenes
            $orderIds = json_decode($tokenInfo['order_ids'], true);
            if (!is_array($orderIds) || empty($orderIds)) {
                logAction("Error decodificando order_ids o array vacío para token: {$token}", 'VALIDATEBULKTOKEN');
                return false;
            }
            
            // 10. Agregar información decodificada al resultado
            $tokenInfo['decoded_order_ids'] = $orderIds;
            $tokenInfo['total_orders'] = count($orderIds);
            
            logAction("Token en bloque válido encontrado: User ID {$tokenInfo['user_id']}, Action: {$tokenInfo['action']}, Órdenes: " . count($orderIds), 'VALIDATEBULKTOKEN');
            
            // 11. Retornar la información del token
            return $tokenInfo;
        } catch (Exception $e) {
            // 12. Registrar cualquier error y retornar false
            logAction("Error en validateBulkToken: " . $e->getMessage(), 'VALIDATEBULKTOKEN');
            return false;
        }
    }
    
    /**
     * Marca un token de acción en bloque como usado
     * 
     * @param string $token Token de bloque a marcar como usado
     * @return bool True si se marcó correctamente, False en caso contrario
     */
    private function markBulkTokenAsUsed($token) {
        logAction("Marcando token en bloque como usado: {$token}", 'MARKBULKTOKENUSED');
        
        // Preparar consulta para marcar el token como usado
        $sql = "UPDATE EmailBulkActionTokens SET is_used = 1, used_at = NOW() WHERE token = ?";
        // Preparar statement
        $stmt = $this->db->prepare($sql);
        // Vincular parámetros
        $stmt->bind_param("s", $token);
        // Ejecutar la actualización
        $result = $stmt->execute();
        
        // Log the result
        logAction("Resultado de marcar token en bloque: " . ($result ? "exitoso" : "fallido: " . $stmt->error), 'MARKBULKTOKENUSED');
        
        return $result;
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
logAction("Solicitud recibida: acción={$action}, token={$token}", 'PFMAILACTION');

// 5.1 Verificar si ya se ha procesado esta acción
$actionKey = "pf_action_" . md5($token . $action);
if(isset($_COOKIE[$actionKey])) {
    logAction("Acción duplicada detectada: {$action}, token: {$token}", 'PFMAILACTION');
    showError("Esta acción ya ha sido procesada. Por favor no vuelva a hacer clic en el mismo enlace.");
    exit();
}

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
            logAction("Token inválido: {$token}", 'PFMAILACTION');
        } else if (isset($tokenInfo['is_used']) && $tokenInfo['is_used']) {
            $error = true;
            $errorMessage = 'Este token ya ha sido utilizado previamente';
            logAction("Token ya utilizado: {$token}", 'PFMAILACTION');
        } else {
            // 6.4. Verificar que la acción solicitada coincida con la acción del token
            if ($tokenInfo['action'] !== $action) {
                $error = true;
                $errorMessage = 'La acción solicitada no coincide con la autorizada por el token';
                logAction("Acción no coincide: solicitada={$action}, token={$tokenInfo['action']}", 'PFMAILACTION');
            }
        }
    } catch (Exception $e) {
        // 6.5. Manejar excepciones en la validación
        $error = true;
        $errorMessage = 'Error al validar el token: ' . $e->getMessage();
        logAction("Excepción: {$e->getMessage()}", 'PFMAILACTION');
    }
}

// 7. Si todo está correcto, procesamos la acción
if (!$error) {
    try {
        // 7.1. Registrar inicio del procesamiento de la acción
        logAction("Procesando acción {$action} para orden {$tokenInfo['order_id']} por usuario {$tokenInfo['user_id']}", 'PFMAILACTION');
        
        // 7.2. Establecer una cookie para prevenir múltiples envíos
        setcookie($actionKey, "1", time() + 3600, "/", "", true, true);
        
        // 7.3. Ejecutar la acción según el parámetro recibido
        if ($action === 'approve' || $action === 'reject') {
            // 7.3.1. Procesar la acción usando el método público processAction
            $result = $mailAction->processAction($token, $action);
            if ($result && $result['success']) {
                // 7.3.2. Registrar acción exitosa
                logAction("{$action} exitoso", 'PFMAILACTION');
                showSuccess($result['message'], isset($result['additionalInfo']) ? $result['additionalInfo'] : '');
            } else {
                // 7.3.3. Registrar error en la acción
                logAction("Error en {$action}: {$result['message']}", 'PFMAILACTION');
                showError($result['message']);
            }
        } else {
            // 7.3.4. Manejar acción desconocida (caso que no debería ocurrir por la validación previa)
            logAction("Acción desconocida: {$action}", 'PFMAILACTION');
            showError('Acción desconocida');
        }
    } catch (Exception $e) {
        // 7.4. Manejar excepciones durante el procesamiento
        logAction("Excepción procesando acción: {$e->getMessage()}", 'PFMAILACTION');
        showError('Error al procesar la acción: ' . $e->getMessage());
    }
} else {
    // 8. Si hubo un error en la validación, mostrar mensaje
    logAction("Error final: {$errorMessage}", 'PFMAILACTION');
    showError($errorMessage);
}
?>