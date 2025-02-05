document.addEventListener("DOMContentLoaded", function () {
    const supabaseUrl = 'API Endpoint';
    const supabaseKey = 'API Key';

    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    const logoutButton = document.getElementById("logout");
    const requestTableBody = document.getElementById("requestTableBody");

    // Filter buttons
    const newRequestsButton = document.getElementById("newRequestsButton");
    const acceptedRequestsButton = document.getElementById("acceptedRequestsButton");
    const rejectedRequestsButton = document.getElementById("rejectedRequestsButton");

    // Function to send email via backend
    async function sendEmail(to, subject, htmlContent) {
        console.log('Sending email:', { to, subject, htmlContent });

        try {
            const response = await fetch('http://localhost:3000/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to,
                    subject,
                    html: htmlContent,
                }),
            });

            const data = await response.json();
            console.log('Email response:', data);

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send email');
            }
            return data;
        } catch (error) {
            console.error("Error sending email:", error);
            throw error;
        }
    }

    logoutButton.addEventListener("click", function () {
        if (confirm("Are you sure you want to log out?")) {
            supabase
                .from('admin_availability')
                .update({ is_available: false })
                .eq('id', 1)
                .then(() => {
                    localStorage.removeItem("isAdminLoggedIn");
                    window.location.href = "login.html";
                })
                .catch((error) => {
                    console.error("Logout error:", error);
                    alert("Error during logout. Please try again.");
                });
        }
    });

    // Function to load print requests based on status
    async function loadPrintRequests(status = null) {
        try {
            requestTableBody.innerHTML = "<tr><td colspan='10'>Loading...</td></tr>";
            let query = supabase
                .from('print_jobs')
                .select('*')
                .order('created_at', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            const { data: printRequests, error } = await query;

            if (error) {
                throw error;
            }

            requestTableBody.innerHTML = "";

            if (printRequests.length === 0) {
                requestTableBody.innerHTML = "<tr><td colspan='10'>No print requests found.</td></tr>";
                return;
            }

            printRequests.forEach(request => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${request.name}</td>
                    <td>${request.phone}</td>
                    <td><a href="${request.file_url}" target="_blank">View File</a></td>
                    <td>${request.no_of_pages}</td>
                    <td>${request.colour}</td>
                    <td>${request.copies}</td>
                    <td>${request.status}</td>
                    <td>${request.payment_amount}</td>
                    <td>${request.payment_id}</td>
                    <td>
                        ${request.status === 'Pending' ? `
                            <button class="approve" onclick="approveRequest('${request.id}', '${request.email}')">Approve</button>
                            <button class="reject" onclick="rejectRequest('${request.id}', '${request.email}')">Reject</button>
                        ` : ''}
                    </td>
                `;
                requestTableBody.appendChild(row);
            });
        } catch (error) {
            console.error("Error fetching print requests:", error);
            requestTableBody.innerHTML = "<tr><td colspan='10'>Error loading print requests. Please try again.</td></tr>";
        }
    }

    // Attach event listeners to filter buttons
    newRequestsButton.addEventListener("click", function () {
        loadPrintRequests('Pending');
    });

    acceptedRequestsButton.addEventListener("click", function () {
        loadPrintRequests('Approved');
    });

    rejectedRequestsButton.addEventListener("click", function () {
        loadPrintRequests('Rejected');
    });

    // Approve Request
    window.approveRequest = async function (requestId, userEmail) {
        try {
            const { error } = await supabase
                .from('print_jobs')
                .update({ status: 'Approved' })
                .eq('id', requestId);

            if (error) {
                throw error;
            }

            // Send approval email
            await sendEmail(userEmail, 'Print Job Accepted', `<p>Your print job with ID ${requestId} has been accepted.</p>`);
            alert("Print request approved and email sent!");
            loadPrintRequests(); // Refresh the list after action
        } catch (error) {
            console.error("Error approving request:", error);
            alert("Error approving request. Please try again.");
        }
    };

    // Reject Request
    window.rejectRequest = async function (requestId, userEmail) {
        try {
            const { error } = await supabase
                .from('print_jobs')
                .update({ status: 'Rejected' })
                .eq('id', requestId);

            if (error) {
                throw error;
            }

            // Send rejection email
            await sendEmail(userEmail, 'Print Job Rejected', `<p>Your print job with ID ${requestId} has been rejected.</p>`);
            alert("Print request rejected and email sent!");
            loadPrintRequests(); // Refresh the list after action
        } catch (error) {
            console.error("Error rejecting request:", error);
            alert("Error rejecting request. Please try again.");
        }
    };

    // Check if logged in and load print requests
    let isLoggedIn = localStorage.getItem("isAdminLoggedIn");
    if (isLoggedIn) {
        supabase
            .from('admin_availability')
            .update({ is_available: true })
            .eq('id', 1)
            .then(() => {
                loadPrintRequests(); // Load all requests by default
            })
            .catch((error) => {
                console.error("Error updating admin availability:", error);
                alert("Error initializing admin session. Please log in again.");
                window.location.href = "login.html";
            });
    } else {
        alert("Access denied! Please log in.");
        window.location.href = "login.html";
    }
});
