import React, { useContext, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../App";

const AppShell = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <span className="brand-kicker">EJ Labs Market</span>
          <NavLink to="/products" className="brand-title">
            동네 중고거래와 1:1 채팅
          </NavLink>
        </div>

        <nav className="app-nav">
          <NavLink to="/products" className={({ isActive }) => `app-nav__link ${isActive ? "active" : ""}`}>
            상품 둘러보기
          </NavLink>
          <NavLink to="/products/new" className={({ isActive }) => `app-nav__link ${isActive ? "active" : ""}`}>
            상품 등록
          </NavLink>
          <NavLink to="/products/me" className={({ isActive }) => `app-nav__link ${isActive ? "active" : ""}`}>
            내 상품
          </NavLink>
          <NavLink to="/chat/rooms" className={({ isActive }) => `app-nav__link ${isActive ? "active" : ""}`}>
            채팅방
          </NavLink>
        </nav>

        <div className="app-userbox">
          <div>
            <div className="app-userbox__label">Signed in</div>
            <div className="app-userbox__name">{user?.name ?? "사용자"}</div>
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
          </button>
        </div>
      </header>

      <main className="app-main">{children}</main>
    </div>
  );
};

export default AppShell;
