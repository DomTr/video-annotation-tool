// src/pages/AboutPage.tsx

import React from 'react';
import styles from './AboutPage.module.css';

const AboutPage: React.FC = () => {
    return (
        <div className={styles.aboutContainer}>
            <h1>About EntAnnotate</h1>
            <p>
                Welcome to <strong>EntAnnotate</strong>, an innovative poly annotation application developed by a dedicated team of four passionate students. Born out of our collaborative efforts in a comprehensive web development course, EntAnnotate is designed to streamline the annotation of polyps in medical videos, enhancing the efficiency and accuracy of medical data processing.
            </p>

            <h2>Our Journey</h2>
            <p>
                Throughout our course, we partnered closely with the course organizers to transform a conceptual idea into a tangible, user-friendly tool. Our hands-on experience in web development, combined with invaluable guidance from our mentors, has enabled us to create a platform that addresses real-world challenges faced by medical professionals.
            </p>

            <h2>Our Mission</h2>
            <p>
                EntAnnotate's mission is to empower physicians by providing a seamless and efficient annotation process for polyps in medical videos. By accelerating the data annotation workflow, we aim to facilitate the creation of high-quality datasets essential for training advanced machine learning models that can accurately recognize and analyze polyps, ultimately contributing to better diagnostic tools and patient outcomes.
            </p>

            <h2>Why EntAnnotate?</h2>
            <p>
                Combining cutting-edge web technologies with intuitive design, EntAnnotate offers a robust solution tailored to the needs of medical professionals. Our platform not only simplifies the annotation process but also ensures data integrity and consistency, making it an indispensable tool for both research and clinical applications.
            </p>

            <h2>Our Team</h2>
            <p>
                Our team comprises four enthusiastic students with diverse backgrounds in development, design, and project management. United by a common goal, we bring together our unique skills and perspectives to continuously enhance EntAnnotate. Our collaboration with course organizers has been instrumental in refining our approach and achieving milestones that set the foundation for a successful product launch.
            </p>

            <h2>Looking Ahead</h2>
            <p>
                With the foundational version of EntAnnotate completed, we are now focused on transforming it into a fully-fledged product. Our vision includes expanding its capabilities, integrating advanced features, and ensuring scalability to meet the growing demands of the medical community. We invite you to join us on this exciting journey as we strive to make EntAnnotate an essential tool in medical data annotation.
            </p>
        </div>
    );
};

export default AboutPage;
