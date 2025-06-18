// Project: Main application controller

class MiImpresoraWebApp {
    constructor() {
        this.logger = new window.MiImpresoraWeb.Logger();
        this.fileHandler = new window.MiImpresoraWeb.FileHandler();
        this.uiController = new window.MiImpresoraWeb.UIController();
        this.excelProcessor = new window.MiImpresoraWeb.ExcelProcessor();
        this.luckysheetManager = new window.MiImpresoraWeb.LuckysheetManager();
        
        this.currentWorkbook = null;
        this.currentFile = null;
        this.currentSheetsInfo = null;
        
        this.init();
    }
    
    init() {
        this.logger.info('Initializing Mi Impresora Web', 'main');
        
        // Verify libraries
        this.verifyLibraries();
        
        // Initialize UI first
        this.uiController.init();
        
        // Setup event listeners after UI is ready
        this.setupEventListeners();
        
        this.logger.success('Application initialized successfully', 'main');
    }
    
    verifyLibraries() {
        const requiredLibraries = [
            { name: 'XLSX', object: window.XLSX },
            { name: 'Luckysheet', object: window.luckysheet }
        ];
        
        const missingLibraries = [];
        
        requiredLibraries.forEach(lib => {
            if (!lib.object) {
                missingLibraries.push(lib.name);
                this.logger.error(`Required library not found: ${lib.name}`, 'main');
            } else {
                this.logger.success(`Library loaded: ${lib.name}`, 'main');
            }
        });
        
        if (missingLibraries.length > 0) {
            const message = `Missing required libraries: ${missingLibraries.join(', ')}`;
            this.logger.error(message, 'main');
            alert(message + '\nPlease check your internet connection and reload the page.');
            return false;
        }
        
        return true;
    }
    
    setupEventListeners() {
        this.logger.info('Setting up main event listeners', 'main');
        
        // File input change - handled by UIController but processed by FileHandler
        this.uiController.onFileSelected = (event) => {
            this.logger.info('File input event received in main', 'main');
            
            // Let FileHandler process the event first
            this.fileHandler.handleFileChange(event);
        };
        
        // FileHandler callback
        this.fileHandler.onFileSelected = (file) => {
            this.logger.info('File selected callback triggered', 'main', { fileName: file.name });
            this.handleFileSelected(file);
        };
        
        // Load selected sheets
        this.uiController.onLoadSelectedSheets = (selectedSheets) => {
            this.logger.info('Load selected sheets callback triggered', 'main', { 
                sheetsCount: selectedSheets.length 
            });
            this.handleLoadSelectedSheets(selectedSheets);
        };
        
        // Print button
        this.uiController.onPrint = () => {
            this.logger.info('🖨️ PRINT CALLBACK TRIGGERED!', 'main');
            this.handlePrint();
        };
        
        // Reset button
        this.uiController.onReset = () => {
            this.logger.info('🔄 RESET CALLBACK TRIGGERED!', 'main');
            this.handleReset();
        };
        
        // Paper size change
        this.uiController.onPaperSizeChange = (size) => {
            this.logger.info('Paper size change callback triggered', 'main', { size });
            this.uiController.setPaperSize(size);
        };
        
        this.logger.success('All main event listeners setup completed', 'main', {
            fileInputCallback: !!this.uiController.onFileSelected,
            fileHandlerCallback: !!this.fileHandler.onFileSelected,
            loadSheetsCallback: !!this.uiController.onLoadSelectedSheets,
            printCallback: !!this.uiController.onPrint,
            resetCallback: !!this.uiController.onReset,
            paperSizeCallback: !!this.uiController.onPaperSizeChange
        });
    }
    
    async handleFileSelected(file) {
        try {
            this.logger.info(`Processing file: ${file.name}`, 'main');
            
            // Validate file
            if (!this.fileHandler.validateFile(file)) {
                alert('Tipo de archivo no válido. Por favor selecciona un archivo Excel (.xlsx, .xls) o CSV.');
                return;
            }
            
            // Show loading
            this.uiController.showEnhancedLoading('Analizando archivo Excel...');
            this.uiController.updateProgress(10, 'Leyendo archivo...');
            
            // Analyze file
            const analysisResult = await this.excelProcessor.analyzeExcelFile(file);
            this.currentWorkbook = analysisResult.workbook;
            this.currentSheetsInfo = analysisResult.sheetsInfo;
            this.currentFile = file;
            
            this.uiController.updateProgress(50, 'Archivo analizado correctamente');
            
            // Hide loading and show sheet selector
            this.uiController.hideLoading();
            this.uiController.showSheetSelector(analysisResult, analysisResult.sheetsInfo);
            
            this.logger.success(`File analysis completed: ${file.name}`, 'main', {
                sheets: analysisResult.sheetsInfo.length
            });
            
        } catch (error) {
            this.logger.error('Failed to process file', 'main', { 
                fileName: file.name, 
                error: error.message 
            });
            
            this.uiController.hideLoading();
            alert(`Error al procesar el archivo: ${error.message}`);
        }
    }
    
