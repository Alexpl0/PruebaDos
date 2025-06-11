<?php
require_once 'config.php'; // Include config.php to get URL constant
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

session_start();
require_once 'config.php'; // Include config.php to get URL constant
$nivel = isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null;
$name = isset($_SESSION['user']['name']) ? $_SESSION['user']['name'] : null;
$userID = isset($_SESSION['user']['id']) ? $_SESSION['user']['id'] : null;
$plant = isset($_SESSION['user']['plant']) ? $_SESSION['user']['plant'] : null;
include_once 'dao/users/auth_check.php';
?>
<script>
    window.authorizationLevel = <?php echo json_encode($nivel); ?>;
    window.userName = <?php echo json_encode($name); ?>;
    window.userID = <?php echo json_encode($userID); ?>;
    window.userPlant = <?php echo json_encode($plant); ?>;
    // Definimos la variable global de JavaScript con la URL base desde PHP
    const URLPF = '<?php echo URLPF ?>'; 
    // Agregar esta línea para el mailer
    const URLM = '<?php echo URLM ?>'; 
</script>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Special Freight Authorization</title>

    <!-- Favicon -->
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">

    <!-- Enlace al CDN de Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">


    <!-- jQuery first to ensure availability for other scripts -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>

    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

    <!-- Bootstrap -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">

    <!-- Select2 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />

    <!-- Local CSS files -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/newOrder.css">

    <!-- Google Fonts -->
    <link rel="preload" href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap" as="style">
    <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap" rel="stylesheet">
