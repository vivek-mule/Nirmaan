document.addEventListener('DOMContentLoaded', function () {
    const supabaseUrl = 'API Endpoint';
    const supabaseKey = 'API Key';

    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    const loadingDiv = document.getElementById('loading');
    const payButton = document.getElementById('payButton');
    const submitButton = document.getElementById('submitButton');
    const fileInput = document.getElementById('file');
    const pagesInput = document.getElementById('pages');

    let paymentAmount = 0; // To store the calculated payment amount
    let paymentId = null; // To store the Razorpay payment ID

    // Function to check admin availability
    async function checkAdminAvailability() {
        try {
            const { data, error } = await supabase
                .from('admin_availability')
                .select('is_available')
                .eq('id', 1)
                .single();

            if (error) throw error;
            return data.is_available;
        } catch (error) {
            console.error("Error checking admin availability:", error);
            return false;
        }
    }

    // Disable form if admin is not available
    async function initializeForm() {
        const isAdminAvailable = await checkAdminAvailability();
        if (!isAdminAvailable) {
            document.querySelectorAll('#printForm input, #printForm select, #printForm button')
                .forEach(element => {
                    element.disabled = true;
                    element.style.opacity = '0.6';
                    element.style.cursor = 'not-allowed';
                });
            alert("Form submissions are currently disabled as the admin is not available.");
        }
    }

    // Initialize form availability check
    initializeForm();

    // Function to count pages in a PDF file
    async function countPDFPages(file) {
        const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
        return pdf.numPages;
    }

    // Handle file input change
    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            try {
                // If the file is a PDF, count the pages
                if (file.type === 'application/pdf') {
                    const pageCount = await countPDFPages(file);
                    pagesInput.value = pageCount; // Auto-fill the number of pages
                } else {
                    // For non-PDF files, set pages to 1 (or any default value)
                    pagesInput.value = 1;
                }
                validateForm(); // Re-validate the form
            } catch (error) {
                console.error("Error processing file:", error);
                alert("Failed to process the file. Please try again.");
            }
        }
    });

    // Function to validate the form
    function validateForm() {
        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const file = fileInput.files[0];
        const pages = pagesInput.value.trim();
        const colour = document.getElementById("colour").value.trim();
        const copies = document.getElementById("copies").value.trim();

        // Check if all fields are filled
        if (name && email && phone && file && pages && colour && copies) {
            payButton.disabled = false; // Enable the Pay with Razorpay button
        } else {
            payButton.disabled = true; // Disable the Pay with Razorpay button
        }
    }

    // Attach event listeners to form fields for real-time validation
    document.getElementById("name").addEventListener("input", validateForm);
    document.getElementById("email").addEventListener("input", validateForm);
    document.getElementById("phone").addEventListener("input", validateForm);
    document.getElementById("colour").addEventListener("change", validateForm);
    document.getElementById("copies").addEventListener("input", validateForm);

    // Initially disable the Pay with Razorpay button
    payButton.disabled = true;

    // Function to calculate payment amount
    function calculateAmount(pages, colour, copies) {
        const pricePerPage = colour === 'Black and white' ? 2 : 10; // ₹2 for B&W, ₹10 for colour
        return pages * pricePerPage * copies; // Total amount
    }

    // Function to handle Razorpay payment
    async function handlePayment(amount) {
        const options = {
            key: 'Razorpay API Key', // Your Razorpay key_id
            amount: amount * 100, // Amount in paise (e.g., ₹100 = 10000 paise)
            currency: 'INR',
            name: 'Print Job Payment',
            description: 'Payment for print job',
            handler: async function (response) {
                // Payment successful
                alert(`Payment successful! Payment ID: ${response.razorpay_payment_id}`);

                // Store payment ID and amount
                paymentId = response.razorpay_payment_id;
                paymentAmount = amount;

                // Show the Submit button
                submitButton.style.display = 'block';
            },
            prefill: {
                name: document.getElementById("name").value,
                email: document.getElementById("email").value, // Use the email from the form
                contact: document.getElementById("phone").value
            },
            theme: {
                color: '#007bff'
            }
        };

        const rzp = new Razorpay(options);
        rzp.open();
    }

    // Attach event listener to payment button
    payButton.addEventListener('click', async function () {
        try {
            // Check admin availability before payment
            const isAdminAvailable = await checkAdminAvailability();
            if (!isAdminAvailable) {
                alert("Form submissions are currently disabled. Please try again later.");
                return;
            }

            // Show loading state
            loadingDiv.style.display = 'block';

            // Get form values
            const pages = pagesInput.value;
            const colour = document.getElementById("colour").value;
            const copies = document.getElementById("copies").value;

            // Calculate payment amount
            const amount = calculateAmount(pages, colour, copies);

            // Trigger Razorpay payment
            handlePayment(amount);
        } catch (error) {
            console.error("Error processing payment:", error);
            alert(error.message || "Error processing payment. Please try again.");
        } finally {
            // Hide loading state
            loadingDiv.style.display = 'none';
        }
    });

    // Attach event listener to submit button
    submitButton.addEventListener('click', async function () {
        try {
            // Show loading state
            loadingDiv.style.display = 'block';

            // Get form values
            const name = document.getElementById("name").value;
            const email = document.getElementById("email").value; // Get email value
            const phone = document.getElementById("phone").value;
            const file = fileInput.files[0];
            const pages = pagesInput.value;
            const colour = document.getElementById("colour").value;
            const copies = document.getElementById("copies").value;

            const fileName = `${Date.now()}_${file.name}`;

            // Upload file to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('print-job-files')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                throw uploadError;
            }

            // Get the public URL
            const { data: { publicUrl: fileUrl } } = supabase.storage
                .from('print-job-files')
                .getPublicUrl(fileName);

            // Save to database with payment amount and payment ID
            const { data: printJobData, error: dbError } = await supabase
                .from('print_jobs')
                .insert([
                    {
                        name: name,
                        email: email, // Add email to the database
                        phone: phone,
                        file_name: fileName,
                        file_url: fileUrl,
                        no_of_pages: parseInt(pages),
                        colour: colour,
                        copies: parseInt(copies),
                        status: 'Pending',
                        created_at: new Date().toISOString(),
                        payment_amount: paymentAmount, // Add payment amount to the database
                        payment_id: paymentId // Save Razorpay payment ID
                    }
                ]);

            if (dbError) {
                throw dbError;
            }

            alert("Print job submitted successfully!");
            // Reset form
            document.getElementById("printForm").reset();
            window.location.href = "payment.html";
        } catch (error) {
            console.error("Error submitting print job:", error);
            alert(error.message || "Error submitting print job. Please try again.");
        } finally {
            // Hide loading state
            loadingDiv.style.display = 'none';
        }
    });
});
