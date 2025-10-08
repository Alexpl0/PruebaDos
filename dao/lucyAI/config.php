<?php
/**
 * config.php - Carga configuración desde .env
 */

function loadEnv($path) {
    if (!file_exists($path)) {
        throw new Exception('.env file not found at: ' . $path);
    }
    
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // Ignorar comentarios
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        // Parsear KEY=VALUE
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            // Definir constante si no existe
            if (!defined($key)) {
                define($key, $value);
            }
        }
    }
}

// Cargar .env desde la raíz del proyecto
$envPath = dirname(dirname(dirname(__FILE__))) . '/.env';
loadEnv($envPath);