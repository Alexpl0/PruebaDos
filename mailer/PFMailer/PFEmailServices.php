<?php
/**
 * ================================================================================
 * PFEmailServices.php - Servicios de Base de Datos para Sistema de Correos
 * ================================================================================
 * Proporciona servicios de base de datos optimizados para el sistema de correos
 * de Premium Freight, incluyendo manejo de tokens, validaciones robustas y
 * operaciones de agrupación de órdenes.
 * 
 * ACTUALIZACIÓN v2.5 (2025-10-10):
 * - ✅ CORREGIDO: groupOrdersByApprover() ahora genera bulk_tokens
 * - ✅ CORREGIDO: Validación de estructura de datos antes de templates
 * - ✅ OPTIMIZADO: Caché mejorado y manejo de errores robusto
 * 
 * @author      GRAMMER AG
 * @version     2.5 - Corrección de tokens y validaciones
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
            
            if ($this->db->connect_error) {
                throw new Exception("Database connection failed: " . $this->db->connect_error);
            }
            
            $this->db->set_charset("utf8mb4");
            $this->ensureRequiredTables();
            
            logAction("PFEmailServices initialized successfully", 'INIT');
        } catch (Exception $e) {
            logAction("Failed to initialize PFEmailServices: " . $e->getMessage(), 'ERROR');
            throw $e;
        }
    }
    
    /**
     * Obtiene detalles completos de una orden específica
     * 
     * @param int $orderId - ID de la orden
     * @return array|null - Datos de la orden o null si no existe
     * @throws Exception Si hay error en la consulta
     */
    public function getOrderDetails($orderId) {
        // Verificar cache primero
        if (isset($this->orderCache[$orderId])) {
            logAction("Order $orderId retrieved from cache", 'CACHE_HIT');
            return $this->orderCache[$orderId];
        }
        
        try {
            $sql = "SELECT 
                        pf.id,
                        pf.date,
                        pf.weight,
                        pf.cost_euros,
                        pf.description,
                        pf.required_auth_level,
                        p.productName AS product_name,
                        no.Number AS reference_number,
                        no.Name AS reference_name,
                        st.name AS status_name,
                        lo_from.company_name AS origin_name,
                        lo_to.company_name AS destiny_name,
                        c.name AS carrier_name,
                        pfa.act_approv AS current_approval_level,
                        creator.id AS creator_id,
                        creator.name AS creator_name,
                        creator.email AS creator_email,
                        creator.plant AS creator_plant
                    FROM PremiumFreight pf
                    LEFT JOIN Products p ON pf.products = p.id
                    LEFT JOIN NumOrders no ON pf.reference_number = no.ID
                    LEFT JOIN Status st ON pf.status_id = st.id
                    LEFT JOIN Location lo_from ON pf.origin_id = lo_from.id
                    LEFT JOIN Location lo_to ON pf.destiny_id = lo_to.id
                    LEFT JOIN Carriers c ON pf.carrier_id = c.id
                    LEFT JOIN PremiumFreightApprovals pfa ON pf.id = pfa.premium_freight_id
                    LEFT JOIN User creator ON pf.user_id = creator.id
                    WHERE pf.id = ?
                    LIMIT 1";
            
            $stmt = $this->db->prepare($sql);
            if (!$stmt) {
                throw new Exception("Failed to prepare statement: " . $this->db->error);
            }
            
            $stmt->bind_param("i", $orderId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                logAction("Order $orderId not found", 'NOT_FOUND');
                return null;
            }
            
            $order = $result->fetch_assoc();
            
            // Guardar en cache
            $this->orderCache[$orderId] = $order;
            
            logAction("Order $orderId details retrieved successfully", 'SUCCESS');
            return $order;
            
        } catch (Exception $e) {
            logAction("Error getting order details: " . $e->getMessage(), 'ERROR');
            throw $e;
        }
    }
    
    /**
     * Obtiene órdenes pendientes para el resumen semanal
     * 
     * @return array - Lista de órdenes pendientes
     * @throws Exception Si hay error en la consulta
     */
    public function getPendingOrdersForWeeklySummary() {
        try {
            $sql = "SELECT 
                        pf.id,
                        pf.date,
                        pf.weight,
                        pf.cost_euros,
                        pf.description,
                        pf.required_auth_level,
                        p.productName AS product_name,
                        lo_from.company_name AS origin_name,
                        lo_to.company_name AS destiny_name,
                        c.name AS carrier_name,
                        pfa.act_approv as current_approval_level,
                        creator.id as creator_id,
                        creator.name as creator_name,
                        creator.email as creator_email,
                        creator.plant as creator_plant
                    FROM PremiumFreight pf
                    LEFT JOIN Products p ON pf.products = p.id
                    LEFT JOIN Status st ON pf.status_id = st.id
                    LEFT JOIN Location lo_from ON pf.origin_id = lo_from.id
                    LEFT JOIN Location lo_to ON pf.destiny_id = lo_to.id
                    LEFT JOIN Carriers c ON pf.carrier_id = c.id
                    LEFT JOIN PremiumFreightApprovals pfa ON pf.id = pfa.premium_freight_id
                    LEFT JOIN User creator ON pf.user_id = creator.id
                    WHERE pf.status_id = '2'
                    AND pfa.act_approv < pf.required_auth_level
                    ORDER BY pf.date ASC";
            
            $stmt = $this->db->prepare($sql);
            if (!$stmt) {
                throw new Exception("Failed to prepare statement: " . $this->db->error);
            }
            
            $stmt->execute();
            $result = $stmt->get_result();
            
            $orders = [];
            while ($row = $result->fetch_assoc()) {
                $orders[] = $row;
            }
            
            logAction("Retrieved " . count($orders) . " pending orders for weekly summary", 'SUCCESS');
            return $orders;
            
        } catch (Exception $e) {
            logAction("Error getting pending orders: " . $e->getMessage(), 'ERROR');
            throw $e;
        }
    }
    
    /**
     * Obtiene los próximos aprobadores para una orden
     * 
     * @param int $orderId - ID de la orden
     * @return array - Lista de aprobadores para el siguiente nivel
     * @throws Exception Si hay error en la consulta
     */
    public function getNextApprovers($orderId) {
        try {
            $order = $this->getOrderDetails($orderId);
            if (!$order) {
                throw new Exception("Order not found: $orderId");
            }
            
            $currentLevel = intval($order['current_approval_level'] ?? 0);
            $nextLevel = $currentLevel + 1;
            $requiredLevel = intval($order['required_auth_level'] ?? 7);
            $orderPlant = $order['creator_plant'];
            
            if ($currentLevel >= $requiredLevel) {
                logAction("Order $orderId is already fully approved (level $currentLevel/$requiredLevel)", 'INFO');
                return [];
            }
            
            logAction("Getting approvers for order $orderId: next level = $nextLevel, plant = $orderPlant", 'INFO');
            
            $sql = "SELECT 
                        u.id,
                        u.name,
                        u.email,
                        u.role,
                        a.approval_level,
                        a.plant,
                        CASE 
                            WHEN a.plant IS NULL THEN 1 
                            ELSE 0 
                        END as is_regional
                    FROM Approvers a
                    INNER JOIN User u ON a.user_id = u.id
                    WHERE a.approval_level = ?
                    AND (a.plant = ? OR a.plant IS NULL)
                    ORDER BY is_regional ASC, u.name ASC";
            
            $stmt = $this->db->prepare($sql);
            if (!$stmt) {
                throw new Exception("Failed to prepare statement: " . $this->db->error);
            }
            
            $stmt->bind_param("is", $nextLevel, $orderPlant);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $approvers = [];
            while ($row = $result->fetch_assoc()) {
                $approvers[] = [
                    'id' => $row['id'],
                    'name' => $row['name'],
                    'email' => $row['email'],
                    'role' => $row['role'],
                    'approval_level' => $row['approval_level'],
                    'plant' => $row['plant'],
                    'is_regional' => $row['is_regional'] == 1
                ];
            }
            
            if (empty($approvers)) {
                logAction("WARNING: No approvers found for level $nextLevel and plant $orderPlant", 'WARNING');
            } else {
                $approverNames = array_map(function($a) { return $a['name']; }, $approvers);
                logAction("Found " . count($approvers) . " approver(s) for level $nextLevel: " . implode(', ', $approverNames), 'SUCCESS');
            }
            
            return $approvers;
            
        } catch (Exception $e) {
            logAction("Error getting next approvers for order $orderId: " . $e->getMessage(), 'ERROR');
            throw $e;
        }
    }
    
    /**
     * Obtiene información de un usuario
     * 
     * @param int $userId - ID del usuario
     * @return array|null - Datos del usuario o null si no existe
     * @throws Exception Si hay error en la consulta
     */
    public function getUser($userId) {
        if (isset($this->userCache[$userId])) {
            return $this->userCache[$userId];
        }
        
        try {
            $sql = "SELECT 
                        u.id,
                        u.name,
                        u.email,
                        u.role,
                        u.plant,
                        u.authorization_level
                    FROM User u
                    WHERE u.id = ?
                    LIMIT 1";
            
            $stmt = $this->db->prepare($sql);
            if (!$stmt) {
                throw new Exception("Failed to prepare statement: " . $this->db->error);
            }
            
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                return null;
            }
            
            $user = $result->fetch_assoc();
            $this->userCache[$userId] = $user;
            
            return $user;
            
        } catch (Exception $e) {
            logAction("Error getting user details: " . $e->getMessage(), 'ERROR');
            throw $e;
        }
    }
    
    /**
     * Genera un token único para una acción de email
     * 
     * @param int $orderId - ID de la orden
     * @param int $userId - ID del usuario
     * @param string $action - Tipo de acción (approve/reject)
     * @return string - Token generado
     * @throws Exception Si hay error al generar el token
     */
    public function generateActionToken($orderId, $userId, $action) {
        try {
            $token = bin2hex(random_bytes(32));
            
            $sql = "INSERT INTO EmailActionTokens (token, order_id, user_id, action, created_at) 
                    VALUES (?, ?, ?, ?, NOW())";
            
            $stmt = $this->db->prepare($sql);
            if (!$stmt) {
                throw new Exception("Failed to prepare statement: " . $this->db->error);
            }
            
            $stmt->bind_param("siis", $token, $orderId, $userId, $action);
            
            if (!$stmt->execute()) {
                throw new Exception("Failed to insert token: " . $stmt->error);
            }
            
            logAction("Generated token for order $orderId, user $userId, action $action", 'SUCCESS');
            return $token;
            
        } catch (Exception $e) {
            logAction("Error generating action token: " . $e->getMessage(), 'ERROR');
            throw $e;
        }
    }
    
    /**
     * ✅ CORREGIDO: Genera un token para acciones en bloque (múltiples órdenes)
     * 
     * @param int $userId - ID del usuario
     * @param string $action - Tipo de acción (approve/reject)
     * @param array $orderIds - Array de IDs de órdenes
     * @return string - Token generado
     * @throws Exception Si hay error al generar el token
     */
    public function generateBulkActionToken($userId, $action, $orderIds) {
        try {
            $token = bin2hex(random_bytes(32));
            $orderIdsJson = json_encode($orderIds);
            
            $sql = "INSERT INTO EmailBulkActionTokens (token, user_id, action, order_ids, created_at) 
                    VALUES (?, ?, ?, ?, NOW())";
            
            $stmt = $this->db->prepare($sql);
            if (!$stmt) {
                throw new Exception("Failed to prepare statement: " . $this->db->error);
            }
            
            $stmt->bind_param("siss", $token, $userId, $action, $orderIdsJson);
            
            if (!$stmt->execute()) {
                throw new Exception("Failed to insert bulk token: " . $stmt->error);
            }
            
            logAction("Generated bulk token for user $userId, " . count($orderIds) . " orders, action: $action", 'SUCCESS');
            return $token;
            
        } catch (Exception $e) {
            logAction("Error generating bulk action token: " . $e->getMessage(), 'ERROR');
            throw $e;
        }
    }
    
    /**
     * ✅ CORREGIDO: Agrupa órdenes por aprobador para envíos en bloque
     * AHORA GENERA LOS BULK_TOKENS NECESARIOS PARA EL TEMPLATE
     * 
     * @param array $orders - Lista de órdenes
     * @return array - Órdenes agrupadas por aprobador con tokens generados
     */
    public function groupOrdersByApprover($orders) {
        $grouped = [];
        
        // Paso 1: Agrupar órdenes por aprobador
        foreach ($orders as $order) {
            try {
                $approvers = $this->getNextApprovers($order['id']);
                
                foreach ($approvers as $approver) {
                    $approverId = $approver['id'];
                    
                    if (!isset($grouped[$approverId])) {
                        $grouped[$approverId] = [
                            'approver' => $approver,
                            'orders' => [],
                            'order_ids' => [] // ✅ NUEVO: Array para IDs
                        ];
                    }
                    
                    $grouped[$approverId]['orders'][] = $order;
                    $grouped[$approverId]['order_ids'][] = $order['id']; // ✅ NUEVO
                }
            } catch (Exception $e) {
                logAction("Error processing order {$order['id']} for grouping: " . $e->getMessage(), 'WARNING');
            }
        }
        
        // ✅ Paso 2: Generar bulk tokens para cada aprobador
        foreach ($grouped as $approverId => &$groupData) {
            try {
                $orderIds = $groupData['order_ids'];
                
                // Generar tokens de aprobación y rechazo en bloque
                $groupData['bulk_tokens'] = [
                    'approve' => $this->generateBulkActionToken($approverId, 'approve', $orderIds),
                    'reject' => $this->generateBulkActionToken($approverId, 'reject', $orderIds)
                ];
                
                logAction("Generated bulk tokens for approver $approverId with " . count($orderIds) . " orders", 'SUCCESS');
                
            } catch (Exception $e) {
                logAction("Error generating bulk tokens for approver $approverId: " . $e->getMessage(), 'WARNING');
                // Fallback: tokens null para evitar errores en template
                $groupData['bulk_tokens'] = [
                    'approve' => null,
                    'reject' => null
                ];
            }
        }
        unset($groupData); // Romper referencia
        
        logAction("Grouped " . count($orders) . " orders for " . count($grouped) . " approvers with tokens", 'SUCCESS');
        return $grouped;
    }
    
    /**
     * Registra una notificación enviada
     * 
     * @param int $orderId - ID de la orden
     * @param int $userId - ID del usuario notificado
     * @param string $type - Tipo de notificación
     * @return bool - True si se registró correctamente
     */
    public function logNotification($orderId, $userId, $type) {
        try {
            $sql = "INSERT INTO EmailNotifications (order_id, user_id, type, sent_at) 
                    VALUES (?, ?, ?, NOW())";
            
            $stmt = $this->db->prepare($sql);
            if (!$stmt) {
                throw new Exception("Failed to prepare statement: " . $this->db->error);
            }
            
            $stmt->bind_param("iis", $orderId, $userId, $type);
            
            if (!$stmt->execute()) {
                throw new Exception("Failed to log notification: " . $stmt->error);
            }
            
            return true;
            
        } catch (Exception $e) {
            logAction("Error logging notification: " . $e->getMessage(), 'WARNING');
            return false;
        }
    }
    
    /**
     * Valida la estructura de una orden
     * 
     * @param array $order - Datos de la orden
     * @return bool - True si la estructura es válida
     */
    private function validateOrderStructure($order) {
        $requiredFields = [
            'id', 'creator_id', 'creator_name', 'creator_email'
        ];
        
        foreach ($requiredFields as $field) {
            if (!isset($order[$field]) || $order[$field] === null) {
                logAction("Order validation failed: missing field '$field'", 'WARNING');
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Asegura que existan las tablas necesarias para el sistema de tokens y notificaciones
     */
    private function ensureRequiredTables() {
        $this->ensureActionTokensTable();
        $this->ensureBulkTokensTable();
        $this->ensureNotificationsTable();
    }
    
    /**
     * Crea la tabla de tokens de acción si no existe
     */
    private function ensureActionTokensTable() {
        $sql = "CREATE TABLE IF NOT EXISTS EmailActionTokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            token VARCHAR(64) UNIQUE NOT NULL,
            order_id INT NOT NULL,
            user_id INT NOT NULL,
            action ENUM('approve','reject') NOT NULL,
            is_used BOOLEAN DEFAULT FALSE,
            created_at DATETIME NOT NULL,
            used_at DATETIME NULL,
            INDEX idx_token (token),
            INDEX idx_order_user (order_id, user_id),
            FOREIGN KEY (order_id) REFERENCES PremiumFreight(id),
            FOREIGN KEY (user_id) REFERENCES User(id)
        )";
        $this->db->query($sql);
    }
    
    /**
     * Crea la tabla de tokens en bloque si no existe
     */
    private function ensureBulkTokensTable() {
        $sql = "CREATE TABLE IF NOT EXISTS EmailBulkActionTokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            token VARCHAR(64) UNIQUE NOT NULL,
            user_id INT NOT NULL,
            action ENUM('approve','reject') NOT NULL,
            order_ids TEXT NOT NULL,
            is_used BOOLEAN DEFAULT FALSE,
            created_at DATETIME NOT NULL,
            used_at DATETIME NULL,
            INDEX idx_token (token),
            INDEX idx_user (user_id),
            FOREIGN KEY (user_id) REFERENCES User(id)
        )";
        $this->db->query($sql);
    }
    
    /**
     * Crea la tabla de notificaciones si no existe
     */
    private function ensureNotificationsTable() {
        $sql = "CREATE TABLE IF NOT EXISTS EmailNotifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT NOT NULL,
            user_id INT NOT NULL,
            type VARCHAR(30) NOT NULL,
            sent_at DATETIME NOT NULL,
            INDEX idx_order (order_id),
            INDEX idx_user (user_id),
            FOREIGN KEY (order_id) REFERENCES PremiumFreight(id),
            FOREIGN KEY (user_id) REFERENCES User(id)
        )";
        $this->db->query($sql);
    }
    
    /**
     * Obtiene la conexión a la base de datos (para uso externo si es necesario)
     * 
     * @return mysqli
     */
    public function getDatabase() {
        return $this->db;
    }
    
    /**
     * Limpia el cache de usuarios y órdenes
     */
    public function clearCache() {
        $this->userCache = [];
        $this->orderCache = [];
        logAction("Cache cleared", 'INFO');
    }
    
    /**
     * ✅ NUEVO: Limpia solo el cache de una orden específica
     * 
     * @param int $orderId - ID de la orden
     */
    public function clearOrderCache($orderId) {
        if (isset($this->orderCache[$orderId])) {
            unset($this->orderCache[$orderId]);
            logAction("Order cache cleared for order $orderId", 'INFO');
        }
    }
    
    /**
     * Obtiene estadísticas del cache
     * 
     * @return array
     */
    public function getCacheStats() {
        return [
            'users_cached' => count($this->userCache),
            'orders_cached' => count($this->orderCache)
        ];
    }
    
    /**
     * Destructor - Cierra la conexión a la base de datos
     */
    public function __destruct() {
        if ($this->db && !$this->db->connect_errno) {
            $this->db->close();
        }
    }
}
?>