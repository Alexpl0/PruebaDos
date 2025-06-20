<?php
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
    const URLPF = '<?php echo URLPF; ?>'; 
    const URLM = '<?php echo URLM; ?>';
</script>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"> 
    <meta name="viewport" content="width=device-width, initial-scale=1.0"> 
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    <title>Total Orders History - Premium Freight</title>
    
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
                    <h1 class="history-title">Total Orders History</h1>
                    <p class="history-subtitle">Complete Premium Freight Historical Report</p>
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
        <!-- Estadísticas rápidas -->
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card text-center stats-card">
                    <div class="card-body">
                        <h5 class="card-title text-primary">
                            <i class="fas fa-clipboard-list me-2"></i>Total Orders
                        </h5>
                        <h3 class="card-text" id="totalOrdersCount">-</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center stats-card">
                    <div class="card-body">
                        <h5 class="card-title text-success">
                            <i class="fas fa-check-circle me-2"></i>Approved
                        </h5>
                        <h3 class="card-text" id="approvedOrdersCount">-</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center stats-card">
                    <div class="card-body">
                        <h5 class="card-title text-warning">
                            <i class="fas fa-clock me-2"></i>Pending
                        </h5>
                        <h3 class="card-text" id="pendingOrdersCount">-</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center stats-card">
                    <div class="card-body">
                        <h5 class="card-title text-danger">
                            <i class="fas fa-times-circle me-2"></i>Rejected
                        </h5>
                        <h3 class="card-text" id="rejectedOrdersCount">-</h3>
                    </div>
                </div>
            </div>
        </div>

        <!-- Filtros actualizados -->
        <div class="row mb-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h6 class="mb-0">
                            <i class="fas fa-filter me-2"></i>Filters
                            <button class="btn btn-sm btn-outline-secondary float-end" id="toggleFilters">
                                <i class="fas fa-chevron-down"></i>
                            </button>
                        </h6>
                    </div>
                    <div class="card-body" id="filterPanelBody" style="display: none;">
                        <div class="row g-3">
                            <div class="col-md-3">
                                <label for="filterDate" class="form-label">Date</label>
                                <input type="date" class="form-control" id="filterDate">
                            </div>
                            <div class="col-md-3">
                                <label for="filterPlant" class="form-label">Plant</label>
                                <select class="form-select" id="filterPlant">
                                    <option value="all">All Plants</option>
                                    <option value="Querétaro">Querétaro</option>
                                    <option value="Puebla">Puebla</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label for="filterApprovalStatus" class="form-label">Approval Status</label>
                                <select class="form-select" id="filterApprovalStatus">
                                    <option value="all">All</option>
                                    <option value="approved">Approved</option>
                                    <option value="pending">Pending</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label for="filterCostRange" class="form-label">Cost Range (€)</label>
                                <select class="form-select" id="filterCostRange">
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
                                <button class="btn btn-primary btn-sm me-2" id="applyFilters">
                                    <i class="fas fa-check"></i> Apply Filters
                                </button>
                                <button class="btn btn-outline-secondary btn-sm" id="clearFilters">
                                    <i class="fas fa-times"></i> Clear Filters
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tabla de histórico total -->
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-body">
                        <div class="table-responsive">
                            <table id="totalHistoryTable" class="table table-striped table-bordered" style="width:100%">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Plant Name</th>
                                        <th>Plant Code</th>
                                        <th>Issue Date</th>
                                        <th>Inbound/Outbound</th>
                                        <th>Reference Number</th>
                                        <th>Creator</th>
                                        <th>Area</th>
                                        <th>Description</th>
                                        <th>Category Cause</th>
                                        <th>Cost [€]</th>
                                        <th>Transport</th>
                                        <th>Carrier</th>
                                        <th>Origin Company</th>
                                        <th>Origin City</th>
                                        <th>Destination Company</th>
                                        <th>Destination City</th>
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
    <script src="js/totalHistoryPage.js"></script>
</body>
</html>