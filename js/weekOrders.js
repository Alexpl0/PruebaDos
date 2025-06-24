/**
 * Premium Freight - Weekly Orders History Page
 * Manages the weekly orders history page functionality with enhanced features:
 * - Week navigation with smooth transitions
 * - Advanced filtering and search capabilities
 * - Batch PDF generation with progress tracking
 * - Responsive design with mobile optimization
 * - Real-time data updates and caching
 * - Enhanced error handling and user feedback
 */

import { getWeekNumber, showLoading, addNotificationStyles } from './utils.js';

// NO importar generatePDF, se usará window.generatePDF

/**
 * Configuration and global variables
 */
let currentWeekOffset = 0;
let allOrdersData = [];
let weeklyDataTable = null;
let isLoading = false;
let dataCache = new Map(); // Cache for API responses

function getBaseURL() {
    return window.URLPF || window.URL_BASE || window.BASE_URL || 'https://grammermx.com/Jesus/PruebaDos/';
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('[WeekOrders] 🚀 Initializing weekly orders page...');
    try {
        addNotificationStyles();
        loadWeeklyData(currentWeekOffset);
        setupWeekNavigation();
        setupKeyboardShortcuts();
        setupPeriodicRefresh();
        setupExportAllPDFButton();
        console.log('[WeekOrders] ✅ Initialization completed successfully');
    } catch (error) {
        console.error('[WeekOrders] ❌ Error during initialization:', error);
        showErrorMessage('Initialization Error', 'Failed to initialize the weekly orders page.');
    }
});

function setupWeekNavigation() {
    const prevBtn = document.getElementById('prevWeek');
    const nextBtn = document.getElementById('nextWeek');
    if (prevBtn) {
        prevBtn.addEventListener('click', async () => {
            if (isLoading) return;
            currentWeekOffset++;
            await loadWeeklyData(currentWeekOffset);
            document.querySelector('.card').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', async () => {
            if (isLoading || currentWeekOffset <= 0) return;
            currentWeekOffset--;
            await loadWeeklyData(currentWeekOffset);
            document.querySelector('.card').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
    console.log('[WeekOrders] 🔄 Week navigation setup completed');
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
        switch (event.key) {
            case 'ArrowLeft':
                if (!isLoading) {
                    event.preventDefault();
                    document.getElementById('prevWeek')?.click();
                }
                break;
            case 'ArrowRight':
                if (!isLoading && currentWeekOffset > 0) {
                    event.preventDefault();
                    document.getElementById('nextWeek')?.click();
                }
                break;
            case 'r':
            case 'R':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    refreshCurrentWeek();
                }
                break;
        }
    });
    console.log('[WeekOrders] ⌨️ Keyboard shortcuts enabled (← → for navigation, Ctrl+R for refresh)');
}

function setupPeriodicRefresh() {
    setInterval(() => {
        if (!document.hidden && !isLoading) {
            console.log('[WeekOrders] 🔄 Performing periodic refresh...');
            refreshCurrentWeek(true); // Silent refresh
        }
    }, 5 * 60 * 1000); // 5 minutes
}

function setupExportAllPDFButton() {
    const exportBtn = document.getElementById('exportWeekPDFBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            const orders = window.weekOrders || [];
            if (orders.length === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'No Orders',
                    text: 'There are no weekly orders to export.'
                });
                return;
            }
            await handleBatchSVGGeneration();
        });
    }
}

