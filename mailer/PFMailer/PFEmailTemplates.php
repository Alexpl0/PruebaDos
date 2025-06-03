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
                        <td class="header" style="border-radius: 8px 8px 0 0; background-color: #034C8C;">
                            <h1 style="font-family: Georgia, serif; color: #ffffff; margin: 0 0 8px 0; font-size: 22px; font-weight: 700;">Premium Freight Approval Required</h1>
                            <h2 style="font-family: Georgia, serif; color: #e2e8f0; margin: 0; font-size: 16px; font-weight: 400;">Order #' . $orderData['id'] . '</h2>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td class="content" style="font-family: Georgia, serif;">
                            <h2 class="section-title" style="font-family: Georgia, serif;">New Premium Freight Order Requires Your Approval</h2>
                            <p class="description" style="font-family: Georgia, serif;">A new Premium Freight order has been submitted and requires your approval before processing. Please review the order details below and take the appropriate action.</p>
                            
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
                                    <span class="detail-label" style="font-family: Georgia, serif;">Area/Department:</span>
                                    <span class="detail-value" style="font-family: Georgia, serif;">' . $plantaName . '</span>
                                </div>
                                
                                <div class="detail-row">
                                    <span class="detail-label" style="font-family: Georgia, serif;">Estimated Cost:</span>
                                    <span class="detail-value cost" style="font-family: Georgia, serif;">EUR ' . $costEuros . '</span>
                                </div>
                            </div>
                            
                            <!-- Action Buttons -->
                            <div class="actions-section">
                                <h3 class="actions-title" style="font-family: Georgia, serif;">Required Action</h3>
                                <p class="actions-subtitle" style="font-family: Georgia, serif;">Please select one of the following options to process this order:</p>
                                
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                                    <tr>
                                        <td class="button-container">
                                            <a href="' . $approveUrl . '" style="background-color: #059669 !important; color: #ffffff !important; padding: 12px 18px; text-decoration: none; font-weight: bold; font-size: 12px; border-radius: 6px; text-align: center; display: inline-block; border: 2px solid #047857; text-transform: uppercase; letter-spacing: 0.3px; font-family: Georgia, serif; min-width: 90px;">APPROVE</a>
                                        </td>
                                        <td class="button-container">
                                            <a href="' . $rejectUrl . '" style="background-color: #dc2626 !important; color: #ffffff !important; padding: 12px 18px; text-decoration: none; font-weight: bold; font-size: 12px; border-radius: 6px; text-align: center; display: inline-block; border: 2px solid #b91c1c; text-transform: uppercase; letter-spacing: 0.3px; font-family: Georgia, serif; min-width: 90px;">REJECT</a>
                                        </td>
                                        <td class="button-container">
                                            <a href="' . $viewOrderUrl . '" style="background-color: #1e40af !important; color: #ffffff !important; padding: 12px 18px; text-decoration: none; font-weight: bold; font-size: 12px; border-radius: 6px; text-align: center; display: inline-block; border: 2px solid #1d4ed8; text-transform: uppercase; letter-spacing: 0.3px; font-family: Georgia, serif; min-width: 90px;">VIEW DETAILS</a>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- Important Notice -->
                            <div class="info-box">
                                <p class="info-text" style="font-family: Georgia, serif;">
                                    <strong>Important:</strong> This approval request will expire in 72 hours. After expiration, the requester will need to submit a new approval request.
                                </p>
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
     * Plantilla para correo resumen semanal
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
        body { margin: 0; padding: 0; background-color: #f4f4f4; font-family: Georgia, "Times New Roman", serif; }
        .email-container { max-width: 850px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: #034C8C; padding: 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0 0 8px 0; font-size: 24px; font-weight: 700; font-family: Georgia, serif; }
        .header-subtitle { color: #e2e8f0; margin: 0; font-size: 14px; font-weight: 400; font-family: Georgia, serif; }
        .header-date { color: #cbd5e1; margin: 8px 0 0 0; font-size: 12px; font-family: Georgia, serif; }
        .content { padding: 32px; font-family: Georgia, serif; }
        .stats-card { background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; margin: 20px 0; }
        .stats-title { color: #0f172a; margin: 0 0 20px 0; font-size: 16px; font-weight: 700; border-bottom: 2px solid #034C8C; padding-bottom: 8px; font-family: Georgia, serif; }
        
        /* Nuevo CSS para estadísticas en una fila */
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
        .bulk-button { 
            display: inline-block; 
            padding: 14px 24px; 
            text-decoration: none; 
            font-weight: bold; 
            border-radius: 6px;
            margin: 0 6px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            border: 2px solid transparent;
            font-family: Georgia, serif;
        }
        .approve-all-btn { 
            background-color: #059669 !important; 
            color: #ffffff !important; 
            border-color: #047857 !important;
        }
        .reject-all-btn { 
            background-color: #dc2626 !important; 
            color: #ffffff !important; 
            border-color: #b91c1c !important;
        }
        .bulk-warning { color: #6b7280; font-size: 11px; margin: 12px 0 0 0; font-family: Georgia, serif; }
        .orders-section { margin: 30px 0; }
        .section-title { color: #1e293b; margin: 0 0 12px 0; font-size: 16px; font-weight: 700; font-family: Georgia, serif; }
        .section-subtitle { color: #6b7280; margin: 0 0 16px 0; font-size: 13px; font-family: Georgia, serif; }
        .orders-table { width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; }
        .orders-table th { 
            background-color: #034C8C; 
            color: #ffffff; 
            padding: 12px 8px; 
            text-align: left; 
            font-size: 11px; 
            font-weight: 700; 
            text-transform: uppercase;
            font-family: Georgia, serif;
        }
        .orders-table td { padding: 12px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-family: Georgia, serif; }
        .order-id { color: #034C8C; font-weight: 700; text-align: center; font-family: Georgia, serif; }
        .order-desc { color: #374151; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: Georgia, serif; }
        .order-area { color: #6b7280; font-family: Georgia, serif; }
        .order-cost { color: #059669; font-weight: 700; text-align: center; font-family: Georgia, serif; }
        .order-date { color: #9ca3af; font-size: 11px; text-align: center; font-family: Georgia, serif; }
        .order-actions { text-align: center; }
        .order-btn { 
            display: block; 
            padding: 6px 10px; 
            text-decoration: none; 
            border-radius: 4px; 
            font-size: 9px; 
            font-weight: bold; 
            margin-bottom: 3px;
            text-transform: uppercase;
            border: 1px solid transparent;
            font-family: Georgia, serif;
        }
        .order-approve { 
            background-color: #059669 !important; 
            color: #ffffff !important; 
            border-color: #047857 !important;
        }
        .order-reject { 
            background-color: #dc2626 !important; 
            color: #ffffff !important; 
            border-color: #b91c1c !important;
        }
        .order-view { 
            background-color: #1e40af !important; 
            color: #ffffff !important; 
            border-color: #1d4ed8 !important;
        }
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
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="850" class="email-container" style="margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" align="center">
                    
                    <!-- Header -->
                    <tr>
                        <td class="header" style="border-radius: 8px 8px 0 0; background-color: #034C8C;">
                            <h1 style="font-family: Georgia, serif; color: #ffffff; margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">Weekly Premium Freight Summary</h1>
                            <p class="header-subtitle" style="font-family: Georgia, serif;">Hello ' . $approverName . ', you have <strong>' . $totalOrders . '</strong> orders pending your approval</p>
                            <p class="header-date" style="font-family: Georgia, serif;">Week ending: ' . date('F d, Y') . '</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td class="content" style="font-family: Georgia, serif;">
                            
                            <!-- Statistics - Nueva estructura en una fila -->
                            <div class="stats-card">
                                <h3 class="stats-title" style="font-family: Georgia, serif;">Summary Statistics</h3>
                                <div class="stats-row">
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">
                                        <tr>
                                            <td class="stats-cell" style="width: 33.33%; text-align: center; padding: 0 15px; vertical-align: top;">
                                                <div class="stat-box">
                                                    <div class="stat-label" style="font-family: Georgia, serif;">Total Orders</div>
                                                    <div class="stat-value" style="font-family: Georgia, serif;">' . $totalOrders . '</div>
                                                </div>
                                            </td>
                                            <td class="stats-cell" style="width: 33.33%; text-align: center; padding: 0 15px; vertical-align: top;">
                                                <div class="stat-box">
                                                    <div class="stat-label" style="font-family: Georgia, serif;">Total Value</div>
                                                    <div class="stat-value cost" style="font-family: Georgia, serif;">EUR ' . number_format($totalCost, 2) . '</div>
                                                </div>
                                            </td>
                                            <td class="stats-cell" style="width: 33.33%; text-align: center; padding: 0 15px; vertical-align: top;">
                                                <div class="stat-box">
                                                    <div class="stat-label" style="font-family: Georgia, serif;">Average Order Value</div>
                                                    <div class="stat-value" style="font-family: Georgia, serif;">EUR ' . number_format($avgCost, 2) . '</div>
                                                </div>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                            </div>
                            
                            <!-- Bulk Actions -->
                            <div class="bulk-actions">
                                <h3 class="bulk-title" style="font-family: Georgia, serif;">Quick Actions</h3>
                                <p class="bulk-subtitle" style="font-family: Georgia, serif;">Process all orders at once with a single click:</p>
                                
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                                    <tr>
                                        <td>
                                            <a href="' . $approveAllUrl . '" style="background-color: #059669 !important; color: #ffffff !important; padding: 14px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px; border: 2px solid #047857; display: inline-block; font-family: Georgia, serif;">APPROVE ALL</a>
                                        </td>
                                        <td style="padding-left: 16px;">
                                            <a href="' . $rejectAllUrl . '" style="background-color: #dc2626 !important; color: #ffffff !important; padding: 14px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px; border: 2px solid #b91c1c; display: inline-block; font-family: Georgia, serif;">REJECT ALL</a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p class="bulk-warning" style="font-family: Georgia, serif;">
                                    Bulk actions will affect all ' . $totalOrders . ' orders listed abajo
                                </p>
                            </div>
                            
                            <!-- Orders Table -->
                            <div class="orders-section">
                                <h3 class="section-title" style="font-family: Georgia, serif;">Orders Requiring Your Approval</h3>
                                <p class="section-subtitle" style="font-family: Georgia, serif;">Review each order individually or use the bulk actions above:</p>
                                
                                <table class="orders-table">
                                    <thead>
                                        <tr>
                                            <th style="width: 10%; font-family: Georgia, serif;">Order #</th>
                                            <th style="width: 35%; font-family: Georgia, serif;">Description</th>
                                            <th style="width: 15%; font-family: Georgia, serif;">Area</th>
                                            <th style="width: 12%; font-family: Georgia, serif;">Cost</th>
                                            <th style="width: 12%; font-family: Georgia, serif;">Created</th>
                                            <th style="width: 16%; font-family: Georgia, serif;">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ' . $orderRows . '
                                    </tbody>
                                </table>
                            </div>
                            
                            <!-- Important Notice -->
                            <div class="info-box">
                                <p class="info-text" style="font-family: Georgia, serif;">
                                    <strong>Reminder:</strong> These approval requests will expire in 72 hours. Orders not processed will require new approval requests from their creators.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td class="footer" style="border-radius: 0 0 8px 8px;">
                            <p class="footer-text" style="font-family: Georgia, serif;">This is an automated weekly summary from the Premium Freight Management System.</p>
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
     * Plantilla para notificación de estado (aprobado/rechazado)
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
                                    <span class="detail-label" style="font-family: Georgia, serif;">Area/Department:</span>
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
        $viewOrdersUrl = defined('URLPF') ? URLPF . "orders.php" : "#";
        $totalOrders = count($orders);
        $userName = htmlspecialchars($user['name'] ?? 'N/A', ENT_QUOTES, 'UTF-8');
        
        // Generar filas de órdenes
        $orderRows = '';
        foreach ($orders as $order) {
            $costFormatted = number_format((float)($order['cost_euros'] ?? 0), 2);
            $createdDate = date('M d, Y', strtotime($order['date']));
            $orderDescription = htmlspecialchars($order['description'] ?? 'N/A', ENT_QUOTES, 'UTF-8');
            $viewUrl = defined('URLPF') ? URLPF . "orders.php?highlight=" . $order['id'] : "#";
            
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
     * Genera las filas de órdenes para el resumen semanal
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
                <td class="order-id" style="font-family: Georgia, serif;">#' . $order['id'] . '</td>
                <td class="order-desc" title="' . $orderDescription . '" style="font-family: Georgia, serif;">' . $orderDescription . '</td>
                <td class="order-area" style="font-family: Georgia, serif;">' . $plantaName . '</td>
                <td class="order-cost" style="font-family: Georgia, serif;">EUR ' . $costFormatted . '</td>
                <td class="order-date" style="font-family: Georgia, serif;">' . $createdDate . '</td>
                <td class="order-actions">
                    <a href="' . $approveUrl . '" style="background-color: #059669 !important; color: #ffffff !important; padding: 6px 10px; text-decoration: none; border-radius: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase; border: 1px solid #047857; display: block; margin-bottom: 3px; font-family: Georgia, serif;">Approve</a>
                    <a href="' . $rejectUrl . '" style="background-color: #dc2626 !important; color: #ffffff !important; padding: 6px 10px; text-decoration: none; border-radius: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase; border: 1px solid #b91c1c; display: block; margin-bottom: 3px; font-family: Georgia, serif;">Reject</a>
                    <a href="' . $viewUrl . '" style="background-color: #1e40af !important; color: #ffffff !important; padding: 6px 10px; text-decoration: none; border-radius: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase; border: 1px solid #1d4ed8; display: block; font-family: Georgia, serif;">View</a>
                </td>
            </tr>';
        }
        return $orderRows;
    }

    /**
     * Genera un token de acción individual
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