</head>
<body>
    <div id="header-container"></div>

    <main class="container my-4">
        <h1 class="mb-3">SPECIAL FREIGHT AUTHORIZATION</h1>

        <h2 class="mb-4" style="justify-self: center; text-align: center;">Transport Order</h2>
        <form id="plant-form">
            <!--=================================================================================================================-->
            <div id="SectPlantas" class="mb-3"> <!-- Contiene Requesting Plant y Plant Code -->
                <!--=================================================================================================================-->
                <div id="DivPlanta" class="mb-2">
                    <label for="planta">Requesting Plant:</label>
                    <select name="planta" id="planta" class="form-select">
                        <?php if (!empty($jsonPlantas)): ?>
                            <?php foreach ($jsonPlantas as $planta): ?>
                                <option value="<?php echo htmlspecialchars($planta['ID']); ?>">
                                    <?php echo htmlspecialchars($planta['PLANT']); ?>
                                </option>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <option value="" disabled>No data found, JSON_Plantas empty</option>
                        <?php endif; ?>
                    </select>
                </div>
                <!--=================================================================================================================-->
                <div id="DivCodes" class="mb-2">
                    <label for="codeplanta">Plant Code:</label>
                    <select name="codeplanta" id="codeplanta" class="form-select">
                        <?php if (!empty($jsonCodePlants)): ?>
                            <?php foreach ($jsonCodePlants as $codeplanta): ?>
                                <option value="<?php echo htmlspecialchars($codeplanta['ID']); ?>">
                                    <?php echo htmlspecialchars($codeplanta['PLANT_CODE']); ?>
                                </option>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <option value="" disabled>No data found, jsonCodePlants empty</option>
                        <?php endif; ?>
                    </select>
                </div>
                <!--=================================================================================================================-->
            </div>

            <!--=================================================================================================================-->

            <div id="SectTransporte" class="mb-3">
                <!--=================================================================================================================-->
                <div id="DivTransport" class="mb-2">
                    <label for="transport">Transport Mode:</label>
                    <select name="transport" id="transport" class="form-select">
                        <?php if (!empty($jsonTransport)): ?>
                            <?php foreach ($jsonTransport as $transport): ?>
                                <option value="<?php echo htmlspecialchars($transport['ID']); ?>">
                                    <?php echo htmlspecialchars($transport['MODE']); ?>
                                </option>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <option value="" disabled>No data found, jsonTransport empty</option>
                        <?php endif; ?>
                    </select>
                </div>
                <!--=================================================================================================================-->
                <div id="DivInOutBound" class="mb-2">
                    <label for="InOutBound">In/Out Outbound:</label>
                    <select name="InOutBound" id="InOutBound" class="form-select">
                        <?php if (!empty($jsonInOutBound)): ?>
                            <?php foreach ($jsonInOutBound as $InOutBound): ?>
                                <option value="<?php echo htmlspecialchars($InOutBound['ID']); ?>">
                                    <?php echo htmlspecialchars($InOutBound['IN_OUT']); ?>
                                </option>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <option value="" disabled>No data found, jsonInOutBound empty</option>
                        <?php endif; ?>
                    </select>
                </div>
                <!--=================================================================================================================-->
                <div id="SectEuros" class="mb-3">
                    <label for="CostoEuros">Cost in Euros €</label>
                    <input type="text" id="CostoEuros" name="CostoEuros" class="form-control" readonly>
                </div>
                <!--=================================================================================================================-->
            </div>

            <!--=================================================================================================================-->

            <div id="SectResponsability" class="mb-3"> <!-- Contiene Area of Responsibility y Internal/External Service y PaidBy -->

                <!--=================================================================================================================-->

                <div id="DivArea" class="mb-2">
                    <label for="Area">Area of Responsibility:</label>
                    <select name="Area" id="Area" class="form-select">
                        <?php if (!empty($jsonArea)): ?>
                            <?php foreach ($jsonArea as $Area): ?>
                                <option value="<?php echo htmlspecialchars($Area['ID']); ?>">
                                    <?php echo htmlspecialchars($Area['RESPONSIBILITY']); ?>
                                </option>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <option value="" disabled>No data found, jsonArea empty</option>
                        <?php endif; ?>
                    </select>
                </div>

                <!--=================================================================================================================-->

                <div id="DivInExt" class="mb-2">
                    <label for="IntExt">Internal/External Service:</label>
                    <select name="IntExt" id="IntExt" class="form-select">
                        <?php if (!empty($jsonInExt)): ?>
                            <?php foreach ($jsonInExt as $IntExt): ?>
                                <option value="<?php echo htmlspecialchars($IntExt['ID']); ?>">
                                    <?php echo htmlspecialchars($IntExt['IN_EXT']); ?>
                                </option>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <option value="" disabled>No data found, jsonInExt empty</option>
                        <?php endif; ?>
                    </select>
                </div>

                <!--=================================================================================================================-->
                <div id="SectPaidBy" class="mb-3">
                    <label for="PaidBy">Costs paid By:</label>
                    <select name="PaidBy" id="PaidBy" class="form-select">
                        <option value="" disabled selected>Select an Option</option>
                        <option value="Grammer">Grammer</option>
                        <option value="Cliente">Client</option>
                    </select>
                </div>
                <!--=================================================================================================================-->
            </div>

            <!--=================================================================================================================-->

            <div id="SectCause" class="mb-3">
                <!--=================================================================================================================-->
                <div id="DivCategoryCause" class="mb-2">
                    <label for="CategoryCause">Root Category Cause:</label>
                    <select name="CategoryCause" id="CategoryCause" class="form-select">
                        <?php if (!empty($jsonCategoryCause)): ?>
                            <?php foreach ($jsonCategoryCause as $CategoryCause): ?>
                                <option value="<?php echo htmlspecialchars($CategoryCause['ID']); ?>">
                                    <?php echo htmlspecialchars($CategoryCause['CATEGORY']); ?>
                                </option>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <option value="" disabled>No data found, jsonCategoryCause empty</option>
                        <?php endif; ?>
                    </select>
                </div>
                <!--=================================================================================================================-->
                <div id="DivProjectStatus" class="mb-2">
                    <label for="ProjectStatus">Project Status:</label>
                    <select name="ProjectStatus" id="ProjectStatus" class="form-select">
                        <?php if (!empty($jsonProjectStatus)): ?>
                            <?php foreach ($jsonProjectStatus as $ProjectStatus): ?>
                                <option value="<?php echo htmlspecialchars($ProjectStatus['ID']); ?>">
                                    <?php echo htmlspecialchars($ProjectStatus['STATUS']); ?>
                                </option>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <option value="" disabled>No data found, jsonProjectStatus empty</option>
                        <?php endif; ?>
                    </select>
                </div>
                <!--=================================================================================================================-->
                <div id="SectRecovery" class="mb-3">
                    <label for="Recovery">Recovery:</label>
                    <select name="Recovery" id="Recovery" class="form-select">
                        <?php if (!empty($jsonRecovery)): ?>
                            <?php foreach ($jsonRecovery as $Recovery): ?>
                                <option value="<?php echo htmlspecialchars($Recovery['ID']); ?>">
                                    <?php echo htmlspecialchars($Recovery['RECOVERY']); ?>
                                </option>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <option value="" disabled>No data found, jsonRecovery empty</option>
                        <?php endif; ?>
                    </select>
                </div>
                <!--=================================================================================================================-->
            </div>
            <!--=================================================================================================================-->

            <div id="recoveryFileContainer" class="mt-2" style="display: none;">
                <label for="recoveryFile">Recovery Evidence (PDF):</label>
                <input type="file" id="recoveryFile" name="recoveryFile" class="form-control" accept=".pdf">
                <small class="text-muted">Please upload a PDF file as evidence for recovery</small>
            </div>

            <!--=================================================================================================================-->
            <div id="SectDescription" class="mb-3">
                <!--=================================================================================================================-->
                <h3 style="justify-self: center;">Description</h3>
                <textarea id="Description" style="display: none;" name="Description" class="form-control" placeholder="Description" required></textarea>
                <!--=================================================================================================================-->
                <label for="InmediateActions">Immediate Actions</label>
                <textarea id="InmediateActions" name="InmediateActions" class="form-control" placeholder="Immediate Actions" required minlength="50"></textarea>
                <div id="immediateCounter" class="text-muted small mt-1 mb-3">
                    <span class="text-danger">50 characters required</span> - <span class="char-count">0/50</span>
                </div>
                <!--=================================================================================================================-->

                <label for="PermanentActions">Permanent Actions</label>
                <textarea id="PermanentActions" name="PermanentActions" class="form-control" placeholder="Permanent Actions" required minlength="50"></textarea>
                <div id="permanentCounter" class="text-muted small mt-1 mb-3">
                    <span class="text-danger">50 characters required</span> - <span class="char-count">0/50</span>
                </div>
                <!--=================================================================================================================-->
            </div>
            <!--=================================================================================================================-->
            <h2 class="mt-4">Ship From</h2>
            <div id="SectShip" class="mb-3">
                <!--=================================================================================================================-->
                <div id="DivCompanyShip" class="mb-2">
                    <label for="CompanyShip">Company Name</label>
                    <select id="CompanyShip" name="CompanyShip"  class="form-select">
                        <option value="" disabled selected>Select a company</option>
                    </select>
                </div>
                <!--=================================================================================================================-->
                <div id="DivCityShip" class="mb-2">
                    <label for="inputCityShip">City</label>
                    <input type="text" id="inputCityShip" class="form-control" placeholder="City">
                </div>
                <!--=================================================================================================================-->
            </div>
            <!--=================================================================================================================-->
            <div id="ShipTo" class="mb-3">
                <div id="DivStatesShip" class="mb-2">
                    <label for="StatesShip">State:</label>
                    <input type="text" id="StatesShip" class="form-control" placeholder="States">
                </div>
                <!--=================================================================================================================-->

                <div id="DivZipShip" class="mb-2">
                    <label for="inputZipShip">ZIP</label>
                    <input type="number" id="inputZipShip" class="form-control" placeholder="ZIP">
                </div>
            </div>
            <!--=================================================================================================================-->
            <h2 class="mt-4">Destination</h2>
            <div id="SectDest" class="mb-3">
                <!--=================================================================================================================-->
                <div id="DivCompanyDest" class="mb-2">
                    <label for="inputCompanyNameDest">Company Name</label>
                    <select id="inputCompanyNameDest" name="inputCompanyNameDest"  class="form-select">
                        <option value="" disabled selected>Select a company</option>
                    </select>
                </div>
                <!--=================================================================================================================-->
                <div id="DivCityDest" class="mb-2">
                    <label for="inputCityDest">City</label>
                    <input type="text" id="inputCityDest" class="form-control" placeholder="City Dest">
                </div>
                <!--=================================================================================================================-->
            </div>
            <!--=================================================================================================================-->
            <div id="DestTo" class="mb-3">
                <div id="DivStatesDest" class="mb-2">
                    <label for="StatesDest">State:</label>
                    <input type="text" id="StatesDest" class="form-control" placeholder="States">
                </div>
                <!--=================================================================================================================-->
                <div id="SectZipDest" class="mb-2">
                    <label for="inputZipDest">ZIP</label>
                    <input type="number" id="inputZipDest" class="form-control" placeholder="ZIP">
                </div>
            </div>
            <!--=================================================================================================================-->
            <div id="SectMeasures" class="mb-3">
                <!--=================================================================================================================-->
                <div id="MeasuresDiv">
                    <label for="Weight">Weight:</label>
                    <input type="number" id="Weight" name="Weight" class="form-control me-2" placeholder="Weight" required>
                    <!--=================================================================================================================-->
                    <label for="Measures">U/M</label>
                    <select id="Measures" name="Measures"  class="form-select">
                        <?php if (!empty($jsonMeasures)): ?>
                            <?php foreach ($jsonMeasures as $Measures): ?>
                                <option value="<?php echo htmlspecialchars($Measures['UM']); ?>">
                                    <?php echo htmlspecialchars($Measures['UM']); ?>
                                </option>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <option value="" disabled>No data found, jsonMeasures empty</option>
                        <?php endif; ?>
                    </select>
                    <!--=================================================================================================================-->
                </div>
                <!--=================================================================================================================-->
                <div id="SectProducts" class="mb-3">
                    <label for="Products">Products:</label>
                    <select name="Products" id="Products" class="form-select">
                        <?php if (!empty($jsonProducts)): ?>
                            <?php foreach ($jsonProducts as $Products): ?>
                                <!-- Cambia aquí para usar PRODUCT como valor en lugar de ID -->
                                <option value="<?php echo htmlspecialchars($Products['PRODUCT']); ?>">
                                    <?php echo htmlspecialchars($Products['PRODUCT']); ?>
                                </option>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <option value="" disabled>No data found, jsonProducts empty</option>
                        <?php endif; ?>
                    </select>
                </div>
                <!--=================================================================================================================-->
            </div>
            <!--=================================================================================================================-->
            <h2 class="mt-4">Selected Carrier</h2>
            <div id="SectCarrier" class="mb-3">
                <!--=================================================================================================================-->
                <div id="DivCarrier" class="mb-2">
                    <label for="Carrier">Carrier:</label>
                    <select name="Carrier" id="Carrier" class="form-select">
                        <option value="" disabled selected>Select a carrier</option>
                    </select>
                </div>
                <!--=================================================================================================================-->
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
                <!--=================================================================================================================-->
                <div id="SectReference" class="mb-3">
                    <!--=================================================================================================================-->
                    <label for="Reference">Reference</label>
                    <div class="reference-container">
                        <select id="Reference" name="Reference" class="form-select">
                            <option value="" disabled selected>Select a Reference</option>
                            <option value="45">45</option>
                            <option value="3">3</option>
                            <option value="CC">CC</option>
                            <option value="Order">Order</option>
                        </select>
                        <!--=================================================================================================================-->
                        <input id="ReferenceNumber" type="number" name="ReferenceNumber" class="form-control" placeholder="Reference Number" required>
                    </div>
                    <!--=================================================================================================================-->
                </div>
            </div>
            <!--=================================================================================================================-->
            <button type="button" id="enviar" class="btn btn-primary">Submit</button>
        </form>
    </main>

    <footer class="text-center py-3">
        <p>© 2025 Grammer. All rights reserved.</p>
    </footer>

    <!-- Scripts -->
    <script src="js/header.js"></script>
    <script src="js/companySelect.js"></script>
    <script src="js/formValidation.js"></script>
    <script src="js/currencyUtils.js"></script>
    <script src="js/addCompany.js"></script>
    <script src="js/uploadFiles.js"></script>
    <script src="js/newOrder.js"></script>
    <script src="js/createPDF.js"></script>
    <script src="js/carrierSelect.js"></script>
    <script src="js/addCarrier.js"></script>
    <script src="js/selectConfig.js"></script>  
    <!-- Add this just before the closing </body> tag -->
</body>
</html>