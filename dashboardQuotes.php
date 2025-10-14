<?php
/**
 * dashboardQuotes.php - GRAMMER Logistics Dashboard
 * Updated filters to match database schema
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
    <title>GRAMMER Logistics Dashboard - Intelligent Quotation Portal</title>

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
    <link rel="stylesheet" href="cotizaciones/css/dashboard.css">
    <link rel="stylesheet" href="cotizaciones/css/quotes.css">
    <link rel="stylesheet" href="css/tour-styles.css">

    <!-- ApexCharts -->
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
    <!-- Dynamic Header using same system as quotes.php -->
    <div id="header-container"></div>

    <!-- Main Content -->
    <main class="app-main-content">
        <div class="container-fluid">
            <!-- Page Title -->
            <div class="text-center mb-4">
                <h1 class="mb-2">GRAMMER LOGISTICS & TRAFFIC</h1>
                <h2 class="mb-3" style="color: var(--grammer-blue);">Intelligent Dashboard Portal</h2>
                <div class="grammer-badge d-inline-flex align-items-center px-3 py-2 rounded-pill" 
                     style="background: linear-gradient(135deg, var(--grammer-blue), var(--grammer-light-blue)); color: white;">
                    <i class="fas fa-shield-alt me-2"></i>
                    Secure System
                </div>
            </div>

            <!-- Filters and Controls -->
            <div class="row mb-4">
                <div class="col-12">
                    <div class="grammer-card">
                        <div class="grammer-card-header">
                            <h5 class="text-grammer-primary mb-0">
                                <i class="fas fa-filter me-2"></i>
                                Control Center
                            </h5>
                        </div>
                        <div class="card-body">
                            <div class="row align-items-end">
                                <div class="col-md-3">
                                    <label for="statusFilter" class="form-label fw-bold text-grammer-primary">Status</label>
                                    <select class="form-select form-control-custom" id="statusFilter">
                                        <option value="">All statuses</option>
                                        <option value="pending">Pending</option>
                                        <option value="in_process">In Process</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label for="serviceFilter" class="form-label fw-bold text-grammer-primary">Shipping Method</label>
                                    <select class="form-select form-control-custom" id="serviceFilter">
                                        <option value="">All methods</option>
                                        <option value="fedex">Fedex Express</option>
                                        <option value="aereo_maritimo">Air-Sea</option>
                                        <option value="nacional">Domestic</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label for="dateFrom" class="form-label fw-bold text-grammer-primary">From</label>
                                    <input type="date" class="form-control form-control-custom" id="dateFrom">
                                </div>
                                <div class="col-md-2">
                                    <label for="dateTo" class="form-label fw-bold text-grammer-primary">To</label>
                                    <input type="date" class="form-control form-control-custom" id="dateTo">
                                </div>
                                <div class="col-md-2">
                                    <button class="btn btn-grammer-primary w-100" id="applyFiltersBtn">
                                        <i class="fas fa-filter me-1"></i>
                                        Filter
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Quick Stats GRAMMER -->
            <div class="row mb-4" id="statsCards">
                <div class="col-md-3">
                    <div class="grammer-stats-card p-3 text-center">
                        <div class="stat-item">
                            <div class="stat-number text-grammer-primary" id="totalRequests">-</div>
                            <div class="stat-label">Total Requests</div>
                        </div>
                        <div class="text-grammer-accent mt-2">
                            <i class="fas fa-clipboard-list fa-2x"></i>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="grammer-stats-card p-3 text-center">
                        <div class="stat-item">
                            <div class="stat-number text-warning" id="pendingRequests">-</div>
                            <div class="stat-label">In Progress</div>
                        </div>
                        <div class="text-warning mt-2">
                            <i class="fas fa-clock fa-2x"></i>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="grammer-stats-card p-3 text-center">
                        <div class="stat-item">
                            <div class="stat-number text-grammer-success" id="completedRequests">-</div>
                            <div class="stat-label">Completed</div>
                        </div>
                        <div class="text-grammer-success mt-2">
                            <i class="fas fa-check-circle fa-2x"></i>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="grammer-stats-card p-3 text-center">
                        <div class="stat-item">
                            <div class="stat-number text-grammer-accent" id="completionRate">-</div>
                            <div class="stat-label">Success Rate</div>
                        </div>
                        <div class="text-grammer-accent mt-2">
                            <i class="fas fa-percentage fa-2x"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Content -->
            <div class="row">
                <!-- Requests List -->
                <div class="col-lg-8">
                    <div class="grammer-card">
                        <div class="grammer-card-header d-flex justify-content-between align-items-center">
                            <h5 class="text-grammer-primary mb-0">
                                <i class="fas fa-list me-2"></i>
                                Quotation Requests
                            </h5>
                            <div class="d-flex align-items-center">
                                <span class="grammer-badge me-2" id="requestsCount">0 requests</span>
                                <button class="btn btn-sm btn-outline-grammer-primary me-2" id="refreshBtn">
                                    <i class="fas fa-sync-alt me-1"></i>
                                    Refresh
                                </button>
                                <div class="auto-refresh-indicator bg-grammer-success text-white px-2 py-1 rounded" id="autoRefreshIndicator">
                                    <i class="fas fa-wifi"></i>
                                    <small>Auto-refresh active</small>
                                </div>
                            </div>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-hover mb-0" id="requestsTable">
                                    <thead class="bg-grammer-primary text-white">
                                        <tr>
                                            <th>ID</th>
                                            <th>User</th>
                                            <th>Route</th>
                                            <th>Method</th>
                                            <th>Status</th>
                                            <th>Quotes</th>
                                            <th>Date</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="requestsTableBody">
                                        <!-- Rows will be filled dynamically -->
                                    </tbody>
                                </table>
                            </div>
                            
                            <!-- Loading State -->
                            <div class="text-center py-5 d-none" id="loadingState">
                                <div class="spinner-border text-grammer-primary" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                <p class="mt-3 text-grammer-primary">Loading requests...</p>
                            </div>
                            
                            <!-- Empty State -->
                            <div class="text-center py-5 d-none" id="emptyState">
                                <i class="fas fa-inbox fa-3x text-grammer-accent mb-3"></i>
                                <h5 class="text-grammer-primary">No requests found</h5>
                                <p class="text-muted">No requests match the applied filters.</p>
                                <a href="index.php" class="btn btn-grammer-primary">
                                    <i class="fas fa-plus me-1"></i>
                                    Create New Request
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Side Panel -->
                <div class="col-lg-4">
                    <!-- Recent Activity -->
                    <div class="grammer-card mb-4">
                        <div class="grammer-card-header">
                            <h6 class="text-grammer-primary mb-0">
                                <i class="fas fa-chart-bar me-2"></i>
                                Recent Activity
                            </h6>
                        </div>
                        <div class="card-body">
                            <div id="activityChart" style="height: 200px;"></div>
                        </div>
                    </div>

                    <!-- Top Users -->
                    <div class="grammer-card mb-4">
                        <div class="grammer-card-header">
                            <h6 class="text-grammer-primary mb-0">
                                <i class="fas fa-users me-2"></i>
                                Most Active Users
                            </h6>
                        </div>
                        <div class="card-body p-0">
                            <div id="topUsersList">
                                <!-- Will be filled dynamically -->
                            </div>
                        </div>
                    </div>

                    <!-- Service Distribution -->
                    <div class="grammer-card">
                        <div class="grammer-card-header">
                            <h6 class="text-grammer-primary mb-0">
                                <i class="fas fa-chart-pie me-2"></i>
                                Shipping Methods
                            </h6>
                        </div>
                        <div class="card-body">
                            <div id="servicesChart" style="height: 300px;"></div>
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
                        GRAMMER Request Details
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
                        Received Quotes - GRAMMER
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
    <script src="cotizaciones/config.js"></script>
    <script type="module" src="cotizaciones/js/dashboard.js"></script>
</body>
</html>