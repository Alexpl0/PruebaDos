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
    const URL = '<?php echo URL; ?>'; 
</script>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Profile - Premium Freight</title>

    <!-- ================== SCRIPTS DE TERCEROS ================== -->
    <!-- Enlace al CDN de Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  
    <!-- Bootstrap 5 -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">

    <!-- SweetAlert2 -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

    <!-- ================== CSS LOCAL ================== -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/profile.css">
</head>
<body>
    <div id="header-container"></div>
    <main class="container my-4">
        <div class="profile-container">
            <div class="profile-header">
                <div class="avatar-container">
                    <i class="fas fa-user-circle avatar-icon"></i>
                </div>
                <div class="user-info">
                    <h2><?php echo htmlspecialchars($user['name']); ?></h2>
                    <span class="badge bg-primary"><?php echo htmlspecialchars($user['role']); ?></span>
                    <span class="badge bg-secondary">Auth Level: <?php echo htmlspecialchars($user['authorization_level']); ?></span>
                </div>
            </div>
            
            <div class="profile-body">
                <form id="profile-form">
                    <div class="mb-3">
                        <label for="email" class="form-label">Email Address</label>
                        <input type="email" id="email" value="<?php echo htmlspecialchars($user['email']); ?>" readonly class="form-control">
                    </div>
                    
                    <div class="mb-3">
                        <label for="username" class="form-label">Name</label>
                        <input type="text" id="username" value="<?php echo htmlspecialchars($user['name']); ?>" class="form-control">
                    </div>
                    
                    <div class="mb-3">
                        <label for="current-password" class="form-label">Current Password</label>
                        <div class="input-group">
                            <input type="password" id="current-password" class="form-control">
                            <button type="button" class="btn btn-outline-secondary toggle-password" data-target="current-password">
                                <i class="fas fa-eye-slash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="new-password" class="form-label">New Password</label>
                        <div class="input-group">
                            <input type="password" id="new-password" class="form-control">
                            <button type="button" class="btn btn-outline-secondary toggle-password" data-target="new-password">
                                <i class="fas fa-eye-slash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="confirm-password" class="form-label">Confirm New Password</label>
                        <div class="input-group">
                            <input type="password" id="confirm-password" class="form-control">
                            <button type="button" class="btn btn-outline-secondary toggle-password" data-target="confirm-password">
                                <i class="fas fa-eye-slash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <button type="button" id="update-profile" class="btn btn-primary">Update Profile</button>
                </form>
            </div>
            
            <div class="profile-stats">
                <h3>Activity Summary</h3>
                <div class="stats-container">
                    <div class="stat-item">
                        <h4>Orders Created</h4>
                        <div id="orders-created">Loading...</div>
                    </div>
                    <div class="stat-item">
                        <h4>Orders Approved</h4>
                        <div id="orders-approved">Loading...</div>
                    </div>
                    <div class="stat-item">
                        <h4>Orders Rejected</h4>
                        <div id="orders-rejected">Loading...</div>
                    </div>
                </div>
                
                <div class="mt-3 text-center">
                    <a href="myorders.php" class="btn btn-outline-primary">
                        <i class="fas fa-list"></i> View My Orders
                    </a>
                </div>
            </div>
        </div>
    </main>

    <footer class="text-center py-3">
        <p>© 2025 Grammer. All rights reserved.</p>
    </footer>

    <!-- Scripts -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="js/header.js"></script>
    <script src="js/profile.js"></script>
</body>
</html>