<?php
/**
 * daoWeeklyKPIs.php - CORREGIDO
 * 
 * Endpoint específico para obtener las estadísticas detalladas semanales
 * que alimentan la tabla de KPIs detallados del dashboard.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

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

    // Configurar el rango de fechas (semana actual por defecto)
    $endDate = date('Y-m-d H:i:s'); // Fecha y hora actual
    $startDate = date('Y-m-d H:i:s', strtotime('last monday', strtotime($endDate)));

    // Si se pasan parámetros de fecha, usarlos
    if (isset($_GET['start_date']) && isset($_GET['end_date'])) {
        $startDate = $_GET['start_date'] . ' 00:00:00';
        $endDate = $_GET['end_date'] . ' 23:59:59';
    }

    // Parámetro de planta adicional
    $filterPlant = isset($_GET['plant']) ? $_GET['plant'] : null;

    // ================== ESTADÍSTICAS GENERALES ==================
    
    $orderStatsSql = "SELECT 
                        COUNT(pf.id) as total_generated,
                        SUM(CASE WHEN st.name IN ('approved', 'aprobado') THEN 1 ELSE 0 END) as approved_count,
                        SUM(CASE WHEN st.name IN ('rejected', 'rechazado') THEN 1 ELSE 0 END) as rejected_count,
                        SUM(CASE WHEN st.name NOT IN ('approved', 'aprobado', 'rejected', 'rechazado') THEN 1 ELSE 0 END) as pending_count,
                        SUM(CASE WHEN st.name IN ('approved', 'aprobado') THEN COALESCE(pf.cost_euros, 0) ELSE 0 END) as total_cost
                    FROM PremiumFreight pf
                    LEFT JOIN Status st ON pf.status_id = st.id
                    LEFT JOIN User u ON pf.user_id = u.id
                    WHERE pf.date BETWEEN ? AND ?";
    
    // Construir parámetros dinámicamente
    $params = [$startDate, $endDate];
    $paramTypes = "ss";
    
    // Filtrar por planta del usuario si tiene una específica
    if ($userPlant !== null && $userPlant !== '') {
        $orderStatsSql .= " AND u.plant = ?";
        $params[] = $userPlant;
        $paramTypes .= "s";
    }
    
    // Filtrar por planta adicional si se especifica
    if ($filterPlant !== null && $filterPlant !== '') {
        $orderStatsSql .= " AND u.plant = ?";
        $params[] = $filterPlant;
        $paramTypes .= "s";
    }
    
    $stmt = $conex->prepare($orderStatsSql);
    if (!$stmt) {
        throw new Exception("Error preparing order stats query: " . $conex->error);
    }
    
    $stmt->bind_param($paramTypes, ...$params);
    $stmt->execute();
    $orderStats = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    // Inicializar con valores por defecto si no hay datos
    if (!$orderStats) {
        $orderStats = [
            'total_generated' => 0,
            'approved_count' => 0,
            'rejected_count' => 0,
            'pending_count' => 0,
            'total_cost' => 0
        ];
    }

    // Asegurar que los valores sean numéricos
    $orderStats['total_generated'] = (int)($orderStats['total_generated'] ?? 0);
    $orderStats['approved_count'] = (int)($orderStats['approved_count'] ?? 0);
    $orderStats['rejected_count'] = (int)($orderStats['rejected_count'] ?? 0);
    $orderStats['pending_count'] = (int)($orderStats['pending_count'] ?? 0);
    $orderStats['total_cost'] = (float)($orderStats['total_cost'] ?? 0);

    // Calcular approval rate
    $approved = $orderStats['approved_count'];
    $rejected = $orderStats['rejected_count'];
    $totalProcessed = $approved + $rejected;
    $approvalRate = ($totalProcessed > 0) ? round(($approved / $totalProcessed) * 100, 1) : 0;

    // ================== TOP REQUESTING USER ==================
    
    $topUserSql = "SELECT 
                        u.name, 
                        COUNT(pf.id) as request_count,
                        SUM(COALESCE(pf.cost_euros, 0)) as total_cost
                    FROM PremiumFreight pf
                    JOIN User u ON pf.user_id = u.id
                    LEFT JOIN Status st ON pf.status_id = st.id
                    WHERE pf.date BETWEEN ? AND ? 
                    AND st.name IN ('approved', 'aprobado')";
    
    // Reconstruir parámetros para esta consulta
    $userParams = [$startDate, $endDate];
    $userParamTypes = "ss";
    
    if ($userPlant !== null && $userPlant !== '') {
        $topUserSql .= " AND u.plant = ?";
        $userParams[] = $userPlant;
        $userParamTypes .= "s";
    }
    
    if ($filterPlant !== null && $filterPlant !== '') {
        $topUserSql .= " AND u.plant = ?";
        $userParams[] = $filterPlant;
        $userParamTypes .= "s";
    }
    
    $topUserSql .= " GROUP BY pf.user_id, u.name
                     ORDER BY request_count DESC
                     LIMIT 1";
    
    $stmt = $conex->prepare($topUserSql);
    $topUser = null;
    if ($stmt) {
        $stmt->bind_param($userParamTypes, ...$userParams);
        $stmt->execute();
        $topUser = $stmt->get_result()->fetch_assoc();
        $stmt->close();
    }

    // Inicializar con valores por defecto si no hay datos
    if (!$topUser) {
        $topUser = [
            'name' => 'N/A',
            'request_count' => 0,
            'total_cost' => 0
        ];
    }

    // ================== TOP SPENDING AREA ==================
    
    $topAreaSql = "SELECT 
                        COALESCE(pf.area, u.plant, 'Unknown Area') as area, 
                        SUM(COALESCE(pf.cost_euros, 0)) as total_spent,
                        COUNT(pf.id) as request_count
                    FROM PremiumFreight pf
                    JOIN User u ON pf.user_id = u.id
                    LEFT JOIN Status st ON pf.status_id = st.id
                    WHERE pf.date BETWEEN ? AND ? 
                    AND st.name IN ('approved', 'aprobado')";
    
    // Reconstruir parámetros para esta consulta
    $areaParams = [$startDate, $endDate];
    $areaParamTypes = "ss";
    
    if ($userPlant !== null && $userPlant !== '') {
        $topAreaSql .= " AND u.plant = ?";
        $areaParams[] = $userPlant;
        $areaParamTypes .= "s";
    }
    
    if ($filterPlant !== null && $filterPlant !== '') {
        $topAreaSql .= " AND u.plant = ?";
        $areaParams[] = $filterPlant;
        $areaParamTypes .= "s";
    }
    
    $topAreaSql .= " GROUP BY COALESCE(pf.area, u.plant)
                     ORDER BY total_spent DESC
                     LIMIT 1";
    
    $stmt = $conex->prepare($topAreaSql);
    $topArea = null;
    if ($stmt) {
        $stmt->bind_param($areaParamTypes, ...$areaParams);
        $stmt->execute();
        $topArea = $stmt->get_result()->fetch_assoc();
        $stmt->close();
    }

    // Inicializar con valores por defecto si no hay datos
    if (!$topArea) {
        $topArea = [
            'area' => 'N/A',
            'total_spent' => 0
        ];
    }

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
    
    // Reconstruir parámetros para esta consulta
    $timeParams = [$startDate, $endDate];
    $timeParamTypes = "ss";
    
    if ($userPlant !== null && $userPlant !== '') {
        $avgTimeSql .= " AND u.plant = ?";
        $timeParams[] = $userPlant;
        $timeParamTypes .= "s";
    }
    
    if ($filterPlant !== null && $filterPlant !== '') {
        $avgTimeSql .= " AND u.plant = ?";
        $timeParams[] = $filterPlant;
        $timeParamTypes .= "s";
    }
    
    $stmt = $conex->prepare($avgTimeSql);
    $avgTimeResult = null;
    if ($stmt) {
        $stmt->bind_param($timeParamTypes, ...$timeParams);
        $stmt->execute();
        $avgTimeResult = $stmt->get_result()->fetch_assoc();
        $stmt->close();
    }
    
    $avgApprovalTime = 'N/A';
    $avgApprovalTimeSeconds = null;
    if ($avgTimeResult && $avgTimeResult['avg_total_seconds'] !== null) {
        $avgApprovalTimeSeconds = (float)$avgTimeResult['avg_total_seconds'];
        $avgApprovalTime = formatTime($avgApprovalTimeSeconds);
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
    
    // Reconstruir parámetros para esta consulta
    $slowestParams = [$startDate, $endDate];
    $slowestParamTypes = "ss";
    
    if ($userPlant !== null && $userPlant !== '') {
        $slowestApproverSql .= " AND u_creator.plant = ?";
        $slowestParams[] = $userPlant;
        $slowestParamTypes .= "s";
    }
    
    if ($filterPlant !== null && $filterPlant !== '') {
        $slowestApproverSql .= " AND u_creator.plant = ?";
        $slowestParams[] = $filterPlant;
        $slowestParamTypes .= "s";
    }
    
    $slowestApproverSql .= " GROUP BY u_approver.name
                            HAVING COUNT(pfa.id) >= 2
                            ORDER BY avg_duration_seconds DESC
                            LIMIT 1";
    
    $stmt = $conex->prepare($slowestApproverSql);
    $slowestApprover = null;
    if ($stmt) {
        $stmt->bind_param($slowestParamTypes, ...$slowestParams);
        $stmt->execute();
        $slowestApprover = $stmt->get_result()->fetch_assoc();
        $stmt->close();
    }
    
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

    // ================== DATOS PARA GRÁFICAS - TOP PERFORMERS ==================
    
    $topPerformersSql = "SELECT 
                            u.name,
                            COUNT(pf.id) as approved_requests,
                            SUM(COALESCE(pf.cost_euros, 0)) as total_cost
                        FROM PremiumFreight pf
                        JOIN User u ON pf.user_id = u.id
                        LEFT JOIN Status st ON pf.status_id = st.id
                        WHERE pf.date BETWEEN ? AND ?
                        AND st.name IN ('approved', 'aprobado')";
    
    // Reconstruir parámetros para esta consulta
    $performersParams = [$startDate, $endDate];
    $performersParamTypes = "ss";
    
    if ($userPlant !== null && $userPlant !== '') {
        $topPerformersSql .= " AND u.plant = ?";
        $performersParams[] = $userPlant;
        $performersParamTypes .= "s";
    }
    
    if ($filterPlant !== null && $filterPlant !== '') {
        $topPerformersSql .= " AND u.plant = ?";
        $performersParams[] = $filterPlant;
        $performersParamTypes .= "s";
    }
    
    $topPerformersSql .= " GROUP BY pf.user_id, u.name
                          ORDER BY approved_requests DESC
                          LIMIT 10";
    
    $topPerformers = [];
    $stmt = $conex->prepare($topPerformersSql);
    if ($stmt) {
        $stmt->bind_param($performersParamTypes, ...$performersParams);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $topPerformers[] = $row;
        }
        $stmt->close();
    }

    // ================== DATOS PARA GRÁFICAS - AREA PERFORMANCE ==================
    
    $areaPerformanceSql = "SELECT 
                                COALESCE(pf.area, 'Unknown Area') as area_name,
                                COUNT(pf.id) as total_requests,
                                SUM(COALESCE(pf.cost_euros, 0)) as total_cost
                            FROM PremiumFreight pf
                            JOIN User u ON pf.user_id = u.id
                            LEFT JOIN Status st ON pf.status_id = st.id
                            WHERE pf.date BETWEEN ? AND ?
                            AND st.name IN ('approved', 'aprobado')";
    
    // Reconstruir parámetros para esta consulta
    $areaPerformanceParams = [$startDate, $endDate];
    $areaPerformanceParamTypes = "ss";
    
    if ($userPlant !== null && $userPlant !== '') {
        $areaPerformanceSql .= " AND u.plant = ?";
        $areaPerformanceParams[] = $userPlant;
        $areaPerformanceParamTypes .= "s";
    }
    
    if ($filterPlant !== null && $filterPlant !== '') {
        $areaPerformanceSql .= " AND u.plant = ?";
        $areaPerformanceParams[] = $filterPlant;
        $areaPerformanceParamTypes .= "s";
    }
    
    $areaPerformanceSql .= " GROUP BY COALESCE(pf.area, 'Unknown Area')
                            ORDER BY total_cost DESC";
    
    $areaPerformance = [];
    $stmt = $conex->prepare($areaPerformanceSql);
    if ($stmt) {
        $stmt->bind_param($areaPerformanceParamTypes, ...$areaPerformanceParams);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $areaPerformance[] = $row;
        }
        $stmt->close();
    }

    // ================== DATOS PARA GRÁFICAS - APPROVAL TIME DISTRIBUTION ==================
    
    $approvalTimesSql = "SELECT 
                            CASE 
                                WHEN TIMESTAMPDIFF(HOUR, pf.date, pfa.approval_date) <= 24 THEN 'Within 1 Day'
                                WHEN TIMESTAMPDIFF(HOUR, pf.date, pfa.approval_date) <= 72 THEN '1-3 Days'
                                WHEN TIMESTAMPDIFF(HOUR, pf.date, pfa.approval_date) <= 168 THEN '3-7 Days'
                                ELSE 'More than 1 Week'
                            END as time_category,
                            COUNT(*) as count,
                            AVG(TIMESTAMPDIFF(HOUR, pf.date, pfa.approval_date)) as avg_hours
                        FROM PremiumFreight pf
                        JOIN PremiumFreightApprovals pfa ON pf.id = pfa.premium_freight_id
                        JOIN User u ON pf.user_id = u.id
                        LEFT JOIN Status st ON pf.status_id = st.id
                        WHERE pf.date BETWEEN ? AND ?
                        AND st.name IN ('approved', 'aprobado')
                        AND pfa.approval_date IS NOT NULL";
    
    // Reconstruir parámetros para esta consulta
    $approvalTimesParams = [$startDate, $endDate];
    $approvalTimesParamTypes = "ss";
    
    if ($userPlant !== null && $userPlant !== '') {
        $approvalTimesSql .= " AND u.plant = ?";
        $approvalTimesParams[] = $userPlant;
        $approvalTimesParamTypes .= "s";
    }
    
    if ($filterPlant !== null && $filterPlant !== '') {
        $approvalTimesSql .= " AND u.plant = ?";
        $approvalTimesParams[] = $filterPlant;
        $approvalTimesParamTypes .= "s";
    }
    
    $approvalTimesSql .= " GROUP BY time_category
                          ORDER BY FIELD(time_category, 'Within 1 Day', '1-3 Days', '3-7 Days', 'More than 1 Week')";
    
    $approvalTimes = [];
    $stmt = $conex->prepare($approvalTimesSql);
    if ($stmt) {
        $stmt->bind_param($approvalTimesParamTypes, ...$approvalTimesParams);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $approvalTimes[] = $row;
        }
        $stmt->close();
    }

    // ================== DATOS PARA GRÁFICAS - DAILY COST ANALYSIS ==================
    
    $dailyCostSql = "SELECT 
                        DATE(pf.date) as approval_date,
                        SUM(COALESCE(pf.cost_euros, 0)) as daily_cost,
                        COUNT(pf.id) as daily_count
                    FROM PremiumFreight pf
                    JOIN User u ON pf.user_id = u.id
                    LEFT JOIN Status st ON pf.status_id = st.id
                    WHERE pf.date BETWEEN ? AND ?
                    AND st.name IN ('approved', 'aprobado')";
    
    // Reconstruir parámetros para esta consulta
    $dailyCostParams = [$startDate, $endDate];
    $dailyCostParamTypes = "ss";
    
    if ($userPlant !== null && $userPlant !== '') {
        $dailyCostSql .= " AND u.plant = ?";
        $dailyCostParams[] = $userPlant;
        $dailyCostParamTypes .= "s";
    }
    
    if ($filterPlant !== null && $filterPlant !== '') {
        $dailyCostSql .= " AND u.plant = ?";
        $dailyCostParams[] = $filterPlant;
        $dailyCostParamTypes .= "s";
    }
    
    $dailyCostSql .= " GROUP BY DATE(pf.date)
                      ORDER BY DATE(pf.date)";
    
    $dailyCosts = [];
    $stmt = $conex->prepare($dailyCostSql);
    if ($stmt) {
        $stmt->bind_param($dailyCostParamTypes, ...$dailyCostParams);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $dailyCosts[] = $row;
        }
        $stmt->close();
    }

    // ================== PREPARAR RESPUESTA ==================
    
    $response = [
        'status' => 'success',
        'data' => [
            // Estadísticas generales
            'total_generated' => $orderStats['total_generated'],
            'total_pending' => $orderStats['pending_count'],
            'total_approved' => $orderStats['approved_count'],
            'total_rejected' => $orderStats['rejected_count'],
            'total_cost' => $orderStats['total_cost'],
            'approval_rate' => $approvalRate,
            
            // Tiempos promedio
            'average_approval_time' => $avgApprovalTime,
            'average_approval_time_seconds' => $avgApprovalTimeSeconds,
            
            // Top performers y áreas
            'top_requesting_user' => $topUser,
            'top_spending_area' => $topArea,
            'slowest_approver' => $slowestApproverFormatted,
            
            // Datos para gráficas
            'top_performers' => $topPerformers,
            'area_performance' => $areaPerformance,
            'approval_times_distribution' => $approvalTimes,
            'daily_costs' => $dailyCosts
        ],
        'meta' => [
            'date_range' => [
                'start' => $startDate,
                'end' => $endDate
            ],
            'filters' => [
                'user_plant' => $userPlant,
                'filter_plant' => $filterPlant
            ],
            'user_info' => [
                'plant' => $userPlant,
                'authorization_level' => $userAuthLevel
            ]
        ]
    ];

    // Si todos los datos principales están vacíos, agrega un mensaje
    if (
        $orderStats['total_generated'] == 0 &&
        $orderStats['approved_count'] == 0 &&
        $orderStats['rejected_count'] == 0 &&
        $orderStats['total_cost'] == 0
    ) {
        $response['message'] = 'No data available for the selected plant and date range.';
    }

    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    $conex->close();

} catch (Exception $e) {
    error_log("Error in daoWeeklyKPIs.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage(),
        'debug' => [
            'file' => __FILE__,
            'line' => __LINE__,
            'user_session' => isset($_SESSION['user']) ? 'exists' : 'missing'
        ]
    ]);
}

/**
 * Formatea segundos en una cadena legible (Días, Horas, Minutos)
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