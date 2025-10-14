/**
 * JavaScript for dashboard.html - GRAMMER Logistics Intelligent Quotation Portal
 * Main dashboard management with automatic polling and ApexCharts
 * Updated to match database schema (QuoteResponses)
 * @author Alejandro Pérez
 */

import API from './modules/api.js';
import Utils from './modules/utils.js';
import Notifications from './modules/notifications.js';

class GrammerDashboard {
    
    constructor() {
        this.currentFilters = {};
        this.pollingInstance = null;
        this.charts = {};
        this.lastUpdate = null;
        
        // GRAMMER color configuration
        this.grammerColors = {
            primary: '#003366',
            secondary: '#0066CC', 
            accent: '#00A3E0',
            success: '#00AA44',
            warning: '#FF8800',
            danger: '#CC0000'
        };
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeCharts();
        this.loadInitialData();
        this.startAutoRefresh();
        
        console.log('📊 GRAMMER Dashboard initialized');
    }
    
    /**
     * Initialize DOM elements
     */
    initializeElements() {
        // Filters
        this.statusFilter = document.getElementById('statusFilter');
        this.serviceFilter = document.getElementById('serviceFilter');
        this.dateFrom = document.getElementById('dateFrom');
        this.dateTo = document.getElementById('dateTo');
        this.applyFiltersBtn = document.getElementById('applyFiltersBtn');
        this.refreshBtn = document.getElementById('refreshBtn');
        
        // Stats cards
        this.totalRequestsEl = document.getElementById('totalRequests');
        this.pendingRequestsEl = document.getElementById('pendingRequests');
        this.completedRequestsEl = document.getElementById('completedRequests');
        this.completionRateEl = document.getElementById('completionRate');
        
        // Table and content
        this.requestsTableBody = document.getElementById('requestsTableBody');
        this.requestsCount = document.getElementById('requestsCount');
        this.loadingState = document.getElementById('loadingState');
        this.emptyState = document.getElementById('emptyState');
        
        // Modals
        this.requestDetailsModal = new bootstrap.Modal(document.getElementById('requestDetailsModal'));
        this.quotesModal = new bootstrap.Modal(document.getElementById('quotesModal'));
        
        // Auto-refresh indicator
        this.autoRefreshIndicator = document.getElementById('autoRefreshIndicator');
        
        // Top users
        this.topUsersList = document.getElementById('topUsersList');
    }
    
    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Filters
        this.applyFiltersBtn.addEventListener('click', this.applyFilters.bind(this));
        this.refreshBtn.addEventListener('click', this.refreshData.bind(this));
        
