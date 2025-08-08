<?php
/**
 * Password Manager - Server Side (VERSIÓN CORREGIDA)
 * Handles password encryption/decryption on the server side
 * Mejorada para evitar doble encriptación
 */

class PasswordManager {
    
    /**
     * Simple encryption using the same method as JavaScript version
     * @param string $text Plain text password
     * @param int $shift Encryption shift (default: 3)
     * @return string Encrypted password
     */
    public static function encrypt($text, $shift = 3) {
        if (empty($text)) return '';
        
        // NUEVA VALIDACIÓN: Si ya está encriptado, no volver a encriptar
        if (self::isEncrypted($text)) {
            return $text;
        }
        
        $shifted = '';
        for ($i = 0; $i < strlen($text); $i++) {
            $shifted .= chr(ord($text[$i]) + $shift);
        }
        
        return base64_encode($shifted);
    }
    
    /**
     * Simple decryption using the same method as JavaScript version
     * @param string $encryptedText Encrypted password
     * @param int $shift Decryption shift (default: 3)
     * @return string|null Decrypted password or null if failed
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
     * MEJORADA: Check if a password appears to be encrypted
     * @param string $password Password to check
     * @return bool True if appears encrypted
     */
    public static function isEncrypted($password) {
        if (empty($password)) return false;
        
        // Verificaciones más robustas:
        
        // 1. Debe ser base64 válido
        if (base64_encode(base64_decode($password, true)) !== $password) {
            return false;
        }
        
        // 2. Base64 válido debe tener longitud múltiplo de 4 (con padding)
        if (strlen($password) % 4 !== 0) {
            return false;
        }
        
        // 3. Si es muy corto, probablemente no esté encriptado
        if (strlen($password) < 12) {
            return false;
        }
        
        // 4. Intentar decodificar y ver si contiene caracteres válidos
        $decoded = base64_decode($password);
        if ($decoded === false) {
            return false;
        }
        
        // 5. Los caracteres decodificados deben estar en un rango razonable
        // (después del shift de +3, caracteres normales estarían entre ~35-130)
        for ($i = 0; $i < strlen($decoded); $i++) {
            $charCode = ord($decoded[$i]);
            if ($charCode < 30 || $charCode > 200) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Validate password strength
     * @param string $password Password to validate (debe ser texto plano)
     * @return array Validation result
     */
    public static function validateStrength($password) {
        // Si está encriptado, primero desencriptar
        if (self::isEncrypted($password)) {
            $password = self::decrypt($password);
            if ($password === null) {
                return [
                    'isValid' => false,
                    'score' => 0,
                    'message' => 'Cannot validate encrypted password',
                    'requirements' => []
                ];
            }
        }
        
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
        
        // Calculate score
        foreach ($result['requirements'] as $requirement) {
            if ($requirement) $result['score']++;
        }
        
        // Determine validity and message
        if ($result['score'] >= 3) {
            $result['isValid'] = true;
            $result['message'] = $result['score'] === 4 ? 'Strong password' : 'Good password';
        } else {
            $result['message'] = 'Password must be at least 8 characters with letters and numbers';
        }
        
        return $result;
    }
    
    /**
     * MEJORADA: Prepare password for database storage
     * @param string $password Plain text or already encrypted password
     * @return string Encrypted password ready for database
     */
    public static function prepareForStorage($password) {
        if (empty($password)) return '';
        
        // Si ya está encriptado, devolver tal como está
        if (self::isEncrypted($password)) {
            return $password;
        }
        
        // Si no está encriptado, encriptarlo
        return self::encrypt($password);
    }
    
    /**
     * CORREGIDA: Compare passwords with better logic
     * @param string $inputPassword Password from user input (plain text)
     * @param string $storedPassword Password from database (should be encrypted)
     * @return bool True if passwords match
     */
    public static function verify($inputPassword, $storedPassword) {
        if (empty($inputPassword) || empty($storedPassword)) {
            return false;
        }
        
        // Caso 1: Si la contraseña almacenada no está encriptada (legacy)
        if (!self::isEncrypted($storedPassword)) {
            // Comparar directamente (esto no debería pasar en tu sistema actual)
            return $inputPassword === $storedPassword;
        }
        
        // Caso 2: La contraseña almacenada está encriptada (normal)
        // Encriptar la contraseña de entrada y comparar
        $encryptedInput = self::encrypt($inputPassword);
        return $encryptedInput === $storedPassword;
    }
    
    /**
     * NUEVA FUNCIÓN: Verificar si dos contraseñas encriptadas son iguales
     * @param string $encrypted1 Primera contraseña encriptada
     * @param string $encrypted2 Segunda contraseña encriptada
     * @return bool True si son iguales
     */
    public static function verifyEncrypted($encrypted1, $encrypted2) {
        if (empty($encrypted1) || empty($encrypted2)) {
            return false;
        }
        
        return $encrypted1 === $encrypted2;
    }
    
    /**
     * NUEVA FUNCIÓN: Debug information para troubleshooting
     * @param string $password Password to analyze
     * @return array Debug information
     */
    public static function debugPassword($password) {
        return [
            'original_length' => strlen($password),
            'is_encrypted' => self::isEncrypted($password),
            'is_base64_valid' => base64_encode(base64_decode($password, true)) === $password,
            'base64_decoded_length' => strlen(base64_decode($password)),
            'sample' => substr($password, 0, 20) . (strlen($password) > 20 ? '...' : ''),
            'encrypted_version' => self::encrypt($password),
            'encrypted_length' => strlen(self::encrypt($password))
        ];
    }
    
    /**
     * Batch encrypt passwords in database (MySQLi version)
     * @param mysqli $db Database connection
     * @return array Result with counts
     */
    public static function batchEncryptPasswords($db) {
        $result = [
            'success' => true,
            'updated' => 0,
            'errors' => 0,
            'messages' => []
        ];
        
        try {
            // Get all users with plain text passwords
            $stmt = $db->prepare("SELECT id, password FROM User WHERE LENGTH(password) <= 20");
            $stmt->execute();
            $result_set = $stmt->get_result();
            
            while ($user = $result_set->fetch_assoc()) {
                if (!self::isEncrypted($user['password'])) {
                    $encryptedPassword = self::encrypt($user['password']);
                    
                    $updateStmt = $db->prepare("UPDATE User SET password = ? WHERE id = ?");
                    $updateStmt->bind_param("si", $encryptedPassword, $user['id']);
                    
                    if ($updateStmt->execute()) {
                        $result['updated']++;
                    } else {
                        $result['errors']++;
                        $result['messages'][] = "Failed to update user ID: " . $user['id'];
                    }
                    $updateStmt->close();
                }
            }
            $stmt->close();
            
        } catch (Exception $e) {
            $result['success'] = false;
            $result['messages'][] = "Database error: " . $e->getMessage();
        }
        
        return $result;
    }
}
?>