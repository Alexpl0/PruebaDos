<?php
/**
 * daoEditTokens.php - Edit Token Management Endpoint
 * Handles CRUD operations for edit request tokens
 * 
 * @author GRAMMER AG
 * @version 1.0
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../users/auth_check.php';
require_once __DIR__ . '/../db/PFDB.php';

try {
    $con = new LocalConector();
    $conex = $con->conectar();

    if (!isset($_GET['action'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Action parameter required']);
        exit;
    }

    $action = $_GET['action'];
    $response = ['success' => false, 'message' => 'Unknown action'];

    switch ($action) {
        case 'create':
            $response = createEditToken($conex, $_SESSION['user']['id']);
            break;

        case 'approve':
            $response = approveEditRequest($conex, $_POST);
            break;

        case 'validate':
            $response = validateToken($conex, $_GET['token'] ?? null, $_GET['orderId'] ?? null);
            break;

        case 'mark_used':
            $response = markTokenAsUsed($conex, $_POST['tokenId'] ?? null);
            break;

        case 'get_order_details':
            $response = getOrderDetailsForEdit($conex, $_GET['orderId'] ?? null);
            break;

        case 'get_audit_log':
            $response = getEditAuditLog($conex, $_GET['orderId'] ?? null);
            break;

        default:
            http_response_code(400);
            $response = ['success' => false, 'message' => 'Invalid action'];
    }

    http_response_code($response['success'] ? 200 : 400);
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}

exit;

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

/**
 * Creates a new edit request token
 */
