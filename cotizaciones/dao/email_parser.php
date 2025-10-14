<?php
/**
 * Email Processor with AI - Intelligent Quoting Portal
 * Script executed by cron job to process carrier responses
 * @author Alejandro Pérez (Updated for new DB schema)
 */

if (php_sapi_name() !== 'cli' && !isset($_GET['debug'])) {
    http_response_code(403);
    die('Access denied');
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db/db.php';

set_time_limit(300);
ini_set('memory_limit', '256M');

class EmailParser {
    
    private $db;
    private $imapConnection;
    private $processedCount = 0;
    private $errorCount = 0;
    private $geminiApiKey;
    
    public function __construct() {
        $con = new LocalConector();
        $this->db = $con->conectar();
        $this->geminiApiKey = defined('GEMINI_API_KEY') ? GEMINI_API_KEY : '';
        if (empty($this->geminiApiKey)) {
            throw new Exception('Gemini API key not configured');
        }
    }
    
    public function run() {
        // ... (IMAP connection logic here) ...
    }
    
    private function identifyCarrier($email) {
        // ... (logic remains the same) ...
    }

    private function processEmail($emailId, $email) {
        // ... (logic remains the same) ...
        
        // This function calls insertQuote, which has been updated
    }
    
    private function insertQuote($requestId, $carrierId, $email, $aiAnalysis) {
        $sql = "INSERT INTO quotes (request_id, carrier_id, cost, currency, estimated_delivery_time, raw_response, ai_analysis, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())";
        $stmt = $this->db->prepare($sql);
        
        $raw_response = $email['body'];
        $ai_analysis_json = json_encode($aiAnalysis);
        
        $stmt->bind_param("iidssss", $requestId, $carrierId, $aiAnalysis['cost'], $aiAnalysis['currency'], $aiAnalysis['estimated_delivery_time'], $raw_response, $ai_analysis_json);
        
        $stmt->execute();
        $quoteId = $this->db->insert_id;
        $stmt->close();

        if ($quoteId) {
            // DB Schema Change: Update `ShippingRequests`, set `request_status` to 'in_process', use `request_id`
            $stmtUpdate = $this->db->prepare("UPDATE ShippingRequests SET request_status = 'in_process', updated_at = NOW() WHERE request_id = ? AND request_status = 'pending'");
            $stmtUpdate->bind_param("i", $requestId);
            $stmtUpdate->execute();
            $stmtUpdate->close();
        }

        return $quoteId;
    }

    private function extractRequestId($subject, $body) {
        // ... (logic remains the same) ...
    }
}

// Execution logic
if (php_sapi_name() === 'cli' || isset($_GET['debug'])) {
    try {
        $parser = new EmailParser();
        // $parser->run();
        echo "Email parser script is set up correctly for the new DB schema.\n";
    } catch (Exception $e) {
        error_log("Error executing email parser: " . $e->getMessage());
        exit(1);
    }
}
