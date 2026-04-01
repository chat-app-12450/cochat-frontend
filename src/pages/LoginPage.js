import React, { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../utils/api";
import { AuthContext } from "../App";

const LoginPage = () => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetchWithAuth("/user/login", {
        method: "POST",
        body: JSON.stringify({ userId, password }),
      });

      if (!response.success) {
        setError(response.error?.message || "로그인에 실패했습니다.");
        return;
      }

      setUser(response.response);
      navigate("/products", { replace: true });
    } catch {
      setError("로그인 요청에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <span className="section-kicker">EJ Labs Market</span>
        <h1>실시간 채팅이 붙은 동네 중고거래</h1>
        <p className="auth-subcopy">
          상품을 등록하고, 관심 있는 사용자와 바로 1:1 대화를 시작하세요.
        </p>

        <form className="auth-form" onSubmit={handleLogin}>
          <label className="field-group">
            <span>아이디</span>
            <input
              type="text"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              required
            />
          </label>

          <label className="field-group">
            <span>비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error && <div className="feedback feedback--error">{error}</div>}

          <button
            type="submit"
            className="primary-button primary-button--full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="auth-link-row">
          아직 계정이 없나요? <Link to="/register">회원가입</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
