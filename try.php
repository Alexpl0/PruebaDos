<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Buscar Usuario</title>
    <style>
        table {
            width: 100%;
            border-collapse: collapse;
        }
        table, th, td {
            border: 1px solid black;
        }
        th, td {
            padding: 8px;
            text-align: left;
        }
    </style>
</head>
<body>
    <h1>Buscar Usuario</h1>
    <form id="searchForm">
        <label for="username">Nombre de Usuario:</label>
        <input type="text" id="username" name="username" required>
        <button type="submit">Buscar</button>
    </form>
    <br>
    <div id="results">
        <table id="resultsTable" style="display: none;">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Email</th>
                </tr>
            </thead>
            <tbody>
                <!-- Los resultados se insertarán aquí -->
            </tbody>
        </table>
    </div>

    <script>
        document.getElementById('searchForm').addEventListener('submit', function(event) {
            event.preventDefault();
            const username = document.getElementById('username').value;

            fetch('test_db.php?usuario=' + encodeURIComponent(username))
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        const filteredData = data.data.filter(user => 
                            user.nombre && user.nombre.toLowerCase().includes(username.toLowerCase())
                        );
                        const table = document.getElementById('resultsTable');
                        const tbody = table.querySelector('tbody');
                        tbody.innerHTML = '';

                        if (filteredData.length > 0) {
                            filteredData.forEach(user => {
                                const row = document.createElement('tr');
                                row.innerHTML = `
                                    <td>${user.id}</td>
                                    <td>${user.nombre}</td>
                                    <td>${user.email}</td>
                                `;
                                tbody.appendChild(row);
                            });
                            table.style.display = 'table';
                        } else {
                            table.style.display = 'none';
                            alert('No se encontraron resultados.');
                        }
                    } else {
                        alert('Error al recuperar los datos.');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Hubo un error al procesar la solicitud.');
                });
        });
    </script>
</body>
</html>