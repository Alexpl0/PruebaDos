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
            
            // Obtener el estado actual de la orden
            $getCurrentSql = "SELECT PFA.act_approv, PF.required_auth_level, PF.status_id
                              FROM PremiumFreightApprovals PFA 
                              JOIN PremiumFreight PF ON PFA.premium_freight_id = PF.id
                              WHERE PFA.premium_freight_id = ?";
            
            $getCurrentStmt = $this->db->prepare($getCurrentSql);
            $getCurrentStmt->bind_param("i", $orderId);
            $getCurrentStmt->execute();
            $currentResult = $getCurrentStmt->get_result();
            
            if ($currentResult->num_rows > 0) {
                $currentData = $currentResult->fetch_assoc();
                $currentApproval = (int)$currentData['act_approv'];
                $requiredLevel = (int)$currentData['required_auth_level'];
                $currentStatus = (int)$currentData['status_id'];
                
                // Verificar si ya está completamente aprobada
                if ($currentApproval >= $requiredLevel) {
                    return [
                        'success' => true,
                        'message' => "La orden #{$orderId} ya está completamente aprobada."
                    ];
                }
                
                // Verificar si fue rechazada
                if ($currentApproval == 99) {
                    return [
                        'success' => false,
                        'message' => "La orden #{$orderId} fue rechazada previamente y no puede ser aprobada."
                    ];
                }
                
                // Obtener el authorization_level del usuario que aprueba
                $getUserLevelSql = "SELECT authorization_level FROM User WHERE id = ?";
                $getUserLevelStmt = $this->db->prepare($getUserLevelSql);
                $getUserLevelStmt->bind_param("i", $userId);
                $getUserLevelStmt->execute();
                $userLevelResult = $getUserLevelStmt->get_result();
                
                if ($userLevelResult->num_rows === 0) {
                    throw new Exception("Usuario aprobador no encontrado");
                }
                
                $userAuthLevel = (int)$userLevelResult->fetch_assoc()['authorization_level'];
                
                // El nuevo nivel de aprobación será igual al authorization_level del usuario que aprueba
                $newApprovalLevel = $userAuthLevel;
                
                // Verificar si con este nuevo nivel estará completamente aprobada
                $willBeFullyApproved = ($newApprovalLevel >= $requiredLevel);
                
                // Actualizar act_approv con el authorization_level del aprobador
                $updateSql = "UPDATE PremiumFreightApprovals 
                             SET act_approv = ?, approval_date = NOW(), user_id = ? 
                             WHERE premium_freight_id = ?";
                $updateStmt = $this->db->prepare($updateSql);
                $updateStmt->bind_param("iii", $newApprovalLevel, $userId, $orderId);
                
                if (!$updateStmt->execute()) {
                    throw new Exception("Error al actualizar la aprobación: " . $updateStmt->error);
                }
                
                // Determinar el nuevo status_id
                $newStatusId = $willBeFullyApproved ? 3 : 2; // 3 = Completamente aprobado, 2 = En proceso
                
                // Actualizar el status_id si es necesario
                if ($currentStatus != $newStatusId) {
                    $statusSql = "UPDATE PremiumFreight SET status_id = ? WHERE id = ?";
                    $statusStmt = $this->db->prepare($statusSql);
                    $statusStmt->bind_param("ii", $newStatusId, $orderId);
                    $statusStmt->execute();
                }
                
                // Enviar notificaciones según el estado final
                try {
                    $mailer = new PFMailer();
                    
                    if ($willBeFullyApproved) {
                        // Orden completamente aprobada - notificar al creador
                        logAction("Enviando notificación de aprobación completa al creador de la orden #{$orderId}", 'APPROVEORDER');
                        $mailer->sendStatusNotification($orderId, 'approved');
                    } else {
                        // Orden necesita más aprobaciones - notificar al siguiente aprobador
                        logAction("Enviando notificación al siguiente aprobador para la orden #{$orderId}", 'APPROVEORDER');
                        $mailer->sendApprovalNotification($orderId);
                    }
                } catch (Exception $e) {
                    logAction("Error enviando notificaciones: " . $e->getMessage(), 'APPROVEORDER');
                    // No fallar la aprobación si hay error en el envío de correos
                }
                
            } else {
                // No existe registro de aprobación, crear nuevo
                $getUserLevelSql = "SELECT authorization_level FROM User WHERE id = ?";
                $getUserLevelStmt = $this->db->prepare($getUserLevelSql);
                $getUserLevelStmt->bind_param("i", $userId);
                $getUserLevelStmt->execute();
                $userLevelResult = $getUserLevelStmt->get_result();
                
                if ($userLevelResult->num_rows === 0) {
                    throw new Exception("Usuario aprobador no encontrado");
                }
                
                $userAuthLevel = (int)$userLevelResult->fetch_assoc()['authorization_level'];
                
                // Obtener required_auth_level
                $getRequiredSql = "SELECT required_auth_level FROM PremiumFreight WHERE id = ?";
                $getRequiredStmt = $this->db->prepare($getRequiredSql);
                $getRequiredStmt->bind_param("i", $orderId);
                $getRequiredStmt->execute();
                $requiredResult = $getRequiredStmt->get_result();
                $requiredLevel = (int)$requiredResult->fetch_assoc()['required_auth_level'];
                
                // Crear registro con el authorization_level del usuario
                $insertSql = "INSERT INTO PremiumFreightApprovals (premium_freight_id, act_approv, user_id, approval_date) 
                             VALUES (?, ?, ?, NOW())";
                $insertStmt = $this->db->prepare($insertSql);
                $insertStmt->bind_param("iii", $orderId, $userAuthLevel, $userId);
                $insertStmt->execute();
                
                // Determinar si está completamente aprobada
                $willBeFullyApproved = ($userAuthLevel >= $requiredLevel);
                $newStatusId = $willBeFullyApproved ? 3 : 2;
                
                // Actualizar status_id
                $statusSql = "UPDATE PremiumFreight SET status_id = ? WHERE id = ?";
                $statusStmt = $this->db->prepare($statusSql);
                $statusStmt->bind_param("ii", $newStatusId, $orderId);
                $statusStmt->execute();
                
                // Enviar notificaciones
                try {
                    $mailer = new PFMailer();
                    
                    if ($willBeFullyApproved) {
                        $mailer->sendStatusNotification($orderId, 'approved');
                    } else {
                        $mailer->sendApprovalNotification($orderId);
                    }
                } catch (Exception $e) {
                    logAction("Error enviando notificaciones: " . $e->getMessage(), 'APPROVEORDER');
                }
            }
            
            return [
                'success' => true,
                'message' => "La orden #{$orderId} ha sido aprobada exitosamente."
            ];
            
        } catch (Exception $e) {
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
            
            // Actualizar status_id a rechazado (4) en PremiumFreight
            $updateSql = "UPDATE PremiumFreight SET status_id = 4 WHERE id = ?";
            $updateStmt = $this->db->prepare($updateSql);
            $updateStmt->bind_param("i", $orderId);
            $updateStmt->execute();
            
            // Actualizar act_approv a 99 (rechazado) en PremiumFreightApprovals
            $rejectSql = "UPDATE PremiumFreightApprovals SET act_approv = 99, 
                          approval_date = NOW(), user_id = ? WHERE premium_freight_id = ?";
            $rejectStmt = $this->db->prepare($rejectSql);
            $rejectStmt->bind_param("ii", $userId, $orderId);
            $rejectStmt->execute();
            
            // Obtener información del usuario que rechaza para la notificación
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
                }
                
                // Enviar notificación de rechazo al creador
                $mailer->sendStatusNotification($orderId, 'rejected', $rejectorInfo);
                logAction("Notificación de rechazo enviada al creador de la orden #{$orderId}", 'REJECTORDER');
            } catch (Exception $e) {
                logAction("Error enviando notificación de rechazo: " . $e->getMessage(), 'REJECTORDER');
            }
            
            return [
                'success' => true,
                'message' => "La orden #{$orderId} ha sido rechazada exitosamente."
            ];
            
        } catch (Exception $e) {
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
            
            $sql = "SELECT order_id, user_id, action, created_at, is_used, used_at, used_at 
                    FROM EmailActionTokens 
                    WHERE token = ?";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bind_param("s", $token);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                logAction("Token no encontrado: {$token}", 'VALIDATETOKEN');
                return false;
            }
            
            $tokenInfo = $result->fetch_assoc();
            
            // Verificar expiración (si tienes campo used_at)
            if (isset($tokenInfo['used_at']) && strtotime($tokenInfo['used_at']) < time()) {
                logAction("Token expirado: {$token}", 'VALIDATETOKEN');
                return false;
            }
            
            // Si el token ya fue usado, logearlo pero RETORNAR LA INFO (no false)
            if ($tokenInfo['is_used'] == 1) {
                logAction("Token ya utilizado: {$token}", 'VALIDATETOKEN');
                return $tokenInfo; // CAMBIO CLAVE: retornar info en lugar de false
            }
            
            logAction("Token válido encontrado: Order ID {$tokenInfo['order_id']}, Action: {$tokenInfo['action']}", 'VALIDATETOKEN');
            return $tokenInfo;
            
        } catch (Exception $e) {
            logAction("Error validando token: " . $e->getMessage(), 'VALIDATETOKEN');
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
            
            // NO validar el token aquí, ya se validó en el archivo principal
            // Obtener la información del token directamente
            $sql = "SELECT token, user_id, action, order_ids, created_at, is_used 
                    FROM EmailBulkActionTokens 
                    WHERE token = ? AND is_used = 0 
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
                logAction("Token no encontrado o ya usado en processBulkAction: {$token}", 'PROCESSBULKACTION');
                return [
                    'success' => false,
                    'message' => 'Token no válido o ya utilizado'
                ];
            }
            
            $tokenInfo = $result->fetch_assoc();
            
            if ($tokenInfo['action'] !== $action) {
                logAction("Acción no coincide - Token: {$tokenInfo['action']}, Solicitada: {$action}", 'PROCESSBULKACTION');
                return [
                    'success' => false,
                    'message' => 'La acción solicitada no coincide con el token'
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
                logAction("Procesando orden #{$orderId}", 'PROCESSBULKACTION');
                
                $result = ($action === 'approve') 
                    ? $this->approveOrder($orderId, $userId)
                    : $this->rejectOrder($orderId, $userId);
                
                if ($result['success']) {
                    $successful++;
                    logAction("Orden #{$orderId} procesada exitosamente", 'PROCESSBULKACTION');
                } else {
                    $failed++;
                    $errors[] = "Error en orden #{$orderId}: " . $result['message'];
                    logAction("Error procesando orden #{$orderId}: " . $result['message'], 'PROCESSBULKACTION');
                }
            }
            
            // Solo si hubo al menos una orden procesada exitosamente, marcar el token como usado
            if ($successful > 0) {
                if (!$this->markBulkTokenAsUsed($token)) {
                    logAction("Error marcando token en bloque como usado: {$token}", 'PROCESSBULKACTION');
                    // No fallar la operación por esto, solo registrar
                } else {
                    logAction("Token en bloque marcado como usado", 'PROCESSBULKACTION');
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
                'message' => 'Error procesando acciones en bloque: ' . $e->getMessage(),
                'details' => ['errors' => [$e->getMessage()]]
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
            $sql = "SELECT PF.status_id, PFA.act_approv, PF.required_auth_level
                    FROM PremiumFreight PF 
                    LEFT JOIN PremiumFreightApprovals PFA ON PF.id = PFA.premium_freight_id 
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