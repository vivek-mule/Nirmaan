document.addEventListener("DOMContentLoaded", function () {
    const supabaseUrl = 'https://bxpdmbfmumlrnendmmhf.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4cGRtYmZtdW1scm5lbmRtbWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyMjE4NzUsImV4cCI6MjA1Mzc5Nzg3NX0.eiJauy8c-ntL7gjoIGNuv1z2CtaPAQSwnqcDcqTMbAw';

    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    const logoutButton = document.getElementById("logout");
    const requestTableBody = document.getElementById("requestTableBody");

    // Filter buttons
    const newRequestsButton = document.getElementById("newRequestsButton");
    const acceptedRequestsButton = document.getElementById("acceptedRequestsButton");
    const rejectedRequestsButton = document.getElementById("rejectedRequestsButton");

    // Logout functionality (updated)
    logoutButton.addEventListener("click", function () {
        if (confirm("Are you sure you want to log out?")) {
            // Update admin availability to false
            supabase
                .from('admin_availability')
                .update({ is_available: false })
                .eq('id', 1)
                .then(() => {
                    localStorage.removeItem("isAdminLoggedIn"); // Clear the admin login state
                    window.location.href = "login.html"; // Redirect to login page
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
            // Show loading message
            requestTableBody.innerHTML = "<tr><td colspan='10'>Loading...</td></tr>";

            // Fetch data from Supabase
            let query = supabase
                .from('print_jobs')
                .select('*')
                .order('created_at', { ascending: false }); // Sort by latest requests first

            // Apply status filter if provided
            if (status) {
                query = query.eq('status', status);
            }

            const { data: printRequests, error } = await query;

            if (error) {
                throw error;
            }

            // Clear the table body
            requestTableBody.innerHTML = "";

            if (printRequests.length === 0) {
                requestTableBody.innerHTML = "<tr><td colspan='10'>No print requests found.</td></tr>";
                return;
            }

            // Dynamically generate table rows
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
                            <button class="approve" onclick="approveRequest('${request.id}')">Approve</button>
                            <button class="reject" onclick="rejectRequest('${request.id}')">Reject</button>
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
    window.approveRequest = async function (requestId) {
        try {
            const { error } = await supabase
                .from('print_jobs')
                .update({ status: 'Approved' })
                .eq('id', requestId);

            if (error) {
                throw error;
            }

            alert("Print request approved!");
            loadPrintRequests(); // Refresh the list after action
        } catch (error) {
            console.error("Error approving request:", error);
            alert("Error approving request. Please try again.");
        }
    };

    // Reject Request
    window.rejectRequest = async function (requestId) {
        try {
            const { error } = await supabase
                .from('print_jobs')
                .update({ status: 'Rejected' })
                .eq('id', requestId);

            if (error) {
                throw error;
            }

            alert("Print request rejected!");
            loadPrintRequests(); // Refresh the list after action
        } catch (error) {
            console.error("Error rejecting request:", error);
            alert("Error rejecting request. Please try again.");
        }
    };

    // Check if logged in and load print requests
    let isLoggedIn = localStorage.getItem("isAdminLoggedIn");
    if (isLoggedIn) {
        // Update admin availability to true on login
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