async function loadWeeklyData(weekOffset = 0, useCache = true) {
    if (isLoading) {
        console.log('[WeekOrders] ⏳ Already loading data, skipping request');
        return;
    }
    isLoading = true;
    try {
        const loadingMessage = weekOffset === 0 ? 'Loading Current Week' : `Loading Week Data (${Math.abs(weekOffset)} weeks ago)`;
        showLoading(loadingMessage, 'Please wait while we fetch the orders...');
        const baseURL = getBaseURL();
        const cacheKey = `weekly_data_${weekOffset}`;
        if (useCache && dataCache.has(cacheKey)) {
            const cachedData = dataCache.get(cacheKey);
            const cacheAge = Date.now() - cachedData.timestamp;
            if (cacheAge < 2 * 60 * 1000) {
                console.log('[WeekOrders] 💾 Using cached data');
                processWeeklyData(cachedData.data, weekOffset);
                Swal.close();
                isLoading = false;
                return;
            }
        }
        console.log(`[WeekOrders] 🌐 Loading data from: ${baseURL}dao/conections/daoPremiumFreight.php`);
        const response = await fetch(`${baseURL}dao/conections/daoPremiumFreight.php`, {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache',
                'Accept': 'application/json'
            }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const data = await response.json();
        dataCache.set(cacheKey, { data: data, timestamp: Date.now() });
        processWeeklyData(data, weekOffset);
    } catch (error) {
        console.error('[WeekOrders] ❌ Error loading weekly data:', error);
        showErrorMessage('Data Loading Error', `Could not load weekly orders data: ${error.message}`);
    } finally {
        Swal.close();
        isLoading = false;
    }
}

function processWeeklyData(data, weekOffset) {
    try {
        let orders = [];
        if (data && data.status === 'success' && Array.isArray(data.data)) {
            orders = data.data;
        } else if (Array.isArray(data)) {
            orders = data;
        } else {
            throw new Error('Invalid data format received from API');
        }
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - (weekOffset * 7));
        const targetWeek = getWeekNumber(currentDate);
        const targetYear = currentDate.getFullYear();
        const weeklyOrders = orders.filter(order => {
            if (!order || !order.date) return false;
            try {
                const orderDate = new Date(order.date);
                if (isNaN(orderDate.getTime())) return false;
                const orderWeek = getWeekNumber(orderDate);
                const orderYear = orderDate.getFullYear();
                return orderWeek === targetWeek && orderYear === targetYear;
            } catch (error) {
                return false;
            }
        });
        allOrdersData = weeklyOrders;
        window.weekOrders = weeklyOrders; // Para exportar desde botón global
        updateWeekInfo(targetWeek, targetYear, weeklyOrders.length, currentDate);
        updateNavigationButtons();
        populateDataTable(weeklyOrders);
        if (weekOffset === currentWeekOffset && weeklyOrders.length > 0) {
            showSuccessToast(`Loaded ${weeklyOrders.length} orders for week ${targetWeek}`);
        }
    } catch (error) {
        showErrorMessage('Data Processing Error', error.message);
    }
}

