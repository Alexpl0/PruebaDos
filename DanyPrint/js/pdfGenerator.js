window.MiImpresoraWeb = window.MiImpresoraWeb || {};

window.MiImpresoraWeb.PDFGenerator = class PDFGenerator {
    constructor() {
        this.logger = new window.MiImpresoraWeb.Logger();
        this.paperSizes = {
            letter: { width: 216, height: 279 }, // 8.5" x 11" in mm
            tabloid: { width: 279, height: 432 }, // 11" x 17" in mm
            a3: { width: 297, height: 420 }, // A3 in mm
            legal: { width: 216, height: 356 } // 8.5" x 14" in mm
        };
    }

    async generatePDF(options = {}) {
        const {
            paperSize = 'letter',
            orientation = 'portrait',
            onProgress = () => {},
            filename = 'excel-export.pdf'
        } = options;

        this.logger.info('Starting PDF generation', 'pdfGenerator', { paperSize, orientation, filename });

        try {
            // Verificar librerías
            if (!window.jsPDF || !window.html2canvas) {
                throw new Error('PDF libraries not loaded (jsPDF or html2canvas)');
            }

            onProgress(10, 'Preparando hojas para captura...');

            // Get all sheets from Luckysheet
            const sheets = await this.getAllSheetsData();
            if (!sheets || sheets.length === 0) {
                throw new Error('No hay hojas disponibles para convertir a PDF');
            }

            this.logger.info(`Found ${sheets.length} sheets to process`, 'pdfGenerator');

            // Get paper dimensions
            const paperDim = this.paperSizes[paperSize];
            if (!paperDim) {
                throw new Error(`Tamaño de papel no soportado: ${paperSize}`);
            }

            // Create PDF document
            const { jsPDF } = window.jsPDF;
            const pdf = new jsPDF({
                orientation: orientation,
                unit: 'mm',
                format: [paperDim.width, paperDim.height],
                compress: true
            });

            onProgress(20, 'Iniciando captura de hojas...');

            // Process each sheet
            for (let i = 0; i < sheets.length; i++) {
                const sheet = sheets[i];
                const progress = 20 + (60 * i / sheets.length);
                
                onProgress(progress, `Procesando hoja: ${sheet.name}`);

                try {
                    await this.addSheetToPDF(pdf, sheet, i, paperDim, orientation);
                } catch (sheetError) {
                    this.logger.error(`Failed to process sheet: ${sheet.name}`, 'pdfGenerator', { 
                        error: sheetError.message 
                    });
                    // Continue with other sheets
                }
            }

            onProgress(85, 'Finalizando PDF...');

            // Generate PDF blob
            const pdfBlob = pdf.output('blob');
            
            onProgress(100, 'PDF generado exitosamente');

            this.logger.success('PDF generated successfully', 'pdfGenerator', {
                pages: pdf.getNumberOfPages(),
                fileSize: pdfBlob.size
            });

            return {
                blob: pdfBlob,
                url: URL.createObjectURL(pdfBlob),
                filename: filename,
                pages: pdf.getNumberOfPages()
            };

        } catch (error) {
            this.logger.error('PDF generation failed', 'pdfGenerator', { error: error.message });
            throw error;
        }
    }

    async getAllSheetsData() {
        if (!window.luckysheet || !window.luckysheet.getluckysheetfile) {
            throw new Error('Luckysheet no está disponible');
        }

        const sheets = window.luckysheet.getluckysheetfile();
        return sheets || [];
    }

    async addSheetToPDF(pdf, sheet, sheetIndex, paperDim, orientation) {
        this.logger.info(`Processing sheet: ${sheet.name}`, 'pdfGenerator');

        try {
            // Switch to the sheet in Luckysheet
            if (window.luckysheet.setWorksheetActive) {
                window.luckysheet.setWorksheetActive(sheet.index);
            }

            // Wait for sheet to load
            await new Promise(resolve => setTimeout(resolve, 500));

            // Get the sheet container
            const container = document.getElementById('luckysheet');
            if (!container) {
                throw new Error('Luckysheet container not found');
            }

            // Find the actual sheet content
            const sheetContent = container.querySelector('.luckysheet-cell-main') || 
                               container.querySelector('.luckysheet-sheet-content') ||
                               container;

            if (!sheetContent) {
                this.logger.warning(`No content found for sheet: ${sheet.name}`, 'pdfGenerator');
                return;
            }

            // Configure html2canvas options
            const canvasOptions = {
                allowTaint: true,
                useCORS: true,
                scale: 2, // Higher resolution
                logging: false,
                width: sheetContent.scrollWidth,
                height: sheetContent.scrollHeight,
                backgroundColor: '#ffffff'
            };

            // Capture the sheet as canvas
            const canvas = await window.html2canvas(sheetContent, canvasOptions);
            
            // Add new page (except for first sheet)
            if (sheetIndex > 0) {
                pdf.addPage([paperDim.width, paperDim.height], orientation);
            }

            // Calculate dimensions to fit page with margins = 0
            const pageWidth = paperDim.width;
            const pageHeight = paperDim.height;
            
            // Calculate scaling to fit to 1 page wide by 1 tall
            const scaleX = pageWidth / (canvas.width / canvasOptions.scale);
            const scaleY = pageHeight / (canvas.height / canvasOptions.scale);
            const scale = Math.min(scaleX, scaleY);

            const finalWidth = (canvas.width / canvasOptions.scale) * scale;
            const finalHeight = (canvas.height / canvasOptions.scale) * scale;

            // Center on page
            const x = (pageWidth - finalWidth) / 2;
            const y = (pageHeight - finalHeight) / 2;

            // Add image to PDF
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            pdf.addImage(imgData, 'JPEG', x, y, finalWidth, finalHeight);

            this.logger.success(`Sheet added to PDF: ${sheet.name}`, 'pdfGenerator', {
                originalSize: `${canvas.width}x${canvas.height}`,
                finalSize: `${finalWidth.toFixed(1)}x${finalHeight.toFixed(1)}mm`,
                position: `${x.toFixed(1)},${y.toFixed(1)}mm`
            });

        } catch (error) {
            this.logger.error(`Failed to add sheet to PDF: ${sheet.name}`, 'pdfGenerator', { 
                error: error.message 
            });
            throw error;
        }
    }

    async showPrintDialog(pdfResult) {
        this.logger.info('Showing print dialog', 'pdfGenerator');

        try {
            // Create a new window/iframe for printing
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            
            if (!printWindow) {
                throw new Error('No se pudo abrir la ventana de impresión. Verifica que los pop-ups estén habilitados.');
            }

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Imprimir - ${pdfResult.filename}</title>
                    <style>
                        body {
                            margin: 0;
                            padding: 20px;
                            font-family: Arial, sans-serif;
                            background-color: #f5f5f5;
                        }
                        .container {
                            max-width: 800px;
                            margin: 0 auto;
                            background: white;
                            padding: 20px;
                            border-radius: 8px;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 20px;
                        }
                        .pdf-viewer {
                            width: 100%;
                            height: 500px;
                            border: 1px solid #ddd;
                            margin-bottom: 20px;
                        }
                        .controls {
                            text-align: center;
                            display: flex;
                            gap: 10px;
                            justify-content: center;
                            flex-wrap: wrap;
                        }
                        button {
                            padding: 10px 20px;
                            font-size: 16px;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            transition: background-color 0.3s;
                        }
                        .print-btn {
                            background-color: #007bff;
                            color: white;
                        }
                        .print-btn:hover {
                            background-color: #0056b3;
                        }
                        .download-btn {
                            background-color: #28a745;
                            color: white;
                        }
                        .download-btn:hover {
                            background-color: #218838;
                        }
                        .close-btn {
                            background-color: #6c757d;
                            color: white;
                        }
                        .close-btn:hover {
                            background-color: #545b62;
                        }
                        .info {
                            background-color: #e3f2fd;
                            padding: 10px;
                            border-radius: 4px;
                            margin-bottom: 20px;
                            color: #1565c0;
                        }
                        @media print {
                            body { margin: 0; padding: 0; background: white; }
                            .container { box-shadow: none; max-width: none; padding: 0; }
                            .controls, .info { display: none; }
                            .pdf-viewer { height: auto; border: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2>Vista previa de impresión</h2>
                        </div>
                        
                        <div class="info">
                            <p><strong>Archivo:</strong> ${pdfResult.filename}</p>
                            <p><strong>Páginas:</strong> ${pdfResult.pages}</p>
                            <p><strong>Tamaño:</strong> ${(pdfResult.blob.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        
                        <embed class="pdf-viewer" src="${pdfResult.url}" type="application/pdf">
                        
                        <div class="controls">
                            <button class="print-btn" onclick="window.print()">
                                🖨️ Imprimir
                            </button>
                            <button class="download-btn" onclick="downloadPDF()">
                                💾 Descargar PDF
                            </button>
                            <button class="close-btn" onclick="window.close()">
                                ❌ Cerrar
                            </button>
                        </div>
                    </div>
                    
                    <script>
                        function downloadPDF() {
                            const link = document.createElement('a');
                            link.href = '${pdfResult.url}';
                            link.download = '${pdfResult.filename}';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }
                        
                        // Auto-focus the print button
                        window.onload = function() {
                            document.querySelector('.print-btn').focus();
                        };
                    </script>
                </body>
                </html>
            `);
            
            printWindow.document.close();

            this.logger.success('Print dialog opened', 'pdfGenerator');

        } catch (error) {
            this.logger.error('Failed to show print dialog', 'pdfGenerator', { error: error.message });
            
            // Fallback: trigger direct download
            this.downloadPDF(pdfResult);
        }
    }

    downloadPDF(pdfResult) {
        try {
            const link = document.createElement('a');
            link.href = pdfResult.url;
            link.download = pdfResult.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.logger.success('PDF download triggered', 'pdfGenerator');
        } catch (error) {
            this.logger.error('Failed to download PDF', 'pdfGenerator', { error: error.message });
        }
    }
};