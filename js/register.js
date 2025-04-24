document.getElementById('register-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const data = {
        name: document.getElementById('username').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value.trim(),
        role: document.getElementById('role').value.trim(),
        authorization_level: parseInt(document.getElementById('authorization_level').value, 10)
    };

    fetch('https://grammermx.com/Jesus/PruebaDos/dao/users/daoSingin.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            Swal.fire('¡Éxito!', res.mensaje, 'success').then(() => {
                window.location.href = 'index.php';
            });
        } else {
            Swal.fire('Error', res.mensaje, 'error');
        }
    })
    .catch(() => {
        Swal.fire('Error', 'No se pudo registrar el usuario.', 'error');
    });
});