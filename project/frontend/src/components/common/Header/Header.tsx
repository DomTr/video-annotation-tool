// src/components/common/Header.tsx

import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import styles from './Header.module.css'; // Import CSS Module for styling

const Header: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen((prev) => !prev);
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    return (
        <header className={styles.header}>
            <div className={styles.logo}>
                <Link to="/" onClick={closeMobileMenu}>
                    EntAnnotate
                </Link>
            </div>
            <nav id="primary-navigation" className={`${styles.nav} ${isMobileMenuOpen ? styles.open : ''}`}>
                <ul className={styles.navList}>
                    <li>
                        <NavLink
                            to="/about"
                            className={({ isActive }) => isActive ? styles.active : undefined}
                            onClick={closeMobileMenu}
                        >
                            About
                        </NavLink>
                    </li>
                    <li>
                        <NavLink
                            to="/contact"
                            className={({ isActive }) => isActive ? styles.active : undefined}
                            onClick={closeMobileMenu}
                        >
                            Contact
                        </NavLink>
                    </li>
                    {/* Add more navigation links as needed */}
                </ul>
            </nav>
            <button
                className={styles.mobileMenuButton}
                onClick={toggleMobileMenu}
                aria-label="Toggle navigation menu"
                aria-expanded={isMobileMenuOpen}
                aria-controls="primary-navigation"
            >
                <span className={styles.bar}></span>
                <span className={styles.bar}></span>
                <span className={styles.bar}></span>
            </button>
        </header>
    );
};

export default Header;
