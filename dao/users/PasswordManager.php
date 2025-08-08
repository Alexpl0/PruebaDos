<?php
/**
 * Password Manager - Server Side (VERSIÓN SIMPLIFICADA)
 * Solo encripta y desencripta. Sin verificaciones complejas.
 */

class PasswordManager {
    
    /**
     * Encriptar contraseña
     * @param string $text Contraseña en texto plano
     * @param int $shift Shift para encriptación (default: 3)
     * @return string Contraseña encriptada
     */
    public static function encrypt($text, $shift = 3) {
        if (empty($text)) return '';
        
        $shifted = '';
        for ($i = 0; $i < strlen($text); $i++) {
            $shifted .= chr(ord($text[$i]) + $shift);
        }
        
        return base64_encode($shifted);
    }
    
    /**
     * Desencriptar contraseña
     * @param string $encryptedText Contraseña encriptada
     * @param int $shift Shift para desencriptación (default: 3)
     * @return string|null Contraseña en texto plano o null si falla
     */
    public static function decrypt($encryptedText, $shift = 3) {
        if (empty($encryptedText)) return '';
        
        try {
            $decoded = base64_decode($encryptedText);
            if ($decoded === false) return null;
            
            $original = '';
            for ($i = 0; $i < strlen($decoded); $i++) {
                $original .= chr(ord($decoded[$i]) - $shift);
            }
            
            return $original;
        } catch (Exception $e) {
            error_log("Password decryption failed: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Validar fortaleza de contraseña (para texto plano)
     * @param string $password Contraseña en texto plano
     * @return array Resultado de validación
     */
    public static function validateStrength($password) {
        $result = [
            'isValid' => false,
            'score' => 0,
            'message' => '',
            'requirements' => [
                'minLength' => strlen($password) >= 8,
                'hasLetters' => preg_match('/[a-zA-Z]/', $password),
                'hasNumbers' => preg_match('/\d/', $password),
                'hasSpecial' => preg_match('/[!@#$%^&*(),.?":{}|<>]/', $password)
            ]
        ];
        
        // Calcular score
        foreach ($result['requirements'] as $requirement) {
            if ($requirement) $result['score']++;
        }
        
        // Determinar validez y mensaje
        if ($result['score'] >= 3) {
            $result['isValid'] = true;
            $result['message'] = $result['score'] === 4 ? 'Strong password' : 'Good password';
        } else {
            $result['message'] = 'Password must be at least 8 characters with letters and numbers';
        }
        
        return $result;
    }
    
    /**
     * Preparar contraseña para almacenamiento en BD
     * (Función simplificada para mantener compatibilidad)
     * @param string $password Contraseña en texto plano
     * @return string Contraseña encriptada
     */
    public static function prepareForStorage($password) {
        return self::encrypt($password);
    }
}
?>