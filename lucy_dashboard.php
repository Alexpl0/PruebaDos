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
                            <!-- SVG icon for Lucy: elegant and no external files -->
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feather feather-cpu"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>
                        </div>
                        <div class="lucy-title">
                            <h1 class="h3">Hello, I'm Lucy</h1>
                            <p class="text-muted">Your AI assistant for data analysis.</p>
                        </div>
                    </div>
                    <hr>
                    <p class="card-text mt-3">Describe the dashboard you need. Be as specific as possible to get the best result.</p>
                    
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
