// Initial hotfix data with enhanced technical descriptions
const hotfixes = [
    {
        id: 1,
        title: "Authentication Service SMTP Credential Validation Failure",
        problem: "Critical authentication bypass vulnerability detected in the password recovery subsystem. SMTP credential validation was failing due to insufficient encryption protocols and missing OAuth2.0 implementation, leading to potential security breaches in the user authentication pipeline.",
        solution: "Implemented comprehensive credential validation framework using industry-standard encryption protocols. Integrated OAuth2.0 authentication flow with JWT token validation, enhanced SMTP TLS/SSL certificate verification, and deployed multi-factor authentication middleware to strengthen the security perimeter.",
        severity: "critical",
        tags: ["Backend", "Authentication", "Security", "SMTP", "OAuth2.0"]
    },
    {
        id: 2,
        title: "Database Transaction Rollback in Password Management Module",
        problem: "Identified race condition in the password management subsystem causing database integrity violations. Manual password updates were triggering deadlock scenarios in the MySQL transaction handler, resulting in data inconsistency and failed authentication attempts.",
        solution: "Architected robust transaction management system with atomic operations and optimistic locking mechanisms. Implemented database connection pooling with connection timeout handling, added comprehensive error logging, and established automated rollback procedures for failed transactions.",
        severity: "high",
        tags: ["Database", "Backend", "MySQL", "Transactions", "Concurrency"]
    },
    {
        id: 3,
        title: "Currency Conversion API Integration Timeout",
        problem: "Multi-currency approval system experiencing calculation errors due to EUR conversion API latency issues. The microservice responsible for real-time currency conversion was failing to respond within the allocated timeout window, causing incorrect approval threshold calculations.",
        solution: "Engineered high-performance caching layer using Redis for currency rate storage with TTL management. Implemented circuit breaker pattern with exponential backoff retry logic, established fallback currency conversion mechanisms, and optimized API response parsing algorithms.",
        severity: "medium",
        tags: ["Microservices", "API", "Redis", "Currency", "Performance"]
    },
    {
        id: 4,
        title: "Asynchronous Database Write Operations Optimization",
        problem: "Critical performance bottleneck identified in the currency data ingestion pipeline. Database write operations were experiencing timeout failures during high-volume data insertion, causing currency rate synchronization delays and system instability.",
        solution: "Redesigned data ingestion architecture using asynchronous batch processing with message queue implementation. Added connection pooling optimization, implemented database sharding strategies, and deployed monitoring systems with automated alert mechanisms for proactive issue detection.",
        severity: "critical",
        tags: ["Database", "Performance", "Async", "Message Queue", "Optimization"]
    },
    {
        id: 5,
        title: "Order Management System Recovery Validation Logic",
        problem: "Data integrity issues in the order management system's recovery module. Order ID generation algorithm was producing duplicate identifiers during high-concurrency scenarios, leading to transaction conflicts and order processing failures.",
        solution: "Implemented distributed ID generation system using Snowflake algorithm with machine ID allocation. Added comprehensive validation layers, established order state management with finite state machines, and deployed real-time monitoring dashboards for order processing metrics.",
        severity: "high",
        tags: ["Order Management", "Distributed Systems", "Algorithms", "Concurrency"]
    },
    {
        id: 6,
        title: "Client-Side Character Counter Synchronization",
        problem: "Frontend character validation experiencing desynchronization with backend validation rules. The JavaScript character counting mechanism was not properly handling UTF-8 encoding and multi-byte characters, causing form submission failures and user experience degradation.",
        solution: "Deployed comprehensive cache invalidation strategy with versioned static assets. Implemented service worker for offline functionality, added UTF-8 character encoding validation, and established automated browser cache refresh mechanisms using Cache-Control headers.",
        severity: "low",
        tags: ["Frontend", "JavaScript", "UTF-8", "Caching", "UX"]
    },
    {
        id: 7,
        title: "Approval Workflow Analytics Database Schema",
        problem: "Missing comprehensive audit trail for approval workflow processes. The system lacked detailed tracking capabilities for approval decisions, user interactions, and workflow progression, hindering compliance requirements and performance analysis.",
        solution: "Architected sophisticated audit logging system with normalized database schema design. Implemented event sourcing patterns for complete transaction history, added data warehousing capabilities with ETL pipelines, and established comprehensive audit trail with immutable log records.",
        severity: "medium",
        tags: ["Database Design", "Audit Trail", "ETL", "Event Sourcing", "Compliance"]
    },
    {
        id: 8,
        title: "Business Intelligence Dashboard Development",
        problem: "Absence of real-time performance metrics and KPI visualization for approval workflow optimization. Management required comprehensive analytics dashboard to monitor approver performance, system efficiency, and bottleneck identification across the entire approval ecosystem.",
        solution: "Developed enterprise-grade business intelligence platform using modern data visualization frameworks. Implemented real-time data streaming with WebSocket connections, created interactive dashboards with drill-down capabilities, and established automated report generation with scheduled data exports.",
        severity: "medium",
        tags: ["Business Intelligence", "Data Visualization", "WebSockets", "Analytics", "Reporting"]
    },
    {
        id: 9,
        title: "Email Service Infrastructure Scaling Architecture",
        problem: "Email service infrastructure reached critical capacity limits causing service degradation. The monolithic email server architecture was unable to handle increasing transaction volumes, resulting in delayed notifications and potential message queue overflow scenarios.",
        solution: "Designed distributed email service architecture with horizontal scaling capabilities. Implemented load balancing with multiple SMTP server instances, added message queue clustering with RabbitMQ, established email delivery tracking with retry mechanisms, and deployed auto-scaling infrastructure using container orchestration.",
        severity: "critical",
        tags: ["Infrastructure", "Scaling", "Load Balancing", "SMTP", "Container Orchestration"]
    }
];

