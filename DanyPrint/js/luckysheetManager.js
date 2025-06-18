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
            sheetsCount: luckysheetsData.length 
        });
        
        try {
            // Destroy existing instance if any
            if (this.instance) {
                await this.destroy();
            }
            
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
                    // Hook importante: se ejecuta cuando Luckysheet termina de cargar
                    workbookCreateAfter: () => {
                        this.logger.success('Luckysheet workbook created successfully', 'luckysheetManager');
                        this.isLoadedFlag = true;
                        
                        // Forzar habilitación del botón después de un pequeño delay
                        setTimeout(() => {
                            const printButton = document.getElementById('printButton');
                            if (printButton) {
                                printButton.disabled = false;
                                this.logger.info('Print button force-enabled after workbook creation', 'luckysheetManager');
                            }
                        }, 100);
                    }
                }
            };
            
            // Initialize Luckysheet
            luckysheet.create(options);
            this.instance = luckysheet;
            
            // Esperar un poco para asegurar que Luckysheet esté completamente cargado
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            this.isLoadedFlag = true;
            this.logger.success('Luckysheet loaded successfully', 'luckysheetManager');
            return true;
            
        } catch (error) {
            this.logger.error('Failed to load Luckysheet', 'luckysheetManager', { error: error.message });
            this.isLoadedFlag = false;
            throw error;
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
        return this.instance !== null && this.isLoadedFlag === true;
    }
};