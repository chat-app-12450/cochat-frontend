import React, { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import ChatPage from "./pages/ChatPage";
import { fetchWithAuth } from "./utils/api";

export const AuthContext = createContext(); // ✅ Export the context

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);  // Add loading state

    useEffect(() => {
        const validateToken = async () => {
            try {
                const response = await fetchWithAuth(`/user/validate-token`, { method: "POST" });
                console.log(response);
                if (response.success) {
                    setUser(response.response);
                    console.log("New user data:", response.response);
                } else {
                    setUser(null); // Explicitly set user to null if validation fails
                }
            } catch (error) {
                console.error("Token validation failed", error);
                setUser(null); // Clear user state on error
            } finally {
                setLoading(false);  // Set loading to false when done
            }
        };
        validateToken();
    }, []);

    useEffect(() => {
        console.log("User state updated:", user);
    }, [user]);

    return <AuthContext.Provider value={{ user, setUser, loading }}>{children}</AuthContext.Provider>;
};

const ProtectedRoute = ({ element }) => {
    const { user, loading } = useContext(AuthContext);
    
    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }
    
    return user ? element : <Navigate to="/login" />;
};

const App = () => {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/" element={<ProtectedRoute element={<HomePage />} />} />
                    <Route path="/profile" element={<ProtectedRoute element={<ProfilePage />} />} />
                    {/* <Route path="/chat/:roomId" element={<ProtectedRoute element={<ChatPage />} />} /> */}
                    <Route path="/chat/:roomId" element={<ChatPage />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
};

export default App;
