import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../utils/api";
import { AuthContext } from "../App";

const LoginPage = () => {
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { setUser } = useContext(AuthContext);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);

        const response = await fetchWithAuth("/user/login", {
            method: "POST",
            body: JSON.stringify({ userId, password }),
        });

        if (response.success) {
            setUser(response.response); // Store user state
            navigate("/"); // Redirect to homepage
        } else {
            setError(response.error?.message || "Login failed");
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #228be6 0%, #74c0fc 100%)",
            }}
        >
            <div
                style={{
                    background: "white",
                    padding: 40,
                    borderRadius: 16,
                    boxShadow: "0 4px 24px rgba(34,139,230,0.15)",
                    minWidth: 320,
                    maxWidth: 350,
                    width: "100%",
                }}
            >
                <h2 style={{
                    textAlign: "center",
                    color: "#228be6",
                    marginBottom: 24,
                    fontWeight: 700,
                    letterSpacing: 1
                }}>로그인</h2>
                {error && <p style={{ color: "#ff6b6b", textAlign: "center", marginBottom: 16 }}>{error}</p>}
                <form onSubmit={handleLogin}>
                    <input
                        type="text"
                        placeholder="User ID"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        required
                        style={{
                            width: "100%",
                            padding: "12px 14px",
                            marginBottom: 14,
                            border: "1px solid #b6e0fe",
                            borderRadius: 8,
                            fontSize: 16,
                            outline: "none",
                            boxSizing: "border-box",
                            transition: "border 0.2s",
                        }}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{
                            width: "100%",
                            padding: "12px 14px",
                            marginBottom: 20,
                            border: "1px solid #b6e0fe",
                            borderRadius: 8,
                            fontSize: 16,
                            outline: "none",
                            boxSizing: "border-box",
                            transition: "border 0.2s",
                        }}
                    />
                    <button
                        type="submit"
                        style={{
                            width: "100%",
                            padding: "12px 0",
                            background: "linear-gradient(90deg, #228be6 60%, #4dabf7 100%)",
                            color: "white",
                            border: "none",
                            borderRadius: 8,
                            fontWeight: 600,
                            fontSize: 17,
                            letterSpacing: 1,
                            cursor: "pointer",
                            boxShadow: "0 2px 8px rgba(34,139,230,0.08)",
                            transition: "background 0.2s",
                        }}
                    >
                        로그인
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
