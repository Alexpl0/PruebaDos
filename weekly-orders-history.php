<?php
// filepath: c:\Users\Ex-Perez-J\OneDrive - GRAMMER AG\Desktop\PruebaDos\weekly-orders-history.php
session_start();
require_once 'config.php'; // Include config.php to get URL constant
include_once 'dao/users/auth_check.php';
$nivel = isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null;
$name = isset($_SESSION['user']['name']) ? $_SESSION['user']['name'] : null;
$userID = isset($_SESSION['user']['id']) ? $_SESSION['user']['id'] : null;
$role = isset($_SESSION['user']['role']) ? $_SESSION['user']['role'] : null;
$plant = isset($_SESSION['user']['plant']) ? $_SESSION['user']['plant'] : null;
?>
<script>
    window.authorizationLevel = <?php echo json_encode($nivel); ?>;
    window.userName = <?php echo json_encode($name); ?>;
    window.userID = <?php echo json_encode($userID); ?>;
    window.role = <?php echo json_encode($role); ?>;
    window.userPlant = <?php echo json_encode($plant); ?>;
    // Definir variables globales de JavaScript con URLs base desde PHP
    const URLPF = '<?php echo URLPF; ?>'; 
    const URLM = '<?php echo URLM; ?>';
</script>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"> 
    <meta name="viewport" content="width=device-width, initial-scale=1.0"> 
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    <title>Weekly Orders History - Premium Freight</title>
    
    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
    
    <!-- Local CSS files -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/dataTables.css">

    <!-- DataTables CSS -->
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/1.11.5/css/jquery.dataTables.min.css">
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/buttons/2.2.2/css/buttons.dataTables.min.css">
</head>
<body>
    <div class="history-header">
        <div class="container">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <h1 class="history-title">Weekly Orders History</h1>
                    <p class="history-subtitle" id="weeklySubtitle">Premium Freight Weekly Report</p>
                </div>
                <div class="col-md-4 text-end">
                    <button class="btn btn-back" onclick="history.back()">
                        <i class="fas fa-arrow-left"></i> Back to Orders
                    </button>
                </div>
            </div>
        </div>
    </div>

    <main class="container-fluid">
        <!-- Navegación de semanas -->
        <div class="row mb-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-body">
                        <div class="week-navigation d-flex justify-content-between align-items-center">
                            <button class="btn btn-outline-primary" id="prevWeek">
                                <i class="fas fa-chevron-left"></i> Previous Week
                            </button>
                            <h5 class="mb-0" id="currentWeekDisplay">Current Week</h5>
                            <button class="btn btn-outline-primary" id="nextWeek">
                                Next Week <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Filtro semanal resumen -->
        <div class="row mb-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h6 class="mb-0">
                            <i class="fas fa-filter me-2"></i>Weekly Filters
                            <button class="btn btn-sm btn-outline-secondary float-end" id="toggleWeeklyFilters">
                                <i class="fas fa-chevron-down"></i>
                            </button>
                        </h6>
                    </div>
                    <div class="card-body" id="weeklyFilterPanelBody" style="display: none;">
                        <div class="row g-3">
                            <div class="col-md-3">
                                <label for="weeklyFilterDateRange" class="form-label">Date Range</label>
                                <select class="form-select" id="weeklyFilterDateRange">
                                    <option value="all">All Dates</option>
                                    <option value="today">Today</option>
                                    <option value="week">This Week</option>
                                    <option value="month">This Month</option>
                                    <option value="quarter">This Quarter</option>
                                    <option value="year">This Year</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label for="weeklyFilterStatus" class="form-label">Status</label>
                                <select class="form-select" id="weeklyFilterStatus">
                                    <option value="all">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label for="weeklyFilterApprovalStatus" class="form-label">Approval Status</label>
                                <select class="form-select" id="weeklyFilterApprovalStatus">
                                    <option value="all">All</option>
                                    <option value="approved">Approved</option>
                                    <option value="pending">Pending</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label for="weeklyFilterCostRange" class="form-label">Cost Range (€)</label>
                                <select class="form-select" id="weeklyFilterCostRange">
                                    <option value="all">All Costs</option>
                                    <option value="0-100">0 - 100€</option>
                                    <option value="100-500">100 - 500€</option>
                                    <option value="500-1000">500 - 1,000€</option>
                                    <option value="1000-5000">1,000 - 5,000€</option>
                                    <option value="5000+">5,000€+</option>
                                </select>
                            </div>
                        </div>
                        <div class="row mt-3">
                            <div class="col-12">
                                <button class="btn btn-primary btn-sm me-2" id="applyWeeklyFilters">
                                    <i class="fas fa-check"></i> Apply Filters
                                </button>
                                <button class="btn btn-outline-secondary btn-sm" id="clearWeeklyFilters">
                                    <i class="fas fa-times"></i> Clear Filters
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tabla de histórico semanal -->
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-body">
                        <div class="table-responsive">
                            <table id="weeklyHistoryTable" class="table table-striped table-bordered" style="width:100%">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Division</th>
                                        <th>Plant Code</th>
                                        <th>Plant Name</th>
                                        <th>Issue Date</th>
                                        <th>Inbound/Outbound</th>
                                        <th>Issue CW</th>
                                        <th>Issue Month</th>
                                        <th>Reference Number</th>
                                        <th>Creator</th>
                                        <th>Area</th>
                                        <th>Description</th>
                                        <th>Category Cause</th>
                                        <th>Cost [€]</th>
                                        <th>Transport</th>
                                        <th>Int/Ext</th>
                                        <th>Carrier</th>
                                        <th>Origin Company</th>
                                        <th>Origin City</th>
                                        <th>Destination Company</th>
                                        <th>Destination City</th>
                                        <th>Weight [kg]</th>
                                        <th>Project Status</th>
                                        <th>Approver</th>
                                        <th>Recovery</th>
                                        <th>Paid By</th>
                                        <th>Products</th>
                                        <th>Status</th>
                                        <th>Approval Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <!-- Los datos se cargarán dinámicamente aquí -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <footer class="text-center py-3">
        <p>© 2025 Grammer. All rights reserved.</p>
    </footer>

    <!-- PDF and Canvas Scripts -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
    
    <!-- jQuery and Bootstrap JS -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>

    <!-- DataTables JS -->
    <script type="text/javascript" src="https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js"></script>
    <script type="text/javascript" src="https://cdn.datatables.net/buttons/2.2.2/js/dataTables.buttons.min.js"></script>
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.3/jszip.min.js"></script>
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/pdfmake.min.js"></script>
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/vfs_fonts.js"></script>
    <script type="text/javascript" src="https://cdn.datatables.net/buttons/2.2.2/js/buttons.html5.min.js"></script>
    <script type="text/javascript" src="https://cdn.datatables.net/buttons/2.2.2/js/buttons.print.min.js"></script>

    <!-- Custom scripts -->
    <script src="js/dataTables.js"></script>
    <script src="js/weeklyHistoryPage.js"></script>
</body>
</html>