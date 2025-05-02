<?php
// Include and execute the daoPlantas.php file only once.
// This file contains the logic to connect to the database and get the list of plants.
// The variable $json is expected to be defined in daoPlantas.php and contain the plant data.
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
// Now you can use $_SESSION['user']
?>

<!DOCTYPE html>
<html lang="en">
<head> 
    <meta charset="UTF-8"> 
    <meta name="viewport" content="width=device-width, initial-scale=1.0"> 
    <title>Plants</title> <!-- Defines the title that appears in the browser tab or title bar -->
    
    <!-- Include SweetAlert2 library from a CDN to display nice alerts and messages -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Add Ionicons in the head with the latest version -->
    <script type="module" src="https://unpkg.com/ionicons@7.2.2/dist/ionicons/ionicons.esm.js"></script>
    <script nomodule src="https://unpkg.com/ionicons@7.2.2/dist/ionicons/ionicons.js"></script>
    
    
    <!-- Link Bootstrap CSS stylesheet from a CDN to apply predefined styles -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
    <!-- Link Select2 CSS stylesheet from a CDN to improve the appearance and functionality of the <select> element -->
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />

    
    <!-- Local CSS files -->
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/newOrder.css">
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
                        <li class="nav__item"><a href="index.php" class="nav__link ">Home</a></li>
                        <li class="nav__item"><a href="newOrder.php" class="nav__link active">New Order</a></li>
                        <li class="nav__item"><a href="orders.php" class="nav__link ">Generated Orders</a></li>
                        <li class="nav__item"><a href="register.php" class="nav__link">Add User</a></li>
                        <li class="nav__item"><a href="google.com" class="nav__link">Charts</a></li>
                        <li class="nav__item"><a href="  " class="nav__link">Manual</a></li>
                        <?php if (isset($_SESSION['user'])): ?>
                            <li class="nav__item"><a href="logout.php" class="nav__link">Log Out</a></li>
                        <?php endif; ?>
                    </ul>
                </div>
            </div>
        </nav>
    </header>
    
    <h1>SPECIAL FREIGHT AUTHORIZATION</h1>
    <h2>Transport Order</h2>    
    <div id="home"> 
        <form id="plant-form"> 
            
        <div id="SectPlantas">
            <div id="DivPlanta"> 
                <label for="planta" >Requesting Plant:</label> 
                <select name="planta" id="planta" > <!-- Dropdown element (select) with name 'planta', ID 'planta' and Bootstrap class 'form-select' -->
                    <?php if (!empty($jsonPlantas)): ?> <!-- Starts a PHP block: checks if the jsonPlantas variable (which contains the plant data) is not empty -->
                        <?php foreach ($jsonPlantas as $planta): ?> <!-- Iterates over each element (plant) within the jsonPlantas array -->
                            <!-- Creates an option within the select. The 'value' attribute will contain the plant ID -->
                            <!-- htmlspecialchars is used to prevent XSS attacks when displaying data -->
                            <option value="<?php echo htmlspecialchars($planta['ID']); ?>">
                                <!-- The visible text of the option will be the plant name ('PLANT') -->
                                <!-- htmlspecialchars is used to prevent XSS attacks when displaying data -->
                                <?php echo htmlspecialchars($planta['PLANT']); ?> <!-- Plant refers to the JSON -->
                            </option> <!-- End of option -->
                        <?php endforeach; ?> <!-- End of foreach loop -->
                    <?php else: ?> <!-- If the $json variable is empty -->
                        <!-- Display a disabled option indicating that no data was found -->
                        <option value="" disabled>No data found, JSON_Plantas empty</option>
                    <?php endif; ?>
                </select>
            </div> 

            <div id="DivCodes">
                <label for="codeplanta" >Plant Code:</label>
                <select name="codeplanta" id="codeplanta" >
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
        <div id="SectTransporte">
            <div id="DivTransport">
                <label for="transport" >Transport Mode:</label> 
                <select name="transport" id="transport" >
                    <?php if (!empty($jsonTransport)): ?>
                        <?php foreach ($jsonTransport as $transport): ?>
                            <option value="<?php echo htmlspecialchars($transport['ID']); ?>">
                                <?php echo htmlspecialchars($transport['MODE']); ?> 
                            </option>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <option value="" disabled>No data found, jsonCodePlants empty</option>
                    <?php endif; ?>
                </select>
            </div>

            <div id="DivInOutBound">
                <label for="InOutBound" >In/Out Outbound:</label> 
                <select name="InOutBound" id="InOutBound" >
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

            <div id="SectEuros">
                <label for="CostoEuros">Cost in Euros €</label>
                <input type="text" id="CostoEuros" name="CostoEuros" readonly>
            </div>

        <div id="SectResponsability">
            <div id="DivArea" >
                <label for="Area" >Area of Responsibility:</label> 
                <select name="Area" id="Area" >
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

            <div id="DivInExt">
                <label for="IntExt" >Internal/External Service:</label> 
                <select name="IntExt" id="IntExt" >
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
            <div id="SectPaidBy">
                <label for="PaidBy">Costs paid By:</label>
                <select name="PaidBy" id="PaidBy" >
                    <option value="" disabled selected>Select an Option</option>
                    <option value="Grammer">Grammer</option>
                    <option value="Cliente">Client</option> 
                    </select>
            </div>

        <div id="SectCause">
            <div id="DivCategoryCause">
                <label for="CategoryCause" >Category Cause:</label> 
                <select name="CategoryCause" id="CategoryCause" >
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

            <div id="DivProjectStatus">
                <label for="ProjectStatus" >Project Status:</label> 
                <select name="ProjectStatus" id="ProjectStatus" >
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

            <div id="SectRecovery">
                <label for="Recovery" >Recovery:</label> 
                <select name="Recovery" id="Recovery" >
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
            
            <div id="SectDescription">
                <label for="Description and Root Cause"> Description and Root Cause</label>
                    <textarea id="Description" name="Description" placeholder="Description and Root Cause" required></textarea>
            </div>
            <h2>Ship From</h2>

            <div id="SectShip">

                <div id="DivCompanyShip">
                    <label for="CompanyNameShip" id="CompanyNameShip">Company Name</label>
                    <div>
                        <select name="CompanyShip" id="CompanyShip">
                            <!-- Options will be added dynamically by JS -->
                        </select>
                    </div>
                </div>

                <div id="DivCityShip">
                    <label for="CityShip" id="CityShip">City</label>
                    <input type="text" id="inputCityShip" placeholder="City">
                </div>
            </div>
                <div id="DivStatesShip">
                    <label for="States" >States:</label> 
                    <div>
                        <select name="StatesShip" id="StatesShip" >
                            <?php if (!empty($jsonStates)): ?>
                                <?php foreach ($jsonStates as $StatesShip): ?>
                                    <option value="<?php echo htmlspecialchars($StatesShip['ID']); ?>">
                                        <?php echo htmlspecialchars($StatesShip['estadonombre']); ?> 
                                    </option>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <option value="" disabled>No data found, jsonStates empty</option>
                            <?php endif; ?>
                        </select>
                    </div>
                </div>

                <div id="DivZipShip">
                    <label for="ZipShip" id="ZipShip">ZIP</label>
                    <input type="number" id="inputZipShip" placeholder="ZIP">
                </div>

            <h2>Destination</h2>

            <div id="SectDest">

                <div id="DivCompanyDest">
                    <label for="CompanyNameDest" id="CompanyNameDest">Company Name</label>
                    <input type="text" id="inputCompanyNameDest" placeholder="Company Name">
                </div>

                <div id="DivCityDest">
                    <label for="CityDest" id="CityDest">City Dest </label>
                    <input type="text" id="inputCityDest" placeholder="City Dest">
                </div>
            </div>
                <div id="SectStatesDest">
                    <label for="States" >States:</label> 
                    <div id="DivStatesDest">
                        <select name="StatesDest" id="StatesDest" >
                            <?php if (!empty($jsonStates)): ?>
                                <?php foreach ($jsonStates as $StatesDest): ?>
                                    <option value="<?php echo htmlspecialchars($StatesDest['ID']); ?>">
                                        <?php echo htmlspecialchars($StatesDest['estadonombre']); ?> 
                                    </option>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <option value="" disabled>No data found, jsonStates empty</option>
                            <?php endif; ?>
                        </select>
                    </div>
                </div>

                <div id="SectZipDest">
                    <label for="ZipDest" id="ZipDest">ZIP</label>
                    <input type="number" id="inputZipDest" placeholder="ZIP">
                </div>

            



            <div id="SectMeasures">
                <label for="Measures" >Weight:</label> 
                <div id="MeasuresDiv">
                    <input type="number" id="Weight" name="Weight" placeholder="Weight" required>
                    <select name="Measures" id="Measures" >
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

            <div id="SectProducts">
                <label for="Products" >Products:</label> 
                <select name="Products" id="Products" >
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

            <h2>Selected Carrier</h2>

            <div id="SectCarrier">
                <div id="DivCarrier">
                    <label for="Carrier" >Carrier:</label> 
                    <select name="Carrier" id="Carrier" >
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

                <div id="DivCosto">
                    <label for="Quoted Cost">Quoted Cost</label>
                        <div id="QuotedCostDiv">
                            <input type="number" id="QuotedCost" name="QuotedCost" placeholder="Quoted Cost" required>
                            <div id="Divisa">
                                <button type="button" id="MXN">MXN</button>
                                <button type="button" id="USD">USD</button>
                            </div>
                        </div>
                </div>
            </div>
            
            <div id="SectReference">
                    <label for="Reference">Reference</label>
                    <div id="ReferenceDiv">
                        <select name="Reference" id="Reference" >
                            <option value="" disabled selected>Select a Reference</option>
                            <option value="45">45</option>
                            <option value="3">3</option>
                            <option value="CC">CC</option>
                            <option value="Order">Order</option>
                        </select>
                        <input type="number" id="ReferenceNumber" name="ReferenceNumber" placeholder="Reference Number" required>
                    </div>
            </div>



            <!-- The 'onclick' attribute calls the JavaScript 'enviar' function when clicked, passing the event object -->
            <button type="button" id="enviar">Submit</button>
        </form> 
    </div>
    
    <footer>
        <div >
            <div>
                <p>© 2023 Grammer. All rights reserved.</p>
            </div>
        </div>
    </footer>



    <!-- Local JS files -->
    <script src="js/header.js"></script>
    <script src="js/newOrder.js"></script>
    <script src="js/createPDF.js"></script>

    <!-- Include jQuery library from a CDN. jQuery is necessary for Select2 and facilitates DOM manipulation and events -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    
    <!-- Include Select2 JavaScript file from a CDN -->
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
    
    <script> // Start of a JavaScript code block
        // Run the anonymous function when the HTML document is completely loaded and ready
        $(document).ready(function() {
            // Select the element with ID 'planta' using jQuery and apply the Select2 functionality
            $('#planta').select2({
                placeholder: "Plants", // Define a placeholder text for the select
                allowClear: true // Allow the user to clear the current selection
            });
            
            $('#codeplanta').select2({
                placeholder: "Plant Code", 
                allowClear: true 
            });

            $('#transport').select2({
                placeholder: "Transport Mode", 
                allowClear: true 
            });

            $('#InOutBound').select2({
                placeholder: "In/Out Service", 
                allowClear: true 
            });

            $('#Area').select2({
                placeholder: "Area of Responsibility", 
                allowClear: true 
            });

            $('#IntExt').select2({
                placeholder: "Internal/External Service", 
                allowClear: true 
            });

            $('#CategoryCause').select2({
                placeholder: "Category Cause", 
                allowClear: true 
            });

            $('#ProjectStatus').select2({
                placeholder: "Project Status", 
                allowClear: true 
            });

            $('#Recovery').select2({
                placeholder: "Recovery", 
                allowClear: true 
            });

            $('#Carrier').select2({
                placeholder: "Carrier", 
                allowClear: true 
            });

            $('#Measures').select2({
                placeholder: "Measures", 
                allowClear: true 
            });

            $('#Products').select2({
                placeholder: "Products", 
                allowClear: true 
            });

            $('#StatesShip').select2({
                placeholder: "StatesShip", 
                allowClear: true 
            });

            $('#Reference').select2({
                placeholder: "Reference", 
                allowClear: true 
            });

            $('#StatesDest').select2({
                placeholder: "StatesDest", 
                allowClear: true 
            });
        });
        
        </script>
        StateShip
        <script>
            $(document).ready(function() {
                $('#verPDF').click(function() {
                    $.ajax({
                        url: 'pdf.svg',
                        dataType: 'text',
                        success: function(data) {
                            $('#svgContainer').html(data); // 
                            $('#svgModal').modal('show');
                        },
                        error: function() {
                            alert('Error loading document');
                        }
                    });
                });
            });
            </script>
</body> 
</html>