function updateWeekInfo(weekNumber, year, orderCount, weekDate) {
    const currentWeekDisplay = document.getElementById('currentWeekDisplay');
    const weeklySubtitle = document.getElementById('weeklySubtitle');
    const startOfWeek = new Date(weekDate);
    const dayOfWeek = startOfWeek.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(startOfWeek.getDate() + mondayOffset);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    const formatOptions = { month: 'short', day: 'numeric' };
    const startStr = startOfWeek.toLocaleDateString('en-US', formatOptions);
    const endStr = endOfWeek.toLocaleDateString('en-US', formatOptions);
    if (currentWeekDisplay) {
        currentWeekDisplay.innerHTML = `
            <div class="text-center">
                <h5 class="mb-1">Week ${weekNumber}, ${year}</h5>
                <small class="text-muted">${startStr} - ${endStr}</small>
            </div>
        `;
    }
    if (weeklySubtitle) {
        const statusText = orderCount === 0 ? 'No orders found' : 
                          orderCount === 1 ? '1 order found' : 
                          `${orderCount.toLocaleString()} orders found`;
        weeklySubtitle.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <span>Premium Freight Weekly Report</span>
                <span class="badge bg-primary">${statusText}</span>
            </div>
        `;
    }
}

function updateNavigationButtons() {
    const nextBtn = document.getElementById('nextWeek');
    const prevBtn = document.getElementById('prevWeek');
    if (nextBtn) {
        nextBtn.disabled = currentWeekOffset === 0 || isLoading;
        nextBtn.innerHTML = isLoading ? 
            '<i class="fas fa-spinner fa-spin"></i> Loading...' : 
            'Next Week <i class="fas fa-chevron-right"></i>';
    }
    if (prevBtn) {
        prevBtn.disabled = isLoading;
        prevBtn.innerHTML = isLoading ? 
            '<i class="fas fa-spinner fa-spin"></i> Loading...' : 
            '<i class="fas fa-chevron-left"></i> Previous Week';
    }
}

function populateDataTable(orders) {
    const tableBody = document.getElementById('weeklyTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    if (orders.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="34" class="text-center py-5">
                    <div class="text-muted">
                        <i class="fas fa-inbox fa-3x mb-3"></i>
                        <h5>No orders found for this week</h5>
                        <p>Try selecting a different week or check back later.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    orders.forEach((order, index) => {
        try {
            const row = createTableRow(order, index);
            tableBody.appendChild(row);
        } catch (error) {
            // Silenciar error de fila individual
        }
    });
    initializeDataTable();
}

function createTableRow(order, index) {
    const row = document.createElement('tr');
    if (index % 2 === 0) row.classList.add('table-row-even');
    const orderDate = order.date ? new Date(order.date) : null;
    const formattedDate = orderDate ? orderDate.toLocaleDateString('en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit'
    }) : '-';
    const monthName = orderDate ? orderDate.toLocaleDateString('en-US', { month: 'long' }) : '-';
    const weekNumber = orderDate ? getWeekNumber(orderDate) : '-';
    const formatCreatorName = (fullName) => {
        if (!fullName) return '-';
        const parts = fullName.trim().split(' ');
        if (parts.length < 2) return fullName;
        return `${parts[0].charAt(0).toUpperCase()}. ${parts[parts.length - 1]}`;
    };
    const formatCost = (cost) => {
        if (!cost || cost === '0') return '-';
        const numCost = parseFloat(cost);
        return isNaN(numCost) ? '-' : `€${numCost.toLocaleString('en-US', {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        })}`;
    };
    const formatWeight = (weight) => {
        if (!weight || weight === '0') return '-';
        const numWeight = parseFloat(weight);
        return isNaN(numWeight) ? '-' : `${numWeight.toLocaleString()} kg`;
    };
    const getApprovalStatus = (order) => {
        const approvalStatus = order.approval_status;
        const requiredLevel = order.required_auth_level || 7;
        if (approvalStatus === null || approvalStatus >= requiredLevel) {
            return '<span class="badge bg-success">Fully Approved</span>';
        } else if (approvalStatus === 99) {
            return '<span class="badge bg-danger">Rejected</span>';
        } else {
            const level = Number(approvalStatus) + 1;
            return `<span class="badge bg-warning">Pending Level ${level}</span>`;
        }
    };
    row.innerHTML = `
        <td class="text-center fw-bold">${order.id || '-'}</td>
        <td>Grammer AG</td>
        <td class="text-center">${order.creator_plant || '-'}</td>
        <td>${order.creator_plant || '-'}</td>
        <td class="text-center">${formattedDate}</td>
        <td class="text-center">
            <span class="badge ${order.in_out_bound === 'Inbound' ? 'bg-info' : 'bg-secondary'}">
                ${order.in_out_bound || '-'}
            </span>
        </td>
        <td class="text-center fw-bold">${weekNumber}</td>
        <td class="text-center">${monthName}</td>
        <td class="text-center">${order.reference_number || '-'}</td>
        <td>${formatCreatorName(order.creator_name)}</td>
        <td class="text-center">${order.area || '-'}</td>
        <td class="truncated-text" title="${(order.description || '').replace(/"/g, '&quot;')}" style="max-width: 300px;">
            ${order.description || '-'}
        </td>
        <td class="text-center">${order.category_cause || '-'}</td>
        <td class="text-end fw-bold text-success">${formatCost(order.cost_euros)}</td>
        <td class="text-center">${order.transport || '-'}</td>
        <td class="text-center">
            <span class="badge ${order.int_ext === 'Internal' ? 'bg-primary' : 'bg-secondary'}">
                ${order.int_ext || '-'}
            </span>
        </td>
        <td>${order.carrier || '-'}</td>
        <td>${order.origin_company_name || '-'}</td>
        <td>${order.origin_city || '-'}</td>
        <td>${order.destiny_company_name || '-'}</td>
        <td>${order.destiny_city || '-'}</td>
        <td class="text-end">${formatWeight(order.weight)}</td>
        <td class="text-center">${order.project_status || '-'}</td>
        <td>${order.approver_name || '-'}</td>
        <td class="text-center">${order.recovery || '-'}</td>
        <td class="text-center">${order.paid_by || '-'}</td>
        <td class="truncated-text" title="${(order.products || '').replace(/"/g, '&quot;')}" style="max-width: 200px;">
            ${order.products || '-'}
        </td>
        <td class="text-center">${order.status_name || '-'}</td>
        <td class="text-center">${order.required_auth_level || '-'}</td>
        <td class="text-center">
            <span class="badge ${order.recovery_file ? 'bg-success' : 'bg-secondary'}">
                ${order.recovery_file ? 'Yes' : 'No'}
            </span>
        </td>
        <td class="text-center">
            <span class="badge ${order.recovery_evidence ? 'bg-success' : 'bg-secondary'}">
                ${order.recovery_evidence ? 'Yes' : 'No'}
            </span>
        </td>
        <td class="text-center">${order.approval_date ? new Date(order.approval_date).toLocaleDateString('en-US') : '-'}</td>
        <td class="text-center">${getApprovalStatus(order)}</td>
        <td class="text-center">
            <button class="btn btn-sm btn-outline-primary generate-pdf-btn" 
                    onclick="generateSinglePDF(${order.id})" 
                    title="Generate PDF for Order ${order.id}">
                <i class="fas fa-file-pdf"></i>
            </button>
        </td>
    `;
    return row;
}

function initializeDataTable() {
    if (weeklyDataTable && $.fn.DataTable.isDataTable('#weeklyHistoryTable')) {
        weeklyDataTable.destroy();
        weeklyDataTable = null;
    }
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - (currentWeekOffset * 7));
    const targetWeek = getWeekNumber(currentDate);
    const targetYear = currentDate.getFullYear();
    weeklyDataTable = $('#weeklyHistoryTable').DataTable({
        lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
        pageLength: 25,
        destroy: true,
        responsive: true,
        processing: true,
        order: [[0, 'desc']],
        columnDefs: [
            { className: "text-center", targets: [0, 2, 4, 5, 6, 7, 8, 10, 12, 15, 22, 27, 28, 29, 30, 31, 32, 33] },
            { className: "text-end", targets: [13, 21] },
            {
                targets: [11, 26],
                render: function(data, type, row) {
                    if (type === 'display' && data && data.length > 50) {
                        return data.substr(0, 50) + '...';
                    }
                    return data;
                }
            }
        ],
        language: {
            lengthMenu: "Show _MENU_ records per page",
            zeroRecords: "No matching records found",
            info: "Showing _START_ to _END_ of _TOTAL_ records",
            infoEmpty: "No records available",
            infoFiltered: "(filtered from _MAX_ total records)",
            search: "Search orders:",
            searchPlaceholder: "Type to search...",
            loadingRecords: "Loading orders...",
            processing: "Processing...",
            paginate: {
                first: "First",
                last: "Last",
                next: "Next",
                previous: "Previous"
            }
        },
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
             '<"row"<"col-sm-12"<"dt-buttons-wrapper"B>>>' +
             '<"row"<"col-sm-12"tr>>' +
             '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
        buttons: [
            {
                extend: 'excel',
                text: '<i class="fas fa-file-excel"></i> Export Excel',
                className: 'btn btn-success btn-sm',
                title: `Weekly_Premium_Freight_W${targetWeek}_${targetYear}`,
                filename: function() {
                    return `Weekly_Premium_Freight_W${targetWeek}_${targetYear}_${new Date().toISOString().split('T')[0]}`;
                },
                exportOptions: {
                    columns: ':visible:not(:last-child)'
                }
            },
            {
                extend: 'pdf',
                text: '<i class="fas fa-file-pdf"></i> Export PDF',
                className: 'btn btn-danger btn-sm',
                orientation: 'landscape',
                pageSize: 'A3',
                title: `Weekly Premium Freight Report - Week ${targetWeek}, ${targetYear}`,
                filename: function() {
                    return `Weekly_Premium_Freight_W${targetWeek}_${targetYear}_${new Date().toISOString().split('T')[0]}`;
                },
                customize: function(doc) {
                    doc.defaultStyle.fontSize = 8;
                    doc.styles.tableHeader.fontSize = 9;
                    doc.styles.tableHeader.fillColor = '#A7CAC3';
                    doc.styles.tableHeader.color = '#000';
                    doc.pageMargins = [15, 40, 15, 40];
                    if (doc.content[1] && doc.content[1].table && doc.content[1].table.body[0]) {
                        const colCount = doc.content[1].table.body[0].length;
                        doc.content[1].table.widths = Array(colCount).fill('*');
                    }
                    doc.content.splice(0, 0, {
                        margin: [0, 0, 0, 20],
                        alignment: 'center',
                        stack: [
                            {
                                text: 'GRAMMER Premium Freight',
                                style: { fontSize: 16, bold: true, color: '#1c4481' }
                            },
                            {
                                text: `Weekly Report - Week ${targetWeek}, ${targetYear}`,
                                style: { fontSize: 12, color: '#666' },
                                margin: [0, 5, 0, 0]
                            }
                        ]
                    });
                    doc.footer = function(currentPage, pageCount) {
                        return {
                            columns: [
                                { 
                                    text: `Generated: ${new Date().toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}`, 
                                    alignment: 'left', 
                                    margin: [15, 0], 
                                    fontSize: 8 
                                },
                                { 
                                    text: `Page ${currentPage} of ${pageCount}`, 
                                    alignment: 'right', 
                                    margin: [0, 0, 15, 0], 
                                    fontSize: 8 
                                }
                            ],
                            margin: [15, 10]
                        };
                    };
                },
                exportOptions: {
                    columns: ':visible:not(:last-child)'
                }
            },
            {
                text: '<i class="fas fa-file-pdf"></i> Generate All PDFs',
                className: 'btn btn-info btn-sm',
                action: async function(e, dt, node, config) {
                    await handleBatchSVGGeneration();
                }
            },
            {
                text: '<i class="fas fa-sync-alt"></i> Refresh',
                className: 'btn btn-outline-primary btn-sm',
                action: function(e, dt, node, config) {
                    refreshCurrentWeek();
                }
            }
        ],
        scrollX: true,
        scrollCollapse: true,
        stateSave: true,
        stateDuration: 60 * 60 * 24,
        initComplete: function(settings, json) {
            $('.dt-buttons-wrapper .btn').addClass('me-2 mb-2');
            $('[data-bs-toggle="tooltip"]').tooltip();
        }
    });
    $('.dataTables_filter input').attr('placeholder', 'Search orders...');
}

/**
 * Handle batch SVG/PDF generation for visible orders with progress tracking
 */
async function handleBatchSVGGeneration() {
    try {
        if (allOrdersData.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'No Data',
                text: 'There are no orders to export for this week',
                customClass: { container: 'swal-on-top' }
            });
            return;
        }
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - (currentWeekOffset * 7));
        const targetWeek = getWeekNumber(currentDate);
        const targetYear = currentDate.getFullYear();
        const confirm = await Swal.fire({
            icon: 'question',
            title: 'Generate PDF Documents',
            html: `
                <div class="text-start">
                    <p><strong>Week:</strong> ${targetWeek}, ${targetYear}</p>
                    <p><strong>Orders:</strong> ${allOrdersData.length}</p>
                    <p>This will generate ${allOrdersData.length} individual PDF documents.</p>
                    <p class="text-warning"><small><i class="fas fa-exclamation-triangle"></i> This process may take several minutes.</small></p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-download"></i> Generate All PDFs',
            cancelButtonText: '<i class="fas fa-times"></i> Cancel',
            confirmButtonColor: '#0d6efd',
            cancelButtonColor: '#6c757d',
            customClass: { container: 'swal-on-top' }
        });
        if (!confirm.isConfirmed) return;
        let currentIndex = 0;
        const totalOrders = allOrdersData.length;
        Swal.fire({
            title: 'Generating PDF Documents',
            html: `
                <div class="text-center">
                    <div class="progress mb-3" style="height: 25px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                             role="progressbar" style="width: 0%" id="progressBar">
                            0%
                        </div>
                    </div>
                    <p class="mb-1">Processing order <span id="currentOrder">1</span> of ${totalOrders}</p>
                    <p class="text-muted" id="currentOrderId">Initializing...</p>
                </div>
            `,
            allowOutsideClick: false,
            allowEscapeKey: false,
            allowEnterKey: false,
            showConfirmButton: false,
            customClass: { container: 'swal-on-top' }
        });
        const successfulDownloads = [];
        const failedDownloads = [];
        for (let i = 0; i < allOrdersData.length; i++) {
            const order = allOrdersData[i];
            currentIndex = i + 1;
            // Update progress
            const progress = Math.round((currentIndex / totalOrders) * 100);
            document.getElementById('progressBar').style.width = `${progress}%`;
            document.getElementById('progressBar').textContent = `${progress}%`;
            document.getElementById('currentOrder').textContent = currentIndex;
            document.getElementById('currentOrderId').textContent = `Order ID: ${order.id}`;
            try {
                const fileName = await window.generatePDF(order, `Weekly_W${targetWeek}_PF_${order.id}_Order`);
                successfulDownloads.push({ orderId: order.id, fileName });
            } catch (error) {
                failedDownloads.push({ orderId: order.id, error: error.message });
            }
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        const successCount = successfulDownloads.length;
        const failureCount = failedDownloads.length;
        if (failureCount === 0) {
            Swal.fire({
                icon: 'success',
                title: 'All PDFs Generated Successfully!',
                html: `
                    <div class="text-center">
                        <p class="mb-3"><strong>${successCount}</strong> PDF documents have been generated and downloaded.</p>
                        <p class="text-muted">Check your downloads folder for the files.</p>
                    </div>
                `,
                confirmButtonText: 'Perfect!',
                customClass: { container: 'swal-on-top' }
            });
        } else {
            Swal.fire({
                icon: 'warning',
                title: 'PDF Generation Completed with Issues',
                html: `
                    <div class="text-start">
                        <p><span class="text-success"><strong>✅ Successful:</strong> ${successCount}</span></p>
                        <p><span class="text-danger"><strong>❌ Failed:</strong> ${failureCount}</span></p>
                        <hr>
                        <p class="text-muted small">Check the browser console for detailed error information.</p>
                    </div>
                `,
                confirmButtonText: 'Understood',
                customClass: { container: 'swal-on-top' }
            });
        }
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Generation Error',
            text: 'An error occurred while generating the documents: ' + error.message,
            customClass: { container: 'swal-on-top' }
        });
    }
}

