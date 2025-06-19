// Project: Luckysheet integration manager

window.MiImpresoraWeb = window.MiImpresoraWeb || {};

window.MiImpresoraWeb.LuckysheetManager = class LuckysheetManager {
    constructor() {
        this.logger = new window.MiImpresoraWeb.Logger();
        this.instance = null;
        this.isLoadedFlag = false; // Agregar flag de carga
    }
    
    async loadSheets(luckysheetsData) {
        this.logger.info('Loading sheets into Luckysheet', 'luckysheetManager', { 
            sheetsCount: luckysheetsData.length,
            firstSheetName: luckysheetsData[0]?.name,
            luckysheetsDataStructure: luckysheetsData[0] ? Object.keys(luckysheetsData[0]) : 'N/A'
        });
        
        try {
            // Verificar que tenemos datos para cargar
            if (!luckysheetsData || luckysheetsData.length === 0) {
                throw new Error('No hay datos de hojas para cargar en Luckysheet');
            }
            
            // Verificar que Luckysheet esté disponible
            if (!window.luckysheet) {
                throw new Error('Luckysheet library not loaded');
            }
            
            if (typeof window.luckysheet.create !== 'function') {
                throw new Error('Luckysheet.create method not available');
            }
            
            // Verificar el contenedor
            const container = document.getElementById('luckysheet');
            if (!container) {
                throw new Error('Luckysheet container not found in DOM');
            }
            
            // Validar estructura de datos de Luckysheet
            const validationResult = this.validateLuckysheetsData(luckysheetsData);
            if (!validationResult.isValid) {
                throw new Error(`Datos de Luckysheet inválidos: ${validationResult.error}`);
            }
            
            this.logger.info('Pre-initialization checks passed', 'luckysheetManager', {
                containerExists: !!container,
                containerVisible: container.offsetParent !== null,
                luckysheetsAvailable: !!window.luckysheet,
                createMethodAvailable: typeof window.luckysheet.create === 'function',
                dataValidation: validationResult
            });
            
            // Destroy existing instance if any
            if (this.instance) {
                await this.destroy();
            }
            
            // Marcar como no cargado inicialmente
            this.isLoadedFlag = false;
            
            // Clear container first
            container.innerHTML = '';
            
            // Configure Luckysheet options
            const options = {
                container: 'luckysheet',
                data: luckysheetsData,
                title: 'Mi Impresora Web',
                lang: 'es',
                showtoolbar: true,
                showinfobar: true,
                showsheetbar: true,
                showstatisticBar: true,
                enableAddRow: false,
                enableAddCol: false,
                sheetBottomConfig: false,
                allowCopy: true,
                allowEdit: true,
                allowUpdate: true,
                showConfigWindowResize: true,
                forceCalculation: false,
                showBottomContainerOuterBorder: true,
                hook: {
                    updated: () => {
                        this.logger.info('Luckysheet updated', 'luckysheetManager');
                    },
                    workbookCreateAfter: () => {
                        this.logger.success('🎉 Luckysheet workbook created successfully!', 'luckysheetManager');
                        this.isLoadedFlag = true;
                        
                        // Verificar que realmente se estableció
                        this.logger.info('isLoadedFlag set to true via workbookCreateAfter', 'luckysheetManager', {
                            isLoadedFlag: this.isLoadedFlag,
                            timestamp: new Date().toISOString()
                        });
                    },
                    cellEditBefore: () => {
                        // Otro hook para asegurar que está cargado
                        if (!this.isLoadedFlag) {
                            this.isLoadedFlag = true;
                            this.logger.info('isLoadedFlag set via cellEditBefore hook', 'luckysheetManager');
                        }
                    }
                }
            };
            
            this.logger.info('Luckysheet options prepared', 'luckysheetManager', {
                container: options.container,
                dataSheets: options.data.length,
                hooks: Object.keys(options.hook),
                firstSheetName: options.data[0]?.name,
                firstSheetCellCount: options.data[0]?.celldata?.length || 0
            });
            
            // Initialize Luckysheet
            this.logger.info('Creating Luckysheet instance...', 'luckysheetManager');
            
            // Try to create with error handling
            try {
                window.luckysheet.create(options);
                this.instance = window.luckysheet;
                this.logger.success('Luckysheet.create() called successfully', 'luckysheetManager');
            } catch (createError) {
                this.logger.error('Luckysheet.create() failed', 'luckysheetManager', { 
                    error: createError.message,
                    stack: createError.stack,
                    optionsUsed: {
                        container: options.container,
                        dataLength: options.data.length,
                        hasValidData: options.data.length > 0 && options.data[0].celldata
                    }
                });
                throw createError;
            }
            
            // Esperar y verificar con más detalle
            let attempts = 0;
            const maxAttempts = 20;
            
            while (!this.isLoadedFlag && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
                
                // Verificar container DOM
                const containerCheck = {
                    exists: !!container,
                    hasChildren: container.children.length,
                    hasLuckysheetContent: !!container.querySelector('.luckysheet-cell-main'),
                    isVisible: container.offsetParent !== null,
                    innerHTML: container.innerHTML.length
                };
                
                this.logger.info(`Loading attempt ${attempts}/${maxAttempts}`, 'luckysheetManager', containerCheck);
                
                // Verificar si Luckysheet tiene datos cargados
                if (window.luckysheet && window.luckysheet.getluckysheetfile) {
                    try {
                        const sheets = window.luckysheet.getluckysheetfile();
                        if (sheets && sheets.length > 0) {
                            this.isLoadedFlag = true;
                            this.logger.success('Luckysheet confirmed loaded via getluckysheetfile', 'luckysheetManager', {
                                sheetsFound: sheets.length,
                                attempt: attempts
                            });
                            break;
                        }
                    } catch (e) {
                        this.logger.warning('getluckysheetfile check failed', 'luckysheetManager', { 
                            error: e.message,
                            attempt: attempts
                        });
                    }
                }
                
                // También verificar si el container tiene contenido significativo
                if (containerCheck.hasLuckysheetContent) {
                    this.isLoadedFlag = true;
                    this.logger.success('Luckysheet confirmed loaded via DOM inspection', 'luckysheetManager', {
                        attempt: attempts
                    });
                    break;
                }
                
                // Si el container tiene contenido pero no es Luckysheet, algo está mal
                if (containerCheck.hasChildren > 0 && !containerCheck.hasLuckysheetContent) {
                    this.logger.warning('Container has content but not Luckysheet content', 'luckysheetManager', {
                        children: containerCheck.hasChildren,
                        innerHTML: container.innerHTML.substring(0, 200) + '...'
                    });
                }
            }
            
            if (!this.isLoadedFlag) {
                // Realizar un último intento de verificación
                const finalCheck = {
                    containerHasContent: container.children.length > 0,
                    luckysheetsAvailable: !!window.luckysheet,
                    instanceSet: !!this.instance
                };
                
                this.logger.error('Luckysheet failed to load properly', 'luckysheetManager', {
                    attempts: attempts,
                    finalCheck: finalCheck,
                    containerHTML: container.innerHTML.substring(0, 500)
                });
                
                // Si hay contenido en el container, asumir que está cargado
                if (finalCheck.containerHasContent) {
                    this.logger.warning('Forcing isLoadedFlag to true based on container content', 'luckysheetManager');
                    this.isLoadedFlag = true;
                } else {
                    throw new Error(`Luckysheet no se cargó correctamente después de ${attempts} intentos`);
                }
            }
            
            this.logger.success('Luckysheet loading process completed', 'luckysheetManager', {
                isLoadedFlag: this.isLoadedFlag,
                finalAttempts: attempts,
                containerChildren: container.children.length
            });
            
            return true;
            
        } catch (error) {
            this.logger.error('Failed to load Luckysheet', 'luckysheetManager', { 
                error: error.message,
                stack: error.stack
            });
            this.isLoadedFlag = false;
            throw error;
        }
    }
    
    validateLuckysheetsData(luckysheetsData) {
        try {
            if (!Array.isArray(luckysheetsData)) {
                return { isValid: false, error: 'Data is not an array' };
            }
            
            if (luckysheetsData.length === 0) {
                return { isValid: false, error: 'Array is empty' };
            }
            
            for (let i = 0; i < luckysheetsData.length; i++) {
                const sheet = luckysheetsData[i];
                
                if (!sheet || typeof sheet !== 'object') {
                    return { isValid: false, error: `Sheet ${i} is not an object` };
                }
                
                if (!sheet.name || typeof sheet.name !== 'string') {
                    return { isValid: false, error: `Sheet ${i} has no valid name` };
                }
                
                if (!Array.isArray(sheet.celldata)) {
                    return { isValid: false, error: `Sheet ${i} (${sheet.name}) has no valid celldata array` };
                }
                
                if (typeof sheet.row !== 'number' || typeof sheet.column !== 'number') {
                    return { isValid: false, error: `Sheet ${i} (${sheet.name}) has invalid row/column dimensions` };
                }
            }
            
            return { isValid: true, error: null };
            
        } catch (error) {
            return { isValid: false, error: `Validation error: ${error.message}` };
        }
    }

    async destroy() {
        if (this.instance) {
            try {
                // Clear the container
                const container = document.getElementById('luckysheet');
                if (container) {
                    container.innerHTML = '';
                }
                
                this.instance = null;
                this.isLoadedFlag = false; // Resetear flag
                this.logger.info('Luckysheet instance destroyed', 'luckysheetManager');
                
            } catch (error) {
                this.logger.warning('Error destroying Luckysheet instance', 'luckysheetManager', { 
                    error: error.message 
                });
            }
        }
    }
    
    print() {
        if (this.instance) {
            this.logger.info('Initiating print', 'luckysheetManager');
            
            try {
                // Use browser's print functionality
                window.print();
                this.logger.success('Print dialog opened', 'luckysheetManager');
                
            } catch (error) {
                this.logger.error('Failed to open print dialog', 'luckysheetManager', { 
                    error: error.message 
                });
                
                // Fallback: try to print the luckysheet container directly
                this.printContainer();
            }
        } else {
            this.logger.warning('No Luckysheet instance available for printing', 'luckysheetManager');
        }
    }
    
    printContainer() {
        try {
            const container = document.getElementById('luckysheet');
            if (container) {
                const printWindow = window.open('', '_blank');
                printWindow.document.write(`
                    <html>
                        <head>
                            <title>Imprimir - Mi Impresora Web</title>
                            <style>
                                body { margin: 0; padding: 10px; }
                                @media print {
                                    body { margin: 0; padding: 0; }
                                }
                            </style>
                        </head>
                        <body>
                            ${container.innerHTML}
                        </body>
                    </html>
                `);
                printWindow.document.close();
                printWindow.print();
                printWindow.close();
                
                this.logger.success('Alternative print method executed', 'luckysheetManager');
            }
        } catch (error) {
            this.logger.error('Failed to execute alternative print method', 'luckysheetManager', { 
                error: error.message 
            });
        }
    }
    
    getCurrentSheetData() {
        if (this.instance && this.instance.getluckysheetfile) {
            try {
                return this.instance.getluckysheetfile();
            } catch (error) {
                this.logger.error('Failed to get current sheet data', 'luckysheetManager', { 
                    error: error.message 
                });
                return null;
            }
        }
        return null;
    }
    
    isLoaded() {
        const loaded = this.instance !== null && this.isLoadedFlag === true;
        this.logger.info('Checking if Luckysheet is loaded', 'luckysheetManager', {
            instanceExists: this.instance !== null,
            isLoadedFlag: this.isLoadedFlag,
            result: loaded
        });
        return loaded;
    }
};