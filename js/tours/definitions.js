/**
 * @file definitions.js
 * Central repository for all Driver.js tour steps.
 * Each key represents a unique tour, and its value is an array of step objects.
 */

export const tourSteps = {
    // --- Authentication Tours ---
    'login': [
        { element: '#email', popover: { title: 'Email Address', description: 'Enter your registered email address here to log in.' } },
        { element: '#password', popover: { title: 'Password', description: 'Enter your password. Click the eye icon to show/hide it.' } },
        { element: '#btnLogin', popover: { title: 'Sign In', description: 'Click here to access your account.' } },
        { element: 'a[href="register.php"]', popover: { title: 'New Account', description: 'If you don\'t have an account, you can create one here.' } },
        { element: 'a[href="recovery.php"]', popover: { title: 'Forgot Password?', description: 'If you forgot your password, click here to recover it.' } }
    ],
    'register': [
        { element: '#email', popover: { title: 'Email Address', description: 'Provide a valid email. We will send a verification link here.' } },
        { element: '#name', popover: { title: 'Complete Name', description: 'Enter your full name.' } },
        { element: '#plant', popover: { title: 'Select Your Plant', description: 'Choose the plant you belong to from this list.' } },
        { element: '#password', popover: { title: 'Create a Password', description: 'Create a secure password. It must be at least 8 characters long and include letters and numbers.' } },
        { element: 'button[type="submit"]', popover: { title: 'Register Account', description: 'Once all fields are filled, click here to create your account.' } }
    ],
    'recovery': [
        { element: '#email', popover: { title: 'Enter Your Email', description: 'Enter the email address associated with your account to receive a recovery link.' } },
        { element: 'button[type="submit"]', popover: { title: 'Send Email', description: 'Click here and we will send the instructions to your email.' } }
    ],
    'verification': [
        { element: '.verification-container', popover: { title: 'Account Verification', description: 'This page confirms that a verification email has been sent.' } },
        { element: '.email-display', popover: { title: 'Your Email', description: 'We sent the email to this address.' } },
        { element: '.steps', popover: { title: 'Important Steps', description: 'Please follow these steps in your email client to ensure you receive all notifications from us.' } },
        { element: '.btn-resend', popover: { title: 'Resend Email', description: 'If you did not receive the email, you can click here to send it again.' } }
    ],
    'profile-update': [
        { element: '#username', popover: { title: 'Update Your Name', description: 'You can change your display name here.' } },
        { element: '#current-password', popover: { title: 'Change Password', description: 'To change your password, first enter your current one here.' } },
        { element: '#new-password', popover: { title: 'New Password', description: 'Then, enter your new desired password.' } },
        { element: '#update-profile', popover: { title: 'Save Changes', description: 'Click this button to save all your profile updates.' } }
    ],
    'profile-view-orders': [
        { element: 'a[href="myorders.php"]', popover: { title: 'View My Orders', description: 'Click this button to go to a page that lists all the orders you have created.' } }
    ],


    // --- Order Management Tours ---
    'create-order': [
        { element: '#SectPlantas', popover: { title: 'Plant Information', description: 'Start by selecting the requesting plant and its corresponding code.' } },
        { element: '#SectTransporte', popover: { title: 'Transport Details', description: 'Choose the transport mode and specify if it\'s Inbound or Outbound.' } },
        { element: '#SectResponsability', popover: { title: 'Responsibility', description: 'Define the area of responsibility and who will pay for the service.' } },
        { element: '#SectCause', popover: { title: 'Cause and Recovery', description: 'Select the root cause for the freight. If you select any option other than "No Recovery", a file upload field with ID "recoveryFileContainer" will appear. This field is mandatory. Please upload a document (like a commitment letter or email) as proof that the recovery is in process.' } },
        { element: '#SectDescription', popover: { title: 'Description of Actions', description: 'Describe in detail the immediate and permanent actions that were taken in response to the issue.' } },
        { element: '#SectShip', popover: { title: 'Origin (Ship From)', description: 'Select the company and city where the shipment originates.' } },
        { element: '#SectDest', popover: { title: 'Destination', description: 'Select the company and city for the destination.' } },
        { element: '#SectCarrier', popover: { title: 'Carrier & Cost', description: 'Finally, select the carrier, enter the quoted cost, and add a reference number.' } },
        { element: '#enviar', popover: { title: 'Submit Order', description: 'Once the form is complete, click here to submit it for approval.' } }
    ],
    'my-orders-view': [
        { element: '#searchInput', popover: { title: 'Search Orders', description: 'You can quickly find any of your orders by typing its ID or description here.' } },
        { element: '#main', popover: { title: 'Your Orders', description: 'This area displays a list of all the orders you have created. You can click on any card to see more details.' } },
        { element: '.card-order', popover: { title: 'Order Card', description: 'Each card shows a summary of the order, including its current status (Pending, Approved, or Rejected).' } }
    ],
    'order-progress': [
        { element: '#progressSection', popover: { title: 'Approval Progress', description: 'This timeline shows the current status of your order and who has approved it so far.' } },
        { element: '#svgContent', popover: { title: 'Order Details', description: 'Here you can see a full visualization of the order details you submitted.' } }
    ],
    'order-search': [
        { element: '#searchInput', popover: { title: 'Search Orders', description: 'Use this search bar to filter orders by ID, description, or any other relevant data.' } }
    ],
    'order-download-pdf': [
        { element: '#myModal', popover: { title: 'Order Preview', description: 'This is a preview of your order.' } },
        { element: '#savePdfBtn', popover: { title: 'Download as PDF', description: 'Click this button to download a PDF copy of this order authorization.' } }
    ],

    // --- Admin & Approval Tours ---
    'approve-order': [
        { element: '.status-section', popover: { title: 'Approval Actions', description: 'As an approver, you can see the order status and take action.' } },
        { element: '#approveBtn', popover: { title: 'Approve', description: 'Click here to approve this freight authorization.' } },
        { element: '#rejectBtn', popover: { title: 'Reject', description: 'Click here to reject it. You will be asked to provide a reason.' } },
        { element: '#progressSection', popover: { title: 'Approval History', description: 'The progress bar shows who has already approved this order.' } }
    ],
    'weekly-approvals': [
        { element: '.bulk-header', popover: { title: 'Bulk Actions', description: 'From this header, you can approve, reject, or download all pending orders at once.' } },
        { element: '.orders-grid', popover: { title: 'Pending Orders', description: 'This grid shows all orders currently waiting for your approval.' } },
        { element: '.order-card-bulk', popover: { title: 'Individual Order', description: 'You can also review and approve/reject each order individually from its card.' } }
    ],
    'total-history': [
        { element: '#filterPanelBody', popover: { title: 'Filter Data', description: 'Use these filters to narrow down the order history by date, plant, status, or cost.' } },
        { element: '#totalHistoryTable', popover: { title: 'Complete History', description: 'This table contains a record of every order ever created in the system.' } },
        { element: '.dt-buttons', popover: { title: 'Export Data', description: 'You can export the filtered data to Excel or PDF using these buttons.' } }
    ],

    // --- Dashboard Tours ---
    'dashboard-overview': [
        { element: '#filterscards', popover: { title: 'Key Performance Indicators (KPIs)', description: 'These cards show the most important high-level metrics at a glance.' } },
        { element: '#chartAreaDistribution', popover: { title: 'Data Charts', description: 'The dashboard is composed of multiple charts that break down the data in different ways.' } },
        { element: '#dateRange', popover: { title: 'Filter by Date', description: 'You can change the date range for all charts here.' } }
    ],

    // --- User Management Tours (Super Admin) ---
    'user-management': [
        { element: '#users-table_filter', popover: { title: 'Search Users', description: 'Quickly find any user by name or email.' } },
        { element: '.dt-buttons', popover: { title: 'Add New User', description: 'Click here to add a new user to the system.' } },
        { element: '.btn-edit', popover: { title: 'Edit User', description: 'Click this button to modify a user\'s details, such as their role, plant, or password.' } },
        { element: '.btn-delete', popover: { title: 'Delete User', description: 'This button will permanently remove a user from the system.' } }
    ]
};