    async handleLoadSelectedSheets(selectedSheets) {
        try {
            if (!selectedSheets || selectedSheets.length === 0) {
                alert('Por favor selecciona al menos una hoja para cargar.');
                return;
            }
            
            this.logger.info(`Loading ${selectedSheets.length} selected sheets`, 'main');
            
            // Show loading
            this.uiController.showEnhancedLoading('Preparando hojas seleccionadas...');
            this.uiController.updateProgress(20, 'Convirtiendo hojas...');
            
            // Convert sheets to Luckysheet format
            const luckysheetsData = this.excelProcessor.convertSheetsToLuckysheet(
                this.currentWorkbook, 
                selectedSheets
            );
            
            this.uiController.updateProgress(60, 'Cargando en el visor...');
            
            // Load into Luckysheet
            await this.luckysheetManager.loadSheets(luckysheetsData);
            
            this.uiController.updateProgress(90, 'Finalizando...');
            
            // Verificar que Luckysheet esté realmente cargado
            let attempts = 0;
            const maxAttempts = 20;
            while (!this.luckysheetManager.isLoaded() && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 250));
                attempts++;
                this.logger.info(`Waiting for Luckysheet to load, attempt ${attempts}`, 'main');
            }
            
            if (!this.luckysheetManager.isLoaded()) {
                throw new Error('Luckysheet no se cargó correctamente después de esperar');
            }
            
            // Hide loading and show spreadsheet
            this.uiController.hideLoading();
            this.uiController.hideSheetSelector();
            this.uiController.showSpreadsheet();
            
            // Verificación adicional del botón después de mostrar spreadsheet
            setTimeout(() => {
                const printButton = document.getElementById('printButton');
                if (printButton) {
                    if (printButton.disabled) {
                        printButton.disabled = false;
                        this.logger.info('Print button force-enabled after final timeout', 'main');
                    }
                    this.logger.info('Final print button state', 'main', {
                        exists: true,
                        disabled: printButton.disabled,
                        visible: printButton.offsetParent !== null
                    });
                } else {
                    this.logger.error('Print button still not found after final timeout!', 'main');
                }
            }, 1000);
            
            this.logger.success(`Successfully loaded ${selectedSheets.length} sheets`, 'main');
            
        } catch (error) {
            this.logger.error('Failed to load selected sheets', 'main', { 
                selectedSheets: selectedSheets.length,
                error: error.message 
            });
            
            this.uiController.hideLoading();
            alert(`Error al cargar las hojas: ${error.message}`);
        }
    }

    handlePrint() {
        try {
            this.logger.info('🖨️ PRINT HANDLER CALLED!', 'main');
            
            // Verificaciones detalladas
            const printButton = document.getElementById('printButton');
            this.logger.info('Print button verification', 'main', {
                buttonExists: !!printButton,
                buttonDisabled: printButton ? printButton.disabled : 'N/A',
                luckysheetManagerExists: !!this.luckysheetManager,
                luckysheetLoaded: this.luckysheetManager ? this.luckysheetManager.isLoaded() : 'N/A'
            });
            
            if (!this.luckysheetManager) {
                this.logger.error('LuckysheetManager not initialized', 'main');
                alert('El sistema de impresión no está inicializado.');
                return;
            }
            
            if (!this.luckysheetManager.isLoaded()) {
                this.logger.error('Luckysheet not loaded', 'main');
                alert('No hay hojas cargadas para imprimir. Por favor carga un archivo Excel primero.');
                return;
            }
            
            this.logger.info('All conditions met, proceeding with print', 'main');
            this.luckysheetManager.print();
            
        } catch (error) {
            this.logger.error('Print failed', 'main', { error: error.message });
            alert(`Error al imprimir: ${error.message}`);
        }
    }
    
    handleReset() {
        try {
            this.logger.info('🔄 RESET HANDLER CALLED!', 'main');
            
            // Reset all components
            this.luckysheetManager.destroy();
            this.uiController.reset();
            this.fileHandler.reset();
            
            // Clear current data
            this.currentWorkbook = null;
            this.currentFile = null;
            this.currentSheetsInfo = null;
            
            this.logger.success('Application reset completed', 'main');
            
        } catch (error) {
            this.logger.error('Reset failed', 'main', { error: error.message });
            alert(`Error al reiniciar: ${error.message}`);
        }
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM Content Loaded - Initializing app...');
    new MiImpresoraWebApp();
});

// Verificar estado del botón
const btn = document.getElementById('printButton');
console.log('Print button:', btn);
console.log('Button disabled:', btn?.disabled);
console.log('Button visible:', btn?.offsetParent !== null);

// Verificar Luckysheet
console.log('Luckysheet instance:', window.luckysheet);
console.log('Luckysheet container:', document.getElementById('luckysheet'));

// Habilitar manualmente el botón para pruebas
if (btn) {
    btn.disabled = false;
    console.log('Button manually enabled');
}