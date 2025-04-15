<?php
// Simulate the response from test_db.php
$response = '{"status":"success","data":[{"IdUser":1,"Username":"Alex","Mail":"Jesus.Perez@grammer.com","Password":"12345","ROL":0}]}';

// Decode the JSON response
$data = json_decode($response, true);
?>

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
    <table>
        <thead>
            <tr>
                <th>IdUser</th>
                <th>Username</th>
                <th>Mail</th>
                <th>Password</th>
                <th>ROL</th>
            </tr>
        </thead>
        <tbody>
            <?php if ($data['status'] === 'success' && !empty($data['data'])): ?>
                <?php foreach ($data['data'] as $user): ?>
                    <tr>
                        <td><?= htmlspecialchars($user['IdUser']) ?></td>
                        <td><?= htmlspecialchars($user['Username']) ?></td>
                        <td><?= htmlspecialchars($user['Mail']) ?></td>
                        <td><?= htmlspecialchars($user['Password']) ?></td>
                        <td><?= htmlspecialchars($user['ROL']) ?></td>
                    </tr>
                <?php endforeach; ?>
            <?php else: ?>
                <tr>
                    <td colspan="5">No data available</td>
                </tr>
            <?php endif; ?>
        </tbody>
    </table>
</body>
</html></tbody>