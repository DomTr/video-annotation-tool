// src/pages/NotFoundPage.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import styles from './NotFoundPage.module.css'; // Optional: For styling

const NotFoundPage: React.FC = () => {
    return (
        <div className={styles.notFoundContainer}>
            <h1>404 - Page Not Found</h1>
            <p>
                Oops! The page you're looking for doesn't exist. Go back to the{' '}
                <Link to="/">Home Page</Link>.
            </p>
        </div>
    );
};

export default NotFoundPage;
