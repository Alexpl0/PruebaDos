<?php
/**
 * PFEmailTemplates.php - Plantillas HTML para correos de Premium Freight
 * 
 * @author GRAMMER AG
 * @version 1.0
 */

class PFEmailTemplates {
    private $baseUrl;
    
    public function __construct($baseUrl) {
        $this->baseUrl = $baseUrl;
    }
    
    /**
     * Plantilla para correo de aprobación individual
     */
    public function getApprovalEmailTemplate($orderData, $approvalToken, $rejectToken) {
        $approveUrl = $this->baseUrl . "PFmailAction.php?action=approve&token=$approvalToken";
        $rejectUrl = $this->baseUrl . "PFmailAction.php?action=reject&token=$rejectToken";
        $viewOrderUrl = $this->baseUrl . "orders.php?highlight=" . $orderData['id'];
        $costEuros = number_format($orderData['cost_euros'], 2);

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
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: Arial, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
        <tr>
            <td style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px;" align="center">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #034C8C; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 24px; font-weight: bold;">Premium Freight Approval Required</h1>
                            <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: normal;">Order #' . $orderData['id'] . '</h2>
                        </td>
                    </tr>
                    
                    <!-- Contenido principal -->
                    <tr>
                        <td style="padding: 30px;">
                            <h2 style="color: #333333; margin: 0 0 15px 0; font-size: 18px;">A new Premium Freight order requires your approval</h2>
                            <p style="color: #333333; margin: 0 0 20px 0; line-height: 1.6;">Please review the following order details and take appropriate action:</p>
                            
                            <!-- Detalles de la orden usando tabla -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 8px; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <h3 style="color: #333333; margin: 0 0 15px 0; font-size: 16px;">Order Details</h3>
                                        
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; width: 40%;">
                                                    <strong style="color: #333333;">Order ID:</strong>
                                                </td>
                                                <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; text-align: right;">
                                                    #' . $orderData['id'] . '
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                                                    <strong style="color: #333333;">Description:</strong>
                                                </td>
                                                <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; text-align: right;">
                                                    ' . htmlspecialchars($orderData['description'] ?? 'N/A') . '
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                                                    <strong style="color: #333333;">Created by:</strong>
                                                </td>
                                                <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; text-align: right;">
                                                    ' . htmlspecialchars($orderData['creator_name'] ?? 'N/A') . '
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                                                    <strong style="color: #333333;">Created:</strong>
                                                </td>
                                                <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; text-align: right;">
                                                    ' . date('M d, Y H:i', strtotime($orderData['date'])) . '
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                                                    <strong style="color: #333333;">Area:</strong>
                                                </td>
                                                <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; text-align: right;">
                                                    ' . htmlspecialchars($orderData['planta'] ?? 'N/A') . '
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <strong style="color: #333333;">Cost:</strong>
                                                </td>
                                                <td style="padding: 8px 0; text-align: right;">
                                                    EUR ' . $costEuros . '
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Botones de acción -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <h3 style="color: #333333; margin: 0 0 20px 0; font-size: 16px;">Take Action</h3>
                                        
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                                            <tr>
                                                <td style="padding: 0 5px;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                        <tr>
                                                            <td style="background-color: #28a745; border-radius: 4px; text-align: center;">
                                                                <a href="' . $approveUrl . '" style="display: block; padding: 12px 20px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px;">APPROVE ORDER</a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                                
                                                <td style="padding: 0 5px;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                        <tr>
                                                            <td style="background-color: #dc3545; border-radius: 4px; text-align: center;">
                                                                <a href="' . $rejectUrl . '" style="display: block; padding: 12px 20px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px;">REJECT ORDER</a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                                
                                                <td style="padding: 0 5px;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                        <tr>
                                                            <td style="background-color: #034C8C; border-radius: 4px; text-align: center;">
                                                                <a href="' . $viewOrderUrl . '" style="display: block; padding: 12px 20px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px;">VIEW DETAILS</a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
                            <p style="color: #6c757d; margin: 0 0 5px 0; font-size: 12px;">This is an automated notification from the Premium Freight System.</p>
                            <p style="color: #6c757d; margin: 0; font-size: 12px;">Please do not reply to this email. For support, contact the system administrator.</p>
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
        $approveAllUrl = $this->baseUrl . "PFmailBulkAction.php?action=approve&token=$approveAllToken";
        $rejectAllUrl = $this->baseUrl . "PFmailBulkAction.php?action=reject&token=$rejectAllToken";
        
        $totalOrders = count($orders);
        $totalCost = array_sum(array_column($orders, 'cost_euros'));
        
        // Generar filas de órdenes
        $orderRows = $this->generateOrderRows($orders, $approver['id']);

        return '<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Weekly Premium Freight Summary</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: Arial, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
        <tr>
            <td style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="800" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px;" align="center">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #034C8C; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 24px;">Weekly Premium Freight Summary</h1>
                            <p style="color: #ffffff; margin: 0; font-size: 16px;">Hello ' . htmlspecialchars($approver['name']) . ', you have ' . $totalOrders . ' orders pending your approval</p>
                        </td>
                    </tr>
                    
                    <!-- Contenido -->
                    <tr>
                        <td style="padding: 30px;">
                            <!-- Estadísticas -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 8px; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <h3 style="margin: 0 0 15px 0; color: #333333;">Summary Statistics</h3>
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 5px 0;"><strong>Total Orders:</strong></td>
                                                <td style="padding: 5px 0; text-align: right;">' . $totalOrders . '</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 5px 0;"><strong>Total Value:</strong></td>
                                                <td style="padding: 5px 0; text-align: right;">EUR ' . number_format($totalCost, 2) . '</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Botones de acción en bloque -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <h3 style="margin: 0 0 15px 0; color: #333333;">Quick Actions</h3>
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                                            <tr>
                                                <td style="padding: 0 5px;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                        <tr>
                                                            <td style="background-color: #28a745; border-radius: 4px;">
                                                                <a href="' . $approveAllUrl . '" style="display: block; padding: 12px 20px; color: #ffffff; text-decoration: none; font-weight: bold;">APPROVE ALL ORDERS</a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                                <td style="padding: 0 5px;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                        <tr>
                                                            <td style="background-color: #dc3545; border-radius: 4px;">
                                                                <a href="' . $rejectAllUrl . '" style="display: block; padding: 12px 20px; color: #ffffff; text-decoration: none; font-weight: bold;">REJECT ALL ORDERS</a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Tabla de órdenes -->
                            <h3 style="margin: 30px 0 15px 0; color: #333333;">Orders Requiring Your Approval</h3>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
                                <thead>
                                    <tr>
                                        <th style="background-color: #034C8C; color: #ffffff; padding: 12px; text-align: left;">Order #</th>
                                        <th style="background-color: #034C8C; color: #ffffff; padding: 12px; text-align: left;">Description</th>
                                        <th style="background-color: #034C8C; color: #ffffff; padding: 12px; text-align: left;">Area</th>
                                        <th style="background-color: #034C8C; color: #ffffff; padding: 12px; text-align: left;">Cost</th>
                                        <th style="background-color: #034C8C; color: #ffffff; padding: 12px; text-align: left;">Created</th>
                                        <th style="background-color: #034C8C; color: #ffffff; padding: 12px; text-align: left;">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ' . $orderRows . '
                                </tbody>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
                            <p style="color: #6c757d; margin: 0 0 5px 0; font-size: 12px;">This is an automated notification from the Premium Freight System.</p>
                            <p style="color: #6c757d; margin: 0; font-size: 12px;">Please do not reply to this email. For support, contact the system administrator.</p>
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
     * Plantilla para notificación de estado
     */
    public function getStatusNotificationTemplate($orderData, $status, $rejectorInfo = null) {
        $viewOrderUrl = defined('URLPF') ? URLPF . "orders.php?highlight=" . $orderData['id'] : "#";
        $costEuros = number_format($orderData['cost_euros'], 2);

        if ($status === 'approved') {
            $statusMessage = "Your Premium Freight order has been <strong>approved</strong>.";
            $statusColor = "#28a745";
            $statusIcon = "✓";
        } else {
            $statusMessage = "Your Premium Freight order has been <strong>rejected</strong>.";
            if ($rejectorInfo) {
                $statusMessage .= " Rejection was done by {$rejectorInfo['name']}.";
            }
            $statusColor = "#dc3545";
            $statusIcon = "✗";
        }

        return '<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Premium Freight Order Status Update</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: Arial, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
        <tr>
            <td style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px;" align="center">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background-color: ' . $statusColor . '; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 24px; font-weight: bold;">' . $statusIcon . ' Order ' . ucfirst($status) . '</h1>
                            <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: normal;">Order #' . $orderData['id'] . '</h2>
                        </td>
                    </tr>
                    
                    <!-- Contenido principal -->
                    <tr>
                        <td style="padding: 30px;">
                            <h2 style="color: #333333; margin: 0 0 15px 0; font-size: 18px;">Order Status Update</h2>
                            <p style="color: #333333; margin: 0 0 20px 0; line-height: 1.6;">' . $statusMessage . '</p>
                            
                            <!-- Detalles de la orden -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 8px; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <h3 style="color: #333333; margin: 0 0 15px 0; font-size: 16px;">Order Details</h3>
                                        
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; width: 40%;">
                                                    <strong style="color: #333333;">Order ID:</strong>
                                                </td>
                                                <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; text-align: right;">
                                                    #' . $orderData['id'] . '
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                                                    <strong style="color: #333333;">Description:</strong>
                                                </td>
                                                <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; text-align: right;">
                                                    ' . htmlspecialchars($orderData['description'] ?? 'N/A') . '
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                                                    <strong style="color: #333333;">Created by:</strong>
                                                </td>
                                                <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; text-align: right;">
                                                    ' . htmlspecialchars($orderData['creator_name'] ?? 'N/A') . '
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                                                    <strong style="color: #333333;">Created:</strong>
                                                </td>
                                                <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; text-align: right;">
                                                    ' . date('M d, Y H:i', strtotime($orderData['date'])) . '
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                                                    <strong style="color: #333333;">Area:</strong>
                                                </td>
                                                <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; text-align: right;">
                                                    ' . htmlspecialchars($orderData['planta'] ?? 'N/A') . '
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <strong style="color: #333333;">Cost:</strong>
                                                </td>
                                                <td style="padding: 8px 0; text-align: right;">
                                                    EUR ' . $costEuros . '
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Botón para ver orden -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                                            <tr>
                                                <td style="background-color: #034C8C; border-radius: 4px; text-align: center;">
                                                    <a href="' . $viewOrderUrl . '" style="display: block; padding: 12px 20px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px;">VIEW ORDER DETAILS</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
                            <p style="color: #6c757d; margin: 0 0 5px 0; font-size: 12px;">This is an automated notification from the Premium Freight System.</p>
                            <p style="color: #6c757d; margin: 0; font-size: 12px;">Please do not reply to this email. For support, contact the system administrator.</p>
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
        foreach ($orders as $order) {
            $costFormatted = number_format($order['cost_euros'], 2);
            $createdDate = date('M d, Y', strtotime($order['date']));
            
            $approveToken = $this->generateActionToken($order['id'], $approverId, 'approve');
            $rejectToken = $this->generateActionToken($order['id'], $approverId, 'reject');
            
            $approveUrl = $this->baseUrl . "PFmailAction.php?action=approve&token=$approveToken";
            $rejectUrl = $this->baseUrl . "PFmailAction.php?action=reject&token=$rejectToken";
            $viewUrl = defined('URLPF') ? URLPF . "orders.php?highlight=" . $order['id'] : "#";
            
            $orderRows .= '
            <tr>
                <td style="padding: 12px; text-align: center; font-weight: bold; border-bottom: 1px solid #e9ecef; width: 10%;">#' . $order['id'] . '</td>
                <td style="padding: 12px; border-bottom: 1px solid #e9ecef; width: 35%;">' . htmlspecialchars($order['description'] ?? 'N/A') . '</td>
                <td style="padding: 12px; border-bottom: 1px solid #e9ecef; width: 15%;">' . htmlspecialchars($order['planta'] ?? 'N/A') . '</td>
                <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e9ecef; width: 12%;">EUR ' . $costFormatted . '</td>
                <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e9ecef; width: 12%;">' . $createdDate . '</td>
                <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e9ecef; width: 16%;">
                    <!-- Botones en columna vertical -->
                    <div style="text-align: center;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto; width: 100%;">
                            <tr>
                                <td style="padding-bottom: 4px;">
                                    <a href="' . $approveUrl . '" style="background-color: #28a745; color: #ffffff; padding: 6px 12px; text-decoration: none; border-radius: 3px; font-size: 11px; display: block; text-align: center; width: 100%; box-sizing: border-box;">APPROVE</a>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding-bottom: 4px;">
                                    <a href="' . $rejectUrl . '" style="background-color: #dc3545; color: #ffffff; padding: 6px 12px; text-decoration: none; border-radius: 3px; font-size: 11px; display: block; text-align: center; width: 100%; box-sizing: border-box;">REJECT</a>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <a href="' . $viewUrl . '" style="background-color: #034C8C; color: #ffffff; padding: 6px 12px; text-decoration: none; border-radius: 3px; font-size: 11px; display: block; text-align: center; width: 100%; box-sizing: border-box;">VIEW</a>
                                </td>
                            </tr>
                        </table>
                    </div>
                </td>
            </tr>';
        }
        return $orderRows;
    }

    /**
     * Genera un token de acción - usa la instancia de services si está disponible
     */
    private function generateActionToken($orderId, $userId, $action) {
        // Crear una instancia temporal de servicios para generar el token
        require_once 'PFEmailServices.php';
        $services = new PFEmailServices();
        return $services->generateActionToken($orderId, $userId, $action);
    }
}
?>