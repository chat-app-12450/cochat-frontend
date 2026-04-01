import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../utils/api";

const INITIAL_FORM = {
  email: "",
  name: "",
  userId: "",
  password: "",
};

const RegisterPage = () => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithAuth("/user/register", {
        method: "POST",
        body: JSON.stringify(form),
      });

      if (!response.success) {
        setError(response.error?.message ?? "회원가입에 실패했습니다.");
        return;
      }

      navigate("/login", { replace: true });
    } catch {
      setError("회원가입 요청에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card auth-card--wide">
        <span className="section-kicker">Join EJ Labs Market</span>
        <h1>동네 거래를 시작할 계정을 만드세요</h1>
        <p className="auth-subcopy">
          상품 등록부터 예약, 구매, 1:1 채팅까지 한 흐름으로 이어집니다.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field-group">
            <span>이메일</span>
            <input name="email" type="email" value={form.email} onChange={handleChange} required />
          </label>

          <div className="editor-grid">
            <label className="field-group">
              <span>이름</span>
              <input name="name" value={form.name} onChange={handleChange} required />
            </label>

            <label className="field-group">
              <span>아이디</span>
              <input name="userId" value={form.userId} onChange={handleChange} required />
            </label>
          </div>

          <label className="field-group">
            <span>비밀번호</span>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              minLength={8}
              required
            />
          </label>

          {error && <div className="feedback feedback--error">{error}</div>}

          <button type="submit" className="primary-button primary-button--full" disabled={isSubmitting}>
            {isSubmitting ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <p className="auth-link-row">
          이미 계정이 있나요? <Link to="/login">로그인으로 이동</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
