<?php
session_start();
require_once 'config.php'; // Include config.php to get URL constant
// Check if user is logged in
if (!isset($_SESSION['user'])) {
    header('Location: index.php');
    exit;
}
$user = $_SESSION['user'];
include_once 'dao/users/auth_check.php';
?>
<script>
    window.authorizationLevel = <?php echo json_encode(isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null); ?>;
    window.userName = <?php echo json_encode(isset($_SESSION['user']['name']) ? $_SESSION['user']['name'] : null); ?>;
    window.userID = <?php echo json_encode(isset($_SESSION['user']['id']) ? $_SESSION['user']['id'] : null); ?>;
    // Definimos la variable global de JavaScript con la URL base desde PHP
    const URLPF = '<?php echo URLPF; ?>'; 
    // Agregar esta línea para el mailer
    const URLM = '<?php echo URLM; ?>'; 
</script>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Profile - Premium Freight</title>
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">

    <!-- ================== SCRIPTS DE TERCEROS ================== -->
    <!-- Enlace al CDN de Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  
    <!-- Bootstrap 5 -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">

    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

    <!-- Archivos CSS locales -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/profile.css">
</head>
<body>
    <!-- Header -->
    <?php include 'includes/header.php'; ?>

    <!-- Main Content -->
    <div class="container-fluid px-4">
        <div class="row">
            <div class="col-12">
                <div class="d-sm-flex align-items-center justify-content-between mb-4">
                    <h1 class="h3 mb-0 text-gray-800">
                        <i class="fas fa-user-circle me-2"></i>My Profile
                    </h1>
                </div>
            </div>
        </div>

        <div class="row">
            <!-- Profile Information Card -->
            <div class="col-xl-8 col-lg-7">
                <div class="card shadow mb-4">
                    <div class="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                        <h6 class="m-0 font-weight-bold text-primary">
                            <i class="fas fa-user-edit me-2"></i>Profile Information
                        </h6>
                    </div>
                    <div class="card-body">
                        <form id="profile-form">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="username" class="form-label">
                                            <i class="fas fa-user me-2"></i>Full Name
                                        </label>
                                        <input type="text" class="form-control" id="username" 
                                               value="<?php echo htmlspecialchars($user['name']); ?>" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="email" class="form-label">
                                            <i class="fas fa-envelope me-2"></i>Email Address
                                        </label>
                                        <input type="email" class="form-control" id="email" 
                                               value="<?php echo htmlspecialchars($user['email']); ?>" readonly>
                                        <small class="text-muted">Email cannot be changed</small>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="plant" class="form-label">
                                            <i class="fas fa-building me-2"></i>Plant
                                        </label>
                                        <input type="text" class="form-control" id="plant" 
                                               value="<?php echo htmlspecialchars($user['plant'] ?? 'N/A'); ?>" readonly>
                                        <small class="text-muted">Contact administrator to change plant</small>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="role" class="form-label">
                                            <i class="fas fa-user-tag me-2"></i>Role
                                        </label>
                                        <input type="text" class="form-control" id="role" 
                                               value="<?php echo htmlspecialchars($user['role'] ?? 'User'); ?>" readonly>
                                    </div>
                                </div>
                            </div>

                            <hr class="my-4">
                            <h6 class="text-primary mb-3">
                                <i class="fas fa-key me-2"></i>Change Password (Optional)
                            </h6>
                            
                            <div class="row">
                                <div class="col-md-12">
                                    <div class="mb-3">
                                        <label for="current-password" class="form-label">Current Password</label>
                                        <div class="input-group">
                                            <input type="password" class="form-control" id="current-password" 
                                                   placeholder="Enter current password to change it">
                                            <button class="btn btn-outline-secondary toggle-password" type="button" data-target="current-password">
                                                <i class="fas fa-eye-slash"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="new-password" class="form-label">New Password</label>
                                        <div class="input-group">
                                            <input type="password" class="form-control" id="new-password" 
                                                   placeholder="Enter new password">
                                            <button class="btn btn-outline-secondary toggle-password" type="button" data-target="new-password">
                                                <i class="fas fa-eye-slash"></i>
                                            </button>
                                        </div>
                                        <!-- NUEVO: Indicador de fortaleza -->
                                        <div id="password-strength-indicator" class="mt-2"></div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="confirm-password" class="form-label">Confirm New Password</label>
                                        <div class="input-group">
                                            <input type="password" class="form-control" id="confirm-password" 
                                                   placeholder="Confirm new password">
                                            <button class="btn btn-outline-secondary toggle-password" type="button" data-target="confirm-password">
                                                <i class="fas fa-eye-slash"></i>
                                            </button>
                                        </div>
                                        <!-- NUEVO: Feedback de coincidencia -->
                                        <div id="password-feedback" class="mt-2"></div>
                                    </div>
                                </div>
                            </div>

                            <div class="text-end">
                                <button type="button" id="update-profile" class="btn btn-primary">
                                    <i class="fas fa-save me-2"></i>Update Profile
                                </button>
                            </div>
                            
                            <!-- NUEVO: Indicador de seguridad -->
                            <div class="text-center mt-3">
                                <small class="text-muted">
                                    <i class="fas fa-shield-alt text-success"></i>
                                    Password changes are encrypted automatically
                                </small>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- User Statistics Card -->
            <div class="col-xl-4 col-lg-5">
                <div class="card shadow mb-4">
                    <div class="card-header py-3">
                        <h6 class="m-0 font-weight-bold text-primary">
                            <i class="fas fa-chart-bar me-2"></i>Your Statistics
                        </h6>
                    </div>
                    <div class="card-body">
                        <div class="row text-center">
                            <div class="col-md-12 mb-3">
                                <div class="stat-item">
                                    <div class="stat-number text-success" id="orders-created">Loading...</div>
                                    <div class="stat-label">Orders Created</div>
                                </div>
                            </div>
                            <div class="col-md-6 mb-3">
                                <div class="stat-item">
                                    <div class="stat-number text-primary" id="orders-approved">Loading...</div>
                                    <div class="stat-label">Approved</div>
                                </div>
                            </div>
                            <div class="col-md-6 mb-3">
                                <div class="stat-item">
                                    <div class="stat-number text-danger" id="orders-rejected">Loading...</div>
                                    <div class="stat-label">Rejected</div>
                                </div>
                            </div>
                        </div>
                        
                        <hr>
                        
                        <!-- Account Information -->
                        <div class="account-info">
                            <h6 class="text-primary mb-3">Account Information</h6>
                            <div class="info-item mb-2">
                                <i class="fas fa-user-shield text-primary me-2"></i>
                                <strong>Authorization Level:</strong> <?php echo htmlspecialchars($user['authorization_level']); ?>
                            </div>
                            <div class="info-item mb-2">
                                <i class="fas fa-calendar text-primary me-2"></i>
                                <strong>Member Since:</strong> <?php echo date('M Y'); ?>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-shield-alt text-success me-2"></i>
                                <strong>Security:</strong> Password Encrypted ✓
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <?php include 'includes/footer.php'; ?>

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="js/utils.js" type="module"></script>
    <!-- NUEVO: Cargar PasswordManager -->
    <script src="js/PasswordManager.js"></script>
    <script src="js/profile.js"></script>
</body>
</html>