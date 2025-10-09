<?php
/**
 * ximena.php - Procesador para Ximena (futuras integraciones)
 * Este archivo está reservado para futuras funcionalidades relacionadas con Ximena.
 */

// ========== CONFIGURACIÓN ==========
// Cambia esta URL por la que necesites
$redirect_url = 'https://ipafmexico.com/wp-content/uploads/2025/10/IPAF_F4_PREP.pdf';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Aquí puedes guardar los datos si lo deseas
    // $nombre = $_POST['nombre'];
    // $email = $_POST['email'];
    header("Location: $redirect_url");
    exit;
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Formulario de Redirección</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
        }
        
        .form-container {
            background-color: #fff;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            width: 100%;
            max-width: 400px;
        }
        
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 24px;
            text-align: center;
        }
        
        p {
            color: #666;
            margin-bottom: 30px;
            text-align: center;
            font-size: 14px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            margin-bottom: 5px;
            color: #333;
            font-weight: 500;
            font-size: 14px;
        }
        
        input[type="text"],
        input[type="email"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 5px;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        
        input[type="text"]:focus,
        input[type="email"]:focus {
            outline: none;
            border-color: #667eea;
        }
        
        button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            width: 100%;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        
        button:active {
            transform: translateY(0);
        }
        
        .info-text {
            margin-top: 20px;
            padding: 15px;
            background-color: #f8f9fa;
            border-left: 4px solid #667eea;
            border-radius: 5px;
            font-size: 13px;
            color: #555;
        }
    </style>
</head>
<body>
    <div class="form-container">
        <h1>Formulario de Redirección</h1>
        <p>Completa el formulario para continuar</p>
        
        <form method="POST" action="">
            <div class="form-group">
                <label for="nombre">Nombre:</label>
                <input type="text" id="nombre" name="nombre" placeholder="Tu nombre" required>
            </div>
            
            <div class="form-group">
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" placeholder="tu@email.com" required>
            </div>
            
            <!-- Puedes agregar más campos aquí según necesites -->
            
            <button type="submit">Enviar y Continuar</button>
        </form>
        
        <div class="info-text">
            <strong>Nota:</strong> Al enviar este formulario serás redirigido automáticamente.
        </div>
    </div>
</body>
</html>