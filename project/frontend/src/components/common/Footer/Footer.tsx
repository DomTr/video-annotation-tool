// src/components/common/Header.tsx

import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import styles from '../Header/Header.module.css'; // Import CSS Module for styling

const Header: React.FC = () => {
    return (
        <header className={styles.header}>
            <div className={styles.logo}>
                <Link to="/">EntAnnotate</Link> {/* Logo links to Home */}
            </div>
            <nav>
                <ul className={styles.navList}>
                    <li>
                        <NavLink
                            to="/about"
                            className={({ isActive }) => isActive ? styles.active : undefined}
                        >
                            About
                        </NavLink>
                    </li>
                    <li>
                        <NavLink
                            to="/contact"
                            className={({ isActive }) => isActive ? styles.active : undefined}
                        >
                            Contact
                        </NavLink>
                    </li>
                    {/* Add more navigation links as needed */}
                </ul>
            </nav>
        </header>
    );
};

export default Header;
