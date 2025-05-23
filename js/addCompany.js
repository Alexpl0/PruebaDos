/**
 * addCompany.js
 * Este archivo maneja todas las operaciones relacionadas con 
 * la creación y gestión de nuevas compañías durante el proceso de envío del formulario.
 */

// Envoltura IIFE para evitar contaminación del ámbito global
(function() {
    /**
     * Verifica si hay nuevas compañías que necesitan ser guardadas antes del envío del formulario
     * @returns {boolean} - true si hay nuevas compañías, false si no
     */
    window.hasNewCompaniesToSave = function() {
        return ($('#CompanyShip').select2('data')[0] && $('#CompanyShip').select2('data')[0].isNew) || 
               ($('#inputCompanyNameDest').select2('data')[0] && $('#inputCompanyNameDest').select2('data')[0].isNew);
    };

    /**
     * Procesa las nuevas compañías (origen y/o destino) guardándolas en la base de datos
     * @returns {Promise<Object>} - Objeto con estado de éxito y los IDs de las nuevas compañías
     */
    window.processNewCompanies = async function() {
        // Selecciona los elementos Select2 para la compañía de origen y destino
        const companyShipElement = $('#CompanyShip');
        const companyDestElement = $('#inputCompanyNameDest');
        
        // Obtiene los datos asociados con la selección actual en cada campo Select2
        const companyShipData = companyShipElement.select2('data')[0];
        const companyDestData = companyDestElement.select2('data')[0];
        
        // Objeto para almacenar los IDs de las nuevas compañías que se guarden
        let newCompanyIds = {
            origin_id: null,
            destiny_id: null
        };

        // Manejar la compañía de origen si es nueva
        if (companyShipData && companyShipData.isNew) {
            const result = await saveNewOriginCompany(companyShipData, companyShipElement);
            if (!result.success) {
                return { success: false };
            }
            newCompanyIds.origin_id = result.companyId;
        }

        // Manejar la compañía de destino si es nueva
        if (companyDestData && companyDestData.isNew) {
            const result = await saveNewDestinationCompany(companyDestData, companyDestElement);
            if (!result.success) {
                return { success: false };
            }
            newCompanyIds.destiny_id = result.companyId;
        }

        // Retornar éxito y los nuevos IDs
        return { 
            success: true,
            newCompanyIds: newCompanyIds
        };
    };

    /**
     * Guarda una nueva compañía de origen
     * @param {Object} companyData - Datos de la compañía del selector Select2
     * @param {jQuery} selectElement - Elemento Select2 a actualizar
     * @returns {Promise<Object>} - Resultado de la operación
     */
    async function saveNewOriginCompany(companyData, selectElement) {
        console.log("Saving new origin company:", companyData.id);
        
        // Obtener valores de los campos de la compañía de origen
        const companyName = companyData.id;
        const city = $('#inputCityShip').val();
        const state = $('#StatesShip').val();
        const zip = $('#inputZipShip').val();
        
        // Validación de campos requeridos
        if (!companyName || !city || !state || !zip) {
            Swal.fire({
                icon: 'warning',
                title: 'Incomplete Origin Company Data',
                text: 'Please complete all origin company fields (Name, City, State and Zip Code).'
            });
            return { success: false };
        }
        
        try {
            // Mostrar indicador de carga
            Swal.fire({
                title: 'Saving origin company...',
                text: 'Please wait.',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });
            
            // Realizar la petición POST al servidor
            const result = await saveCompanyToServer(companyName, city, state, zip);
            
            if (result.status === 'success') {
                console.log("Origin company saved successfully. ID:", result.company_id);
                
                // Actualizar el Select2 con el nuevo ID
                const newOption = new Option(companyName, result.company_id, true, true);
                selectElement.append(newOption).trigger('change');
                
                // Cerrar el indicador de carga
                Swal.close();
                
                return { 
                    success: true, 
                    companyId: parseInt(result.company_id) 
                };
            } else {
                throw new Error(result.message || 'Error saving origin company');
            }
        } catch (error) {
            console.error('Error saving new origin company:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Could not save the origin company: ' + error.message
            });
            return { success: false };
        }
    }

    /**
     * Guarda una nueva compañía de destino
     * @param {Object} companyData - Datos de la compañía del selector Select2
     * @param {jQuery} selectElement - Elemento Select2 a actualizar
     * @returns {Promise<Object>} - Resultado de la operación
     */
    async function saveNewDestinationCompany(companyData, selectElement) {
        console.log("Saving new destination company:", companyData.id);
        
        // Obtener valores de los campos de la compañía de destino
        const companyName = companyData.id;
        const city = $('#inputCityDest').val();
        const state = $('#StatesDest').val();
        const zip = $('#inputZipDest').val();
        
        // Validación de campos requeridos
        if (!companyName || !city || !state || !zip) {
            Swal.fire({
                icon: 'warning',
                title: 'Incomplete Destination Company Data',
                text: 'Please complete all destination company fields (Name, City, State and Zip Code).'
            });
            return { success: false };
        }
        
        try {
            // Mostrar indicador de carga
            Swal.fire({
                title: 'Saving destination company...',
                text: 'Please wait.',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });
            
            // Realizar la petición POST al servidor
            const result = await saveCompanyToServer(companyName, city, state, zip);
            
            if (result.status === 'success') {
                console.log("Destination company saved successfully. ID:", result.company_id);
                
                // Actualizar el Select2 con el nuevo ID
                const newOption = new Option(companyName, result.company_id, true, true);
                selectElement.append(newOption).trigger('change');
                
                // Cerrar el indicador de carga
                Swal.close();
                
                return { 
                    success: true, 
                    companyId: parseInt(result.company_id) 
                };
            } else {
                throw new Error(result.message || 'Error saving destination company');
            }
        } catch (error) {
            console.error('Error saving new destination company:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Could not save the destination company: ' + error.message
            });
            return { success: false };
        }
    }

    /**
     * Realiza la petición al servidor para guardar una nueva compañía
     * @param {string} companyName - Nombre de la compañía
     * @param {string} city - Ciudad
     * @param {string} state - Estado
     * @param {string} zip - Código postal
     * @returns {Promise<Object>} - Respuesta del servidor
     */
    async function saveCompanyToServer(companyName, city, state, zip) {
        // Usando la variable global URL definida en el archivo PHP
        const response = await fetch(URL + 'dao/elements/daoAddLocation.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                company_name: companyName,
                city: city,
                state: state,
                zip: zip
            })
        });
        
        return await response.json();
    }

    /**
     * Verificación de disponibilidad de la variable URL
     * En caso de que el script se cargue antes que la variable esté definida
     */
    if (typeof URL === 'undefined') {
        console.warn('URL global variable is not defined. Make sure this script runs after the URL is defined in your PHP page.');
        // Fallback a URL hardcodeada solo como último recurso
        window.URL = window.URL || 'https://grammermx.com/Jesus/PruebaDos/';
    }

    // Registra la inicialización en la consola
    console.log("Company management functions initialized and ready.");
})();