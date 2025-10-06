<?php
/**
 * test_powerbi_connection.php - Script de diagnóstico para Power BI
 * Ejecuta esto directamente en el navegador para verificar la conexión
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

// ==================== CONFIGURACIÓN ====================
define('POWERBI_CLIENT_ID', '07297fbf-6ba4-4fe3-99a1-87c93a5aaeb4');
define('POWERBI_CLIENT_SECRET', 'PDK8Q~F-ZLtKAYWVaOHVMDq63rccxXSZ2M4-pae3');
define('POWERBI_TENANT_ID', '1b76d39b-fc45-4afe-a05b-8d8f81f18a77');
define('POWERBI_WORKSPACE_ID', '959d9628-e3b1-4217-aaed-ea2c0d90dc8a');

echo "<h1>Diagnóstico de Power BI API</h1>";
echo "<style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
    .success { color: green; background: #d4edda; padding: 10px; margin: 10px 0; border-radius: 5px; }
    .error { color: red; background: #f8d7da; padding: 10px; margin: 10px 0; border-radius: 5px; }
    .info { color: blue; background: #d1ecf1; padding: 10px; margin: 10px 0; border-radius: 5px; }
    pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
    h2 { border-bottom: 2px solid #333; padding-bottom: 5px; }
</style>";

// ==================== PASO 1: Verificar Configuración ====================
echo "<h2>Paso 1: Verificar Configuración</h2>";

if (POWERBI_CLIENT_ID === 'TU_CLIENT_ID_AQUI') {
    echo "<div class='error'>❌ CLIENT_ID no configurado</div>";
    die();
} else {
    echo "<div class='success'>✓ CLIENT_ID: " . substr(POWERBI_CLIENT_ID, 0, 8) . "...</div>";
}

if (POWERBI_CLIENT_SECRET === 'TU_CLIENT_SECRET_AQUI') {
    echo "<div class='error'>❌ CLIENT_SECRET no configurado</div>";
    die();
} else {
    echo "<div class='success'>✓ CLIENT_SECRET configurado</div>";
}

if (POWERBI_TENANT_ID === 'TU_TENANT_ID_AQUI') {
    echo "<div class='error'>❌ TENANT_ID no configurado</div>";
    die();
} else {
    echo "<div class='success'>✓ TENANT_ID: " . POWERBI_TENANT_ID . "</div>";
}

echo "<div class='success'>✓ WORKSPACE_ID: " . POWERBI_WORKSPACE_ID . "</div>";

// ==================== PASO 2: Obtener Token ====================
echo "<h2>Paso 2: Obtener Access Token</h2>";

$tokenUrl = 'https://login.microsoftonline.com/' . POWERBI_TENANT_ID . '/oauth2/v2.0/token';

$params = [
    'client_id' => POWERBI_CLIENT_ID,
    'client_secret' => POWERBI_CLIENT_SECRET,
    'scope' => 'https://analysis.windows.net/powerbi/api/.default',
    'grant_type' => 'client_credentials'
];

$ch = curl_init($tokenUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    echo "<div class='error'>❌ Error obteniendo token (HTTP {$httpCode})</div>";
    echo "<pre>" . htmlspecialchars($response) . "</pre>";
    
    $errorData = json_decode($response, true);
    if (isset($errorData['error_description'])) {
        echo "<div class='info'><strong>Descripción del error:</strong><br>" . htmlspecialchars($errorData['error_description']) . "</div>";
        
        if (strpos($errorData['error_description'], 'AADSTS700016') !== false) {
            echo "<div class='error'><strong>Solución:</strong> La aplicación no existe en este tenant. Verifica que el CLIENT_ID y TENANT_ID sean correctos.</div>";
        }
        
        if (strpos($errorData['error_description'], 'AADSTS7000215') !== false) {
            echo "<div class='error'><strong>Solución:</strong> El CLIENT_SECRET es inválido. Genera uno nuevo en Azure Portal.</div>";
        }
    }
    die();
}

$tokenData = json_decode($response, true);
$accessToken = $tokenData['access_token'];

echo "<div class='success'>✓ Token obtenido exitosamente</div>";
echo "<div class='info'>Token (primeros 50 caracteres): " . substr($accessToken, 0, 50) . "...</div>";

// ==================== PASO 3: Probar listado de Workspaces ====================
echo "<h2>Paso 3: Listar todos los Workspaces accesibles</h2>";

$groupsUrl = 'https://api.powerbi.com/v1.0/myorg/groups';

$ch = curl_init($groupsUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $accessToken,
    'Content-Type: application/json'
]);

$groupsResponse = curl_exec($ch);
$groupsHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "<div class='info'>HTTP Code: {$groupsHttpCode}</div>";

if ($groupsHttpCode === 200) {
    $groups = json_decode($groupsResponse, true);
    
    echo "<div class='success'>✓ Workspaces encontrados: " . count($groups['value']) . "</div>";
    
    if (count($groups['value']) === 0) {
        echo "<div class='error'>❌ No se encontraron workspaces accesibles.</div>";
        echo "<div class='info'><strong>Posibles causas:</strong>
        <ul>
            <li>Service Principal no está habilitado en Power BI Admin Portal</li>
            <li>La aplicación no tiene permisos de Application (debe ser Application, no Delegated)</li>
            <li>No se dio 'Admin consent' a los permisos</li>
        </ul>
        </div>";
    } else {
        echo "<table border='1' cellpadding='5' style='border-collapse: collapse; width: 100%;'>";
        echo "<tr><th>Nombre</th><th>ID</th><th>¿Es tu workspace?</th></tr>";
        
        $foundTargetWorkspace = false;
        
        foreach ($groups['value'] as $group) {
            $isTarget = ($group['id'] === POWERBI_WORKSPACE_ID) ? '✓ SÍ' : '';
            if ($isTarget) {
                $foundTargetWorkspace = true;
            }
            
            echo "<tr>";
            echo "<td>" . htmlspecialchars($group['name']) . "</td>";
            echo "<td>" . htmlspecialchars($group['id']) . "</td>";
            echo "<td style='color: green; font-weight: bold;'>" . $isTarget . "</td>";
            echo "</tr>";
        }
        
        echo "</table>";
        
        if (!$foundTargetWorkspace) {
            echo "<div class='error'>❌ El workspace con ID '" . POWERBI_WORKSPACE_ID . "' NO fue encontrado en la lista.</div>";
            echo "<div class='info'><strong>Solución:</strong>
            <ol>
                <li>Ve a Power BI Service: <a href='https://app.powerbi.com/groups/" . POWERBI_WORKSPACE_ID . "/list' target='_blank'>Abrir workspace</a></li>
                <li>Click en 'Access' (Acceso)</li>
                <li>Agrega tu aplicación (Application ID: " . POWERBI_CLIENT_ID . ")</li>
                <li>Dale rol de 'Admin' o 'Member'</li>
                <li>Guarda y vuelve a ejecutar este script</li>
            </ol>
            </div>";
        } else {
            echo "<div class='success'>✓ El workspace objetivo está accesible</div>";
        }
    }
} else {
    echo "<div class='error'>❌ Error listando workspaces (HTTP {$groupsHttpCode})</div>";
    echo "<pre>" . htmlspecialchars($groupsResponse) . "</pre>";
    
    if ($groupsHttpCode === 401) {
        echo "<div class='info'><strong>Error 401 - No autorizado:</strong> El token es inválido o los permisos no son suficientes.</div>";
    }
}

// ==================== PASO 4: Intentar acceder al Workspace específico ====================
if ($groupsHttpCode === 200 && isset($foundTargetWorkspace) && $foundTargetWorkspace) {
    echo "<h2>Paso 4: Acceder al Workspace específico</h2>";
    
    $workspaceUrl = 'https://api.powerbi.com/v1.0/myorg/groups/' . POWERBI_WORKSPACE_ID;
    
    $ch = curl_init($workspaceUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $accessToken,
        'Content-Type: application/json'
    ]);
    
    $workspaceResponse = curl_exec($ch);
    $workspaceHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($workspaceHttpCode === 200) {
        $workspace = json_decode($workspaceResponse, true);
        echo "<div class='success'>✓ Workspace accesible correctamente</div>";
        echo "<pre>" . json_encode($workspace, JSON_PRETTY_PRINT) . "</pre>";
        
        echo "<h2>✅ DIAGNÓSTICO COMPLETO</h2>";
        echo "<div class='success'>
            <strong>Todo está configurado correctamente.</strong><br>
            Puedes usar Power BI API sin problemas.<br><br>
            Si aún tienes errores en la aplicación, revisa:
            <ul>
                <li>Que el archivo powerbi_api.php tenga las mismas credenciales</li>
                <li>Que el WORKSPACE_ID sea exactamente: " . POWERBI_WORKSPACE_ID . "</li>
                <li>Revisa los logs de error de PHP</li>
            </ul>
        </div>";
        
    } else {
        echo "<div class='error'>❌ Error accediendo al workspace (HTTP {$workspaceHttpCode})</div>";
        echo "<pre>" . htmlspecialchars($workspaceResponse) . "</pre>";
    }
}

// ==================== PASO 5: Agregar Service Principal al Workspace ====================
if ($groupsHttpCode === 200) {
    echo "<h2>Paso 5: Agregar Service Principal al Workspace</h2>";
    
    // Primero verificar si ya está agregado
    $getUsersUrl = 'https://api.powerbi.com/v1.0/myorg/groups/' . POWERBI_WORKSPACE_ID . '/users';
    
    $ch = curl_init($getUsersUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $accessToken,
        'Content-Type: application/json'
    ]);
    
    $getUsersResponse = curl_exec($ch);
    $getUsersHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $alreadyExists = false;
    
    if ($getUsersHttpCode === 200) {
        $users = json_decode($getUsersResponse, true);
        
        if (isset($users['value'])) {
            foreach ($users['value'] as $user) {
                if (isset($user['identifier']) && $user['identifier'] === POWERBI_CLIENT_ID) {
                    $alreadyExists = true;
                    echo "<div class='success'>Service Principal ya está agregado al workspace</div>";
                    echo "<div class='info'>Rol actual: " . $user['groupUserAccessRight'] . "</div>";
                    echo "<div class='info'>Principal Type: " . $user['principalType'] . "</div>";
                    break;
                }
            }
        }
    }
    
    if (!$alreadyExists) {
        echo "<div class='info'>Intentando agregar Service Principal al workspace...</div>";
        
        $addUserUrl = 'https://api.powerbi.com/v1.0/myorg/groups/' . POWERBI_WORKSPACE_ID . '/users';
        
        $payload = [
            'identifier' => POWERBI_CLIENT_ID,
            'groupUserAccessRight' => 'Admin',
            'principalType' => 'App'
        ];
        
        $ch = curl_init($addUserUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $accessToken,
            'Content-Type: application/json'
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        
        $addUserResponse = curl_exec($ch);
        $addUserHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($addUserHttpCode === 200 || $addUserHttpCode === 204) {
            echo "<div class='success'>Service Principal agregado exitosamente al workspace</div>";
            echo "<div class='info'>Application ID: " . POWERBI_CLIENT_ID . "</div>";
            echo "<div class='info'>Rol asignado: Admin</div>";
        } else {
            echo "<div class='error'>Error agregando Service Principal (HTTP {$addUserHttpCode})</div>";
            echo "<pre>" . htmlspecialchars($addUserResponse) . "</pre>";
            
            $errorData = json_decode($addUserResponse, true);
            if (isset($errorData['error'])) {
                echo "<div class='info'><strong>Posibles causas:</strong><ul>";
                echo "<li>Service Principal no está habilitado en Power BI Admin Portal</li>";
                echo "<li>Los permisos de Application no están configurados correctamente</li>";
                echo "<li>No se dio 'Admin consent' a los permisos</li>";
                echo "</ul></div>";
            }
        }
    }
}

// ==================== PASO 6: Probar creación de Dataset ====================
if (isset($alreadyExists) && ($alreadyExists || $addUserHttpCode === 200 || $addUserHttpCode === 204)) {
    echo "<h2>Paso 6: Probar creación de Dataset (Opcional)</h2>";
    
    echo "<div class='info'>Ahora vamos a intentar crear un dataset de prueba para verificar que todo funciona.</div>";
    
    $datasetPayload = [
        'name' => 'Test_Dataset_' . time(),
        'tables' => [
            [
                'name' => 'TestTable',
                'columns' => [
                    ['name' => 'ID', 'dataType' => 'Int64'],
                    ['name' => 'Name', 'dataType' => 'String'],
                    ['name' => 'Value', 'dataType' => 'Double']
                ]
            ]
        ],
        'defaultMode' => 'Push'
    ];
    
    $createDatasetUrl = 'https://api.powerbi.com/v1.0/myorg/groups/' . POWERBI_WORKSPACE_ID . '/datasets';
    
    $ch = curl_init($createDatasetUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $accessToken,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($datasetPayload));
    
    $createDatasetResponse = curl_exec($ch);
    $createDatasetHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($createDatasetHttpCode === 201 || $createDatasetHttpCode === 200) {
        $dataset = json_decode($createDatasetResponse, true);
        echo "<div class='success'>Dataset de prueba creado exitosamente</div>";
        echo "<div class='info'>Dataset ID: " . $dataset['id'] . "</div>";
        echo "<div class='info'>Nombre: " . $dataset['name'] . "</div>";
        echo "<pre>" . json_encode($dataset, JSON_PRETTY_PRINT) . "</pre>";
        
        echo "<div class='success'><strong>EXCELENTE:</strong> Tu integración con Power BI está 100% funcional.</div>";
        echo "<div class='info'>Puedes eliminar este dataset de prueba desde Power BI Service si deseas.</div>";
        
    } else {
        echo "<div class='error'>Error creando dataset de prueba (HTTP {$createDatasetHttpCode})</div>";
        echo "<pre>" . htmlspecialchars($createDatasetResponse) . "</pre>";
    }
}

echo "<hr>";
echo "<h2>Resumen Final</h2>";

if (isset($alreadyExists) && $alreadyExists) {
    echo "<div class='success'>
        <strong>TODO CONFIGURADO CORRECTAMENTE</strong><br><br>
        Tu aplicación ya tiene acceso al workspace y puede usar Power BI API.<br><br>
        <strong>Próximos pasos:</strong>
        <ol>
            <li>Actualiza powerbi_api.php con estas credenciales</li>
            <li>Prueba crear un dashboard desde Lucy</li>
            <li>Si hay errores, revisa los logs de PHP</li>
        </ol>
    </div>";
} elseif (isset($addUserHttpCode) && ($addUserHttpCode === 200 || $addUserHttpCode === 204)) {
    echo "<div class='success'>
        <strong>CONFIGURACION COMPLETADA</strong><br><br>
        Service Principal agregado exitosamente al workspace.<br><br>
        <strong>Próximos pasos:</strong>
        <ol>
            <li>Actualiza powerbi_api.php con estas credenciales</li>
            <li>Prueba crear un dashboard desde Lucy</li>
        </ol>
    </div>";
} else {
    echo "<div class='error'>
        <strong>CONFIGURACION INCOMPLETA</strong><br><br>
        Revisa los errores arriba y sigue las instrucciones para corregirlos.<br><br>
        <strong>Checklist:</strong>
        <ul>
            <li>Credenciales correctas</li>
            <li>Service Principal habilitado en Power BI Admin Portal</li>
            <li>Permisos de Application (Dataset.ReadWrite.All, Workspace.ReadWrite.All)</li>
            <li>Admin consent dado</li>
            <li>Service Principal agregado al workspace</li>
        </ul>
    </div>";
}

echo "<hr>";
echo "<div class='info'>
<strong>Instrucciones para habilitar Service Principal en Power BI Admin:</strong>
<ol>
    <li>Ve a <a href='https://app.powerbi.com/admin-portal/tenantSettings' target='_blank'>Power BI Admin Portal</a></li>
    <li>Scroll a 'Developer settings'</li>
    <li>Activa 'Allow service principals to use Power BI APIs'</li>
    <li>Selecciona 'The entire organization'</li>
    <li>Aplica los cambios</li>
    <li>Espera unos minutos y vuelve a ejecutar este script</li>
</ol>
</div>";
?>