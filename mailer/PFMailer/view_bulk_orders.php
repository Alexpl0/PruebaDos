<?php
/**
 * ================================================================================
 * VIEW BULK ORDERS - PREMIUM FREIGHT SYSTEM
 * ================================================================================
 * 
 * PROPÓSITO:
 * Este archivo es el visualizador principal para múltiples órdenes de Premium Freight
 * que requieren aprobación. Permite a los usuarios revisar, aprobar, rechazar y 
 * descargar múltiples órdenes desde una interfaz unificada.
 * 
 * FUNCIONALIDADES PRINCIPALES:
 * 1. Validación de tokens individuales y bulk
 * 2. Carga de múltiples órdenes con toda su información relacionada
 * 3. Generación de tokens de acción para cada orden
 * 4. Interfaz visual con SVG para cada orden
 * 5. Acciones individuales y en lote (aprobar/rechazar/descargar)
 * 
 * FLUJO DE TRABAJO:
 * 1. Usuario accede mediante token válido (individual o bulk)
 * 2. Sistema valida token y obtiene IDs de órdenes asociadas
 * 3. Se cargan todos los datos de las órdenes desde la base de datos
 * 4. Se generan tokens únicos para acciones de cada orden
 * 5. Se presenta interfaz visual con SVG de cada orden
 * 6. Usuario puede procesar órdenes individualmente o en lote
 * 
 * PARÁMETROS REQUERIDOS:
 * - user: ID del usuario que realizará las acciones
 * - token: Token de acceso (puede ser individual o bulk)
 * - order: (opcional) ID de orden específica para filtrar
 * 
 * Version: 1.0
 * Autor: Sistema Premium Freight - Grammer AG
 * Fecha: 2024
 */

// ================================================================================
// CONFIGURACIÓN DE ERROR HANDLING Y LOGGING
// ================================================================================
error_reporting(E_ALL);                                    // Reportar todos los errores para debugging
ini_set('display_errors', 1);                             // Mostrar errores en pantalla durante desarrollo
ini_set('log_errors', 1);                                 // Habilitar logging de errores
ini_set('error_log', __DIR__ . '/view_bulk_orders_errors.log'); // Archivo específico para errores de este script

