// Project: Excel file processing utilities

window.MiImpresoraWeb = window.MiImpresoraWeb || {};

window.MiImpresoraWeb.ExcelProcessor = class ExcelProcessor {
    constructor() {
        this.logger = new window.MiImpresoraWeb.Logger();
    }
    
    async analyzeExcelFile(file) {
        this.logger.info('Starting file analysis', 'excelProcessor', { 
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size
        });
        
        try {
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            const extension = file.name.split('.').pop().toLowerCase();
            
            // Determine the best reading strategy based on file extension
            let workbook = null;
            const strategies = this.getReadingStrategies(extension, arrayBuffer);
            
            for (let i = 0; i < strategies.length; i++) {
                try {
                    this.logger.info(`Trying reading strategy ${i + 1} for ${extension}`, 'excelProcessor');
                    workbook = strategies[i]();
                    this.logger.success(`File read successfully with strategy ${i + 1}`, 'excelProcessor', {
                        extension: extension,
                        hasStyles: !!(workbook.SSF || workbook.Styles),
                        hasThemes: !!workbook.Themes,
                        hasWorkbookProps: !!workbook.Props,
                        sheetsCount: workbook.SheetNames?.length || 0
                    });
                    break;
                } catch (strategyError) {
                    this.logger.warning(`Strategy ${i + 1} failed for ${extension}`, 'excelProcessor', { 
                        error: strategyError.message 
                    });
                    if (i === strategies.length - 1) {
                        throw strategyError;
                    }
                }
            }
            
            if (!workbook) {
                throw new Error(`All reading strategies failed for ${extension} file`);
            }
            
            // ✅ MEJORAR: Verificar workbook structure antes de analizar sheets
            if (!workbook.SheetNames || !Array.isArray(workbook.SheetNames) || workbook.SheetNames.length === 0) {
                this.logger.error('Invalid workbook structure - no sheet names', 'excelProcessor', {
                    hasSheetNames: !!workbook.SheetNames,
                    sheetNamesType: typeof workbook.SheetNames,
                    sheetNamesLength: workbook.SheetNames?.length,
                    workbookKeys: Object.keys(workbook)
                });
                throw new Error('El archivo no contiene hojas válidas o está corrupto');
            }
            
            if (!workbook.Sheets || typeof workbook.Sheets !== 'object') {
                this.logger.error('Invalid workbook structure - no sheets object', 'excelProcessor', {
                    hasSheets: !!workbook.Sheets,
                    sheetsType: typeof workbook.Sheets,
                    workbookKeys: Object.keys(workbook)
                });
                throw new Error('El archivo no contiene datos de hojas válidos');
            }
            
            // Verificar que al menos una hoja exista en workbook.Sheets
            const availableSheets = Object.keys(workbook.Sheets);
            if (availableSheets.length === 0) {
                this.logger.error('No sheets found in workbook.Sheets', 'excelProcessor', {
                    sheetNames: workbook.SheetNames,
                    availableSheets: availableSheets
                });
                throw new Error('El archivo no contiene hojas con datos');
            }
            
            // Verificar que los nombres coincidan con las hojas disponibles
            const missingSheets = workbook.SheetNames.filter(name => !workbook.Sheets[name]);
            if (missingSheets.length === workbook.SheetNames.length) {
                this.logger.error('All sheet names are missing from workbook.Sheets', 'excelProcessor', {
                    sheetNames: workbook.SheetNames,
                    availableSheets: availableSheets,
                    missingSheets: missingSheets
                });
                throw new Error('Los nombres de las hojas no coinciden con los datos del archivo');
            }
            
            if (missingSheets.length > 0) {
                this.logger.warning('Some sheet names are missing from workbook.Sheets', 'excelProcessor', {
                    sheetNames: workbook.SheetNames,
                    availableSheets: availableSheets,
                    missingSheets: missingSheets
                });
            }
            
            // Analyze sheets
            let sheetsInfo;
            try {
                sheetsInfo = this.analyzeSheets(workbook);
            } catch (analysisError) {
                this.logger.error('Failed to analyze sheets', 'excelProcessor', {
                    error: analysisError.message,
                    workbookValid: !!workbook,
                    sheetCount: workbook.SheetNames?.length
                });
                throw new Error(`Error al analizar las hojas del archivo: ${analysisError.message}`);
            }
            
            // Verificar que al menos una hoja tenga datos
            const sheetsWithData = sheetsInfo.filter(sheet => sheet.hasData);
            if (sheetsWithData.length === 0) {
                this.logger.warning('No sheets with data found', 'excelProcessor', {
                    totalSheets: sheetsInfo.length,
                    sheetsInfo: sheetsInfo.map(s => ({ name: s.name, hasData: s.hasData, error: s.error }))
                });
                // No lanzar error, solo advertir
            }
            
            return {
                workbook: workbook,
                sheetsInfo: sheetsInfo,
                fileName: file.name,
                fileType: extension
            };
            
        } catch (error) {
            this.logger.error('Failed to analyze file', 'excelProcessor', { 
                fileName: file.name, 
                error: error.message,
                stack: error.stack
            });
            
            // Mensaje de error más específico
            let errorMessage = error.message;
            if (error.message.includes('ZIP')) {
                errorMessage = 'El archivo parece estar corrupto o no es un archivo Excel válido';
            } else if (error.message.includes('Invalid workbook')) {
                errorMessage = 'El archivo no tiene una estructura Excel válida';
            } else if (error.message.includes('Cannot read properties')) {
                errorMessage = 'Error al acceder a los datos del archivo. El archivo puede estar corrupto';
            }
            
            throw new Error(`Error al analizar el archivo ${file.name}: ${errorMessage}`);
        }
    }
    
    getReadingStrategies(extension, arrayBuffer) {
        const baseOptions = {
            type: 'array',
            cellDates: true,
            cellNF: true,
            cellText: false,
            sheetStubs: true,
            raw: false
        };

        switch (extension) {
            case 'xlsx':
            case 'xlsm':
            case 'xlsb':
            case 'xltx':
            case 'xltm':
            case 'xlam':
                return [
                    // Strategy 1: Full feature support (sin bookSheets/bookProps/bookFiles)
                    () => XLSX.read(arrayBuffer, {
                        ...baseOptions,
                        cellStyles: true,
                        cellHTML: false,
                        // NO pongas bookSheets, bookProps, bookFiles aquí
                        bookVBA: extension === 'xlsm' || extension === 'xltm' || extension === 'xlam'
                    }),
                    // Strategy 2: Standard with styles
                    () => XLSX.read(arrayBuffer, {
                        ...baseOptions,
                        cellStyles: true
                    }),
                    // Strategy 3: Basic
                    () => XLSX.read(arrayBuffer, baseOptions),
                    // Strategy 4: Minimal
                    () => XLSX.read(arrayBuffer, { type: 'array' })
                ];

            case 'xls':
            case 'xlt':
            case 'xla':
            case 'xlw':
                return [
                    // Strategy 1: Legacy Excel with styles (sin bookSheets/bookProps)
                    () => XLSX.read(arrayBuffer, {
                        ...baseOptions,
                        cellStyles: true
                    }),
                    // Strategy 2: Legacy Excel basic
                    () => XLSX.read(arrayBuffer, {
                        ...baseOptions,
                        cellStyles: false
                    }),
                    // Strategy 3: Simple read
                    () => XLSX.read(arrayBuffer, { type: 'array', cellDates: true }),
                    // Strategy 4: Minimal
                    () => XLSX.read(arrayBuffer, { type: 'array' })
                ];
                
            case 'csv':
            case 'txt':
            case 'prn':
                return [
                    // Strategy 1: CSV with auto-detection
                    () => XLSX.read(arrayBuffer, {
                        type: 'array',
                        raw: false,
                        dateNF: 'yyyy-mm-dd'
                    }),
                    // Strategy 2: Plain text
                    () => XLSX.read(arrayBuffer, {
                        type: 'array',
                        raw: true
                    })
                ];
                
            case 'xml':
                return [
                    // Strategy 1: XML spreadsheet
                    () => XLSX.read(arrayBuffer, {
                        type: 'array',
                        cellDates: true,
                        cellNF: true
                    }),
                    // Strategy 2: Basic XML
                    () => XLSX.read(arrayBuffer, { type: 'array' })
                ];
                
            case 'ods':
                return [
                    // Strategy 1: OpenDocument with features
                    () => XLSX.read(arrayBuffer, {
                        ...baseOptions,
                        cellStyles: true
                    }),
                    // Strategy 2: OpenDocument basic
                    () => XLSX.read(arrayBuffer, baseOptions),
                    // Strategy 3: Minimal
                    () => XLSX.read(arrayBuffer, { type: 'array' })
                ];
                
            case 'slk':
            case 'dif':
                return [
                    // Strategy 1: Specialized format
                    () => XLSX.read(arrayBuffer, {
                        type: 'array',
                        cellDates: true,
                        raw: false
                    }),
                    // Strategy 2: Basic
                    () => XLSX.read(arrayBuffer, { type: 'array' })
                ];
                
            default:
                // Fallback strategies for unknown extensions
                return [
                    () => XLSX.read(arrayBuffer, {
                        ...baseOptions,
                        cellStyles: true
                    }),
                    () => XLSX.read(arrayBuffer, baseOptions),
                    () => XLSX.read(arrayBuffer, { type: 'array', cellDates: true }),
                    () => XLSX.read(arrayBuffer, { type: 'array' })
                ];
        }
    }
    
    analyzeSheets(workbook) {
        const sheetsInfo = [];
        
        // Verificar que el workbook tenga SheetNames
        if (!workbook.SheetNames || !Array.isArray(workbook.SheetNames)) {
            this.logger.error('Invalid workbook.SheetNames', 'excelProcessor', {
                hasSheetNames: !!workbook.SheetNames,
                sheetNamesType: typeof workbook.SheetNames,
                workbookKeys: Object.keys(workbook)
            });
            throw new Error('El workbook no tiene nombres de hojas válidos');
        }
        
        // Verificar que el workbook tenga Sheets
        if (!workbook.Sheets || typeof workbook.Sheets !== 'object') {
            this.logger.error('Invalid workbook.Sheets', 'excelProcessor', {
                hasSheets: !!workbook.Sheets,
                sheetsType: typeof workbook.Sheets,
                workbookKeys: Object.keys(workbook)
            });
            throw new Error('El workbook no tiene hojas válidas');
        }
        
        this.logger.info(`Analyzing ${workbook.SheetNames.length} sheets`, 'excelProcessor', {
            sheetNames: workbook.SheetNames,
            availableSheets: Object.keys(workbook.Sheets)
        });
        
        workbook.SheetNames.forEach((sheetName, index) => {
            try {
                // ✅ CORRECCIÓN: Acceder correctamente a la worksheet
                const worksheet = workbook.Sheets[sheetName];
                
                if (!worksheet) {
                    this.logger.warning(`Worksheet not found: ${sheetName}`, 'excelProcessor', {
                        sheetName: sheetName,
                        availableSheets: Object.keys(workbook.Sheets),
                        sheetIndex: index
                    });
                    
                    sheetsInfo.push({
                        index: index,
                        name: sheetName,
                        rowCount: 0,
                        colCount: 0,
                        cellCount: 0,
                        memoryEstimate: 'unknown',
                        hasData: false,
                        error: 'Worksheet not found'
                    });
                    return;
                }
                
                // Validar que tiene !ref antes de procesarlo
                const range = worksheet['!ref'] ? 
                    XLSX.utils.decode_range(worksheet['!ref']) : 
                    { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
                    
                const rowCount = range.e.r - range.s.r + 1;
                const colCount = range.e.c - range.s.c + 1;
                const cellCount = rowCount * colCount;
                
                // Estimate memory usage
                let memoryEstimate = 'low';
                if (cellCount > 10000) memoryEstimate = 'high';
                else if (cellCount > 5000) memoryEstimate = 'medium';
                
                // Contar celdas con contenido real
                let realCellCount = 0;
                if (worksheet['!ref']) {
                    const realRange = XLSX.utils.decode_range(worksheet['!ref']);
                    for (let r = realRange.s.r; r <= realRange.e.r; r++) {
                        for (let c = realRange.s.c; c <= realRange.e.c; c++) {
                            const cellAddress = XLSX.utils.encode_cell({ r: r, c: c });
                            if (worksheet[cellAddress] && worksheet[cellAddress].v !== undefined) {
                                realCellCount++;
                            }
                        }
                    }
                }
                
                sheetsInfo.push({
                    index: index,
                    name: sheetName,
                    rowCount: rowCount,
                    colCount: colCount,
                    cellCount: cellCount,
                    realCellCount: realCellCount,
                    memoryEstimate: memoryEstimate,
                    hasData: realCellCount > 0,
                    ref: worksheet['!ref'] || 'A1:A1'
                });
                
                this.logger.info(`Sheet analyzed successfully: ${sheetName}`, 'excelProcessor', {
                    rowCount: rowCount,
                    colCount: colCount,
                    cellCount: cellCount,
                    realCellCount: realCellCount,
                    hasData: realCellCount > 0
                });
                
            } catch (error) {
                this.logger.warning(`Could not analyze sheet: ${sheetName}`, 'excelProcessor', { 
                    error: error.message,
                    sheetExists: !!workbook.Sheets[sheetName],
                    worksheetKeys: workbook.Sheets[sheetName] ? Object.keys(workbook.Sheets[sheetName]).slice(0, 10) : [],
                    sheetIndex: index
                });
                
                sheetsInfo.push({
                    index: index,
                    name: sheetName,
                    rowCount: 0,
                    colCount: 0,
                    cellCount: 0,
                    realCellCount: 0,
                    memoryEstimate: 'unknown',
                    hasData: false,
                    error: error.message
                });
            }
        });
        
        this.logger.info('Sheet analysis completed', 'excelProcessor', {
            totalSheets: sheetsInfo.length,
            sheetsWithData: sheetsInfo.filter(s => s.hasData).length,
            sheetsWithErrors: sheetsInfo.filter(s => s.error).length
        });
        
        return sheetsInfo;
    }
    
    convertSheetsToLuckysheet(workbook, selectedSheets) {
        this.logger.info('Converting sheets to Luckysheet format', 'excelProcessor', { 
            totalSheets: workbook.SheetNames?.length || 0,
            selectedSheets: selectedSheets.length,
            workbookHasSheets: !!workbook.Sheets,
            availableSheetNames: workbook.SheetNames || []
        });
        
        // Verificar que el workbook tenga la estructura correcta
        if (!workbook || !workbook.Sheets || !workbook.SheetNames) {
            this.logger.error('Invalid workbook structure', 'excelProcessor', {
                hasWorkbook: !!workbook,
                hasSheets: !!workbook?.Sheets,
                hasSheetNames: !!workbook?.SheetNames,
                workbookKeys: workbook ? Object.keys(workbook) : []
            });
            throw new Error('Estructura de workbook inválida. El archivo puede estar corrupto.');
        }
        
        const luckysheetsData = [];
        
        selectedSheets.forEach((sheetInfo, index) => {
            try {
                let sheetName = sheetInfo.name;
                
                this.logger.info(`Processing sheet: ${sheetName}`, 'excelProcessor', {
                    sheetIndex: index,
                    sheetInfo: sheetInfo,
                    availableSheets: Object.keys(workbook.Sheets)
                });
                
                // ✅ MEJORAR: Verificación más robusta de hojas
                let worksheet = workbook.Sheets[sheetName];
                
                if (!worksheet) {
                    this.logger.warning(`Sheet not found with exact name: ${sheetName}`, 'excelProcessor');
                    
                    // Intentar encontrar por índice
                    const alternativeSheetName = workbook.SheetNames[sheetInfo.index];
                    if (alternativeSheetName && workbook.Sheets[alternativeSheetName]) {
                        this.logger.info(`Using alternative sheet name: ${alternativeSheetName}`, 'excelProcessor');
                        sheetName = alternativeSheetName;
                        worksheet = workbook.Sheets[sheetName];
                    } else {
                        // Intentar buscar por nombre similar (sin espacios, etc.)
                        const normalizedSheetName = sheetName.replace(/\s+/g, '').toLowerCase();
                        const foundSheet = Object.keys(workbook.Sheets).find(key => 
                            key.replace(/\s+/g, '').toLowerCase() === normalizedSheetName
                        );
                        
                        if (foundSheet) {
                            this.logger.info(`Found sheet with normalized name: ${foundSheet}`, 'excelProcessor');
                            sheetName = foundSheet;
                            worksheet = workbook.Sheets[sheetName];
                        } else {
                            this.logger.error(`Sheet not found: ${sheetInfo.name}`, 'excelProcessor', {
                                requestedSheet: sheetInfo.name,
                                availableSheets: Object.keys(workbook.Sheets),
                                sheetNamesArray: workbook.SheetNames,
                                normalizedName: normalizedSheetName
                            });
                            
                            // Continuar con la siguiente hoja en lugar de fallar
                            return;
                        }
                    }
                }
                
                // Convert the worksheet
                const luckysheetData = this.convertWorksheetToLuckysheet(worksheet, sheetName, index);
                luckysheetsData.push(luckysheetData);
                
                this.logger.success(`Sheet converted successfully: ${sheetName}`, 'excelProcessor', {
                    cellCount: luckysheetData.celldata?.length || 0
                });
                
            } catch (error) {
                this.logger.error(`Failed to convert sheet: ${sheetInfo.name}`, 'excelProcessor', { 
                    error: error.message,
                    stack: error.stack,
                    sheetInfo: sheetInfo
                });
                
                // Continuar con las demás hojas
            }
        });
        
        this.logger.info('Sheets conversion completed', 'excelProcessor', {
            originalCount: selectedSheets.length,
            convertedCount: luckysheetsData.length,
            success: luckysheetsData.length > 0
        });
        
        if (luckysheetsData.length === 0) {
            throw new Error('No se pudo convertir ninguna hoja. Verifica que el archivo Excel sea válido.');
        }
        
        return luckysheetsData;
    }
    
    convertWorksheetToLuckysheet(worksheet, sheetName, index) {
        this.logger.info(`Converting worksheet: ${sheetName}`, 'excelProcessor', {
            worksheetExists: !!worksheet,
            hasRef: !!worksheet['!ref'],
            worksheetKeys: worksheet ? Object.keys(worksheet).slice(0, 10) : []
        });
        
        // Verificar que la worksheet sea válida
        if (!worksheet) {
            throw new Error(`Worksheet ${sheetName} is null or undefined`);
        }
        
        // Get sheet range - with fallback for empty sheets
        let range;
        try {
            range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        } catch (error) {
            this.logger.warning(`Invalid range for sheet ${sheetName}, using default`, 'excelProcessor', {
                ref: worksheet['!ref'],
                error: error.message
            });
            range = { s: { r: 0, c: 0 }, e: { r: 99, c: 25 } }; // Default 100x26 range
        }
        
        const rowCount = range.e.r + 1;
        const colCount = range.e.c + 1;
        
        this.logger.info(`Sheet dimensions: ${rowCount}x${colCount}`, 'excelProcessor', {
            range: range,
            ref: worksheet['!ref']
        });
        
        // Convert using enhanced method
        const celldata = this.convertWorksheetToCelldata(worksheet, range);
        
        // Extract merged cells
        const merges = this.extractMergedCells(worksheet);
        
        // Extract column widths and row heights
        const { rowlen, columnlen } = this.extractDimensions(worksheet);
        
        const luckysheetData = {
            name: sheetName,
            index: index.toString(),
            status: index === 0 ? 1 : 0, // first sheet active
            row: Math.max(rowCount, 100), // Minimum 100 rows
            column: Math.max(colCount, 26), // Minimum 26 columns (A-Z)
            celldata: celldata,
            config: {
                merge: merges || {},
                rowlen: rowlen || {},
                columnlen: columnlen || {},
                rowhidden: {},
                colhidden: {},
                borderInfo: [],
                authority: {}
            },
            scrollLeft: 0,
            scrollTop: 0,
            luckysheet_select_save: [{ row: [0, 0], column: [0, 0] }],
            calcChain: [],
            isPivotTable: false,
            pivotTable: {},
            filter_select: {},
            filter: null,
            luckysheet_alternateformat_save: [],
            luckysheet_alternateformat_save_modelCustom: [],
            luckysheet_conditionformat_save: {},
            frozen: {},
            chart: [],
            zoomRatio: 1,
            image: [],
            showGridLines: 1,
            dataVerification: {}
        };
        
        this.logger.success(`Sheet converted successfully: ${sheetName}`, 'excelProcessor', {
            cellCount: celldata.length,
            mergeCount: Object.keys(merges || {}).length,
            hasRowHeights: Object.keys(rowlen || {}).length > 0,
            hasColumnWidths: Object.keys(columnlen || {}).length > 0
        });
        
        return luckysheetData;
    }
    
    convertWorksheetToCelldata(worksheet, range) {
        const celldata = [];
        
        this.logger.info('Converting worksheet cells to celldata', 'excelProcessor', {
            rangeStart: `${range.s.r},${range.s.c}`,
            rangeEnd: `${range.e.r},${range.e.c}`,
            totalCells: (range.e.r - range.s.r + 1) * (range.e.c - range.s.c + 1)
        });
        
        let processedCells = 0;
        let validCells = 0;
        
        // Iterate through all cells in the range
        for (let r = range.s.r; r <= range.e.r; r++) {
            for (let c = range.s.c; c <= range.e.c; c++) {
                processedCells++;
                
                // Create cell address (A1, B1, etc.)
                const cellAddress = XLSX.utils.encode_cell({ r: r, c: c });
                const excelCell = worksheet[cellAddress];
                
                // Skip empty cells unless they have formatting
                if (!excelCell) continue;
                
                try {
                    // Convert Excel cell to Luckysheet format
                    const luckyCell = this.convertCellToLuckysheet(excelCell, r, c);
                    
                    if (luckyCell) {
                        celldata.push({
                            r: r,
                            c: c,
                            v: luckyCell
                        });
                        validCells++;
                    }
                } catch (cellError) {
                    this.logger.warning(`Error converting cell ${cellAddress}`, 'excelProcessor', {
                        error: cellError.message,
                        cellData: excelCell
                    });
                }
            }
        }
        
        this.logger.info('Cell conversion completed', 'excelProcessor', {
            processedCells: processedCells,
            validCells: validCells,
            resultingCelldata: celldata.length
        });
        
        return celldata;
    }
    
    convertCellToLuckysheet(excelCell, row, col) {
        // Base cell structure
        const luckyCell = {
            v: null,  // value
            ct: { fa: 'General', t: 'g' },  // cell type
            m: null,  // display value
            f: null,  // formula
            spl: null // spell check
        };
        
        // Handle value and type
        if (excelCell.v !== undefined) {
            luckyCell.v = excelCell.v;
            luckyCell.m = excelCell.w || excelCell.v?.toString() || '';
            
            // Determine cell type based on Excel cell type
            if (excelCell.t === 'n') {
                // Number
                luckyCell.ct = { fa: 'General', t: 'n' };
                if (excelCell.z) {
                    // Has number format
                    luckyCell.ct.fa = excelCell.z;
                }
            } else if (excelCell.t === 's') {
                // String
                luckyCell.ct = { fa: 'General', t: 's' };
            } else if (excelCell.t === 'b') {
                // Boolean
                luckyCell.ct = { fa: 'General', t: 'b' };
                luckyCell.v = excelCell.v ? 'TRUE' : 'FALSE';
            } else if (excelCell.t === 'd') {
                // Date
                luckyCell.ct = { fa: 'yyyy-mm-dd', t: 'd' };
            } else if (excelCell.t === 'e') {
                // Error
                luckyCell.ct = { fa: 'General', t: 'e' };
            } else {
                // Default to general
                luckyCell.ct = { fa: 'General', t: 'g' };
            }
        }
        
        // Handle formula
        if (excelCell.f) {
            luckyCell.f = '=' + excelCell.f;
        }
        
        // Handle styles
        if (excelCell.s) {
            luckyCell.s = this.convertCellStyle(excelCell.s);
        }
        
        // Only return cell if it has meaningful content
        if (luckyCell.v !== null || luckyCell.f !== null || luckyCell.s) {
            return luckyCell;
        }
        
        return null;
    }
    
    convertCellStyle(excelStyle) {
    const luckyStyle = {};
    
    // Font styles
    if (excelStyle.font) {
        const font = excelStyle.font;
        
        // Font family
        if (font.name) {
            luckyStyle.ff = font.name;
        }
        
        // Font size
        if (font.sz) {
            luckyStyle.fs = font.sz;
        }
        
        // Bold
        if (font.bold) {
            luckyStyle.bl = 1;
        }
        
        // Italic
        if (font.italic) {
            luckyStyle.it = 1;
        }
        
        // Underline
        if (font.underline) {
            luckyStyle.ul = 1;
        }
        
        // Font color
        if (font.color) {
            luckyStyle.fc = this.convertColor(font.color);
        }
    }
    
    // Fill/Background color
    if (excelStyle.fill && excelStyle.fill.bgColor) {
        luckyStyle.bg = this.convertColor(excelStyle.fill.bgColor);
    }
    
    // Alignment
    if (excelStyle.alignment) {
        const align = excelStyle.alignment;
        
        // Horizontal alignment
        if (align.horizontal) {
            luckyStyle.ht = this.convertHorizontalAlignment(align.horizontal);
        }
        
        // Vertical alignment
        if (align.vertical) {
            luckyStyle.vt = this.convertVerticalAlignment(align.vertical);
        }
        
        // Text wrap
        if (align.wrapText) {
            luckyStyle.tb = 1;
        }
    }
    
    // Borders
    if (excelStyle.border) {
        luckyStyle.bd = this.convertBorders(excelStyle.border);
    }
    
    return Object.keys(luckyStyle).length > 0 ? luckyStyle : null;
}
    
    convertColor(excelColor) {
        if (!excelColor) return null;
        
        // RGB color
        if (excelColor.rgb) {
            return '#' + excelColor.rgb.substring(2); // Remove alpha channel
        }
        
        // Indexed color (basic colors)
        if (excelColor.indexed !== undefined) {
            const colorMap = {
                0: '#000000',  // Black
                1: '#FFFFFF',  // White
                2: '#FF0000',  // Red
                3: '#00FF00',  // Green
                4: '#0000FF',  // Blue
                5: '#FFFF00',  // Yellow
                6: '#FF00FF',  // Magenta
                7: '#00FFFF',  // Cyan
                8: '#000000',  // Black
                9: '#FFFFFF',  // White
                10: '#FF0000', // Red
                // Add more colors as needed
            };
            return colorMap[excelColor.indexed] || '#000000';
        }
        
        // Theme color (simplified)
        if (excelColor.theme !== undefined) {
            const themeColors = [
                '#000000', '#FFFFFF', '#E7E6E6', '#44546A', '#5B9BD5', '#70AD47',
                '#A5A5A5', '#FFC000', '#4472C4', '#264478'
            ];
            return themeColors[excelColor.theme] || '#000000';
        }
        
        return null;
    }
    
    convertHorizontalAlignment(horizontal) {
        const alignmentMap = {
            'left': 1,
            'center': 2,
            'right': 3,
            'justify': 4
        };
        return alignmentMap[horizontal] || 1;
    }
    
    convertVerticalAlignment(vertical) {
        const alignmentMap = {
            'top': 1,
            'middle': 2,
            'bottom': 3
        };
        return alignmentMap[vertical] || 2;
    }
    
    convertBorders(excelBorder) {
        const borders = {};
        
        if (excelBorder.top) {
            borders.t = {
                style: this.convertBorderStyle(excelBorder.top.style),
                color: this.convertColor(excelBorder.top.color) || '#000000'
            };
        }
        
        if (excelBorder.bottom) {
            borders.b = {
                style: this.convertBorderStyle(excelBorder.bottom.style),
                color: this.convertColor(excelBorder.bottom.color) || '#000000'
            };
        }
        
        if (excelBorder.left) {
            borders.l = {
                style: this.convertBorderStyle(excelBorder.left.style),
                color: this.convertColor(excelBorder.left.color) || '#000000'
            };
        }
        
        if (excelBorder.right) {
            borders.r = {
                style: this.convertBorderStyle(excelBorder.right.style),
                color: this.convertColor(excelBorder.right.color) || '#000000'
            };
        }
        
        return Object.keys(borders).length > 0 ? borders : null;
    }
    
    convertBorderStyle(style) {
        const styleMap = {
            'thin': 1,
            'medium': 2,
            'thick': 3,
            'double': 4,
            'hair': 1,
            'dotted': 5,
            'dashed': 6,
            'dashDot': 7,
            'dashDotDot': 8
        };
        return styleMap[style] || 1;
    }
    
    convertDateFormat(excelFormat) {
        // Convert Excel date formats to Luckysheet formats
        const formatMap = {
            'mm-dd-yy': 'mm-dd-yyyy',
            'dd/mm/yyyy': 'dd/mm/yyyy',
            'mm/dd/yyyy': 'mm/dd/yyyy',
            'yyyy-mm-dd': 'yyyy-mm-dd',
            'dd-mmm-yy': 'dd-mmm-yyyy',
            'mmm-yy': 'mmm-yyyy'
        };
        
        return formatMap[excelFormat] || 'yyyy-mm-dd';
    }
    
    extractMergedCells(worksheet) {
        const merges = {};
        
        if (worksheet['!merges']) {
            worksheet['!merges'].forEach((merge, index) => {
                const key = `${merge.s.r}_${merge.s.c}`;
                merges[key] = {
                    r: merge.s.r,
                    c: merge.s.c,
                    rs: merge.e.r - merge.s.r + 1,
                    cs: merge.e.c - merge.s.c + 1
                };
            });
        }
        
        return merges;
    }
    
    extractDimensions(worksheet) {
        const rowlen = {};
        const columnlen = {};
        
        // Extract column widths
        if (worksheet['!cols']) {
            worksheet['!cols'].forEach((col, index) => {
                if (col.width) {
                    columnlen[index] = Math.round(col.width * 8.43); // Convert to pixels
                }
            });
        }
        
        // Extract row heights
        if (worksheet['!rows']) {
            worksheet['!rows'].forEach((row, index) => {
                if (row.hpt) {
                    rowlen[index] = Math.round(row.hpt * 1.33); // Convert to pixels
                }
            });
        }
        
        return { rowlen, columnlen };
    }

    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }
};