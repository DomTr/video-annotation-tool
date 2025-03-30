// src/pages/ContactPage.tsx

import React from 'react';
import ContactForm from '../pages/ContactForm';
import styles from './ContactPage.module.css'; // Import the CSS module

const ContactPage: React.FC = () => {
    return (
        <div className={styles.contactContainer}>
            <h1>Get in Touch</h1>
            <p>
                We're excited to hear from you! Whether you have questions, feedback, or just want to connect,
                please use the form below to reach out to us. We'll get back to you as soon as possible.
            </p>
            <ContactForm />
        </div>
    );
};

export default ContactPage;
