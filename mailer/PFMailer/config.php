<?php
// Agregar más debug al inicio del config.php
error_log("=== config.php - Siendo ejecutado ===");
error_log("Config file path: " . __FILE__);

// Definir constantes principales
define('URL', 'https://grammermx.com/Mailer/PFMailer/');
define('URLPF', 'https://grammermx.com/Jesus/PruebaDos/');

// Confirmar que las constantes se definieron
error_log("URL definida en config.php: " . URL);
error_log("URLPF definida en config.php: " . URLPF);
error_log("=== config.php - Finalizado ===");
?>