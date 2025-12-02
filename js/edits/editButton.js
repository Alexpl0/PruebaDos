/**
 * editButton.js - Edit Request Button and Modal Handler
 * Manages the edit request flow in myOrder.php
 * 
 * @author GRAMMER AG
 * @version 1.0
 */

const MAILER_BASE_URL = 'https://grammermx.com/Mailer/PFMailer/';

export function initializeEditButton() {
    const editRequestBtn = document.getElementById('editRequestBtn');
    const editModal = document.getElementById('editRequestModal');
    const closeBtn = editModal?.querySelector('.close-btn');
    const submitBtn = editModal?.querySelector('#submitEditRequest');
    const reasonTextarea = editModal?.querySelector('#editReason');

    if (!editRequestBtn || !editModal) {
        console.warn('[editButton.js] Edit button or modal not found');
        return;
    }

    editRequestBtn.addEventListener('click', () => {
        editModal.style.display = 'block';
        reasonTextarea?.focus();
    });

    closeBtn?.addEventListener('click', () => {
        editModal.style.display = 'none';
        reasonTextarea.value = '';
    });

    window.addEventListener('click', (event) => {
        if (event.target === editModal) {
            editModal.style.display = 'none';
            reasonTextarea.value = '';
        }
    });

    submitBtn?.addEventListener('click', submitEditRequest);
}

async function submitEditRequest() {
    const orderId = window.PF_CONFIG?.orderId;
    const reasonTextarea = document.getElementById('editReason');
    const reason = reasonTextarea?.value.trim();

    if (!orderId) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Order ID not found in configuration'
        });
        return;
    }

    if (!reason || reason.length < 20) {
        Swal.fire({
            icon: 'warning',
            title: 'Invalid Input',
            text: 'Please provide a reason with at least 20 characters'
        });
        reasonTextarea?.focus();
        return;
    }

    try {
        Swal.fire({
            title: 'Submitting Request',
            html: 'Please wait while your edit request is being processed...',
            timerProgressBar: true,
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const response = await fetch(`${MAILER_BASE_URL}PFmailEditOrder.php?action=request_edit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                orderId: orderId,
                reason: reason
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to submit edit request');
        }

        Swal.fire({
            icon: 'success',
            title: 'Request Submitted',
            html: `
                <p>Your edit request has been submitted successfully.</p>
                <p><small>The approval officer will review your request and send you further instructions.</small></p>
            `,
            confirmButtonText: 'OK'
        }).then(() => {
            document.getElementById('editRequestModal').style.display = 'none';
            reasonTextarea.value = '';
            location.reload();
        });

    } catch (error) {
        console.error('[editButton.js] Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Submission Error',
            text: error.message || 'An error occurred while submitting your request'
        });
    }
}

/**
 * Displays the edit button section (called from myOrder.php)
 */
export function displayEditButtonSection(orderId) {
    const section = document.getElementById('editButtonSection');
    if (!section) {
        console.warn('[editButton.js] Edit button section container not found');
        return;
    }

    section.innerHTML = `
        <div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #034C8C;">
            <h3 style="margin-top: 0; color: #034C8C;">Order Modifications</h3>
            <button id="editRequestBtn" type="button" style="
                background-color: #034C8C;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: bold;
                transition: background-color 0.3s;
                font-size: 14px;
            " onmouseover="this.style.backgroundColor='#023b6a'" onmouseout="this.style.backgroundColor='#034C8C'">
                Request Edit Permission
            </button>
        </div>

        <!-- Edit Request Modal -->
        <div id="editRequestModal" style="
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
        ">
            <div style="
                background-color: white;
                margin: 5% auto;
                padding: 30px;
                border: 1px solid #888;
                border-radius: 8px;
                width: 90%;
                max-width: 500px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.2);
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0; color: #034C8C;">Request Order Edit</h2>
                    <button class="close-btn" style="
                        background: none;
                        border: none;
                        font-size: 28px;
                        cursor: pointer;
                        color: #666;
                    ">&times;</button>
                </div>

                <form style="display: contents;">
                    <label for="editReason" style="display: block; margin-bottom: 10px; font-weight: bold;">
                        Reason for Edit (Minimum 20 characters)
                    </label>
                    <textarea 
                        id="editReason" 
                        name="editReason" 
                        style="
                            width: 100%;
                            padding: 10px;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                            font-family: Arial, sans-serif;
                            resize: vertical;
                            min-height: 120px;
                            box-sizing: border-box;
                        "
                        placeholder="Please explain why you need to edit this order..."
                        required
                    ></textarea>
                    <small style="display: block; color: #666; margin-top: 8px;">
                        <span id="charCount">0</span>/20 characters minimum
                    </small>

                    <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                        <button type="button" class="close-btn" style="
                            background-color: #6c757d;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-weight: bold;
                        ">Cancel</button>
                        <button type="button" id="submitEditRequest" style="
                            background-color: #28a745;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-weight: bold;
                        ">Submit Request</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Initialize event listeners
    initializeEditButton();

    // Character counter for textarea
    const textarea = document.getElementById('editReason');
    const charCount = document.getElementById('charCount');
    
    textarea?.addEventListener('input', () => {
        charCount.textContent = textarea.value.length;
    });
}

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEditButton);
} else {
    initializeEditButton();
}