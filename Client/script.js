document.addEventListener('DOMContentLoaded', function () {
    const supabaseUrl = 'https://bxpdmbfmumlrnendmmhf.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4cGRtYmZtdW1scm5lbmRtbWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyMjE4NzUsImV4cCI6MjA1Mzc5Nzg3NX0.eiJauy8c-ntL7gjoIGNuv1z2CtaPAQSwnqcDcqTMbAw';

    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    const loadingDiv = document.getElementById('loading');
    const submitButton = document.getElementById('submitButton');

    async function submitPrintJob() {
        try {
            loadingDiv.style.display = 'block';

            // Get form values
            const name = document.getElementById("name").value;
            const phone = document.getElementById("phone").value;
            const fileInput = document.getElementById("file");
            const pages = document.getElementById("pages").value; // New field: Number of Pages
            const colour = document.getElementById("colour").value;
            const copies = document.getElementById("copies").value;

            // Validate phone number
            if (!/^\d{10}$/.test(phone)) {
                throw new Error("Please enter a valid 10-digit phone number");
            }

            // Check file
            if (!fileInput.files[0]) {
                throw new Error("Please upload a file");
            }

            const file = fileInput.files[0];
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

            // Save to database
            const { data: printJobData, error: dbError } = await supabase
                .from('print_jobs')
                .insert([
                    {
                        name: name,
                        phone: phone,
                        file_name: fileName,
                        file_url: fileUrl,
                        no_of_pages: parseInt(pages), // New field: Number of Pages
                        colour: colour,
                        copies: parseInt(copies),
                        status: 'Pending',
                        created_at: new Date().toISOString() // Use 'created_at' instead of 'timestamp'
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
            loadingDiv.style.display = 'none';
        }
    }

    // Attach event listener to submit button
    if (submitButton) {
        submitButton.addEventListener('click', submitPrintJob);
    }

    // Add form validation for phone number
    const phoneInput = document.getElementById('phone');
    phoneInput.addEventListener('input', function (e) {
        this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
    });
});
