<?php
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
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Special Freight Authorization</title>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script type="module" src="https://unpkg.com/ionicons@7.2.2/dist/ionicons/ionicons.esm.js"></script>
    <script nomodule src="https://unpkg.com/ionicons@7.2.2/dist/ionicons/ionicons.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/newOrder.css">
    <!-- Asegúrate de que jQuery esté cargado antes que otros scripts que lo utilizan -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
</head>
<body>
    <header class="header">
        <a href="#" class="header__logo">GRAMMER</a>
        <ion-icon name="menu-outline" class="header__toggle" id="nav-toggle"></ion-icon>
        <nav class="nav" id="nav-menu">
            <div class="nav__content bd-grid">
                <ion-icon name="close-outline" class="nav__close" id="nav-close"></ion-icon>
                <div class="nav__perfil">
                    <div class="nav__img">
                        <img src="assets/logo/logo.png" alt="logoGRAMMER">
                    </div>
                    <div>
                        <a href="#" class="nav__name">SPECIAL FREIGHT</a>
                    </div>
                </div>
                <div class="nav__menu">
                    <ul class="nav__list">
                        <li class="nav__item"><a href="index.php" class="nav__link">Home</a></li>
                        <li class="nav__item"><a href="newOrder.php" class="nav__link active">New Order</a></li>
                        <li class="nav__item"><a href="orders.php" class="nav__link">Generated Orders</a></li>
                        <li class="nav__item"><a href="register.php" class="nav__link">Add User</a></li>
                        <li class="nav__item"><a href="https://www.google.com" class="nav__link">Charts</a></li>
                        <li class="nav__item"><a href="#" class="nav__link">Manual</a></li>
                        <?php if (isset($_SESSION['user'])): ?>
                            <li class="nav__item"><a href="logout.php" class="nav__link">Log Out</a></li>
                        <?php endif; ?>
                    </ul>
                </div>
            </div>
        </nav>
    </header>

    <main class="container my-4">
        <h1 class="mb-3">SPECIAL FREIGHT AUTHORIZATION</h1>
        <h2 class="mb-4">Transport Order</h2>
        <form id="plant-form">
            <div id="SectPlantas" class="mb-3">
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
            </div>

            <div id="SectTransporte" class="mb-3">
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
            </div>

            <div id="SectEuros" class="mb-3">
                <label for="CostoEuros">Cost in Euros €</label>
                <input type="text" id="CostoEuros" name="CostoEuros" class="form-control" readonly>
            </div>

            <div id="SectResponsability" class="mb-3">
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
            </div>

            <div id="SectPaidBy" class="mb-3">
                <label for="PaidBy">Costs paid By:</label>
                <select name="PaidBy" id="PaidBy" class="form-select">
                    <option value="" disabled selected>Select an Option</option>
                    <option value="Grammer">Grammer</option>
                    <option value="Cliente">Client</option>
                </select>
            </div>

            <div id="SectCause" class="mb-3">
                <div id="DivCategoryCause" class="mb-2">
                    <label for="CategoryCause">Category Cause:</label>
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
            </div>

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

            <div id="SectDescription" class="mb-3">
                <label for="Description">Description and Root Cause</label>
                <textarea id="Description" name="Description" class="form-control" placeholder="Description and Root Cause" required></textarea>
            </div>

            <h2 class="mt-4">Ship From</h2>
            <div id="SectShip" class="mb-3">
                <div id="DivCompanyShip" class="mb-2">

                    <label for="CompanyShip">Company Name</label>
                    <select name="CompanyShip" id="CompanyShip" class="form-select">
                        <option value="" disabled selected>Select a company</option>
                    </select>
                    
                </div>
                <div id="DivCityShip" class="mb-2">
                    <label for="inputCityShip">City</label>
                    <input type="text" id="inputCityShip" class="form-control" placeholder="City">
                </div>
            </div>
                <div id="DivStatesShip" class="mb-2">
                    <label for="StatesShip">States:</label>
                    <input type="text" id="StatesShip" class="form-control" placeholder="States">
                </div>

                <div id="DivZipShip" class="mb-2">
                    <label for="inputZipShip">ZIP</label>
                    <input type="number" id="inputZipShip" class="form-control" placeholder="ZIP">
                </div>
            </div>

            <h2 class="mt-4">Destination</h2>
            <div id="SectDest" class="mb-3">

                <div id="DivCompanyDest" class="mb-2">

                    <label for="inputCompanyNameDest">Company Name</label>
                    <select name="inputCompanyNameDest" id="inputCompanyNameDest" class="form-select">
                        <option value="" disabled selected>Select a company</option>
                    </select>

                </div>

                <div id="DivCityDest" class="mb-2">
                    <label for="inputCityDest">City Dest</label>
                    <input type="text" id="inputCityDest" class="form-control" placeholder="City Dest">
                </div>
            </div>
                <div id="DivStatesDest" class="mb-2">
                    <label for="StatesDest">States:</label>
                    <input type="text" id="StatesDest" class="form-control" placeholder="States">
                </div>

                <div id="SectZipDest" class="mb-2">
                    <label for="inputZipDest">ZIP</label>
                    <input type="number" id="inputZipDest" class="form-control" placeholder="ZIP">
                </div>
            </div>

            <div id="SectMeasures" class="mb-3">
                <label for="Weight">Weight:</label>
                <div id="MeasuresDiv" class="d-flex">
                    <input type="number" id="Weight" name="Weight" class="form-control me-2" placeholder="Weight" required>
                    <select name="Measures" id="Measures" class="form-select">
                        <?php if (!empty($jsonMeasures)): ?>
                            <?php foreach ($jsonMeasures as $Measures): ?>
                                <option value="<?php echo htmlspecialchars($Measures['ID']); ?>">
                                    <?php echo htmlspecialchars($Measures['UM']); ?>
                                </option>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <option value="" disabled>No data found, jsonMeasures empty</option>
                        <?php endif; ?>
                    </select>
                </div>
            </div>

            <div id="SectProducts" class="mb-3">
                <label for="Products">Products:</label>
                <select name="Products" id="Products" class="form-select">
                    <?php if (!empty($jsonProducts)): ?>
                        <?php foreach ($jsonProducts as $Products): ?>
                            <option value="<?php echo htmlspecialchars($Products['ID']); ?>">
                                <?php echo htmlspecialchars($Products['PRODUCT']); ?>
                            </option>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <option value="" disabled>No data found, jsonProducts empty</option>
                    <?php endif; ?>
                </select>
            </div>

            <h2 class="mt-4">Selected Carrier</h2>
            <div id="SectCarrier" class="mb-3">
                <div id="DivCarrier" class="mb-2">
                    <label for="Carrier">Carrier:</label>
                    <select name="Carrier" id="Carrier" class="form-select">
                        <?php if (!empty($jsonCarrier)): ?>
                            <?php foreach ($jsonCarrier as $Carrier): ?>
                                <option value="<?php echo htmlspecialchars($Carrier['ID']); ?>">
                                    <?php echo htmlspecialchars($Carrier['PROVEEDOR']); ?>
                                </option>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <option value="" disabled>No data found, jsonCarrier empty</option>
                        <?php endif; ?>
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
            </div>

            <div id="SectReference" class="mb-3">
                <label for="Reference">Reference</label>
                <div id="ReferenceDiv" class="d-flex">
                    <select name="Reference" id="Reference" class="form-select me-2">
                        <option value="" disabled selected>Select a Reference</option>
                        <option value="45">45</option>
                        <option value="3">3</option>
                        <option value="CC">CC</option>
                        <option value="Order">Order</option>
                    </select>
                    <input type="number" id="ReferenceNumber" name="ReferenceNumber" class="form-control" placeholder="Reference Number" required>
                </div>
            </div>

            <button type="button" id="enviar" class="btn btn-primary">Submit</button>
        </form>
    </main>

    <footer class="text-center py-3 bg-light">
        <p>© 2023 Grammer. All rights reserved.</p>
    </footer>

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
    <script src="js/header.js"></script>
    <script src="js/formValidation.js"></script>
    <script src="js/companySelect.js"></script>
    <script src="js/currencyUtils.js"></script>
    <script src="js/newOrder.js"></script>
    <script src="js/createPDF.js"></script>

    <script>
        $(document).ready(function() {
            $('#planta').select2({
                placeholder: 'Select a Plant',
                allowClear: true
            });
            $('#codeplanta').select2({
                placeholder: 'Select a Plant Code',
                allowClear: true
            });
            $('#transport').select2({
                placeholder: 'Select a Transport Mode',
                allowClear: true
            });
            $('#InOutBound').select2({
                placeholder: 'Select In/Out Outbound',
                allowClear: true
            });
            $('#Area').select2({
                placeholder: 'Select Area of Responsibility',
                allowClear: true
            });
            $('#IntExt').select2({
                placeholder: 'Select Internal/External Service',
                allowClear: true
            });
            $('#PaidBy').select2({
                placeholder: 'Select Costs paid By',
                allowClear: true
            });
            $('#CategoryCause').select2({
                placeholder: 'Select Category Cause',
                allowClear: true
            });
            $('#ProjectStatus').select2({
                placeholder: 'Select Project Status',
                allowClear: true
            });
            $('#Recovery').select2({
                placeholder: 'Select Recovery',
                allowClear: true
            });
            // Elimina o comenta la siguiente inicialización para CompanyShip
            /*
            $('#CompanyShip').select2({
                placeholder: 'Select Company Name',
                allowClear: true
            });
            */
            // $('#StatesShip').select2({
            //     placeholder: 'Select States',
            //     allowClear: true
            // });
            // $('#StatesDest').select2({
            //     placeholder: 'Select States',
            //     allowClear: true
            // });
            $('#Products').select2({
                placeholder: 'Select Products',
                allowClear: true
            });
            $('#Carrier').select2({
                placeholder: 'Select Carrier',
                allowClear: true
            });
            $('#Measures').select2({
                placeholder: 'Select Unit of Measure',
                allowClear: true
            });
            $('#Reference').select2({
                placeholder: 'Select a Reference',
                allowClear: true
            });
        });
    </script>
</body>
</html>