/**
 * Generate PDF for a single order (called from table button)
 * @param {number} orderId - The order ID
 */
window.generateSinglePDF = async function(orderId) {
    try {
        const order = allOrdersData.find(o => o.id === parseInt(orderId));
        if (!order) {
            throw new Error('Order not found');
        }
        showLoading('Generating PDF', `Creating PDF for Order ${orderId}...`);
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - (currentWeekOffset * 7));
        const targetWeek = getWeekNumber(currentDate);
        const fileName = await window.generatePDF(order, `Weekly_W${targetWeek}_PF_${orderId}_Order`);
        Swal.fire({
            icon: 'success',
            title: 'PDF Generated!',
            html: `The PDF for Order ${orderId} has been downloaded successfully.<br><small class="text-muted">File: ${fileName}</small>`,
            timer: 3000,
            timerProgressBar: true,
            customClass: { container: 'swal-on-top' }
        });
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'PDF Generation Failed',
            text: error.message,
            customClass: { container: 'swal-on-top' }
        });
    }
};

/**
 * Refresh current week data
 * @param {boolean} silent - Whether to show loading indicator
 */
async function refreshCurrentWeek(silent = false) {
    if (isLoading) return;
    const cacheKey = `weekly_data_${currentWeekOffset}`;
    dataCache.delete(cacheKey);
    if (!silent) {
        showSuccessToast('Refreshing data...');
    }
    await loadWeeklyData(currentWeekOffset, false);
}

