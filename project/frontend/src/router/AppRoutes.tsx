// src/routes/AppRoutes.tsx
import React, {useContext} from 'react';
import {Routes, Route, Navigate } from 'react-router-dom';
import AboutPage from '../pages/AboutPage';
import ContactPage from '../pages/ContactPage';
import NotFoundPage from "../pages/NotFoundPage";
import VideoAnnotationPage from "../pages/VideoAnnotationpage";
import Login from '../pages/Login';
import Register from '../pages/Register';
import EntAnnotationDashboard from "../pages/HomePage";
import {AuthContext} from "../context/AuthContext";


const AppRoutes: React.FC = () => {
    const { authToken } = useContext(AuthContext);

    return (
        <Routes>
            <Route
                path="/"
                element={
                    authToken ? (
                        <Navigate to="/dashboard" replace />
                    ) : (
                        <Navigate to="/login" replace />
                    )
                }
            />

            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />

            <Route
                path="/login"
                element={authToken ? <Navigate to="/dashboard" replace /> : <Login />}
            />
            <Route
                path="/register"
                element={authToken ? <Navigate to="/dashboard" replace /> : <Register />}
            />

            <Route
                path="/dashboard"
                element={authToken ? <EntAnnotationDashboard /> : <Navigate to="/login" replace />}
            />
            <Route
                path="/video/:id"
                element={authToken ? <VideoAnnotationPage /> : <Navigate to="/login" replace />}
            />

            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
};

export default AppRoutes;