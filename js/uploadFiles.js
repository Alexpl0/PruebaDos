/**
 * Módulo de manejo de subida de archivos
 * Este módulo proporciona funciones para subir archivos de recuperación y evidencia
 * para el sistema Premium Freight.
 * 
 * ACTUALIZACIÓN v2.0 (2025-10-06):
 * - Usa window.PF_CONFIG.app.baseURL en lugar de URLPF directamente
 * - Mantiene compatibilidad con URLPF para código legacy
 */

/**
 * Obtiene la URL base de forma segura
 * @returns {string} URL base del sistema
 */
function getBaseURL() {
    // Prioridad 1: window.PF_CONFIG.app.baseURL (método moderno)
    if (window.PF_CONFIG?.app?.baseURL) {
        return window.PF_CONFIG.app.baseURL;
    }
    
    // Prioridad 2: window.URLPF (método legacy)
    if (typeof window.URLPF !== 'undefined') {
        return window.URLPF;
    }
    
    // Fallback: URL hardcodeada como último recurso
    console.warn('[uploadFiles.js] No URL configuration found. Using fallback URL.');
    return 'https://grammermx.com/Jesus/PruebaDos/';
}

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

        const baseURL = getBaseURL();
        
        fetch(baseURL + 'dao/conections/daoUploadRecovery.php', {
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
            console.error('[uploadFiles.js] Error uploading recovery file:', error);
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

        const baseURL = getBaseURL();

        fetch(baseURL + 'dao/conections/daoUploadEvidence.php', {
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
            console.error('[uploadFiles.js] Error uploading evidence file:', error);
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
 * @param {FormData} formData - Datos del formulario a enviar
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
 * Verificación de disponibilidad de la configuración
 * Muestra un mensaje informativo si no se encuentra la configuración esperada
 */
(function checkConfiguration() {
    if (typeof window.PF_CONFIG === 'undefined' && typeof window.URLPF === 'undefined') {
        console.warn('[uploadFiles.js] No URL configuration found (PF_CONFIG or URLPF). Make sure config.js is loaded before this script.');
    } else {
        console.log('[uploadFiles.js] Configuration loaded successfully. Using base URL:', getBaseURL());
    }
})();

// Exportar funciones para su uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        uploadRecoveryFile,
        uploadEvidenceFile,
        validatePDFFile,
        uploadFileWithProgress,
        getBaseURL
    };
} else {
    // Exponer funciones globalmente para uso en navegador
    window.uploadRecoveryFile = uploadRecoveryFile;
    window.uploadEvidenceFile = uploadEvidenceFile;
    window.validatePDFFile = validatePDFFile;
    window.uploadFileWithProgress = uploadFileWithProgress;
    window.getBaseURL = getBaseURL;
}