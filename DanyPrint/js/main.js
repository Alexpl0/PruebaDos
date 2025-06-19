// Project: Main application controller

class MiImpresoraWebApp {
    constructor() {
        this.logger = new window.MiImpresoraWeb.Logger();
        this.fileHandler = new window.MiImpresoraWeb.FileHandler();
        this.uiController = new window.MiImpresoraWeb.UIController();
        this.excelProcessor = new window.MiImpresoraWeb.ExcelProcessor();
        this.luckysheetManager = new window.MiImpresoraWeb.LuckysheetManager();
        this.pdfGenerator = new window.MiImpresoraWeb.PDFGenerator();
        
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
        
        // Setup bear animation integration
        this.setupBearIntegration();
        
        this.logger.success('Application initialized successfully', 'main');
    }
    
    setupBearIntegration() {
        // Wait for bear animation to be ready
        setTimeout(() => {
            if (window.bearAnimation) {
                this.bearAnimation = window.bearAnimation;
                this.logger.info('Bear animation integrated', 'main');
            }
        }, 1000);
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
                this.logger.success(`Library loaded: ${lib.name}`, 'main', {
                    version: lib.object.version || 'unknown',
                    methods: Object.keys(lib.object).slice(0, 5) // Show first 5 methods/properties
                });
            }
        });
        
        // Verificación adicional específica para Luckysheet
        if (window.luckysheet) {
            this.logger.info('Luckysheet detailed verification', 'main', {
                hasCreate: typeof window.luckysheet.create === 'function',
                hasDestroy: typeof window.luckysheet.destroy === 'function',
                hasGetluckysheetfile: typeof window.luckysheet.getluckysheetfile === 'function',
                availableMethods: Object.keys(window.luckysheet).filter(key => typeof window.luckysheet[key] === 'function')
            });
        }
        
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
        
        // Edit button
        this.uiController.onEdit = () => {
            this.logger.info('✏️ EDIT CALLBACK TRIGGERED!', 'main');
            this.handleEdit();
        };
        
        // Confirm PDF generation
        this.uiController.onConfirmPDF = () => {
            this.logger.info('📄 CONFIRM PDF CALLBACK TRIGGERED!', 'main');
            this.handleConfirmPDF();
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
            // Notify bear
            if (this.bearAnimation) {
                this.bearAnimation.onFileSelected();
            }
            
            this.logger.info(`Processing file: ${file.name}`, 'main');
            
            // Validate file
            if (!this.fileHandler.validateFile(file)) {
                const extension = file.name.split('.').pop().toLowerCase();
                const supportedFormats = [
                    'Excel: .xlsx, .xlsm, .xlsb, .xltx, .xltm, .xlam, .xls, .xlt, .xla, .xlw',
                    'Otros: .csv, .xml, .prn, .txt, .slk, .dif, .ods'
                ].join('\n');
                
                alert(`Formato de archivo no soportado: .${extension}\n\nFormatos soportados:\n${supportedFormats}`);
                return;
            }
            
            // Show loading
            this.uiController.showEnhancedLoading('Analizando archivo...');
            this.uiController.updateProgress(10, `Leyendo archivo ${file.name}...`);
            
            // Analyze file
            const analysisResult = await this.excelProcessor.analyzeExcelFile(file);
            
            // ✅ MEJORAR el almacenamiento y validación
            if (!analysisResult || !analysisResult.workbook) {
                throw new Error('El análisis del archivo falló o no produjo un workbook válido');
            }
            
            if (!analysisResult.workbook.Sheets || Object.keys(analysisResult.workbook.Sheets).length === 0) {
                throw new Error('El archivo no contiene hojas válidas');
            }
            
            if (!analysisResult.workbook.SheetNames || analysisResult.workbook.SheetNames.length === 0) {
                throw new Error('El archivo no tiene nombres de hojas');
            }
            
            // Almacenar datos validados
            this.currentWorkbook = analysisResult.workbook;
            this.currentSheetsInfo = analysisResult.sheetsInfo;
            this.currentFile = file;
            
            // Log detailed workbook info
            this.logger.info('Workbook stored successfully', 'main', {
                fileName: file.name,
                hasWorkbook: !!this.currentWorkbook,
                hasSheets: !!this.currentWorkbook.Sheets,
                sheetCount: Object.keys(this.currentWorkbook.Sheets).length,
                sheetNames: this.currentWorkbook.SheetNames,
                sheetsInfo: this.currentSheetsInfo.length,
                workbookKeys: Object.keys(this.currentWorkbook).slice(0, 10)
            });
            
            this.uiController.updateProgress(50, `Archivo analizado: ${analysisResult.sheetsInfo.length} hoja(s) encontrada(s)`);
            
            // Hide loading and show sheet selector
            this.uiController.hideLoading();
            this.uiController.showSheetSelector(analysisResult, analysisResult.sheetsInfo);
            
            this.logger.success(`File analysis completed: ${file.name}`, 'main', {
                fileType: analysisResult.fileType,
                sheets: analysisResult.sheetsInfo.length,
                validSheets: analysisResult.sheetsInfo.filter(s => s.hasData).length
            });
            
            // Notify bear of processing
            if (this.bearAnimation) {
                this.bearAnimation.onFileProcessing();
            }
            
        } catch (error) {
            // Notify bear of error
            if (this.bearAnimation) {
                this.bearAnimation.onError();
            }
            
            this.logger.error('Failed to process file', 'main', { 
                fileName: file.name, 
                error: error.message 
            });
            
            this.uiController.hideLoading();
            
            // More specific error messages
            let errorMessage = `Error al procesar el archivo: ${error.message}`;
            
            if (error.message.includes('ZIP')) {
                errorMessage += '\n\nEste archivo puede estar corrupto o no ser un archivo Excel válido.';
            } else if (error.message.includes('XML')) {
                errorMessage += '\n\nError en el formato XML del archivo.';
            } else if (error.message.includes('read')) {
                errorMessage += '\n\nNo se pudo leer el archivo. Verifica que no esté abierto en otra aplicación.';
            }
            
            alert(errorMessage);
        }
    }
    
    async handleLoadSelectedSheets(selectedSheets) {
        try {
            if (!selectedSheets || selectedSheets.length === 0) {
                alert('Por favor selecciona al menos una hoja para cargar.');
                return;
            }
            
            this.logger.info(`Loading ${selectedSheets.length} selected sheets`, 'main');
            
            // ✅ MEJORAR la verificación del workbook
            if (!this.currentWorkbook) {
                this.logger.error('currentWorkbook is null or undefined', 'main', {
                    currentWorkbook: this.currentWorkbook,
                    currentFile: this.currentFile?.name,
                    currentSheetsInfo: this.currentSheetsInfo?.length
                });
                throw new Error('No hay un archivo Excel válido cargado. Por favor, carga un archivo primero.');
            }
            
            if (!this.currentWorkbook.Sheets) {
                this.logger.error('currentWorkbook.Sheets is missing', 'main', {
                    workbookKeys: Object.keys(this.currentWorkbook),
                    hasSheetNames: !!this.currentWorkbook.SheetNames,
                    sheetNamesLength: this.currentWorkbook.SheetNames?.length
                });
                throw new Error('El archivo Excel no contiene hojas válidas.');
            }
            
            if (!this.currentWorkbook.SheetNames || this.currentWorkbook.SheetNames.length === 0) {
                this.logger.error('currentWorkbook.SheetNames is missing or empty', 'main', {
                    hasSheetNames: !!this.currentWorkbook.SheetNames,
                    sheetNames: this.currentWorkbook.SheetNames,
                    sheetsKeys: Object.keys(this.currentWorkbook.Sheets)
                });
                throw new Error('El archivo Excel no tiene nombres de hojas válidos.');
            }
            
            // Verificar que las hojas seleccionadas existen
            const missingSheets = selectedSheets.filter(sheet => 
                !this.currentWorkbook.Sheets[sheet.name]
            );
            
            if (missingSheets.length > 0) {
                this.logger.error('Some selected sheets are missing from workbook', 'main', {
                    missingSheets: missingSheets.map(s => s.name),
                    availableSheets: Object.keys(this.currentWorkbook.Sheets),
                    selectedSheets: selectedSheets.map(s => s.name)
                });
            }
            
            // Show loading
            this.uiController.showEnhancedLoading('Preparando hojas seleccionadas...');
            this.uiController.updateProgress(20, 'Convirtiendo hojas...');
            
            // Convert sheets to Luckysheet format
            let luckysheetsData;
            try {
                luckysheetsData = this.excelProcessor.convertSheetsToLuckysheet(
                    this.currentWorkbook, 
                    selectedSheets
                );
            } catch (conversionError) {
                throw new Error(`Error al convertir las hojas: ${conversionError.message}`);
            }
            
            // Verificar que la conversión produjo datos válidos
            if (!luckysheetsData || luckysheetsData.length === 0) {
                throw new Error('No se pudieron convertir las hojas seleccionadas. Verifica que contengan datos válidos.');
            }
            
            // Debug: Log detailed conversion info
            this.logger.info('Luckysheet data prepared - DETAILED', 'main', {
                dataLength: luckysheetsData.length,
                sheets: luckysheetsData.map(sheet => ({
                    name: sheet.name,
                    cellCount: sheet.celldata ? sheet.celldata.length : 0,
                    hasStyles: sheet.celldata ? sheet.celldata.some(cell => cell.v && cell.v.s) : false,
                    hasMerges: Object.keys(sheet.config?.merge || {}).length > 0,
                    hasFormatting: sheet.celldata ? sheet.celldata.some(cell => cell.v && cell.v.ct && cell.v.ct.fa !== 'General') : false,
                    sampleCell: sheet.celldata && sheet.celldata[0] ? {
                        position: `${sheet.celldata[0].r},${sheet.celldata[0].c}`,
                        value: sheet.celldata[0].v.v,
                        display: sheet.celldata[0].v.m,
                        hasStyle: !!sheet.celldata[0].v.s,
                        cellType: sheet.celldata[0].v.ct
                    } : 'No cells'
                }))
            });
            
            this.uiController.updateProgress(60, 'Cargando en el visor...');
            
            // Verificar Luckysheet antes de cargar
            this.logger.info('Pre-load Luckysheet check', 'main', {
                luckysheetsExists: !!window.luckysheet,
                createMethod: typeof window.luckysheet?.create,
                container: !!document.getElementById('luckysheet')
            });
            
            // Load into Luckysheet
            try {
                await this.luckysheetManager.loadSheets(luckysheetsData);
            } catch (luckysheetError) {
                throw new Error(`Error al cargar en el visor: ${luckysheetError.message}`);
            }
            
            this.uiController.updateProgress(90, 'Finalizando...');
            
            // Hide loading and show spreadsheet
            this.uiController.hideLoading();
            this.uiController.hideSheetSelector();
            this.uiController.showSpreadsheet();
            
            // Verificación final detallada
            setTimeout(() => {
                const finalVerification = {
                    managerLoaded: this.luckysheetManager.isLoaded(),
                    containerVisible: document.getElementById('luckysheet').offsetParent !== null,
                    containerChildren: document.getElementById('luckysheet').children.length,
                    luckysheetsDataLoaded: window.luckysheet ? (window.luckysheet.getluckysheetfile?.() || []).length : 0
                };
                
                // También verificar si los estilos se aplicaron
                if (window.luckysheet && window.luckysheet.getluckysheetfile) {
                    try {
                        const loadedSheets = window.luckysheet.getluckysheetfile();
                        if (loadedSheets && loadedSheets.length > 0) {
                            finalVerification.firstSheetCells = loadedSheets[0].celldata?.length || 0;
                            finalVerification.hasStyledCells = loadedSheets[0].celldata?.some(cell => cell.v && cell.v.s) || false;
                        }
                    } catch (e) {
                        this.logger.warning('Could not verify loaded sheet details', 'main', { error: e.message });
                    }
                }
                
                this.logger.info('Final load verification - DETAILED', 'main', finalVerification);
            }, 1000);
            
            this.logger.success(`Successfully loaded ${selectedSheets.length} sheets`, 'main');
            
            // Notify bear when sheets are loaded
            if (this.bearAnimation) {
                this.bearAnimation.onSheetsLoaded();
            }
            
        } catch (error) {
            if (this.bearAnimation) {
                this.bearAnimation.onError();
            }
            this.logger.error('Failed to load selected sheets', 'main', { 
                selectedSheets: selectedSheets?.length || 0,
                error: error.message,
                stack: error.stack
            });
            
            this.uiController.hideLoading();
            
            // Mensaje de error más específico
            let errorMessage = `Error al cargar las hojas: ${error.message}`;
            
            if (error.message.includes('convertir')) {
                errorMessage += '\n\nEsto puede deberse a que el archivo Excel tiene un formato no compatible o está corrupto.';
            } else if (error.message.includes('Luckysheet')) {
                errorMessage += '\n\nProblema con el visor de hojas de cálculo. Intenta recargar la página.';
            }
            
            alert(errorMessage);
        }
    }

    handleEdit() {
        try {
            this.logger.info('✏️ EDIT HANDLER CALLED!', 'main');
            
            // Simply show a message about editing capabilities
            alert('Puedes editar directamente en las celdas haciendo doble clic sobre ellas.\n\n' +
                  'Cambios disponibles:\n' +
                  '• Editar valores de celdas\n' +
                  '• Modificar formato básico\n' +
                  '• Copiar y pegar\n\n' +
                  'Los cambios se aplicarán automáticamente al generar el PDF.');
                  
        } catch (error) {
            this.logger.error('Edit failed', 'main', { error: error.message });
            alert(`Error al habilitar edición: ${error.message}`);
        }
    }

    handlePrint() {
        try {
            if (this.bearAnimation) {
                this.bearAnimation.onPrintStarted();
            }
            
            this.logger.info('🖨️ PRINT HANDLER CALLED!', 'main');
            
            if (!this.luckysheetManager || !this.luckysheetManager.isLoaded()) {
                alert('No hay hojas cargadas para imprimir. Por favor carga un archivo Excel primero.');
                return;
            }
            
            // Show PDF configuration panel
            this.uiController.showPDFConfigPanel();
            
        } catch (error) {
            if (this.bearAnimation) {
                this.bearAnimation.onError();
            }
            this.logger.error('Print failed', 'main', { error: error.message });
            alert(`Error al iniciar impresión: ${error.message}`);
        }
    }

    async handleConfirmPDF() {
        try {
            // ...existing PDF generation code...
            
            // Notify bear of success
            if (this.bearAnimation) {
                this.bearAnimation.onPrintCompleted();
            }
            
            // ...rest of existing code...
            
        } catch (error) {
            if (this.bearAnimation) {
                this.bearAnimation.onError();
            }
            // ...existing error handling...
        }
    }
    
    handleReset() {
        try {
            // ...existing reset code...
            
            // Notify bear of reset
            if (this.bearAnimation) {
                this.bearAnimation.onReset();
            }
            
        } catch (error) {
            // ...existing error handling...
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