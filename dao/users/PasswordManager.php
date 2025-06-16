<?php
/**
 * Password Manager - Server Side
 * Handles password encryption/decryption on the server side
 * Uses the same methods as the client-side version for consistency
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
     * Check if a password appears to be encrypted
     * @param string $password Password to check
     * @return bool True if appears encrypted
     */
    public static function isEncrypted($password) {
        if (empty($password)) return false;
        
        // Check if it's longer than typical plain text and is base64
        return strlen($password) > 20 && base64_encode(base64_decode($password, true)) === $password;
    }
    
    /**
     * Validate password strength
     * @param string $password Password to validate
     * @return array Validation result
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
     * Prepare password for database storage
     * @param string $password Plain text or already encrypted password
     * @return string Encrypted password ready for database
     */
    public static function prepareForStorage($password) {
        if (empty($password)) return '';
        if (self::isEncrypted($password)) return $password;
        return self::encrypt($password);
    }
    
    /**
     * Compare a plain text password with an encrypted one
     * @param string $plainPassword Plain text password
     * @param string $encryptedPassword Encrypted password from database
     * @return bool True if passwords match
     */
    public static function verify($plainPassword, $encryptedPassword) {
        if (empty($plainPassword) || empty($encryptedPassword)) return false;
        
        // If encrypted password is not encrypted, compare directly (legacy)
        if (!self::isEncrypted($encryptedPassword)) {
            return $plainPassword === $encryptedPassword;
        }
        
        // Decrypt and compare
        $decrypted = self::decrypt($encryptedPassword);
        return $decrypted !== null && $plainPassword === $decrypted;
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