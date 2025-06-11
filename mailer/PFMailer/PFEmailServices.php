<?php
/**
 * ================================================================================
 * PFEmailServices.php - Servicios de Base de Datos para Sistema de Correos
 * ================================================================================
 * 
 * Proporciona servicios de base de datos optimizados para el sistema de correos
 * de Premium Freight, incluyendo manejo de tokens, validaciones robustas y
 * operaciones de agrupación de órdenes.
 * 
 * @author      GRAMMER AG
 * @version     2.0 - Completamente refactorizado y optimizado
 * @since       2025-06-05
 * @license     Proprietary - GRAMMER AG
 */

// Dependencias requeridas
require_once 'PFDB.php';
require_once 'PFmailUtils.php';

/**
 * Clase principal para servicios de correo de Premium Freight
 * 
 * Maneja todas las operaciones de base de datos relacionadas con el sistema
 * de correos, incluyendo órdenes, aprobadores, tokens y notificaciones.
 */
class PFEmailServices {
    
    /** @var mysqli Conexión a la base de datos */
    private $db;
    
    /** @var array Cache para usuarios para evitar consultas repetidas */
    private $userCache = [];
    
    /** @var array Cache para órdenes para evitar consultas repetidas */
    private $orderCache = [];
    
    /**
     * Constructor - Inicializa la conexión a la base de datos
     * 
     * @throws Exception Si no se puede establecer la conexión
     */
    public function __construct() {
        try {
            $con = new LocalConector();
            $this->db = $con->conectar();
            
            if (!$this->db) {
                throw new Exception("No se pudo establecer conexión a la base de datos");
            }
            
            // Configurar charset para evitar problemas de codificación
            $this->db->set_charset("utf8mb4");
            
            logAction("PFEmailServices - Servicio inicializado correctamente", 'INIT');
            
        } catch (Exception $e) {
            logAction("PFEmailServices - Error en inicialización: " . $e->getMessage(), 'INIT_ERROR');
            throw $e;
        }
    }
    
    /**
     * ================================================================================
     * MÉTODOS DE CONSULTA DE ÓRDENES
     * ================================================================================
     */
    
