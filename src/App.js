import React, { createContext, useContext, useEffect, useState } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MarketplacePage from "./pages/MarketplacePage";
import ProductDetailPage from "./pages/ProductDetailPage";
import ProductFormPage from "./pages/ProductFormPage";
import MyProductsPage from "./pages/MyProductsPage";
import ChatPage from "./pages/ChatPage";
import OpenChatPage from "./pages/OpenChatPage";
import AppShell from "./components/AppShell";
import { fetchWithAuth } from "./utils/api";

export const AuthContext = createContext();

const DEFAULT_PRIVATE_ROUTE = "/products";

const LoadingScreen = () => (
  <div className="auth-screen">
    <div className="auth-card auth-card--compact">
      <div className="spinner" />
      <p className="auth-subcopy">세션을 확인하는 중입니다.</p>
    </div>
  </div>
);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const validateToken = async () => {
      try {
        const response = await fetchWithAuth("/user/validate-token", { method: "GET" });
        if (!isMounted) {
          return;
        }
        setUser(response.success ? response.response : null);
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    validateToken();
    return () => {
      isMounted = false;
    };
  }, []);

  const logout = async () => {
    try {
      await fetchWithAuth("/user/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <LoadingScreen />;
  }

  return user ? children : <Navigate to="/login" replace />;
};

const PublicOnlyRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <LoadingScreen />;
  }

  return user ? <Navigate to={DEFAULT_PRIVATE_ROUTE} replace /> : children;
};

const PrivateLayoutRoute = ({ children }) => (
  <ProtectedRoute>
    <AppShell>{children}</AppShell>
  </ProtectedRoute>
);

const DefaultRoute = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <LoadingScreen />;
  }

  return <Navigate to={user ? DEFAULT_PRIVATE_ROUTE : "/login"} replace />;
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<DefaultRoute />} />
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/products"
            element={
              <PrivateLayoutRoute>
                <MarketplacePage />
              </PrivateLayoutRoute>
            }
          />
          <Route
            path="/products/new"
            element={
              <PrivateLayoutRoute>
                <ProductFormPage mode="create" />
              </PrivateLayoutRoute>
            }
          />
          <Route
            path="/products/me"
            element={
              <PrivateLayoutRoute>
                <MyProductsPage />
              </PrivateLayoutRoute>
            }
          />
          <Route
            path="/products/:productId"
            element={
              <PrivateLayoutRoute>
                <ProductDetailPage />
              </PrivateLayoutRoute>
            }
          />
          <Route
            path="/products/:productId/edit"
            element={
              <PrivateLayoutRoute>
                <ProductFormPage mode="edit" />
              </PrivateLayoutRoute>
            }
          />
          <Route
            path="/chat/rooms"
            element={
              <PrivateLayoutRoute>
                <ChatPage />
              </PrivateLayoutRoute>
            }
          />
          <Route
            path="/chat/open"
            element={
              <PrivateLayoutRoute>
                <OpenChatPage />
              </PrivateLayoutRoute>
            }
          />
          <Route
            path="/chat/:roomId"
            element={
              <PrivateLayoutRoute>
                <ChatPage />
              </PrivateLayoutRoute>
            }
          />
          <Route path="*" element={<DefaultRoute />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
