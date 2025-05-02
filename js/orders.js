document.addEventListener('DOMContentLoaded', function () {
    // --- Field mapping for SVG ---
    const svgMap = {
        'AreaOfResponsabilityValue': 'area',
        'CarrierNameValue': 'carrier',
        'CityDestValue': 'destiny_city',
        'CityShipValue': 'origin_city',
        'CompanyNameDestValue': 'destiny_company_name',
        'CompanyNameShipValue': 'origin_company_name',
        'CostInEurosValue': 'cost_euros',
        'CostPaidByValue': 'paid_by',
        'DateValue': 'date', // Keep original mapping
        'DescriptionAndRootCauseValue': 'description',
        'InExtValue': 'int_ext',
        'InOutBoundValue': 'in_out_bound',
        'IssuerValue': 'creator_name',
        'PlantCValue': 'planta',
        'PlantCodeValue': 'code_planta',
        'PlantManagerValue': '', // Placeholder, adjust if needed
        'ProductValue': 'products',
        'ProjectStatusValue': 'project_status', // Placeholder, adjust if needed
        'QuotedCostValue': 'quoted_cost',
        'RecoveryValue': 'recovery',
        'ReferenceNumberValue': 'reference_number',
        'RequestingPlantValue': 'planta',
        'RootCauseValue': 'category_cause',
        'ManagerOPSDivisionValue': '', // Placeholder, adjust if needed
        'SRVPRegionalValue': '', // Placeholder, adjust if needed
        'SeniorManagerValue': '', // Placeholder, adjust if needed
        'StateDestValue': 'destiny_state',
        'StateShipValue': 'origin_state',
        'TransportValue': 'transport',
        'WeightValue': 'weight',
        'ZIPDestValue': 'destiny_zip',
        'ZIPShipValue': 'origin_zip'
    };

    // --- Function to format dates without time ---
    function formatDate(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString; // If invalid, return original string
            
            // Format DD/MM/YYYY
            return date.toLocaleDateString('en-US', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric'
            });
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return dateString;
        }
    }

    // --- Load initial data ---
    fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPremiumFreight.php')
        .then(response => response.json())
        .then(data => {
            if (data && data.data) {
                createCards(data.data);
            } else {
                console.error('Error: No data received from API or data format is incorrect.');
                // Optionally display an error message to the user
            }
        })
        .catch(error => console.error('Error loading data:', error));

    // --- Calculate ISO 8601 week number ---
    function getWeekNumber(dateString) {
        if (!dateString) return 'N/A'; // Handle cases where date might be null or undefined
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) { // Check if date is valid
                return 'N/A';
            }
            const dayNum = date.getDay() || 7;
            date.setDate(date.getDate() + 4 - dayNum);
            const yearStart = new Date(date.getFullYear(), 0, 1);
            const weekNum = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
            return weekNum;
        } catch (e) {
            console.error("Error calculating week number for:", dateString, e);
            return 'N/A';
        }
    }

    // --- Function to wrap text in SVG element ---
    function wrapSVGText() {
        // Get the text element to wrap
        const textElement = document.getElementById("DescriptionAndRootCauseValue");
        if (!textElement) return;
        
        // Get the current text content
        const text = textElement.textContent.trim();
        if (!text) return;
        
        // Get original position and style properties
        const x = textElement.getAttribute("x");
        const y = textElement.getAttribute("y");
        const fontSize = parseFloat(textElement.style.fontSize || "3.175px");
        
        // Calculate appropriate line spacing (usually 1.2-1.5× the font size)
        const lineHeight = fontSize * 1.3;
        
        // Clear the current content
        textElement.textContent = "";
        
        // Maximum characters per line
        const maxCharsPerLine = 101;
        
        // Split text into words
        const words = text.split(/\s+/);
        let currentLine = "";
        let firstLine = true;
        
        // Process each word
        words.forEach(word => {
            // Check if adding the next word exceeds the maximum line length
            if ((currentLine + " " + word).length > maxCharsPerLine && currentLine.length > 0) {
                // Create a new tspan for the completed line
                const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                tspan.setAttribute("x", x);
                
                // Set vertical position
                if (firstLine) {
                    // First line doesn't need dy adjustment
                    firstLine = false;
                } else {
                    tspan.setAttribute("dy", `${lineHeight}px`);
                }
                
                tspan.textContent = currentLine;
                textElement.appendChild(tspan);
                
                // Start a new line with the current word
                currentLine = word;
            } else {
                // Add the word to the current line (with a space if not the first word on the line)
                if (currentLine.length > 0) {
                    currentLine += " " + word;
                } else {
                    currentLine = word;
                }
            }
        });
        
        // Add the last line if there's any text left
        if (currentLine.length > 0) {
            const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
            tspan.setAttribute("x", x);
            
            if (!firstLine) {
                tspan.setAttribute("dy", `${lineHeight}px`);
            }
            
            tspan.textContent = currentLine;
            textElement.appendChild(tspan);
        }
    }

    // --- Create visual cards for each order ---
    function createCards(orders) {
        const mainCards = document.getElementById("card");
        if (!mainCards) {
            console.error("Element with ID 'card' not found.");
            return;
        }
        mainCards.innerHTML = ""; // Clear existing cards
        orders.forEach(order => {
            const semana = getWeekNumber(order.date);
            const card = document.createElement("div");
            card.className = "card shadow rounded mx-2 mb-4";
            card.style.maxWidth = "265px";
            card.style.minHeight = "250px"; // Use minHeight for consistency
            card.style.display = "flex";
            card.style.flexDirection = "column";
            card.style.justifyContent = "space-between";


            // Colors based on status
            const statusName = (order.status_name || '').toLowerCase();
            if (statusName === "aprobado") card.style.backgroundColor = "#A7CAC3";
            else if (statusName === "nuevo") card.style.backgroundColor = "#EAE8EB";
            else if (statusName === "revision") card.style.backgroundColor = "#F3D1AB";
            else if (statusName === "rechazado") card.style.backgroundColor = "#E0A4AE";
            else card.style.backgroundColor = "#FFFFFF"; // Default color

            // Approval pending message
            let falta = '';
            const approvalStatus = order.approval_status; // Can be null or a number

            if (approvalStatus === null || approvalStatus >= (order.required_auth_level || 7)) { // Assuming 7 is max level if required_auth_level is missing
                 falta = 'Fully Approved';
                 if (statusName === "rechazado") { // Override if rejected
                    falta = 'Order Rejected';
                 }
            } else if (approvalStatus === 99) {
                 falta = 'Order Rejected';
            } else {
                // Determine next required approver based on current status
                switch (Number(approvalStatus)) {
                    case 0: falta = 'Pending: Logistic Manager'; break;
                    case 1: falta = 'Pending: Controlling'; break;
                    case 2: falta = 'Pending: Plant Manager'; break;
                    case 3: falta = 'Pending: Senior Manager Logistic'; break;
                    case 4: falta = 'Pending: Senior Manager Logistics Division'; break;
                    case 5: falta = 'Pending: SR VP Regional'; break;
                    case 6: falta = 'Pending: Division Controlling Regional'; break;
                    default: falta = `Pending: Level ${approvalStatus + 1}`; // Generic message
                }
            }


            card.innerHTML = `
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">ID: ${order.id || 'N/A'}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">CW: ${semana}</h6>
                    <p class="card-text flex-grow-1" style="overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">${order.description || 'No description'}</p>
                    <p class="card-p fw-bold">${falta}</p>
                </div>
                <div class="card-footer bg-transparent border-0 text-center pb-3">
                     <button class="btn btn-primary ver-btn" data-order-id="${order.id}">View</button>
                </div>
            `;
            mainCards.appendChild(card);
        });

        window.allOrders = orders; // Store orders globally for modal use

        // --- Event listeners for "View" buttons ---
        document.querySelectorAll('.ver-btn').forEach(btn => {
            btn.addEventListener('click', async function () {
                const orderId = this.getAttribute('data-order-id');
                sessionStorage.setItem('selectedOrderId', orderId); // Store selected ID

                Swal.fire({
                    title: 'Loading',
                    html: 'Please wait while the document is loading...',
                    timer: 1000, // Short timer for visual feedback
                    timerProgressBar: true,
                    didOpen: () => { Swal.showLoading(); },
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    allowEnterKey: false,
                    customClass: { container: 'swal-on-top' } // Ensure modal is on top
                });

                document.getElementById('myModal').style.display = 'flex'; // Show the modal
                const selectedOrder = window.allOrders.find(order => order.id === parseInt(orderId)) || {};

                // --- Configure Approve/Reject buttons based on user level and order status ---
                const approveBtn = document.getElementById('approveBtn');
                const rejectBtn = document.getElementById('rejectBtn');

                // Check if the current user's level is the *next* required approval level
                // And the order is not already rejected (status 99) or fully approved (null or >= required)
                const isNextApprover = Number(selectedOrder.approval_status) === (Number(window.authorizationLevel) - 1);
                const isRejected = Number(selectedOrder.approval_status) === 99;
                const isFullyApproved = selectedOrder.approval_status === null || Number(selectedOrder.approval_status) >= (selectedOrder.required_auth_level || 7);

                if (isNextApprover && !isRejected && !isFullyApproved) {
                    approveBtn.style.display = "block";
                    approveBtn.disabled = false;
                    rejectBtn.style.display = "block";
                    rejectBtn.disabled = false; // Ensure reject is also enabled
                } else {
                    approveBtn.style.display = "none";
                    rejectBtn.style.display = "none";
                }

                console.log('Order ID:', orderId);
                console.log('Selected Order Status:', selectedOrder.approval_status);
                console.log('User Auth Level:', window.authorizationLevel);
                console.log('Required Auth Level:', selectedOrder.required_auth_level);


                // --- Load and populate SVG ---
                try {
                    const response = await fetch('PremiumFreight.svg');
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const svgText = await response.text();

                    const tempDiv = document.createElement('div'); // Use temporary div to parse SVG
                    tempDiv.innerHTML = svgText;

                    // Populate SVG elements based on svgMap
                    for (const [svgId, orderKey] of Object.entries(svgMap)) {
                        const element = tempDiv.querySelector(`#${svgId}`);
                        if (element) {
                            // Special case for date
                            if (svgId === 'DateValue') {
                                element.textContent = formatDate(selectedOrder.date);
                            } else {
                                // Default behavior for all other elements
                                element.textContent = selectedOrder[orderKey] || '';
                            }
                        }
                    }
                    // Display the populated SVG in the preview area
                    document.getElementById('svgPreview').innerHTML = tempDiv.innerHTML;
                    
                    // Apply text wrapping to description field
                    wrapSVGText();

                } catch (error) {
                    console.error('Error loading or processing SVG:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Could not load document preview.',
                        customClass: { container: 'swal-on-top' }
                    });
                    document.getElementById('myModal').style.display = 'none'; // Hide modal on error
                }
            });
        });
    }

    // --- Close modal ---
    document.getElementById('closeModal').onclick = function () {
        document.getElementById('myModal').style.display = 'none';
    };

    // Close modal if clicked outside of it
    window.onclick = function (event) {
        const modal = document.getElementById('myModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    // --- Save as PDF ---
    document.getElementById('savePdfBtn').onclick = async function () {
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
            const response = await fetch('PremiumFreight.svg');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const svgText = await response.text();

            // Create a container for rendering off-screen
            const container = document.createElement('div');
            container.style.width = '816px'; // Standard page width in points (adjust if needed)
            container.style.height = '1056px'; // Standard page height in points (adjust if needed)
            container.style.position = 'absolute';
            container.style.left = '-9999px'; // Position off-screen
            container.style.backgroundColor = 'white'; // Ensure background for canvas
            container.innerHTML = svgText; // Load SVG template

            // Populate the SVG in the off-screen container
            for (const [svgId, orderKey] of Object.entries(svgMap)) {
                const element = container.querySelector(`#${svgId}`);
                if (element) {
                    // Special case for date
                    if (svgId === 'DateValue') {
                        element.textContent = formatDate(selectedOrder.date);
                    } else {
                        // Default behavior for all other elements
                        element.textContent = selectedOrder[orderKey] || '';
                    }
                }
            }

            document.body.appendChild(container); // Add to DOM for rendering
            
            // Apply text wrapping to the description field in the PDF export
            const descriptionElement = container.querySelector('#DescriptionAndRootCauseValue');
            if (descriptionElement) {
                // Create a temporary element to manipulate
                const tempTextElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
                // Copy attributes from the original element
                Array.from(descriptionElement.attributes).forEach(attr => {
                    tempTextElement.setAttribute(attr.name, attr.value);
                });
                
                // Set the text content for wrapping
                tempTextElement.textContent = selectedOrder.description || '';
                
                // Replace the original element with our temporary one
                descriptionElement.parentNode.replaceChild(tempTextElement, descriptionElement);
                
                // Now apply text wrapping to this element
                // We need to temporarily place it inside the actual DOM to ensure proper SVG namespace
                const tempDOMElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
                Array.from(tempTextElement.attributes).forEach(attr => {
                    tempDOMElement.setAttribute(attr.name, attr.value);
                });
                tempDOMElement.textContent = tempTextElement.textContent;
                
                // Add to and then remove from the real DOM to ensure proper namespace
                const svgPreview = document.getElementById('svgPreview');
                svgPreview.appendChild(tempDOMElement);
                
                // Now we can safely wrap the text
                // Get the current text content
                const text = tempDOMElement.textContent.trim();
                if (text) {
                    // Get original position and style properties
                    const x = tempDOMElement.getAttribute("x");
                    const y = tempDOMElement.getAttribute("y");
                    const fontSize = parseFloat(tempDOMElement.style.fontSize || "3.175px");
                    
                    // Calculate appropriate line spacing
                    const lineHeight = fontSize * 1.3;
                    
                    // Clear the current content
                    tempDOMElement.textContent = "";
                    
                    // Maximum characters per line
                    const maxCharsPerLine = 101;
                    
                    // Split text into words
                    const words = text.split(/\s+/);
                    let currentLine = "";
                    let firstLine = true;
                    
                    // Process each word
                    words.forEach(word => {
                        if ((currentLine + " " + word).length > maxCharsPerLine && currentLine.length > 0) {
                            const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                            tspan.setAttribute("x", x);
                            
                            if (firstLine) {
                                firstLine = false;
                            } else {
                                tspan.setAttribute("dy", `${lineHeight}px`);
                            }
                            
                            tspan.textContent = currentLine;
                            tempDOMElement.appendChild(tspan);
                            
                            currentLine = word;
                        } else {
                            if (currentLine.length > 0) {
                                currentLine += " " + word;
                            } else {
                                currentLine = word;
                            }
                        }
                    });
                    
                    if (currentLine.length > 0) {
                        const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                        tspan.setAttribute("x", x);
                        
                        if (!firstLine) {
                            tspan.setAttribute("dy", `${lineHeight}px`);
                        }
                        
                        tspan.textContent = currentLine;
                        tempDOMElement.appendChild(tspan);
                    }
                    
                    // Now replace the temporary element in the container
                    const containerDescriptionElement = container.querySelector('#DescriptionAndRootCauseValue');
                    containerDescriptionElement.parentNode.replaceChild(tempDOMElement.cloneNode(true), containerDescriptionElement);
                    
                    // Remove our temporary element from the DOM
                    svgPreview.removeChild(tempDOMElement);
                }
            }
            
            // Small delay to ensure rendering completes
            await new Promise(resolve => setTimeout(resolve, 300));

            // Generate canvas from the container
            const canvas = await html2canvas(container, {
                scale: 2, // Increase scale for better resolution
                logging: false, // Disable logging unless debugging
                useCORS: true,
                allowTaint: true, // May be needed for external resources if any
                backgroundColor: null // Use container's background
            });

            document.body.removeChild(container); // Clean up the temporary container

            // Initialize jsPDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: [canvas.width / 2, canvas.height / 2] // Use canvas dimensions scaled back
            });

            // Add canvas image to PDF
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);

            // Save the PDF
            const fileName = `PremiumFreight_${selectedOrder.id || 'Order'}.pdf`;
            pdf.save(fileName);

            // Success message
            Swal.fire({
                icon: 'success',
                title: 'PDF Successfully Generated!',
                html: `The file <b>${fileName}</b> has been downloaded successfully.`,
                confirmButtonText: 'OK',
                customClass: { container: 'swal-on-top' }
            });
            document.getElementById('myModal').style.display = 'none'; // Close modal after saving

        } catch (error) {
            console.error('Error generating PDF:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error Generating PDF',
                text: error.message || 'An unexpected error occurred.',
                confirmButtonText: 'OK',
                customClass: { container: 'swal-on-top' }
            });
            // Ensure temporary container is removed even on error
            const tempContainer = document.querySelector('div[style*="left: -9999px"]');
            if (tempContainer) {
                document.body.removeChild(tempContainer);
            }
        }
    };

    // --- Approve order ---
    document.getElementById('approveBtn').onclick = async function () {
        const selectedOrderId = sessionStorage.getItem('selectedOrderId');
        const selectedOrder = window.allOrders.find(order => order.id === parseInt(selectedOrderId)) || {};
        try {
            Swal.fire({
                title: 'Processing...',
                text: 'Updating order status',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); },
                customClass: { container: 'swal-on-top' }
            });

            // Calculate the next approval status ID
            const currentStatus = Number(selectedOrder.approval_status);
            const newStatusId = currentStatus + 1;

            // Prepare data for updating the approval status
            const updateData = {
                orderId: selectedOrder.id,
                newStatusId: newStatusId,
                userLevel: window.authorizationLevel,
                userID: window.userID,
                authDate: new Date().toISOString().slice(0, 19).replace('T', ' ') // Use ISO format
            };

            // Determine the overall status text ID based on the new approval level
            let updatedStatusTextId = 2; // Default to 'revision'
            const requiredLevel = Number(selectedOrder.required_auth_level || 7); // Assume 7 if missing
            if (newStatusId >= requiredLevel) {
                updatedStatusTextId = 3; // 'aprobado'
            }

            const updateStatusText = {
                orderId: selectedOrder.id,
                statusid: updatedStatusTextId
            };

            // --- API Calls ---
            // 1. Update approval_status and log the approval step
            const responseApproval = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoStatusUpdate.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            const resultApproval = await responseApproval.json();
            if (!resultApproval.success) {
                throw new Error(resultApproval.message || 'Error updating approval level.');
            }

            // 2. Update the overall status_id (text representation)
            const responseStatusText = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoStatusText.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateStatusText)
            });
            const resultStatusText = await responseStatusText.json();
            if (!resultStatusText.success) {
                // Log this error but might not need to stop the process if approval update worked
                console.error('Error updating status text:', resultStatusText.message);
            }

            // --- Success Handling ---
            // Update local data immediately for responsiveness
            selectedOrder.approval_status = newStatusId;
            selectedOrder.status_id = updatedStatusTextId; // Update status text ID locally
            // Find the corresponding status name (assuming you might have a map or need to fetch it)
            // For now, let's assume IDs map like: 1=nuevo, 2=revision, 3=aprobado, 4=rechazado
            if (updatedStatusTextId === 3) selectedOrder.status_name = 'aprobado';
            else if (updatedStatusTextId === 2) selectedOrder.status_name = 'revision';


            Swal.fire({
                icon: 'success',
                title: 'Order Approved',
                text: `Order ${selectedOrder.id} has been approved for the next level.`,
                confirmButtonText: 'OK',
                customClass: { container: 'swal-on-top' }
            });
            document.getElementById('myModal').style.display = 'none'; // Close modal

            // Refresh the cards display with updated data
            createCards(window.allOrders); // Re-render cards with updated local data

            // Optionally re-fetch all data from server if needed, but updating local is faster
            // fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPremiumFreight.php')
            //     .then(response => response.json())
            //     .then(data => createCards(data.data));

        } catch (error) {
            console.error('Error approving order:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Could not update order: ' + error.message,
                confirmButtonText: 'OK',
                customClass: { container: 'swal-on-top' }
            });
        }
    };

    // --- Reject order ---
    document.getElementById('rejectBtn').onclick = async function () {
        const selectedOrderId = sessionStorage.getItem('selectedOrderId');
        const selectedOrder = window.allOrders.find(order => order.id === parseInt(selectedOrderId)) || {};
        try {
            // Confirmation dialog before rejecting
            const confirmation = await Swal.fire({
                title: 'Are you sure?',
                text: `Do you really want to reject order ${selectedOrderId}? This action cannot be undone.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, reject it',
                cancelButtonText: 'Cancel',
                customClass: { container: 'swal-on-top' }
            });

            if (!confirmation.isConfirmed) {
                return; // Stop if user cancels
            }

            Swal.fire({
                title: 'Processing...',
                text: 'Rejecting the order',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); },
                customClass: { container: 'swal-on-top' }
            });

            const newStatusId = 99; // Specific status ID for rejection
            const updateData = {
                orderId: selectedOrder.id,
                newStatusId: newStatusId, // Set approval_status to 99
                userLevel: window.authorizationLevel,
                userID: window.userID,
                authDate: new Date().toISOString().slice(0, 19).replace('T', ' ') // Use ISO format
            };

            const updatedStatusTextId = 4; // Status text ID for 'rechazado'
            const updateStatusText = {
                orderId: selectedOrder.id,
                statusid: updatedStatusTextId
            };

            // --- API Calls ---
            // 1. Update approval_status to 99
            const responseApproval = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoStatusUpdate.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            const resultApproval = await responseApproval.json();
            if (!resultApproval.success) {
                throw new Error(resultApproval.message || 'Error updating approval level to rejected.');
            }

            // 2. Update the overall status_id to 'rechazado'
            const responseStatusText = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoStatusText.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateStatusText)
            });
            const resultStatusText = await responseStatusText.json();
            if (!resultStatusText.success) {
                console.error('Error updating status text to rejected:', resultStatusText.message);
            }

            // --- Success Handling ---
             // Update local data immediately
            selectedOrder.approval_status = newStatusId;
            selectedOrder.status_id = updatedStatusTextId;
            selectedOrder.status_name = 'rechazado';

            Swal.fire({
                icon: 'error', // Use error icon for rejection
                title: 'Order Rejected',
                text: `Order ${selectedOrderId} has been rejected successfully.`,
                confirmButtonText: 'OK',
                customClass: { container: 'swal-on-top' }
            });
            document.getElementById('myModal').style.display = 'none'; // Close modal

            // Refresh the cards display
            createCards(window.allOrders);

        } catch (error) {
            console.error('Error rejecting order:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Could not reject order: ' + error.message,
                confirmButtonText: 'OK',
                customClass: { container: 'swal-on-top' }
            });
        }
    };
});