    /**
     * Obtiene los detalles completos de una orden
     * 
     * @param int $orderId ID de la orden a consultar
     * @return array|null Datos de la orden o null si no existe
     */
    public function getOrderDetails($orderId) {
        // Validaciones de entrada
        if (empty($orderId) || !is_numeric($orderId)) {
            logAction("getOrderDetails - ID de orden inválido: " . var_export($orderId, true), 'GETORDERDETAILS');
            return null;
        }
        
        $orderId = (int)$orderId;
        
        // Verificar cache primero
        if (isset($this->orderCache[$orderId])) {
            logAction("getOrderDetails - Orden #{$orderId}: obtenida desde cache", 'GETORDERDETAILS');
            return $this->orderCache[$orderId];
        }
        
        // Consulta optimizada con LEFT JOIN para manejar órdenes sin aprobaciones
        $sql = "SELECT 
                    PF.id, 
                    PF.user_id, 
                    PF.required_auth_level, 
                    PF.cost_euros,
                    PF.date, 
                    PF.description, 
                    PF.planta, 
                    PF.status_id, 
                    PF.area,
                    COALESCE(PFA.act_approv, 0) as current_approval_level,
                    U.name as creator_name, 
                    U.plant as order_plant
                FROM PremiumFreight PF
                LEFT JOIN PremiumFreightApprovals PFA ON PF.id = PFA.premium_freight_id
                INNER JOIN User U ON PF.user_id = U.id
                WHERE PF.id = ?
                LIMIT 1";
        
        $stmt = $this->db->prepare($sql);
        if (!$stmt) {
            logAction("getOrderDetails - Error preparando consulta: " . $this->db->error, 'GETORDERDETAILS');
            return null;
        }
        
        $stmt->bind_param("i", $orderId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $orderData = $result->num_rows > 0 ? $result->fetch_assoc() : null;
        
        // Guardar en cache si se encontró
        if ($orderData) {
            $this->orderCache[$orderId] = $orderData;
        }
        
        logAction("getOrderDetails - Orden #{$orderId}: " . ($orderData ? "encontrada" : "no encontrada"), 'GETORDERDETAILS');
        
        return $orderData;
    }
    
    /**
     * Obtiene órdenes pendientes para el resumen semanal
     * 
     * @return array Lista de órdenes pendientes de aprobación
     */
    public function getPendingOrdersForWeeklySummary() {
        // Consulta optimizada para órdenes pendientes
        $sql = "SELECT 
                    PF.id, 
                    PF.user_id, 
                    PF.required_auth_level, 
                    PF.cost_euros,
                    PF.date, 
                    PF.description, 
                    PF.planta, 
                    PF.area,
                    COALESCE(PFA.act_approv, 0) as current_approval_level,
                    U.name as creator_name, 
                    U.plant as order_plant
                FROM PremiumFreight PF
                LEFT JOIN PremiumFreightApprovals PFA ON PF.id = PFA.premium_freight_id
                INNER JOIN User U ON PF.user_id = U.id
                WHERE PF.status_id IN (1, 2) 
                AND (
                    PFA.act_approv IS NULL OR 
                    (PFA.act_approv < PF.required_auth_level AND PFA.act_approv != 99)
                )
                ORDER BY PF.date DESC";
        
        $stmt = $this->db->prepare($sql);
        if (!$stmt) {
            logAction("getPendingOrdersForWeeklySummary - Error preparando consulta: " . $this->db->error, 'GETPENDINGORDERS');
            return [];
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        $orders = $result->fetch_all(MYSQLI_ASSOC);
        
        logAction("getPendingOrdersForWeeklySummary - Encontradas " . count($orders) . " órdenes pendientes", 'GETPENDINGORDERS');
        
        return $orders;
    }
    
    /**
     * Obtiene los próximos aprobadores para una orden específica
     * 
     * @param int $orderId ID de la orden
     * @return array Lista de aprobadores para el siguiente nivel
     */
    public function getNextApprovers($orderId) {
        // Validaciones de entrada
        if (empty($orderId) || !is_numeric($orderId)) {
            logAction("getNextApprovers - ID de orden inválido: " . var_export($orderId, true), 'GETNEXTAPPROVERS');
            return [];
        }
        
        $orderId = (int)$orderId;
        
        // Obtener información de la orden y su estado actual
        $sql = "SELECT 
                    PF.user_id, 
                    PF.required_auth_level, 
                    COALESCE(PFA.act_approv, 0) as current_approval_level,
                    U.plant as order_plant
                FROM PremiumFreight PF
                LEFT JOIN PremiumFreightApprovals PFA ON PF.id = PFA.premium_freight_id
                INNER JOIN User U ON PF.user_id = U.id
                WHERE PF.id = ?
                LIMIT 1";
        
        $stmt = $this->db->prepare($sql);
        if (!$stmt) {
            logAction("getNextApprovers - Error preparando consulta: " . $this->db->error, 'GETNEXTAPPROVERS');
            return [];
        }
        
        $stmt->bind_param("i", $orderId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            logAction("getNextApprovers - Orden #{$orderId} no encontrada", 'GETNEXTAPPROVERS');
            return [];
        }
        
        $orderInfo = $result->fetch_assoc();
        $currentApprovalLevel = (int)$orderInfo['current_approval_level'];
        $requiredAuthLevel = (int)$orderInfo['required_auth_level'];
        $orderPlantInt = (int)$orderInfo['order_plant'];
        
        logAction("getNextApprovers - Orden #{$orderId}: current={$currentApprovalLevel}, required={$requiredAuthLevel}, plant={$orderPlantInt}", 'GETNEXTAPPROVERS');
        
        // Validar estado de la orden
        if ($currentApprovalLevel >= $requiredAuthLevel) {
            logAction("getNextApprovers - Orden #{$orderId} ya completamente aprobada", 'GETNEXTAPPROVERS');
            return [];
        }
        
        if ($currentApprovalLevel == 99) {
            logAction("getNextApprovers - Orden #{$orderId} fue rechazada", 'GETNEXTAPPROVERS');
            return [];
        }
        
        // Calcular siguiente nivel de autorización
        $nextAuthLevel = $currentApprovalLevel + 1;
        
        // ✅ CORREGIDO: Buscar aprobadores SIN filtro de auto-aprobación
        $approversSql = "SELECT 
                            id, 
                            name, 
                            email, 
                            authorization_level, 
                            plant 
                        FROM User 
                        WHERE authorization_level = ? 
                        AND (CAST(plant AS UNSIGNED) = ? OR plant IS NULL)
                        ORDER BY 
                            CASE WHEN CAST(plant AS UNSIGNED) = ? THEN 0 ELSE 1 END, -- Priorizar misma planta
                            name";
        
        $approversStmt = $this->db->prepare($approversSql);
        if (!$approversStmt) {
            logAction("getNextApprovers - Error preparando consulta de aprobadores: " . $this->db->error, 'GETNEXTAPPROVERS');
            return [];
        }
        
        logAction("getNextApprovers - Buscando aprobadores: nextAuthLevel={$nextAuthLevel}, orderPlant={$orderPlantInt} (auto-aprobación permitida)", 'GETNEXTAPPROVERS');
        
        // ✅ SOLO 3 PARÁMETROS: nivel, planta para filtro, planta para ordenamiento
        $approversStmt->bind_param("iii", $nextAuthLevel, $orderPlantInt, $orderPlantInt);
        $approversStmt->execute();
        $approversResult = $approversStmt->get_result();
        
        $approvers = $approversResult->fetch_all(MYSQLI_ASSOC);
        
        // Log detallado del resultado
        if (empty($approvers)) {
            // Debugging para entender por qué no hay aprobadores
            $debugSql = "SELECT COUNT(*) as total, 
                            GROUP_CONCAT(CONCAT(name, ' (plant:', plant, ', auth:', authorization_level, ')') SEPARATOR ', ') as users
                     FROM User 
                     WHERE authorization_level = ?";
            $debugStmt = $this->db->prepare($debugSql);
            $debugStmt->bind_param("i", $nextAuthLevel);
            $debugStmt->execute();
            $debugResult = $debugStmt->get_result();
            $debugInfo = $debugResult->fetch_assoc();
            
            logAction("getNextApprovers - DEBUG: Usuarios totales con authorization_level {$nextAuthLevel}: {$debugInfo['total']} - {$debugInfo['users']}", 'GETNEXTAPPROVERS');
            
            // Debug específico para la planta
            $plantDebugSql = "SELECT COUNT(*) as total,
                                 GROUP_CONCAT(CONCAT(name, ' (plant:', plant, ', auth:', authorization_level, ')') SEPARATOR ', ') as users
                          FROM User 
                          WHERE authorization_level = ? AND (CAST(plant AS UNSIGNED) = ? OR plant IS NULL)";
            $plantDebugStmt = $this->db->prepare($plantDebugSql);
            $plantDebugStmt->bind_param("ii", $nextAuthLevel, $orderPlantInt);
            $plantDebugStmt->execute();
            $plantDebugResult = $plantDebugStmt->get_result();
            $plantDebugInfo = $plantDebugResult->fetch_assoc();
            
            logAction("getNextApprovers - DEBUG: Para plant {$orderPlantInt}: {$plantDebugInfo['total']} usuarios - {$plantDebugInfo['users']}", 'GETNEXTAPPROVERS');
        } else {
            $approverNames = array_column($approvers, 'name');
            logAction("getNextApprovers - Aprobadores encontrados: " . implode(', ', $approverNames), 'GETNEXTAPPROVERS');
        }
        
        logAction("getNextApprovers - Encontrados " . count($approvers) . " aprobadores para nivel {$nextAuthLevel}", 'GETNEXTAPPROVERS');
        
        return $approvers;
    }
    
    /**
     * ================================================================================
     * MÉTODOS DE GESTIÓN DE USUARIOS
     * ================================================================================
     */
    
    /**
     * Obtiene información completa de un usuario
     * 
     * @param int $userId ID del usuario
     * @return array|null Datos del usuario o null si no existe
     */
    public function getUser($userId) {
        // Validaciones de entrada
        if (empty($userId) || !is_numeric($userId)) {
            logAction("getUser - ID de usuario inválido: " . var_export($userId, true), 'GETUSER');
            return null;
        }
        
        $userId = (int)$userId;
        
        // Verificar cache primero
        if (isset($this->userCache[$userId])) {
            logAction("getUser - Usuario #{$userId}: obtenido desde cache", 'GETUSER');
            return $this->userCache[$userId];
        }
        
        $sql = "SELECT 
                    id, 
                    name, 
                    email, 
                    authorization_level, 
                    plant
                FROM User 
                WHERE id = ?
                LIMIT 1";
        
        $stmt = $this->db->prepare($sql);
        if (!$stmt) {
            logAction("getUser - Error preparando consulta: " . $this->db->error, 'GETUSER');
            return null;
        }
        
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $userData = $result->num_rows > 0 ? $result->fetch_assoc() : null;
        
        // Guardar en cache si se encontró
        if ($userData) {
            $this->userCache[$userId] = $userData;
        }
        
        logAction("getUser - Usuario #{$userId}: " . ($userData ? "encontrado" : "no encontrado"), 'GETUSER');
        
        return $userData;
    }
    
    /**
     * ================================================================================
     * MÉTODOS DE GESTIÓN DE TOKENS
     * ================================================================================
     */
    
    /**
     * Genera y almacena un token de acción individual con validaciones robustas
     * 
     * @param int $orderId ID de la orden
     * @param int $userId ID del usuario aprobador
     * @param string $action Acción ('approve' o 'reject')
     * @return string|null Token generado o null en caso de error
     */
    public function generateActionToken($orderId, $userId, $action) {
        // Validaciones críticas de entrada
        if (empty($orderId) || !is_numeric($orderId)) {
            logAction("generateActionToken - ID de orden inválido: " . var_export($orderId, true), 'GENERATETOKEN');
            return null;
        }
        
        if (empty($userId) || !is_numeric($userId)) {
            logAction("generateActionToken - ID de usuario inválido: " . var_export($userId, true), 'GENERATETOKEN');
            return null;
        }
        
        if (!in_array($action, ['approve', 'reject'], true)) {
            logAction("generateActionToken - Acción inválida: " . var_export($action, true), 'GENERATETOKEN');
            return null;
        }
        
        $orderId = (int)$orderId;
        $userId = (int)$userId;
        
        // Verificar existencia de la orden
        $orderCheck = $this->getOrderDetails($orderId);
        if (!$orderCheck) {
            logAction("generateActionToken - Orden #{$orderId} no existe", 'GENERATETOKEN');
            return null;
        }
        
        // Verificar existencia del usuario
        $userCheck = $this->getUser($userId);
        if (!$userCheck) {
            logAction("generateActionToken - Usuario #{$userId} no existe", 'GENERATETOKEN');
            return null;
        }
        
        // Generar token seguro
        $token = bin2hex(random_bytes(16));
        
        // Asegurar que la tabla existe
        $this->ensureActionTokensTable();
        
        // Insertar token en la base de datos
        $sql = "INSERT INTO EmailActionTokens 
                (token, order_id, user_id, action, created_at, is_used) 
                VALUES (?, ?, ?, ?, NOW(), 0)";
        
        $stmt = $this->db->prepare($sql);
        if (!$stmt) {
            logAction("generateActionToken - Error preparando consulta: " . $this->db->error, 'GENERATETOKEN');
            return null;
        }
        
        $stmt->bind_param("siis", $token, $orderId, $userId, $action);
        
        if (!$stmt->execute()) {
            logAction("generateActionToken - Error ejecutando consulta: " . $stmt->error, 'GENERATETOKEN');
            return null;
        }
        
        logAction("generateActionToken - Token generado exitosamente: orden={$orderId}, usuario={$userId}, acción={$action}", 'GENERATETOKEN');
        
        return $token;
    }
    
    /**
     * Genera y almacena un token de acción en bloque para múltiples órdenes
     * 
     * @param int $userId ID del usuario aprobador
     * @param string $action Acción ('approve' o 'reject')
     * @param array $orderIds Array de IDs de órdenes
     * @return string|null Token bulk generado o null en caso de error
     */
    public function generateBulkActionToken($userId, $action, $orderIds) {
        // Validaciones de entrada
        if (empty($userId) || !is_numeric($userId)) {
            logAction("generateBulkActionToken - ID de usuario inválido: " . var_export($userId, true), 'GENERATEBULKTOKEN');
            return null;
        }
        
        if (!in_array($action, ['approve', 'reject'], true)) {
            logAction("generateBulkActionToken - Acción inválida: " . var_export($action, true), 'GENERATEBULKTOKEN');
            return null;
        }
        
        if (!is_array($orderIds) || empty($orderIds)) {
            logAction("generateBulkActionToken - Lista de órdenes inválida: " . var_export($orderIds, true), 'GENERATEBULKTOKEN');
            return null;
        }
        
        $userId = (int)$userId;
        
        // Validar que todas las órdenes existen y convertir a enteros
        $validOrderIds = [];
        foreach ($orderIds as $orderId) {
            if (!is_numeric($orderId)) {
                logAction("generateBulkActionToken - ID de orden no numérico: {$orderId}", 'GENERATEBULKTOKEN');
                return null;
            }
            
            $orderId = (int)$orderId;
            if (!$this->getOrderDetails($orderId)) {
                logAction("generateBulkActionToken - Orden inválida o no existe: {$orderId}", 'GENERATEBULKTOKEN');
                return null;
            }
            
            $validOrderIds[] = $orderId;
        }
        
        // Verificar que el usuario existe
        if (!$this->getUser($userId)) {
            logAction("generateBulkActionToken - Usuario #{$userId} no existe", 'GENERATEBULKTOKEN');
            return null;
        }
        
        // Generar token bulk más largo para mayor seguridad
        $token = bin2hex(random_bytes(32));
        $serializedOrderIds = json_encode($validOrderIds);
        
        // Asegurar que la tabla existe
        $this->ensureBulkTokensTable();
        
        // Insertar token bulk en la base de datos
        $sql = "INSERT INTO EmailBulkActionTokens 
                (token, order_ids, user_id, action, created_at, is_used) 
                VALUES (?, ?, ?, ?, NOW(), 0)";
        
        $stmt = $this->db->prepare($sql);
        if (!$stmt) {
            logAction("generateBulkActionToken - Error preparando consulta: " . $this->db->error, 'GENERATEBULKTOKEN');
            return null;
        }
        
        $stmt->bind_param("ssis", $token, $serializedOrderIds, $userId, $action);
        
        if (!$stmt->execute()) {
            logAction("generateBulkActionToken - Error ejecutando consulta: " . $stmt->error, 'GENERATEBULKTOKEN');
            return null;
        }
        
        logAction("generateBulkActionToken - Token bulk generado exitosamente: usuario={$userId}, acción={$action}, órdenes=" . implode(',', $validOrderIds), 'GENERATEBULKTOKEN');
        
        return $token;
    }
    
    /**
     * ================================================================================
     * MÉTODOS DE AGRUPACIÓN Y PROCESAMIENTO
     * ================================================================================
     */
    
    /**
     * Agrupa órdenes por aprobador y genera tokens bulk optimizados
     * 
     * @param array $orders Lista de órdenes a agrupar
     * @return array Órdenes agrupadas por aprobador con tokens generados
     */
    public function groupOrdersByApprover($orders) {
        if (!is_array($orders) || empty($orders)) {
            logAction("groupOrdersByApprover - Lista de órdenes vacía o inválida", 'GROUPORDERS');
            return [];
        }
        
        $groupedOrders = [];
        $processedOrders = 0;
        $skippedOrders = 0;
        
        foreach ($orders as $order) {
            // Validar estructura de la orden
            if (!$this->validateOrderStructure($order)) {
                $skippedOrders++;
                continue;
            }
            
            $currentApprovalLevel = (int)$order['current_approval_level'];
            $nextAuthLevel = $currentApprovalLevel + 1;
            $orderPlant = $order['order_plant'];
            
            // Obtener aprobadores para este nivel con consulta optimizada
            $approvers = $this->getApproversForLevel($nextAuthLevel, $orderPlant);
            
            foreach ($approvers as $approver) {
                // Inicializar grupo si no existe
                if (!isset($groupedOrders[$approver['id']])) {
                    $groupedOrders[$approver['id']] = [
                        'approver' => $approver,
                        'orders' => [],
                        'order_ids' => []
                    ];
                }
                
                // Enriquecer datos de la orden
                $enrichedOrder = $order;
                $enrichedOrder['next_auth_level'] = $nextAuthLevel;
                $enrichedOrder['approver_info'] = $approver;
                
                $groupedOrders[$approver['id']]['orders'][] = $enrichedOrder;
                $groupedOrders[$approver['id']]['order_ids'][] = (int)$order['id'];
            }
            
            $processedOrders++;
        }
        
        // Generar tokens bulk para cada aprobador
        $tokenGenerationErrors = 0;
        foreach ($groupedOrders as $approverId => &$data) {
            if (!empty($data['order_ids'])) {
                // Eliminar duplicados de order_ids
                $data['order_ids'] = array_unique($data['order_ids']);
                
                $approveToken = $this->generateBulkActionToken($approverId, 'approve', $data['order_ids']);
                $rejectToken = $this->generateBulkActionToken($approverId, 'reject', $data['order_ids']);
                
                if ($approveToken && $rejectToken) {
                    $data['bulk_tokens'] = [
                        'approve' => $approveToken,
                        'reject' => $rejectToken
                    ];
                    
                    logAction("groupOrdersByApprover - Tokens generados para aprobador {$approverId}: " . count($data['order_ids']) . " órdenes", 'GROUPORDERS');
                } else {
                    $tokenGenerationErrors++;
                    logAction("groupOrdersByApprover - Error generando tokens para aprobador {$approverId}", 'GROUPORDERS');
                }
            }
        }
        
        logAction("groupOrdersByApprover - Agrupación completada: " . count($groupedOrders) . " aprobadores, {$processedOrders} procesadas, {$skippedOrders} omitidas, {$tokenGenerationErrors} errores de tokens", 'GROUPORDERS');
        
        return $groupedOrders;
    }
    
    /**
     * ================================================================================
     * MÉTODOS DE NOTIFICACIONES
     * ================================================================================
     */
    
    /**
     * Registra una notificación en la base de datos con validaciones mejoradas
     * 
     * @param int $orderId ID de la orden
     * @param int $userId ID del usuario
     * @param string $type Tipo de notificación
     * @return bool True si se registró correctamente
     */
    public function logNotification($orderId, $userId, $type) {
        // Validaciones de entrada
        if (empty($orderId) || !is_numeric($orderId)) {
            logAction("logNotification - ID de orden inválido: " . var_export($orderId, true), 'LOGNOTIFICATION');
            return false;
        }
        
        if (empty($userId) || !is_numeric($userId)) {
            logAction("logNotification - ID de usuario inválido: " . var_export($userId, true), 'LOGNOTIFICATION');
            return false;
        }
        
        if (empty($type) || !is_string($type)) {
            logAction("logNotification - Tipo de notificación inválido: " . var_export($type, true), 'LOGNOTIFICATION');
            return false;
        }
        
        $orderId = (int)$orderId;
        $userId = (int)$userId;
        $type = trim($type);
        
        // Asegurar que la tabla existe
        $this->ensureNotificationsTable();
        
        // CORREGIR: Solo 3 columnas, 3 valores
        $sql = "INSERT INTO EmailNotifications 
                (order_id, user_id, type) 
                VALUES (?, ?, ?)";
        
        $stmt = $this->db->prepare($sql);
        if (!$stmt) {
            logAction("logNotification - Error preparando consulta: " . $this->db->error, 'LOGNOTIFICATION');
            return false;
        }
        
        // CORREGIR: Solo 3 parámetros para 3 placeholders
        $stmt->bind_param("iis", $orderId, $userId, $type);
        $success = $stmt->execute();
        
        if (!$success) {
            logAction("logNotification - Error ejecutando consulta: " . $stmt->error, 'LOGNOTIFICATION');
        } else {
            logAction("logNotification - Notificación registrada: orden={$orderId}, usuario={$userId}, tipo={$type}", 'LOGNOTIFICATION');
        }
        
        return $success;
    }
    
    /**
     * ================================================================================
     * MÉTODOS PRIVADOS DE SOPORTE
     * ================================================================================
     */
    
    /**
     * Valida la estructura de una orden
     * 
     * @param array $order Datos de la orden
     * @return bool True si la estructura es válida
     */
    private function validateOrderStructure($order) {
        $requiredFields = ['id', 'current_approval_level', 'order_plant'];
        
        foreach ($requiredFields as $field) {
            if (!isset($order[$field])) {
                logAction("validateOrderStructure - Campo faltante '{$field}' en orden: " . json_encode($order), 'VALIDATEORDER');
                return false;
            }
        }
        
        if (!is_numeric($order['id']) || $order['id'] <= 0) {
            logAction("validateOrderStructure - ID de orden inválido: " . var_export($order['id'], true), 'VALIDATEORDER');
            return false;
        }
        
        return true;
    }
    
    /**
     * Obtiene aprobadores para un nivel específico y planta
     * 
     * @param int $authLevel Nivel de autorización requerido
     * @param mixed $plant Planta de la orden
     * @return array Lista de aprobadores
     */
    private function getApproversForLevel($authLevel, $plant) {
        $sql = "SELECT 
                    id, 
                    name, 
                    email, 
                    authorization_level,
                    plant
                FROM User 
                WHERE authorization_level = ? 
                AND (plant = ? OR plant IS NULL)
                ORDER BY 
                    CASE WHEN plant = ? THEN 0 ELSE 1 END,
                    id ASC";
        
        $stmt = $this->db->prepare($sql);
        if (!$stmt) {
            logAction("getApproversForLevel - Error preparando consulta: " . $this->db->error, 'GETAPPROVERS');
            return [];
        }
        
        $stmt->bind_param("iss", $authLevel, $plant, $plant);
        $stmt->execute();
        $result = $stmt->get_result();
        
        return $result->fetch_all(MYSQLI_ASSOC);
    }
    
    /**
     * ================================================================================
     * MÉTODOS DE GESTIÓN DE TABLAS
     * ================================================================================
     */
    
    /**
     * Asegura que la tabla EmailActionTokens existe con estructura optimizada
     */
    private function ensureActionTokensTable() {
        $sql = "CREATE TABLE IF NOT EXISTS EmailActionTokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            token VARCHAR(64) NOT NULL UNIQUE,
            order_id INT NOT NULL,
            user_id INT NOT NULL,
            action ENUM('approve', 'reject') NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            used_at TIMESTAMP NULL,
            is_used BOOLEAN DEFAULT FALSE,
            ip_address VARCHAR(45) NULL,
            
            INDEX idx_token (token),
            INDEX idx_order_user (order_id, user_id),
            INDEX idx_action (action),
            INDEX idx_created (created_at),
            INDEX idx_used (is_used, used_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        if (!$this->db->query($sql)) {
            logAction("ensureActionTokensTable - Error creando tabla: " . $this->db->error, 'ENSUREACTIONTOKENS');
        }
    }
    
    /**
     * Asegura que la tabla EmailBulkActionTokens existe con estructura optimizada
     */
    private function ensureBulkTokensTable() {
        $sql = "CREATE TABLE IF NOT EXISTS EmailBulkActionTokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            token VARCHAR(128) NOT NULL UNIQUE,
            order_ids TEXT NOT NULL,
            user_id INT NOT NULL,
            action ENUM('approve', 'reject') NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            used_at TIMESTAMP NULL,
            is_used BOOLEAN DEFAULT FALSE,
            ip_address VARCHAR(45) NULL,
            
            INDEX idx_token (token),
            INDEX idx_user_action (user_id, action),
            INDEX idx_created (created_at),
            INDEX idx_used (is_used, used_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        if (!$this->db->query($sql)) {
            logAction("ensureBulkTokensTable - Error creando tabla: " . $this->db->error, 'ENSUREBULKTOKENS');
        }
    }
    
    /**
     * Asegura que la tabla EmailNotifications existe con estructura optimizada
     */
    private function ensureNotificationsTable() {
        $sql = "CREATE TABLE IF NOT EXISTS EmailNotifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT NOT NULL,
            user_id INT NOT NULL,
            type VARCHAR(50) NOT NULL,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ip_address VARCHAR(45) NULL,
            user_agent TEXT NULL,
            
            INDEX idx_order (order_id),
            INDEX idx_user (user_id),
            INDEX idx_type (type),
            INDEX idx_sent (sent_at),
            INDEX idx_order_user_type (order_id, user_id, type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        if (!$this->db->query($sql)) {
            logAction("ensureNotificationsTable - Error creando tabla: " . $this->db->error, 'ENSURENOTIFICATIONS');
        }
    }
    
    /**
     * ================================================================================
     * MÉTODOS UTILITARIOS
     * ================================================================================
     */
    
    /**
     * Obtiene la conexión a la base de datos (para compatibilidad)
     * 
     * @return mysqli Conexión a la base de datos
     */
    public function getDatabase() {
        return $this->db;
    }
    
    /**
     * Limpia el cache interno para liberar memoria
     */
    public function clearCache() {
        $this->userCache = [];
        $this->orderCache = [];
        logAction("PFEmailServices - Cache limpiado", 'CACHE');
    }
    
    /**
     * Obtiene estadísticas del cache
     * 
     * @return array Estadísticas del cache
     */
    public function getCacheStats() {
        return [
            'users_cached' => count($this->userCache),
            'orders_cached' => count($this->orderCache),
            'memory_usage' => memory_get_usage(true)
        ];
    }
    
    /**
     * Destructor - Limpia recursos y cache
     */
    public function __destruct() {
        $this->clearCache();
        if ($this->db) {
            $this->db->close();
        }
    }
}
?>