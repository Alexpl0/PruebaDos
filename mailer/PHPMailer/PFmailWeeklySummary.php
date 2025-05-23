<?php
/**
 * PFmailWeeklySummary.php - Envía correos de resumen semanal
 * 
 * Este script debe ejecutarse mediante un cron job todos los viernes al mediodía.
 * Ejemplo de configuración del cron:
 * 0 12 * * 5 /usr/bin/php /path/to/PFmailWeeklySummary.php
 */

require_once 'PFmailer.php';

// Verificar que sea viernes o si se fuerza la ejecución
$today = date('w');
$hour = date('G');
$isForced = (isset($argv[1]) && $argv[1] === '--force');

if (($today == 5 && $hour >= 12) || $isForced) {
    // Inicializar el mailer y enviar los correos
    $mailer = new PFMailer();
    $result = $mailer->sendWeeklySummaryEmails();
    
    // Registrar resultados en el log
    $logMessage = date('Y-m-d H:i:s') . " - Correos de resumen semanal enviados: " . 
                 "Total: {$result['totalSent']}, " .
                 "Éxito: {$result['success']}, " .
                 "Errores: " . count($result['errors']) . "\n";
    
    // Añadir detalles de errores si existen
    if (!empty($result['errors'])) {
        $logMessage .= "Detalles de errores:\n" . implode("\n", $result['errors']) . "\n";
    }
    
    // Guardar en archivo de log
    if (!is_dir(__DIR__ . '/logs')) {
        mkdir(__DIR__ . '/logs', 0755, true);
    }
    file_put_contents(__DIR__ . '/logs/weekly_summary.log', $logMessage, FILE_APPEND);
    
    echo $logMessage;
} else {
    echo "No ejecutando: No es viernes por la tarde o no se usó la opción --force.";
}
?>