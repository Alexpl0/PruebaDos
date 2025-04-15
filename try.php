<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Buscar Usuario</title>
    <style>
        body {
            background: #f8f9fa;
            font-family: Arial, sans-serif;
        }
        .login-container {
            width: 350px;
            margin: 60px auto;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            padding: 32px 24px 24px 24px;
        }
        .login-title {
            text-align: center;
            margin-bottom: 24px;
            font-size: 1.5rem;
            color: #333;
        }
        .form-group {
            margin-bottom: 18px;
        }
        .form-group label {
            display: block;
            margin-bottom: 6px;
            color: #555;
        }
        .form-group input {
            width: 100%;
            padding: 8px 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }
        .btn-search {
            width: 100%;
            padding: 10px;
            background: #007bff;
            color: #fff;
            border: none;
            border-radius: 4px;
            font-size: 1rem;
            cursor: pointer;
            margin-bottom: 10px;
        }
        .btn-search:hover {
            background: #0056b3;
        }
        .result-table {
            width: 100%;
            margin-top: 18px;
            border-collapse: collapse;
        }
        .result-table th, .result-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: center;
        }
        .result-table th {
            background-color: #f4f4f4;
        }
        .msg {
            text-align: center;
            margin-top: 12px;
            color: #888;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-title">Buscar Usuario</div>
        <div class="form-group">
            <label for="usernameInput">Usuario</label>
            <input type="text" id="usernameInput" placeholder="Escribe el nombre de usuario">
        </div>
        <button class="btn-search" onclick="buscarUsuario()">Buscar</button>
        <div id="result">
            <table class="result-table" style="display:none;">
                <thead>
                    <tr>
                        <th>IdUser</th>
                        <th>Username</th>
                        <th>Mail</th>
                        <th>Password</th>
                        <th>ROL</th>
                    </tr>
                </thead>
                <tbody id="tableBody">
                </tbody>
            </table>
            <div class="msg" id="msg"></div>
        </div>
    </div>
    <script>
        function buscarUsuario() {
            const username = document.getElementById('usernameInput').value.trim();
            const tbody = document.getElementById('tableBody');
            const table = document.querySelector('.result-table');
            const msg = document.getElementById('msg');
            tbody.innerHTML = '';
            msg.textContent = '';
            table.style.display = 'none';

            if (!username) {
                msg.textContent = 'Por favor ingresa un nombre de usuario.';
                return;
            }

            msg.textContent = 'Buscando...';

            fetch('https://grammermx.com/Jesus/PruebaDos/test_db.php?username=' + encodeURIComponent(username))
                .then(response => response.json())
                .then(data => {
                    tbody.innerHTML = '';
                    if (data.status === 'success' && Array.isArray(data.data) && data.data.length > 0) {
                        data.data.forEach(user => {
                            const row = document.createElement('tr');
                            row.innerHTML = `
                                <td>${user.IdUser ?? ''}</td>
                                <td>${user.Username ?? ''}</td>
                                <td>${user.Mail ?? ''}</td>
                                <td>${user.Password ?? ''}</td>
                                <td>${user.ROL ?? ''}</td>
                            `;
                            tbody.appendChild(row);
                        });
                        table.style.display = '';
                        msg.textContent = '';
                    } else {
                        msg.textContent = 'No se encontró el usuario.';
                        table.style.display = 'none';
                    }
                })
                .catch(error => {
                    msg.textContent = 'Error al buscar usuario.';
                    table.style.display = 'none';
                    console.error(error);
                });
        }
    </script>
</body>
</html>