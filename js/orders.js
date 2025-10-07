/**
 * Premium Freight - Main Orders Module (Refactored with Approval Role Selector)
 * Coordinates all order-related functionality, including pagination, search, filtering, and role selection.
 */

import { addNotificationStyles } from './utils.js';
import { createCards, getSearchInput } from './cards.js';
import { setupModalEventListeners } from './modals.js';
import { approveOrder, rejectOrder } from './approval.js';

// --- State Variables ---
let currentPage = 1;
const ordersPerPage = 24;
let currentSearchQuery = '';
let debounceTimer;
let userApprovalRoles = []; // Almacena los roles de aprobación del usuario
let selectedRole = null; // Rol actualmente seleccionado por el usuario

document.addEventListener('DOMContentLoaded', function() {
    Swal.fire({
        title: 'Loading Application', text: 'Please wait...', allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    addNotificationStyles();
    
    // Primero cargar los roles del usuario
    loadUserApprovalRoles().then(() => {
        // Después de cargar roles, cargar los datos de órdenes
        loadOrderData(currentPage, currentSearchQuery);
    });
    
    // Setup modal buttons
    document.querySelector('#myModal .modal-buttons').innerHTML = `
        <button id="savePdfBtn" class="save-pdf-button icon-only-btn" title="Save as PDF"><i class="fas fa-file-pdf"></i></button>
        <button id="approveBtn" class="icon-only-btn" title="Approve Order"><i class="fas fa-check-circle"></i></button>
        <button id="rejectBtn" class="icon-only-btn" title="Reject Order"><i class="fas fa-times-circle"></i></button>
    `;

    try {
        setupModalEventListeners();
        document.getElementById('approveBtn')?.addEventListener('click', handleApprovalClick);
        document.getElementById('rejectBtn')?.addEventListener('click', handleRejectionClick);
        setupSearchListener();
        setupFilterButtons();
    } catch (error) {
        console.error('Error setting up event listeners:', error);
        Swal.fire({ icon: 'error', title: 'Initialization Error', text: 'There was a problem initializing the application.' });
    }
});

/**
 * Carga los roles de aprobación del usuario actual desde el servidor
 * @returns {Promise}
 */
async function loadUserApprovalRoles() {
    const URLPF = window.PF_CONFIG.app.baseURL;
    const fetchUrl = `${URLPF}dao/conections/daoGetUserApprovalRoles.php`;

    try {
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        
        const apiResponse = await response.json();
        
        if (apiResponse.status === 'success' && apiResponse.data) {
            userApprovalRoles = apiResponse.data;
            
            // Si el usuario tiene múltiples roles, crear el selector
            if (userApprovalRoles.length > 1) {
                createRoleSelector();
            }
        }
    } catch (error) {
        console.error('Error loading user approval roles:', error);
        // No es crítico si falla, simplemente no se mostrará el selector
    }
}

/**
 * Crea un selector de roles en lugar del título estático cuando el usuario tiene múltiples roles
 */
function createRoleSelector() {
    const title2Element = document.getElementById('title2');
    if (!title2Element) return;

    // Crear el contenedor del selector
    const selectorContainer = document.createElement('div');
    selectorContainer.className = 'role-selector-container';
    selectorContainer.style.cssText = 'margin: 20px 0; text-align: center;';

    // Crear el label
    const label = document.createElement('label');
    label.textContent = 'View orders for role: ';
    label.style.cssText = 'font-size: 1.1em; color: #333; margin-right: 10px; font-weight: 500;';

    // Crear el select
    const select = document.createElement('select');
    select.id = 'roleSelector';
    select.className = 'form-select';
    select.style.cssText = 'display: inline-block; width: auto; min-width: 300px; padding: 8px 12px; font-size: 1em;';

    // Opción por defecto (vista global)
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'All Orders (Global View)';
    select.appendChild(defaultOption);

    // Agregar opciones para cada rol
    userApprovalRoles.forEach(role => {
        const option = document.createElement('option');
        option.value = JSON.stringify({
            approval_level: role.approval_level,
            plant: role.plant
        });
        option.textContent = role.display_name;
        select.appendChild(option);
    });

    // Evento de cambio
    select.addEventListener('change', function() {
        const value = this.value;
        if (value === '') {
            // Vista global - cargar todas las órdenes
            selectedRole = null;
            currentSearchQuery = '';
            getSearchInput().value = '';
            loadOrderData(1, currentSearchQuery);
        } else {
            // Vista filtrada por rol
            selectedRole = JSON.parse(value);
            currentSearchQuery = '';
            getSearchInput().value = '';
            loadOrderDataByRole(1, currentSearchQuery);
        }
    });

    selectorContainer.appendChild(label);
    selectorContainer.appendChild(select);

    // Reemplazar el título estático con el selector
    title2Element.replaceWith(selectorContainer);
}

/**
 * Fetches order data from the paginated backend endpoint (vista global)
 * @param {number} page - The page number to load.
 * @param {string} search - The search query.
 */
function loadOrderData(page, search = '') {
    Swal.fire({
        title: 'Loading Orders...', text: 'Please wait.', allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    const URLPF = window.PF_CONFIG.app.baseURL;
    const fetchUrl = new URL(`${URLPF}dao/conections/daoOrdersByPage.php`);
    fetchUrl.searchParams.append('page', page);
    fetchUrl.searchParams.append('limit', ordersPerPage);
    if (search) {
        fetchUrl.searchParams.append('search', search);
    }

    fetch(fetchUrl)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return response.json();
        })
        .then(apiResponse => {
            if (apiResponse.status !== 'success' || !apiResponse.data || !apiResponse.pagination) {
                throw new Error('Invalid API response format');
            }
            
            const { data: orders, pagination } = apiResponse;
            window.allOrders = orders;
            
            updatePageTitleGlobal(window.PF_CONFIG.user.plant, orders.length, pagination.total);
            createCards(orders);
            setupPagination(pagination);
            Swal.close();
        })
        .catch(error => {
            console.error('Error loading data:', error);
            Swal.fire({ icon: 'error', title: 'Data Loading Error', text: 'Could not load orders data.' });
            document.getElementById("card").innerHTML = '<p class="text-center text-danger">Failed to load orders.</p>';
            document.getElementById("pagination-container").innerHTML = '';
        });
}

/**
 * Fetches order data filtered by the selected approval role
 * @param {number} page - The page number to load.
 * @param {string} search - The search query.
 */
function loadOrderDataByRole(page, search = '') {
    if (!selectedRole) {
        loadOrderData(page, search);
        return;
    }

    Swal.fire({
        title: 'Loading Orders...', text: 'Please wait.', allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    const URLPF = window.PF_CONFIG.app.baseURL;
    const fetchUrl = new URL(`${URLPF}dao/conections/daoOrdersByApprovalLevel.php`);
    fetchUrl.searchParams.append('page', page);
    fetchUrl.searchParams.append('limit', ordersPerPage);
    fetchUrl.searchParams.append('approval_level', selectedRole.approval_level);
    if (selectedRole.plant !== null) {
        fetchUrl.searchParams.append('plant', selectedRole.plant);
    }
    if (search) {
        fetchUrl.searchParams.append('search', search);
    }

    fetch(fetchUrl)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return response.json();
        })
        .then(apiResponse => {
            if (apiResponse.status !== 'success' || !apiResponse.data || !apiResponse.pagination) {
                throw new Error('Invalid API response format');
            }
            
            const { data: orders, pagination, filter } = apiResponse;
            window.allOrders = orders;
            
            updatePageTitleFiltered(filter, orders.length, pagination.total);
            createCards(orders);
            setupPagination(pagination);
            Swal.close();
        })
        .catch(error => {
            console.error('Error loading filtered data:', error);
            Swal.fire({ icon: 'error', title: 'Data Loading Error', text: 'Could not load filtered orders data.' });
            document.getElementById("card").innerHTML = '<p class="text-center text-danger">Failed to load orders.</p>';
            document.getElementById("pagination-container").innerHTML = '';
        });
}

/**
 * Load warning data from the warnings endpoint
 */
function loadWarningData() {
    Swal.fire({
        title: 'Loading Warnings...', text: 'Finding orders that need attention.', allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    const URLPF = window.PF_CONFIG.app.baseURL;
    const fetchUrl = new URL(`${URLPF}dao/conections/daoWarningCards.php`);

    fetch(fetchUrl)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return response.json();
        })
        .then(apiResponse => {
            if (apiResponse.status !== 'success' || !apiResponse.data) {
                throw new Error('Invalid API response format for warnings');
            }
            
            const { data: orders } = apiResponse;
            window.allOrders = orders;
            
            updatePageTitleWarnings(orders.length);
            createCards(orders);
            Swal.close();
        })
        .catch(error => {
            console.error('Error loading warning data:', error);
            Swal.fire({ icon: 'error', title: 'Data Loading Error', text: 'Could not load warning orders data.' });
            document.getElementById("card").innerHTML = '<p class="text-center text-danger">Failed to load warning orders.</p>';
        });
}

/**
 * Creates and manages the pagination controls with intelligent page linking.
 * @param {object} pagination - The pagination object from the API { total, page, totalPages }.
 */
function setupPagination({ total, page, totalPages }) {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) return;

    paginationContainer.innerHTML = '';
    if (totalPages <= 1) return;

    currentPage = page;

    const createPageLink = (p, text, isDisabled = false, isActive = false, isEllipsis = false) => {
        const li = document.createElement('li');
        li.className = `page-item ${isDisabled ? 'disabled' : ''} ${isActive ? 'active' : ''} ${isEllipsis ? 'ellipsis' : ''}`;
        
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.dataset.page = p;
        a.innerHTML = text;
        if (isEllipsis) {
            a.style.pointerEvents = 'none';
        }

        li.appendChild(a);
        return li;
    };

    // "Previous" button
    paginationContainer.appendChild(createPageLink(page - 1, '<span aria-hidden="true">&laquo;</span>', page === 1));

    const pagesToShow = 5;
    const startPage = Math.max(1, page - Math.floor(pagesToShow / 2));
    const endPage = Math.min(totalPages, startPage + pagesToShow - 1);

    if (startPage > 1) {
        paginationContainer.appendChild(createPageLink(1, '1'));
        if (startPage > 2) {
            paginationContainer.appendChild(createPageLink(0, '...', false, false, true));
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationContainer.appendChild(createPageLink(i, i, false, i === page));
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationContainer.appendChild(createPageLink(0, '...', false, false, true));
        }
        paginationContainer.appendChild(createPageLink(totalPages, totalPages));
    }

    // "Next" button
    paginationContainer.appendChild(createPageLink(page + 1, '<span aria-hidden="true">&raquo;</span>', page === totalPages));

    paginationContainer.querySelectorAll('.page-link').forEach(link => {
        const parentLi = link.parentElement;
        if (parentLi.classList.contains('disabled') || parentLi.classList.contains('ellipsis')) {
            return;
        }

        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = Number(link.dataset.page);
            if (targetPage && targetPage !== currentPage) {
                if (selectedRole) {
                    loadOrderDataByRole(targetPage, currentSearchQuery);
                } else {
                    loadOrderData(targetPage, currentSearchQuery);
                }
            }
        });
    });
}

