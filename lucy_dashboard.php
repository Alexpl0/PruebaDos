<?php
/**
 * lucy_dashboard.php - Page to generate Power BI dashboards with AI.
 * Uses the centralized authentication and context system.
 */

// 1. Handle session and authentication.
require_once 'dao/users/auth_check.php';

// 2. Include the context injector.
require_once 'dao/users/context_injector.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Dashboard Generator</title>
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">

    <!-- ================== THIRD-PARTY CSS ================== -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- ================== LOCAL CSS ================== -->
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/styles.css">
    
    <!-- ================== CENTRALIZED CONTEXT SYSTEM ================== -->
    <?php
        // The injector was already required at the top of the script.
    ?>
    <!-- Include the JS config module. -->
    <script src="js/config.js"></script>
    <!-- ==================================================================== -->

    <?php 
    // Conditionally load the AI assistant's CSS.
    // We assume only users with level > 0 can use it.
    if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <link rel="stylesheet" href="css/lucy_dashboard.css">
    <?php endif; ?>
</head>
<body>
    <!-- Container for the dynamic header -->
    <div id="header-container"></div>
    
    <main class="container my-5">
        <div class="lucy-main-container">
            <!-- Lucy Interaction Section -->
            <div id="lucy-interaction-card" class="card">
                <div class="card-body">
                    <div class="lucy-header">
                        <div class="lucy-avatar">
                            <img src="assets/assistant/Lucy.png" alt="Lucy Avatar" width="48" height="48" style="border-radius: 50%; object-fit: cover;">
                        </div>
                        <div class="lucy-title">
                            <h1 class="h3">Hello, I'm Lucy</h1>
                            <p class="text-muted">Your AI assistant for data analysis.</p>
                        </div>
                    </div>
                    <hr>
                    <p class="card-text mt-3">Describe the dashboard you need. Be as specific as possible to get the best result.</p>
                    
                    <p class="prompt-example">For example: <em>"A dashboard that shows the performance of logistics support through calls, chats, emails, and escalations."</em></p>
                    
                    <form id="lucy-form" class="text-center">
                        <div class="mb-3">
                            <textarea id="prompt-input" class="form-control" rows="4" placeholder="e.g., 'I need a report with sales by country on a map and cost per carrier in a bar chart...'"></textarea>
                        </div>
                        <button type="submit" id="generate-dashboard-btn" class="btn btn-primary">
                            <i class="fas fa-cogs me-2"></i>Generate Dashboard
                        </button>
                    </form>
                </div>
            </div>

            <!-- Section to display the Power BI result -->
            <div id="dashboard-result-container" class="mt-4" style="display: none;">
                <div class="card">
                    <div class="card-header">
                        <h5>Power BI Visualization</h5>
                    </div>
                    <div class="card-body">
                        <!-- Loader -->
                        <div id="loader" class="text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Generating...</span>
                            </div>
                            <p class="mt-2">Lucy is processing your request...</p>
                        </div>
                        
                        <!-- Iframe Container -->
                        <div id="iframe-container" style="display: none;">
                            <iframe id="powerbi-iframe" src="" frameborder="0" allowfullscreen="true"></iframe>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <footer class="text-center mt-5 py-3">
        <p>&copy; <?php echo date("Y"); ?> Premium Freight. All rights reserved.</p>
    </footer>

    <!-- ================== THIRD-PARTY SCRIPTS ================== -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- ================== LOCAL SCRIPTS ================== -->
    <script src="js/header.js"></script>

    <?php 
    // Conditionally load the assistant's JS.
    if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <script src="js/lucy_dashboard.js"></script>
    <?php endif; ?>
</body>
</html>
