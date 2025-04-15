<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test DB Response</title>
    <style>
        table {
            width: 50%;
            border-collapse: collapse;
            margin: 20px auto;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: center;
        }
        th {
            background-color: #f4f4f4;
        }
        #search-container {
            width: 50%;
            margin: 20px auto;
            text-align: center;
        }
        #search-container input, #search-container button {
            padding: 8px;
            margin: 4px;
        }
    </style>
</head>
<body>
    <h1 style="text-align: center;">User Data</h1>
    <div id="search-container">
        <input type="text" id="usernameInput" placeholder="Escribe el nombre de usuario">
        <button onclick="buscarUsuario()">Buscar</button>
    </div>
    <table id="userTable">
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
            <tr>
                <td colspan="5">Cargando...</td>
            </tr>
        </tbody>
    </table>
    <script>
        function buscarUsuario() {
            const username = document.getElementById('usernameInput').value.trim();
            const tbody = document.getElementById('tableBody');
            tbody.innerHTML = '<tr><td colspan="5">Buscando...</td></tr>';
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
                    } else {
                        tbody.innerHTML = '<tr><td colspan="5">No data available</td></tr>';
                    }
                })
                .catch(error => {
                    tbody.innerHTML = '<tr><td colspan="5">Error loading data</td></tr>';
                    console.error(error);
                });
        }
    </script>
</body>
</html>