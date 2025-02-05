const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');

const app = express();
const resend = new Resend('Resend API Key');

app.use(cors({
    origin: 'http://localhost:5500', // Replace with your frontend URL
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

// Endpoint to send email
app.post('/send-email', async (req, res) => {
    const { to, subject, html } = req.body;

    console.log('Received request to send email:', { to, subject, html }); // Debugging log

    try {
        const data = await resend.emails.send({
            from: 'vivekvmule@resend.dev', // Replace with your Resend domain
            to,
            subject,
            html,
        });

        console.log('Email sent successfully:', data); // Debugging log
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error sending email:', error); // Debugging log
        res.status(500).json({ success: false, error: 'Failed to send email' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
