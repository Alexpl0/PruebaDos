<?php
/**
 * quotes.php - Main page of Intelligent Quotation Portal
 * Updated to use same structure and styles as quotes.php and newOrder.php
 */

// 1. Handle session and authentication.
require_once 'dao/users/auth_check.php';

// 2. Load necessary dependencies.
require_once 'dao/elements/daoPlantas.php';
require_once 'dao/elements/daoTransport.php';
require_once 'dao/elements/daoCarrier.php';

// 3. Include context injector.
require_once 'dao/users/context_injector.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GRAMMER Logistics & Traffic - Quotation Portal</title>

    <!-- Favicon -->
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">

    <!-- External Styles -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap" rel="stylesheet">

    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

    <!-- Local Styles -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="cotizaciones/css/quotes.css">
    <link rel="stylesheet" href="css/tour-styles.css">

    <!-- ================== CENTRALIZED CONTEXT SYSTEM ================== -->
    <?php
        // Context injector already required above.
    ?>
    <!-- Include JS configuration module. -->
    <script src="js/config.js"></script>
    <!-- ==================================================================== -->
</head>
<body>
    <!-- Dynamic Header using same system as quotes.php and newOrder.php -->
    <div id="header-container"></div>



    <!-- Main Content with structure similar to newOrder.php -->
    <main class="container my-4">
        <!-- Main title with integrated navigation -->
        <div class="text-center mb-4">
            <h1 class="mb-2">GRAMMER LOGISTICS & TRAFFIC</h1>
            <h2 class="mb-3" style="color: var(--grammer-blue);">Intelligent Quotation Portal</h2>
            
            <!-- Navigation Cards -->
            <div class="row justify-content-center mt-4">
                <div class="col-md-8">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <a href="dashboardQuotes.php" class="nav-card-link text-decoration-none">
                                <div class="nav-card h-100">
                                    <div class="nav-card-icon">
                                        <i class="fas fa-chart-line"></i>
                                    </div>
                                    <h6 class="nav-card-title">Dashboard</h6>
                                    <p class="nav-card-description">View all requests and analytics</p>
                                </div>
                            </a>
                        </div>
                        <div class="col-md-6">
                            <a href="myQuotes.php" class="nav-card-link text-decoration-none">
                                <div class="nav-card h-100">
                                    <div class="nav-card-icon">
                                        <i class="fas fa-history"></i>
                                    </div>
                                    <h6 class="nav-card-title">My Quotes History</h6>
                                    <p class="nav-card-description">Track your personal requests</p>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row justify-content-center">
            <div class="col-lg-10">
                <!-- Main Form Card -->
                <div class="card grammer-card shadow-lg mb-4">
                    <div class="card-header grammer-card-header">
                        <div class="d-flex align-items-center justify-content-between">
                            <div>
                                <h3 class="card-title h5 mb-0">
                                    <i class="fas fa-plus-circle text-grammer-accent me-2"></i>
                                    New Quotation Request
                                </h3>
                                <small class="text-muted">
                                    <i class="fas fa-calendar me-1"></i>
                                    <span id="currentDateTime"></span>
                                </small>
                            </div>
                            <div class="header-actions">
                                <a href="dashboardQuotes.php" class="btn btn-outline-primary btn-sm me-2">
                                    <i class="fas fa-chart-line me-1"></i>
                                    Dashboard
                                </a>
                                <div class="btn-group">
                                    <button type="button" class="btn btn-outline-secondary btn-sm dropdown-toggle" data-bs-toggle="dropdown">
                                        <i class="fas fa-cog me-1"></i>
                                    </button>
                                    <ul class="dropdown-menu dropdown-menu-end">
                                        <li><a class="dropdown-item" href="#" onclick="grammerForm.loadDraft()">
                                            <i class="fas fa-file-import me-2"></i>Load Draft
                                        </a></li>
                                        <li><a class="dropdown-item" href="#" onclick="grammerForm.clearDraft()">
                                            <i class="fas fa-trash me-2"></i>Clear Draft
                                        </a></li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li><a class="dropdown-item" href="mailto:logistica@grammer.com">
                                            <i class="fas fa-envelope me-2"></i>Support
                                        </a></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card-body">
                        <form id="shippingRequestForm" novalidate style="max-width: fit-content;">
                            <!-- Method selector and dynamic form -->
                            <div id="shippingMethodSelector" class="mb-4">
                                <!-- Will be filled by JavaScript -->
                            </div>
                            
                            <!-- Container for dynamic form -->
                            <div id="dynamicFormContainer">
                                <!-- Will be filled dynamically by JavaScript according to selected method -->
                            </div>

                            <!-- Action Buttons (only visible when method is selected) -->
                            <div id="formActionButtons" class="row mt-4" style="display: none;">
                                <div class="col-md-6">
                                    <button type="button" class="btn btn-outline-secondary w-100" id="clearFormBtn">
                                        <i class="fas fa-eraser me-1"></i>
                                        Clear Form
                                    </button>
                                </div>
                                <div class="col-md-6">
                                    <button type="submit" class="btn btn-grammer-primary w-100" id="submitBtn">
                                        <i class="fas fa-paper-plane me-1"></i>
                                        <span class="submit-text">Send Request</span>
                                        <span class="submit-loading d-none">
                                            <i class="fas fa-spinner fa-spin me-1"></i>
                                            Sending...
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- GRAMMER Info Card -->
                <div class="card grammer-info-card mb-4">
                    <div class="card-body">
                        <h5 class="card-title text-grammer-primary">
                            <i class="fas fa-info-circle me-2"></i>
                            How our quotation system works
                        </h5>
                        <div class="row">
                            <div class="col-md-3 text-center mb-3">
                                <div class="info-step">
                                    <div class="step-icon bg-grammer-primary">
                                        <i class="fas fa-mouse-pointer fa-lg"></i>
                                    </div>
                                    <h6>1. Select Method</h6>
                                    <small class="text-muted">Choose between Fedex, Air-Sea or Domestic</small>
                                </div>
                            </div>
                            <div class="col-md-3 text-center mb-3">
                                <div class="info-step">
                                    <div class="step-icon bg-grammer-secondary">
                                        <i class="fas fa-edit fa-lg"></i>
                                    </div>
                                    <h6>2. Complete Data</h6>
                                    <small class="text-muted">Fill the method-specific form</small>
                                </div>
                            </div>
                            <div class="col-md-3 text-center mb-3">
                                <div class="info-step">
                                    <div class="step-icon bg-grammer-accent">
                                        <i class="fas fa-share fa-lg"></i>
                                    </div>
                                    <h6>3. Automatic Sending</h6>
                                    <small class="text-muted">Specialized carriers are notified</small>
                                </div>
                            </div>
                            <div class="col-md-3 text-center mb-3">
                                <div class="info-step">
                                    <div class="step-icon bg-grammer-success">
                                        <i class="fas fa-chart-bar fa-lg"></i>
                                    </div>
                                    <h6>4. AI Analysis</h6>
                                    <small class="text-muted">Intelligent comparison of options</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Stats Card (Only visible if there's data) -->
                <div id="quickStats" class="card grammer-stats-card mt-4 d-none">
                    <div class="card-body">
                        <h6 class="card-title text-grammer-primary mb-3">
                            <i class="fas fa-tachometer-alt me-2"></i>
                            Quick Stats - Today
                        </h6>
                        <div class="row">
                            <div class="col-md-3">
                                <div class="stat-item">
                                    <div class="stat-number" id="todayRequests">0</div>
                                    <div class="stat-label">Requests</div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="stat-item">
                                    <div class="stat-number" id="pendingQuotes">0</div>
                                    <div class="stat-label">Pending</div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="stat-item">
                                    <div class="stat-number" id="completedToday">0</div>
                                    <div class="stat-label">Completed</div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="stat-item">
                                    <div class="stat-number" id="avgResponseTime">-</div>
                                    <div class="stat-label">Avg. Response Time</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- Footer consistent with other files -->
    <footer class="text-center py-3">
        <p>&copy; 2025 GRAMMER Automotive Puebla S.A. de C.V. - All rights reserved.</p>
    </footer>

    <!-- Scripts in same order as newOrder.php -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/limonte-sweetalert2/11.10.1/sweetalert2.all.min.js"></script>

    <!-- Local Scripts -->
    <script src="js/config.js"></script>
    <script src="js/header.js" type="module"></script>
    <script src="cotizaciones/js/config.js"></script>
    <script type="module" src="cotizaciones/js/quotes.js"></script>

    <!-- Script to initialize date/time -->
    <script>
        // Update current date and time
        function updateDateTime() {
            const now = new Date();
            const options = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            };
            const dateTimeString = now.toLocaleDateString('en-US', options);
            const element = document.getElementById('currentDateTime');
            if (element) {
                element.textContent = dateTimeString;
            }
        }

        // Initialize when DOM is ready
        document.addEventListener('DOMContentLoaded', function() {
            updateDateTime();
            // Update every minute
            setInterval(updateDateTime, 60000);
        });
    </script>
</body>
</html>