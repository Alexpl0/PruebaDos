<?php
/**
 * newOrder.php - Form to create a new Special Freight Authorization (Refactored)
 * This version uses the centralized context injection system.
 */

// 1. Manejar sesión y autenticación. Es lo primero para proteger la página.
require_once 'dao/users/auth_check.php';

// 2. Cargar todas las dependencias necesarias para los dropdowns del formulario.
require_once __DIR__ . '/dao/elements/daoPlantas.php';
require_once __DIR__ . '/dao/elements/daoCodePlants.php';
require_once __DIR__ . '/dao/elements/daoTransport.php';
require_once __DIR__ . '/dao/elements/daoInOutBound.php';
require_once __DIR__ . '/dao/elements/daoArea.php';
require_once __DIR__ . '/dao/elements/daoInExt.php';
require_once __DIR__ . '/dao/elements/daoCategoryCause.php';
require_once __DIR__ . '/dao/elements/daoProjectStatus.php';
require_once __DIR__ . '/dao/elements/daoRecovery.php';
require_once __DIR__ . '/dao/elements/daoCarrier.php';
require_once __DIR__ . '/dao/elements/daoMeasures.php';
require_once __DIR__ . '/dao/elements/daoProducts.php';
require_once __DIR__ . '/dao/elements/daoStates.php';

// 3. Incluir el inyector de contexto.
require_once 'dao/users/context_injector.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Special Freight Authorization</title>

    <!-- Favicon -->
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">

    <!-- External CSS -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" xintegrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap" rel="stylesheet">

    <!-- Local CSS files -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/newOrder.css">
    <link rel="stylesheet" href="css/tour-styles.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/driver.js@1.0.1/dist/driver.css"/>

    <!-- ================== SISTEMA DE CONTEXTO CENTRALIZADO ================== -->
    <?php
        // El inyector ya fue requerido en la parte superior del script.
        // Inyecta el objeto window.APP_CONTEXT
    ?>
    <!-- Incluir el módulo de configuración JS que lee el contexto. -->
    <script src="js/config.js"></script>
    <!-- ==================================================================== -->

    <?php 
    // Carga condicional del CSS del asistente.
    if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <link rel="stylesheet" href="css/assistant.css">
    <?php endif; ?>
