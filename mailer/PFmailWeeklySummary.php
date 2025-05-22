<?php
/**
 * PFmailWeeklySummary.php - Envía correos de resumen semanal
 * 
 * Este script debe ejecutarse mediante un cron job todos los viernes al mediodía.
 * Ejemplo de configuración del cron:
 * 0 12 * * 5 /usr/bin/php /path/to/PFmailWeeklySummary.php
 */

require_once 'PFmailer.php';

// Verificar que sea viernes 
$today = date('w');
$hour = date('G');

// Ejecutar solo los viernes (día 5) o si se fuerza la ejecución
$isForced = (isset($argv[1]) && $argv[1] === '--force');

if (($today == 5 && $hour >= 12) || $isForced) {
    $mailer = new PFMailer();
    $result = $mailer->sendWeeklySummaryEmails();
    
    // Registrar resultados
    $logMessage = date('Y-m-d H:i:s') . " - Weekly summary emails sent: " . 
                 "Total: {$result['totalSent']}, " .
                 "Success: {$result['success']}, " .
                 "Errors: " . count($result['errors']) . "\n";
    
    if (!empty($result['errors'])) {
        $logMessage .= "Error details:\n" . implode("\n", $result['errors']) . "\n";
    }
    
    file_put_contents(__DIR__ . '/logs/weekly_summary.log', $logMessage, FILE_APPEND);
    
    echo $logMessage;
} else {
    echo "Not running: It's not Friday afternoon or --force option was not used.";
}
?>