try {
    // ================================================================================
    // CARGA DE DEPENDENCIAS CRÍTICAS
    // ================================================================================
    
    /**
     * DEPENDENCIA: config.php
     * Contiene configuraciones globales del sistema incluyendo:
     * - Constantes de URL (URLM, URLPF)
     * - Configuraciones de base de datos
     * - Configuraciones de email
     */
    require_once __DIR__ . '/config.php';
    
    /**
     * DEPENDENCIA: PFDB.php
     * Maneja todas las conexiones y operaciones de base de datos:
     * - Clase LocalConector para conexión a MySQL
     * - Métodos de consulta seguros con prepared statements
     */
    require_once __DIR__ . '/PFDB.php';
    
    /**
     * DEPENDENCIA: PFmailUtils.php
     * Funciones de utilidad para el sistema de correos:
     * - showError(): Función para mostrar errores de manera consistente
     * - showSuccess(): Función para mostrar mensajes de éxito
     * - generateHtmlResponse(): Función para generar respuestas HTML
     */
    require_once __DIR__ . '/PFmailUtils.php';
    
    /**
     * DEPENDENCIA: PFEmailServices.php
     * Servicios de email y gestión de tokens:
     * - Clase PFEmailServices para generar tokens de acción
     * - Métodos para envío de correos
     * - Gestión de tokens de seguridad
     */
    require_once __DIR__ . '/PFEmailServices.php';

    // ================================================================================
    // VALIDACIÓN DE PARÁMETROS DE ENTRADA
    // ================================================================================
    
    /**
     * VALIDACIÓN CRÍTICA: Verificar parámetros básicos requeridos
     * 
     * user: ID del usuario que realizará las acciones (debe ser numérico y > 0)
     * token: Token de acceso válido (cadena hexadecimal de 64 caracteres)
     * 
     * Sin estos parámetros, el sistema no puede:
     * - Identificar al usuario autorizado
     * - Validar permisos de acceso
     * - Generar tokens de acción seguros
     */
    if (!isset($_GET['user']) || !isset($_GET['token'])) {
        showError('Required parameters missing. User ID and token are required.');
        exit;
    }

    // Extraer y sanitizar parámetros de entrada
    $userId = intval($_GET['user']);                       // Convertir a entero para prevenir inyección SQL
    $token = $_GET['token'];                               // Token como string (se validará contra DB)
    $specificOrderId = isset($_GET['order']) ? intval($_GET['order']) : null; // Orden específica opcional

    /**
     * VALIDACIÓN DE USER ID
     * Debe ser un entero positivo válido que corresponda a un usuario real en la DB
     */
    if ($userId <= 0) {
        showError('Invalid user ID.');
        exit;
    }

    /**
     * VALIDACIÓN DE TOKEN
     * No puede estar vacío - debe ser una cadena válida para verificar contra DB
     */
    if (empty($token)) {
        showError('Empty token.');
        exit;
    }

    // ================================================================================
    // CONEXIÓN A BASE DE DATOS
    // ================================================================================
    
    /**
     * ESTABLECER CONEXIÓN SEGURA A BASE DE DATOS
     * 
     * Utilizamos LocalConector que implementa:
     * - Conexión MySQLi con prepared statements
     * - Manejo automático de errores de conexión
     * - Configuración de charset UTF-8
     * - Timeouts apropiados para operaciones
     */
    $con = new LocalConector();
    $db = $con->conectar();

    // Verificar que la conexión sea exitosa antes de continuar
    if (!$db) {
        throw new Exception('Could not connect to database');
    }

    // ================================================================================
    // VALIDACIÓN DE TOKENS Y OBTENCIÓN DE ORDER IDS
    // ================================================================================
    
    /**
     * SISTEMA DUAL DE TOKENS
     * 
     * El sistema maneja dos tipos de tokens:
     * 
     * 1. TOKENS INDIVIDUALES (EmailActionTokens):
     *    - Asociados a una sola orden específica
     *    - Usados para acciones directas desde emails individuales
     *    - Tabla: EmailActionTokens(token, user_id, order_id)
     * 
     * 2. TOKENS BULK (EmailBulkActionTokens):
     *    - Asociados a múltiples órdenes
     *    - Usados para procesamiento en lote desde emails semanales
     *    - Tabla: EmailBulkActionTokens(token, user_id, order_ids JSON)
     */
    
    $tokenValid = false;                                   // Flag para rastrear validez del token
    $orderIds = [];                                        // Array de IDs de órdenes a procesar

    /**
     * FASE 1: VERIFICACIÓN COMO TOKEN INDIVIDUAL
     * 
     * Si se proporciona un specificOrderId, primero intentamos validar
     * como token individual para mayor precisión y seguridad
     */
    if ($specificOrderId) {
        $sql = "SELECT order_id FROM EmailActionTokens WHERE token = ? AND user_id = ? AND order_id = ?";
        $stmt = $db->prepare($sql);
        $stmt->bind_param("sii", $token, $userId, $specificOrderId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        // Si encontramos coincidencia exacta, es un token individual válido
        if ($result->num_rows > 0) {
            $tokenValid = true;
            $orderIds = [$specificOrderId];                // Solo procesar la orden específica
        }
    }

    /**
     * FASE 2: VERIFICACIÓN COMO TOKEN BULK
     * 
     * Si no es token individual válido, verificamos si es token bulk
     * Los tokens bulk contienen múltiples order IDs en formato JSON
     */
    if (!$tokenValid) {
        $sql = "SELECT order_ids FROM EmailBulkActionTokens WHERE token = ? AND user_id = ?";
        $stmt = $db->prepare($sql);
        $stmt->bind_param("si", $token, $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $row = $result->fetch_assoc();
            
            /**
             * DECODIFICACIÓN DE ORDER IDS
             * Los order_ids se almacenan como JSON array en la base de datos
             * Ejemplo: "[123, 456, 789]" -> [123, 456, 789]
             */
            $orderIds = json_decode($row['order_ids'], true);
            $tokenValid = true;
            
            /**
             * FILTRADO OPCIONAL POR ORDEN ESPECÍFICA
             * Si se especifica una orden particular dentro del bulk token,
             * filtramos para procesar solo esa orden
             */
            if ($specificOrderId && in_array($specificOrderId, $orderIds)) {
                $orderIds = [$specificOrderId];
            }
        }
    }

    /**
     * VALIDACIÓN FINAL DE TOKEN
     * Si después de ambas verificaciones el token no es válido,
     * el acceso debe ser denegado por seguridad
     */
    if (!$tokenValid) {
        showError('Invalid or expired token.');
        exit;
    }

    // ================================================================================
    // OBTENCIÓN DE INFORMACIÓN DEL USUARIO
    // ================================================================================
    
    /**
     * CARGAR DATOS COMPLETOS DEL USUARIO AUTORIZADO
     * 
     * Necesitamos la información del usuario para:
     * - Mostrar en la interfaz quien está realizando las acciones
     * - Registrar en logs quien aprobó/rechazó órdenes
     * - Personalizar la experiencia de usuario
     */
    $userSql = "SELECT name, email FROM User WHERE id = ?";
    $userStmt = $db->prepare($userSql);
    $userStmt->bind_param("i", $userId);
    $userStmt->execute();
    $userResult = $userStmt->get_result();
    
    // Verificar que el usuario existe en la base de datos
    if ($userResult->num_rows === 0) {
        showError('User not found.');
        exit;
    }
    
    $userData = $userResult->fetch_assoc();

    // ================================================================================
    // CARGA COMPLETA DE DATOS DE ÓRDENES
    // ================================================================================
    
    /**
     * CONSULTA COMPREHENSIVA DE ÓRDENES
     * 
     * Esta consulta obtiene TODOS los datos necesarios para mostrar y procesar las órdenes:
     * 
     * DATOS PRINCIPALES (tabla PremiumFreight):
     * - Información básica de la orden (id, descripción, costos, fechas)
     * - Referencias y números de tracking
     * - Estados y categorías
     * 
     * DATOS DEL CREADOR (tabla User):
     * - Nombre, email, rol y planta del usuario que creó la orden
     * 
     * DATOS DE UBICACIONES (tablas Location):
     * - Información completa de origen (compañía, ciudad, estado, ZIP)
     * - Información completa de destino (compañía, ciudad, estado, ZIP)
     * 
     * DATOS DEL TRANSPORTISTA (tabla Carriers):
     * - Nombre de la empresa de transporte
     * 
     * DATOS DE ESTADO (tabla Status):
     * - Estado actual de la orden
     * 
     * DATOS DE APROBACIONES (tabla PremiumFreightApprovals):
     * - Información de aprobaciones previas
     * - Usuario que aprobó y fecha
     */
    $ordersData = [];
    $placeholders = str_repeat('?,', count($orderIds) - 1) . '?';  // Crear placeholders dinámicos para IN clause
    
    $ordersSql = "SELECT 
                    pf.*,                                   -- Todos los campos de PremiumFreight
                    u.name AS creator_name,                 -- Nombre del creador
                    u.email AS creator_email,               -- Email del creador
                    u.role AS creator_role,                 -- Rol del creador
                    u.plant AS creator_plant,               -- Planta del creador
                    lo_from.company_name AS origin_company_name,    -- Compañía origen
                    lo_from.city AS origin_city,                    -- Ciudad origen
                    lo_from.state AS origin_state,                  -- Estado origen
                    lo_from.zip AS origin_zip,                      -- ZIP origen
                    lo_to.company_name AS destiny_company_name,     -- Compañía destino
                    lo_to.city AS destiny_city,                     -- Ciudad destino
                    lo_to.state AS destiny_state,                   -- Estado destino
                    lo_to.zip AS destiny_zip,                       -- ZIP destino
                    c.name AS carrier,                              -- Nombre transportista
                    st.id AS statusid,                              -- ID de estado
                    st.name AS status_name,                         -- Nombre de estado
                    pfa.id AS approval_id,                          -- ID de aprobación
                    pfa.approval_date,                              -- Fecha de aprobación
                    pfa.act_approv AS approval_status,              -- Estado de aprobación
                    u_approver.name AS approver_name,               -- Nombre del aprobador
                    u_approver.email AS approver_email,             -- Email del aprobador
                    u_approver.role AS approver_role                -- Rol del aprobador
                FROM PremiumFreight pf
                LEFT JOIN Carriers c ON pf.carrier_id = c.id
                LEFT JOIN User u ON pf.user_id = u.id
                LEFT JOIN Location lo_from ON pf.origin_id = lo_from.id
                LEFT JOIN Location lo_to ON pf.destiny_id = lo_to.id
                LEFT JOIN Status st ON pf.status_id = st.id
                LEFT JOIN PremiumFreightApprovals pfa ON pf.id = pfa.premium_freight_id
                LEFT JOIN User u_approver ON pfa.user_id = u_approver.id
                WHERE pf.id IN ($placeholders)";
    
    /**
     * EJECUCIÓN SEGURA DE CONSULTA
     * Utilizamos prepared statements para prevenir inyección SQL
     * bind_param con tipos dinámicos basados en cantidad de órdenes
     */
    $ordersStmt = $db->prepare($ordersSql);
    $ordersStmt->bind_param(str_repeat('i', count($orderIds)), ...$orderIds);
    $ordersStmt->execute();
    $ordersResult = $ordersStmt->get_result();

    // Recopilar todos los resultados en array para procesamiento
    while ($row = $ordersResult->fetch_assoc()) {
        $ordersData[] = $row;
    }

    // Verificar que encontramos órdenes válidas
    if (empty($ordersData)) {
        showError('No orders found.');
        exit;
    }

    // ================================================================================
    // GENERACIÓN DE TOKENS DE ACCIÓN SEGUROS
    // ================================================================================
    
    /**
     * GENERACIÓN DE TOKENS ÚNICOS PARA CADA ACCIÓN
     * 
     * Para cada orden, generamos tokens únicos y seguros que permiten:
     * 
     * 1. APPROVE TOKEN:
     *    - Permite aprobar la orden específica
     *    - Válido solo para el usuario actual
     *    - Tiempo de vida limitado por seguridad
     * 
     * 2. REJECT TOKEN:
     *    - Permite rechazar la orden específica
     *    - Válido solo para el usuario actual
     *    - Tiempo de vida limitado por seguridad
     * 
     * BENEFICIOS DE TOKENS ÚNICOS:
     * - Previene ataques CSRF
     * - Permite rastreo granular de acciones
     * - Cada acción requiere autorización específica
     * - Tokens expiran automáticamente por seguridad
     */
    $services = new PFEmailServices();
    $tokensData = [];
    
    foreach ($ordersData as $order) {
        /**
         * GENERAR TOKEN DE APROBACIÓN
         * Crea un token único que solo permite aprobar esta orden específica
         * por este usuario específico
         */
        $approveToken = $services->generateActionToken($order['id'], $userId, 'approve');
        
        /**
         * GENERAR TOKEN DE RECHAZO
         * Crea un token único que solo permite rechazar esta orden específica
         * por este usuario específico
         */
        $rejectToken = $services->generateActionToken($order['id'], $userId, 'reject');
        
        // Almacenar tokens organizados por ID de orden para fácil acceso
        $tokensData[$order['id']] = [
            'approve' => $approveToken,
            'reject' => $rejectToken
        ];
    }

    // ================================================================================
    // VALIDACIÓN DE CONSTANTES REQUERIDAS
    // ================================================================================
    
    /**
     * VERIFICAR CONSTANTES CRÍTICAS DEL SISTEMA
     * 
     * Estas constantes son esenciales para el funcionamiento:
     * - URLM: URL base del sistema de mailer
     * - URLPF: URL base del sistema Premium Freight
     * 
     * Sin estas constantes, el JavaScript no puede:
     * - Cargar archivos SVG correctamente
     * - Hacer llamadas AJAX a endpoints correctos
     * - Generar URLs de acción válidas
     */
    if (!defined('URLM')) {
        throw new Exception('URLM is not defined');
    }

    if (!defined('URLPF')) {
        throw new Exception('URLPF is not defined');
    }

} catch (Exception $e) {
    /**
     * MANEJO COMPREHENSIVO DE ERRORES
     * 
     * Cualquier error durante la inicialización es crítico y debe:
     * 1. Ser registrado en el log para debugging
     * 2. Mostrar mensaje de error al usuario
     * 3. Terminar ejecución de manera segura
     */
    $errorMsg = 'Error: ' . $e->getMessage();
    error_log("Error in view_bulk_orders.php: " . $errorMsg);
    showError($errorMsg);
    exit;
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Premium Freight Orders - <?php echo count($ordersData); ?> Orders - Grammer AG</title>
    
    <!-- ===== META TAGS PARA SEO Y SEGURIDAD ===== -->
    <meta name="description" content="Premium Freight Order Management System - Grammer AG">
    <meta name="author" content="Grammer AG">
    <meta name="robots" content="noindex, nofollow">  <!-- Prevenir indexación por motores de búsqueda -->
    
    <!-- ===== FUENTES EXTERNAS ===== -->
    <!-- Inter font para tipografía moderna y legible -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- ===== FRAMEWORKS CSS EXTERNOS ===== -->
    <!-- Bootstrap 5.3 para componentes y grid system responsivo -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Font Awesome 6.4 para iconografía consistente -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- ===== LIBRERÍAS JAVASCRIPT EXTERNAS ===== -->
    <!-- SweetAlert2 para modales y alertas elegantes -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- ===== CONFIGURACIÓN GLOBAL JAVASCRIPT ===== -->
    <script>
        /**
         * CONFIGURACIÓN GLOBAL DE LA APLICACIÓN BULK
         * 
         * Este objeto contiene toda la información crítica que necesita
         * el JavaScript del frontend para funcionar correctamente:
         * 
         * - userId: ID del usuario actual para validaciones
         * - userName: Nombre del usuario para personalización
         * - token: Token principal de acceso
         * - orders: Array completo de todas las órdenes con sus datos
         * - tokens: Tokens de acción únicos para cada orden
         * - urls: URLs críticas para llamadas AJAX
         * - totalOrders: Contador total para estadísticas
         * - isSpecificOrder: Flag para determinar si es vista de orden específica
         * - specificOrderId: ID de orden específica si aplica
         */
        window.PF_BULK_CONFIG = {
            userId: <?php echo $userId; ?>,
            userName: '<?php echo addslashes($userData['name']); ?>',
            token: '<?php echo addslashes($token); ?>',
            orders: <?php echo json_encode($ordersData); ?>,
            tokens: <?php echo json_encode($tokensData); ?>,
            urls: {
                base: '<?php echo URLM; ?>',
                pf: '<?php echo URLPF; ?>',
                singleAction: '<?php echo URLM; ?>PFmailSingleAction.php'
            },
            totalOrders: <?php echo count($ordersData); ?>,
            isSpecificOrder: <?php echo $specificOrderId ? 'true' : 'false'; ?>,
            specificOrderId: <?php echo $specificOrderId ?: 'null'; ?>
        };
    </script>
    
    <style>
        /* ===== VARIABLES CSS PERSONALIZADAS ===== */
        :root {
            /* Colores corporativos de Grammer */
            --grammer-blue: #034C8C;
            --grammer-light-blue: #4A90D9;
            --grammer-dark-blue: #002856;
            --grammer-accent: #00A3E0;
            
            /* Colores semánticos para estados */
            --success: #10B981;
            --warning: #F59E0B;
            --danger: #EF4444;
            --info: #3B82F6;
            
            /* Escala de grises consistente */
            --white: #FFFFFF;
            --gray-50: #F9FAFB;
            --gray-100: #F3F4F6;
            --gray-200: #E5E7EB;
            --gray-300: #D1D5DB;
            --gray-400: #9CA3AF;
            --gray-500: #6B7280;
            --gray-600: #4B5563;
            --gray-700: #374151;
            --gray-800: #1F2937;
            --gray-900: #111827;
            
            /* Variables de layout responsivo */
            --max-width: 1400px;
            --border-radius: 8px;
            --border-radius-lg: 12px;
            --spacing-xs: 0.25rem;
            --spacing-sm: 0.5rem;
            --spacing-md: 1rem;
            --spacing-lg: 1.5rem;
            --spacing-xl: 2rem;
            --spacing-2xl: 3rem;
            
            /* Sombras para profundidad visual */
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            
            /* Transiciones suaves */
            --transition-fast: 0.15s ease-in-out;
            --transition-normal: 0.3s ease-in-out;
            --transition-slow: 0.5s ease-in-out;
        }

        /* ===== ESTILOS BASE GLOBALES ===== */
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        html {
            font-size: 16px;
            scroll-behavior: smooth;  /* Scrolling suave para navegación */
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: var(--gray-800);
            background: linear-gradient(135deg, var(--gray-50) 0%, var(--gray-100) 100%);
            min-height: 100vh;
            -webkit-font-smoothing: antialiased;  /* Mejorar renderizado de fuentes en WebKit */
            -moz-osx-font-smoothing: grayscale;   /* Mejorar renderizado de fuentes en Firefox */
        }

        /* ===== CONTENEDOR PRINCIPAL BULK ===== */
        .bulk-container {
            max-width: var(--max-width);
            margin: 0 auto;
            background: var(--white);
            min-height: 100vh;
            box-shadow: var(--shadow-xl);
            position: relative;
            overflow: hidden;
        }

        /* ===== HEADER PRINCIPAL ===== */
        .bulk-header {
            background: linear-gradient(135deg, var(--grammer-blue) 0%, var(--grammer-dark-blue) 100%);
            color: var(--white);
            padding: var(--spacing-lg) var(--spacing-xl);
            position: relative;
            overflow: hidden;
        }

        /* Patrón de fondo decorativo para el header */
        .bulk-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23dots)"/></svg>');
            opacity: 0.2;
        }

        .bulk-header-content {
            position: relative;
            z-index: 1;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: var(--spacing-md);
            min-height: 80px;
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: var(--spacing-lg);
        }

        .company-logo {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
        }

        .company-logo i {
            font-size: 1.5rem;
            opacity: 0.9;
        }

        .company-name {
            font-size: 1.1rem;
            font-weight: 600;
            letter-spacing: -0.025em;
        }

        .orders-info {
            display: flex;
            flex-direction: column;
        }

        .orders-title-main {
            font-size: 1.8rem;
            font-weight: 700;
            margin-bottom: 0.25rem;
            text-shadow: 0 1px 2px rgba(0,0,0,0.1);
            letter-spacing: -0.025em;
            line-height: 1.2;
        }

        .orders-subtitle {
            font-size: 0.9rem;
            opacity: 0.8;
            font-weight: 400;
            line-height: 1;
        }

        .header-right {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
        }

        /* ===== PANEL DE ACCIONES BULK ===== */
        .bulk-actions-header {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: var(--border-radius);
            padding: var(--spacing-sm) var(--spacing-md);
        }

        .bulk-action-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--spacing-xs);
            padding: var(--spacing-sm) var(--spacing-md);
            background: var(--white);
            color: var(--gray-700);
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: var(--border-radius);
            font-size: 0.8rem;
            font-weight: 600;
            text-decoration: none;
            transition: var(--transition-normal);
            cursor: pointer;
            box-shadow: var(--shadow-sm);
            min-width: 90px;
            height: 36px;
        }

        .bulk-action-btn:hover {
            transform: translateY(-1px);
            box-shadow: var(--shadow-md);
        }

        /* Estilos específicos para botones de acción */
        .btn-approve-all {
            background: var(--success);
            color: var(--white);
        }

        .btn-approve-all:hover {
            background: #059669;
            color: var(--white);
        }

        .btn-reject-all {
            background: var(--danger);
            color: var(--white);
        }

        .btn-reject-all:hover {
            background: #dc2626;
            color: var(--white);
        }

        .btn-download-all {
            background: var(--grammer-accent);
            color: var(--white);
        }

        .btn-download-all:hover {
            background: #0891b2;
            color: var(--white);
        }

        /* ===== GRID DE ÓRDENES ===== */
        .orders-grid {
            padding: var(--spacing-xl);
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(600px, 1fr));
            gap: var(--spacing-xl);
        }

        /* ===== TARJETAS DE ORDEN INDIVIDUAL ===== */
        .order-card {
            background: var(--white);
            border: 1px solid var(--gray-200);
            border-radius: var(--border-radius-lg);
            box-shadow: var(--shadow-md);
            overflow: hidden;
            transition: var(--transition-normal);
            opacity: 1;
            transform: scale(1);
        }

        .order-card:hover {
            box-shadow: var(--shadow-lg);
            transform: translateY(-2px);
        }

        /* Estados visuales de las tarjetas */
        .order-card.processed {
            opacity: 0.6;
            transform: scale(0.98);
            filter: grayscale(0.3);
        }

        .order-card.hidden {
            display: none;
        }

        /* ===== HEADER DE ORDEN INDIVIDUAL ===== */
        .order-header {
            background: linear-gradient(90deg, var(--grammer-blue), var(--grammer-light-blue));
            color: var(--white);
            padding: var(--spacing-md) var(--spacing-lg);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .order-title {
            font-size: 1.25rem;
            font-weight: 700;
            margin: 0;
        }

        .order-actions {
            display: flex;
            gap: var(--spacing-xs);
        }

        .order-action-btn {
            display: flex;
            align-items: center;
            gap: var(--spacing-xs);
            padding: var(--spacing-xs) var(--spacing-sm);
            font-size: 0.75rem;
            font-weight: 500;
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: var(--border-radius);
            background: rgba(255,255,255,0.1);
            color: var(--white);
            text-decoration: none;
            transition: var(--transition-fast);
            cursor: pointer;
        }

        .order-action-btn:hover {
            background: rgba(255,255,255,0.2);
            color: var(--white);
        }

        /* Estilos específicos para botones de orden */
        .btn-approve-order {
            background: var(--success);
            border-color: var(--success);
        }

        .btn-approve-order:hover {
            background: #059669;
            border-color: #059669;
            color: var(--white);
        }

        .btn-reject-order {
            background: var(--danger);
            border-color: var(--danger);
        }

        .btn-reject-order:hover {
            background: #dc2626;
            border-color: #dc2626;
            color: var(--white);
        }

        .btn-download-order {
            background: var(--grammer-accent);
            border-color: var(--grammer-accent);
        }

        .btn-download-order:hover {
            background: #0891b2;
            border-color: #0891b2;
            color: var(--white);
        }

        /* ===== CONTENIDO DE ORDEN ===== */
        .order-content {
            padding: var(--spacing-lg);
        }

        .order-svg-container {
            background: var(--gray-50);
            border: 1px solid var(--gray-200);
            border-radius: var(--border-radius);
            padding: var(--spacing-md);
            margin-bottom: var(--spacing-lg);
            min-height: 600px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: var(--transition-normal);
        }

        .order-svg-container:hover {
            background: var(--white);
            box-shadow: var(--shadow-sm);
        }

        .order-svg-container svg {
            width: 100%;
            height: auto;
            transition: var(--transition-normal);
        }

        /* ===== INDICADORES DE ESTADO ===== */
        .status-indicator {
            position: absolute;
            top: var(--spacing-sm);
            right: var(--spacing-sm);
            padding: var(--spacing-xs) var(--spacing-sm);
            border-radius: 9999px;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .status-approved {
            background: var(--success);
            color: var(--white);
        }

        .status-rejected {
            background: var(--danger);
            color: var(--white);
        }

        .status-pending {
            background: var(--warning);
            color: var(--white);
        }

        /* ===== PANEL FLOTANTE DE RESUMEN ===== */
        .floating-summary {
            position: fixed;
            bottom: var(--spacing-lg);
            right: var(--spacing-lg);
            background: var(--white);
            border: 1px solid var(--gray-200);
            border-radius: var(--border-radius-lg);
            box-shadow: var(--shadow-xl);
            padding: var(--spacing-md);
            min-width: 250px;
            z-index: 1000;
        }

        .summary-title {
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--gray-800);
            margin-bottom: var(--spacing-sm);
        }

        .summary-stats {
            display: flex;
            justify-content: space-between;
            font-size: 0.8rem;
            color: var(--gray-600);
        }

        /* ===== ESTADOS DE CARGA ===== */
        .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255,255,255,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
        }

        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid var(--gray-200);
            border-top: 4px solid var(--grammer-blue);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* ===== DISEÑO RESPONSIVO ===== */
        @media (max-width: 768px) {
            .orders-grid {
                grid-template-columns: 1fr;
                padding: var(--spacing-md);
            }
            
            .bulk-header-content {
                flex-direction: column;
                align-items: flex-start;
                gap: var(--spacing-sm);
            }
            
            .bulk-actions-header {
                flex-wrap: wrap;
            }
            
            .floating-summary {
                position: relative;
                bottom: auto;
                right: auto;
                margin: var(--spacing-md);
            }
        }
    </style>