/**
 * Sets up the event listener for the search input field.
 */
function setupSearchListener() {
    const searchInput = getSearchInput();
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();
            debounceTimer = setTimeout(() => {
                if (query !== currentSearchQuery) {
                    currentSearchQuery = query;
                    if (selectedRole) {
                        loadOrderDataByRole(1, currentSearchQuery);
                    } else {
                        loadOrderData(1, currentSearchQuery);
                    }
                }
            }, 500);
        });
    }
}

/**
 * Sets up the event listeners for the filter buttons.
 */
function setupFilterButtons() {
    const filterBtn = document.getElementById('filterWarningsBtn');
    const clearBtn = document.getElementById('clearFilterBtn');
    const searchContainer = document.querySelector('.search-container');
    const paginationContainer = document.getElementById('pagination-container');

    filterBtn.addEventListener('click', () => {
        searchContainer.style.display = 'none';
        paginationContainer.style.display = 'none';
        filterBtn.style.display = 'none';
        clearBtn.style.display = 'inline-block';

        loadWarningData();
    });

    clearBtn.addEventListener('click', () => {
        searchContainer.style.display = 'block';
        paginationContainer.style.display = 'flex';
        clearBtn.style.display = 'none';
        filterBtn.style.display = 'inline-block';

        currentSearchQuery = '';
        getSearchInput().value = '';
        
        if (selectedRole) {
            loadOrderDataByRole(1, currentSearchQuery);
        } else {
            loadOrderData(1, currentSearchQuery);
        }
    });
}

