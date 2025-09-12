/**
 * Corrective Action Plan Management
 * Handles display and interactions for corrective action plans
 */

class CorrectiveActionPlan {
    constructor(orderId, userPermissions) {
        this.orderId = orderId;
        this.userPermissions = userPermissions;
        this.planData = null;
        this.files = [];
        this.container = document.getElementById('correctiveActionContainer');
        this.init();
    }

    init() {
        // NUEVO: Verificar si el contenedor existe antes de proceder
        if (!this.container) {
            console.log('CorrectiveActionPlan: Container not found');
            return;
        }
        
        console.log('CorrectiveActionPlan: Initializing for order ID:', this.orderId);
        this.loadPlanData();
        this.setupEventListeners();
    }

    async loadPlanData() {
        try {
            console.log('CorrectiveActionPlan: Loading plan data for order:', this.orderId);
            
            // CAMBIO: Usar el endpoint específico para corrective action plans
            const response = await fetch(`${window.PF_CONFIG.app.baseURL}dao/conections/daoCorrectivePlan.php?order_id=${this.orderId}`);
            const data = await response.json();
            
            console.log('CorrectiveActionPlan: API Response:', data);
            
            if (data.success && data.plan) {
                console.log('✅ CorrectiveActionPlan: Plan found for order', this.orderId);
                this.planData = data.plan;
                
                // DEBUG: Log para ver qué datos estamos recibiendo
                console.log('CorrectiveActionPlan: Plan Data:', this.planData);
                console.log('CorrectiveActionPlan: Comments from server:', this.planData.comments);
                
                // Mostrar contenedor y cargar contenido
                this.showContainer();
                await this.loadFiles();
                this.renderPlan();
            } else {
                console.log('❌ CorrectiveActionPlan: No plan found for order', this.orderId);
                console.log('CorrectiveActionPlan: API message:', data.message);
                this.hideContainer();
            }
        } catch (error) {
            console.error('❌ CorrectiveActionPlan: Error loading plan:', error);
            this.hideContainer();
        }
    }

    // NUEVO: Método para mostrar el contenedor
    showContainer() {
        if (this.container) {
            console.log('CorrectiveActionPlan: Showing container');
            this.container.style.display = 'block';
            this.container.classList.remove('hidden', 'corrective-action-hidden');
        }
    }

    // NUEVO: Método para ocultar el contenedor
    hideContainer() {
        if (this.container) {
            console.log('CorrectiveActionPlan: Hiding container');
            this.container.style.display = 'none';
            this.container.classList.add('hidden', 'corrective-action-hidden');
            // Limpiar contenido
            this.container.innerHTML = '';
        }
    }

    async loadFiles() {
        if (!this.planData?.cap_id) return;
        
        try {
            console.log('CorrectiveActionPlan: Loading files for CAP ID:', this.planData.cap_id);
            const response = await fetch(`${window.PF_CONFIG.app.baseURL}dao/conections/daoCorrectiveFiles.php?cap_id=${this.planData.cap_id}`);
            const data = await response.json();
            
            if (data.success) {
                this.files = data.files || [];
                console.log('CorrectiveActionPlan: Files loaded:', this.files.length, 'files');
            }
        } catch (error) {
            console.error('CorrectiveActionPlan: Error loading files:', error);
        }
    }

