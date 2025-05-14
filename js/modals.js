/**
 * Premium Freight - Modal Functionality
 * Handles all modal-related operations
 */

import { loadAndPopulateSVG, generatePDF } from './svgOrders.js';
import { createCards } from './cards.js';

// Variables to track modal state
let currentModal = null;

/**
 * Shows the main SVG modal for an order
 * @param {string} orderId - ID of the order to display
 */
export function showModal(orderId) {
    const modal = document.getElementById('myModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Find the selected order
    const selectedOrder = window.allOrders.find(order => order.id === parseInt(orderId)) || {};
    
    // Configure approval/reject buttons
    configureActionButtons(selectedOrder);
    
    // Load SVG content
    loadSvgContent(selectedOrder);
}

/**
 * Hides the main modal
 */
export function hideModal() {
    const modal = document.getElementById('myModal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

/**
 * Configures the approval and rejection buttons based on user permissions
 * @param {Object} selectedOrder - The order data
 */
function configureActionButtons(selectedOrder) {
    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    
    // Check if user is the next approver and order is not rejected or fully approved
    const isNextApprover = Number(selectedOrder.approval_status) === (Number(window.authorizationLevel) - 1);
    const isRejected = Number(selectedOrder.approval_status) === 99;
    const isFullyApproved = selectedOrder.approval_status === null || 
                           Number(selectedOrder.approval_status) >= (selectedOrder.required_auth_level || 7);
    
    // Show or hide buttons accordingly
    if (isNextApprover && !isRejected && !isFullyApproved) {
        approveBtn.style.display = "block";
        approveBtn.disabled = false;
        rejectBtn.style.display = "block";
        rejectBtn.disabled = false;
    } else {
        approveBtn.style.display = "none";
        rejectBtn.style.display = "none";
    }
    
    // Update container class based on visible buttons
    updateModalButtonsContainer();
    
    // Log debug info
    console.log('Order ID:', selectedOrder.id);
    console.log('Order Approval Status:', selectedOrder.approval_status);
    console.log('User Authorization Level:', window.authorizationLevel);
    console.log('Required Authorization Level:', selectedOrder.required_auth_level);
}

/**
 * Loads SVG content into the modal
 * @param {Object} selectedOrder - The order data
 */
async function loadSvgContent(selectedOrder) {
    try {
        await loadAndPopulateSVG(selectedOrder, 'svgPreview');
    } catch (error) {
        console.error('Error loading or processing SVG:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Could not load the document preview.',
            customClass: { container: 'swal-on-top' }
        });
        hideModal();
    }
}

/**
 * Updates the modal buttons container class based on visible buttons
 */
export function updateModalButtonsContainer() {
    const buttonsContainer = document.querySelector('#myModal .modal-buttons');
    const visibleButtons = Array.from(buttonsContainer.children)
        .filter(btn => btn.style.display !== 'none').length;
    
    if (visibleButtons === 1) {
        buttonsContainer.classList.add('single-button');
    } else {
        buttonsContainer.classList.remove('single-button');
    }
}

/**
 * Updates modal buttons to icon-only versions
 */
export function updateModalButtons() {
    const savePdfBtn = document.getElementById('savePdfBtn');
    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    
    if (savePdfBtn && !savePdfBtn.classList.contains('icon-only-btn')) {
        savePdfBtn.classList.add('icon-only-btn');
        savePdfBtn.setAttribute('title', 'Save as PDF');
        savePdfBtn.innerHTML = '<span class="material-symbols-outlined">picture_as_pdf</span>';
        
        if (approveBtn) {
            approveBtn.classList.add('icon-only-btn');
            approveBtn.setAttribute('title', 'Approve Order');
            approveBtn.innerHTML = '<span class="material-symbols-outlined">check_circle</span>';
        }
        
        if (rejectBtn) {
            rejectBtn.classList.add('icon-only-btn');
            rejectBtn.setAttribute('title', 'Reject Order');
            rejectBtn.innerHTML = '<span class="material-symbols-outlined">cancel</span>';
        }
        
        updateModalButtonsContainer();
    }
}

/**
 * Shows the evidence upload notification modal
 * @param {string} orderId - ID of the order
 */
export function showEvidenceUploadModal(orderId) {
    const selectedOrder = window.allOrders.find(order => order.id === parseInt(orderId)) || {};
    
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'evidenceModalOverlay';
    modalOverlay.className = 'evidence-modal-overlay';
    
    const modalDiv = document.createElement('div');
    modalDiv.id = 'evidenceUploadModal';
    modalDiv.className = 'evidence-upload-modal';
    
    modalDiv.innerHTML = `
        <div class="evidence-modal-content">
            <div class="evidence-modal-header">
                <h5 class="evidence-modal-title">Recovery Evidence Required</h5>
                <button type="button" class="evidence-close-button" id="closeEvidenceModal">&times;</button>
            </div>
            <div class="evidence-modal-body">
                <p>Order #${orderId} has a recovery file but no evidence uploaded yet. 
                Evidence of Recovery is yet to be uploaded.</p>
            </div>
            <div class="evidence-modal-footer">
                <button type="button" class="evidence-btn-secondary" id="cancelEvidenceBtn">Accept</button>
                <button type="button" class="evidence-btn-primary" id="showUploadFormBtn">Upload Evidence</button>
            </div>
        </div>
    `;
    
    modalOverlay.appendChild(modalDiv);
    document.body.appendChild(modalOverlay);
    currentModal = modalOverlay;
    
    // Setup close functionality
    const closeModal = () => {
        document.body.removeChild(modalOverlay);
        currentModal = null;
    };
    
    document.getElementById('closeEvidenceModal').addEventListener('click', closeModal);
    document.getElementById('cancelEvidenceBtn').addEventListener('click', closeModal);
    
    document.getElementById('showUploadFormBtn').addEventListener('click', function() {
        closeModal();
        showEvidenceFileUploadForm(orderId);
    });
    
    // Close on outside click
    modalOverlay.addEventListener('click', function(event) {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });
    
    // Close on Escape key
    const escHandler = function(event) {
        if (event.key === 'Escape' && currentModal === modalOverlay) {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

/**
 * Shows the evidence file upload form modal
 * @param {string} orderId - ID of the order
 */
export function showEvidenceFileUploadForm(orderId) {
    const userName = window.userName || 'anonymous_user';
    
    const uploadOverlay = document.createElement('div');
    uploadOverlay.id = 'evidenceUploadOverlay';
    uploadOverlay.className = 'evidence-modal-overlay';
    
    const uploadFormDiv = document.createElement('div');
    uploadFormDiv.id = 'evidenceFileUploadModal';
    uploadFormDiv.className = 'evidence-upload-modal';
    
    uploadFormDiv.innerHTML = `
        <div class="evidence-modal-content">
            <div class="evidence-modal-header">
                <h5 class="evidence-modal-title">Upload Recovery Evidence</h5>
                <button type="button" class="evidence-close-button" id="closeUploadFormModal">&times;</button>
            </div>
            <div class="evidence-modal-body">
                <form id="evidenceForm" class="evidence-form">
                    <input type="hidden" id="premiumFreightId" name="premium_freight_id" value="${orderId}">
                    <input type="hidden" id="userName" name="userName" value="${userName}">
                    
                    <div class="evidence-form-group">
                        <label for="evidenceFile">Select PDF file for evidence:</label>
                        <input type="file" id="evidenceFile" name="evidenceFile" accept=".pdf" class="form-control" required>
                        <small class="form-text text-muted">Only PDF files are accepted.</small>
                    </div>
                    
                    <div class="evidence-modal-footer">
                        <button type="button" class="evidence-btn-secondary" id="cancelUploadBtn">Cancel</button>
                        <button type="submit" class="evidence-btn-primary" id="submitEvidenceBtn">Upload</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    uploadOverlay.appendChild(uploadFormDiv);
    document.body.appendChild(uploadOverlay);
    currentModal = uploadOverlay;
    
    // Setup close functionality
    const closeModal = () => {
        document.body.removeChild(uploadOverlay);
        currentModal = null;
    };
    
    document.getElementById('closeUploadFormModal').addEventListener('click', closeModal);
    document.getElementById('cancelUploadBtn').addEventListener('click', closeModal);
    
    // Close on outside click
    uploadOverlay.addEventListener('click', function(event) {
        if (event.target === uploadOverlay) {
            closeModal();
        }
    });
    
    // Close on Escape key
    const escHandler = function(event) {
        if (event.key === 'Escape' && currentModal === uploadOverlay) {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
    
    // Handle form submission
    setupEvidenceFormSubmission(closeModal);
}

/**
 * Sets up the evidence form submission handling
 * @param {Function} closeModalCallback - Function to close the modal
 */
function setupEvidenceFormSubmission(closeModalCallback) {
    document.getElementById('evidenceForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submitEvidenceBtn');
        const cancelBtn = document.getElementById('cancelUploadBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Uploading...';
        cancelBtn.disabled = true;
        
        const premiumFreightId = document.getElementById('premiumFreightId').value;
        const userName = document.getElementById('userName').value || 'user';
        const evidenceFile = document.getElementById('evidenceFile').files[0];
        
        if (!evidenceFile) {
            Swal.fire({
                icon: 'warning',
                title: 'No File Selected',
                text: 'Please select a PDF file to upload.'
            });
            submitBtn.disabled = false;
            submitBtn.textContent = 'Upload';
            cancelBtn.disabled = false;
            return;
        }
        
        try {
            Swal.fire({
                title: 'Uploading...',
                text: 'Please wait while we upload your evidence file.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            const result = await uploadEvidenceFile(premiumFreightId, userName, evidenceFile);
            
            if (result.success) {
                closeModalCallback();
                
                // Update order data
                const orderIndex = window.allOrders.findIndex(order => order.id === parseInt(premiumFreightId));
                if (orderIndex !== -1) {
                    window.allOrders[orderIndex].recovery_evidence = result.file_path;
                    
                    if (window.originalOrders) {
                        const originalIndex = window.originalOrders.findIndex(order => order.id === parseInt(premiumFreightId));
                        if (originalIndex !== -1) {
                            window.originalOrders[originalIndex].recovery_evidence = result.file_path;
                        }
                    }
                    
                    // Refresh cards
                    createCards(window.allOrders);
                }
                
                Swal.fire({
                    icon: 'success',
                    title: 'Evidence Uploaded',
                    text: 'The evidence file was uploaded successfully.'
                });
            } else {
                throw new Error(result.message || 'Unknown error occurred');
            }
        } catch (error) {
            console.error('Error uploading evidence file:', error);
            Swal.fire({
                icon: 'error',
                title: 'Upload Failed',
                text: 'Error uploading evidence file: ' + error.message
            });
            
            submitBtn.disabled = false;
            submitBtn.textContent = 'Upload';
            cancelBtn.disabled = false;
        }
    });
}

/**
 * Uploads an evidence file to the server
 * @param {string} orderId - The order ID
 * @param {string} userName - User who uploaded the file
 * @param {File} file - The evidence file to upload
 * @returns {Promise<Object>} Result of the upload operation
 */
async function uploadEvidenceFile(orderId, userName, file) {
    const formData = new FormData();
    formData.append('premium_freight_id', orderId);
    formData.append('userName', userName);
    formData.append('evidenceFile', file);
    
    const response = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/uploadEvidence.php', {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
}

/**
 * Handles "Save as PDF" button click
 */
export async function handleSavePDF() {
    try {
        Swal.fire({
            title: 'Generating PDF',
            html: 'Please wait while the document is being processed...',
            timerProgressBar: true,
            didOpen: () => { Swal.showLoading(); },
            allowOutsideClick: false,
            allowEscapeKey: false,
            allowEnterKey: false,
            customClass: { container: 'swal-on-top' }
        });

        const selectedOrderId = sessionStorage.getItem('selectedOrderId');
        const selectedOrder = window.allOrders.find(order => order.id === parseInt(selectedOrderId)) || {};
        
        const fileName = await generatePDF(selectedOrder);

        Swal.fire({
            icon: 'success',
            title: 'PDF Generated Successfully!',
            html: `The file <b>${fileName}</b> has been downloaded successfully.`,
            confirmButtonText: 'OK',
            customClass: { container: 'swal-on-top' }
        });
        hideModal();

    } catch (error) {
        console.error('Error generating PDF:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error Generating PDF',
            text: error.message || 'An unexpected error occurred.',
            confirmButtonText: 'OK',
            customClass: { container: 'swal-on-top' }
        });
        
        const tempContainer = document.querySelector('div[style*="left: -9999px"]');
        if (tempContainer) {
            document.body.removeChild(tempContainer);
        }
    }
}

/**
 * Sets up event listeners for modal functionality
 */
export function setupModalEventListeners() {
    // Close modal when X is clicked
    document.getElementById('closeModal').onclick = hideModal;
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        const modal = document.getElementById('myModal');
        if (event.target === modal) {
            hideModal();
        }
    };
    
    // Save PDF button
    document.getElementById('savePdfBtn').onclick = handleSavePDF;
}