<?php
/**
 * PFEmailTemplates.php - Plantillas HTML para correos de Premium Freight
 * 
 * Este archivo contiene todas las plantillas de correo electrónico utilizadas
 * en el sistema Premium Freight para notificaciones de aprobación, resúmenes
 * semanales y actualizaciones de estado.
 * 
 * @author GRAMMER AG
 * @version 2.0
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
        // URLs corregidas para usar el endpoint individual
        $approveUrl = $this->baseUrl . "PFmailSingleAction.php?action=approve&token=$approvalToken";
        $rejectUrl = $this->baseUrl . "PFmailSingleAction.php?action=reject&token=$rejectToken";
        $viewOrderUrl = defined('URLPF') ? URLPF . "orders.php?highlight=" . $orderData['id'] : "#";
        
        // Formatear datos
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
        /* Estilos para mejor compatibilidad */
        .email-container { max-width: 600px; margin: 0 auto; }
        .button-table { margin: 0 auto; }
        .action-button { 
            display: block; 
            padding: 12px 20px; 
            color: #ffffff !important; 
            text-decoration: none; 
            font-weight: bold; 
            font-size: 14px; 
            text-align: center;
        }
        .approve-btn { background-color: #28a745; }
        .reject-btn { background-color: #dc3545; }
        .view-btn { background-color: #034C8C; }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: Arial, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
        <tr>
            <td style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);" align="center">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #034C8C; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 24px; font-weight: bold;">⚡ Premium Freight Approval Required</h1>
                            <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: normal;">Order #' . $orderData['id'] . '</h2>
                        </td>
                    </tr>
                    
                    <!-- Contenido principal -->
                    <tr>
                        <td style="padding: 30px;">
                            <h2 style="color: #333333; margin: 0 0 15px 0; font-size: 18px;">🔔 A new Premium Freight order requires your approval</h2>
                            <p style="color: #555555; margin: 0 0 20px 0; line-height: 1.6; font-size: 14px;">Please review the following order details and take appropriate action. Your approval is needed to proceed with this Premium Freight request.</p>
                            
                            <!-- Detalles de la orden -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 8px; margin: 20px 0; border: 1px solid #e9ecef;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <h3 style="color: #333333; margin: 0 0 20px 0; font-size: 16px; border-bottom: 2px solid #034C8C; padding-bottom: 10px;">📋 Order Details</h3>
                                        
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; width: 40%;">
                                                    <strong style="color: #333333;">🆔 Order ID:</strong>
                                                </td>
                                                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; text-align: right; color: #034C8C; font-weight: bold;">
                                                    #' . $orderData['id'] . '
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                                                    <strong style="color: #333333;">📝 Description:</strong>
                                                </td>
                                                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; text-align: right; color: #555555;">
                                                    ' . $orderDescription . '
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                                                    <strong style="color: #333333;">👤 Created by:</strong>
                                                </td>
                                                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; text-align: right; color: #555555;">
                                                    ' . $creatorName . '
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                                                    <strong style="color: #333333;">📅 Created:</strong>
                                                </td>
                                                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; text-align: right; color: #555555;">
                                                    ' . $formattedDate . '
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                                                    <strong style="color: #333333;">🏭 Area:</strong>
                                                </td>
                                                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; text-align: right; color: #555555;">
                                                    ' . $plantaName . '
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0;">
                                                    <strong style="color: #333333;">💰 Cost:</strong>
                                                </td>
                                                <td style="padding: 10px 0; text-align: right; color: #28a745; font-weight: bold; font-size: 16px;">
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
                                        <h3 style="color: #333333; margin: 0 0 20px 0; font-size: 16px;">⚡ Take Action</h3>
                                        <p style="color: #666666; margin: 0 0 15px 0; font-size: 12px;">Click one of the buttons below to process this order:</p>
                                        
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="button-table" style="margin: 0 auto;">
                                            <tr>
                                                <td style="padding: 0 8px;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                        <tr>
                                                            <td style="border-radius: 6px; box-shadow: 0 2px 4px rgba(40,167,69,0.3);" class="approve-btn">
                                                                <a href="' . $approveUrl . '" class="action-button approve-btn" style="display: block; padding: 14px 22px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 6px;">✅ APPROVE ORDER</a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                                
                                                <td style="padding: 0 8px;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                        <tr>
                                                            <td style="border-radius: 6px; box-shadow: 0 2px 4px rgba(220,53,69,0.3);" class="reject-btn">
                                                                <a href="' . $rejectUrl . '" class="action-button reject-btn" style="display: block; padding: 14px 22px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 6px;">❌ REJECT ORDER</a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                                
                                                <td style="padding: 0 8px;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                        <tr>
                                                            <td style="border-radius: 6px; box-shadow: 0 2px 4px rgba(3,76,140,0.3);" class="view-btn">
                                                                <a href="' . $viewOrderUrl . '" class="action-button view-btn" style="display: block; padding: 14px 22px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 6px;">👁️ VIEW DETAILS</a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Nota informativa -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0; background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px;">
                                <tr>
                                    <td style="padding: 15px;">
                                        <p style="margin: 0; color: #856404; font-size: 12px; line-height: 1.4;">
                                            ⚠️ <strong>Important:</strong> This approval request will expire in 72 hours. After that time, the requester will need to submit a new request.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
                            <p style="color: #6c757d; margin: 0 0 8px 0; font-size: 12px;">🤖 This is an automated notification from the Premium Freight System.</p>
                            <p style="color: #6c757d; margin: 0 0 8px 0; font-size: 12px;">Please do not reply to this email. For support, contact the system administrator.</p>
                            <p style="color: #adb5bd; margin: 0; font-size: 10px;">© ' . date('Y') . ' GRAMMER AG - Premium Freight Management System</p>
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
        // URLs corregidas para acciones en bloque
        $approveAllUrl = $this->baseUrl . "PFmailBulkAction.php?action=approve&token=$approveAllToken";
        $rejectAllUrl = $this->baseUrl . "PFmailBulkAction.php?action=reject&token=$rejectAllToken";
        
        // Calcular estadísticas
        $totalOrders = count($orders);
        $totalCost = array_sum(array_column($orders, 'cost_euros'));
        $avgCost = $totalOrders > 0 ? $totalCost / $totalOrders : 0;
        
        // Formatear datos del aprobador
        $approverName = htmlspecialchars($approver['name'] ?? 'N/A', ENT_QUOTES, 'UTF-8');
        
        // Generar filas de órdenes (corregidas para usar PFmailSingleAction.php)
        $orderRows = $this->generateOrderRows($orders, $approver['id']);

        return '<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Weekly Premium Freight Summary</title>
    <style type="text/css">
        /* Estilos mejorados para el resumen semanal */
        .email-container { max-width: 800px; margin: 0 auto; }
        .stats-table { width: 100%; border-collapse: collapse; }
        .bulk-action-btn { 
            display: block; 
            padding: 14px 24px; 
            color: #ffffff !important; 
            text-decoration: none; 
            font-weight: bold; 
            border-radius: 6px;
            text-align: center;
        }
        .approve-all-btn { background-color: #28a745; }
        .reject-all-btn { background-color: #dc3545; }
        .orders-table { width: 100%; border-collapse: collapse; }
        .orders-table th { background-color: #034C8C; color: #ffffff; padding: 12px; text-align: left; }
        .orders-table td { padding: 12px; border-bottom: 1px solid #e9ecef; }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: Arial, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
        <tr>
            <td style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="800" class="email-container" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);" align="center">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #034C8C 0%, #0056a3 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">📊 Weekly Premium Freight Summary</h1>
                            <p style="color: #ffffff; margin: 0; font-size: 16px; opacity: 0.9;">Hello ' . $approverName . ', you have <strong>' . $totalOrders . '</strong> orders pending your approval</p>
                            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px; opacity: 0.8;">Week ending: ' . date('F d, Y') . '</p>
                        </td>
                    </tr>
                    
                    <!-- Contenido -->
                    <tr>
                        <td style="padding: 30px;">
                            
                            <!-- Estadísticas mejoradas -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 8px; margin: 20px 0; border: 1px solid #dee2e6;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <h3 style="margin: 0 0 20px 0; color: #333333; border-bottom: 2px solid #034C8C; padding-bottom: 10px;">📈 Summary Statistics</h3>
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="stats-table">
                                            <tr>
                                                <td style="padding: 12px 0; width: 50%;">
                                                    <div style="display: flex; align-items: center;">
                                                        <span style="font-size: 24px; margin-right: 10px;">📋</span>
                                                        <div>
                                                            <strong style="color: #333333; font-size: 14px;">Total Orders:</strong>
                                                            <div style="color: #034C8C; font-size: 20px; font-weight: bold;">' . $totalOrders . '</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style="padding: 12px 0; text-align: right; width: 50%;">
                                                    <div style="display: flex; align-items: center; justify-content: flex-end;">
                                                        <div style="text-align: right; margin-right: 10px;">
                                                            <strong style="color: #333333; font-size: 14px;">Total Value:</strong>
                                                            <div style="color: #28a745; font-size: 20px; font-weight: bold;">EUR ' . number_format($totalCost, 2) . '</div>
                                                        </div>
                                                        <span style="font-size: 24px;">💰</span>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 12px 0; border-top: 1px solid #dee2e6;" colspan="2">
                                                    <div style="text-align: center;">
                                                        <strong style="color: #333333; font-size: 14px;">Average Order Value:</strong>
                                                        <span style="color: #6c757d; font-size: 16px; font-weight: bold; margin-left: 10px;">EUR ' . number_format($avgCost, 2) . '</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Botones de acción en bloque mejorados -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0; background-color: #fff; border: 2px solid #e9ecef; border-radius: 8px;">
                                <tr>
                                    <td style="padding: 25px; text-align: center;">
                                        <h3 style="margin: 0 0 15px 0; color: #333333;">⚡ Quick Actions</h3>
                                        <p style="margin: 0 0 20px 0; color: #666666; font-size: 13px;">Process all orders at once with a single click:</p>
                                        
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                                            <tr>
                                                <td style="padding: 0 10px;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                        <tr>
                                                            <td style="border-radius: 6px; box-shadow: 0 3px 6px rgba(40,167,69,0.4);">
                                                                <a href="' . $approveAllUrl . '" class="bulk-action-btn approve-all-btn" style="display: block; padding: 14px 24px; color: #ffffff; text-decoration: none; font-weight: bold; background-color: #28a745; border-radius: 6px;">✅ APPROVE ALL ORDERS</a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                                <td style="padding: 0 10px;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                        <tr>
                                                            <td style="border-radius: 6px; box-shadow: 0 3px 6px rgba(220,53,69,0.4);">
                                                                <a href="' . $rejectAllUrl . '" class="bulk-action-btn reject-all-btn" style="display: block; padding: 14px 24px; color: #ffffff; text-decoration: none; font-weight: bold; background-color: #dc3545; border-radius: 6px;">❌ REJECT ALL ORDERS</a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <p style="margin: 15px 0 0 0; color: #6c757d; font-size: 11px;">
                                            ⚠️ Bulk actions will affect all ' . $totalOrders . ' orders listed below
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Tabla de órdenes mejorada -->
                            <div style="margin: 30px 0;">
                                <h3 style="margin: 0 0 15px 0; color: #333333;">📋 Orders Requiring Your Approval</h3>
                                <p style="margin: 0 0 15px 0; color: #666666; font-size: 13px;">Review each order individually or use the bulk actions above:</p>
                                
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="orders-table" style="border-collapse: collapse; border: 1px solid #dee2e6; border-radius: 6px; overflow: hidden;">
                                    <thead>
                                        <tr>
                                            <th style="background: linear-gradient(135deg, #034C8C 0%, #0056a3 100%); color: #ffffff; padding: 15px 12px; text-align: left; font-size: 12px; font-weight: bold;">Order #</th>
                                            <th style="background: linear-gradient(135deg, #034C8C 0%, #0056a3 100%); color: #ffffff; padding: 15px 12px; text-align: left; font-size: 12px; font-weight: bold;">Description</th>
                                            <th style="background: linear-gradient(135deg, #034C8C 0%, #0056a3 100%); color: #ffffff; padding: 15px 12px; text-align: left; font-size: 12px; font-weight: bold;">Area</th>
                                            <th style="background: linear-gradient(135deg, #034C8C 0%, #0056a3 100%); color: #ffffff; padding: 15px 12px; text-align: left; font-size: 12px; font-weight: bold;">Cost</th>
                                            <th style="background: linear-gradient(135deg, #034C8C 0%, #0056a3 100%); color: #ffffff; padding: 15px 12px; text-align: left; font-size: 12px; font-weight: bold;">Created</th>
                                            <th style="background: linear-gradient(135deg, #034C8C 0%, #0056a3 100%); color: #ffffff; padding: 15px 12px; text-align: center; font-size: 12px; font-weight: bold;">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ' . $orderRows . '
                                    </tbody>
                                </table>
                            </div>
                            
                            <!-- Nota informativa -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0; background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 6px;">
                                <tr>
                                    <td style="padding: 15px;">
                                        <p style="margin: 0; color: #0c5460; font-size: 12px; line-height: 1.4;">
                                            ℹ️ <strong>Reminder:</strong> These approval requests will expire in 72 hours. Orders not processed will require new approval requests from their creators.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
                            <p style="color: #6c757d; margin: 0 0 8px 0; font-size: 12px;">🤖 This is an automated weekly summary from the Premium Freight System.</p>
                            <p style="color: #6c757d; margin: 0 0 8px 0; font-size: 12px;">Please do not reply to this email. For support, contact the system administrator.</p>
                            <p style="color: #adb5bd; margin: 0; font-size: 10px;">© ' . date('Y') . ' GRAMMER AG - Premium Freight Management System</p>
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
        
        // Formatear datos
        $orderDescription = htmlspecialchars($orderData['description'] ?? 'N/A', ENT_QUOTES, 'UTF-8');
        $creatorName = htmlspecialchars($orderData['creator_name'] ?? 'N/A', ENT_QUOTES, 'UTF-8');
        $plantaName = htmlspecialchars($orderData['planta'] ?? 'N/A', ENT_QUOTES, 'UTF-8');
        $formattedDate = date('M d, Y H:i', strtotime($orderData['date']));

        if ($status === 'approved') {
            $statusMessage = "🎉 <strong>Great news!</strong> Your Premium Freight order has been <strong style='color: #28a745;'>approved</strong>.";
            $statusDetail = "Your request has been processed and approved. You can now proceed with the Premium Freight shipment.";
            $statusColor = "#28a745";
            $statusIcon = "✅";
            $statusBg = "#d4edda";
            $statusBorder = "#c3e6cb";
        } else {
            $statusMessage = "❌ Your Premium Freight order has been <strong style='color: #dc3545;'>rejected</strong>.";
            $statusDetail = "Unfortunately, your Premium Freight request could not be approved.";
            if ($rejectorInfo) {
                $rejectorName = htmlspecialchars($rejectorInfo['name'] ?? 'Unknown', ENT_QUOTES, 'UTF-8');
                $statusDetail .= " Rejection was processed by " . $rejectorName . ".";
            }
            $statusDetail .= " Please review the order details and consider submitting a new request if needed.";
            $statusColor = "#dc3545";
            $statusIcon = "❌";
            $statusBg = "#f8d7da";
            $statusBorder = "#f5c6cb";
        }

        return '<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Premium Freight Order Status Update</title>
    <style type="text/css">
        .status-badge { 
            padding: 8px 16px; 
            border-radius: 20px; 
            font-weight: bold; 
            display: inline-block; 
            margin: 10px 0;
        }
        .email-container { max-width: 600px; margin: 0 auto; }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: Arial, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
        <tr>
            <td style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);" align="center">
                    
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
                            <h2 style="color: #333333; margin: 0 0 15px 0; font-size: 18px;">📄 Order Status Update</h2>
                            
                            <!-- Estado destacado -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ' . $statusBg . '; border: 1px solid ' . $statusBorder . '; border-radius: 8px; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 20px; text-align: center;">
                                        <p style="margin: 0 0 10px 0; color: #333333; line-height: 1.6; font-size: 16px;">' . $statusMessage . '</p>
                                        <p style="margin: 0; color: #555555; line-height: 1.6; font-size: 14px;">' . $statusDetail . '</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Detalles de la orden -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 8px; margin: 20px 0; border: 1px solid #e9ecef;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <h3 style="color: #333333; margin: 0 0 20px 0; font-size: 16px; border-bottom: 2px solid #034C8C; padding-bottom: 10px;">📋 Order Details</h3>
                                        
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; width: 40%;">
                                                    <strong style="color: #333333;">🆔 Order ID:</strong>
                                                </td>
                                                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; text-align: right; color: #034C8C; font-weight: bold;">
                                                    #' . $orderData['id'] . '
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                                                    <strong style="color: #333333;">📝 Description:</strong>
                                                </td>
                                                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; text-align: right; color: #555555;">
                                                    ' . $orderDescription . '
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                                                    <strong style="color: #333333;">👤 Created by:</strong>
                                                </td>
                                                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; text-align: right; color: #555555;">
                                                    ' . $creatorName . '
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                                                    <strong style="color: #333333;">📅 Created:</strong>
                                                </td>
                                                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; text-align: right; color: #555555;">
                                                    ' . $formattedDate . '
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                                                    <strong style="color: #333333;">🏭 Area:</strong>
                                                </td>
                                                <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; text-align: right; color: #555555;">
                                                    ' . $plantaName . '
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0;">
                                                    <strong style="color: #333333;">💰 Cost:</strong>
                                                </td>
                                                <td style="padding: 10px 0; text-align: right; color: #28a745; font-weight: bold; font-size: 16px;">
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
                                                <td style="background-color: #034C8C; border-radius: 6px; text-align: center; box-shadow: 0 2px 4px rgba(3,76,140,0.3);">
                                                    <a href="' . $viewOrderUrl . '" style="display: block; padding: 14px 24px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 6px;">👁️ VIEW ORDER DETAILS</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Próximos pasos -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0; background-color: #e7f3ff; border: 1px solid #b8daff; border-radius: 6px;">
                                <tr>
                                    <td style="padding: 15px;">
                                        <h4 style="margin: 0 0 10px 0; color: #004085; font-size: 14px;">📌 Next Steps:</h4>
                                        ' . ($status === 'approved' 
                                            ? '<p style="margin: 0; color: #004085; font-size: 12px; line-height: 1.4;">You can now proceed with your Premium Freight shipment. Contact the logistics team if you need assistance with scheduling or documentation.</p>'
                                            : '<p style="margin: 0; color: #004085; font-size: 12px; line-height: 1.4;">If you believe this rejection was made in error or have questions, please contact your supervisor or the Premium Freight team for clarification.</p>'
                                        ) . '
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
                            <p style="color: #6c757d; margin: 0 0 8px 0; font-size: 12px;">🤖 This is an automated notification from the Premium Freight System.</p>
                            <p style="color: #6c757d; margin: 0 0 8px 0; font-size: 12px;">Please do not reply to this email. For support, contact the system administrator.</p>
                            <p style="color: #adb5bd; margin: 0; font-size: 10px;">© ' . date('Y') . ' GRAMMER AG - Premium Freight Management System</p>
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
     * Genera las filas de órdenes para el resumen semanal (CORREGIDO)
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
            $rowBgColor = ($rowCount % 2 === 0) ? '#f8f9fa' : '#ffffff';
            
            // Formatear datos de manera segura
            $costFormatted = number_format((float)($order['cost_euros'] ?? 0), 2);
            $createdDate = date('M d, Y', strtotime($order['date']));
            $orderDescription = htmlspecialchars($order['description'] ?? 'N/A', ENT_QUOTES, 'UTF-8');
            $plantaName = htmlspecialchars($order['planta'] ?? 'N/A', ENT_QUOTES, 'UTF-8');
            
            // Generar tokens para acciones individuales
            $approveToken = $this->generateActionToken($order['id'], $approverId, 'approve');
            $rejectToken = $this->generateActionToken($order['id'], $approverId, 'reject');
            
            // URLs CORREGIDAS para usar PFmailSingleAction.php
            $approveUrl = $this->baseUrl . "PFmailSingleAction.php?action=approve&token=$approveToken";
            $rejectUrl = $this->baseUrl . "PFmailSingleAction.php?action=reject&token=$rejectToken";
            $viewUrl = defined('URLPF') ? URLPF . "orders.php?highlight=" . $order['id'] : "#";
            
            $orderRows .= '
            <tr style="background-color: ' . $rowBgColor . ';">
                <td style="padding: 15px 12px; text-align: center; font-weight: bold; border-bottom: 1px solid #e9ecef; width: 10%; color: #034C8C;">
                    #' . $order['id'] . '
                </td>
                <td style="padding: 15px 12px; border-bottom: 1px solid #e9ecef; width: 35%; color: #333333; line-height: 1.4;">
                    <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="' . $orderDescription . '">
                        ' . $orderDescription . '
                    </div>
                </td>
                <td style="padding: 15px 12px; border-bottom: 1px solid #e9ecef; width: 15%; color: #555555;">
                    ' . $plantaName . '
                </td>
                <td style="padding: 15px 12px; text-align: center; border-bottom: 1px solid #e9ecef; width: 12%; color: #28a745; font-weight: bold;">
                    EUR ' . $costFormatted . '
                </td>
                <td style="padding: 15px 12px; text-align: center; border-bottom: 1px solid #e9ecef; width: 12%; color: #6c757d; font-size: 12px;">
                    ' . $createdDate . '
                </td>
                <td style="padding: 15px 12px; text-align: center; border-bottom: 1px solid #e9ecef; width: 16%;">
                    <!-- Botones en columna vertical -->
                    <div style="text-align: center;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto; width: 100%;">
                            <tr>
                                <td style="padding-bottom: 5px;">
                                    <a href="' . $approveUrl . '" style="background-color: #28a745; color: #ffffff; padding: 8px 12px; text-decoration: none; border-radius: 4px; font-size: 11px; display: block; text-align: center; width: 100%; box-sizing: border-box; font-weight: bold; box-shadow: 0 1px 3px rgba(40,167,69,0.3);">✅ APPROVE</a>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding-bottom: 5px;">
                                    <a href="' . $rejectUrl . '" style="background-color: #dc3545; color: #ffffff; padding: 8px 12px; text-decoration: none; border-radius: 4px; font-size: 11px; display: block; text-align: center; width: 100%; box-sizing: border-box; font-weight: bold; box-shadow: 0 1px 3px rgba(220,53,69,0.3);">❌ REJECT</a>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <a href="' . $viewUrl . '" style="background-color: #034C8C; color: #ffffff; padding: 8px 12px; text-decoration: none; border-radius: 4px; font-size: 11px; display: block; text-align: center; width: 100%; box-sizing: border-box; font-weight: bold; box-shadow: 0 1px 3px rgba(3,76,140,0.3);">👁️ VIEW</a>
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