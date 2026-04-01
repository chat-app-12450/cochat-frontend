import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { fetchWithAuth } from "../utils/api";

const STATUS_OPTIONS = ["ALL", "ON_SALE", "RESERVED", "SOLD"];
const STATUS_LABELS = {
  ALL: "전체",
  ON_SALE: "판매중",
  RESERVED: "예약중",
  SOLD: "판매완료",
};

const MyProductsPage = () => {
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(0);
  const [productPage, setProductPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadMyProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams({
          page: String(page),
          size: "12",
        });
        if (status !== "ALL") {
          query.set("status", status);
        }

        const response = await fetchWithAuth(`/products/me?${query.toString()}`, { method: "GET" });
        if (!isMounted) {
          return;
        }

        if (!response.success) {
          setError(response.error?.message ?? "내 상품을 불러오지 못했습니다.");
          return;
        }

        setProductPage(response.response);
      } catch {
        if (isMounted) {
          setError("내 상품 목록 요청에 실패했습니다.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadMyProducts();
    return () => {
      isMounted = false;
    };
  }, [page, status]);

  return (
    <div className="page-section">
      <div className="page-section__header">
        <div>
          <span className="section-kicker">My Inventory</span>
          <h1>내가 올린 상품</h1>
          <p>등록한 상품 상태를 바꾸고, 예약과 구매 진행 상황을 관리할 수 있습니다.</p>
        </div>
        <Link to="/products/new" className="primary-button">
          새 상품 등록
        </Link>
      </div>

      <div className="toolbar-chip-row">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className={`filter-chip ${status === option ? "filter-chip--active" : ""}`}
            onClick={() => {
              setStatus(option);
              setPage(0);
            }}
          >
            {STATUS_LABELS[option]}
          </button>
        ))}
      </div>

      {loading && <div className="feedback">내 상품을 불러오는 중입니다.</div>}
      {error && <div className="feedback feedback--error">{error}</div>}
      {!loading && !error && productPage?.products?.length === 0 && (
        <div className="empty-state">
          <h2>등록한 상품이 없습니다</h2>
          <p>새 상품을 등록하면 이곳에서 수정과 상태 변경을 할 수 있습니다.</p>
        </div>
      )}

      <div className="product-grid">
        {productPage?.products?.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            actionLabel="수정"
            actionTo={`/products/${product.id}/edit`}
          />
        ))}
      </div>

      {productPage && (
        <div className="pagination-bar">
          <button
            type="button"
            className="ghost-button"
            onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
            disabled={!productPage.hasPrevious}
          >
            이전
          </button>
          <span className="muted-text">
            {productPage.page + 1} / {Math.max(productPage.totalPages, 1)} 페이지
          </span>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setPage((prev) => prev + 1)}
            disabled={!productPage.hasNext}
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
};

export default MyProductsPage;
