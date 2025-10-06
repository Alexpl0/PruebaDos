<?php
/**
 * PFmailAction.php - Procesa acciones de email para Premium Freight
 * 
 * ACTUALIZACIÓN v2.0 (2025-10-06):
 * - Migrado a tabla Approvers para validación de aprobadores
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
     */
    public function validateBulkToken($token) {
        try {
            $sql = "SELECT id, user_id, action, order_ids, is_used, expires_at 
                    FROM BulkEmailActionTokens 
                    WHERE token = ? 
                    LIMIT 1";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bind_param("s", $token);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                return false;
            }
            
            $tokenInfo = $result->fetch_assoc();
            
            if ($tokenInfo['is_used']) {
                return false;
            }
            
            if (strtotime($tokenInfo['expires_at']) < time()) {
                return false;
            }
            
            return $tokenInfo;
        } catch (Exception $e) {
            logAction("Error validating bulk token: " . $e->getMessage(), 'ERROR');
            return false;
        }
    }

    /**
     * Procesa una acción basada en un token
     */
    public function processAction($token, $action) {
        try {
            $tokenInfo = $this->validateToken($token);
            
            if (!$tokenInfo) {
                return [
                    'success' => false,
                    'message' => 'Invalid or expired token'
                ];
            }
            
            $orderId = $tokenInfo['order_id'];
            $userId = $tokenInfo['user_id'];
            
            if ($action === 'approve') {
                $result = $this->approveOrder($orderId, $userId);
            } elseif ($action === 'reject') {
                $result = $this->rejectOrder($orderId, $userId);
            } else {
                return [
                    'success' => false,
                    'message' => 'Invalid action'
                ];
            }
            
            if ($result['success']) {
                $this->markTokenAsUsed($token);
            }
            
            return $result;
            
        } catch (Exception $e) {
            logAction("Error processing action: " . $e->getMessage(), 'ERROR');
            return [
                'success' => false,
                'message' => 'Error processing request: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Aprueba una orden
     * ACTUALIZADO: Usa tabla Approvers para validación
     */
    private function approveOrder($orderId, $userId) {
        try {
            $this->db->begin_transaction();
            
            // 1. Obtener información de la orden
            $sql = "SELECT 
                        pf.id,
                        pf.premium_freight_number,
                        pf.required_auth_level,
                        pfa.act_approv as current_approval,
                        creator.plant as creator_plant
                    FROM PremiumFreight pf
                    LEFT JOIN PremiumFreightApprovals pfa ON pf.id = pfa.premium_freight_id
                    LEFT JOIN User creator ON pf.id_user = creator.id
                    WHERE pf.id = ?";

            $stmt = $this->db->prepare($sql);
            $stmt->bind_param("i", $orderId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                throw new Exception("Order not found");
            }
            
            $order = $result->fetch_assoc();
            $currentApproval = intval($order['current_approval']);
            $requiredLevel = intval($order['required_auth_level']);
            $creatorPlant = $order['creator_plant'];
            
            // 2. NUEVO: Verificar que el usuario tenga permisos de aprobación
            $approverSql = "SELECT approval_level, plant
                           FROM Approvers
                           WHERE user_id = ?
                           AND (plant = ? OR plant IS NULL)
                           ORDER BY plant ASC
                           LIMIT 1";
            
            $stmt = $this->db->prepare($approverSql);
            $stmt->bind_param("is", $userId, $creatorPlant);
            $stmt->execute();
            $approverResult = $stmt->get_result();
            
            if ($approverResult->num_rows === 0) {
                throw new Exception("User does not have approval permissions for this order");
            }
            
            $approver = $approverResult->fetch_assoc();
            $approverLevel = intval($approver['approval_level']);
            
            // 3. Validar que sea el nivel correcto
            $expectedLevel = $currentApproval + 1;
            
            if ($approverLevel !== $expectedLevel) {
                throw new Exception("Approval level mismatch. Expected level $expectedLevel, but user has level $approverLevel");
            }
            
            // 4. Verificar si ya está completamente aprobada
            if ($currentApproval >= $requiredLevel) {
                throw new Exception("Order is already fully approved");
            }
            
            // 5. Actualizar nivel de aprobación
            $newApprovalLevel = $approverLevel;
            
            $updateSql = "UPDATE PremiumFreightApprovals 
                         SET act_approv = ? 
                         WHERE premium_freight_id = ?";
            
            $stmt = $this->db->prepare($updateSql);
            $stmt->bind_param("ii", $newApprovalLevel, $orderId);
            
            if (!$stmt->execute()) {
                throw new Exception("Failed to update approval level");
            }
            
            // 6. Registrar en historial
            $historyDate = date('Y-m-d H:i:s');
            $historySql = "INSERT INTO ApprovalHistory 
                          (premium_freight_id, approver_id, approval_level_reached, approved_at)
                          VALUES (?, ?, ?, ?)";
            
            $stmt = $this->db->prepare($historySql);
            $stmt->bind_param("iiis", $orderId, $userId, $newApprovalLevel, $historyDate);
            $stmt->execute();
            
            // 7. Si es aprobación final, actualizar estado general
            if ($newApprovalLevel >= $requiredLevel) {
                $statusSql = "UPDATE PremiumFreight SET status = 'approved' WHERE id = ?";
                $stmt = $this->db->prepare($statusSql);
                $stmt->bind_param("i", $orderId);
                $stmt->execute();
            }
            
            $this->db->commit();
            
            logAction("Order $orderId approved by user $userId (level $newApprovalLevel)", 'SUCCESS');
            
            return [
                'success' => true,
                'message' => 'Order approved successfully',
                'new_level' => $newApprovalLevel,
                'is_final' => ($newApprovalLevel >= $requiredLevel)
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            logAction("Error approving order: " . $e->getMessage(), 'ERROR');
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Rechaza una orden
     */
    private function rejectOrder($orderId, $userId) {
        try {
            $this->db->begin_transaction();
            
            $rejectionReason = "Rejected via email";
            $historyDate = date('Y-m-d H:i:s');
            
            // Actualizar estado
            $sql = "UPDATE PremiumFreightApprovals 
                    SET act_approv = 99, rejection_reason = ? 
                    WHERE premium_freight_id = ?";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bind_param("si", $rejectionReason, $orderId);
            
            if (!$stmt->execute()) {
                throw new Exception("Failed to reject order");
            }
            
            // Registrar en historial
            $historySql = "INSERT INTO ApprovalHistory 
                          (premium_freight_id, approver_id, approval_level_reached, approved_at, rejection_reason)
                          VALUES (?, ?, 99, ?, ?)";
            
            $stmt = $this->db->prepare($historySql);
            $stmt->bind_param("iiss", $orderId, $userId, $historyDate, $rejectionReason);
            $stmt->execute();
            
            // Actualizar estado general
            $statusSql = "UPDATE PremiumFreight SET status = 'rejected' WHERE id = ?";
            $stmt = $this->db->prepare($statusSql);
            $stmt->bind_param("i", $orderId);
            $stmt->execute();
            
            $this->db->commit();
            
            logAction("Order $orderId rejected by user $userId", 'SUCCESS');
            
            return [
                'success' => true,
                'message' => 'Order rejected successfully'
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            logAction("Error rejecting order: " . $e->getMessage(), 'ERROR');
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Marca un token como usado
     */
    private function markTokenAsUsed($token) {
        try {
            $sql = "UPDATE EmailActionTokens 
                    SET is_used = TRUE, used_at = NOW() 
                    WHERE token = ?";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bind_param("s", $token);
            $stmt->execute();
            
            return true;
        } catch (Exception $e) {
            logAction("Error marking token as used: " . $e->getMessage(), 'ERROR');
            return false;
        }
    }
    
    /**
     * Valida un token individual
     */
    public function validateToken($token) {
        try {
            $sql = "SELECT id, order_id, user_id, action, is_used, expires_at 
                    FROM EmailActionTokens 
                    WHERE token = ? 
                    LIMIT 1";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bind_param("s", $token);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                return false;
            }
            
            $tokenInfo = $result->fetch_assoc();
            
            if ($tokenInfo['is_used']) {
                return false;
            }
            
            if (strtotime($tokenInfo['expires_at']) < time()) {
                return false;
            }
            
            return $tokenInfo;
        } catch (Exception $e) {
            logAction("Error validating token: " . $e->getMessage(), 'ERROR');
            return false;
        }
    }
    
    /**
     * Marca un token en bloque como usado
     */
    private function markBulkTokenAsUsed($token) {
        try {
            $sql = "UPDATE BulkEmailActionTokens 
                    SET is_used = TRUE, used_at = NOW() 
                    WHERE token = ?";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bind_param("s", $token);
            $stmt->execute();
            
            return true;
        } catch (Exception $e) {
            logAction("Error marking bulk token as used: " . $e->getMessage(), 'ERROR');
            return false;
        }
    }
    
    /**
     * Procesa acción en bloque
     */
    public function processBulkAction($token, $action) {
        try {
            $tokenInfo = $this->validateBulkToken($token);
            
            if (!$tokenInfo) {
                return [
                    'success' => false,
                    'message' => 'Invalid or expired bulk token'
                ];
            }
            
            $userId = $tokenInfo['user_id'];
            $orderIds = json_decode($tokenInfo['order_ids'], true);
            
            $results = [];
            foreach ($orderIds as $orderId) {
                if ($action === 'approve') {
                    $result = $this->approveOrder($orderId, $userId);
                } elseif ($action === 'reject') {
                    $result = $this->rejectOrder($orderId, $userId);
                }
                
                $results[] = [
                    'order_id' => $orderId,
                    'result' => $result
                ];
            }
            
            $this->markBulkTokenAsUsed($token);
            
            return [
                'success' => true,
                'message' => 'Bulk action processed',
                'results' => $results
            ];
            
        } catch (Exception $e) {
            logAction("Error processing bulk action: " . $e->getMessage(), 'ERROR');
            return [
                'success' => false,
                'message' => 'Error processing bulk request: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Obtiene el estado de una orden
     */
    public function getOrderStatus($orderId) {
        try {
            $sql = "SELECT 
                        pf.id,
                        pf.premium_freight_number,
                        pf.status,
                        pfa.act_approv as current_approval_level,
                        pf.required_auth_level
                    FROM PremiumFreight pf
                    LEFT JOIN PremiumFreightApprovals pfa ON pf.id = pfa.premium_freight_id
                    WHERE pf.id = ?";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bind_param("i", $orderId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                return null;
            }
            
            return $result->fetch_assoc();
            
        } catch (Exception $e) {
            logAction("Error getting order status: " . $e->getMessage(), 'ERROR');
            return null;
        }
    }
}
?>