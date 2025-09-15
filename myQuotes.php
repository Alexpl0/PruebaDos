<?php
/**
 * myQuotes.php - User Quote History Page
 * GRAMMER Logistics & Traffic - Intelligent Quotation Portal
 * @author Alejandro Pérez
 */

// 1. Handle session and authentication
require_once 'dao/users/auth_check.php';

// 2. Load necessary dependencies
require_once 'dao/elements/daoPlantas.php';
require_once 'dao/elements/daoTransport.php';
require_once 'dao/elements/daoCarrier.php';

// 3. Include context injector
require_once 'dao/users/context_injector.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Quotes History - GRAMMER Logistics</title>

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
    <link rel="stylesheet" href="cotizaciones/css/myQuotes.css">
    <link rel="stylesheet" href="css/tour-styles.css">

    <!-- Charts -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/apexcharts/3.44.0/apexcharts.min.js"></script>

    <!-- ================== CENTRALIZED CONTEXT SYSTEM ================== -->
    <?php
        // Context injector already required above
    ?>
    <!-- Include JS configuration module -->
    <script src="js/config.js"></script>
    <!-- ==================================================================== -->
</head>
<body>
    <!-- Dynamic Header using same system as other pages -->
    <div id="header-container"></div>



    <!-- Main Content -->
    <main class="container-fluid my-4">
        <!-- Page Header -->
        <div class="text-center mb-4">
            <h1 class="mb-2">MY QUOTE HISTORY</h1>
            <h2 class="mb-3" style="color: var(--grammer-blue);">Personal Request Tracking</h2>
            <div class="grammer-badge d-inline-flex align-items-center px-3 py-2 rounded-pill" 
                 style="background: linear-gradient(135deg, var(--grammer-blue), var(--grammer-light-blue)); color: white;">
                <i class="fas fa-user-shield me-2"></i>
                Personal Dashboard
            </div>
        </div>

        <!-- User Info & Quick Actions -->
        <div class="row mb-4">
            <div class="col-12">
                <div class="grammer-card">
                    <div class="grammer-card-header">
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="d-flex align-items-center">
                                <div class="user-avatar me-3">
                                    <i class="fas fa-user-circle fa-2x text-grammer-primary"></i>
                                </div>
                                <div>
                                    <h5 class="text-grammer-primary mb-0" id="currentUserName">Loading...</h5>
                                    <small class="text-muted" id="currentUserInfo">Personal Quote History</small>
                                </div>
                            </div>
                            <div class="header-actions">
                                <button class="btn btn-outline-grammer-primary btn-sm me-2" id="refreshDataBtn">
                                    <i class="fas fa-sync-alt me-1"></i>
                                    Refresh
                                </button>
                                <a href="index.php" class="btn btn-grammer-success btn-sm">
                                    <i class="fas fa-plus me-1"></i>
                                    New Request
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Filters -->
        <div class="row mb-4">
            <div class="col-12">
                <div class="grammer-card">
                    <div class="grammer-card-header">
                        <h6 class="text-grammer-primary mb-0">
                            <i class="fas fa-filter me-2"></i>
                            Filter Your Requests
                        </h6>
                    </div>
                    <div class="card-body">
                        <div class="row align-items-end">
                            <div class="col-md-2">
                                <label for="statusFilter" class="form-label fw-bold text-grammer-primary">Status</label>
                                <select class="form-select form-control-custom" id="statusFilter">
                                    <option value="">All Statuses</option>
                                    <option value="pending">Pending</option>
                                    <option value="quoting">Quoting</option>
                                    <option value="completed">Completed</option>
                                    <option value="canceled">Canceled</option>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <label for="methodFilter" class="form-label fw-bold text-grammer-primary">Method</label>
                                <select class="form-select form-control-custom" id="methodFilter">
                                    <option value="">All Methods</option>
                                    <option value="fedex">Fedex Express</option>
                                    <option value="aereo_maritimo">Air-Sea</option>
                                    <option value="nacional">Domestic</option>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <label for="serviceFilter" class="form-label fw-bold text-grammer-primary">Service</label>
                                <select class="form-select form-control-custom" id="serviceFilter">
                                    <option value="">All Services</option>
                                    <option value="air">Air</option>
                                    <option value="sea">Sea</option>
                                    <option value="land">Land</option>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <label for="quotesFilter" class="form-label fw-bold text-grammer-primary">Quotes</label>
                                <select class="form-select form-control-custom" id="quotesFilter">
                                    <option value="">All Requests</option>
                                    <option value="true">With Quotes</option>
                                    <option value="false">No Quotes Yet</option>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <label for="dateFrom" class="form-label fw-bold text-grammer-primary">From</label>
                                <input type="date" class="form-control form-control-custom" id="dateFrom">
                            </div>
                            <div class="col-md-2">
                                <button class="btn btn-grammer-primary w-100" id="applyFiltersBtn">
                                    <i class="fas fa-search me-1"></i>
                                    Search
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Personal Statistics -->
        <div class="row mb-4" id="personalStats">
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="stat-card stat-card-primary">
                    <div class="stat-content">
                        <div class="stat-number" id="totalUserRequests">-</div>
                        <div class="stat-label">Total Requests</div>
                        <div class="stat-icon">
                            <i class="fas fa-clipboard-list"></i>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="stat-card stat-card-warning">
                    <div class="stat-content">
                        <div class="stat-number" id="pendingUserRequests">-</div>
                        <div class="stat-label">Pending/Quoting</div>
                        <div class="stat-icon">
                            <i class="fas fa-hourglass-half"></i>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="stat-card stat-card-success">
                    <div class="stat-content">
                        <div class="stat-number" id="completedUserRequests">-</div>
                        <div class="stat-label">Completed</div>
                        <div class="stat-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="stat-card stat-card-info">
                    <div class="stat-content">
                        <div class="stat-number" id="totalQuotesReceived">-</div>
                        <div class="stat-label">Quotes Received</div>
                        <div class="stat-icon">
                            <i class="fas fa-calculator"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Main Content Area -->
        <div class="row">
            <!-- Requests List -->
            <div class="col-lg-8">
                <div class="grammer-card">
                    <div class="grammer-card-header d-flex justify-content-between align-items-center">
                        <h6 class="text-grammer-primary mb-0">
                            <i class="fas fa-list-ul me-2"></i>
                            My Quote Requests
                        </h6>
                        <div class="d-flex align-items-center">
                            <span class="grammer-badge me-2" id="requestsCount">0 requests</span>
                            <div class="auto-refresh-indicator bg-grammer-accent text-white px-2 py-1 rounded" id="lastUpdated">
                                <i class="fas fa-clock"></i>
                                <small>Never updated</small>
                            </div>
                        </div>
                    </div>
                    <div class="card-body p-0">
                        <!-- Requests will be loaded here -->
                        <div id="requestsList">
                            <!-- Loading State -->
                            <div class="text-center py-5" id="loadingState">
                                <div class="spinner-border text-grammer-primary" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                <p class="mt-3 text-grammer-primary">Loading your quote history...</p>
                            </div>
                            
                            <!-- Empty State -->
                            <div class="text-center py-5 d-none" id="emptyState">
                                <i class="fas fa-inbox fa-3x text-grammer-accent mb-3"></i>
                                <h5 class="text-grammer-primary">No requests found</h5>
                                <p class="text-muted">You haven't made any quote requests yet, or no requests match your filters.</p>
                                <a href="index.php" class="btn btn-grammer-primary">
                                    <i class="fas fa-plus me-1"></i>
                                    Create Your First Request
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Side Panel -->
            <div class="col-lg-4">
                <!-- Personal Activity Chart -->
                <div class="grammer-card mb-4">
                    <div class="grammer-card-header">
                        <h6 class="text-grammer-primary mb-0">
                            <i class="fas fa-chart-area me-2"></i>
                            My Activity (Last 12 Months)
                        </h6>
                    </div>
                    <div class="card-body">
                        <div id="personalActivityChart" style="height: 200px;"></div>
                    </div>
                </div>

                <!-- Method Distribution -->
                <div class="grammer-card mb-4">
                    <div class="grammer-card-header">
                        <h6 class="text-grammer-primary mb-0">
                            <i class="fas fa-chart-pie me-2"></i>
                            My Preferred Methods
                        </h6>
                    </div>
                    <div class="card-body">
                        <div id="methodDistributionChart" style="height: 250px;"></div>
                    </div>
                </div>

                <!-- Quote Insights -->
                <div class="grammer-card">
                    <div class="grammer-card-header">
                        <h6 class="text-grammer-primary mb-0">
                            <i class="fas fa-lightbulb me-2"></i>
                            Quote Insights
                        </h6>
                    </div>
                    <div class="card-body">
                        <div id="quoteInsights">
                            <div class="insight-item mb-3">
                                <div class="d-flex justify-content-between">
                                    <span class="text-muted">Avg. Quotes per Request:</span>
                                    <strong class="text-grammer-primary" id="avgQuotesPerRequest">-</strong>
                                </div>
                            </div>
                            <div class="insight-item mb-3">
                                <div class="d-flex justify-content-between">
                                    <span class="text-muted">Avg. Quote Cost:</span>
                                    <strong class="text-grammer-primary" id="avgQuoteCost">-</strong>
                                </div>
                            </div>
                            <div class="insight-item mb-3">
                                <div class="d-flex justify-content-between">
                                    <span class="text-muted">Avg. Response Time:</span>
                                    <strong class="text-grammer-primary" id="avgResponseTime">-</strong>
                                </div>
                            </div>
                            <div class="insight-item">
                                <div class="d-flex justify-content-between">
                                    <span class="text-muted">Success Rate:</span>
                                    <strong class="text-grammer-success" id="successRate">-</strong>
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

    <!-- Request Details Modal -->
    <div class="modal fade" id="requestDetailsModal" tabindex="-1">
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <div class="modal-header bg-grammer-gradient text-white">
                    <h5 class="modal-title">
                        <i class="fas fa-eye me-2"></i>
                        Request Details
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body" id="requestDetailsContent">
                    <!-- Content will be loaded dynamically -->
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Quotes Modal -->
    <div class="modal fade" id="quotesModal" tabindex="-1">
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <div class="modal-header bg-grammer-gradient text-white">
                    <h5 class="modal-title">
                        <i class="fas fa-calculator me-2"></i>
                        Received Quotes
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body" id="quotesModalContent">
                    <!-- Content will be loaded dynamically -->
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Scripts in same order as other files -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/limonte-sweetalert2/11.10.1/sweetalert2.all.min.js"></script>

    <!-- Local Scripts -->
    <script src="js/config.js"></script>
    <script src="js/header.js" type="module"></script>
    <script src="cotizaciones/js/config.js"></script>
    <script type="module" src="cotizaciones/js/myQuotes.js"></script>
</body>
</html>