/**
 * Utility function to show error messages
 * @param {string} title - Error title
 * @param {string} message - Error message
 */
function showErrorMessage(title, message) {
    Swal.fire({
        icon: 'error',
        title: title,
        text: message,
        confirmButtonText: 'OK',
        customClass: { container: 'swal-on-top' }
    });
}

/**
 * Utility function to show success toast
 * @param {string} message - Success message
 */
function showSuccessToast(message) {
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: message,
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
    });
}

// Export functions for use by other modules
export {
    loadWeeklyData,
    handleBatchSVGGeneration,
    refreshCurrentWeek
};

console.log('[WeekOrders] 📋 Module loaded successfully');

// weekOrders.js - Exportación de PDFs y lógica de órdenes semanales

import { getWeekNumber } from './utils.js';
// ...otros imports locales si los tienes...

/**
 * Exporta todas las órdenes de la semana a PDF
 * @param {Array} orders - Lista de órdenes a exportar
 */
async function exportWeekOrdersToPDF(orders) {
    for (const order of orders) {
        try {
            await window.generatePDF(order); // Usar función global
        } catch (error) {
            console.error('Error generating PDF for order', order.id, error);
        }
    }
    Swal.fire({
        icon: 'success',
        title: 'PDFs Generated',
        text: 'All weekly orders have been exported as PDF.'
    });
}

/**
 * Configura el botón para exportar todas las órdenes visibles
 */
document.addEventListener('DOMContentLoaded', function () {
    const exportBtn = document.getElementById('exportWeekPDFBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            // Supón que tienes window.weekOrders o similar
            const orders = window.weekOrders || [];
            if (orders.length === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'No Orders',
                    text: 'There are no weekly orders to export.'
                });
                return;
            }
            await exportWeekOrdersToPDF(orders);
        });
    }
});

/**
 * Maneja la generación de un PDF individual
 * @param {number} orderId - ID de la orden
 */
async function handleSinglePDF(orderId) {
    const order = (window.weekOrders || []).find(o => o.id === parseInt(orderId));
    if (!order) {
        Swal.fire({
            icon: 'error',
            title: 'Order Not Found',
            text: `Order with ID ${orderId} not found.`
        });
        return;
    }
    try {
        await window.generatePDF(order);
        Swal.fire({
            icon: 'success',
            title: 'PDF Generated',
            text: `Order ${orderId} exported as PDF.`
        });
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'PDF Error',
            text: error.message || 'Error generating PDF.'
        });
    }
}

// Exporta funciones si las necesitas en otros módulos
export { exportWeekOrdersToPDF, handleSinglePDF };