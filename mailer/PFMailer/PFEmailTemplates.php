<?php
/**
 * PFEmailTemplates.php - Plantillas HTML para correos de Premium Freight
 * 
 * Este archivo contiene todas las plantillas de correo electrónico utilizadas
 * en el sistema Premium Freight para notificaciones de aprobación, resúmenes
 * semanales y actualizaciones de estado.
 * 
 * @author GRAMMER AG
 * @version 2.1
 * @since 2025-06-02
 */

class PFEmailTemplates {
    private $baseUrl;
    
    /**
     * Constructor de la clase
     * 
     * @param string $baseUrl URL base para los enlaces en los correos
     */
    public function __construct($baseUrl) {
        $this->baseUrl = rtrim($baseUrl, '/') . '/';
    }
    
    /**
     * Plantilla para correo de aprobación individual
     * 
     * @param array $orderData Datos de la orden
     * @param string $approvalToken Token de aprobación
     * @param string $rejectToken Token de rechazo
     * @return string HTML del correo
     */
    public function getApprovalEmailTemplate($orderData, $approvalToken, $rejectToken) {
        // URLs para usar el endpoint individual
        $approveUrl = $this->baseUrl . "PFmailSingleAction.php?action=approve&token=$approvalToken";
        $rejectUrl = $this->baseUrl . "PFmailSingleAction.php?action=reject&token=$rejectToken";
        $viewOrderUrl = defined('URLPF') ? URLPF . "orders.php?highlight=" . $orderData['id'] : "#";
        
        // Formatear datos de manera segura
        $costEuros = number_format((float)($orderData['cost_euros'] ?? 0), 2);
        $orderDescription = htmlspecialchars($orderData['description'] ?? 'N/A', ENT_QUOTES, 'UTF-8');
        $creatorName = htmlspecialchars($orderData['creator_name'] ?? 'N/A', ENT_QUOTES, 'UTF-8');
        $plantaName = htmlspecialchars($orderData['planta'] ?? 'N/A', ENT_QUOTES, 'UTF-8');
        $formattedDate = date('M d, Y H:i', strtotime($orderData['date']));

        return '<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Premium Freight Approval Required</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style type="text/css">
        /* Estilos corporativos optimizados */
        body { margin: 0; padding: 0; background-color: #f4f4f4; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #1a4a72 0%, #2563eb 100%); padding: 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0 0 8px 0; font-size: 22px; font-weight: 600; }
        .header h2 { color: #e2e8f0; margin: 0; font-size: 16px; font-weight: 400; }
        .content { padding: 32px; }
        .section-title { color: #1e293b; margin: 0 0 16px 0; font-size: 18px; font-weight: 600; }
        .description { color: #64748b; margin: 0 0 24px 0; line-height: 1.6; font-size: 14px; }
        .details-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 20px 0; }
        .details-title { color: #0f172a; margin: 0 0 16px 0; font-size: 16px; font-weight: 600; border-bottom: 2px solid #1a4a72; padding-bottom: 8px; }
        .detail-row { padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #374151; font-weight: 500; width: 40%; display: inline-block; }
        .detail-value { color: #1f2937; float: right; font-weight: 400; }
        .detail-value.highlight { color: #1a4a72; font-weight: 600; }
        .detail-value.cost { color: #059669; font-weight: 600; font-size: 16px; }
        .actions-section { margin: 32px 0; text-align: center; }
        .actions-title { color: #1e293b; margin: 0 0 16px 0; font-size: 16px; font-weight: 600; }
        .actions-subtitle { color: #6b7280; margin: 0 0 20px 0; font-size: 12px; }
        .button-container { display: inline-block; margin: 0 6px; }
        .action-button { 
            display: inline-block; 
            padding: 12px 20px; 
            color: #ffffff !important; 
            text-decoration: none; 
            font-weight: 600; 
            font-size: 13px; 
            border-radius: 6px;
            transition: all 0.2s ease;
        }
        .approve-btn { background: linear-gradient(135deg, #059669 0%, #10b981 100%); box-shadow: 0 2px 4px rgba(5, 150, 105, 0.3); }
        .reject-btn { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); box-shadow: 0 2px 4px rgba(220, 38, 38, 0.3); }
        .view-btn { background: linear-gradient(135deg, #1a4a72 0%, #2563eb 100%); box-shadow: 0 2px 4px rgba(26, 74, 114, 0.3); }
        .info-box { background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 16px; margin: 24px 0; }
        .info-text { margin: 0; color: #92400e; font-size: 12px; line-height: 1.4; }
        .footer { background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer-text { color: #6b7280; margin: 0 0 6px 0; font-size: 11px; }
        .footer-copyright { color: #9ca3af; margin: 0; font-size: 10px; }
    </style>
</head>
<body>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
        <tr>
            <td style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" align="center">
                    
                    <!-- Header -->
                    <tr>
                        <td class="header" style="border-radius: 8px 8px 0 0;">
                            <h1>Premium Freight Approval Required</h1>
                            <h2>Order #' . $orderData['id'] . '</h2>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td class="content">
                            <h2 class="section-title">New Premium Freight Order Requires Your Approval</h2>
                            <p class="description">A new Premium Freight order has been submitted and requires your approval before processing. Please review the order details below and take the appropriate action.</p>
                            
                            <!-- Order Details -->
                            <div class="details-card">
                                <h3 class="details-title">Order Details</h3>
                                
                                <div class="detail-row">
                                    <span class="detail-label">Order ID:</span>
                                    <span class="detail-value highlight">#' . $orderData['id'] . '</span>
                                </div>
                                
                                <div class="detail-row">
                                    <span class="detail-label">Description:</span>
                                    <span class="detail-value">' . $orderDescription . '</span>
                                </div>
                                
                                <div class="detail-row">
                                    <span class="detail-label">Requested by:</span>
                                    <span class="detail-value">' . $creatorName . '</span>
                                </div>
                                
                                <div class="detail-row">
                                    <span class="detail-label">Date Created:</span>
                                    <span class="detail-value">' . $formattedDate . '</span>
                                </div>
                                
                                <div class="detail-row">
                                    <span class="detail-label">Area/Department:</span>
                                    <span class="detail-value">' . $plantaName . '</span>
                                </div>
                                
                                <div class="detail-row">
                                    <span class="detail-label">Estimated Cost:</span>
                                    <span class="detail-value cost">EUR ' . $costEuros . '</span>
                                </div>
                            </div>
                            
                            <!-- Action Buttons -->
                            <div class="actions-section">
                                <h3 class="actions-title">Required Action</h3>
                                <p class="actions-subtitle">Please select one of the following options to process this order:</p>
                                
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                                    <tr>
                                        <td class="button-container">
                                            <a href="' . $approveUrl . '" class="action-button approve-btn">APPROVE ORDER</a>
                                        </td>
                                        <td class="button-container">
                                            <a href="' . $rejectUrl . '" class="action-button reject-btn">REJECT ORDER</a>
                                        </td>
                                        <td class="button-container">
                                            <a href="' . $viewOrderUrl . '" class="action-button view-btn">VIEW DETAILS</a>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- Important Notice -->
                            <div class="info-box">
                                <p class="info-text">
                                    <strong>Important:</strong> This approval request will expire in 72 hours. After expiration, the requester will need to submit a new approval request.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td class="footer" style="border-radius: 0 0 8px 8px;">
                            <p class="footer-text">This is an automated notification from the Premium Freight Management System.</p>
                            <p class="footer-text">Please do not reply to this email. For support, contact your system administrator.</p>
                            <p class="footer-copyright">© ' . date('Y') . ' GRAMMER AG - Premium Freight Management System</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>';
    }

    /**
     * Plantilla para correo resumen semanal
     * 
     * @param array $orders Lista de órdenes pendientes
     * @param array $approver Datos del aprobador
     * @param string $approveAllToken Token para aprobar todas
     * @param string $rejectAllToken Token para rechazar todas
     * @return string HTML del correo
     */
    public function getWeeklySummaryTemplate($orders, $approver, $approveAllToken, $rejectAllToken) {
        // URLs para acciones en bloque
        $approveAllUrl = $this->baseUrl . "PFmailBulkAction.php?action=approve&token=$approveAllToken";
        $rejectAllUrl = $this->baseUrl . "PFmailBulkAction.php?action=reject&token=$rejectAllToken";
        
        // Calcular estadísticas
        $totalOrders = count($orders);
        $totalCost = array_sum(array_column($orders, 'cost_euros'));
        $avgCost = $totalOrders > 0 ? $totalCost / $totalOrders : 0;
        
        // Formatear datos del aprobador
        $approverName = htmlspecialchars($approver['name'] ?? 'N/A', ENT_QUOTES, 'UTF-8');
        
        // Generar filas de órdenes
        $orderRows = $this->generateOrderRows($orders, $approver['id']);

        return '<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Weekly Premium Freight Summary</title>
    <style type="text/css">
        /* Estilos corporativos para resumen semanal */
        body { margin: 0; padding: 0; background-color: #f4f4f4; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; }
        .email-container { max-width: 800px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #1a4a72 0%, #2563eb 100%); padding: 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0 0 8px 0; font-size: 24px; font-weight: 600; }
        .header-subtitle { color: #e2e8f0; margin: 0; font-size: 14px; font-weight: 400; }
        .header-date { color: #cbd5e1; margin: 8px 0 0 0; font-size: 12px; }
        .content { padding: 32px; }
        .stats-card { background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; margin: 20px 0; }
        .stats-title { color: #0f172a; margin: 0 0 16px 0; font-size: 16px; font-weight: 600; border-bottom: 2px solid #1a4a72; padding-bottom: 8px; }
        .stats-grid { display: table; width: 100%; }
        .stats-row { display: table-row; }
        .stats-cell { display: table-cell; padding: 12px 0; width: 50%; vertical-align: middle; }
        .stat-item { text-align: left; }
        .stat-item.right { text-align: right; }
        .stat-label { color: #374151; font-size: 14px; font-weight: 500; }
        .stat-value { color: #1a4a72; font-size: 18px; font-weight: 600; margin-top: 4px; }
        .stat-value.cost { color: #059669; }
        .bulk-actions { background-color: #ffffff; border: 2px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center; }
        .bulk-title { color: #1e293b; margin: 0 0 12px 0; font-size: 16px; font-weight: 600; }
        .bulk-subtitle { color: #6b7280; margin: 0 0 20px 0; font-size: 13px; }
        .bulk-button { 
            display: inline-block; 
            padding: 14px 24px; 
            color: #ffffff !important; 
            text-decoration: none; 
            font-weight: 600; 
            border-radius: 6px;
            margin: 0 8px;
            font-size: 13px;
        }
        .approve-all-btn { background: linear-gradient(135deg, #059669 0%, #10b981 100%); box-shadow: 0 3px 6px rgba(5, 150, 105, 0.4); }
        .reject-all-btn { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); box-shadow: 0 3px 6px rgba(220, 38, 38, 0.4); }
        .bulk-warning { color: #6b7280; font-size: 11px; margin: 12px 0 0 0; }
        .orders-section { margin: 30px 0; }
        .section-title { color: #1e293b; margin: 0 0 12px 0; font-size: 16px; font-weight: 600; }
        .section-subtitle { color: #6b7280; margin: 0 0 16px 0; font-size: 13px; }
        .orders-table { width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; }
        .orders-table th { 
            background: linear-gradient(135deg, #1a4a72 0%, #2563eb 100%); 
            color: #ffffff; 
            padding: 12px 8px; 
            text-align: left; 
            font-size: 11px; 
            font-weight: 600; 
            text-transform: uppercase;
        }
        .orders-table td { padding: 12px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
        .order-id { color: #1a4a72; font-weight: 600; text-align: center; }
        .order-desc { color: #374151; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .order-area { color: #6b7280; }
        .order-cost { color: #059669; font-weight: 600; text-align: center; }
        .order-date { color: #9ca3af; font-size: 11px; text-align: center; }
        .order-actions { text-align: center; }
        .order-btn { 
            display: block; 
            padding: 6px 10px; 
            color: #ffffff; 
            text-decoration: none; 
            border-radius: 4px; 
            font-size: 10px; 
            font-weight: 600; 
            margin-bottom: 4px;
            text-transform: uppercase;
        }
        .order-approve { background-color: #059669; }
        .order-reject { background-color: #dc2626; }
        .order-view { background-color: #1a4a72; }
        .info-box { background-color: #dbeafe; border: 1px solid #93c5fd; border-radius: 6px; padding: 16px; margin: 24px 0; }
        .info-text { margin: 0; color: #1e3a8a; font-size: 12px; line-height: 1.4; }
        .footer { background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer-text { color: #6b7280; margin: 0 0 6px 0; font-size: 11px; }
        .footer-copyright { color: #9ca3af; margin: 0; font-size: 10px; }
    </style>
</head>
<body>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
        <tr>
            <td style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="800" class="email-container" style="margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" align="center">
                    
                    <!-- Header -->
                    <tr>
                        <td class="header" style="border-radius: 8px 8px 0 0;">
                            <h1>Weekly Premium Freight Summary</h1>
                            <p class="header-subtitle">Hello ' . $approverName . ', you have <strong>' . $totalOrders . '</strong> orders pending your approval</p>
                            <p class="header-date">Week ending: ' . date('F d, Y') . '</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td class="content">
                            
                            <!-- Statistics -->
                            <div class="stats-card">
                                <h3 class="stats-title">Summary Statistics</h3>
                                <div class="stats-grid">
                                    <div class="stats-row">
                                        <div class="stats-cell">
                                            <div class="stat-item">
                                                <div class="stat-label">Total Orders</div>
                                                <div class="stat-value">' . $totalOrders . '</div>
                                            </div>
                                        </div>
                                        <div class="stats-cell">
                                            <div class="stat-item right">
                                                <div class="stat-label">Total Value</div>
                                                <div class="stat-value cost">EUR ' . number_format($totalCost, 2) . '</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="stats-row" style="border-top: 1px solid #cbd5e1;">
                                        <div class="stats-cell" colspan="2" style="text-align: center; padding-top: 16px;">
                                            <div class="stat-label">Average Order Value</div>
                                            <div class="stat-value">EUR ' . number_format($avgCost, 2) . '</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Bulk Actions -->
                            <div class="bulk-actions">
                                <h3 class="bulk-title">Quick Actions</h3>
                                <p class="bulk-subtitle">Process all orders at once with a single click:</p>
                                
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                                    <tr>
                                        <td>
                                            <a href="' . $approveAllUrl . '" class="bulk-button approve-all-btn">APPROVE ALL ORDERS</a>
                                        </td>
                                        <td>
                                            <a href="' . $rejectAllUrl . '" class="bulk-button reject-all-btn">REJECT ALL ORDERS</a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p class="bulk-warning">
                                    Bulk actions will affect all ' . $totalOrders . ' orders listed below
                                </p>
                            </div>
                            
                            <!-- Orders Table -->
                            <div class="orders-section">
                                <h3 class="section-title">Orders Requiring Your Approval</h3>
                                <p class="section-subtitle">Review each order individually or use the bulk actions above:</p>
                                
                                <table class="orders-table">
                                    <thead>
                                        <tr>
                                            <th style="width: 10%;">Order #</th>
                                            <th style="width: 35%;">Description</th>
                                            <th style="width: 15%;">Area</th>
                                            <th style="width: 12%;">Cost</th>
                                            <th style="width: 12%;">Created</th>
                                            <th style="width: 16%;">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ' . $orderRows . '
                                    </tbody>
                                </table>
                            </div>
                            
                            <!-- Important Notice -->
                            <div class="info-box">
                                <p class="info-text">
                                    <strong>Reminder:</strong> These approval requests will expire in 72 hours. Orders not processed will require new approval requests from their creators.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td class="footer" style="border-radius: 0 0 8px 8px;">
                            <p class="footer-text">This is an automated weekly summary from the Premium Freight Management System.</p>
                            <p class="footer-text">Please do not reply to this email. For support, contact your system administrator.</p>
                            <p class="footer-copyright">© ' . date('Y') . ' GRAMMER AG - Premium Freight Management System</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>';
    }

    /**
     * Plantilla para notificación de estado (aprobado/rechazado)
     * 
     * @param array $orderData Datos de la orden
     * @param string $status Estado (approved/rejected)
     * @param array|null $rejectorInfo Información del usuario que rechazó (solo para rechazos)
     * @return string HTML del correo
     */
    public function getStatusNotificationTemplate($orderData, $status, $rejectorInfo = null) {
        $viewOrderUrl = defined('URLPF') ? URLPF . "orders.php?highlight=" . $orderData['id'] : "#";
        $costEuros = number_format((float)($orderData['cost_euros'] ?? 0), 2);
        
        // Formatear datos de manera segura
        $orderDescription = htmlspecialchars($orderData['description'] ?? 'N/A', ENT_QUOTES, 'UTF-8');
        $creatorName = htmlspecialchars($orderData['creator_name'] ?? 'N/A', ENT_QUOTES, 'UTF-8');
        $plantaName = htmlspecialchars($orderData['planta'] ?? 'N/A', ENT_QUOTES, 'UTF-8');
        $formattedDate = date('M d, Y H:i', strtotime($orderData['date']));

        if ($status === 'approved') {
            $statusMessage = "<strong>Great news!</strong> Your Premium Freight order has been <strong style='color: #059669;'>approved</strong>.";
            $statusDetail = "Your request has been processed and approved. You can now proceed with the Premium Freight shipment.";
            $statusColor = "#059669";
            $statusTitle = "Order Approved";
            $statusBg = "#d1fae5";
            $statusBorder = "#86efac";
            $nextSteps = "You can now proceed with your Premium Freight shipment. Contact the logistics team if you need assistance with scheduling or documentation.";
        } else {
            $statusMessage = "Your Premium Freight order has been <strong style='color: #dc2626;'>rejected</strong>.";
            $statusDetail = "Unfortunately, your Premium Freight request could not be approved.";
            if ($rejectorInfo) {
                $rejectorName = htmlspecialchars($rejectorInfo['name'] ?? 'Unknown', ENT_QUOTES, 'UTF-8');
                $statusDetail .= " Rejection was processed by " . $rejectorName . ".";
            }
            $statusDetail .= " Please review the order details and consider submitting a new request if needed.";
            $statusColor = "#dc2626";
            $statusTitle = "Order Rejected";
            $statusBg = "#fee2e2";
            $statusBorder = "#fca5a5";
            $nextSteps = "If you believe this rejection was made in error or have questions, please contact your supervisor or the Premium Freight team for clarification.";
        }

        return '<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Premium Freight Order Status Update</title>
    <style type="text/css">
        /* Estilos corporativos para notificación de estado */
        body { margin: 0; padding: 0; background-color: #f4f4f4; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: ' . $statusColor . '; padding: 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0 0 8px 0; font-size: 22px; font-weight: 600; }
        .header h2 { color: rgba(255,255,255,0.9); margin: 0; font-size: 16px; font-weight: 400; }
        .content { padding: 32px; }
        .section-title { color: #1e293b; margin: 0 0 16px 0; font-size: 18px; font-weight: 600; }
        .status-card { background-color: ' . $statusBg . '; border: 1px solid ' . $statusBorder . '; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
        .status-message { margin: 0 0 10px 0; color: #374151; line-height: 1.6; font-size: 16px; }
        .status-detail { margin: 0; color: #6b7280; line-height: 1.6; font-size: 14px; }
        .details-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 20px 0; }
        .details-title { color: #0f172a; margin: 0 0 16px 0; font-size: 16px; font-weight: 600; border-bottom: 2px solid #1a4a72; padding-bottom: 8px; }
        .detail-row { padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #374151; font-weight: 500; width: 40%; display: inline-block; }
        .detail-value { color: #1f2937; float: right; font-weight: 400; }
        .detail-value.highlight { color: #1a4a72; font-weight: 600; }
        .detail-value.cost { color: #059669; font-weight: 600; font-size: 16px; }
        .view-button { 
            display: inline-block; 
            padding: 12px 24px; 
            background: linear-gradient(135deg, #1a4a72 0%, #2563eb 100%); 
            color: #ffffff !important; 
            text-decoration: none; 
            font-weight: 600; 
            border-radius: 6px;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(26, 74, 114, 0.3);
        }
        .next-steps { background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 16px; margin: 24px 0; }
        .next-steps-title { margin: 0 0 8px 0; color: #1e40af; font-size: 14px; font-weight: 600; }
        .next-steps-text { margin: 0; color: #1e40af; font-size: 12px; line-height: 1.4; }
        .footer { background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer-text { color: #6b7280; margin: 0 0 6px 0; font-size: 11px; }
        .footer-copyright { color: #9ca3af; margin: 0; font-size: 10px; }
    </style>
</head>
<body>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
        <tr>
            <td style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" align="center">
                    
                    <!-- Header -->
                    <tr>
                        <td class="header" style="border-radius: 8px 8px 0 0;">
                            <h1>' . $statusTitle . '</h1>
                            <h2>Order #' . $orderData['id'] . '</h2>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td class="content">
                            <h2 class="section-title">Order Status Update</h2>
                            
                            <!-- Status Message -->
                            <div class="status-card">
                                <p class="status-message">' . $statusMessage . '</p>
                                <p class="status-detail">' . $statusDetail . '</p>
                            </div>
                            
                            <!-- Order Details -->
                            <div class="details-card">
                                <h3 class="details-title">Order Details</h3>
                                
                                <div class="detail-row">
                                    <span class="detail-label">Order ID:</span>
                                    <span class="detail-value highlight">#' . $orderData['id'] . '</span>
                                </div>
                                
                                <div class="detail-row">
                                    <span class="detail-label">Description:</span>
                                    <span class="detail-value">' . $orderDescription . '</span>
                                </div>
                                
                                <div class="detail-row">
                                    <span class="detail-label">Requested by:</span>
                                    <span class="detail-value">' . $creatorName . '</span>
                                </div>
                                
                                <div class="detail-row">
                                    <span class="detail-label">Date Created:</span>
                                    <span class="detail-value">' . $formattedDate . '</span>
                                </div>
                                
                                <div class="detail-row">
                                    <span class="detail-label">Area/Department:</span>
                                    <span class="detail-value">' . $plantaName . '</span>
                                </div>
                                
                                <div class="detail-row">
                                    <span class="detail-label">Cost:</span>
                                    <span class="detail-value cost">EUR ' . $costEuros . '</span>
                                </div>
                            </div>
                            
                            <!-- View Order Button -->
                            <div style="text-align: center;">
                                <a href="' . $viewOrderUrl . '" class="view-button">VIEW ORDER DETAILS</a>
                            </div>
                            
                            <!-- Next Steps -->
                            <div class="next-steps">
                                <h4 class="next-steps-title">Next Steps:</h4>
                                <p class="next-steps-text">' . $nextSteps . '</p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td class="footer" style="border-radius: 0 0 8px 8px;">
                            <p class="footer-text">This is an automated notification from the Premium Freight Management System.</p>
                            <p class="footer-text">Please do not reply to this email. For support, contact your system administrator.</p>
                            <p class="footer-copyright">© ' . date('Y') . ' GRAMMER AG - Premium Freight Management System</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>';
    }

    /**
     * Genera las filas de órdenes para el resumen semanal
     * 
     * @param array $orders Lista de órdenes
     * @param int $approverId ID del aprobador
     * @return string HTML de las filas
     */
    private function generateOrderRows($orders, $approverId) {
        $orderRows = '';
        $rowCount = 0;
        
        foreach ($orders as $order) {
            $rowCount++;
            $rowBgColor = ($rowCount % 2 === 0) ? '#f8fafc' : '#ffffff';
            
            // Formatear datos de manera segura
            $costFormatted = number_format((float)($order['cost_euros'] ?? 0), 2);
            $createdDate = date('M d, Y', strtotime($order['date']));
            $orderDescription = htmlspecialchars($order['description'] ?? 'N/A', ENT_QUOTES, 'UTF-8');
            $plantaName = htmlspecialchars($order['planta'] ?? 'N/A', ENT_QUOTES, 'UTF-8');
            
            // Generar tokens para acciones individuales
            $approveToken = $this->generateActionToken($order['id'], $approverId, 'approve');
            $rejectToken = $this->generateActionToken($order['id'], $approverId, 'reject');
            
            // URLs para usar PFmailSingleAction.php
            $approveUrl = $this->baseUrl . "PFmailSingleAction.php?action=approve&token=$approveToken";
            $rejectUrl = $this->baseUrl . "PFmailSingleAction.php?action=reject&token=$rejectToken";
            $viewUrl = defined('URLPF') ? URLPF . "orders.php?highlight=" . $order['id'] : "#";
            
            $orderRows .= '
            <tr style="background-color: ' . $rowBgColor . ';">
                <td class="order-id">#' . $order['id'] . '</td>
                <td class="order-desc" title="' . $orderDescription . '">' . $orderDescription . '</td>
                <td class="order-area">' . $plantaName . '</td>
                <td class="order-cost">EUR ' . $costFormatted . '</td>
                <td class="order-date">' . $createdDate . '</td>
                <td class="order-actions">
                    <a href="' . $approveUrl . '" class="order-btn order-approve">Approve</a>
                    <a href="' . $rejectUrl . '" class="order-btn order-reject">Reject</a>
                    <a href="' . $viewUrl . '" class="order-btn order-view">View</a>
                </td>
            </tr>';
        }
        return $orderRows;
    }

    /**
     * Genera un token de acción individual
     * 
     * @param int $orderId ID de la orden
     * @param int $userId ID del usuario
     * @param string $action Tipo de acción (approve/reject)
     * @return string Token generado
     */
    private function generateActionToken($orderId, $userId, $action) {
        try {
            // Crear una instancia temporal de servicios para generar el token
            require_once 'PFEmailServices.php';
            $services = new PFEmailServices();
            return $services->generateActionToken($orderId, $userId, $action);
        } catch (Exception $e) {
            // Log del error y retornar un token temporal
            if (function_exists('logAction')) {
                logAction("Error generando token: " . $e->getMessage(), 'EMAILTEMPLATES');
            }
            return 'error_' . md5($orderId . $userId . $action . time());
        }
    }
}
?>
<script>
let actionInProgress = false;

document.addEventListener('click', function(e) {
    if (e.target.tagName === 'A' && (e.target.href.includes('approve') || e.target.href.includes('reject'))) {
        if (actionInProgress) {
            e.preventDefault();
            return false;
        }
        actionInProgress = true;
        
        // Desactivar después de 10 segundos por si acaso
        setTimeout(() => { actionInProgress = false; }, 10000);
    }
});
</script>