</head>
<body>
    <div id="header-container"></div>

    <main class="container my-4">
        <h1 class="mb-3">SPECIAL FREIGHT AUTHORIZATION</h1>
        <h2 class="mb-4" style="justify-self: center; text-align: center;">Transport Order</h2>
        
        <form id="plant-form">
            <!-- Requesting Plant y Plant Code -->
            <div id="SectPlantas" class="mb-3">
                <div id="DivPlanta" class="mb-2">
                    <label for="planta">Requesting Plant:</label>
                    <select name="planta" id="planta" class="form-select" required>
                        <option></option>
                        <?php foreach ($jsonPlantas as $planta): ?>
                            <option value="<?php echo htmlspecialchars($planta['ID']); ?>"><?php echo htmlspecialchars($planta['PLANT']); ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div id="DivCodes" class="mb-2">
                    <label for="codeplanta">Plant Code:</label>
                    <select name="codeplanta" id="codeplanta" class="form-select" required>
                        <option></option>
                        <?php foreach ($jsonCodePlants as $codeplanta): ?>
                            <option value="<?php echo htmlspecialchars($codeplanta['ID']); ?>"><?php echo htmlspecialchars($codeplanta['PLANT_CODE']); ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>

            <!-- Transport Mode, In/Out, Cost -->
            <div id="SectTransporte" class="mb-3">
                <div id="DivTransport" class="mb-2">
                    <label for="transport">Transport Mode:</label>
                    <select name="transport" id="transport" class="form-select" required>
                        <option></option>
                        <?php foreach ($jsonTransport as $transport): ?>
                            <option value="<?php echo htmlspecialchars($transport['ID']); ?>"><?php echo htmlspecialchars($transport['MODE']); ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div id="DivInOutBound" class="mb-2">
                    <label for="InOutBound">In/Out Outbound:</label>
                    <select name="InOutBound" id="InOutBound" class="form-select" required>
                        <option></option>
                        <?php foreach ($jsonInOutBound as $inOutBound): ?>
                            <option value="<?php echo htmlspecialchars($inOutBound['ID']); ?>"><?php echo htmlspecialchars($inOutBound['IN_OUT']); ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div id="SectEuros" class="mb-3">
                    <label for="CostoEuros">Cost in Euros €</label>
                    <input style="display: none" type="text" id="CostoEuros" name="CostoEuros" class="form-control" readonly>
                </div>
            </div>

            <!-- Responsibility, Service, Paid By -->
            <div id="SectResponsability" class="mb-3">
                <div id="DivArea" class="mb-2">
                    <label for="Area">Area of Responsibility:</label>
                    <select name="Area" id="Area" class="form-select" required>
                        <option></option>
                        <?php foreach ($jsonArea as $area): ?>
                            <option value="<?php echo htmlspecialchars($area['ID']); ?>"><?php echo htmlspecialchars($area['RESPONSIBILITY']); ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div id="DivInExt" class="mb-2">
                    <label for="IntExt">Internal/External Service:</label>
                    <select name="IntExt" id="IntExt" class="form-select" required>
                        <option></option>
                        <?php foreach ($jsonInExt as $inExt): ?>
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
                        <?php foreach ($jsonCategoryCause as $category): ?>
                            <option value="<?php echo htmlspecialchars($category['ID']); ?>"><?php echo htmlspecialchars($category['CATEGORY']); ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div id="DivProjectStatus" class="mb-2">
                    <label for="ProjectStatus">Project Status:</label>
                    <select name="ProjectStatus" id="ProjectStatus" class="form-select" required>
                        <option></option>
                        <?php foreach ($jsonProjectStatus as $status): ?>
                            <option value="<?php echo htmlspecialchars($status['ID']); ?>"><?php echo htmlspecialchars($status['STATUS']); ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div id="SectRecovery" class="mb-3">
                    <label for="Recovery">Recovery:</label>
                    <select name="Recovery" id="Recovery" class="form-select" required>
                        <option></option>
                        <?php foreach ($jsonRecovery as $recovery): ?>
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

            <!-- Descriptions -->
            <div id="SectDescription" class="mb-3">
                <h3 style="justify-self: center;">Description</h3>
                <textarea id="Description" style="display: none;" name="Description" class="form-control" placeholder="Description" required></textarea>
                <label for="InmediateActions">Immediate Actions</label>
                <textarea id="InmediateActions" name="InmediateActions" class="form-control" placeholder="Immediate Actions" required minlength="50"></textarea>
                <div id="immediateCounter" class="text-muted small mt-1 mb-3"><span class="text-danger">50 characters required</span> - <span class="char-count">0/50</span></div>
                <label for="PermanentActions">Permanent Actions</label>
                <textarea id="PermanentActions" name="PermanentActions" class="form-control" placeholder="Permanent Actions" required minlength="50"></textarea>
                <div id="permanentCounter" class="text-muted small mt-1 mb-3"><span class="text-danger">50 characters required</span> - <span class="char-count">0/50</span></div>
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
                        <?php foreach ($jsonMeasures as $measure): ?><option value="<?php echo htmlspecialchars($measure['UM']); ?>"><?php echo htmlspecialchars($measure['UM']); ?></option><?php endforeach; ?>
                    </select>
                </div>
                <div id="SectProducts" class="mb-3">
                    <label for="Products">Products:</label>
                    <select name="Products" id="Products" class="form-select" required>
                        <option></option>
                        <?php foreach ($jsonProducts as $product): ?><option value="<?php echo htmlspecialchars($product['PRODUCT']); ?>"><?php echo htmlspecialchars($product['PRODUCT']); ?></option><?php endforeach; ?>
                    </select>
                </div>
            </div>

            <!-- Carrier, Cost, Reference -->
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
                    <div id="QuotedCostDiv" class="d-flex">
                        <input type="number" id="QuotedCost" name="QuotedCost" class="form-control me-2" placeholder="Quoted Cost" required>
                        <div id="Divisa">
                            <button type="button" id="MXN" class="btn btn-outline-secondary me-1">MXN</button>
                            <button type="button" id="USD" class="btn btn-outline-secondary">USD</button>
                        </div>
                    </div>
                </div>
                <div id="SectReference" class="mb-3">
                    <label for="ReferenceOrder">Reference Order Number</label>
                    <select id="ReferenceOrder" name="ReferenceOrder" class="form-select" required>
                        <option></option>
                    </select>
                </div>
            </div>
            
            <button type="button" id="enviar" class="btn btn-primary">Submit</button>
        </form>
    </main>

    <footer class="text-center py-3">
        <p>© 2025 Grammer. All rights reserved.</p>
    </footer>

    <!-- Scripts -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="https://cdn.jsdelivr.net/npm/driver.js@latest/dist/driver.js.iife.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/driver.js@latest/dist/driver.js.iife.js"></script>
    


    <script src="js/companySelect.js"></script>
    <script src="js/formValidation.js"></script>
    <script src="js/currencyUtils.js"></script>
    <script src="js/addCompany.js"></script>
    <script src="js/uploadFiles.js"></script>
    <!-- <script type="module" src="js/createPDF.js"></script> -->
    <script src="js/carrierSelect.js"></script>
    <script src="js/addCarrier.js"></script>
    <script src="js/referenceSelect.js"></script>
    <script src="js/addNumOrder.js"></script>
    <script src="js/selectConfig.js"></script>  
    <!-- Scripts de la aplicación -->
    <script src="js/header.js" type="module"></script>
    
    <!-- ================== CARGA DE MÓDULOS JS ================== -->
    <script type="module" src="js/mailer.js"></script>
    <script type="module" src="js/newOrder.js"></script>
    <!-- ======================================================= -->
    
    <?php 
    // Carga condicional del JS del asistente.
    if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <script src="js/assistant.js"></script>
    <?php endif; ?>
</body>
</html>
