<?php
/**
 * editOrder.php - Edit Existing Premium Freight Order Form
 * Estructura idéntica a newOrder.php pero con validación de tokens
 * 
 * @author GRAMMER AG
 * @version 2.0
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

function debugEditOrder($message, $data = null) {
    $timestamp = date('Y-m-d H:i:s');
    $logMsg = "[$timestamp] [editOrder.php] $message";
    if ($data !== null) {
        $logMsg .= " | " . json_encode($data);
    }
    error_log($logMsg);
}

try {
    debugEditOrder("START - editOrder.php");
    
    require_once 'dao/users/auth_check.php';
    debugEditOrder("auth_check.php loaded successfully");

    $daoFiles = [
        'dao/elements/daoPlantas.php',
        'dao/elements/daoCodePlants.php',
        'dao/elements/daoTransport.php',
        'dao/elements/daoInOutBound.php',
        'dao/elements/daoArea.php',
        'dao/elements/daoInExt.php',
        'dao/elements/daoCategoryCause.php',
        'dao/elements/daoProjectStatus.php',
        'dao/elements/daoRecovery.php',
        'dao/elements/daoCarrier.php',
        'dao/elements/daoMeasures.php',
        'dao/elements/daoProducts.php',
        'dao/elements/daoStates.php'
    ];

    foreach ($daoFiles as $file) {
        if (!file_exists($file)) {
            throw new Exception("Missing DAO file: $file");
        }
        require_once $file;
        debugEditOrder("Loaded: $file");
    }

    debugEditOrder("Loading context_injector.php");
    if (!file_exists('dao/users/context_injector.php')) {
        throw new Exception("Missing context_injector.php");
    }
    require_once 'dao/users/context_injector.php';
    debugEditOrder("context_injector.php loaded successfully");

    debugEditOrder("Validating edit token");
    
    $orderId = isset($_GET['order']) ? intval($_GET['order']) : null;
    $token = isset($_GET['token']) ? trim($_GET['token']) : null;
    $tokenError = null;
    $tokenValid = false;

    debugEditOrder("Token validation", [
        'orderId' => $orderId,
        'token' => $token ? substr($token, 0, 20) . '...' : null
    ]);

    if (!$orderId || !$token) {
        $tokenError = 'Missing order ID or token. Invalid edit link.';
        debugEditOrder("Token validation failed: missing orderId or token");
    } else {
        require_once 'dao/db/PFDB.php';
        $con = new LocalConector();
        $conex = $con->conectar();
        
        if (!$conex) {
            throw new Exception("Failed to connect to database");
        }
        
        debugEditOrder("Database connected");
        
        $stmt = $conex->prepare("
            SELECT id, order_id, user_id, is_used, released_by, token
            FROM EmailEditTokens 
            WHERE token = ? AND order_id = ? AND is_used = 0
        ");
        
        if (!$stmt) {
            throw new Exception("Failed to prepare statement: " . $conex->error);
        }
        
        $stmt->bind_param('si', $token, $orderId);
        
        if (!$stmt->execute()) {
            throw new Exception("Failed to execute statement: " . $stmt->error);
        }
        
        $result = $stmt->get_result();
        debugEditOrder("Token query executed", ['rows' => $result->num_rows]);
        
        if ($result->num_rows === 0) {
            $tokenError = 'Invalid, expired, or already used token.';
            debugEditOrder("Token not found in database");
        } else {
            $tokenRecord = $result->fetch_assoc();
            debugEditOrder("Token record found", [
                'released_by' => $tokenRecord['released_by'],
                'user_id' => $tokenRecord['user_id'],
                'session_user_id' => $_SESSION['user']['id'] ?? null
            ]);
            
            if (!$tokenRecord['released_by'] || $tokenRecord['released_by'] != 36) {
                $tokenError = 'Token has not been approved for editing.';
                debugEditOrder("Token not approved by user 36");
            } else if ($tokenRecord['user_id'] != $_SESSION['user']['id']) {
                $tokenError = 'This token does not belong to your account.';
                debugEditOrder("Token user mismatch");
            } else {
                $tokenValid = true;
                debugEditOrder("Token validation SUCCESS");
            }
        }
        
        $conex->close();
    }

    debugEditOrder("Token validation complete", ['tokenValid' => $tokenValid]);

} catch (Exception $e) {
    debugEditOrder("EXCEPTION", [
        'message' => $e->getMessage(),
        'line' => $e->getLine(),
        'file' => $e->getFile()
    ]);
    $tokenError = "Error: " . $e->getMessage();
    $tokenValid = false;
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Order</title>

    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/newOrder.css">
    <link rel="stylesheet" href="css/tour-styles.css">

    <script src="js/config.js"></script>
    <script>
        window.PF_CONFIG.orderId = <?php echo json_encode($orderId); ?>;
        window.PF_CONFIG.editToken = <?php echo json_encode($token); ?>;
        window.PF_CONFIG.tokenValid = <?php echo json_encode($tokenValid); ?>;
        console.log('[editOrder.php] Config loaded:', window.PF_CONFIG);
    </script>

    <?php 
    if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <link rel="stylesheet" href="css/assistant.css">
    <?php endif; ?>
</head>
<body>
    <div id="header-container"></div>

    <main class="container my-4">
        <?php if ($tokenError): ?>
            <div id="tokenErrorContainer" style="
                background-color: #f8d7da;
                border: 1px solid #f5c6cb;
                color: #721c24;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: center;
            ">
                <h4>Access Denied</h4>
                <p><?php echo htmlspecialchars($tokenError); ?></p>
                <p>
                    <a href="<?php echo htmlspecialchars($appContextForJS['app']['baseURL'] ?? 'orders.php'); ?>" 
                       class="btn btn-primary">
                        Return to Orders
                    </a>
                </p>
            </div>
        <?php else: ?>
            <h1 class="mb-3">EDIT ORDER #<?php echo htmlspecialchars($orderId); ?></h1>
            <h2 class="mb-4" style="text-align: center;">Modify Premium Freight Order</h2>
            
            <div style="
                background-color: #fff3cd;
                border: 1px solid #ffc107;
                color: #856404;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
                text-align: center;
                font-weight: bold;
            ">
                You are editing an existing order. Your changes will require approval before being finalized.
            </div>
            
            <form id="plant-form">
                <!-- Requesting Plant y Plant Code -->
                <div id="SectPlantas" class="mb-3">
                    <div id="DivPlanta" class="mb-2">
                        <label for="planta">Requesting Plant:</label>
                        <select name="planta" id="planta" class="form-select" disabled>
                            <option></option>
                            <?php if (isset($jsonPlantas)) foreach ($jsonPlantas as $planta): ?>
                                <option value="<?php echo htmlspecialchars($planta['ID']); ?>"><?php echo htmlspecialchars($planta['PLANT']); ?></option>
                            <?php endforeach; ?>
                        </select>
                        <small class="text-muted">Cannot be edited</small>
                    </div>
                    <div id="DivCodes" class="mb-2">
                        <label for="codeplanta">Plant Code:</label>
                        <select name="codeplanta" id="codeplanta" class="form-select" disabled>
                            <option></option>
                            <?php if (isset($jsonCodePlants)) foreach ($jsonCodePlants as $codeplanta): ?>
                                <option value="<?php echo htmlspecialchars($codeplanta['ID']); ?>"><?php echo htmlspecialchars($codeplanta['PLANT_CODE']); ?></option>
                            <?php endforeach; ?>
                        </select>
                        <small class="text-muted">Cannot be edited</small>
                    </div>
                </div>

                <!-- Transport Mode, In/Out -->
                <div id="SectTransporte" class="mb-3">
                    <div id="DivTransport" class="mb-2">
                        <label for="transport">Transport Mode:</label>
                        <select name="transport" id="transport" class="form-select" required>
                            <option></option>
                            <?php if (isset($jsonTransport)) foreach ($jsonTransport as $transport): ?>
                                <option value="<?php echo htmlspecialchars($transport['ID']); ?>"><?php echo htmlspecialchars($transport['MODE']); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div id="DivInOutBound" class="mb-2">
                        <label for="InOutBound">In/Out Outbound:</label>
                        <select name="InOutBound" id="InOutBound" class="form-select" required>
                            <option></option>
                            <?php if (isset($jsonInOutBound)) foreach ($jsonInOutBound as $inOutBound): ?>
                                <option value="<?php echo htmlspecialchars($inOutBound['ID']); ?>"><?php echo htmlspecialchars($inOutBound['IN_OUT']); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>

                <!-- Responsibility, Service, Paid By -->
                <div id="SectResponsability" class="mb-3">
                    <div id="DivArea" class="mb-2">
                        <label for="Area">Area of Responsibility:</label>
                        <select name="Area" id="Area" class="form-select" required>
                            <option></option>
                            <?php if (isset($jsonArea)) foreach ($jsonArea as $area): ?>
                                <option value="<?php echo htmlspecialchars($area['ID']); ?>"><?php echo htmlspecialchars($area['RESPONSIBILITY']); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div id="DivInExt" class="mb-2">
                        <label for="IntExt">Internal/External Service:</label>
                        <select name="IntExt" id="IntExt" class="form-select" required>
                            <option></option>
                            <?php if (isset($jsonInExt)) foreach ($jsonInExt as $inExt): ?>
                                <option value="<?php echo htmlspecialchars($inExt['ID']); ?>"><?php echo htmlspecialchars($inExt['IN_EXT']); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div id="SectPaidBy" class="mb-3">
                        <label for="PaidBy">Costs paid By:</label>
                        <select name="PaidBy" id="PaidBy" class="form-select" required>
                            <option></option>
                            <option value="Grammer">Grammer</option>
                            <option value="Cliente">Client</option>
                        </select>
                    </div>
                </div>

                <!-- Cause, Status, Recovery -->
                <div id="SectCause" class="mb-3">
                    <div id="DivCategoryCause" class="mb-2">
                        <label for="CategoryCause">Root Category Cause:</label>
                        <select name="CategoryCause" id="CategoryCause" class="form-select" required>
                            <option></option>
                            <?php if (isset($jsonCategoryCause)) foreach ($jsonCategoryCause as $category): ?>
                                <option value="<?php echo htmlspecialchars($category['ID']); ?>"><?php echo htmlspecialchars($category['CATEGORY']); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div id="DivProjectStatus" class="mb-2">
                        <label for="ProjectStatus">Project Status:</label>
                        <select name="ProjectStatus" id="ProjectStatus" class="form-select" required>
                            <option></option>
                            <?php if (isset($jsonProjectStatus)) foreach ($jsonProjectStatus as $status): ?>
                                <option value="<?php echo htmlspecialchars($status['ID']); ?>"><?php echo htmlspecialchars($status['STATUS']); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div id="SectRecovery" class="mb-3">
                        <label for="Recovery">Recovery:</label>
                        <select name="Recovery" id="Recovery" class="form-select" required>
                            <option></option>
                            <?php if (isset($jsonRecovery)) foreach ($jsonRecovery as $recovery): ?>
                                <option value="<?php echo htmlspecialchars($recovery['ID']); ?>"><?php echo htmlspecialchars($recovery['RECOVERY']); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>

                <div id="recoveryFileContainer" class="mt-2" style="display: none;">
                    <label for="recoveryFile">Recovery Evidence (PDF):</label>
                    <input type="file" id="recoveryFile" name="recoveryFile" class="form-control" accept=".pdf">
                    <small class="text-muted">Please upload a PDF file as evidence for recovery</small>
                </div>

                <!-- Description - 5 Why's Analysis -->
                <h2 class="mt-4">5 Why's Analysis</h2>
                <div id="SectDescription" class="mb-3">
                    <textarea id="Description" style="display: none;" name="Description" class="form-control" placeholder="Description" required></textarea>
                    
                    <label for="FirstWhy">1st Why - Observable Fact</label>
                    <textarea id="FirstWhy" name="FirstWhy" class="form-control" placeholder="What is the observable problem?" required minlength="30"></textarea>
                    <div id="firstWhyCounter" class="text-muted small mt-1 mb-3"><span class="text-danger">30 characters required</span> - <span class="char-count">0/30</span></div>
                    
                    <label for="SecondWhy">2nd Why - Reason to 1st Why</label>
                    <textarea id="SecondWhy" name="SecondWhy" class="form-control" placeholder="Why did this problem occur?" required minlength="30"></textarea>
                    <div id="secondWhyCounter" class="text-muted small mt-1 mb-3"><span class="text-danger">30 characters required</span> - <span class="char-count">0/30</span></div>
                    
                    <label for="ThirdWhy">3rd Why - Processes, Decisions, Constraints</label>
                    <textarea id="ThirdWhy" name="ThirdWhy" class="form-control" placeholder="Why did that reason occur?" required minlength="30"></textarea>
                    <div id="thirdWhyCounter" class="text-muted small mt-1 mb-3"><span class="text-danger">30 characters required</span> - <span class="char-count">0/30</span></div>
                    
                    <label for="FourthWhy">4th Why - Structural Issues</label>
                    <textarea id="FourthWhy" name="FourthWhy" class="form-control" placeholder="Why does this structural issue exist?" required minlength="30"></textarea>
                    <div id="fourthWhyCounter" class="text-muted small mt-1 mb-3"><span class="text-danger">30 characters required</span> - <span class="char-count">0/30</span></div>
                    
                    <label for="FifthWhy">5th Why - The Root Cause</label>
                    <textarea id="FifthWhy" name="FifthWhy" class="form-control" placeholder="What is the fundamental root cause?" required minlength="30"></textarea>
                    <div id="fifthWhyCounter" class="text-muted small mt-1 mb-3"><span class="text-danger">30 characters required</span> - <span class="char-count">0/30</span></div>
                </div>

                <!-- Corrective Action Plan -->
                <h2 class="mt-4">Corrective Action Plan</h2>
                <div id="SectCorrectiveAction" class="mb-3">
                    <label for="CorrectiveAction">Corrective Action Description</label>
                    <textarea id="CorrectiveAction" name="CorrectiveAction" class="form-control" placeholder="Describe corrective actions" required minlength="50" rows="3"></textarea>
                    <div id="correctiveActionCounter" class="text-muted small mt-1 mb-3"><span class="text-danger">50 characters required</span> - <span class="char-count">0/50</span></div>
                    
                    <label for="PersonResponsible">Person Responsible</label>
                    <input type="text" id="PersonResponsible" name="PersonResponsible" class="form-control" placeholder="Name and Role" required>
                    
                    <label for="TargetDate">Target Completion Date</label>
                    <input type="date" id="TargetDate" name="TargetDate" class="form-control" required>
                </div>

                <!-- Ship From -->
                <h2 class="mt-4">Ship From</h2>
                <div id="SectShip" class="mb-3">
                    <div id="DivCompanyShip" class="mb-2"><label for="CompanyShip">Company Name</label><select id="CompanyShip" name="CompanyShip" class="form-select" required><option></option></select></div>
                    <div id="DivCityShip" class="mb-2"><label for="inputCityShip">City</label><input type="text" id="inputCityShip" class="form-control" placeholder="City"></div>
                </div>
                <div id="ShipTo" class="mb-3">
                    <div id="DivStatesShip" class="mb-2"><label for="StatesShip">State:</label><input type="text" id="StatesShip" class="form-control" placeholder="States"></div>
                    <div id="DivZipShip" class="mb-2"><label for="inputZipShip">ZIP</label><input type="number" id="inputZipShip" class="form-control" placeholder="ZIP"></div>
                </div>

                <!-- Destination -->
                <h2 class="mt-4">Destination</h2>
                <div id="SectDest" class="mb-3">
                    <div id="DivCompanyDest" class="mb-2"><label for="inputCompanyNameDest">Company Name</label><select id="inputCompanyNameDest" name="inputCompanyNameDest" class="form-select" required><option></option></select></div>
                    <div id="DivCityDest" class="mb-2"><label for="inputCityDest">City</label><input type="text" id="inputCityDest" class="form-control" placeholder="City Dest"></div>
                </div>
                <div id="DestTo" class="mb-3">
                    <div id="DivStatesDest" class="mb-2"><label for="StatesDest">State:</label><input type="text" id="StatesDest" class="form-control" placeholder="States"></div>
                    <div id="SectZipDest" class="mb-2"><label for="inputZipDest">ZIP</label><input type="number" id="inputZipDest" class="form-control" placeholder="ZIP"></div>
                </div>

                <!-- Measures & Products -->
                <div id="SectMeasures" class="mb-3">
                    <div id="MeasuresDiv">
                        <label for="Weight">Weight:</label><input type="number" id="Weight" name="Weight" class="form-control me-2" placeholder="Weight" required>
                        <label for="Measures">U/M</label>
                        <select id="Measures" name="Measures" class="form-select" required>
                            <option></option>
                            <?php if (isset($jsonMeasures)) foreach ($jsonMeasures as $measure): ?><option value="<?php echo htmlspecialchars($measure['UM']); ?>"><?php echo htmlspecialchars($measure['UM']); ?></option><?php endforeach; ?>
                        </select>
                    </div>
                    <div id="SectProducts" class="mb-3">
                        <label for="Products">Products:</label>
                        <select name="Products" id="Products" class="form-select" required>
                            <option></option>
                        </select>
                    </div>
                </div>

                <!-- Carrier, Cost -->
                <h2 class="mt-4">Selected Carrier</h2>
                <div id="SectCarrier" class="mb-3">
                    <div id="DivCarrier" class="mb-2">
                        <label for="Carrier">Carrier:</label>
                        <select name="Carrier" id="Carrier" class="form-select" required>
                            <option></option>
                        </select>
                    </div>
                    <div id="DivCosto" class="mb-2">
                        <label for="QuotedCost">Quoted Cost</label>
                        <input type="number" id="QuotedCost" name="QuotedCost" class="form-control" placeholder="Quoted Cost" required>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="mt-4 mb-3" style="display: flex; gap: 10px;">
                    <button type="button" id="cancelEditBtn" class="btn btn-secondary">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    <button type="button" id="submitEditBtn" class="btn btn-primary">
                        <i class="fas fa-check"></i> Review Changes
                    </button>
                </div>
            </form>
        <?php endif; ?>
    </main>
    
    <footer class="text-center py-3">
        <p>© 2025 Grammer. All rights reserved.</p>
    </footer>

    <!-- Scripts -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

    <script src="js/companySelect.js"></script>
    <script src="js/formValidation.js"></script>
    <script src="js/currencyUtils.js"></script>
    <script src="js/addCompany.js"></script>
    <script src="js/carrierSelect.js"></script>
    <script src="js/addCarrier.js"></script>
    <script src="js/selectConfig.js"></script>  

    <script src="js/header.js" type="module"></script>
    
    <!-- Edit Order Modules -->
    <script type="module">
        import { initializeEditForm } from './js/edits/form.js';
        
        console.log('[editOrder.php] Module imported successfully');
        
        // Single initialization point - form.js handles duplication prevention
        initializeEditForm();
    </script>

    <?php 
    if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <script src="js/assistant.js"></script>
    <?php endif; ?>
</body>
</html>