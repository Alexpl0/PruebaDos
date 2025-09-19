<?php
/**
 * total-orders-history.php - View for the complete history of all orders (Refactored)
 * This version uses the centralized context injection system.
 */

// 1. Incluir el sistema de autenticación.
// auth_check.php también inicia la sesión y redirige si no hay usuario.
require_once 'dao/users/auth_check.php';

// 2. Incluir el inyector de contexto desde su ubicación central.
// Este script crea la variable $appContextForJS e imprime el objeto `window.APP_CONTEXT`.
require_once 'dao/users/context_injector.php';
?>
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
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" xintegrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
    
    <!-- Local CSS files -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/dataTables.css">
    <link rel="stylesheet" href="css/tour-styles.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/driver.js@1.0.1/dist/driver.css"/>

    <!-- DataTables CSS -->
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/1.11.5/css/jquery.dataTables.min.css">
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/buttons/2.2.2/css/buttons.dataTables.min.css">
    
    <!-- ================== SISTEMA DE CONTEXTO CENTRALIZADO ================== -->
    <?php
        // El inyector ya fue requerido en la parte superior del script.
    ?>
    <!-- Incluir el módulo de configuración JS. -->
    <script src="js/config.js"></script>
    <!-- ==================================================================== -->

    <?php 
    // Carga condicional del CSS del asistente, usando la variable del inyector.
    if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <link rel="stylesheet" href="css/assistant.css">
    <?php endif; ?>
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
                    <button class="btn btn-back" onclick="window.location.href='orders.php'">
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
                                <select class="form-select" id="filterDate">
                                    <option value="all">All</option>
                                    <option value="week">Week</option>
                                    <option value="month">Month</option>
                                    <option value="four-month">Four-Month Period</option>
                                    <option value="semester">Semester</option>
                                    <option value="year">Year</option>
                                    <option value="5-year">5 Year</option>
                                    <option value="10-year">10 Year</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label for="filterPlant" class="form-label">Plant</label>
                                <select class="form-select" id="filterPlant">
                                    <option value="all">All Plants</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label for="filterApprovalStatus" class="form-label">Approval Status</label>
                                <select class="form-select" id="filterApprovalStatus">
                                    <option value="all">All</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label for="filterCostRange" class="form-label">Cost Range (€)</label>
                                <select class="form-select" id="filterCostRange">
                                    <option value="all">All</option>
                                    <option value="<1500">< 1500€</option>
                                    <option value="1501-5000">1501 - 5000€</option>
                                    <option value="5001-10000">5001 - 10000€</option>
                                    <option value=">10000">> 10000€</option>
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
                                        <th>Recovery</th>
                                        <th>Reference</th>
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
                                        <th>Status</th>
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

    <!-- Driver.js for guided tours -->
    <script src="https://cdn.jsdelivr.net/npm/driver.js@latest/dist/driver.js.iife.js"></script>

    <!-- Custom scripts -->
    <script type="module" src="js/dataTables.js"></script>
    <script type="module" src="js/totalHistoryPage.js"></script>
    
    <?php 
    // Carga condicional del JS del asistente.
    if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <script src="js/assistant.js"></script>
    <?php endif; ?>
</body>
</html>
