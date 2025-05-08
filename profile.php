<?php
session_start();
// Check if user is logged in
if (!isset($_SESSION['user'])) {
    header('Location: index.php');
    exit;
}
$user = $_SESSION['user'];
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Profile - Premium Freight</title>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script type="module" src="https://unpkg.com/ionicons@7.2.2/dist/ionicons/ionicons.esm.js"></script>
    <script nomodule src="https://unpkg.com/ionicons@7.2.2/dist/ionicons/ionicons.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/profile.css">
</head>
<body>
    <header class="header">
        <a href="#" class="header__logo">GRAMMER</a>
        <ion-icon name="menu-outline" class="header__toggle" id="nav-toggle"></ion-icon>
        <nav class="nav" id="nav-menu">
            <div class="nav__content bd-grid">
                <ion-icon name="close-outline" class="nav__close" id="nav-close"></ion-icon>
                <div class="nav__perfil">
                    <div class="nav__img">
                        <img src="assets/logo/logo.png" alt="logoGRAMMER">
                    </div>
                    <div>
                        <a href="#" class="nav__name">SPECIAL FREIGHT</a>
                    </div>
                </div>
                <div class="nav__menu">
                    <ul class="nav__list">
                        <li class="nav__item"><a href="profile.php" class="nav__link active">My Profile</a></li>
                        <li class="nav__item"><a href="newOrder.php" class="nav__link">New Order</a></li>
                        <li class="nav__item"><a href="orders.php" class="nav__link">Generated Orders</a></li>
                        <li class="nav__item"><a href="register.php" class="nav__link">Add User</a></li>
                        <li class="nav__item"><a href="https://www.google.com" class="nav__link">Charts</a></li>
                        <li class="nav__item"><a href="#" class="nav__link">Manual</a></li>
                        <?php if (isset($_SESSION['user'])): ?>
                            <li class="nav__item"><a href="dao/users/logout.php" class="nav__link">Log Out</a></li>
                        <?php endif; ?>
                    </ul>
                </div>
            </div>
        </nav>
    </header>

    <main class="container my-4">
        <div class="profile-container">
            <div class="profile-header">
                <div class="avatar-container">
                    <ion-icon name="person-circle-outline" class="avatar-icon"></ion-icon>
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
                        <input type="email" class="form-control" id="email" value="<?php echo htmlspecialchars($user['email']); ?>" readonly>
                    </div>
                    
                    <div class="mb-3">
                        <label for="username" class="form-label">Name</label>
                        <input type="text" class="form-control" id="username" value="<?php echo htmlspecialchars($user['name']); ?>">
                    </div>
                    
                    <div class="mb-3">
                        <label for="current-password" class="form-label">Current Password</label>
                        <div class="input-group">
                            <input type="password" class="form-control" id="current-password">
                            <button class="btn btn-outline-secondary toggle-password" type="button" data-target="current-password">
                                <ion-icon name="eye-off-outline"></ion-icon>
                            </button>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="new-password" class="form-label">New Password</label>
                        <div class="input-group">
                            <input type="password" class="form-control" id="new-password">
                            <button class="btn btn-outline-secondary toggle-password" type="button" data-target="new-password">
                                <ion-icon name="eye-off-outline"></ion-icon>
                            </button>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="confirm-password" class="form-label">Confirm New Password</label>
                        <div class="input-group">
                            <input type="password" class="form-control" id="confirm-password">
                            <button class="btn btn-outline-secondary toggle-password" type="button" data-target="confirm-password">
                                <ion-icon name="eye-off-outline"></ion-icon>
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