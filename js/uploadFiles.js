/**
 * Módulo de manejo de subida de archivos
 * Este módulo proporciona funciones para subir archivos de recuperación y evidencia
 * para el sistema Premium Freight.
 */

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

        fetch(URLPF + 'dao/conections/daoUploadRecovery.php', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
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

        fetch(URLPF + 'dao/conections/daoUploadEvidence.php', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
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

/**
 * Función para validar un archivo PDF antes de subirlo
 * @param {File} file - Archivo a validar
 * @param {number} maxSizeMB - Tamaño máximo en MB (por defecto 10MB)
 * @returns {Object} Resultado de la validación {valid: boolean, message: string}
 */
function validatePDFFile(file, maxSizeMB = 10) {
    if (!file) {
        return { valid: false, message: "No file selected" };
    }

    // Comprobar tipo de archivo
    if (file.type !== 'application/pdf') {
        return { 
            valid: false, 
            message: "Invalid file type. Please upload a PDF file." 
        };
    }

    // Comprobar tamaño máximo (10MB por defecto)
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        return { 
            valid: false, 
            message: `File is too large. Maximum file size is ${maxSizeMB}MB.` 
        };
    }

    return { valid: true, message: "File is valid" };
}

/**
 * Función para mostrar el progreso de carga en un elemento HTML
 * @param {HTMLElement} progressElement - Elemento HTML para mostrar el progreso
 * @param {File} file - Archivo que se está subiendo
 * @param {string} endpointUrl - URL del endpoint de carga
 * @returns {Promise} Promesa que resuelve con la respuesta del servidor
 */
function uploadFileWithProgress(progressElement, file, endpointUrl, formData) {
    return new Promise((resolve, reject) => {
        // Crear un objeto XMLHttpRequest para poder monitorear el progreso
        const xhr = new XMLHttpRequest();
        
        // Monitorear el evento de progreso
        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable && progressElement) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                progressElement.style.width = percentComplete + '%';
                progressElement.textContent = percentComplete + '%';
            }
        }, false);
        
        // Configurar manejo de finalización
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response);
                } catch (e) {
                    reject(new Error('Invalid JSON response from server'));
                }
            } else {
                reject(new Error(`HTTP error! Status: ${xhr.status}`));
            }
        });
        
        // Configurar manejo de errores
        xhr.addEventListener('error', () => {
            reject(new Error('Network error occurred'));
        });
        
        // Abrir y enviar la solicitud
        xhr.open('POST', endpointUrl, true);
        xhr.send(formData);
    });
}

/**
 * Verificación de disponibilidad de la variable URL
 * En caso de que el script se cargue antes que la variable esté definida
 */
if (typeof URLPF === 'undefined') {
    console.warn('URLPF global variable is not defined. Make sure this script runs after the URLPF is defined in your PHP page.');
    // Fallback a URLPF hardcodeada solo como último recurso
    window.URLPF = window.URLPF || 'https://grammermx.com/Jesus/PruebaDos/';
}

// Exportar funciones para su uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        uploadRecoveryFile,
        uploadEvidenceFile,
        validatePDFFile,
        uploadFileWithProgress
    };
} else {
    // Exponer funciones globalmente para uso en navegador
    window.uploadRecoveryFile = uploadRecoveryFile;
    window.uploadEvidenceFile = uploadEvidenceFile;
    window.validatePDFFile = validatePDFFile;
    window.uploadFileWithProgress = uploadFileWithProgress;
}