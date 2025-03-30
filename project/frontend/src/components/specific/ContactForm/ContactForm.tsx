import React, { useState } from 'react';
import styles from './ContactForm.module.css';

interface FormData {
    name: string;
    email: string;
    subject: string;
    message: string;
}

const ContactForm: React.FC = () => {
    const [formData, setFormData] = useState<FormData>({
        name: '',
        email: '',
        subject: '',
        message: '',
    });

    const [submitted, setSubmitted] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Basic validation
        if (!formData.name || !formData.email || !formData.subject || !formData.message) {
            setError('Please fill in all fields.');
            return;
        }

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setSubmitted(true);
                setFormData({ name: '', email: '', subject: '', message: '' });
            } else {
                setError('There was an error submitting the form. Please try again.');
            }
        } catch (err) {
            console.error(err);
            setError('There was an error submitting the form. Please try again.');
        }
    };

    if (submitted) {
        return (
            <div className={styles.successMessage}>
                <h3>Thank you!</h3>
                <p>Your message has been sent successfully. We will get back to you soon.</p>
            </div>
        );
    }

    return (
        <form className={styles.contactForm} onSubmit={handleSubmit}>
            {error && <p className={styles.error}>{error}</p>}

            {/* Name Field */}
            <div className={styles.formGroup}>
                <label htmlFor="name">Name</label>
                <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="Your full name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                />
            </div>

            {/* Email Field */}
            <div className={styles.formGroup}>
                <label htmlFor="email">Email</label>
                <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Your email address"
                    value={formData.email}
                    onChange={handleChange}
                    required
                />
            </div>

            {/* Subject Field */}
            <div className={styles.formGroup}>
                <label htmlFor="subject">Subject</label>
                <input
                    type="text"
                    id="subject"
                    name="subject"
                    placeholder="Subject of your message"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                />
            </div>

            {/* Message Field */}
            <div className={styles.formGroup}>
                <label htmlFor="message">Message</label>
                <textarea
                    id="message"
                    name="message"
                    placeholder="Write your message here"
                    rows={5}
                    value={formData.message}
                    onChange={handleChange}
                    required
                ></textarea>
            </div>

            {/* Submit Button */}
            <button type="submit" className={styles.submitButton}>
                Send Message
            </button>
        </form>
    );
};

export default ContactForm;
