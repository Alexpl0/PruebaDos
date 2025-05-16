<?php
session_start();
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
</script>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Profile - Premium Freight</title>

    <!-- ================== SCRIPTS DE TERCEROS ================== -->
    <!-- Google Material Symbols (iconos) -->
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
    
    <!-- Bootstrap 5 -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">

    <!-- SweetAlert2 -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">

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
                    <span class="material-symbols-outlined avatar-icon" style="font-size: 4rem;">account_circle</span>
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
                        <input type="email" id="email" value="<?php echo htmlspecialchars($user['email']); ?>" readonly>
                    </div>
                    
                    <div class="mb-3">
                        <label for="username" class="form-label">Name</label>
                        <input type="text" id="username" value="<?php echo htmlspecialchars($user['name']); ?>">
                    </div>
                    
                    <div class="mb-3">
                        <label for="current-password" class="form-label">Current Password</label>
                        <div class="input-group">
                            <input type="password" id="current-password">
                            <button type="button" class="toggle-password" data-target="current-password">
                                <span class="material-symbols-outlined">visibility_off</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="new-password" class="form-label">New Password</label>
                        <div class="input-group">
                            <input type="password" id="new-password">
                            <button class="btn btn-outline-secondary toggle-password" type="button" data-target="new-password">
                                <span class="material-symbols-outlined">visibility_off</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="confirm-password" class="form-label">Confirm New Password</label>
                        <div class="input-group">
                            <input type="password" id="confirm-password">
                            <button class="btn btn-outline-secondary toggle-password" type="button" data-target="confirm-password">
                                <span class="material-symbols-outlined">visibility_off</span>
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
            </div>
        </div>
    </main>

    <footer class="text-center py-3">
        <p>© 2025 Grammer. All rights reserved.</p>
    </footer>

    <!-- Scripts -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="js/header.js"></script>
    <script src="js/profile.js"></script>
</body>
</html>