        // Enter on date fields
        this.dateFrom.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.applyFilters();
        });
        
        this.dateTo.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.applyFilters();
        });
        
        // Auto-apply filters when selects change
        [this.statusFilter, this.serviceFilter].forEach(filter => {
            filter.addEventListener('change', Utils.debounce(this.applyFilters.bind(this), 500));
        });
        
        // Detect URL parameters
        const urlParams = Utils.getUrlParams();
        if (urlParams.request_id) {
            setTimeout(() => this.showRequestDetails(parseInt(urlParams.request_id)), 1000);
        }
        
        // Visibility events for pausing/resuming polling
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // Cleanup before leaving
        window.addEventListener('beforeunload', this.cleanup.bind(this));
    }
    
    /**
     * Initialize charts with ApexCharts
     */
    initializeCharts() {
        // Activity chart (lines)
        this.charts.activity = new ApexCharts(document.querySelector("#activityChart"), {
            series: [{
                name: 'Requests',
                data: []
            }, {
                name: 'Completed', 
                data: []
            }],
            chart: {
                type: 'area',
                height: 200,
                toolbar: {
                    show: false
                },
                zoom: {
                    enabled: false
                }
            },
            colors: [this.grammerColors.secondary, this.grammerColors.success],
            dataLabels: {
                enabled: false
            },
            stroke: {
                curve: 'smooth',
                width: 3
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.3,
                    opacityTo: 0.1,
                    stops: [0, 90, 100]
                }
            },
            xaxis: {
                categories: [],
                labels: {
                    style: {
                        colors: this.grammerColors.primary
                    }
                }
            },
            yaxis: {
                labels: {
                    style: {
                        colors: this.grammerColors.primary
                    }
                }
            },
            grid: {
                borderColor: '#e0e6ed',
                strokeDashArray: 5
            },
            legend: {
                position: 'bottom',
                horizontalAlign: 'center'
            }
        });
        this.charts.activity.render();
        
        // Services chart (donut) - UPDATED: Now uses shipping_method
        this.charts.services = new ApexCharts(document.querySelector("#servicesChart"), {
            series: [0, 0, 0],
            chart: {
                type: 'donut',
                height: 300
            },
            colors: [this.grammerColors.secondary, this.grammerColors.accent, this.grammerColors.warning],
            labels: ['Fedex', 'Air-Sea', 'Domestic'],
            dataLabels: {
                enabled: true,
                formatter: function (val) {
                    return Math.round(val) + "%";
                },
                style: {
                    fontSize: '14px',
                    fontWeight: 'bold',
                    colors: ['#fff']
                }
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: '70%',
                        labels: {
                            show: true,
                            total: {
                                show: true,
                                label: 'Total',
                                formatter: function (w) {
                                    return w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                                }
                            }
                        }
                    }
                }
            },
            legend: {
                position: 'bottom',
                horizontalAlign: 'center'
            },
            responsive: [{
                breakpoint: 480,
                options: {
                    chart: {
                        height: 250
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }]
        });
        this.charts.services.render();
    }
    
    /**
     * Load initial data
     */
    async loadInitialData() {
        this.showLoadingState(true);
        
        try {
            await this.refreshData();
        } catch (error) {
            Utils.handleError(error, 'Load initial data');
            Notifications.toastError('Error loading initial data');
        } finally {
            this.showLoadingState(false);
        }
    }
    
    /**
     * Refresh all data
     */
    async refreshData() {
        try {
            Utils.setLoadingState(this.refreshBtn, true);
            
            const requestsData = await API.getShippingRequests(this.currentFilters);
            
            this.updateRequestsTable(requestsData.requests);
            this.updateStats(requestsData.stats);
            this.updateCharts(requestsData.stats);
            this.updateTopUsers(requestsData.stats.top_users);
            
            this.lastUpdate = new Date();
            this.updateAutoRefreshIndicator();
            
            console.log('📊 GRAMMER data updated successfully');
            
        } catch (error) {
            Utils.handleError(error, 'Refresh data');
            Notifications.toastError('Error updating data');
        } finally {
            Utils.setLoadingState(this.refreshBtn, false);
        }
    }
    
    /**
     * Apply selected filters
     */
    applyFilters() {
        this.currentFilters = {
            status: this.statusFilter.value || undefined,
            shipping_method: this.serviceFilter.value || undefined, // CHANGED: service_type → shipping_method
            date_from: this.dateFrom.value || undefined,
            date_to: this.dateTo.value || undefined
        };
        
        // Clean undefined values
        Object.keys(this.currentFilters).forEach(key => {
            if (this.currentFilters[key] === undefined) {
                delete this.currentFilters[key];
            }
        });
        
        console.log('🔍 Applying GRAMMER filters:', this.currentFilters);
        this.refreshData();
    }
    
    /**
     * Update requests table
     * @param {Array} requests 
     */
    updateRequestsTable(requests) {
        if (!requests || requests.length === 0) {
            this.showEmptyState(true);
            this.requestsCount.textContent = '0 requests';
            return;
        }
        
        this.showEmptyState(false);
        this.requestsCount.textContent = `${requests.length} request${requests.length !== 1 ? 's' : ''}`;
        
        this.requestsTableBody.innerHTML = '';
        
        requests.forEach(request => {
            const row = this.createRequestRow(request);
            this.requestsTableBody.appendChild(row);
        });
    }
    
    /**
     * Create a table row for a request
     * @param {Object} request 
     * @returns {HTMLElement}
     */
    createRequestRow(request) {
        const row = document.createElement('tr');
        row.className = 'request-row';
        row.dataset.requestId = request.id;
        
        // UPDATED: Map shipping_method to display names
        const methodNames = {
            'fedex': 'Fedex',
            'aereo_maritimo': 'Air-Sea',
            'nacional': 'Domestic'
        };
        
        // UPDATED: Map request_status to display names
        const statusNames = {
            'pending': 'Pending',
            'in_process': 'In Process', // CHANGED: quoting → in_process
            'completed': 'Completed',
            'cancelled': 'Cancelled' // CHANGED: canceled → cancelled
        };
        
        const route = `${request.route_info.origin_country} → ${request.route_info.destination_country}`;
        const methodName = methodNames[request.shipping_method] || request.shipping_method;
        const statusName = statusNames[request.status] || request.status;
        
        row.innerHTML = `
            <td data-label="ID">
                <span class="fw-bold text-grammer-primary">#${request.id}</span>
            </td>
            <td data-label="User">
                <div class="user-info">
                    <strong class="text-grammer-primary">${Utils.sanitizeString(request.user_name)}</strong>
                    <small class="text-muted d-block">${request.created_at_formatted}</small>
                </div>
            </td>
            <td data-label="Route">
                <span class="route-info text-grammer-primary">
                    ${route}
                    ${request.route_info.is_international ? '<i class="fas fa-globe text-grammer-accent ms-1" title="International"></i>' : '<i class="fas fa-map-marker-alt text-grammer-secondary ms-1" title="Domestic"></i>'}
                </span>
            </td>
            <td data-label="Service">
                <span class="grammer-badge bg-grammer-${request.shipping_method === 'fedex' ? 'secondary' : request.shipping_method === 'aereo_maritimo' ? 'accent' : 'success'}">
                    ${methodName}
                </span>
            </td>
            <td data-label="Status">
                <span class="grammer-badge ${this.getStatusBadgeClass(request.status)}">
                    ${statusName}
                </span>
            </td>
            <td data-label="Quotes">
                <div class="d-flex align-items-center">
                    <i class="fas ${request.quote_status.has_quotes ? 'fa-check-circle text-grammer-success' : 'fa-clock text-warning'} me-1"></i>
                    <span class="fw-bold text-grammer-primary">${request.quote_status.total_quotes}</span>
                    ${request.quote_status.selected_quotes > 0 ? `<small class="text-grammer-success ms-1">(${request.quote_status.selected_quotes} sel.)</small>` : ''}
                </div>
            </td>
            <td data-label="Date">
                <span class="text-nowrap text-grammer-primary">${request.created_at_formatted}</span>
                <small class="text-muted d-block">${this.getTimeAgo(request.created_at)}</small>
            </td>
            <td data-label="Actions">
                <div class="action-buttons">
                    <button class="btn btn-sm btn-outline-grammer-primary me-1" onclick="grammerDashboard.showRequestDetails(${request.id})" title="View details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm ${request.quote_status.has_quotes ? 'btn-grammer-success' : 'btn-outline-secondary'}" 
                            onclick="grammerDashboard.showQuotes(${request.id})" 
                            ${!request.quote_status.has_quotes ? 'disabled' : ''}
                            title="View quotes">
                        <i class="fas fa-calculator"></i>
                    </button>
                </div>
            </td>
        `;
        
        return row;
    }
    
    /**
     * Get CSS class for status badge
     * @param {string} status 
     * @returns {string}
     */
    getStatusBadgeClass(status) {
        const classes = {
            'pending': 'bg-warning',
            'in_process': 'bg-grammer-accent', // CHANGED: quoting → in_process
            'completed': 'bg-grammer-success',
            'cancelled': 'bg-danger' // CHANGED: canceled → cancelled
        };
        return classes[status] || 'bg-secondary';
    }
    
    /**
     * Get time ago string
     * @param {string} datetime 
     * @returns {string}
     */
    getTimeAgo(datetime) {
        if (!datetime) return '';
        
        const date = new Date(datetime);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    /**
     * Update statistics cards
     * @param {Object} stats 
     */
    updateStats(stats) {
        if (!stats || !stats.basic) return;
        
        const basic = stats.basic;
        
        this.totalRequestsEl.textContent = basic.total_requests || 0;
        this.pendingRequestsEl.textContent = (basic.pending || 0) + (basic.in_process || 0); // CHANGED
        this.completedRequestsEl.textContent = basic.completed || 0;
        
        // Calculate success rate
        const totalProcessed = (basic.completed || 0) + (basic.cancelled || 0); // CHANGED
        const completionRate = totalProcessed > 0 ? 
            Math.round(((basic.completed || 0) / totalProcessed) * 100) : 0;
            
        this.completionRateEl.textContent = `${completionRate}%`;
    }
    
    /**
     * Update charts with ApexCharts
     * @param {Object} stats 
     */
    updateCharts(stats) {
        // Update activity chart
        if (stats.recent_activity && this.charts.activity) {
            const labels = stats.recent_activity.map(item => 
                new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            );
            const requestsData = stats.recent_activity.map(item => item.requests);
            const completedData = stats.recent_activity.map(item => item.completed);
            
            this.charts.activity.updateOptions({
                xaxis: {
                    categories: labels
                }
            });
            
            this.charts.activity.updateSeries([{
                name: 'Requests',
                data: requestsData
            }, {
                name: 'Completed',
                data: completedData
            }]);
        }
        
        // UPDATED: Update services chart with shipping_method data
        if (stats.by_service_type && this.charts.services) {
            const serviceData = [0, 0, 0]; // fedex, aereo_maritimo, nacional
            const serviceMap = { 'fedex': 0, 'aereo_maritimo': 1, 'nacional': 2 };
            
            stats.by_service_type.forEach(item => {
                const index = serviceMap[item.service_type];
                if (index !== undefined) {
                    serviceData[index] = item.count;
                }
            });
            
            this.charts.services.updateSeries(serviceData);
        }
    }
    
    /**
     * Update most active users list
     * @param {Array} topUsers 
     */
    updateTopUsers(topUsers) {
        if (!topUsers || topUsers.length === 0) {
            this.topUsersList.innerHTML = '<div class="text-center py-3 text-muted">No data available</div>';
            return;
        }
        
        this.topUsersList.innerHTML = '';
        
        topUsers.forEach((user, index) => {
            const userItem = document.createElement('div');
            userItem.className = 'p-3 border-bottom border-grammer-accent';
            
            // Get user initials
            const initials = user.user_name
                .split(' ')
                .map(name => name.charAt(0))
                .join('')
                .substring(0, 2)
                .toUpperCase();
            
            userItem.innerHTML = `
                <div class="d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center">
                        <div class="bg-grammer-gradient text-white rounded-circle d-flex align-items-center justify-content-center" 
                             style="width: 40px; height: 40px; font-size: 14px; font-weight: bold;">
                            ${initials}
                        </div>
                        <div class="ms-3">
                            <div class="fw-bold text-grammer-primary">${Utils.sanitizeString(user.user_name)}</div>
                            <small class="text-muted">Active user</small>
                        </div>
                    </div>
                    <span class="grammer-badge bg-grammer-primary">${user.request_count}</span>
                </div>
            `;
            
            this.topUsersList.appendChild(userItem);
        });
    }
    
    /**
     * Show request details
     * @param {number} requestId 
     */
    async showRequestDetails(requestId) {
        try {
            const modalContent = document.getElementById('requestDetailsContent');
            modalContent.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-grammer-primary"></div>
                    <p class="mt-2 text-grammer-primary">Loading GRAMMER details...</p>
                </div>
            `;
            
            this.requestDetailsModal.show();
            
            // Get request details
            const requestsData = await API.getShippingRequests({ id: requestId });
            const request = requestsData.requests.find(r => r.id === requestId);
            
            if (!request) {
                throw new Error('Request not found');
            }
            
            modalContent.innerHTML = this.generateRequestDetailsHTML(request);
            
        } catch (error) {
            document.getElementById('requestDetailsContent').innerHTML = 
                '<div class="alert alert-danger">Error loading details: ' + error.message + '</div>';
            Utils.handleError(error, 'Show request details');
        }
    }
    
    /**
     * Generate HTML for request details with GRAMMER style
     * @param {Object} request 
     * @returns {string}
     */
    generateRequestDetailsHTML(request) {
        const methodNames = {
            'fedex': 'Fedex Express',
            'aereo_maritimo': 'Air-Sea',
            'nacional': 'Domestic'
        };
        
        const statusNames = {
            'pending': 'Pending',
            'in_process': 'In Process',
            'completed': 'Completed',
            'cancelled': 'Cancelled'
        };
        
        return `
            <div class="row">
                <div class="col-md-6 mb-4">
                    <div class="grammer-info-card p-3">
                        <h6 class="text-grammer-primary mb-3">
                            <i class="fas fa-info-circle me-2"></i>General Information
                        </h6>
                        <div class="row g-3">
                            <div class="col-12">
                                <strong class="text-grammer-primary">ID:</strong>
                                <span class="ms-2">#${request.id}</span>
                            </div>
                            <div class="col-12">
                                <strong class="text-grammer-primary">User:</strong>
                                <span class="ms-2">${Utils.sanitizeString(request.user_name)}</span>
                            </div>
                            <div class="col-12">
                                <strong class="text-grammer-primary">Area:</strong>
                                <span class="ms-2">${request.company_area || 'N/A'}</span>
                            </div>
                            <div class="col-12">
                                <strong class="text-grammer-primary">Method:</strong>
                                <span class="grammer-badge bg-grammer-secondary ms-2">
                                    ${methodNames[request.shipping_method] || request.shipping_method}
                                </span>
                            </div>
                            <div class="col-12">
                                <strong class="text-grammer-primary">Status:</strong>
                                <span class="grammer-badge ${this.getStatusBadgeClass(request.status)} ms-2">
                                    ${statusNames[request.status] || request.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6 mb-4">
                    <div class="grammer-info-card p-3">
                        <h6 class="text-grammer-primary mb-3">
                            <i class="fas fa-chart-bar me-2"></i>Quote Status
                        </h6>
                        <div class="row g-3">
                            <div class="col-6">
                                <div class="text-center">
                                    <div class="h4 text-grammer-accent">${request.quote_status.total_quotes}</div>
                                    <small class="text-muted">Total Received</small>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="text-center">
                                    <div class="h4 text-grammer-success">${request.quote_status.selected_quotes}</div>
                                    <small class="text-muted">Selected</small>
                                </div>
                            </div>
                        </div>
                        
                        ${request.quote_status.has_quotes ? `
                        <div class="mt-3 text-center">
                            <button class="btn btn-grammer-primary" onclick="grammerDashboard.showQuotes(${request.id})">
                                <i class="fas fa-calculator me-2"></i>View Quotes
                            </button>
                        </div>
                        ` : `
                        <div class="alert alert-warning mt-3 mb-0">
                            <i class="fas fa-clock me-2"></i>
                            No quotes received yet.
                        </div>
                        `}
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-12">
                    <div class="grammer-info-card p-3">
                        <h6 class="text-grammer-primary mb-3">
                            <i class="fas fa-route me-2"></i>Route Information
                        </h6>
                        <div class="text-grammer-primary">
                            <div><strong>Origin:</strong> ${request.route_info.origin_country || 'N/A'}</div>
                            <div><strong>Destination:</strong> ${request.route_info.destination_country || 'N/A'}</div>
                            <div><strong>Type:</strong> ${request.route_info.is_international ? 'International' : 'Domestic'}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Show quotes modal
     * @param {number} requestId 
     */
    async showQuotes(requestId) {
        try {
            const modalContent = document.getElementById('quotesModalContent');
            modalContent.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-grammer-primary"></div>
                    <p class="mt-2 text-grammer-primary">Loading quotes...</p>
                </div>
            `;
            
            this.quotesModal.show();
            
            // Get quotes
            const quotesData = await API.getQuotes({ request_id: requestId });
            
            modalContent.innerHTML = this.generateQuotesHTML(quotesData.quotes);
            
        } catch (error) {
            document.getElementById('quotesModalContent').innerHTML = 
                '<div class="alert alert-danger">Error loading quotes: ' + error.message + '</div>';
            Utils.handleError(error, 'Show quotes');
        }
    }
    
    /**
     * Generate quotes HTML
     * @param {Array} quotes 
     * @returns {string}
     */
    generateQuotesHTML(quotes) {
        if (!quotes || quotes.length === 0) {
            return '<div class="alert alert-info">No quotes available for this request.</div>';
        }
        
        let html = '<div class="row">';
        
        quotes.forEach((quote, index) => {
            const costFormatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: quote.currency || 'USD'
            }).format(quote.cost);
            
            html += `
                <div class="col-md-6 mb-3">
                    <div class="card ${quote.is_selected ? 'border-success' : ''}">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <strong>${quote.carrier_name}</strong>
                            ${quote.is_selected ? '<span class="badge bg-success">Selected</span>' : ''}
                        </div>
                        <div class="card-body">
                            <div class="h5 text-grammer-primary mb-2">${costFormatted}</div>
                            <p class="mb-2">
                                <i class="fas fa-clock me-1"></i>
                                <strong>Delivery:</strong> ${quote.estimated_delivery_time || 'N/A'}
                            </p>
                            <p class="mb-0">
                                <i class="fas fa-calendar me-1"></i>
                                <strong>Created:</strong> ${Utils.formatDate(quote.created_at)}
                            </p>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }
    
    /**
     * Show/hide loading state
     */
    showLoadingState(show) {
        if (show) {
            this.loadingState.classList.remove('d-none');
            this.emptyState.classList.add('d-none');
        } else {
            this.loadingState.classList.add('d-none');
        }
    }
    
    /**
     * Show/hide empty state
     */
    showEmptyState(show) {
        if (show) {
            this.emptyState.classList.remove('d-none');
            this.loadingState.classList.add('d-none');
        } else {
            this.emptyState.classList.add('d-none');
        }
    }
    
    /**
     * Update auto-refresh indicator
     */
    updateAutoRefreshIndicator() {
        if (this.autoRefreshIndicator && this.lastUpdate) {
            const timeStr = this.lastUpdate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
            this.autoRefreshIndicator.innerHTML = `
                <i class="fas fa-wifi"></i>
                <small>Updated at ${timeStr}</small>
            `;
        }
    }
    
    /**
     * Start auto-refresh functionality
     */
    startAutoRefresh() {
        // Refresh every 30 seconds
        this.pollingInstance = setInterval(() => {
            if (!document.hidden) {
                this.refreshData();
            }
        }, 30000);
        
        console.log('🔄 Auto-refresh started');
    }
    
    /**
     * Handle visibility change for pausing/resuming
     */
    handleVisibilityChange() {
        if (document.hidden) {
            console.log('🔄 Dashboard hidden - polling paused');
        } else {
            console.log('🔄 Dashboard visible - polling resumed');
            // Refresh data when coming back
            this.refreshData();
        }
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.pollingInstance) {
            clearInterval(this.pollingInstance);
            this.pollingInstance = null;
        }
        
        // Destroy charts
        if (this.charts.activity) {
            this.charts.activity.destroy();
        }
        if (this.charts.services) {
            this.charts.services.destroy();
        }
        
        console.log('📊 GRAMMER Dashboard cleaned up');
    }
}

// Global instance
let grammerDashboard;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    grammerDashboard = new GrammerDashboard();
    
    // Make available globally for onclick handlers
    window.grammerDashboard = grammerDashboard;
});