/**
 * Updates the page title for global view
 */
function updatePageTitleGlobal(userPlant, displayedCount, totalCount) {
    // Si existe el selector de roles, no actualizar nada
    if (document.getElementById('roleSelector')) return;

    const title2Element = document.getElementById('title2');
    if (title2Element) {
        const plantInfo = userPlant ? `from Plant: ${userPlant}` : '(Global Access)';
        const countInfo = totalCount > 0 ? `(Showing ${displayedCount} of ${totalCount} orders)` : '(No orders found)';
        title2Element.textContent = `Orders ${plantInfo} ${countInfo}`;
        title2Element.style.cssText = "font-size: 1.2em; color: #666; font-weight: normal;";
    }
}

/**
 * Updates the page title for filtered view by role
 */
function updatePageTitleFiltered(filter, displayedCount, totalCount) {
    // Esta función no se usa cuando hay selector, pero la mantenemos por compatibilidad
    console.log(`Filtered view - Level: ${filter.approval_level}, Plant: ${filter.plant || 'Regional'}`);
    console.log(`Showing ${displayedCount} of ${totalCount} orders awaiting approval`);
}

/**
 * Updates the page title for warnings view
 */
function updatePageTitleWarnings(totalCount) {
    const roleSelector = document.querySelector('.role-selector-container');
    const title2Element = document.getElementById('title2');
    
    const warningMessage = `Orders Requiring Attention <span style="font-weight: bold; color: #DC3545;">(Total: ${totalCount})</span>`;
    
    if (roleSelector) {
        // Si existe el selector, actualizarlo temporalmente
        const tempDiv = document.createElement('div');
        tempDiv.id = 'title2';
        tempDiv.innerHTML = warningMessage;
        tempDiv.style.cssText = "font-size: 1.2em; color: #666; font-weight: normal; text-align: center; margin: 20px 0;";
        roleSelector.replaceWith(tempDiv);
    } else if (title2Element) {
        title2Element.innerHTML = warningMessage;
        title2Element.style.cssText = "font-size: 1.2em; color: #666; font-weight: normal;";
    }
}

async function handleApprovalClick() {
    const orderId = sessionStorage.getItem('selectedOrderId');
    if (!orderId) return;
    const result = await approveOrder(orderId);
    if (result?.success) refreshOrderData();
}

async function handleRejectionClick() {
    const orderId = sessionStorage.getItem('selectedOrderId');
    if (!orderId) return;
    const result = await rejectOrder(orderId);
    if (result?.success) refreshOrderData();
}

/**
 * Refreshes the data on the current page.
 */
export function refreshOrderData() {
    Swal.fire({
        title: 'Refreshing Data', text: 'Updating order information...', allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });
    
    if (selectedRole) {
        loadOrderDataByRole(currentPage, currentSearchQuery);
    } else {
        loadOrderData(currentPage, currentSearchQuery);
    }
    
    setTimeout(() => Swal.close(), 1000);
}