<?php
/**
 * daoWeeklyKPIs.php
 * 
 * Endpoint específico para obtener las estadísticas detalladas semanales
 * que alimentan la tabla de KPIs detallados del dashboard.
 * 
 * Este endpoint replica la funcionalidad de PFWeeklyReporter.php
 * pero adaptado para trabajar con la estructura del dashboard actual.
 * 
 * @author      GRAMMER AG
 * @since       2025-07-28
 */

header('Content-Type: application/json');
include_once('../db/PFDB.php');

// Verificar que el usuario esté autenticado
session_start();
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'User not authenticated']);
    exit;
}

$userPlant = isset($_SESSION['user']['plant']) ? $_SESSION['user']['plant'] : null;
$userAuthLevel = isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null;

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->set_charset("utf8mb4");

    // Configurar el rango de fechas (últimos 7 días por defecto)
    $endDate = date('Y-m-d H:i:s');
    $startDate = date('Y-m-d H:i:s', strtotime('-7 days'));

    // Si se pasan parámetros de fecha, usarlos
    if (isset($_GET['start_date']) && isset($_GET['end_date'])) {
        $startDate = $_GET['start_date'] . ' 00:00:00';
        $endDate = $_GET['end_date'] . ' 23:59:59';
    }

    // ================== ESTADÍSTICAS GENERALES ==================
    
    $orderStatsSql = "SELECT 
                        COUNT(pf.id) as total_generated,
                        SUM(CASE WHEN st.name IN ('approved', 'aprobado') THEN 1 ELSE 0 END) as approved_count,
                        SUM(CASE WHEN st.name IN ('rejected', 'rechazado') THEN 1 ELSE 0 END) as rejected_count,
                        SUM(CASE WHEN st.name NOT IN ('approved', 'aprobado', 'rejected', 'rechazado') THEN 1 ELSE 0 END) as pending_count,
                        SUM(CASE WHEN st.name IN ('approved', 'aprobado') THEN pf.cost_euros ELSE 0 END) as total_cost
                    FROM PremiumFreight pf
                    LEFT JOIN Status st ON pf.status_id = st.id
                    LEFT JOIN User u ON pf.user_id = u.id
                    WHERE pf.date BETWEEN ? AND ?";
    
    // Filtrar por planta si el usuario tiene una específica
    if ($userPlant !== null && $userPlant !== '') {
        $orderStatsSql .= " AND u.plant = ?";
    }
    
    $stmt = $conex->prepare($orderStatsSql);
    if ($userPlant !== null && $userPlant !== '') {
        $stmt->bind_param("sss", $startDate, $endDate, $userPlant);
    } else {
        $stmt->bind_param("ss", $startDate, $endDate);
    }
    
    $stmt->execute();
    $orderStats = $stmt->get_result()->fetch_assoc();

    // Calcular approval rate
    $approved = $orderStats['approved_count'] ?? 0;
    $rejected = $orderStats['rejected_count'] ?? 0;
    $totalProcessed = $approved + $rejected;
    $approvalRate = ($totalProcessed > 0) ? round(($approved / $totalProcessed) * 100, 1) : 0;

    // ================== TOP REQUESTING USER ==================
    
    $topUserSql = "SELECT 
                        u.name, 
                        COUNT(pf.id) as request_count,
                        SUM(pf.cost_euros) as total_cost
                    FROM PremiumFreight pf
                    JOIN User u ON pf.user_id = u.id
                    LEFT JOIN Status st ON pf.status_id = st.id
                    WHERE pf.date BETWEEN ? AND ? 
                    AND st.name IN ('approved', 'aprobado')";
    
    if ($userPlant !== null && $userPlant !== '') {
        $topUserSql .= " AND u.plant = ?";
    }
    
    $topUserSql .= " GROUP BY pf.user_id, u.name
                     ORDER BY request_count DESC
                     LIMIT 1";
    
    $stmt = $conex->prepare($topUserSql);
    if ($userPlant !== null && $userPlant !== '') {
        $stmt->bind_param("sss", $startDate, $endDate, $userPlant);
    } else {
        $stmt->bind_param("ss", $startDate, $endDate);
    }
    
    $stmt->execute();
    $topUser = $stmt->get_result()->fetch_assoc();

    // ================== TOP SPENDING AREA ==================
    
    $topAreaSql = "SELECT 
                        COALESCE(pf.area, u.plant, 'Unknown Area') as area, 
                        SUM(pf.cost_euros) as total_spent,
                        COUNT(pf.id) as request_count
                    FROM PremiumFreight pf
                    JOIN User u ON pf.user_id = u.id
                    LEFT JOIN Status st ON pf.status_id = st.id
                    WHERE pf.date BETWEEN ? AND ? 
                    AND st.name IN ('approved', 'aprobado')";
    
    if ($userPlant !== null && $userPlant !== '') {
        $topAreaSql .= " AND u.plant = ?";
    }
    
    $topAreaSql .= " GROUP BY COALESCE(pf.area, u.plant)
                     ORDER BY total_spent DESC
                     LIMIT 1";
    
    $stmt = $conex->prepare($topAreaSql);
    if ($userPlant !== null && $userPlant !== '') {
        $stmt->bind_param("sss", $startDate, $endDate, $userPlant);
    } else {
        $stmt->bind_param("ss", $startDate, $endDate);
    }
    
    $stmt->execute();
    $topArea = $stmt->get_result()->fetch_assoc();

    // ================== AVERAGE APPROVAL TIME ==================
    
    $avgTimeSql = "SELECT 
                        AVG(TIMESTAMPDIFF(SECOND, pf.date, pfa.approval_date)) as avg_total_seconds
                    FROM PremiumFreight pf
                    JOIN PremiumFreightApprovals pfa ON pf.id = pfa.premium_freight_id
                    JOIN User u ON pf.user_id = u.id
                    LEFT JOIN Status st ON pf.status_id = st.id
                    WHERE pf.date BETWEEN ? AND ?
                    AND st.name IN ('approved', 'aprobado')
                    AND pfa.approval_date IS NOT NULL";
    
    if ($userPlant !== null && $userPlant !== '') {
        $avgTimeSql .= " AND u.plant = ?";
    }
    
    $stmt = $conex->prepare($avgTimeSql);
    if ($userPlant !== null && $userPlant !== '') {
        $stmt->bind_param("sss", $startDate, $endDate, $userPlant);
    } else {
        $stmt->bind_param("ss", $startDate, $endDate);
    }
    
    $stmt->execute();
    $avgTimeResult = $stmt->get_result()->fetch_assoc();
    
    $avgApprovalTime = 'N/A';
    if ($avgTimeResult && $avgTimeResult['avg_total_seconds'] !== null) {
        $avgApprovalTime = formatTime($avgTimeResult['avg_total_seconds']);
    }

    // ================== SLOWEST APPROVER ==================
    
    $slowestApproverSql = "SELECT 
                                u_approver.name,
                                AVG(TIMESTAMPDIFF(SECOND, pf.date, pfa.approval_date)) as avg_duration_seconds,
                                COUNT(pfa.id) as total_approvals
                            FROM PremiumFreightApprovals pfa
                            JOIN PremiumFreight pf ON pfa.premium_freight_id = pf.id
                            JOIN User u_approver ON pfa.user_id = u_approver.id
                            JOIN User u_creator ON pf.user_id = u_creator.id
                            LEFT JOIN Status st ON pf.status_id = st.id
                            WHERE pfa.approval_date BETWEEN ? AND ?
                            AND st.name IN ('approved', 'aprobado')
                            AND pfa.approval_date IS NOT NULL";
    
    if ($userPlant !== null && $userPlant !== '') {
        $slowestApproverSql .= " AND u_creator.plant = ?";
    }
    
    $slowestApproverSql .= " GROUP BY u_approver.name
                            HAVING COUNT(pfa.id) >= 2
                            ORDER BY avg_duration_seconds DESC
                            LIMIT 1";
    
    $stmt = $conex->prepare($slowestApproverSql);
    if ($userPlant !== null && $userPlant !== '') {
        $stmt->bind_param("sss", $startDate, $endDate, $userPlant);
    } else {
        $stmt->bind_param("ss", $startDate, $endDate);
    }
    
    $stmt->execute();
    $slowestApprover = $stmt->get_result()->fetch_assoc();
    
    $slowestApproverFormatted = [
        'name' => 'N/A',
        'duration_formatted' => 'N/A'
    ];
    
    if ($slowestApprover) {
        $slowestApproverFormatted = [
            'name' => $slowestApprover['name'],
            'duration_formatted' => formatTime($slowestApprover['avg_duration_seconds'])
        ];
    }

    // ================== PREPARAR RESPUESTA ==================
    
    $response = [
        'status' => 'success',
        'data' => [
            'total_generated' => (int)($orderStats['total_generated'] ?? 0),
            'total_pending' => (int)($orderStats['pending_count'] ?? 0),
            'total_approved' => (int)($orderStats['approved_count'] ?? 0),
            'total_rejected' => (int)($orderStats['rejected_count'] ?? 0),
            'total_cost' => (float)($orderStats['total_cost'] ?? 0),
            'approval_rate' => $approvalRate,
            'average_approval_time' => $avgApprovalTime,
            'top_requesting_user' => [
                'name' => $topUser['name'] ?? 'N/A',
                'request_count' => (int)($topUser['request_count'] ?? 0),
                'total_cost' => (float)($topUser['total_cost'] ?? 0)
            ],
            'top_spending_area' => [
                'area' => $topArea['area'] ?? 'N/A',
                'total_spent' => (float)($topArea['total_spent'] ?? 0)
            ],
            'slowest_approver' => $slowestApproverFormatted
        ],
        'date_range' => [
            'start' => $startDate,
            'end' => $endDate
        ],
        'user_info' => [
            'plant' => $userPlant,
            'authorization_level' => $userAuthLevel
        ]
    ];

    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    $stmt->close();
    $conex->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error', 
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}

/**
 * Formatea segundos en una cadena legible (Días, Horas, Minutos)
 * @param int $seconds
 * @return string
 */
function formatTime($seconds) {
    if ($seconds === null || $seconds < 0) return "N/A";
    if ($seconds < 60) return round($seconds) . "s";

    $days = floor($seconds / (3600 * 24));
    $hours = floor(($seconds % (3600 * 24)) / 3600);
    $minutes = floor(($seconds % 3600) / 60);

    $formatted = '';
    if ($days > 0) $formatted .= "{$days}d ";
    if ($hours > 0) $formatted .= "{$hours}h ";
    if ($minutes > 0) $formatted .= "{$minutes}m";
    
    return trim($formatted) ?: "0m";
}
?>