/**
 * JavaScript for myQuotes.php - User Quote History Portal
 * GRAMMER Logistics & Traffic - Personal Dashboard
 * @author Alejandro Pérez
 */

import API from './modules/api.js';
import Utils from './modules/utils.js';
import Notifications from './modules/notifications.js';

class UserQuotesHistory {
    
    constructor() {
        this.currentFilters = {};
        this.userRequests = [];
        this.charts = {};
        this.lastUpdate = null;
        
        // GRAMMER Colors for charts
        this.grammerColors = {
            primary: '#003366',
            secondary: '#0066CC',
            accent: '#00A3E0',
            success: '#00AA44',
            warning: '#FF8800',
            danger: '#CC0000',
            light: '#F0F8FF'
        };
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeCharts();
        this.loadUserData();
        
        console.log('📊 User Quotes History initialized for:', window.PF_CONFIG.user.name);
    }
    
    /**
     * Initialize DOM elements
     */
    initializeElements() {
        // User info elements
        this.currentUserName = document.getElementById('currentUserName');
        this.currentUserInfo = document.getElementById('currentUserInfo');
        
        // Filter elements
        this.statusFilter = document.getElementById('statusFilter');
        this.methodFilter = document.getElementById('methodFilter');
        this.serviceFilter = document.getElementById('serviceFilter');
        this.quotesFilter = document.getElementById('quotesFilter');
        this.dateFrom = document.getElementById('dateFrom');
        this.applyFiltersBtn = document.getElementById('applyFiltersBtn');
        this.refreshDataBtn = document.getElementById('refreshDataBtn');
        
        // Statistics elements
        this.totalUserRequests = document.getElementById('totalUserRequests');
        this.pendingUserRequests = document.getElementById('pendingUserRequests');
        this.completedUserRequests = document.getElementById('completedUserRequests');
        this.totalQuotesReceived = document.getElementById('totalQuotesReceived');
        
        // Content elements
        this.requestsList = document.getElementById('requestsList');
        this.requestsCount = document.getElementById('requestsCount');
        this.loadingState = document.getElementById('loadingState');
        this.emptyState = document.getElementById('emptyState');
        this.lastUpdated = document.getElementById('lastUpdated');
        
        // Insight elements
        this.avgQuotesPerRequest = document.getElementById('avgQuotesPerRequest');
        this.avgQuoteCost = document.getElementById('avgQuoteCost');
        this.avgResponseTime = document.getElementById('avgResponseTime');
        this.successRate = document.getElementById('successRate');
        
        // Modals
        this.requestDetailsModal = new bootstrap.Modal(document.getElementById('requestDetailsModal'));
        this.quotesModal = new bootstrap.Modal(document.getElementById('quotesModal'));
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Filter and refresh buttons
        this.applyFiltersBtn.addEventListener('click', this.applyFilters.bind(this));
        this.refreshDataBtn.addEventListener('click', this.refreshData.bind(this));
        
        // Auto-apply filters on change
        [this.statusFilter, this.methodFilter, this.serviceFilter, this.quotesFilter].forEach(filter => {
            filter.addEventListener('change', Utils.debounce(this.applyFilters.bind(this), 500));
        });
        
        // Date filter
        this.dateFrom.addEventListener('change', Utils.debounce(this.applyFilters.bind(this), 500));
        
        // Enter key on date field
        this.dateFrom.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.applyFilters();
        });
        
        // Auto-refresh every 2 minutes
        setInterval(this.refreshData.bind(this), 120000);
        
        // Cleanup before page unload
        window.addEventListener('beforeunload', this.cleanup.bind(this));
    }
    
    /**
     * Initialize charts with ApexCharts
     */
    initializeCharts() {
        // Personal Activity Chart (Area)
        this.charts.activity = new ApexCharts(document.querySelector("#personalActivityChart"), {
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
                toolbar: { show: false },
                zoom: { enabled: false }
            },
            colors: [this.grammerColors.secondary, this.grammerColors.success],
            dataLabels: { enabled: false },
            stroke: {
                curve: 'smooth',
                width: 2
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.2,
                    opacityTo: 0.05,
                    stops: [0, 90, 100]
                }
            },
            xaxis: {
                categories: [],
                labels: {
                    style: { colors: this.grammerColors.primary }
                }
            },
            yaxis: {
                labels: {
                    style: { colors: this.grammerColors.primary }
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
        
        // Method Distribution Chart (Donut)
        this.charts.methods = new ApexCharts(document.querySelector("#methodDistributionChart"), {
            series: [0, 0, 0],
            chart: {
                type: 'donut',
                height: 250
            },
            colors: [this.grammerColors.secondary, this.grammerColors.accent, this.grammerColors.success],
            labels: ['Fedex Express', 'Air-Sea', 'Domestic'],
            dataLabels: {
                enabled: true,
                formatter: function (val) {
                    return Math.round(val) + "%";
                },
                style: {
                    fontSize: '12px',
                    fontWeight: 'bold',
                    colors: ['#fff']
                }
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: '60%',
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
                    chart: { height: 200 },
                    legend: { position: 'bottom' }
                }
            }]
        });
        this.charts.methods.render();
    }
    
    /**
     * Load initial user data
     */
    async loadUserData() {
        // Set user info
        const user = window.PF_CONFIG.user;
        if (this.currentUserName) {
            this.currentUserName.textContent = user.name || 'Unknown User';
        }
        if (this.currentUserInfo) {
            this.currentUserInfo.textContent = `${user.email || ''} • Personal Quote History`;
        }
        
        // Load user requests
        await this.refreshData();
    }
    
    /**
     * Refresh user quote data
     */
    async refreshData() {
        try {
            Utils.setLoadingState(this.refreshDataBtn, true);
            this.showLoadingState(true);
            
            const data = await this.fetchUserQuotes();
            
            this.userRequests = data.requests || [];
            this.updateRequestsList(this.userRequests);
            this.updateStatistics(data.stats);
            this.updateCharts(data.stats);
            this.updateInsights(data.stats);
            
            this.lastUpdate = new Date();
            this.updateLastUpdatedIndicator();
            
            console.log('📊 User quotes data refreshed successfully');
            
        } catch (error) {
            Utils.handleError(error, 'Refresh user quotes');
            Notifications.toastError('Error loading your quote history');
        } finally {
            Utils.setLoadingState(this.refreshDataBtn, false);
            this.showLoadingState(false);
        }
    }
    
    /**
     * Fetch user quotes from API
     */
    async fetchUserQuotes() {
        const response = await fetch('../cotizaciones/dao/daoGetUserQuotes.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(this.currentFilters)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Failed to fetch user quotes');
        }
        
        return result.data;
    }
    
    /**
     * Apply current filters
     */
    applyFilters() {
        this.currentFilters = {
            status: this.statusFilter.value || undefined,
            shipping_method: this.methodFilter.value || undefined,
            service_type: this.serviceFilter.value || undefined,
            has_quotes: this.quotesFilter.value || undefined,
            date_from: this.dateFrom.value || undefined
        };
        
        // Clean undefined values
        Object.keys(this.currentFilters).forEach(key => {
            if (this.currentFilters[key] === undefined) {
                delete this.currentFilters[key];
            }
        });
        
        console.log('🔍 Applying user filters:', this.currentFilters);
        this.refreshData();
    }
    
    /**
     * Update requests list display
     */
    updateRequestsList(requests) {
        if (!requests || requests.length === 0) {
            this.showEmptyState(true);
            this.requestsCount.textContent = '0 requests';
            return;
        }
        
        this.showEmptyState(false);
        this.requestsCount.textContent = `${requests.length} request${requests.length !== 1 ? 's' : ''}`;
        
        const listContainer = this.requestsList;
        listContainer.innerHTML = '';
        
        requests.forEach(request => {
            const requestCard = this.createRequestCard(request);
            listContainer.appendChild(requestCard);
        });
    }
    
    /**
     * Create a request card element
     */
    createRequestCard(request) {
        const card = document.createElement('div');
        card.className = 'request-card animate-in';
        card.dataset.requestId = request.id;
        
        const methodNames = {
            'fedex': 'Fedex Express',
            'aereo_maritimo': 'Air-Sea',
            'nacional': 'Domestic'
        };
        
        const serviceNames = {
            'air': 'Air',
            'sea': 'Sea',
            'land': 'Land'
        };
        
        const statusNames = {
            'pending': 'Pending',
            'quoting': 'Quoting',
            'completed': 'Completed',
            'canceled': 'Canceled'
        };
        
        const hasQuotes = request.quote_status.has_quotes;
        const quotesCount = request.quote_status.total_quotes;
        const selectedQuotes = request.quote_status.selected_quotes;
        const costRange = this.formatCostRange(request.quote_status);
        
        card.innerHTML = `
            <div class="request-card-header">
                <div>
                    <span class="request-id">#${request.id}</span>
                    ${request.internal_reference ? `<span class="request-reference">${request.internal_reference}</span>` : ''}
                </div>
                <div class="d-flex gap-2">
                    <span class="status-badge status-${request.status}">${statusNames[request.status] || request.status}</span>
                </div>
            </div>
            
            <div class="request-card-body">
                <div class="request-info-row">
                    <div class="request-info-item">
                        <div class="request-info-label">Method</div>
                        <div class="request-info-value">
                            <span class="method-badge">${methodNames[request.shipping_method] || request.shipping_method}</span>
                        </div>
                    </div>
                    <div class="request-info-item">
                        <div class="request-info-label">Service</div>
                        <div class="request-info-value">
                            <span class="service-badge">${serviceNames[request.service_type] || request.service_type}</span>
                        </div>
                    </div>
                    <div class="request-info-item">
                        <div class="request-info-label">Date</div>
                        <div class="request-info-value">${request.created_at_formatted}</div>
                    </div>
                </div>
                
                <div class="request-route">
                    <i class="fas fa-route me-2"></i>
                    ${this.formatRoute(request.route_info)}
                    ${request.route_info.is_international ? '<i class="fas fa-globe text-grammer-accent ms-2" title="International"></i>' : '<i class="fas fa-map-marker-alt text-grammer-secondary ms-2" title="Domestic"></i>'}
                </div>
            </div>
            
            <div class="request-card-footer">
                <div class="request-quotes-info">
                    <div class="quotes-count">
                        <i class="fas ${hasQuotes ? 'fa-check-circle text-grammer-success' : 'fa-clock text-warning'} me-1"></i>
                        <span>${quotesCount} quote${quotesCount !== 1 ? 's' : ''}</span>
                        ${selectedQuotes > 0 ? `<small class="text-grammer-success ms-1">(${selectedQuotes} selected)</small>` : ''}
                    </div>
                    ${costRange ? `<div class="quotes-cost-range">${costRange}</div>` : ''}
                </div>
                
                <div class="request-actions">
                    <button class="btn btn-sm btn-outline-grammer-primary" onclick="userQuotesHistory.showRequestDetails(${request.id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm ${hasQuotes ? 'btn-grammer-success' : 'btn-outline-secondary'}" 
                            onclick="userQuotesHistory.showQuotes(${request.id})" 
                            ${!hasQuotes ? 'disabled' : ''}
                            title="View Quotes">
                        <i class="fas fa-calculator"></i>
                    </button>
                </div>
            </div>
        `;
        
        return card;
    }
    
    /**
     * Format route information
     */
    formatRoute(routeInfo) {
        if (!routeInfo) return 'N/A';
        
        const origin = routeInfo.origin_country || 'N/A';
        const destination = routeInfo.destination_country || 'N/A';
        
        return `${origin} → ${destination}`;
    }
    
    /**
     * Format cost range for display
     */
    formatCostRange(quoteStatus) {
        if (!quoteStatus.min_cost || !quoteStatus.max_cost) return null;
        
        const min = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(quoteStatus.min_cost);
        
        const max = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(quoteStatus.max_cost);
        
        if (quoteStatus.min_cost === quoteStatus.max_cost) {
            return min;
        }
        
        return `${min} - ${max}`;
    }
    
    /**
     * Update statistics display
     */
    updateStatistics(stats) {
        if (!stats || !stats.basic) return;
        
        const basic = stats.basic;
        
        this.animateStatUpdate(this.totalUserRequests, basic.total_requests || 0);
        this.animateStatUpdate(this.pendingUserRequests, (basic.pending || 0) + (basic.quoting || 0));
        this.animateStatUpdate(this.completedUserRequests, basic.completed || 0);
        this.animateStatUpdate(this.totalQuotesReceived, basic.total_quotes_received || 0);
    }
    
    /**
     * Animate stat number updates
     */
    animateStatUpdate(element, newValue) {
        if (!element) return;
        
        const currentValue = parseInt(element.textContent) || 0;
        
        if (currentValue !== newValue) {
            element.closest('.stat-card').classList.add('pulse');
            
            // Animate number change
            const increment = newValue > currentValue ? 1 : -1;
            const duration = Math.min(Math.abs(newValue - currentValue) * 50, 1000);
            const steps = Math.abs(newValue - currentValue);
            const stepDuration = duration / steps;
            
            let current = currentValue;
            const timer = setInterval(() => {
                current += increment;
                element.textContent = current;
                
                if (current === newValue) {
                    clearInterval(timer);
                    setTimeout(() => {
                        element.closest('.stat-card').classList.remove('pulse');
                    }, 600);
                }
            }, stepDuration);
        }
    }
    
    /**
     * Update charts with user data
     */
    updateCharts(stats) {
        // Update activity chart
        if (stats.monthly_activity && this.charts.activity) {
            const months = stats.monthly_activity.map(item => {
                const date = new Date(item.month + '-01');
                return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            }).reverse();
            
            const requestsData = stats.monthly_activity.map(item => parseInt(item.requests)).reverse();
            const completedData = stats.monthly_activity.map(item => parseInt(item.completed)).reverse();
            
            this.charts.activity.updateOptions({
                xaxis: { categories: months }
            });
            
            this.charts.activity.updateSeries([{
                name: 'Requests',
                data: requestsData
            }, {
                name: 'Completed',
                data: completedData
            }]);
        }
        
        // Update method distribution chart
        if (stats.method_distribution && this.charts.methods) {
            const methodData = [0, 0, 0]; // fedex, aereo_maritimo, nacional
            const methodMap = { 'fedex': 0, 'aereo_maritimo': 1, 'nacional': 2 };
            
            stats.method_distribution.forEach(item => {
                const index = methodMap[item.shipping_method];
                if (index !== undefined) {
                    methodData[index] = parseInt(item.count);
                }
            });
            
            this.charts.methods.updateSeries(methodData);
        }
    }
    
    /**
     * Update insights panel
     */
    updateInsights(stats) {
        if (!stats || !stats.quote_analysis) return;
        
        const analysis = stats.quote_analysis;
        const basic = stats.basic;
        
        // Average quotes per request
        const avgQuotes = analysis.avg_quotes_per_request ? 
            parseFloat(analysis.avg_quotes_per_request).toFixed(1) : '0';
        this.avgQuotesPerRequest.textContent = avgQuotes;
        
        // Average quote cost
        const avgCost = analysis.avg_quote_cost ? 
            new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0
            }).format(analysis.avg_quote_cost) : 'N/A';
        this.avgQuoteCost.textContent = avgCost;
        
        // Average response time
        const avgResponseDays = analysis.avg_response_time_days ?
            parseFloat(analysis.avg_response_time_days).toFixed(1) : '0';
        this.avgResponseTime.textContent = `${avgResponseDays} days`;
        
        // Success rate
        const successRate = basic.success_rate ?
            parseFloat(basic.success_rate).toFixed(1) : '0';
        this.successRate.textContent = `${successRate}%`;
    }
    
    /**
     * Show request details modal
     */
    async showRequestDetails(requestId) {
        try {
            const request = this.userRequests.find(r => r.id === requestId);
            if (!request) {
                throw new Error('Request not found');
            }
            
            const modalContent = document.getElementById('requestDetailsContent');
            modalContent.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-grammer-primary"></div>
                    <p class="mt-2 text-grammer-primary">Loading request details...</p>
                </div>
            `;
            
            this.requestDetailsModal.show();
            
            // Generate detailed HTML
            modalContent.innerHTML = this.generateRequestDetailsHTML(request);
            
        } catch (error) {
            document.getElementById('requestDetailsContent').innerHTML = 
                '<div class="alert alert-danger">Error loading details: ' + error.message + '</div>';
            Utils.handleError(error, 'Show request details');
        }
    }
    
    /**
     * Generate request details HTML
     */
    generateRequestDetailsHTML(request) {
        // Reuse the detailed HTML generation logic from dashboard.js
        // but adapted for user view
        const methodNames = {
            'fedex': 'Fedex Express',
            'aereo_maritimo': 'Air-Sea',
            'nacional': 'Domestic'
        };
        
        const serviceNames = {
            'air': 'Air',
            'sea': 'Sea',
            'land': 'Land'
        };
        
        const statusNames = {
            'pending': 'Pending',
            'quoting': 'Quoting',
            'completed': 'Completed',
            'canceled': 'Canceled'
        };
        
        return `
            <div class="row">
                <div class="col-md-6 mb-4">
                    <div class="grammer-info-card p-3">
                        <h6 class="text-grammer-primary mb-3">
                            <i class="fas fa-info-circle me-2"></i>Request Information
                        </h6>
                        <div class="row g-3">
                            <div class="col-12">
                                <strong class="text-grammer-primary">ID:</strong>
                                <span class="ms-2">#${request.id}</span>
                            </div>
                            <div class="col-12">
                                <strong class="text-grammer-primary">Reference:</strong>
                                <span class="ms-2">${request.internal_reference || 'N/A'}</span>
                            </div>
                            <div class="col-12">
                                <strong class="text-grammer-primary">Method:</strong>
                                <span class="grammer-badge bg-grammer-secondary ms-2">
                                    ${methodNames[request.shipping_method] || request.shipping_method}
                                </span>
                            </div>
                            <div class="col-12">
                                <strong class="text-grammer-primary">Service:</strong>
                                <span class="grammer-badge bg-grammer-accent ms-2">
                                    ${serviceNames[request.service_type] || request.service_type}
                                </span>
                            </div>
                            <div class="col-12">
                                <strong class="text-grammer-primary">Status:</strong>
                                <span class="grammer-badge status-${request.status} ms-2">
                                    ${statusNames[request.status] || request.status}
                                </span>
                            </div>
                            <div class="col-12">
                                <strong class="text-grammer-primary">Created:</strong>
                                <span class="ms-2">${request.created_at_formatted}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6 mb-4">
                    <div class="grammer-info-card p-3">
                        <h6 class="text-grammer-primary mb-3">
                            <i class="fas fa-calculator me-2"></i>Quote Status
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
                            <button class="btn btn-grammer-primary" onclick="userQuotesHistory.showQuotes(${request.id})">
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
                            <strong>From:</strong> ${request.route_info.origin_country || 'N/A'}<br>
                            <strong>To:</strong> ${request.route_info.destination_country || 'N/A'}<br>
                            <strong>Type:</strong> ${request.route_info.is_international ? 'International' : 'Domestic'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Show quotes modal
     */
    async showQuotes(requestId) {
        try {
            const request = this.userRequests.find(r => r.id === requestId);
            if (!request || !request.quotes || request.quotes.length === 0) {
                throw new Error('No quotes available for this request');
            }
            
            const modalContent = document.getElementById('quotesModalContent');
            modalContent.innerHTML = this.generateQuotesHTML(request.quotes);
            
            this.quotesModal.show();
            
        } catch (error) {
            Notifications.toastError('Error loading quotes: ' + error.message);
            Utils.handleError(error, 'Show quotes');
        }
    }
    
    /**
     * Generate quotes HTML
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
                            <strong>${quote.carrier.name}</strong>
                            ${quote.is_selected ? '<span class="badge bg-success">Selected</span>' : ''}
                        </div>
                        <div class="card-body">
                            <div class="h5 text-grammer-primary mb-2">${costFormatted}</div>
                            <p class="mb-2">
                                <i class="fas fa-clock me-1"></i>
                                <strong>Delivery:</strong> ${quote.estimated_delivery_time || 'N/A'}
                            </p>
                            <p class="mb-2">
                                <i class="fas fa-calendar me-1"></i>
                                <strong>Received:</strong> ${quote.created_at_formatted}
                            </p>
                            <p class="mb-0">
                                <i class="fas fa-envelope me-1"></i>
                                <strong>Contact:</strong> ${quote.carrier.email}
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
            this.requestsList.innerHTML = '';
        } else {
            this.emptyState.classList.add('d-none');
        }
    }
    
    /**
     * Update last updated indicator
     */
    updateLastUpdatedIndicator() {
        if (this.lastUpdated && this.lastUpdate) {
            const timeStr = this.lastUpdate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
            this.lastUpdated.innerHTML = `
                <i class="fas fa-sync-alt"></i>
                <small>Updated at ${timeStr}</small>
            `;
        }
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        // Destroy charts
        if (this.charts.activity) {
            this.charts.activity.destroy();
        }
        if (this.charts.methods) {
            this.charts.methods.destroy();
        }
        
        console.log('📊 User Quotes History cleaned up');
    }
}

// Global instance
let userQuotesHistory;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    userQuotesHistory = new UserQuotesHistory();
    
    // Make available globally for onclick handlers
    window.userQuotesHistory = userQuotesHistory;
});