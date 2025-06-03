<?php
/**
 * PFmailAction.php - Procesa acciones de email para Premium Freight
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/PFmailUtils.php';
http_response_code(200);
require_once 'PFmailer.php';

class PFMailAction {
    private $db;

    public function __construct() {
        $con = new LocalConector();
        $this->db = $con->conectar();
    }

    /**
     * Valida un token de acción en bloque por correo
     * 
     * @param string $token - Token de bloque a validar
     * @return array|false - Información del token si es válido, false en caso contrario
     */
    public function validateBulkToken($token) {
        try {
            logAction("Validando token en bloque: {$token}", 'VALIDATEBULKTOKEN');
            $sql = "SELECT token, user_id, action, order_ids, created_at, is_used 
                    FROM EmailBulkActionTokens 
                    WHERE token = ? 
                    AND created_at > DATE_SUB(NOW(), INTERVAL 72 HOUR)
                    LIMIT 1";
            $stmt = $this->db->prepare($sql);
            if (!$stmt) {
                logAction("Error al preparar consulta de token en bloque: " . $this->db->error, 'VALIDATEBULKTOKEN');
                return false;
            }
            $stmt->bind_param("s", $token);
            if (!$stmt->execute()) {
                logAction("Error al ejecutar consulta de token en bloque: " . $stmt->error, 'VALIDATEBULKTOKEN');
                return false;
            }
            $result = $stmt->get_result();
            if ($result->num_rows === 0) {
                logAction("Token en bloque no encontrado o expirado: {$token}", 'VALIDATEBULKTOKEN');
                return false;
            }
            $tokenInfo = $result->fetch_assoc();
            if ($tokenInfo['is_used'] == 1) {
                logAction("Token en bloque ya utilizado: {$token}", 'VALIDATEBULKTOKEN');
                return [
                    'is_used' => true,
                    'token' => $token,
                    'action' => $tokenInfo['action']
                ];
            }
            $orderIds = json_decode($tokenInfo['order_ids'], true);
            if (!is_array($orderIds) || empty($orderIds)) {
                logAction("Error decodificando order_ids o array vacío para token: {$token}", 'VALIDATEBULKTOKEN');
                return false;
            }
            $tokenInfo['decoded_order_ids'] = $orderIds;
            $tokenInfo['total_orders'] = count($orderIds);
            logAction("Token en bloque válido encontrado: User ID {$tokenInfo['user_id']}, Action: {$tokenInfo['action']}, Órdenes: " . count($orderIds), 'VALIDATEBULKTOKEN');
            return $tokenInfo;
        } catch (Exception $e) {
            logAction("Error en validateBulkToken: " . $e->getMessage(), 'VALIDATEBULKTOKEN');
            return false;
        }
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
            logAction("Iniciando processAction para token={$token}, acción={$action}", 'PROCESSACTION');
            $this->db->begin_transaction();
            
            // 1. Obtener datos del token (ya validado previamente)
            $sql = "SELECT * FROM EmailActionTokens WHERE token = ? FOR UPDATE";
            $stmt = $this->db->prepare($sql);
            $stmt->bind_param("s", $token);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                $this->db->rollback();
                return [
                    'success' => false,
                    'message' => 'Token no encontrado.'
                ];
            }
            
            $tokenData = $result->fetch_assoc();
            
            // 2. Validar los datos del token
            $orderId = $tokenData['order_id'];
            $userId = $tokenData['user_id'];
            $tokenAction = $tokenData['action'];
            
            if ($action !== $tokenAction) {
                $this->db->rollback();
                return [
                    'success' => false,
                    'message' => "Acción no coincide. Token es para '{$tokenAction}', se recibió '{$action}'."
                ];
            }
            
            // 3. Procesar la acción
            $result = ($action === 'approve') 
                ? $this->approveOrder($orderId, $userId) 
                : $this->rejectOrder($orderId, $userId);
            
            // 4. Solo si la acción fue exitosa, marcar el token como usado
            if ($result['success']) {
                $this->markTokenAsUsed($token);
                $this->db->commit();
                logAction("Acción {$action} completada exitosamente para orden #{$orderId} y token marcado como usado", 'PROCESSACTION');
            } else {
                $this->db->rollback();
                logAction("Error en acción {$action}: {$result['message']}", 'PROCESSACTION');
            }
            
            return $result;
            
        } catch (Exception $e) {
            $this->db->rollback();
            logAction("Excepción en processAction: " . $e->getMessage(), 'PROCESSACTION');
            return [
                'success' => false,
                'message' => 'Error interno del sistema: ' . $e->getMessage()
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
            logAction("Aprobando orden #{$orderId} por usuario #{$userId}", 'APPROVEORDER');
            $getCurrentSql = "SELECT PFA.act_approv, PF.required_auth_level, PF.status_id
                              FROM PremiumFreightApprovals PFA 
                              JOIN PremiumFreight PF ON PFA.premium_freight_id = PF.id
                              WHERE PFA.premium_freight_id = ?";
            
            $getCurrentStmt = $this->db->prepare($getCurrentSql);
            if (!$getCurrentStmt) {
                logAction("Error preparando consulta para obtener valores actuales: " . $this->db->error, 'APPROVEORDER');
                throw new Exception("Error al preparar la consulta para obtener valores actuales: " . $this->db->error);
            }
            $getCurrentStmt->bind_param("i", $orderId);
            
            if (!$getCurrentStmt->execute()) {
                logAction("Error ejecutando consulta para obtener valores actuales: " . $getCurrentStmt->error, 'APPROVEORDER');
                throw new Exception("Error al ejecutar la consulta para obtener valores actuales: " . $getCurrentStmt->error);
            }
            
            $currentResult = $getCurrentStmt->get_result();
            
            if ($currentResult->num_rows > 0) {
                $currentData = $currentResult->fetch_assoc();
                $currentApproval = (int)$currentData['act_approv'];
                $requiredLevel = (int)$currentData['required_auth_level'];
                $currentStatus = (int)$currentData['status_id'];
                
                logAction("Datos actuales - Aprobación: {$currentApproval}, Requerido: {$requiredLevel}, Status: {$currentStatus}", 'APPROVEORDER');
                
                if ($currentApproval >= $requiredLevel) {
                    logAction("La orden ya está completamente aprobada (nivel $currentApproval, requerido $requiredLevel)", 'APPROVEORDER');
                    return [
                        'success' => true,
                        'message' => "La orden #{$orderId} ya está completamente aprobada."
                    ];
                }
                
                $newApprovalLevel = $currentApproval + 1;
                logAction("Incrementando nivel de aprobación de {$currentApproval} a {$newApprovalLevel}", 'APPROVEORDER');
                
                $updateSql = "UPDATE PremiumFreightApprovals SET act_approv = ?, approval_date = NOW() WHERE premium_freight_id = ?";
                $updateStmt = $this->db->prepare($updateSql);
                if (!$updateStmt) {
                    logAction("Error preparando consulta de aprobación: " . $this->db->error, 'APPROVEORDER');
                    throw new Exception("Error al preparar la consulta de aprobación: " . $this->db->error);
                }
                $updateStmt->bind_param("ii", $newApprovalLevel, $orderId);
                
                if (!$updateStmt->execute()) {
                    logAction("Error ejecutando consulta de aprobación: " . $updateStmt->error, 'APPROVEORDER');
                    throw new Exception("Error al ejecutar la consulta de aprobación: " . $updateStmt->error);
                }
                
                $affectedRows = $updateStmt->affected_rows;
                logAction("Filas actualizadas en PremiumFreightApprovals: $affectedRows, nuevo nivel: $newApprovalLevel", 'APPROVEORDER');
                
                $fullyApproved = ($newApprovalLevel >= $requiredLevel);
                
                $newStatusId = 2; // En proceso por defecto
                
                if ($fullyApproved) {
                    $newStatusId = 3; // Completamente aprobado
                    logAction("Orden alcanzó nivel completo de aprobación. Status actualizado a 'aprobado' (3)", 'APPROVEORDER');
                } else {
                    logAction("Orden en proceso de aprobación. Status actualizado a 'en proceso' (2)", 'APPROVEORDER');
                }
                
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
                logAction("No existe registro de aprobación, creando nuevo con nivel 1", 'APPROVEORDER');
                
                $insertSql = "INSERT INTO PremiumFreightApprovals (premium_freight_id, act_approv, user_id, approval_date) 
                             VALUES (?, 1, ?, NOW())";
                $insertStmt = $this->db->prepare($insertSql);
                $insertStmt->bind_param("ii", $orderId, $userId);
                
                if (!$insertStmt->execute()) {
                    logAction("Error insertando aprobación: " . $insertStmt->error, 'APPROVEORDER');
                    throw new Exception("Error al insertar la aprobación: " . $insertStmt->error);
                }
                
                logAction("Creado nuevo registro de aprobación con nivel 1", 'APPROVEORDER');
                
                $statusSql = "UPDATE PremiumFreight SET status_id = 2 WHERE id = ?";
                $statusStmt = $this->db->prepare($statusSql);
                $statusStmt->bind_param("i", $orderId);
                
                if (!$statusStmt->execute()) {
                    logAction("Error actualizando status_id inicial en PremiumFreight: " . $statusStmt->error, 'APPROVEORDER');
                    throw new Exception("Error al actualizar status_id inicial en PremiumFreight: " . $statusStmt->error);
                }
                
                logAction("Status inicial actualizado a 'en proceso' (2)", 'APPROVEORDER');
            }
            
            $isFullyApproved = false;
            
            if ($currentResult->num_rows > 0) {
                $isFullyApproved = ($newApprovalLevel >= $requiredLevel);
            }
            
            try {
                $mailer = new PFMailer();
                
                if ($isFullyApproved) {
                    $mailer->sendStatusNotification($orderId, 'approved');
                    logAction("Notificación de aprobación completa enviada al creador de la orden #{$orderId}", 'APPROVEORDER');
                } else {
                    $mailer->sendApprovalNotification($orderId);
                    logAction("Notificación enviada al siguiente aprobador para la orden #{$orderId}", 'APPROVEORDER');
                }
            } catch (Exception $e) {
                logAction("Error enviando notificaciones: " . $e->getMessage(), 'APPROVEORDER');
            }
            
            logAction("Orden #{$orderId} aprobada exitosamente", 'APPROVEORDER');
            
            return [
                'success' => true,
                'message' => "La orden #{$orderId} ha sido aprobada exitosamente."
            ];
        } catch (Exception $e) {
            logAction("Error aprobando orden: " . $e->getMessage(), 'APPROVEORDER');
            
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
            logAction("Rechazando orden #{$orderId} por usuario #{$userId}", 'REJECTORDER');
            
            $updateSql = "UPDATE PremiumFreight SET status_id = 4 WHERE id = ?";
            
            $updateStmt = $this->db->prepare($updateSql);
            
            if (!$updateStmt) {
                logAction("Error preparando consulta de rechazo: " . $this->db->error, 'REJECTORDER');
                throw new Exception("Error al preparar la consulta de rechazo: " . $this->db->error);
            }
            
            $updateStmt->bind_param("i", $orderId);
            
            if (!$updateStmt->execute()) {
                logAction("Error ejecutando consulta de rechazo: " . $updateStmt->error, 'REJECTORDER');
                throw new Exception("Error al ejecutar la consulta de rechazo: " . $updateStmt->error);
            }
            
            $affectedRows = $updateStmt->affected_rows;
            logAction("Filas actualizadas en PremiumFreight: $affectedRows", 'REJECTORDER');
            
            if ($affectedRows === 0) {
                $checkSql = "SELECT COUNT(*) as total FROM PremiumFreight WHERE id = ?";
                $checkStmt = $this->db->prepare($checkSql);
                $checkStmt->bind_param("i", $orderId);
                $checkStmt->execute();
                $checkResult = $checkStmt->get_result();
                $totalOrders = $checkResult->fetch_assoc()['total'];
                
                if ($totalOrders === 0) {
                    logAction("La orden #{$orderId} no existe", 'REJECTORDER');
                    throw new Exception("La orden #{$orderId} no existe en el sistema");
                } else {
                    $statusSql = "SELECT status_id FROM PremiumFreight WHERE id = ?";
                    $statusStmt = $this->db->prepare($statusSql);
                    $statusStmt->bind_param("i", $orderId);
                    $statusStmt->execute();
                    $statusResult = $statusStmt->get_result();
                    $currentStatus = $statusResult->fetch_assoc()['status_id'];
                    
                    logAction("La orden existe pero no se actualizó. Estado actual: $currentStatus", 'REJECTORDER');
                    
                    if ($currentStatus == 4) {
                        return [
                            'success' => true,
                            'message' => "La orden #{$orderId} ya estaba marcada como rechazada."
                        ];
                    }
                }
            }
            
            $rejectSql = "UPDATE PremiumFreightApprovals SET act_approv = 99, 
                          approval_date = NOW(), user_id = ? WHERE premium_freight_id = ?";
            $rejectStmt = $this->db->prepare($rejectSql);
            $rejectStmt->bind_param("ii", $userId, $orderId);
            $rejectStmt->execute();
            
            logAction("Registro de aprobación actualizado con código de rechazo (99)", 'REJECTORDER');
            
            try {
                $mailer = new PFMailer();
                
                $userSql = "SELECT id, name, authorization_level FROM User WHERE id = ?";
                $userStmt = $this->db->prepare($userSql);
                $userStmt->bind_param("i", $userId);
                $userStmt->execute();
                $userResult = $userStmt->get_result();
                $rejectorInfo = null;
                
                if ($userResult->num_rows > 0) {
                    $userData = $userResult->fetch_assoc();
                    $rejectorInfo = [
                        'id' => $userData['id'],
                        'name' => $userData['name'],
                        'level' => $userData['authorization_level']
                    ];
                    logAction("Información del usuario que rechaza: " . $userData['name'] . " (nivel " . $userData['authorization_level'] . ")", 'REJECTORDER');
                }
                
                $mailer->sendStatusNotification($orderId, 'rejected', $rejectorInfo);
                logAction("Notificación de rechazo enviada al creador de la orden #{$orderId}", 'REJECTORDER');
            } catch (Exception $e) {
                logAction("Error enviando notificación de rechazo: " . $e->getMessage(), 'REJECTORDER');
            }
            
            logAction("Orden #{$orderId} rechazada exitosamente", 'REJECTORDER');
            
            return [
                'success' => true,
                'message' => "La orden #{$orderId} ha sido rechazada."
            ];
        } catch (Exception $e) {
            logAction("Error rechazando orden: " . $e->getMessage(), 'REJECTORDER');
            
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
        
        $sql = "UPDATE EmailActionTokens SET is_used = 1, used_at = NOW() WHERE token = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->bind_param("s", $token);
        $result = $stmt->execute();
        
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
            logAction("Validando token: {$token}", 'VALIDATETOKEN');
            $sql = "SELECT token, order_id, user_id, action, created_at, is_used 
                    FROM EmailActionTokens 
                    WHERE token = ? 
                    AND created_at > DATE_SUB(NOW(), INTERVAL 72 HOUR)
                    LIMIT 1";
            $stmt = $this->db->prepare($sql);
            if (!$stmt) {
                logAction("Error al preparar consulta de token: " . $this->db->error, 'VALIDATETOKEN');
                return false;
            }
            $stmt->bind_param("s", $token);
            if (!$stmt->execute()) {
                logAction("Error al ejecutar consulta de token: " . $stmt->error, 'VALIDATETOKEN');
                return false;
            }
            $result = $stmt->get_result();
            if ($result->num_rows === 0) {
                logAction("Token no encontrado o expirado: {$token}", 'VALIDATETOKEN');
                return false;
            }
            $tokenInfo = $result->fetch_assoc();
            if ($tokenInfo['is_used'] == 1) {
                logAction("Token ya utilizado: {$token}", 'VALIDATETOKEN');
                return [
                    'is_used' => true,
                    'token' => $token,
                    'action' => $tokenInfo['action'],
                    'order_id' => $tokenInfo['order_id']
                ];
            }
            logAction("Token válido encontrado: Order ID {$tokenInfo['order_id']}, Action: {$tokenInfo['action']}", 'VALIDATETOKEN');
            return $tokenInfo;
        } catch (Exception $e) {
            logAction("Error en validateToken: " . $e->getMessage(), 'VALIDATETOKEN');
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
        
        $sql = "UPDATE EmailBulkActionTokens SET is_used = 1, used_at = NOW() WHERE token = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->bind_param("s", $token);
        $result = $stmt->execute();
        
        logAction("Resultado de marcar token en bloque: " . ($result ? "exitoso" : "fallido: " . $stmt->error), 'MARKBULKTOKENUSED');
        
        return $result;
    }
    
    /**
     * Procesa acciones en bloque (aprobar/rechazar múltiples órdenes)
     * 
     * @param string $token Token de acción en bloque
     * @param string $action Tipo de acción (approve/reject)
     * @return array Resultado del procesamiento
     */
    public function processBulkAction($token, $action) {
        try {
            logAction("Iniciando processBulkAction para token={$token}, acción={$action}", 'PROCESSBULKACTION');
            
            // Obtener la información del token directamente
            $sql = "SELECT token, user_id, action, order_ids, created_at, is_used 
                    FROM EmailBulkActionTokens 
                    WHERE token = ?
                    LIMIT 1";
            $stmt = $this->db->prepare($sql);
            if (!$stmt) {
                throw new Exception("Error preparando consulta: " . $this->db->error);
            }
            $stmt->bind_param("s", $token);
            if (!$stmt->execute()) {
                throw new Exception("Error ejecutando consulta: " . $stmt->error);
            }
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                return [
                    'success' => false,
                    'message' => 'Token de acción en bloque no encontrado.'
                ];
            }
            
            $tokenInfo = $result->fetch_assoc();
            
            if ($tokenInfo['action'] !== $action) {
                return [
                    'success' => false,
                    'message' => "Acción no coincide. Token es para '{$tokenInfo['action']}', se recibió '{$action}'."
                ];
            }
            
            $this->db->begin_transaction();
            logAction("Transacción iniciada", 'PROCESSBULKACTION');
            
            $orderIds = json_decode($tokenInfo['order_ids'], true);
            $userId = $tokenInfo['user_id'];
            
            logAction("Token en bloque válido - User ID: {$userId}, Órdenes a procesar: " . count($orderIds), 'PROCESSBULKACTION');
            
            // Procesar todas las órdenes ANTES de marcar el token como usado
            $successful = 0;
            $failed = 0;
            $errors = [];
            
            foreach ($orderIds as $orderId) {
                try {
                    $result = ($action === 'approve') ? 
                        $this->approveOrder($orderId, $userId) : 
                        $this->rejectOrder($orderId, $userId);
                    
                    if ($result['success']) {
                        $successful++;
                        logAction("Orden #{$orderId} procesada exitosamente", 'PROCESSBULKACTION');
                    } else {
                        $failed++;
                        $errors[] = "Orden #{$orderId}: " . $result['message'];
                        logAction("Error procesando orden #{$orderId}: " . $result['message'], 'PROCESSBULKACTION');
                    }
                } catch (Exception $e) {
                    $failed++;
                    $errors[] = "Orden #{$orderId}: " . $e->getMessage();
                    logAction("Excepción procesando orden #{$orderId}: " . $e->getMessage(), 'PROCESSBULKACTION');
                }
            }
            
            // Solo si hubo al menos una orden procesada exitosamente, marcar el token como usado
            if ($successful > 0) {
                if ($this->markBulkTokenAsUsed($token)) {
                    logAction("Token en bloque marcado como usado exitosamente", 'PROCESSBULKACTION');
                } else {
                    logAction("Error marcando token en bloque como usado", 'PROCESSBULKACTION');
                }
            }
            
            $this->db->commit();
            logAction("Transacción confirmada", 'PROCESSBULKACTION');
            
            $total = $successful + $failed;
            $message = "Procesamiento completado: {$successful} exitosas, {$failed} fallidas de {$total} órdenes";
            
            logAction("Resultado final - Total: {$total}, Exitosas: {$successful}, Fallidas: {$failed}", 'PROCESSBULKACTION');
            
            return [
                'success' => true,
                'message' => $message,
                'details' => [
                    'total' => $total,
                    'successful' => $successful,
                    'failed' => $failed,
                    'errors' => $errors
                ]
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            logAction("Excepción en processBulkAction: " . $e->getMessage(), 'PROCESSBULKACTION');
            return [
                'success' => false,
                'message' => 'Error interno del sistema: ' . $e->getMessage(),
                'details' => [
                    'total' => 0,
                    'successful' => 0,
                    'failed' => 0,
                    'errors' => [$e->getMessage()]
                ]
            ];
        }
    }

    /**
     * Obtiene el estado actual de una orden
     * 
     * @param int $orderId ID de la orden
     * @return array|false Información del estado de la orden
     */
    public function getOrderStatus($orderId) {
        try {
            $sql = "SELECT PF.status_id, PF.area, PFA.act_approv, S.status_name,
                       U.name as creator_name, P.planta as planta_name
                FROM PremiumFreight PF 
                LEFT JOIN PremiumFreightApprovals PFA ON PF.id = PFA.premium_freight_id 
                LEFT JOIN Status S ON PF.status_id = S.id
                LEFT JOIN User U ON PF.user_id = U.id
                LEFT JOIN plantas P ON PF.planta = P.id
                WHERE PF.id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->bind_param("i", $orderId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            return $result->fetch_assoc();
        }
        return false;
        } catch (Exception $e) {
            logAction("Error en getOrderStatus: " . $e->getMessage(), 'GETORDERSTATUS');
            return false;
        }
    }
}
?>