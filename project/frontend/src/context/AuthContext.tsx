// src/context/AuthContext.tsx

import React, { createContext, useState, ReactNode, useEffect } from 'react';

// Define the shape of your user data
interface User {
    id: number;
    name: string;
    // Add other relevant fields as needed
}

interface AuthContextType {
    authToken: string | null;
    setAuthToken: (token: string | null) => void;
    user: User | null;
    setUser: (user: User | null) => void;
}

export const AuthContext = createContext<AuthContextType>({
    authToken: null,
    setAuthToken: () => {},
    user: null,
    setUser: () => {},
});

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [authToken, setAuthToken] = useState<string | null>(() => {
        // Initialize authToken from localStorage if available
        return localStorage.getItem('authToken');
    });
    const [user, setUser] = useState<User | null>(() => {
        // Initialize user from localStorage if available
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    });

    // Effect to persist authToken to localStorage
    useEffect(() => {
        if (authToken) {
            localStorage.setItem('authToken', authToken);
        } else {
            localStorage.removeItem('authToken');
        }
    }, [authToken]);

    // Effect to persist user data to localStorage
    useEffect(() => {
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            localStorage.removeItem('user');
        }
    }, [user]);

    // Optionally, you can fetch user data when authToken changes
    // This is useful if you don't store user data in localStorage
    useEffect(() => {
        const fetchUser = async () => {
            if (!authToken) {
                setUser(null);
                return;
            }

            try {
                const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}/users/me`, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                    },
                });

                if (response.ok) {
                    const userData: User = await response.json();
                    setUser(userData);
                } else {
                    throw new Error('Failed to fetch user data.');
                }
            } catch (error) {
                console.error('Error fetching user:', error);
                setAuthToken(null);
                setUser(null);
            }
        };

        fetchUser();
    }, [authToken]);

    return (
        <AuthContext.Provider value={{ authToken, setAuthToken, user, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};