function createEditToken($conex, $userId) {
    $orderId = isset($_POST['orderId']) ? intval($_POST['orderId']) : null;
    $reason = isset($_POST['reason']) ? trim($_POST['reason']) : null;

    if (!$orderId || !$reason) {
        return ['success' => false, 'message' => 'Order ID and reason are required'];
    }

    // Verify order exists and user can request edit
    $stmt = $conex->prepare("
        SELECT pf.id, pf.user_id, pf.cost_euros 
        FROM PremiumFreight pf 
        WHERE pf.id = ?
    ");
    $stmt->bind_param('i', $orderId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        return ['success' => false, 'message' => 'Order not found'];
    }

    $order = $result->fetch_assoc();

    // Verify user can request edit (must be creator or authorized)
    if ($order['user_id'] != $userId) {
        return ['success' => false, 'message' => 'Unauthorized to request edit for this order'];
    }

    // Generate unique token
    $token = bin2hex(random_bytes(32));

    // Create token record
    $sql = "
        INSERT INTO EmailEditTokens 
        (token, order_id, user_id, reason, type) 
        VALUES (?, ?, ?, ?, 'EDIT_REQUEST')
    ";

    $stmt = $conex->prepare($sql);
    if (!$stmt) {
        return ['success' => false, 'message' => 'Database error: ' . $conex->error];
    }

    $stmt->bind_param('siss', $token, $orderId, $userId, $reason);

    if (!$stmt->execute()) {
        return ['success' => false, 'message' => 'Failed to create edit request: ' . $conex->error];
    }

    $tokenId = $stmt->insert_id;

    // Log audit
    logAuditAction($conex, $tokenId, $orderId, $userId, 'EDIT_REQUEST_CREATED', $reason);

    return [
        'success' => true,
        'message' => 'Edit request created successfully',
        'tokenId' => $tokenId,
        'token' => $token,
        'orderId' => $orderId
    ];
}

/**
 * Approves an edit request (releases token for editing)
 */
function approveEditRequest($conex, $data) {
    $tokenId = isset($data['tokenId']) ? intval($data['tokenId']) : null;
    $releasedBy = isset($data['releasedBy']) ? intval($data['releasedBy']) : null;

    if (!$tokenId || !$releasedBy) {
        return ['success' => false, 'message' => 'Token ID and releaser user ID required'];
    }

    // Verify user 36 is the one releasing
    if ($releasedBy != 36) {
        return ['success' => false, 'message' => 'Only user 36 can approve edit requests'];
    }

    // Get token
    $stmt = $conex->prepare("SELECT * FROM EmailEditTokens WHERE id = ?");
    $stmt->bind_param('i', $tokenId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        return ['success' => false, 'message' => 'Token not found'];
    }

    $token = $result->fetch_assoc();

    if ($token['is_used']) {
        return ['success' => false, 'message' => 'Token already used'];
    }

    // Update token status
    $approvalToken = bin2hex(random_bytes(32));
    $sql = "
        UPDATE EmailEditTokens 
        SET released_by = ?, released_at = NOW(), type = 'EDIT_APPROVAL', token = ?
        WHERE id = ?
    ";

    $stmt = $conex->prepare($sql);
    $stmt->bind_param('isi', $releasedBy, $approvalToken, $tokenId);

    if (!$stmt->execute()) {
        return ['success' => false, 'message' => 'Failed to approve edit request'];
    }

    // Log audit
    logAuditAction(
        $conex,
        $tokenId,
        $token['order_id'],
        $token['user_id'],
        'EDIT_REQUEST_APPROVED',
        null,
        $releasedBy
    );

    return [
        'success' => true,
        'message' => 'Edit request approved',
        'approvalToken' => $approvalToken,
        'orderId' => $token['order_id']
    ];
}

/**
 * Validates if a token is valid for editing
 */
function validateToken($conex, $token, $orderId) {
    if (!$token || !$orderId) {
        return ['success' => false, 'message' => 'Token and Order ID required'];
    }

    $orderId = intval($orderId);

    $stmt = $conex->prepare("
        SELECT * FROM EmailEditTokens 
        WHERE token = ? AND order_id = ?
    ");
    $stmt->bind_param('si', $token, $orderId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        return ['success' => false, 'message' => 'Invalid token for this order'];
    }

    $tokenRecord = $result->fetch_assoc();

    // Check if already used
    if ($tokenRecord['is_used']) {
        return ['success' => false, 'message' => 'Token has already been used'];
    }

    // Check if approved by user 36
    if (!$tokenRecord['released_by'] || $tokenRecord['released_by'] != 36) {
        return ['success' => false, 'message' => 'Token not approved for editing'];
    }

    return [
        'success' => true,
        'message' => 'Token is valid',
        'tokenId' => $tokenRecord['id'],
        'orderId' => $tokenRecord['order_id'],
        'userId' => $tokenRecord['user_id']
    ];
}

/**
 * Marks token as used after successful submission
 */
function markTokenAsUsed($conex, $tokenId) {
    if (!$tokenId) {
        return ['success' => false, 'message' => 'Token ID required'];
    }

    $tokenId = intval($tokenId);

    $sql = "UPDATE EmailEditTokens SET is_used = 1, used_at = NOW() WHERE id = ?";
    $stmt = $conex->prepare($sql);
    $stmt->bind_param('i', $tokenId);

    if (!$stmt->execute()) {
        return ['success' => false, 'message' => 'Failed to mark token as used'];
    }

    return ['success' => true, 'message' => 'Token marked as used'];
}

/**
 * Gets order details for edit form
 */
function getOrderDetailsForEdit($conex, $orderId) {
    if (!$orderId) {
        return ['success' => false, 'message' => 'Order ID required'];
    }

    $orderId = intval($orderId);

    $sql = "
        SELECT 
            pf.*,
            u.name as creator_name,
            u.email as creator_email
        FROM PremiumFreight pf
        LEFT JOIN User u ON pf.user_id = u.id
        WHERE pf.id = ?
    ";

    $stmt = $conex->prepare($sql);
    $stmt->bind_param('i', $orderId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        return ['success' => false, 'message' => 'Order not found'];
    }

    return [
        'success' => true,
        'data' => $result->fetch_assoc()
    ];
}

/**
 * Gets audit log for order edits
 */
function getEditAuditLog($conex, $orderId) {
    if (!$orderId) {
        return ['success' => false, 'message' => 'Order ID required'];
    }

    $orderId = intval($orderId);

    $sql = "
        SELECT 
            eal.*,
            u_requested.name as requested_by_name,
            u_action.name as action_by_name
        FROM EditRequestAuditLog eal
        LEFT JOIN User u_requested ON eal.requested_by = u_requested.id
        LEFT JOIN User u_action ON eal.action_by = u_action.id
        WHERE eal.order_id = ?
        ORDER BY eal.timestamp DESC
    ";

    $stmt = $conex->prepare($sql);
    $stmt->bind_param('i', $orderId);
    $stmt->execute();
    $result = $stmt->get_result();

    $logs = [];
    while ($row = $result->fetch_assoc()) {
        $logs[] = $row;
    }

    return [
        'success' => true,
        'data' => $logs,
        'orderId' => $orderId
    ];
}

/**
 * Logs audit action
 */
function logAuditAction($conex, $tokenId, $orderId, $requestedBy, $action, $reason = null, $actionBy = null) {
    try {
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';

        $sql = "
            INSERT INTO EditRequestAuditLog 
            (token_id, order_id, requested_by, reason, action, action_by, ip_address)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ";

        $stmt = $conex->prepare($sql);
        $stmt->bind_param('iissisi', $tokenId, $orderId, $requestedBy, $reason, $action, $actionBy, $ipAddress);

        return $stmt->execute();
    } catch (Exception $e) {
        error_log("Audit log error: " . $e->getMessage());
        return false;
    }
}
?>