</head>
<body>
    <div class="bulk-container">
        <!-- ===== HEADER PRINCIPAL CON INFORMACIÓN Y ACCIONES ===== -->
        <header class="bulk-header">
            <div class="bulk-header-content">
                <div class="header-left">
                    <!-- Logo y nombre de la compañía -->
                    <div class="company-logo">
                        <i class="fas fa-truck-fast"></i>
                        <span class="company-name">Grammer AG</span>
                    </div>
                    <!-- Información de las órdenes -->
                    <div class="orders-info">
                        <h1 class="orders-title-main">Premium Freight Orders</h1>
                        <p class="orders-subtitle"><?php echo count($ordersData); ?> orders pending approval by <?php echo htmlspecialchars($userData['name']); ?></p>
                    </div>
                </div>
                <div class="header-right">
                    <!-- Panel de acciones bulk -->
                    <div class="bulk-actions-header">
                        <button id="approve-all-btn" class="bulk-action-btn btn-approve-all">
                            <i class="fas fa-check-double"></i>
                            Approve All
                        </button>
                        <button id="reject-all-btn" class="bulk-action-btn btn-reject-all">
                            <i class="fas fa-times-circle"></i>
                            Reject All
                        </button>
                        <button id="download-all-btn" class="bulk-action-btn btn-download-all">
                            <i class="fas fa-download"></i>
                            Download All
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- ===== GRID PRINCIPAL DE ÓRDENES ===== -->
        <main class="orders-grid" id="orders-grid">
            <?php foreach ($ordersData as $order): ?>
            <!-- Tarjeta individual para cada orden -->
            <div class="order-card" data-order-id="<?php echo $order['id']; ?>">
                <div class="order-header">
                    <h2 class="order-title">Order #<?php echo $order['id']; ?></h2>
                    <div class="order-actions">
                        <!-- Botón de aprobación con token único -->
                        <button class="order-action-btn btn-approve-order" 
                                data-order-id="<?php echo $order['id']; ?>"
                                data-token="<?php echo $tokensData[$order['id']]['approve']; ?>">
                            <i class="fas fa-check"></i>
                            Approve
                        </button>
                        <!-- Botón de rechazo con token único -->
                        <button class="order-action-btn btn-reject-order"
                                data-order-id="<?php echo $order['id']; ?>"
                                data-token="<?php echo $tokensData[$order['id']]['reject']; ?>">
                            <i class="fas fa-times"></i>
                            Reject
                        </button>
                        <!-- Botón de descarga PDF -->
                        <button class="order-action-btn btn-download-order"
                                data-order-id="<?php echo $order['id']; ?>">
                            <i class="fas fa-download"></i>
                            PDF
                        </button>
                    </div>
                </div>
                <div class="order-content">
                    <!-- Contenedor para SVG que será populado por JavaScript -->
                    <div class="order-svg-container" id="svg-container-<?php echo $order['id']; ?>">
                        <div class="loading-spinner"></div>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </main>

        <!-- ===== PANEL FLOTANTE DE PROGRESO ===== -->
        <div class="floating-summary" id="floating-summary">
            <div class="summary-title">Progress Summary</div>
            <div class="summary-stats">
                <span>Pending: <span id="pending-count"><?php echo count($ordersData); ?></span></span>
                <span>Processed: <span id="processed-count">0</span></span>
            </div>
        </div>
    </div>

    <!-- ===== LÓGICA PRINCIPAL DE LA APLICACIÓN ===== -->
    <script type="module">
        /**
         * IMPORTACIÓN DE MÓDULOS CRÍTICOS
         * 
         * loadAndPopulateSVG: Función para cargar y poblar SVGs con datos de órdenes
         * generatePDF: Función para generar y descargar PDFs de órdenes
         */
        import { loadAndPopulateSVG, generatePDF } from '<?php echo URLPF; ?>js/svgOrders.js';

        /**
         * ================================================================================
         * CLASE PRINCIPAL: BulkOrdersViewer
         * ================================================================================
         * 
         * Esta clase maneja toda la funcionalidad del visualizador de órdenes bulk:
         * 
         * RESPONSABILIDADES PRINCIPALES:
         * 1. Inicialización y configuración de la aplicación
         * 2. Carga de SVGs para todas las órdenes
         * 3. Manejo de eventos de usuario (clicks, acciones)
         * 4. Procesamiento de acciones individuales y bulk
         * 5. Actualización de UI en tiempo real
         * 6. Comunicación con backend via AJAX
         * 7. Generación de PDFs
         * 8. Manejo de estados y errores
         */
        class BulkOrdersViewer {
            /**
             * CONSTRUCTOR DE LA CLASE
             * 
             * Inicializa la instancia con configuración global y estado inicial:
             * - Obtiene configuración de window.PF_BULK_CONFIG
             * - Inicializa Set para rastrear órdenes procesadas
             * - Lanza proceso de inicialización asíncrono
             */
            constructor() {
                this.config = window.PF_BULK_CONFIG;           // Configuración global de PHP
                this.processedOrders = new Set();             // Set para rastrear órdenes ya procesadas
                this.initialize();                             // Iniciar proceso de configuración
            }

            /**
             * MÉTODO DE INICIALIZACIÓN PRINCIPAL
             * 
             * Coordina la inicialización completa de la aplicación:
             * 
             * SECUENCIA DE INICIALIZACIÓN:
             * 1. Log de información de configuración para debugging
             * 2. Carga asíncrona de todos los SVGs de órdenes
             * 3. Configuración de event listeners para interacciones
             * 4. Actualización inicial del resumen de progreso
             * 
             * Este método es async porque la carga de SVGs requiere operaciones asíncronas
             */
            async initialize() {
                console.log('Initializing Bulk Orders Viewer:', this.config);
                
                // Cargar visualizaciones SVG para todas las órdenes
                await this.loadAllOrderSVGs();
                
                // Configurar manejadores de eventos para todas las interacciones
                this.setupEventListeners();
                
                // Actualizar estadísticas iniciales en panel flotante
                this.updateSummary();
            }

            /**
             * CARGA MASIVA DE SVGs PARA TODAS LAS ÓRDENES
             * 
             * ESTRATEGIA DE CARGA:
             * - Crea array de promesas para carga paralela
             * - Cada orden se carga de manera independiente
             * - Promise.all espera a que todas las cargas terminen
             * - Manejo individual de errores por orden
             * 
             * BENEFICIOS:
             * - Carga paralela mejora performance significativamente
             * - Una orden que falle no afecta a las demás
             * - Usuario ve progreso visual mientras cargan
             */
            async loadAllOrderSVGs() {
                const promises = this.config.orders.map(order => this.loadOrderSVG(order));
                await Promise.all(promises);
            }

            /**
             * CARGA INDIVIDUAL DE SVG PARA UNA ORDEN ESPECÍFICA
             * 
             * PROCESO DE CARGA:
             * 1. Genera containerId único basado en ID de orden
             * 2. Llama a loadAndPopulateSVG del módulo svgOrders.js
             * 3. La función pobla el SVG con datos específicos de la orden
             * 4. Maneja errores mostrando mensaje de error en contenedor
             * 
             * PARÁMETROS:
             * @param {Object} orderData - Datos completos de la orden desde PHP
             * 
             * MANEJO DE ERRORES:
             * - Captura cualquier error durante la carga
             * - Muestra mensaje de error visual en lugar del SVG
             * - Permite que otras órdenes continúen cargando
             */
            async loadOrderSVG(orderData) {
                try {
                    const containerId = `svg-container-${orderData.id}`;
                    
                    // Usar la misma función que view_order.php para consistencia
                    await loadAndPopulateSVG(orderData, containerId);
                    
                    console.log(`SVG loaded for order ${orderData.id}`);
                } catch (error) {
                    console.error(`Error loading SVG for order ${orderData.id}:`, error);
                    
                    // Mostrar mensaje de error en lugar del SVG
                    const container = document.getElementById(`svg-container-${orderData.id}`);
                    if (container) {
                        container.innerHTML = `
                            <div style="text-align: center; color: #ef4444;">
                                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                                <p>Error loading order visualization</p>
                            </div>
                        `;
                    }
                }
            }

            /**
             * CONFIGURACIÓN DE EVENT LISTENERS
             * 
             * Configura todos los manejadores de eventos para:
             * 
             * ACCIONES INDIVIDUALES POR ORDEN:
             * - Botones de aprobación (.btn-approve-order)
             * - Botones de rechazo (.btn-reject-order)
             * - Botones de descarga (.btn-download-order)
             * 
             * ACCIONES BULK (TODAS LAS ÓRDENES):
             * - Aprobar todas (#approve-all-btn)
             * - Rechazar todas (#reject-all-btn)
             * - Descargar todas (#download-all-btn)
             * 
             * PATRÓN DE EVENT DELEGATION:
             * - Usa querySelectorAll para encontrar todos los elementos
             * - Cada listener maneja múltiples elementos del mismo tipo
             * - Delegación eficiente para elementos dinámicos
             */
            setupEventListeners() {
                // ===== EVENT LISTENERS PARA ACCIONES INDIVIDUALES =====
                
                /**
                 * BOTONES DE APROBACIÓN INDIVIDUAL
                 * Cada botón maneja la aprobación de una orden específica
                 */
                document.querySelectorAll('.btn-approve-order').forEach(btn => {
                    btn.addEventListener('click', (e) => this.handleIndividualAction(e, 'approve'));
                });

                /**
                 * BOTONES DE RECHAZO INDIVIDUAL
                 * Cada botón maneja el rechazo de una orden específica
                 */
                document.querySelectorAll('.btn-reject-order').forEach(btn => {
                    btn.addEventListener('click', (e) => this.handleIndividualAction(e, 'reject'));
                });

                /**
                 * BOTONES DE DESCARGA INDIVIDUAL
                 * Cada botón genera y descarga PDF de una orden específica
                 */
                document.querySelectorAll('.btn-download-order').forEach(btn => {
                    btn.addEventListener('click', (e) => this.handleDownloadOrder(e));
                });

                // ===== EVENT LISTENERS PARA ACCIONES BULK =====
                
                /**
                 * BOTÓN APROBAR TODAS
                 * Procesa aprobación de todas las órdenes pendientes
                 */
                document.getElementById('approve-all-btn').addEventListener('click', () => this.handleBulkAction('approve'));
                
                /**
                 * BOTÓN RECHAZAR TODAS
                 * Procesa rechazo de todas las órdenes pendientes
                 */
                document.getElementById('reject-all-btn').addEventListener('click', () => this.handleBulkAction('reject'));
                
                /**
                 * BOTÓN DESCARGAR TODAS
                 * Genera PDFs para todas las órdenes
                 */
                document.getElementById('download-all-btn').addEventListener('click', () => this.handleDownloadAll());
            }

            /**
             * MANEJADOR DE ACCIONES INDIVIDUALES (APROBAR/RECHAZAR)
             * 
             * FLUJO DE PROCESAMIENTO:
             * 1. Extrae información del botón clickeado (order ID, token)
             * 2. Verifica si la orden ya fue procesada
             * 3. Muestra confirmación con SweetAlert2
             * 4. Si se confirma, procesa la acción
             * 
             * PARÁMETROS:
             * @param {Event} event - Evento de click del botón
             * @param {string} action - Tipo de acción ('approve' o 'reject')
             * 
             * VALIDACIONES:
             * - Verifica que la orden no haya sido procesada previamente
             * - Requiere confirmación explícita del usuario
             * - Usa tokens únicos para seguridad
             */
            async handleIndividualAction(event, action) {
                // Obtener información del botón clickeado
                const btn = event.target.closest('.order-action-btn');
                const orderId = btn.getAttribute('data-order-id');
                const token = btn.getAttribute('data-token');

                // Verificar si la orden ya fue procesada
                if (this.processedOrders.has(orderId)) {
                    Swal.fire({
                        icon: 'info',
                        title: 'Already Processed',
                        text: `Order #${orderId} has already been ${action}d.`
                    });
                    return;
                }

                // Mostrar confirmación antes de procesar
                const result = await Swal.fire({
                    title: `${action.charAt(0).toUpperCase() + action.slice(1)} Order #${orderId}?`,
                    text: `Are you sure you want to ${action} this order?`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: action === 'approve' ? '#10B981' : '#EF4444',
                    confirmButtonText: `Yes, ${action}!`,
                    cancelButtonText: 'Cancel'
                });

                // Procesar acción si fue confirmada
                if (result.isConfirmed) {
                    await this.processAction(token, action, orderId);
                }
            }

            /**
             * MANEJADOR DE ACCIONES BULK (TODAS LAS ÓRDENES)
             * 
             * LÓGICA DE PROCESAMIENTO BULK:
             * 1. Filtra órdenes que aún no han sido procesadas
             * 2. Verifica que haya órdenes pendientes
             * 3. Muestra confirmación con advertencia
             * 4. Procesa cada orden individualmente en secuencia
             * 
             * PARÁMETROS:
             * @param {string} action - Tipo de acción ('approve' o 'reject')
             * 
             * CONSIDERACIONES:
             * - Solo procesa órdenes que no han sido procesadas
             * - Requiere confirmación explícita por el impacto masivo
             * - Procesa en secuencia para evitar sobrecarga del servidor
             * - Cada orden usa su token individual para seguridad
             */
            async handleBulkAction(action) {
                // Filtrar solo órdenes que no han sido procesadas
                const pendingOrders = this.config.orders.filter(order => !this.processedOrders.has(order.id.toString()));
                
                // Verificar si hay órdenes pendientes
                if (pendingOrders.length === 0) {
                    Swal.fire({
                        icon: 'info',
                        title: 'No Pending Orders',
                        text: 'All orders have been processed already.'
                    });
                    return;
                }

                // Mostrar confirmación con advertencia de impacto masivo
                const result = await Swal.fire({
                    title: `${action.charAt(0).toUpperCase() + action.slice(1)} All Orders?`,
                    text: `This will ${action} ${pendingOrders.length} pending orders. This action cannot be undone.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: action === 'approve' ? '#10B981' : '#EF4444',
                    confirmButtonText: `Yes, ${action} all!`,
                    cancelButtonText: 'Cancel'
                });

                if (result.isConfirmed) {
                    // Procesar cada orden individualmente con su token único
                    for (const order of pendingOrders) {
                        const token = this.config.tokens[order.id][action];
                        await this.processAction(token, action, order.id);
                    }
                }
            }

            /**
             * PROCESAMIENTO CORE DE ACCIONES (BACKEND COMMUNICATION)
             * 
             * FLUJO DE COMUNICACIÓN CON BACKEND:
             * 1. Construye URL con parámetros de acción y token
             * 2. Muestra indicador de carga con SweetAlert2
             * 3. Ejecuta llamada AJAX al endpoint de procesamiento
             * 4. Verifica respuesta y actualiza UI según resultado
             * 5. Maneja errores y muestra feedback apropiado
             * 
             * PARÁMETROS:
             * @param {string} token - Token único para la acción específica
             * @param {string} action - Tipo de acción ('approve' o 'reject')
             * @param {number|string} orderId - ID de la orden a procesar
             * 
             * SEGURIDAD:
             * - Cada llamada usa token único y temporal
             * - Validación server-side de permisos
             * - Timeouts para prevenir requests colgados
             * 
             * FEEDBACK VISUAL:
             * - Loading spinner durante procesamiento
             * - Mensajes de éxito/error claros
             * - Actualización inmediata de UI
             */
            async processAction(token, action, orderId) {
                try {
                    // Construir URL del endpoint con parámetros
                    const url = `${this.config.urls.singleAction}?action=${action}&token=${token}`;
                    
                    // Mostrar indicador de carga
                    Swal.fire({
                        title: 'Processing...',
                        text: `${action.charAt(0).toUpperCase() + action.slice(1)}ing order #${orderId}`,
                        allowOutsideClick: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });

                    // Ejecutar llamada AJAX
                    const response = await fetch(url, { method: 'GET' });
                    
                    if (response.ok) {
                        // ÉXITO: Actualizar estado local y UI
                        this.processedOrders.add(orderId.toString());
                        this.markOrderAsProcessed(orderId, action);
                        this.updateSummary();
                        
                        // Mostrar mensaje de éxito
                        Swal.fire({
                            icon: 'success',
                            title: 'Success!',
                            text: `Order #${orderId} has been ${action}d successfully.`,
                            timer: 2000,
                            timerProgressBar: true
                        });
                    } else {
                        // ERROR HTTP: Lanzar excepción con detalles
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                } catch (error) {
                    // MANEJO DE ERRORES: Log y feedback al usuario
                    console.error('Error processing action:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: `Failed to ${action} order #${orderId}. Please try again.`
                    });
                }
            }

            /**
             * ACTUALIZACIÓN VISUAL DE ORDEN PROCESADA
             * 
             * CAMBIOS VISUALES APLICADOS:
             * 1. Añade clase 'processed' para estilos CSS
             * 2. Crea y añade indicador de estado visual
             * 3. Programa ocultación automática opcional
             * 
             * PARÁMETROS:
             * @param {number|string} orderId - ID de la orden procesada
             * @param {string} action - Acción realizada ('approve' o 'reject')
             * 
             * FEEDBACK VISUAL:
             * - Cambio de opacidad y escala de la tarjeta
             * - Badge de estado (APPROVED/REJECTED)
             * - Opción de ocultar orden después de delay
             */
            markOrderAsProcessed(orderId, action) {
                const orderCard = document.querySelector(`[data-order-id="${orderId}"]`);
                if (orderCard) {
                    // Aplicar clase CSS para cambios visuales
                    orderCard.classList.add('processed');
                    
                    // Crear y añadir indicador de estado
                    const orderHeader = orderCard.querySelector('.order-header');
                    const statusIndicator = document.createElement('div');
                    statusIndicator.className = `status-indicator status-${action}d`;
                    statusIndicator.textContent = action === 'approve' ? 'APPROVED' : 'REJECTED';
                    orderHeader.appendChild(statusIndicator);
                    
                    // Opción de ocultar orden después de delay
                    setTimeout(() => {
                        if (confirm(`Hide processed order #${orderId}?`)) {
                            orderCard.classList.add('hidden');
                        }
                    }, 3000);
                }
            }

            /**
             * MANEJADOR DE DESCARGA DE PDF
             * 
             * FLUJO DE DESCARGA:
             * 1. Extrae ID de orden del botón clickeado
             * 2. Busca datos completos de la orden en configuración
             * 3. Llama a generatePDF del módulo svgOrders.js
             * 4. Muestra feedback de éxito o error
             * 
             * PARÁMETROS:
             * @param {Event} event - Evento de click del botón
             * 
             * VALIDACIONES:
             * - Verifica que los datos de la orden existan
             * - Muestra mensaje de error si faltan datos
             */
            async handleDownloadOrder(event) {
                const btn = event.target.closest('.order-action-btn');
                const orderId = btn.getAttribute('data-order-id');
                const orderData = this.config.orders.find(o => o.id == orderId);
                
                // Validar que los datos de la orden estén disponibles
                if (!orderData) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Order data not found.'
                    });
                    return;
                }

                try {
                    // Llamar a la función de generación de PDF
                    await generatePDF(orderData, `PF_Order_${orderId}`);
                    
                    // Mostrar mensaje de éxito con temporizador
                    Swal.fire({
                        icon: 'success',
                        title: 'PDF Downloaded!',
                        text: `Order #${orderId} has been downloaded successfully.`,
                        timer: 2000,
                        timerProgressBar: true
                    });
                } catch (error) {
                    // Manejo de errores específico para generación de PDF
                    console.error('Error generating PDF:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to generate PDF. Please try again.'
                    });
                }
            }

            /**
             * MANEJADOR DE DESCARGA DE TODOS LOS PDFs
             * 
             * FLUJO DE DESCARGA MASIVO:
             * 1. Muestra confirmación antes de iniciar descarga masiva
             * 2. Muestra indicador de progreso durante la generación
             * 3. Genera y descarga cada PDF de orden en secuencia
             * 4. Maneja errores y muestra feedback al usuario
             * 
             * CONSIDERACIONES:
             * - Descarga en secuencia para evitar sobrecarga del servidor
             * - Actualiza el progreso en tiempo real
             * - Muestra mensaje final de éxito o error
             */
            async handleDownloadAll() {
                // Confirmar acción con el usuario
                const result = await Swal.fire({
                    title: 'Download All Orders?',
                    text: `This will generate PDFs for ${this.config.orders.length} orders. This may take a few moments.`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#034C8C',
                    confirmButtonText: 'Yes, download all!',
                    cancelButtonText: 'Cancel'
                });

                if (result.isConfirmed) {
                    try {
                        // Mostrar indicador de generación de PDFs
                        Swal.fire({
                            title: 'Generating PDFs...',
                            text: 'Please wait while we generate all PDFs.',
                            allowOutsideClick: false,
                            didOpen: () => {
                                Swal.showLoading();
                            }
                        });

                        // Generar PDF para cada orden en secuencia
                        for (let i = 0; i < this.config.orders.length; i++) {
                            const order = this.config.orders[i];
                            await generatePDF(order, `PF_Order_${order.id}`);
                            
                            // Actualizar progreso en el diálogo
                            const progress = ((i + 1) / this.config.orders.length) * 100;
                            Swal.update({
                                text: `Generated ${i + 1} of ${this.config.orders.length} PDFs (${Math.round(progress)}%)`
                            });
                        }

                        // Mostrar mensaje de éxito al finalizar
                        Swal.fire({
                            icon: 'success',
                            title: 'All PDFs Downloaded!',
                            text: `Successfully generated ${this.config.orders.length} PDF files.`,
                            timer: 3000,
                            timerProgressBar: true
                        });
                    } catch (error) {
                        // Manejo de errores durante la generación masiva de PDFs
                        console.error('Error generating PDFs:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to generate some PDFs. Please try again.'
                        });
                    }
                }
            }

            /**
             * ACTUALIZACIÓN DEL RESUMEN EN EL PANEL FLOTANTE
             * 
             * Este método actualiza los contadores de órdenes pendientes y procesadas
             * en el panel flotante de resumen:
             * 
             * - pendingCount: Total de órdenes menos las procesadas
             * - processedCount: Total de órdenes procesadas
             * 
             * Se llama automáticamente después de cada acción para reflejar el estado actual
             */
            updateSummary() {
                const pendingCount = this.config.orders.length - this.processedOrders.size;
                const processedCount = this.processedOrders.size;
                
                document.getElementById('pending-count').textContent = pendingCount;
                document.getElementById('processed-count').textContent = processedCount;
            }
        }

        // Inicializar cuando el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => new BulkOrdersViewer());
        } else {
            new BulkOrdersViewer();
        }
    </script>
</body>
</html>