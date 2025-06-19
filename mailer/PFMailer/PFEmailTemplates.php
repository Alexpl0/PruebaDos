<?php
/**
 * PFEmailTemplates.php - Plantillas HTML para correos de Premium Freight
 * 
 * @author GRAMMER AG
 * @version 2.3 - Corregido generación de tokens individuales
 */

class PFEmailTemplates {
    private $baseUrl;
    private $baseUrlPF;  // ✅ AGREGAR esta propiedad
    private $services;
    
    /**
     * Constructor de la clase
     */
    public function __construct($baseUrl, $baseUrlPF = null) {
        $this->baseUrl = rtrim($baseUrl, '/') . '/';
        
        // ✅ CORREGIDO: Definir baseUrlPF
        if ($baseUrlPF) {
            $this->baseUrlPF = rtrim($baseUrlPF, '/') . '/';
        } else {
            // Fallback: usar URLPF si está definida, sino asumir que es igual a baseUrl
            $this->baseUrlPF = defined('URLPF') ? URLPF : $this->baseUrl;
        }
        
        // Inicializar servicios para generar tokens
        require_once 'PFEmailServices.php';
        $this->services = new PFEmailServices();
    }
    
    /**
     * Plantilla para correo de aprobación individual
     */
    public function getApprovalEmailTemplate($orderData, $approvalToken, $rejectToken) {
        // CORREGIDO: URLs actualizadas - ahora apuntan directamente a view_order.php
        $viewOrderUrl = $this->baseUrlPF . "view_order.php?order=" . $orderData['id'];
        
        // URLs directas para acciones rápidas (mantener como alternativa)
        $approveUrl = $this->baseUrl . "PFmailSingleAction.php?action=approve&token=$approvalToken";
        $rejectUrl = $this->baseUrl . "PFmailSingleAction.php?action=reject&token=$rejectToken";
        
        // Formatear datos de manera segura
        $costEuros = number_format((float)($orderData['cost_euros'] ?? 0), 2);
        $orderDescription = htmlspecialchars($orderData['description'] ?? 'N/A', ENT_QUOTES, 'UTF-8');
        $creatorName = htmlspecialchars($orderData['creator_name'] ?? 'N/A', ENT_QUOTES, 'UTF-8');
        $plantaName = htmlspecialchars($orderData['planta'] ?? 'N/A', ENT_QUOTES, 'UTF-8');
        $areaName = htmlspecialchars($orderData['area'] ?? '', ENT_QUOTES, 'UTF-8');
        
        // Formatear el nombre con área si está disponible
        $requestedBy = $creatorName;
        if (!empty($areaName)) {
            $requestedBy .= ' (' . $areaName . ')';
        }
        
        $formattedDate = date('M d, Y H:i', strtotime($orderData['date']));

        return '<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Premium Freight Approval Required</title>
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap" rel="stylesheet">
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
        body { margin: 0; padding: 0; background-color: #f4f4f4; font-family: Georgia, "Times New Roman", serif; }
        .email-container { max-width: 650px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: #034C8C; padding: 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0 0 8px 0; font-size: 22px; font-weight: 700; font-family: Georgia, serif; }
        .header h2 { color: #e2e8f0; margin: 0; font-size: 16px; font-weight: 400; font-family: Georgia, serif; }
        .content { padding: 32px; font-family: Georgia, serif; }
        .section-title { color: #1e293b; margin: 0 0 16px 0; font-size: 18px; font-weight: 700; font-family: Georgia, serif; }
        .description { color: #64748b; margin: 0 0 24px 0; line-height: 1.6; font-size: 14px; font-family: Georgia, serif; }
        .details-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 20px 0; }
        .details-title { color: #0f172a; margin: 0 0 16px 0; font-size: 16px; font-weight: 700; border-bottom: 2px solid #034C8C; padding-bottom: 8px; font-family: Georgia, serif; }
        .detail-row { padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #374151; font-weight: 500; width: 40%; display: inline-block; font-family: Georgia, serif; }
        .detail-value { color: #1f2937; float: right; font-weight: 400; font-family: Georgia, serif; }
        .detail-value.highlight { color: #034C8C; font-weight: 700; font-family: Georgia, serif; }
        .detail-value.cost { color: #059669; font-weight: 700; font-size: 16px; font-family: Georgia, serif; }
        .actions-section { margin: 32px 0; text-align: center; }
        .actions-title { color: #1e293b; margin: 0 0 16px 0; font-size: 16px; font-weight: 700; font-family: Georgia, serif; }
        .actions-subtitle { color: #6b7280; margin: 0 0 20px 0; font-size: 12px; font-family: Georgia, serif; }
        .button-container { display: inline-block; margin: 0 4px; vertical-align: top; }
        .action-button { 
            display: inline-block; 
            padding: 12px 18px; 
            text-decoration: none; 
            font-weight: bold; 
            font-size: 12px; 
            border-radius: 6px;
            text-align: center;
            border: 2px solid transparent;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            font-family: Georgia, serif;
            min-width: 90px;
        }
        .approve-btn { 
            background-color: #059669 !important; 
            color: #ffffff !important; 
            border-color: #047857 !important;
        }
        .approve-btn:hover { 
            background-color: #047857 !important; 
        }
        .reject-btn { 
            background-color: #dc2626 !important; 
            color: #ffffff !important; 
            border-color: #b91c1c !important;
        }
        .reject-btn:hover { 
            background-color: #b91c1c !important; 
        }
        .view-btn { 
            background-color: #1e40af !important; 
            color: #ffffff !important; 
            border-color: #1d4ed8 !important;
        }
        .view-btn:hover { 
            background-color: #1d4ed8 !important; 
        }
        /* Estilos específicos para Outlook */
        .action-button[style*="background"] {
            color: #ffffff !important;
        }
        .info-box { background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 16px; margin: 24px 0; }
        .info-text { margin: 0; color: #92400e; font-size: 12px; line-height: 1.4; font-family: Georgia, serif; }
        .footer { background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer-text { color: #6b7280; margin: 0 0 6px 0; font-size: 11px; font-family: Georgia, serif; }
        .footer-copyright { color: #9ca3af; margin: 0; font-size: 10px; font-family: Georgia, serif; }
    </style>
</head>
<body>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
        <tr>
            <td style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="650" class="email-container" style="margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" align="center">
                    
                    <!-- Header -->
                    <tr>
                        <td class="header" style="border-radius: 8px 8px 0 0;">
                            <h1>Approval Required</h1>
                            <h2>Order #' . $orderData['id'] . '</h2>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td class="content">
                            <h2 class="section-title">Premium Freight Authorization Request</h2>
                            <p class="description">A new Premium Freight order requires your approval. Please review the details below and take the appropriate action.</p>
                            
                            <!-- Order Details -->
                            <div class="details-card">
                                <h3 class="details-title">Order Information</h3>
                                
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
                                    <span class="detail-value">' . $requestedBy . '</span>
                                </div>
                                
                                <div class="detail-row">
                                    <span class="detail-label">Plant:</span>
                                    <span class="detail-value">' . $plantaName . '</span>
                                </div>
                                
                                <div class="detail-row">
                                    <span class="detail-label">Cost:</span>
                                    <span class="detail-value cost">€' . $costEuros . '</span>
                                </div>
                                
                                <div class="detail-row">
                                    <span class="detail-label">Date:</span>
                                    <span class="detail-value">' . $formattedDate . '</span>
                                </div>
                            </div>
                            
                            <!-- New: Single View Order Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="' . $viewOrderUrl . '" style="background-color: #034C8C !important; color: #ffffff !important; padding: 16px 32px; text-decoration: none; font-weight: bold; border-radius: 8px; border: 2px solid #023b6a; text-transform: uppercase; display: inline-block; font-size: 16px;">
                                    📋 VIEW ORDER & TAKE ACTION
                                </a>
                            </div>
                            
                            <!-- Quick Actions Section -->
                            <div class="actions-section">
                                <h3 class="actions-title">Quick Actions</h3>
                                <p class="actions-subtitle">Click the button above to view full details, or use these quick action buttons:</p>
                                
                                <div style="text-align: center;">
                                    <!--[if mso]>
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                                        <tr>
                                            <td style="padding: 0 8px;">
                                    <![endif]-->
                                    <a href="' . $approveUrl . '" class="action-button approve-btn" style="background-color: #28a745 !important; color: #ffffff !important; padding: 14px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; border: 2px solid #1e7e34 !important; text-transform: uppercase; display: inline-block; margin: 8px;">✓ APPROVE</a>
                                    <!--[if mso]>
                                            </td>
                                            <td style="padding: 0 8px;">
                                    <![endif]-->
                                    <a href="' . $rejectUrl . '" class="action-button reject-btn" style="background-color: #dc3545 !important; color: #ffffff !important; padding: 14px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; border: 2px solid #bd2130 !important; text-transform: uppercase; display: inline-block; margin: 8px;">✗ REJECT</a>
                                    <!--[if mso]>
                                            </td>
                                        </tr>
                                    </table>
                                    <![endif]-->
                                </div>
                            </div>
                            
                            <!-- Info Box -->
                            <div class="info-box">
                                <p class="info-text">
                                    <strong>Note:</strong> This approval request will expire in 7 days. 
                                    If no action is taken, you will receive weekly reminders until the order is processed.
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
     * Plantilla para correo resumen semanal - CORREGIDA
     */
    public function getWeeklySummaryTemplate($orders, $approver, $approveAllToken, $rejectAllToken) {
        // URLs para acciones en bloque
        $approveAllUrl = $this->baseUrl . "PFmailBulkAction.php?action=approve&token=$approveAllToken";
        $rejectAllUrl = $this->baseUrl . "PFmailBulkAction.php?action=reject&token=$rejectAllToken";
        
        // URL para ver todas las órdenes en modo bulk
        $viewAllOrdersUrl = $this->baseUrl . "view_bulk_orders.php?user=" . $approver['id'] . "&token=$approveAllToken";
        
        // Calcular estadísticas
        $totalOrders = count($orders);
        $totalCost = array_sum(array_column($orders, 'cost_euros'));
        $avgCost = $totalOrders > 0 ? $totalCost / $totalOrders : 0;
        
        // Formatear datos del aprobador
        $approverName = htmlspecialchars($approver['name'] ?? 'N/A', ENT_QUOTES, 'UTF-8');
        
        // Generar filas de órdenes con token bulk como fallback
        $orderRows = $this->generateOrderRows($orders, $approver['id'], $approveAllToken);

        return '<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Weekly Premium Freight Summary</title>
    <style type="text/css">
        /* Estilos corporativos para resumen semanal */
        body { margin: 0; padding: 0; background-color: #f4f4f4; font-family: Georgia, "Times New Roman", serif; }
        .email-container { max-width: 850px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: #034C8C; padding: 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0 0 8px 0; font-size: 24px; font-weight: 700; font-family: Georgia, serif; }
        .header-subtitle { color: #e2e8f0; margin: 0; font-size: 14px; font-weight: 400; font-family: Georgia, serif; }
        .header-date { color: #cbd5e1; margin: 8px 0 0 0; font-size: 12px; font-family: Georgia, serif; }
        .content { padding: 32px; font-family: Georgia, serif; }
        .stats-card { background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; margin: 20px 0; }
        .stats-title { color: #0f172a; margin: 0 0 20px 0; font-size: 16px; font-weight: 700; border-bottom: 2px solid #034C8C; padding-bottom: 8px; font-family: Georgia, serif; }
        
        /* Estadísticas en una fila */
        .stats-row { width: 100%; }
        .stats-row table { width: 100%; border-collapse: collapse; }
        .stats-cell { width: 33.33%; text-align: center; padding: 0 15px; vertical-align: top; }
        .stat-box { background-color: #ffffff; border: 1px solid #d1d5db; border-radius: 6px; padding: 16px; margin: 0; }
        .stat-label { color: #374151; font-size: 12px; font-weight: 500; margin-bottom: 6px; font-family: Georgia, serif; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-value { color: #034C8C; font-size: 22px; font-weight: 700; margin: 0; font-family: Georgia, serif; }
        .stat-value.cost { color: #059669; font-family: Georgia, serif; }
        
        .bulk-actions { background-color: #ffffff; border: 2px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center; }
        .bulk-title { color: #1e293b; margin: 0 0 12px 0; font-size: 16px; font-weight: 700; font-family: Georgia, serif; }
        .bulk-subtitle { color: #6b7280; margin: 0 0 20px 0; font-size: 13px; font-family: Georgia, serif; }
        .bulk-button { display: inline-block; margin: 0 8px; padding: 14px 28px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px; transition: all 0.2s ease; font-family: Georgia, serif; }
        .approve-all-btn { background-color: #059669; color: #ffffff; border: 2px solid #059669; }
        .approve-all-btn:hover { background-color: #047857; border-color: #047857; }
        .reject-all-btn { background-color: #dc2626; color: #ffffff; border: 2px solid #dc2626; }
        .reject-all-btn:hover { background-color: #b91c1c; border-color: #b91c1c; }
        .view-all-btn { background-color: #034C8C; color: #ffffff; border: 2px solid #034C8C; }
        .view-all-btn:hover { background-color: #023b6a; border-color: #023b6a; }
        .bulk-warning { color: #6b7280; font-size: 11px; margin: 12px 0 0 0; font-family: Georgia, serif; }
        .orders-section { margin: 30px 0; }
        .section-title { color: #1e293b; margin: 0 0 12px 0; font-size: 16px; font-weight: 700; font-family: Georgia, serif; }
    </style>
</head>
<body>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
        <tr>
            <td align="center">
                <div class="email-container">
                    <!-- Header -->
                    <div class="header">
                        <h1>Weekly Premium Freight Summary</h1>
                        <div class="header-subtitle">Pending Approvals for ' . $approverName . '</div>
                        <div class="header-date">' . date('F j, Y') . '</div>
                    </div>

                    <!-- Content -->
                    <div class="content">
                        <!-- Statistics -->
                        <div class="stats-card">
                            <div class="stats-title">📊 Summary Statistics</div>
                            <div class="stats-row">
                                <table>
                                    <tr>
                                        <td class="stats-cell">
                                            <div class="stat-box">
                                                <div class="stat-label">Total Orders</div>
                                                <div class="stat-value">' . $totalOrders . '</div>
                                            </div>
                                        </td>
                                        <td class="stats-cell">
                                            <div class="stat-box">
                                                <div class="stat-label">Total Cost</div>
                                                <div class="stat-value cost">€' . number_format($totalCost, 2) . '</div>
                                            </div>
                                        </td>
                                        <td class="stats-cell">
                                            <div class="stat-box">
                                                <div class="stat-label">Average Cost</div>
                                                <div class="stat-value cost">€' . number_format($avgCost, 2) . '</div>
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </div>

                        <!-- Bulk Actions -->
                        <div class="bulk-actions">
                            <div class="bulk-title">⚡ Quick Actions</div>
                            <div class="bulk-subtitle">Process all orders at once or review them individually</div>
                            <a href="' . $viewAllOrdersUrl . '" class="bulk-button view-all-btn">📋 View All Orders</a>
                            <a href="' . $approveAllUrl . '" class="bulk-button approve-all-btn">✅ Approve All</a>
                            <a href="' . $rejectAllUrl . '" class="bulk-button reject-all-btn">❌ Reject All</a>
                            <div class="bulk-warning">
                                ⚠️ Bulk actions will process all orders listed below. Use "View All Orders" to review individually.
                            </div>
                        </div>

                        <!-- Orders List -->
                        <div class="orders-section">
                            <div class="section-title">📋 Orders Requiring Your Approval</div>
                            ' . $orderRows . '
                        </div>
                    </div>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>';
    }

    /**
     * Plantilla para notificación de estado (aprobado/rechazado)
     */
    public function getStatusNotificationTemplate($orderData, $status, $rejectorInfo = null) {
        // CORREGIDO: Cambiar a view_order.php
        $viewOrderUrl = $this->baseUrlPF . "view_order.php?order=" . $orderData['id'];
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
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap" rel="stylesheet">
    <style type="text/css">
        /* Estilos corporativos para notificación de estado */
        body { margin: 0; padding: 0; background-color: #f4f4f4; font-family: Georgia, "Times New Roman", serif; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: ' . $statusColor . '; padding: 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0 0 8px 0; font-size: 22px; font-weight: 700; font-family: Georgia, serif; }
        .header h2 { color: rgba(255,255,255,0.9); margin: 0; font-size: 16px; font-weight: 400; font-family: Georgia, serif; }
        .content { padding: 32px; font-family: Georgia, serif; }
        .section-title { color: #1e293b; margin: 0 0 16px 0; font-size: 18px; font-weight: 700; font-family: Georgia, serif; }
        .status-card { background-color: ' . $statusBg . '; border: 1px solid ' . $statusBorder . '; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
        .status-message { margin: 0 0 10px 0; color: #374151; line-height: 1.6; font-size: 16px; font-family: Georgia, serif; }
        .status-detail { margin: 0; color: #6b7280; line-height: 1.6; font-size: 14px; font-family: Georgia, serif; }
        .details-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 20px 0; }
        .details-title { color: #0f172a; margin: 0 0 16px 0; font-size: 16px; font-weight: 700; border-bottom: 2px solid #034C8C; padding-bottom: 8px; font-family: Georgia, serif; }
        .detail-row { padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #374151; font-weight: 500; width: 40%; display: inline-block; font-family: Georgia, serif; }
        .detail-value { color: #1f2937; float: right; font-weight: 400; font-family: Georgia, serif; }
        .detail-value.highlight { color: #034C8C; font-weight: 700; font-family: Georgia, serif; }
        .detail-value.cost { color: #059669; font-weight: 700; font-size: 16px; font-family: Georgia, serif; }
        .view-button { 
            display: inline-block; 
            padding: 14px 24px; 
            background-color: #3b82f6 !important; 
            color: #ffffff !important; 
            text-decoration: none; 
            font-weight: bold; 
            border-radius: 6px;
            margin: 20px 0;
            border: 2px solid #2563eb !important;
            text-transform: uppercase;
            font-family: Georgia, serif;
        }
        .next-steps { background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 16px; margin: 24px 0; }
        .next-steps-title { margin: 0 0 8px 0; color: #1e40af; font-size: 14px; font-weight: 700; font-family: Georgia, serif; }
        .next-steps-text { margin: 0; color: #1e40af; font-size: 12px; line-height: 1.4; font-family: Georgia, serif; }
        .footer { background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer-text { color: #6b7280; margin: 0 0 6px 0; font-size: 11px; font-family: Georgia, serif; }
        .footer-copyright { color: #9ca3af; margin: 0; font-size: 10px; font-family: Georgia, serif; }
    </style>
</head>
<body>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
        <tr>
            <td style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" align="center">
                    
                    <!-- Header -->
                    <tr>
                        <td class="header" style="border-radius: 8px 8px 0 0; background-color: ' . $statusColor . ';">
                            <h1 style="font-family: Georgia, serif; color: #ffffff; margin: 0 0 8px 0; font-size: 22px; font-weight: 700;">' . $statusTitle . '</h1>
                            <h2 style="font-family: Georgia, serif; color: rgba(255,255,255,0.9); margin: 0; font-size: 16px; font-weight: 400;">Order #' . $orderData['id'] . '</h2>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td class="content" style="font-family: Georgia, serif;">
                            <h2 class="section-title" style="font-family: Georgia, serif;">Order Status Update</h2>
                            
                            <!-- Status Message -->
                            <div class="status-card">
                                <p class="status-message" style="font-family: Georgia, serif;">' . $statusMessage . '</p>
                                <p class="status-detail" style="font-family: Georgia, serif;">' . $statusDetail . '</p>
                            </div>
                            
                            <!-- Order Details -->
                            <div class="details-card">
                                <h3 class="details-title" style="font-family: Georgia, serif;">Order Details</h3>
                                
                                <div class="detail-row">
                                    <span class="detail-label" style="font-family: Georgia, serif;">Order ID:</span>
                                    <span class="detail-value highlight" style="font-family: Georgia, serif;">#' . $orderData['id'] . '</span>
                                </div>
                                
                                <div class="detail-row">
                                    <span class="detail-label" style="font-family: Georgia, serif;">Description:</span>
                                    <span class="detail-value" style="font-family: Georgia, serif;">' . $orderDescription . '</span>
                                </div>
                                
                                <div class="detail-row">
                                    <span class="detail-label" style="font-family: Georgia, serif;">Requested by:</span>
                                    <span class="detail-value" style="font-family: Georgia, serif;">' . $creatorName . '</span>
                                </div>
                                
                                <div class="detail-row">
                                    <span class="detail-label" style="font-family: Georgia, serif;">Date Created:</span>
                                    <span class="detail-value" style="font-family: Georgia, serif;">' . $formattedDate . '</span>
                                </div>
                                
                                <div class="detail-row">
                                    <span class="detail-label" style="font-family: Georgia, serif;">Plant:</span>
                                    <span class="detail-value" style="font-family: Georgia, serif;">' . $plantaName . '</span>
                                </div>
                                
                                <div class="detail-row">
                                    <span class="detail-label" style="font-family: Georgia, serif;">Cost:</span>
                                    <span class="detail-value cost" style="font-family: Georgia, serif;">EUR ' . $costEuros . '</span>
                                </div>
                            </div>
                            
                            <!-- View Order Button -->
                            <div style="text-align: center;">
                                <a href="' . $viewOrderUrl . '" style="background-color: #3b82f6 !important; color: #ffffff !important; padding: 14px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; border: 2px solid #2563eb; text-transform: uppercase; display: inline-block; font-family: Georgia, serif;">VIEW ORDER DETAILS</a>
                            </div>
                            
                            <!-- Next Steps -->
                            <div class="next-steps">
                                <h4 class="next-steps-title" style="font-family: Georgia, serif;">Next Steps:</h4>
                                <p class="next-steps-text" style="font-family: Georgia, serif;">' . $nextSteps . '</p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td class="footer" style="border-radius: 0 0 8px 8px;">
                            <p class="footer-text" style="font-family: Georgia, serif;">This is an automated notification from the Premium Freight Management System.</p>
                            <p class="footer-text" style="font-family: Georgia, serif;">Please do not reply to this email. For support, contact your system administrator.</p>
                            <p class="footer-copyright" style="font-family: Georgia, serif;">© ' . date('Y') . ' GRAMMER AG - Premium Freight Management System</p>
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
     * Plantilla para correo de verificación de recovery evidence
     * 
     * @param array $user Datos del usuario
     * @param array $orders Órdenes que necesitan recovery evidence
     * @return string HTML del correo
     */
    public function getRecoveryCheckTemplate($user, $orders) {
        // CORREGIDO: URLs actualizadas
        $viewOrdersUrl = $this->baseUrlPF . "orders.php";
        $totalOrders = count($orders);
        $userName = htmlspecialchars($user['name'] ?? 'N/A', ENT_QUOTES, 'UTF-8');
        
        // Generar filas de órdenes
        $orderRows = '';
        foreach ($orders as $order) {
            $costFormatted = number_format((float)($order['cost_euros'] ?? 0), 2);
            $createdDate = date('M d, Y', strtotime($order['date']));
            $orderDescription = htmlspecialchars($order['description'] ?? 'N/A', ENT_QUOTES, 'UTF-8');
            // CORREGIDO: Cambiar a view_order.php
            $viewUrl = $this->baseUrlPF . "view_order.php?order=" . $order['id'];
            
            $orderRows .= '
            <tr>
                <td style="text-align: center; color: #034C8C; font-weight: 700; font-family: Georgia, serif;">#' . $order['id'] . '</td>
                <td style="color: #374151; max-width: 250px; font-family: Georgia, serif;">' . $orderDescription . '</td>
                <td style="text-align: center; color: #059669; font-weight: 700; font-family: Georgia, serif;">€' . $costFormatted . '</td>
                <td style="text-align: center; color: #9ca3af; font-size: 11px; font-family: Georgia, serif;">' . $createdDate . '</td>
                <td style="text-align: center;">
                    <a href="' . $viewUrl . '" style="display: inline-block; padding: 6px 12px; background-color: #6b7280; color: white; text-decoration: none; border-radius: 4px; font-size: 11px; font-family: Georgia, serif;">View</a>
                </td>
            </tr>';
        }

        return '<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Premium Freight Recovery Evidence Required</title>
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap" rel="stylesheet">
    <style type="text/css">
        /* Estilos corporativos */
        body { margin: 0; padding: 0; background-color: #f4f4f4; font-family: Georgia, "Times New Roman", serif; }
        .email-container { max-width: 650px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: #dc2626; padding: 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0 0 8px 0; font-size: 22px; font-weight: 700; font-family: Georgia, serif; }
        .header h2 { color: #fecaca; margin: 0; font-size: 16px; font-weight: 400; font-family: Georgia, serif; }
        .content { padding: 32px; font-family: Georgia, serif; }
        .greeting { color: #1e293b; margin: 0 0 16px 0; font-size: 16px; font-weight: 700; font-family: Georgia, serif; }
        .description { color: #64748b; margin: 0 0 24px 0; line-height: 1.6; font-size: 14px; font-family: Georgia, serif; }
        .warning-box { background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 16px; margin: 24px 0; }
        .warning-text { margin: 0; color: #92400e; font-size: 13px; line-height: 1.4; font-family: Georgia, serif; font-weight: 600; }
        .orders-section { margin: 30px 0; }
        .section-title { color: #1e293b; margin: 0 0 12px 0; font-size: 16px; font-weight: 700; font-family: Georgia, serif; }
        .orders-table { width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; }
        .orders-table th { background-color: #f1f5f9; color: #374151; padding: 12px 8px; font-size: 12px; font-weight: 700; text-align: left; border-bottom: 1px solid #cbd5e1; font-family: Georgia, serif; }
        .orders-table td { padding: 12px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-family: Georgia, serif; }
        .action-section { margin: 32px 0; text-align: center; }
        .action-button { display: inline-block; padding: 14px 28px; background-color: #034C8C; color: white; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px; font-family: Georgia, serif; transition: background-color 0.3s; }
        .action-button:hover { background-color: #023b6a; }
        .info-box { background-color: #dbeafe; border: 1px solid #93c5fd; border-radius: 6px; padding: 16px; margin: 24px 0; }
        .info-text { margin: 0; color: #1e3a8a; font-size: 12px; line-height: 1.4; font-family: Georgia, serif; }
        .footer { background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer-text { color: #6b7280; margin: 0 0 6px 0; font-size: 11px; font-family: Georgia, serif; }
        .footer-copyright { color: #9ca3af; margin: 0; font-size: 10px; font-family: Georgia, serif; }
    </style>
</head>
<body>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
        <tr>
            <td style="padding: 20px 0;">
                <table class="email-container" role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                    <!-- Header -->
                    <tr>
                        <td class="header">
                            <h1>⚠️ Recovery Evidence Required</h1>
                            <h2>Premium Freight System</h2>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td class="content">
                            <div class="greeting">Hello ' . $userName . ',</div>
                            
                            <div class="description">
                                You have <strong>' . $totalOrders . '</strong> order' . ($totalOrders > 1 ? 's' : '') . ' that require recovery evidence to be uploaded. 
                                These orders have recovery files but are missing the required recovery evidence documentation.
                            </div>
                            
                            <div class="warning-box">
                                <div class="warning-text">
                                    📋 Action Required: Please upload the recovery evidence for the orders listed below to complete the process.
                                </div>
                            </div>
                            
                            <!-- Orders Table -->
                            <div class="orders-section">
                                <div class="section-title">Orders Requiring Recovery Evidence:</div>
                                
                                <table class="orders-table" role="presentation" cellspacing="0" cellpadding="0" border="0">
                                    <thead>
                                        <tr>
                                            <th style="text-align: center; width: 15%;">Order #</th>
                                            <th style="width: 40%;">Description</th>
                                            <th style="text-align: center; width: 15%;">Cost</th>
                                            <th style="text-align: center; width: 15%;">Date</th>
                                            <th style="text-align: center; width: 15%;">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ' . $orderRows . '
                                    </tbody>
                                </table>
                            </div>
                            
                            <!-- Action Button -->
                            <div class="action-section">
                                <a href="' . $viewOrdersUrl . '" class="action-button">
                                    📁 View My Orders
                                </a>
                            </div>
                            
                            <div class="info-box">
                                <div class="info-text">
                                    💡 <strong>Tip:</strong> Click "View My Orders" to access your orders and upload the required recovery evidence. 
                                    Look for orders marked with a recovery requirement and upload the appropriate documentation.
                                </div>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td class="footer">
                            <div class="footer-text">This is an automated message from the Premium Freight System</div>
                            <div class="footer-text">Please do not reply to this email</div>
                            <div class="footer-copyright">© 2025 GRAMMER AG - Premium Freight System</div>
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
     * Plantilla para correo de recuperación de contraseña
     * 
     * @param array $user Datos del usuario
     * @param string $resetToken Token de recuperación
     * @return string HTML del correo
     */
    public function getPasswordResetTemplate($user, $resetToken) {
        // URL para el reset de contraseña
        $resetUrl = $this->baseUrlPF . "password_reset.php?token=" . $resetToken;
        
        // Formatear datos de manera segura
        $userName = htmlspecialchars($user['name'], ENT_QUOTES, 'UTF-8');
        $userEmail = htmlspecialchars($user['email'], ENT_QUOTES, 'UTF-8');
        
        return '<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Password Reset Request - Premium Freight</title>
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap" rel="stylesheet">
    <style type="text/css">
        body { margin: 0; padding: 0; background-color: #f4f4f4; font-family: Georgia, "Times New Roman", serif; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: #034C8C; padding: 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0 0 8px 0; font-size: 22px; font-weight: 700; }
        .header h2 { color: #e2e8f0; margin: 0; font-size: 16px; font-weight: 400; }
        .content { padding: 32px; }
        .greeting { color: #1e293b; margin: 0 0 16px 0; font-size: 18px; font-weight: 700; }
        .message { color: #64748b; margin: 0 0 24px 0; line-height: 1.6; font-size: 14px; }
        .reset-button { 
            display: inline-block; 
            background-color: #034C8C; 
            color: #ffffff; 
            text-decoration: none; 
            padding: 12px 24px; 
            border-radius: 6px; 
            font-weight: 700; 
            font-size: 14px; 
            margin: 20px 0; 
        }
        .reset-button:hover { background-color: #023b6a; }
        .security-note { 
            background-color: #fef3c7; 
            border: 1px solid #f59e0b; 
            border-radius: 6px; 
            padding: 16px; 
            margin: 24px 0; 
        }
        .security-text { margin: 0; color: #92400e; font-size: 12px; line-height: 1.4; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer-text { color: #6b7280; font-size: 12px; margin: 0; }
        .url-fallback { 
            word-break: break-all; 
            color: #6b7280; 
            font-size: 11px; 
            margin: 16px 0; 
            padding: 10px; 
            background-color: #f8fafc; 
            border-radius: 4px; 
        }
    </style>
</head>
<body>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
        <tr>
            <td align="center" valign="top">
                <div class="email-container">
                    <!-- Header -->
                    <div class="header">
                        <h1>Premium Freight System</h1>
                        <h2>Password Reset Request</h2>
                    </div>
                    
                    <!-- Content -->
                    <div class="content">
                        <div class="greeting">Hello ' . $userName . ',</div>
                        
                        <div class="message">
                            You have requested to reset your password for the Premium Freight System. 
                            Click the button below to create a new password for your account.
                        </div>
                        
                        <div style="text-align: center;">
                            <a href="' . $resetUrl . '" class="reset-button">Reset My Password</a>
                        </div>
                        
                        <div class="message">
                            If the button above doesn\'t work, you can copy and paste the following link into your browser:
                        </div>
                        
                        <div class="url-fallback">
                            ' . $resetUrl . '
                        </div>
                        
                        <div class="security-note">
                            <div class="security-text">
                                <strong>Security Notice:</strong><br>
                                • This link will expire in 24 hours<br>
                                • If you didn\'t request this reset, please ignore this email<br>
                                • Never share this link with anyone<br>
                                • For security questions, contact your system administrator
                            </div>
                        </div>
                        
                        <div class="message">
                            If you have any questions or concerns, please contact the Premium Freight support team.
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div class="footer">
                        <div class="footer-text">
                            © ' . date('Y') . ' GRAMMER AG - Premium Freight System<br>
                            This is an automated message, please do not reply to this email.
                        </div>
                    </div>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>';
    }

    /**
     * Plantilla para correo de verificación de cuenta
     */
    public function getVerificationTemplate($user, $token) {
        $verificationUrl = $this->baseUrl . "PFmailVerification.php?token=" . urlencode($token) . "&user=" . $user['id'];
        $userName = htmlspecialchars($user['name'] ?? 'Usuario', ENT_QUOTES, 'UTF-8');
        $userEmail = htmlspecialchars($user['email'] ?? '', ENT_QUOTES, 'UTF-8');

        return '<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verificación de Cuenta - Premium Freight</title>
    <style type="text/css">
        body { margin: 0; padding: 0; background-color: #f4f4f4; font-family: Georgia, "Times New Roman", serif; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: #034C8C; padding: 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0 0 8px 0; font-size: 22px; font-weight: 700; }
        .content { padding: 40px; }
        .welcome-text { color: #1e293b; font-size: 18px; margin-bottom: 20px; text-align: center; }
        .instruction-box { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 25px 0; }
        .instruction-title { color: #92400e; font-size: 16px; font-weight: 700; margin-bottom: 15px; }
        .step { margin: 10px 0; color: #92400e; }
        .step-number { background: #f59e0b; color: white; width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 10px; }
        .email-highlight { background: #e3f2fd; padding: 8px 12px; border-radius: 4px; font-family: monospace; color: #034C8C; font-weight: bold; display: inline-block; margin: 0 5px; }
        .verification-button { display: inline-block; background-color: #10B981; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; text-align: center; transition: all 0.3s ease; }
        .verification-button:hover { background-color: #059669; }
        .warning-box { background: #fee2e2; border: 1px solid #dc2626; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .warning-text { color: #991b1b; font-size: 14px; margin: 0; }
        .footer { background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer-text { color: #6b7280; margin: 0; font-size: 12px; }
    </style>
</head>
<body>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
        <tr>
            <td style="padding: 20px 0;">
                <div class="email-container">
                    <div class="header">
                        <h1>🛡️ Verificación de Cuenta</h1>
                        <p style="color: #e2e8f0; margin: 0; font-size: 14px;">Premium Freight System</p>
                    </div>
                    
                    <div class="content">
                        <div class="welcome-text">
                            ¡Bienvenido ' . $userName . '!
                        </div>
                        
                        <p style="color: #374151; line-height: 1.6; margin-bottom: 25px;">
                            Gracias por registrarte en el sistema Premium Freight. Para completar tu registro 
                            y poder usar todas las funciones, necesitas verificar tu dirección de correo electrónico:
                        </p>
                        
                        <p style="text-align: center; margin: 20px 0;">
                            <span class="email-highlight">📧 ' . $userEmail . '</span>
                        </p>
                        
                        <div class="instruction-box">
                            <div class="instruction-title">
                                ⚠️ IMPORTANTE: Antes de verificar tu cuenta
                            </div>
                            <p style="color: #92400e; margin-bottom: 15px; font-size: 14px;">
                                Para asegurar que recibas todas nuestras notificaciones importantes, 
                                <strong>debes seguir estos pasos PRIMERO</strong>:
                            </p>
                            
                            <div class="step">
                                <span class="step-number">1</span>
                                <strong>Marca este correo como "No es SPAM"</strong> en tu bandeja de entrada
                            </div>
                            
                            <div class="step">
                                <span class="step-number">2</span>
                                <strong>Añade a contactos seguros:</strong> <span class="email-highlight">pruebasjesus@grammermx.com</span>
                            </div>
                            
                            <div class="step">
                                <span class="step-number">3</span>
                                <strong>Configura tu correo</strong> para permitir correos de nuestro dominio
                            </div>
                            
                            <div class="step">
                                <span class="step-number">4</span>
                                <strong>Solo después</strong> haz clic en el botón de verificación
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="' . $verificationUrl . '" class="verification-button">
                                ✅ Verificar Mi Cuenta
                            </a>
                        </div>
                        
                        <div class="warning-box">
                            <p class="warning-text">
                                <strong>🚨 ATENCIÓN:</strong> Si no sigues los pasos anteriores, 
                                es posible que nuestros correos de notificación sean marcados como SPAM 
                                y no puedas recibir alertas importantes sobre tus órdenes de Premium Freight.
                            </p>
                        </div>
                        
                        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                            <strong>¿Por qué es necesario?</strong> Los sistemas de correo corporativo 
                            suelen filtrar correos automáticos. Estos pasos garantizan que recibas 
                            notificaciones de aprobaciones, rechazos y actualizaciones de estado.
                        </p>
                        
                        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                            Si tienes problemas con la verificación, contacta al equipo de soporte o 
                            solicita ayuda a tu administrador de TI.
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p class="footer-text">
                            © 2025 GRAMMER AG - Premium Freight System<br>
                            Este es un correo automático, por favor no respondas a esta dirección.
                        </p>
                    </div>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>';
}
    
    /**
     * Generar filas de órdenes - VERSIÓN FINAL CORREGIDA
     */
    private function generateOrderRows($orders, $approverId, $bulkApproveToken = null) {
        $rows = '<table style="width: 100%; border-collapse: collapse; margin-top: 16px;">';
        
        foreach ($orders as $order) {
            // VALIDACIÓN CRÍTICA: Verificar que la orden tenga ID válido
            if (!isset($order['id']) || empty($order['id']) || !is_numeric($order['id'])) {
                logAction("generateOrderRows - Orden con ID inválido omitida: " . json_encode($order), 'GENERATEORDERROWS');
                continue;
            }
            
            $orderId = (int)$order['id'];
            
            // Usar siempre view_bulk_orders.php con el token bulk para mayor consistencia
            $fallbackToken = $bulkApproveToken ?: 'MISSING_TOKEN';
            $viewUrl = $this->baseUrlPF . "view_bulk_orders.php?user=" . $approverId . "&order=" . $orderId . "&token=" . $fallbackToken;
            
            $rows .= '
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px 8px; vertical-align: top;">
                    <div style="color: #1e293b; font-weight: 600; margin-bottom: 4px;">Order #' . $orderId . '</div>
                    <div style="color: #64748b; font-size: 12px; margin-bottom: 8px;">' . htmlspecialchars($order['description'] ?? 'N/A', ENT_QUOTES, 'UTF-8') . '</div>
                    <div style="color: #059669; font-weight: 700; font-size: 14px;">€' . number_format($order['cost_euros'] ?? 0, 2) . '</div>
                </td>
                <td style="padding: 12px 8px; text-align: right; vertical-align: middle;">
                    <a href="' . $viewUrl . '" style="display: inline-block; padding: 8px 16px; background-color: #034C8C; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 12px; margin: 0 2px;">View</a>
                </td>
            </tr>';
        }
        
        $rows .= '</table>';
        return $rows;
    }
}
?>
