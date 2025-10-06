<?php
/**
 * lucy_dashboard.php - Página para generar dashboards de Excel y Power BI con AI.
 */

require_once 'dao/users/auth_check.php';
require_once 'dao/users/context_injector.php';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lucy - AI Dashboard Generator</title>
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">

    <!-- Third-party CSS -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Local CSS -->
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/styles.css">
    
    <!-- Config -->
    <script src="js/config.js"></script>

    <?php if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <link rel="stylesheet" href="css/lucy_dashboard.css">
        <style>
            /* Chat styles */
            #chat-container {
                display: none;
                margin-top: 2rem;
            }

            #chat-messages {
                max-height: 400px;
                overflow-y: auto;
                padding: 1rem;
                background-color: #f8f9fa;
                border-radius: 8px;
                margin-bottom: 1rem;
            }

            .chat-message {
                display: flex;
                gap: 0.75rem;
                margin-bottom: 1rem;
                animation: fadeIn 0.3s ease-in;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .user-message {
                flex-direction: row-reverse;
            }

            .message-avatar {
                flex-shrink: 0;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #4472C4, #5B9BD5);
                color: white;
            }

            .user-message .message-avatar {
                background: linear-gradient(135deg, #6c757d, #868e96);
            }

            .message-avatar img {
                width: 100%;
                height: 100%;
                border-radius: 50%;
                object-fit: cover;
            }

            .message-content {
                flex: 1;
                padding: 0.75rem 1rem;
                border-radius: 12px;
                background-color: white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                max-width: 70%;
                word-wrap: break-word;
            }

            .user-message .message-content {
                background-color: #4472C4;
                color: white;
            }

            .typing-indicator .typing-dots {
                display: flex;
                gap: 4px;
                padding: 0.5rem 0;
            }

            .typing-dots span {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background-color: #4472C4;
                animation: typing 1.4s infinite;
            }

            .typing-dots span:nth-child(2) {
                animation-delay: 0.2s;
            }

            .typing-dots span:nth-child(3) {
                animation-delay: 0.4s;
            }

            @keyframes typing {
                0%, 60%, 100% { transform: translateY(0); }
                30% { transform: translateY(-10px); }
            }

            #chat-input-container {
                display: flex;
                gap: 0.5rem;
            }

            #chat-input {
                flex: 1;
                border-radius: 20px;
                padding: 0.75rem 1.25rem;
                border: 2px solid #dee2e6;
                resize: none;
            }

            #chat-input:focus {
                border-color: #4472C4;
                outline: none;
                box-shadow: 0 0 0 0.25rem rgba(68, 114, 196, 0.25);
            }

            #send-chat-btn {
                border-radius: 50%;
                width: 48px;
                height: 48px;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: #4472C4;
                border: none;
                color: white;
                transition: all 0.2s;
            }

            #send-chat-btn:hover {
                background-color: #365a99;
                transform: scale(1.05);
            }

            #send-chat-btn:active {
                transform: scale(0.95);
            }

            .dashboard-controls {
                display: flex;
                gap: 0.5rem;
                justify-content: flex-end;
                margin-top: 1rem;
                flex-wrap: wrap;
            }

            .dashboard-controls .btn {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            /* Output type selector */
            .output-selector {
                display: flex;
                gap: 0.5rem;
                margin-bottom: 1rem;
                justify-content: center;
            }

            .output-type-btn {
                flex: 1;
                max-width: 200px;
                padding: 0.75rem 1.5rem;
                border: 2px solid #dee2e6;
                background-color: white;
                color: #6c757d;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                font-weight: 500;
            }

            .output-type-btn:hover {
                border-color: #4472C4;
                color: #4472C4;
            }

            .output-type-btn.active {
                background-color: #4472C4;
                color: white;
                border-color: #4472C4;
                box-shadow: 0 4px 6px rgba(68, 114, 196, 0.3);
            }

            .output-type-btn i {
                font-size: 1.2rem;
            }

            @media (max-width: 768px) {
                .message-content {
                    max-width: 85%;
                }

                .dashboard-controls {
                    justify-content: center;
                }

                .dashboard-controls .btn {
                    flex: 1;
                    min-width: 140px;
                }

                .output-selector {
                    flex-direction: column;
                }

                .output-type-btn {
                    max-width: 100%;
                }
            }
        </style>
    <?php endif; ?>
</head>
<body>
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
                            <h1 class="h3">Hola, soy Lucy</h1>
                            <p class="text-muted">Tu asistente de IA para análisis de datos.</p>
                        </div>
                    </div>
                    <hr>
                    
                    <!-- Output Type Selector -->
                    <div class="output-selector">
                        <button type="button" id="output-excel-btn" class="output-type-btn active">
                            <i class="fas fa-file-excel"></i>
                            <span>Excel</span>
                        </button>
                        <button type="button" id="output-powerbi-btn" class="output-type-btn">
                            <i class="fas fa-chart-bar"></i>
                            <span>Power BI</span>
                        </button>
                    </div>
                    
                    <p class="card-text mt-3">Describe el dashboard que necesitas. Sé lo más específico posible para obtener el mejor resultado.</p>
                    
                    <p class="prompt-example">Por ejemplo: <em>"Crea un dashboard que muestre los costos por transportista en un gráfico de barras y el número de órdenes por planta en una tabla dinámica."</em></p>
                    
                    <form id="lucy-form" class="text-center">
                        <div class="mb-3">
                            <textarea id="prompt-input" class="form-control" rows="4" placeholder="Ej: 'Necesito un reporte con los costos totales por categoría de causa, una tabla con todas las órdenes pendientes, y un gráfico de línea mostrando la tendencia de costos por mes...'"></textarea>
                        </div>
                        <button type="submit" id="generate-dashboard-btn" class="btn btn-primary">
                            <i class="fas fa-cogs me-2"></i>Generar Dashboard
                        </button>
                    </form>
                </div>
            </div>

            <!-- Results Section -->
            <div id="dashboard-result-container" class="mt-4" style="display: none;">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">
                            <i class="fas fa-chart-line me-2"></i>Dashboard Interactivo
                        </h5>
                        <div class="dashboard-controls">
                            <button id="download-excel-btn" class="btn btn-success btn-sm">
                                <i class="fas fa-download"></i>
                                Descargar
                            </button>
                            <button id="new-dashboard-btn" class="btn btn-secondary btn-sm">
                                <i class="fas fa-plus"></i>
                                Nuevo Dashboard
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <!-- Loader -->
                        <div id="loader" class="text-center py-5">
                            <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                                <span class="visually-hidden">Generando...</span>
                            </div>
                            <p class="mt-3">
                                <strong>Lucy está procesando tu solicitud...</strong>
                            </p>
                            <p class="text-muted">Esto puede tomar unos momentos mientras analizamos los datos y creamos tu dashboard personalizado.</p>
                        </div>
                        
                        <!-- Iframe Container -->
                        <div id="iframe-container" style="display: none;">
                            <iframe id="powerbi-iframe" src="" frameborder="0" allowfullscreen="true"></iframe>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Chat Interface -->
            <div id="chat-container" class="mt-4">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">
                            <i class="fas fa-comments me-2"></i>Conversación con Lucy
                        </h5>
                        <p class="text-muted small mb-0">Puedes pedirle a Lucy que modifique el dashboard o agregar más análisis.</p>
                    </div>
                    <div class="card-body">
                        <div id="chat-messages"></div>
                        
                        <div id="chat-input-container">
                            <textarea 
                                id="chat-input" 
                                class="form-control" 
                                rows="1" 
                                placeholder="Escribe tu mensaje... (Ej: 'Agrega un gráfico de pastel mostrando la distribución por carrier')"
                            ></textarea>
                            <button id="send-chat-btn" class="btn btn-primary">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <footer class="text-center mt-5 py-3">
        <p>&copy; <?php echo date("Y"); ?> Premium Freight. All rights reserved.</p>
    </footer>

    <!-- Third-party scripts -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Local scripts -->
    <script src="js/header.js" type="module"></script>

    <?php if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <script src="js/lucy_dashboard.js"></script>
    <?php endif; ?>
</body>
</html>