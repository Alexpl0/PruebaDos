/**
 * Función para subir archivo de recuperación principal
 * @param {number} premiumFreightId - ID del registro de Premium Freight
 * @param {string} userName - Nombre del usuario
 * @param {File} file - Archivo a subir
 * @returns {Promise} Promesa que resuelve con la respuesta del servidor
 */
function uploadRecoveryFile(premiumFreightId, userName, file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve({ success: true, message: "No recovery file to upload" });
            return;
        }

        const formData = new FormData();
        formData.append('recoveryFile', file);
        formData.append('premium_freight_id', premiumFreightId);
        formData.append('userName', userName);

        fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoUploadRecovery.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                resolve(data);
            } else {
                reject(new Error(data.message || "Error uploading recovery file"));
            }
        })
        .catch(error => {
            console.error('Error uploading recovery file:', error);
            reject(error);
        });
    });
}

/**
 * Función para subir archivo de evidencia
 * @param {number} premiumFreightId - ID del registro de Premium Freight
 * @param {string} userName - Nombre del usuario
 * @param {File} file - Archivo a subir
 * @returns {Promise} Promesa que resuelve con la respuesta del servidor
 */
function uploadEvidenceFile(premiumFreightId, userName, file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve({ success: true, message: "No evidence file to upload" });
            return;
        }

        const formData = new FormData();
        formData.append('evidenceFile', file);
        formData.append('premium_freight_id', premiumFreightId);
        formData.append('userName', userName);

        fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoUploadEvidence.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                resolve(data);
            } else {
                reject(new Error(data.message || "Error uploading evidence file"));
            }
        })
        .catch(error => {
            console.error('Error uploading evidence file:', error);
            reject(error);
        });
    });
}