    renderPlan() {
        if (!this.container) return;

        console.log('CorrectiveActionPlan: Rendering plan');
        const statusBadge = this.renderStatusBadge(this.planData.status);

        this.container.innerHTML = `
            <div class="corrective-action-section">
                <div class="corrective-action-header">
                    <h3 class="corrective-action-title">
                        <i class="fas fa-clipboard-check"></i>
                        Corrective Action Plan
                    </h3>
                    ${statusBadge}
                </div>
                <div class="corrective-action-content">
                    <!-- Main Table with 4 columns -->
                    <table class="plan-table">
                        <thead>
                            <tr>
                                <th>Corrective Action</th>
                                <th>Responsible</th>
                                <th>Target Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    ${this.renderCorrectiveActionText()}
                                </td>
                                <td>
                                    <strong>${this.escapeHtml(this.planData.person_responsible)}</strong>
                                </td>
                                <td>
                                    <div class="target-date">
                                        <i class="fas fa-calendar-alt"></i>
                                        ${this.formatDate(this.planData.due_date)}
                                        <div class="week-info" style="font-size: 0.75rem; color: var(--gray-600); margin-top: 0.25rem;">
                                            ${this.getWeekInfo(this.planData.due_date)}
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    ${this.renderStatusControl()}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <!-- Comments and Files Section -->
                    ${this.renderCommentsAndFilesSection()}
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    renderCorrectiveActionText() {
        const text = this.planData.corrective_action;
        const previewLength = 100; // Show first 100 characters
        
        if (text.length <= previewLength) {
            return `<div class="corrective-action-text">${this.escapeHtml(text)}</div>`;
        }
        
        const preview = text.substring(0, previewLength);
        const textId = `corrective-text-${this.planData.cap_id}`;
        
        return `
            <div class="corrective-action-text">
                <div id="${textId}-preview" class="corrective-action-preview">
                    ${this.escapeHtml(preview)}...
                </div>
                <div id="${textId}-full" class="corrective-action-full">
                    ${this.escapeHtml(text)}
                </div>
                <button class="corrective-action-toggle" onclick="correctivePlan.toggleCorrectiveText('${textId}')">
                    <span id="${textId}-toggle-text">Show more</span>
                </button>
            </div>
        `;
    }

    toggleCorrectiveText(textId) {
        const preview = document.getElementById(`${textId}-preview`);
        const full = document.getElementById(`${textId}-full`);
        const toggleText = document.getElementById(`${textId}-toggle-text`);
        
        if (full.classList.contains('expanded')) {
            // Currently showing full text, collapse it
            full.classList.remove('expanded');
            preview.style.display = 'block'; // Mostrar preview
            toggleText.textContent = 'Show more';
        } else {
            // Currently showing preview, expand it
            full.classList.add('expanded');
            preview.style.display = 'none'; // Ocultar preview completamente
            toggleText.textContent = 'Show less';
        }
    }

    renderCommentsAndFilesSection() {
        return `
            <div class="comments-files-section">
                <div class="comments-column">
                    <h4 class="section-title">
                        <i class="fas fa-comments"></i>
                        Comments
                    </h4>
                    ${this.renderCommentsSection()}
                </div>
                <div class="files-column">
                    <h4 class="section-title">
                        <i class="fas fa-paperclip"></i>
                        Evidence Files
                    </h4>
                    ${this.renderFilesSection()}
                </div>
            </div>
        `;
    }

    renderCommentsSection() {
        const canEditComments = this.userPermissions.canEditComments;
        // Asegurarnos de que comments sea una string, incluso si es null o undefined
        const comments = this.planData.comments || '';
        
        // DEBUG: Log para ver qué comentarios tenemos
        console.log('CorrectiveActionPlan: Rendering comments:', comments);
        console.log('CorrectiveActionPlan: Can edit comments:', canEditComments);
        
        if (canEditComments) {
            return `
                <div class="comments-container">
                    <textarea id="commentsTextarea" class="corrective-form-control corrective-textarea" 
                        placeholder="Add your comments about the progress...">${this.escapeHtml(comments)}</textarea>
                    <button id="updateCommentsBtn" class="corrective-btn btn-success-corrective" style="margin-top: 0.5rem;">
                        <i class="fas fa-save"></i> Save Comments
                    </button>
                </div>
            `;
        } else {
            return `
                <div class="comments-container">
                    <div class="comments-display ${comments ? '' : 'empty'}">
                        ${comments ? this.escapeHtml(comments) : 'No comments yet'}
                    </div>
                    <div class="permission-note">Read-only</div>
                </div>
            `;
        }
    }

    renderFilesSection() {
        const canUpload = this.userPermissions.canUploadFiles;
        
        return `
            <div class="files-container">
                ${this.renderFilesList()}
                ${canUpload ? this.renderUploadSection() : ''}
            </div>
        `;
    }

    renderFilesList() {
        if (this.files.length === 0) {
            return `
                <div class="files-list empty">
                    No evidence files uploaded yet
                </div>
            `;
        }

        const filesHtml = this.files.map(file => `
            <div class="file-item">
                <div class="file-info">
                    <div class="file-icon ${file.file_type === 'pdf' ? 'file-icon-pdf' : 'file-icon-image'}">
                        ${file.file_type === 'pdf' ? 'PDF' : 'IMG'}
                    </div>
                    <div class="file-details">
                        <p class="file-name" title="${this.escapeHtml(file.file_name)}">${this.escapeHtml(file.file_name)}</p>
                        <p class="file-meta">Uploaded ${this.formatDate(file.upload_date)}</p>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="file-action-btn btn-view" onclick="correctivePlan.viewFile(${file.file_id})" title="View file">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        `).join('');

        return `<div class="files-list">${filesHtml}</div>`;
    }

    renderUploadSection() {
        return `
            <div class="upload-section">
                <div class="file-input-wrapper">
                    <input type="file" id="evidenceFileInput" class="file-input-hidden" 
                        accept=".pdf,.jpg,.jpeg,.png,.gif" multiple>
                    <button class="file-input-button" onclick="document.getElementById('evidenceFileInput').click()">
                        <i class="fas fa-cloud-upload-alt"></i>
                        Upload Evidence Files
                    </button>
                </div>
                <div class="upload-info">
                    PDF, JPG, PNG, GIF formats • Max 5MB per file
                </div>
            </div>
        `;
    }

    renderStatusControl() {
        const canUpdateStatus = this.userPermissions.canUpdateStatus;
        const statusOptions = ['On Track', 'At Risk', 'Delayed'];
        
        if (canUpdateStatus) {
            const options = statusOptions.map(status => 
                `<option value="${status}" ${status === this.planData.status ? 'selected' : ''}>${status}</option>`
            ).join('');
            
            return `
                <select id="statusSelect" class="corrective-form-control corrective-select">
                    ${options}
                </select>
                <button id="updateStatusBtn" class="corrective-btn btn-primary-corrective" style="margin-top: 0.5rem; font-size: 0.75rem;">
                    <i class="fas fa-save"></i> Update
                </button>
            `;
        } else {
            return `
                <span class="corrective-badge status-${this.getStatusClass(this.planData.status)}">
                    ${this.planData.status}
                </span>
            `;
        }
    }

    renderStatusBadge(status) {
        const statusClass = this.getStatusClass(status);
        return `<span class="corrective-action-badge status-${statusClass}">${status}</span>`;
    }

    getStatusClass(status) {
        switch (status) {
            case 'On Track': return 'on-track';
            case 'At Risk': return 'at-risk';
            case 'Delayed': return 'delayed';
            default: return 'on-track';
        }
    }

    setupEventListeners() {
        // File input change listener
        document.addEventListener('change', (e) => {
            if (e.target.id === 'evidenceFileInput') {
                this.handleFileUpload(e.target.files);
            }
        });
    }

    attachEventListeners() {
        // Status update listener
        const updateStatusBtn = document.getElementById('updateStatusBtn');
        if (updateStatusBtn) {
            updateStatusBtn.addEventListener('click', () => this.updateStatus());
        }

        // Comments update listener
        const updateCommentsBtn = document.getElementById('updateCommentsBtn');
        if (updateCommentsBtn) {
            updateCommentsBtn.addEventListener('click', () => this.updateComments());
        }
    }

    async updateStatus() {
        const statusSelect = document.getElementById('statusSelect');
        const newStatus = statusSelect.value;

        try {
            const response = await fetch(`${window.PF_CONFIG.app.baseURL}dao/conections/daoCorrectivePlan.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cap_id: this.planData.cap_id,
                    status: newStatus
                })
            });

            const result = await response.json();

            if (result.success) {
                this.planData.status = newStatus;
                this.showSuccess('Status updated successfully');
                this.updateStatusBadge(newStatus);
            } else {
                this.showError(result.message || 'Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            this.showError('Error updating status');
        }
    }

    async updateComments() {
        const commentsTextarea = document.getElementById('commentsTextarea');
        const comments = commentsTextarea.value.trim();

        console.log('CorrectiveActionPlan: Updating comments:', comments);

        try {
            const response = await fetch(`${window.PF_CONFIG.app.baseURL}dao/conections/daoCorrectivePlan.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cap_id: this.planData.cap_id,
                    comments: comments
                })
            });

            const result = await response.json();
            console.log('CorrectiveActionPlan: Update comments result:', result);

            if (result.success) {
                this.planData.comments = comments;
                this.showSuccess('Comments saved successfully');
            } else {
                this.showError(result.message || 'Failed to save comments');
            }
        } catch (error) {
            console.error('CorrectiveActionPlan: Error saving comments:', error);
            this.showError('Error saving comments');
        }
    }

    async handleFileUpload(files) {
        if (!this.planData?.cap_id) {
            this.showError('No corrective action plan found');
            return;
        }

        const formData = new FormData();
        formData.append('cap_id', this.planData.cap_id);
        formData.append('uploaded_by', window.PF_CONFIG.user.id);
        formData.append('evidenceFile', files[0]);

        try {
            const response = await fetch('dao/conections/daoUploadCorrectiveEvidence.php', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('File uploaded successfully');
                await this.loadFiles(); // Recargar la lista de archivos
            } else {
                throw new Error(result.message || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showError('Failed to upload file: ' + error.message);
        }
    }

    viewFile(fileId) {
        // Abrir el archivo en una nueva ventana
        const url = `dao/conections/daoViewCorrectiveFile.php?file_id=${fileId}`;
        window.open(url, '_blank');
    }

    showSuccess(message) {
        Swal.fire({
            icon: 'success',
            title: 'Success',
            text: message,
            timer: 3000,
            showConfirmButton: false
        });
    }

    showError(message) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: message
        });
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    getWeekInfo(dateString) {
        const date = new Date(dateString);
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        return `Week ${weekNumber} of ${date.getFullYear()}`;
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text ? text.replace(/[&<>"']/g, (m) => map[m]) : '';
    }
}

// Global instance for access from HTML
let correctivePlan = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('CorrectiveActionPlan: DOM loaded, checking for order ID...');
    
    // Check if we're on a page that should show corrective action plans
    const orderId = window.PF_CONFIG?.orderId;
    if (!orderId) {
        console.log('CorrectiveActionPlan: No order ID found, skipping initialization');
        return;
    }

    console.log('CorrectiveActionPlan: Order ID found:', orderId);

    // Determine user permissions
    const userId = window.PF_CONFIG.user.id;
    const userPermissions = {
        canUpdateStatus: userId == 36, // Only user 36 can update status
        canEditComments: true, // Order creator can edit comments (will be refined based on order data)
        canUploadFiles: true // Administrative users can upload files (will be refined)
    };

    console.log('CorrectiveActionPlan: User permissions:', userPermissions);

    // Initialize the corrective action plan
    correctivePlan = new CorrectiveActionPlan(orderId, userPermissions);
});

// FUNCIÓN LEGACY: Mantener para compatibilidad con códigos existentes
async function loadCorrectiveActionPlan(orderId) {
    console.log('CorrectiveActionPlan: Legacy function called for order:', orderId);
    
    try {
        const response = await fetch(`dao/corrective_action/get_corrective_action.php?order_id=${orderId}`);
        const data = await response.json();
        
        const container = document.getElementById('correctiveActionContainer');
        
        if (!data.success || !data.data || data.data.length === 0) {
            console.log('CorrectiveActionPlan: Legacy - No plan found, hiding container');
            // No hay Corrective Action Plan - ocultar contenedor
            if (container) {
                container.style.display = 'none';
                container.classList.add('hidden');
            }
            return;
        }
        
        console.log('CorrectiveActionPlan: Legacy - Plan found, showing container');
        // Hay Corrective Action Plan - mostrar contenedor y cargar contenido
        if (container) {
            container.style.display = 'block';
            container.classList.remove('hidden');
        }
        
        // Cargar el contenido del plan
        renderCorrectiveActionPlan(data.data);
        
    } catch (error) {
        console.error('CorrectiveActionPlan: Legacy error:', error);
        // En caso de error, ocultar la sección
        const container = document.getElementById('correctiveActionContainer');
        if (container) {
            container.style.display = 'none';
        }
    }
}