/**
 * Maps pages to their relevant help questions (tours).
 * This determines which questions appear in the "Help" dropdown on each page.
 */
export const pageTours = {
    'index.php': {
        'How to log in?': 'login'
    },
    'register.php': {
        'How to sign up?': 'register'
    },
    'recovery.php': {
        'How to recover a password?': 'recovery'
    },
    'verification_required.php': {
        'How to verify my email?': 'verification'
    },
    'profile.php': {
        'How to update your username?': 'profile-update',
        'How to change your password?': 'profile-update',
        'How to see your orders?': 'profile-view-orders'
    },
    'newOrder.php': {
        'How to create a new order?': 'create-order',
        'How to select origin/destination?': 'create-order',
        'How to choose a carrier?': 'create-order'
    },
    'myorders.php': {
        'How to view my created orders?': 'my-orders-view',
        'How to search for specific orders?': 'my-orders-view',
        'How to download order details?': 'my-orders-view'
    },
    'myOrder.php': {
        'How to track my order\'s progress?': 'order-progress'
    },
    'orders.php': { // Admin view of all orders
        'How to approve/reject an order?': 'approve-order',
        'How to view total order history?': 'total-history'
    },
    'weekOrders.php': {
        'How to view weekly pending approvals?': 'weekly-approvals',
        'How to perform bulk approvals?': 'weekly-approvals'
    },
    'view_order.php': {
        'How to approve a single order?': 'approve-order',
        'How to view order details?': 'approve-order'
    },
    'dashboard.php': {
        'How to navigate the dashboard?': 'dashboard-overview',
        'How to filter dashboard data?': 'dashboard-overview'
    },
    'adminUsers.php': {
        'How to manage user accounts?': 'user-management',
        'How to set user authorization levels?': 'user-management'
    },
    'total-orders-history.php': {
        'How to view total order history?': 'total-history'
    },
    'weekly-orders-history.php': {
        'How to view weekly order history?': 'total-history' // Can reuse total history tour
    }
};
