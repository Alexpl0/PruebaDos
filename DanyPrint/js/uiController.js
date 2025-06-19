// Project: UI Controller for Mi Impresora Web

window.MiImpresoraWeb = window.MiImpresoraWeb || {};

window.MiImpresoraWeb.UIController = class UIController {
    constructor() {
        this.logger = new window.MiImpresoraWeb.Logger();
        this.elements = {};
        this.onLoadSelectedSheets = null;
        this.onPrint = null;
        this.onReset = null;
        this.onPaperSizeChange = null;
        this.onFileSelected = null; // Add file selection callback
    }
    
    init() {
        this.logger.info('UIController init started', 'uiController');
        this.initializeElements();
        this.createControls();
        this.setupEventListeners();
        this.logger.info('UIController init completed', 'uiController');
    }
    
    initializeElements() {
        this.elements = {
            controls: document.getElementById('controls'),
            loading: document.getElementById('loading'),
            sheetSelector: document.getElementById('sheetSelector'),
            luckysheet: document.getElementById('luckysheet'),
            body: document.body
        };
        
        this.logger.info('Elements initialized', 'uiController', {
            controlsExists: !!this.elements.controls,
            loadingExists: !!this.elements.loading,
            sheetSelectorExists: !!this.elements.sheetSelector,
            luckysheeetExists: !!this.elements.luckysheet,
            bodyExists: !!this.elements.body
        });
    }
    
    createControls() {
        this.logger.info('Creating controls HTML', 'uiController');
        
        const controlsHTML = `
            <input type="file" id="fileInput" accept=".xlsx,.xlsm,.xlsb,.xltx,.xltm,.xlam,.xls,.xlt,.xla,.xlw,.csv,.xml,.prn,.txt,.slk,.dif,.ods">
            
            <label for="paperSizeSelect">Tamaño de papel:</label>
            <select id="paperSizeSelect">
                <option value="letter">Carta (Letter)</option>
                <option value="tabloid">Tabloid (11x17")</option>
                <option value="a3">A3</option>
                <option value="legal">Legal</option>
            </select>
            
            <label for="orientationSelect">Orientación:</label>
            <select id="orientationSelect">
                <option value="portrait">Vertical (Portrait)</option>
                <option value="landscape">Horizontal (Landscape)</option>
            </select>
            
            <button id="editButton" disabled>✏️ Editar</button>
            <button id="printButton" disabled>🖨️ Imprimir</button>
            <button id="resetButton">🔄 Reiniciar</button>
        `;
        
        this.elements.controls.innerHTML = controlsHTML;
        
        // Update element references AFTER creating HTML
        this.elements.fileInput = document.getElementById('fileInput');
        this.elements.paperSizeSelect = document.getElementById('paperSizeSelect');
        this.elements.orientationSelect = document.getElementById('orientationSelect');
        this.elements.editButton = document.getElementById('editButton');
        this.elements.printButton = document.getElementById('printButton');
        this.elements.resetButton = document.getElementById('resetButton');
    }
    
    setupEventListeners() {
        this.logger.info('Setting up event listeners', 'uiController');
        
        // File input - handle directly in UIController
        if (this.elements.fileInput) {
            this.logger.info('Adding event listener to file input', 'uiController');
            
            this.elements.fileInput.addEventListener('change', (event) => {
                this.logger.info('📁 FILE INPUT CHANGED!', 'uiController', {
                    filesCount: event.target.files.length,
                    onFileSelectedExists: !!this.onFileSelected
                });
                
                if (this.onFileSelected) {
                    this.logger.info('Calling onFileSelected callback', 'uiController');
                    this.onFileSelected(event);
                } else {
                    this.logger.error('onFileSelected callback not set!', 'uiController');
                }
            });
            
            this.logger.success('File input event listener added successfully', 'uiController');
        } else {
            this.logger.error('File input not found!', 'uiController');
        }
        
        // Print button
        if (this.elements.printButton) {
            this.logger.info('Adding event listener to print button', 'uiController');
            
            this.elements.printButton.addEventListener('click', (event) => {
                this.logger.info('🖨️ PRINT BUTTON CLICKED!', 'uiController', {
                    event: event.type,
                    target: event.target.tagName,
                    disabled: event.target.disabled,
                    onPrintExists: !!this.onPrint
                });
                
                if (event.target.disabled) {
                    this.logger.warning('Print button is disabled', 'uiController');
                    return;
                }
                
                if (this.onPrint) {
                    this.logger.info('Calling onPrint callback', 'uiController');
                    this.onPrint();
                } else {
                    this.logger.error('onPrint callback not set!', 'uiController');
                }
            });
            
            this.logger.success('Print button event listener added successfully', 'uiController');
        } else {
            this.logger.error('Print button not found!', 'uiController');
        }
        
        // Reset button
        if (this.elements.resetButton) {
            this.logger.info('Adding event listener to reset button', 'uiController');
            
            this.elements.resetButton.addEventListener('click', (event) => {
                this.logger.info('🔄 RESET BUTTON CLICKED!', 'uiController', {
                    event: event.type,
                    onResetExists: !!this.onReset
                });
                
                if (this.onReset) {
                    this.logger.info('Calling onReset callback', 'uiController');
                    this.onReset();
                } else {
                    this.logger.error('onReset callback not set!', 'uiController');
                }
            });
            
            this.logger.success('Reset button event listener added successfully', 'uiController');
        } else {
            this.logger.error('Reset button not found!', 'uiController');
        }
        
        // Paper size change
        if (this.elements.paperSizeSelect) {
            this.logger.info('Adding event listener to paper size select', 'uiController');
            
            this.elements.paperSizeSelect.addEventListener('change', (e) => {
                this.logger.info('📄 PAPER SIZE CHANGED!', 'uiController', {
                    value: e.target.value,
                    onPaperSizeChangeExists: !!this.onPaperSizeChange
                });
                
                if (this.onPaperSizeChange) {
                    this.onPaperSizeChange(e.target.value);
                } else {
                    this.logger.error('onPaperSizeChange callback not set!', 'uiController');
                }
            });
            
            this.logger.success('Paper size select event listener added successfully', 'uiController');
        } else {
            this.logger.error('Paper size select not found!', 'uiController');
        }
        
        // Edit button - AGREGAR ESTE
        if (this.elements.editButton) {
            this.logger.info('Adding event listener to edit button', 'uiController');
            
            this.elements.editButton.addEventListener('click', (event) => {
                this.logger.info('✏️ EDIT BUTTON CLICKED!', 'uiController', {
                    event: event.type,
                    disabled: event.target.disabled,
                    onEditExists: !!this.onEdit
                });
                
                if (event.target.disabled) {
                    this.logger.warning('Edit button is disabled', 'uiController');
                    return;
                }
                
                if (this.onEdit) {
                    this.logger.info('Calling onEdit callback', 'uiController');
                    this.onEdit();
                } else {
                    this.logger.error('onEdit callback not set!', 'uiController');
                }
            });
            
            this.logger.success('Edit button event listener added successfully', 'uiController');
        } else {
            this.logger.error('Edit button not found!', 'uiController');
        }
        
        this.logger.success('All event listeners setup completed', 'uiController');
    }
    
    showEnhancedLoading(message = 'Procesando...') {
        const loadingHTML = `
            <div style="text-align: center; padding: 20px;">
                <div id="progress-bar" style="width: 100%; background-color: #f0f0f0; border-radius: 5px; margin: 10px 0;">
                    <div id="progress-fill" style="width: 0%; height: 20px; background-color: #4CAF50; border-radius: 5px; transition: width 0.3s ease;"></div>
                </div>
                <p id="loading-text">${message}</p>
            </div>
        `;
        
        this.elements.loading.innerHTML = loadingHTML;
        this.elements.loading.style.display = 'block';
    }
    
    updateProgress(percentage, text) {
        const progressFill = document.getElementById('progress-fill');
        const loadingText = document.getElementById('loading-text');
        
        if (progressFill) {
            progressFill.style.width = percentage + '%';
        }
        
        if (loadingText && text) {
            loadingText.textContent = text;
        }
    }
    
    hideLoading() {
        this.elements.loading.style.display = 'none';
    }
    
    showSheetSelector(workbook, sheetsInfo) {
        this.logger.info('Showing sheet selector', 'uiController', { sheetsCount: sheetsInfo.length });
        
        let selectorHTML = `
            <div class="sheet-selector-container">
                <h3>Seleccionar hojas a imprimir</h3>
                <div class="file-info">
                    <p><strong>Archivo:</strong> ${workbook.fileName || 'Sin nombre'}</p>
                    <p><strong>Total de hojas:</strong> ${sheetsInfo.length}</p>
                </div>
                
                <div class="selection-controls">
                    <button type="button" class="control-btn" onclick="window.selectAllSheets()">Seleccionar todas</button>
                    <button type="button" class="control-btn" onclick="window.selectNoneSheets()">Deseleccionar todas</button>
                    <button type="button" class="control-btn" onclick="window.selectSmallSheets()">Solo hojas pequeñas</button>
                </div>
                
                <div class="sheets-list">
        `;
        
        sheetsInfo.forEach((sheet, index) => {
            const warningClass = sheet.memoryEstimate === 'high' ? 'memory-warning' : '';
            const sizeClass = sheet.memoryEstimate === 'high' ? 'large-sheet' : 
                             sheet.memoryEstimate === 'medium' ? 'medium-sheet' : 'small-sheet';
            
            selectorHTML += `
                <div class="sheet-item ${warningClass}">
                    <div class="sheet-label">
                        <input type="checkbox" class="sheet-checkbox" data-sheet-index="${index}" 
                               ${sheet.memoryEstimate !== 'high' ? 'checked' : ''}>
                        <div class="sheet-info">
                            <div class="sheet-name">${sheet.name}</div>
                            <div class="sheet-details">
                                ${sheet.rowCount} filas × ${sheet.colCount} columnas 
                                ${sheet.cellCount > 0 ? `(${sheet.cellCount.toLocaleString()} celdas)` : '(vacía)'}
                            </div>
                        </div>
                    </div>
                    ${sheet.memoryEstimate === 'high' ? '<span class="warning-badge">⚠️ Hoja grande</span>' : ''}
                    <span class="warning-badge ${sizeClass}">
                        ${sheet.memoryEstimate === 'high' ? 'Grande' : 
                          sheet.memoryEstimate === 'medium' ? 'Mediana' : 'Pequeña'}
                    </span>
                </div>
            `;
        });
        
        selectorHTML += `
                </div>
                
                <div class="load-controls">
                    <button id="loadSelectedButton" type="button">Cargar hojas seleccionadas</button>
                </div>
                
                <div class="error-warning">
                    <p><strong>Nota:</strong> Las hojas grandes pueden tardar más en cargar y consumir más memoria.</p>
                </div>
            </div>
        `;
        
        this.elements.sheetSelector.innerHTML = selectorHTML;
        this.elements.sheetSelector.style.display = 'block';
        
        // Setup load button event
        const loadButton = document.getElementById('loadSelectedButton');
        if (loadButton) {
            loadButton.addEventListener('click', () => {
                const selectedSheets = this.getSelectedSheets(sheetsInfo);
                if (this.onLoadSelectedSheets) {
                    this.onLoadSelectedSheets(selectedSheets);
                }
            });
            this.logger.info('Load selected button event listener added', 'uiController');
        }
        
        // Setup global functions for sheet selection
        this.setupSheetSelectionFunctions(sheetsInfo);
    }
    
    setupSheetSelectionFunctions(sheetsInfo) {
        window.selectAllSheets = () => {
            const checkboxes = document.querySelectorAll('.sheet-checkbox');
            checkboxes.forEach(checkbox => checkbox.checked = true);
        };
        
        window.selectNoneSheets = () => {
            const checkboxes = document.querySelectorAll('.sheet-checkbox');
            checkboxes.forEach(checkbox => checkbox.checked = false);
        };
        
        window.selectSmallSheets = () => {
            const checkboxes = document.querySelectorAll('.sheet-checkbox');
            checkboxes.forEach((checkbox, index) => {
                const sheet = sheetsInfo[index];
                checkbox.checked = sheet && sheet.memoryEstimate !== 'high';
            });
        };
    }
    
    getSelectedSheets(sheetsInfo) {
        const checkboxes = document.querySelectorAll('.sheet-checkbox:checked');
        const selectedSheets = [];
        
        checkboxes.forEach(checkbox => {
            const index = parseInt(checkbox.dataset.sheetIndex);
            if (sheetsInfo[index]) {
                selectedSheets.push(sheetsInfo[index]);
            }
        });
        
        return selectedSheets;
    }
    
    hideSheetSelector() {
        this.elements.sheetSelector.style.display = 'none';
    }
    
    showSpreadsheet() {
        this.logger.info('Showing spreadsheet', 'uiController');
        
        this.elements.body.classList.add('showing-spreadsheet');
        this.elements.luckysheet.style.display = 'block';
        
        // Enable edit and print buttons
        if (this.elements.editButton) {
            this.elements.editButton.disabled = false;
        }
        if (this.elements.printButton) {
            this.elements.printButton.disabled = false;
        }
        
        this.logger.info('Spreadsheet shown, buttons enabled', 'uiController');
    }
    
    showPDFConfigPanel() {
        const panelHTML = `
            <div class="pdf-config-container">
                <h3>Configuración de PDF e Impresión</h3>
                
                <div class="config-info">
                    <p><strong>Configuraciones aplicadas automáticamente:</strong></p>
                    <ul>
                        <li>✅ Márgenes: 0 en todos los lados</li>
                        <li>✅ Centrado: Horizontal y vertical</li>
                        <li>✅ Escalado: Ajustar a 1 página de ancho por 1 de alto</li>
                    </ul>
                </div>
                
                <div class="config-warning">
                    <p><strong>⚠️ Importante:</strong> Asegúrate de que todo el contenido se vea correctamente antes de generar el PDF.</p>
                </div>
                
                <div class="config-controls">
                    <button id="confirmPDFButton" type="button">📄 Generar PDF e Imprimir</button>
                    <button id="cancelPDFButton" type="button">❌ Cancelar</button>
                </div>
            </div>
        `;
        
        this.elements.pdfConfigPanel = document.getElementById('pdfConfigPanel');
        if (this.elements.pdfConfigPanel) {
            this.elements.pdfConfigPanel.innerHTML = panelHTML;
            this.elements.pdfConfigPanel.style.display = 'block';
            
            // Setup event listeners
            const confirmBtn = document.getElementById('confirmPDFButton');
            const cancelBtn = document.getElementById('cancelPDFButton');
            
            if (confirmBtn && this.onConfirmPDF) {
                confirmBtn.addEventListener('click', this.onConfirmPDF);
            }
            
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => this.hidePDFConfigPanel());
            }
        }
    }

    hidePDFConfigPanel() {
        if (this.elements.pdfConfigPanel) {
            this.elements.pdfConfigPanel.style.display = 'none';
        }
    }

    reset() {
        this.hideLoading();
        this.hideSheetSelector();
        this.hideSpreadsheet();
        
        if (this.elements.fileInput) {
            this.elements.fileInput.value = '';
        }
        
        if (this.elements.paperSizeSelect) {
            this.elements.paperSizeSelect.value = 'letter';
        }
        
        this.setPaperSize('letter');
        
        this.logger.info('UI reset completed', 'uiController');
    }
    
    setPaperSize(size) {
        document.body.className = size;
        this.logger.info(`Paper size set to: ${size}`, 'uiController');
    }

    hideSpreadsheet() {
        this.elements.body.classList.remove('showing-spreadsheet');
        this.elements.luckysheet.style.display = 'none';
        
        // Disable buttons
        if (this.elements.editButton) {
            this.elements.editButton.disabled = true;
        }
        if (this.elements.printButton) {
            this.elements.printButton.disabled = true;
        }
        
        this.logger.info('Spreadsheet hidden, buttons disabled', 'uiController');
    }
};