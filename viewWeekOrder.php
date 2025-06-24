<?php
/**
 * viewWeekOrder.php - Weekly Orders Viewer
 * Solo usuarios autenticados pueden acceder (igual que view_order.php)
 */

require_once 'dao/users/auth_check.php';

// Get user session data from auth_check
$userId = $user_id;
$userName = $user_name;
$userEmail = $_SESSION['user']['email'] ?? '';
$userRole = $_SESSION['user']['role'] ?? '';
$userPlant = $user_plant;
$authorizationLevel = $auth_level;

// Define base URLs
$URLBASE = "https://grammermx.com/Jesus/PruebaDos/";
$URLM = "https://grammermx.com/Mailer/PFMailer/";
$URLPF = "https://grammermx.com/PremiumFreight/";

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Premium Freight - Weekly Orders</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Bootstrap, FontAwesome, SweetAlert2 -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <!-- Estilos personalizados -->
    <link rel="stylesheet" href="viewWeekorder.css">
    <script>
        window.PF_WEEK_CONFIG = {
            userId: <?php echo $userId; ?>,
            userName: '<?php echo addslashes($userName); ?>',
            userEmail: '<?php echo addslashes($userEmail); ?>',
            userRole: '<?php echo addslashes($userRole); ?>',
            userPlant: '<?php echo addslashes($userPlant); ?>',
            authorizationLevel: <?php echo $authorizationLevel; ?>,
            urls: {
                base: '<?php echo $URLBASE; ?>',
                mailer: '<?php echo $URLM; ?>',
                pf: '<?php echo $URLPF; ?>'
            }
        };
    </script>
</head>
<body>
    <div class="container my-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h1 class="h3 mb-0"><i class="fas fa-truck-fast"></i> Premium Freight - Weekly Orders</h1>
                <small class="text-muted">User: <?php echo htmlspecialchars($userName); ?></small>
            </div>
            <div>
                <button id="download-all-btn" class="btn btn-primary"><i class="fas fa-download"></i> Download All</button>
            </div>
        </div>
        <!-- Filtros (igual que view_order.php) -->
        <form class="row g-3 mb-4" id="filters-form">
            <div class="col-md-3">
                <input type="text" class="form-control" id="filter-order" placeholder="Order ID">
            </div>
            <div class="col-md-3">
                <input type="text" class="form-control" id="filter-creator" placeholder="Creator">
            </div>
            <div class="col-md-3">
                <input type="date" class="form-control" id="filter-date" placeholder="Date">
            </div>
            <div class="col-md-3">
                <button type="button" class="btn btn-outline-secondary w-100" id="apply-filters"><i class="fas fa-filter"></i> Apply Filters</button>
            </div>
        </form>
        <div id="orders-list" class="row g-4">
            <!-- Las órdenes se renderizan por JS -->
        </div>
    </div>
    <script src="viewWeekorder.js"></script>
</body>
</html>