<?php
/**
 * PFEmailServices.php - Servicios de base de datos para el sistema de correos
 * 
 * @author GRAMMER AG
 * @version 1.1 - Agregado soporte para tokens bulk
 */

require_once 'PFDB.php';
require_once 'PFmailUtils.php';

class PFEmailServices {
    private $db;
    
    public function __construct() {
        $con = new LocalConector();
        $this->db = $con->conectar();
    }
    
    /**
     * Obtiene los detalles de una orden
     */
    public function getOrderDetails($orderId) {
        $sql = "SELECT PF.id, PF.user_id, PF.required_auth_level, PF.cost_euros,
                   PF.date, PF.description, PF.planta, PF.status_id, PF.area,
                   COALESCE(PFA.act_approv, 0) as current_approval_level,
                   U.name as creator_name, U.plant as order_plant
            FROM PremiumFreight PF
            LEFT JOIN PremiumFreightApprovals PFA ON PF.id = PFA.premium_freight_id
            INNER JOIN User U ON PF.user_id = U.id
            WHERE PF.id = ?";
    
        $stmt = $this->db->prepare($sql);
        $stmt->bind_param("i", $orderId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        return $result->num_rows > 0 ? $result->fetch_assoc() : null;
    }
    
    /**
     * Obtiene los próximos aprobadores para una orden
     */
    public function getNextApprovers($orderId) {
        // Obtener el estado actual de aprobación y datos de la orden
        $sql = "SELECT PF.user_id, PF.required_auth_level, 
                   COALESCE(PFA.act_approv, 0) as current_approval_level,
                   U.plant as order_plant
            FROM PremiumFreight PF
            LEFT JOIN PremiumFreightApprovals PFA ON PF.id = PFA.premium_freight_id
            INNER JOIN User U ON PF.user_id = U.id
            WHERE PF.id = ?";

        $stmt = $this->db->prepare($sql);
        $stmt->bind_param("i", $orderId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            logAction("Orden #{$orderId} no encontrada", 'GETNEXTAPPROVERS');
            return [];
        }
        
        $orderInfo = $result->fetch_assoc();
        $currentApprovalLevel = (int)$orderInfo['current_approval_level'];
        $requiredAuthLevel = (int)$orderInfo['required_auth_level'];
        $orderPlant = $orderInfo['order_plant'];
        
        logAction("getNextApprovers - Orden #{$orderId}: current_approval={$currentApprovalLevel}, required={$requiredAuthLevel}, plant={$orderPlant}", 'GETNEXTAPPROVERS');
        
        // VALIDACIÓN 1: Verificar si ya está completamente aprobada
        if ($currentApprovalLevel >= $requiredAuthLevel) {
            logAction("Orden #{$orderId} ya está completamente aprobada (act_approv={$currentApprovalLevel} >= required={$requiredAuthLevel})", 'GETNEXTAPPROVERS');
            return [];
        }
        
        // VALIDACIÓN 2: Verificar si fue rechazada
        if ($currentApprovalLevel == 99) {
            logAction("Orden #{$orderId} fue rechazada (act_approv=99)", 'GETNEXTAPPROVERS');
            return [];
        }
        
        // CALCULAR EL SIGUIENTE NIVEL REQUERIDO
        $nextAuthLevel = $currentApprovalLevel + 1;
        
        logAction("Buscando aprobadores con nivel {$nextAuthLevel} para orden de planta '{$orderPlant}'", 'GETNEXTAPPROVERS');
        
        // BÚSQUEDA DE APROBADORES: authorization_level = (act_approv + 1) Y (misma planta O sin planta)
        $approversSql = "SELECT id, name, email, authorization_level, plant 
                        FROM User 
                        WHERE authorization_level = ? 
                        AND (plant = ? OR plant IS NULL)
                        ORDER BY 
                            CASE WHEN plant = ? THEN 0 ELSE 1 END, -- Primero los de la misma planta
                            id ASC"; // Luego por ID para orden consistente
    
        $approversStmt = $this->db->prepare($approversSql);
        $approversStmt->bind_param("iss", $nextAuthLevel, $orderPlant, $orderPlant);
        $approversStmt->execute();
        $approversResult = $approversStmt->get_result();
        
        $approvers = $approversResult->fetch_all(MYSQLI_ASSOC);
        
        logAction("Encontrados " . count($approvers) . " aprobadores potenciales para nivel {$nextAuthLevel}", 'GETNEXTAPPROVERS');
        
        return $approvers;
    }
    
    /**
     * Obtiene órdenes pendientes para resumen semanal
     */
    public function getPendingOrdersForWeeklySummary() {
        $sql = "SELECT PF.id, PF.user_id, PF.required_auth_level, PF.cost_euros,
                   PF.date, PF.description, PF.planta, PF.area,
                   COALESCE(PFA.act_approv, 0) as current_approval_level,
                   U.name as creator_name, U.plant as order_plant
            FROM PremiumFreight PF
            LEFT JOIN PremiumFreightApprovals PFA ON PF.id = PFA.premium_freight_id
            INNER JOIN User U ON PF.user_id = U.id
            WHERE PF.status_id IN (1, 2) 
            AND (PFA.act_approv IS NULL OR 
                 (PFA.act_approv < PF.required_auth_level AND PFA.act_approv != 99))
            ORDER BY PF.date DESC";
    
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        $result = $stmt->get_result();
        
        return $result->fetch_all(MYSQLI_ASSOC);
    }
    
    /**
     * Obtiene información de un usuario
     */
    public function getUser($userId) {
        $sql = "SELECT id, name, email, authorization_level, plant FROM User WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        return $result->num_rows > 0 ? $result->fetch_assoc() : null;
    }
    
    /**
     * Registra una notificación en la base de datos
     */
    public function logNotification($orderId, $userId, $type) {
        $sql = "INSERT INTO EmailNotifications (order_id, user_id, type, sent_at) VALUES (?, ?, ?, NOW())";
        $stmt = $this->db->prepare($sql);
        $stmt->bind_param("iis", $orderId, $userId, $type);
        return $stmt->execute();
    }
    
    /**
     * Genera y almacena un token de acción
     */
    public function generateActionToken($orderId, $userId, $action) {
        $token = bin2hex(random_bytes(16));
        
        $sql = "INSERT INTO EmailActionTokens (token, order_id, user_id, action, created_at) VALUES (?, ?, ?, ?, NOW())";
        $stmt = $this->db->prepare($sql);
        $stmt->bind_param("siis", $token, $orderId, $userId, $action);
        $stmt->execute();
        
        return $token;
    }
    
    /**
     * Genera y almacena un token de acción en bloque - ACTUALIZADO
     */
    public function generateBulkActionToken($userId, $action, $orderIds) {
        $token = bin2hex(random_bytes(32)); // Increased token length for bulk
        $serializedOrderIds = json_encode($orderIds);
        
        // Ensure the table exists, if not create it
        $this->ensureBulkTokensTable();
        
        $sql = "INSERT INTO EmailBulkActionTokens (token, order_ids, user_id, action, created_at, is_used) VALUES (?, ?, ?, ?, NOW(), 0)";
        $stmt = $this->db->prepare($sql);
        $stmt->bind_param("ssis", $token, $serializedOrderIds, $userId, $action);
        
        if (!$stmt->execute()) {
            error_log("Error creating bulk token: " . $stmt->error);
            return null;
        }
        
        return $token;
    }

    /**
     * Asegura que la tabla de tokens bulk existe
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
            INDEX idx_token (token),
            INDEX idx_user_action (user_id, action),
            FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
        )";
        
        $this->db->query($sql);
    }

    /**
     * Agrupa órdenes por aprobador y genera tokens bulk - ACTUALIZADO
     */
    public function groupOrdersByApprover($orders) {
        $groupedOrders = [];
        
        foreach ($orders as $order) {
            $currentApprovalLevel = $order['current_approval_level'];
            $nextAuthLevel = $currentApprovalLevel + 1;
            $orderPlant = $order['order_plant'];
            
            // Obtener aprobadores para este nivel
            $approversSql = "SELECT id, name, email, authorization_level 
                            FROM User 
                            WHERE authorization_level = ? 
                            AND (plant = ? OR plant IS NULL)
                            ORDER BY 
                                CASE WHEN plant = ? THEN 0 ELSE 1 END,
                                id ASC";
            
            $stmt = $this->db->prepare($approversSql);
            $stmt->bind_param("iss", $nextAuthLevel, $orderPlant, $orderPlant);
            $stmt->execute();
            $approversResult = $stmt->get_result();
            
            while ($approver = $approversResult->fetch_assoc()) {
                if (!isset($groupedOrders[$approver['id']])) {
                    $groupedOrders[$approver['id']] = [
                        'approver' => $approver,
                        'orders' => [],
                        'order_ids' => []
                    ];
                }
                
                $order['next_auth_level'] = $nextAuthLevel;
                $order['approver_info'] = $approver;
                
                $groupedOrders[$approver['id']]['orders'][] = $order;
                $groupedOrders[$approver['id']]['order_ids'][] = $order['id'];
            }
        }
        
        // Generate bulk tokens for each approver
        foreach ($groupedOrders as $approverId => &$data) {
            $data['bulk_tokens'] = [
                'approve' => $this->generateBulkActionToken($approverId, 'approve', $data['order_ids']),
                'reject' => $this->generateBulkActionToken($approverId, 'reject', $data['order_ids'])
            ];
        }
        
        return $groupedOrders;
    }

    /**
     * Obtiene la conexión a la base de datos
     */
    public function getDatabase() {
        return $this->db;
    }
}
?>