let filteredHotfixes = [...hotfixes];

// DOM Elements
const hotfixGrid = document.getElementById('hotfixGrid');
const searchInput = document.getElementById('searchInput');
const filterButtons = document.querySelectorAll('.filter-btn');
const addModal = document.getElementById('addModal');
const hotfixForm = document.getElementById('hotfixForm');

// Statistics elements
const totalFixesEl = document.getElementById('totalFixes');
const criticalFixesEl = document.getElementById('criticalFixes');
const systemUptimeEl = document.getElementById('systemUptime');
const avgResolutionEl = document.getElementById('avgResolution');

// Render hotfix cards
function renderHotfixes(hotfixesToRender = filteredHotfixes) {
    hotfixGrid.innerHTML = '';

    hotfixesToRender.forEach(hotfix => {
        const card = document.createElement('div');
        card.className = 'hotfix-card';
        card.innerHTML = `
            <div class="severity-badge severity-${hotfix.severity}">${hotfix.severity.toUpperCase()}</div>
            <div class="problem-title">${hotfix.title}</div>
            <div class="problem-description">${hotfix.problem}</div>
            
            <div class="solution-section">
                <div class="solution-title">
                    ✅ Technical Resolution
                </div>
                <div class="solution-description">${hotfix.solution}</div>
            </div>
            
            <div class="tech-tags">
                ${hotfix.tags.map(tag => `<span class="tech-tag">${tag}</span>`).join('')}
            </div>
        `;
        hotfixGrid.appendChild(card);
    });

    // Add animation to cards
    const cards = document.querySelectorAll('.hotfix-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Search functionality
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase();
    filteredHotfixes = hotfixes.filter(hotfix => 
        hotfix.title.toLowerCase().includes(searchTerm) ||
        hotfix.problem.toLowerCase().includes(searchTerm) ||
        hotfix.solution.toLowerCase().includes(searchTerm) ||
        hotfix.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
    renderHotfixes();
}

// Filter functionality
function handleFilter(filterValue) {
    // Remove active class from all buttons
    filterButtons.forEach(btn => btn.classList.remove('active'));
    
    // Add active class to clicked button
    const clickedButton = document.querySelector(`[data-filter="${filterValue}"]`);
    if (clickedButton) {
        clickedButton.classList.add('active');
    }
    
    // Filter hotfixes
    if (filterValue === 'all') {
        filteredHotfixes = [...hotfixes];
    } else {
        filteredHotfixes = hotfixes.filter(hotfix => hotfix.severity === filterValue);
    }
    
    renderHotfixes();
}

// Modal functionality
function openModal() {
    addModal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeModal() {
    addModal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Restore scrolling
    hotfixForm.reset();
}

// Form submission
function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(hotfixForm);
    const techTagsValue = document.getElementById('techTags').value;
    
    const newHotfix = {
        id: hotfixes.length + 1,
        title: document.getElementById('problemTitle').value,
        problem: document.getElementById('problemDescription').value,
        solution: document.getElementById('solutionDescription').value,
        severity: document.getElementById('severityLevel').value,
        tags: techTagsValue.split(',').map(tag => tag.trim()).filter(tag => tag)
    };
    
    // Add to beginning of array
    hotfixes.unshift(newHotfix);
    filteredHotfixes = [...hotfixes];
    
    // Re-render and update stats
    renderHotfixes();
    updateStats();
    closeModal();
    
    // Show success message (optional)
    showNotification('HotFix added successfully!', 'success');
}

// Update statistics
function updateStats() {
    totalFixesEl.textContent = hotfixes.length;
    criticalFixesEl.textContent = hotfixes.filter(h => h.severity === 'critical').length;
    
    // Calculate uptime based on critical issues (mock calculation)
    const criticalCount = hotfixes.filter(h => h.severity === 'critical').length;
    const uptime = Math.max(95, 100 - (criticalCount * 0.1)).toFixed(1);
    systemUptimeEl.textContent = `${uptime}%`;
    
    // Calculate average resolution time (fixed to 0.5h = 30 min)
    const avgTime = (0.5).toFixed(1);
    avgResolutionEl.textContent = `${avgTime}h`;
}

// Show notification (optional enhancement)
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 10px;
        background: var(--success);
        color: white;
        z-index: 1001;
        transform: translateX(400px);
        transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Event listeners
searchInput.addEventListener('input', handleSearch);

filterButtons.forEach(btn => {
    btn.addEventListener('click', function() {
        const filter = this.dataset.filter;
        handleFilter(filter);
    });
});

hotfixForm.addEventListener('submit', handleFormSubmit);

// Close modal when clicking outside
window.addEventListener('click', function(e) {
    if (e.target === addModal) {
        closeModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && addModal.style.display === 'block') {
        closeModal();
    }
});

// Initialize the dashboard
function initDashboard() {
    renderHotfixes();
    updateStats();
}

// Start the application
document.addEventListener('DOMContentLoaded', initDashboard);

// Export functions for global access (for onclick handlers in HTML)
window.openModal = openModal;
window.closeModal = closeModal;

// Additional utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Debounced search for better performance
const debouncedSearch = debounce(handleSearch, 300);
searchInput.addEventListener('input', debouncedSearch);

// Auto-save functionality for form data (optional)
function saveFormData() {
    const formData = {
        problemTitle: document.getElementById('problemTitle').value,
        problemDescription: document.getElementById('problemDescription').value,
        solutionDescription: document.getElementById('solutionDescription').value,
        severityLevel: document.getElementById('severityLevel').value,
        techTags: document.getElementById('techTags').value
    };
    
    // Note: In a real application, you might want to save to localStorage
    // localStorage.setItem('hotfixFormData', JSON.stringify(formData));
}

// Load saved form data (optional)
function loadFormData() {
    // Note: In a real application, you might want to load from localStorage
    // const savedData = localStorage.getItem('hotfixFormData');
    // if (savedData) {
    //     const formData = JSON.parse(savedData);
    //     // Populate form fields...
    // }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
    }
    
    // Ctrl/Cmd + N to open new hotfix modal
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openModal();
    }
});

// Smooth scroll animation for cards
function animateCards() {
    const cards = document.querySelectorAll('.hotfix-card');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    });
    
    cards.forEach(card => {
        observer.observe(card);
    });
}

// Initialize animations after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(animateCards, 100);
});