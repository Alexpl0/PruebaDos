<?php
/**
 * PFEmailServices.php - Servicios de base de datos para el sistema de correos
 * 
 * @author GRAMMER AG
 * @version 1.0
 */

require_once 'PFDB.php';

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
        // Obtener el estado actual de aprobación
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
            return [];
        }
        
        $orderInfo = $result->fetch_assoc();
        $currentApprovalLevel = $orderInfo['current_approval_level'];
        $requiredAuthLevel = $orderInfo['required_auth_level'];
        $orderPlant = $orderInfo['order_plant'];
        
        // Verificar si ya está completamente aprobada
        if ($currentApprovalLevel >= $requiredAuthLevel || $currentApprovalLevel == 99) {
            return [];
        }
        
        $nextAuthLevel = $currentApprovalLevel + 1;
        
        // Obtener usuarios con el nivel de autorización exacto
        $approversSql = "SELECT id, name, email, authorization_level, plant 
                        FROM User 
                        WHERE authorization_level = ? 
                        AND plant = ?";
        
        $approversStmt = $this->db->prepare($approversSql);
        $approversStmt->bind_param("is", $nextAuthLevel, $orderPlant);
        $approversStmt->execute();
        $approversResult = $approversStmt->get_result();
        
        return $approversResult->fetch_all(MYSQLI_ASSOC);
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
     * Genera y almacena un token de acción en bloque
     */
    public function generateBulkActionToken($userId, $action, $orderIds) {
        $token = bin2hex(random_bytes(16));
        $serializedOrderIds = json_encode($orderIds);
        
        $sql = "INSERT INTO EmailBulkActionTokens (token, order_ids, user_id, action, created_at) VALUES (?, ?, ?, ?, NOW())";
        $stmt = $this->db->prepare($sql);
        $stmt->bind_param("ssis", $token, $serializedOrderIds, $userId, $action);
        $stmt->execute();
        
        return $token;
    }
    
    /**
     * Agrupa órdenes por aprobador
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
                            AND plant = ?";
            
            $stmt = $this->db->prepare($approversSql);
            $stmt->bind_param("is", $nextAuthLevel, $orderPlant);
            $stmt->execute();
            $approversResult = $stmt->get_result();
            
            while ($approver = $approversResult->fetch_assoc()) {
                if (!isset($groupedOrders[$approver['id']])) {
                    $groupedOrders[$approver['id']] = [];
                }
                
                $order['next_auth_level'] = $nextAuthLevel;
                $order['approver_info'] = $approver;
                
                $groupedOrders[$approver['id']][] = $order;
            }
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