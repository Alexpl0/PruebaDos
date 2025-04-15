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
    </style>
</head>
<body>
    <h1 style="text-align: center;">User Data</h1>
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
        fetch('https://grammermx.com/Jesus/PruebaDos/test_db.php')
            .then(response => response.json())
            .then(data => {
                const tbody = document.getElementById('tableBody');
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
                document.getElementById('tableBody').innerHTML = '<tr><td colspan="5">Error loading data</td></tr>';
                console.error(error);
            });
    </script>
</body>
</html>