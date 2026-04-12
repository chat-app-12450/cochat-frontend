import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LocationContext } from "../App";
import ProductCard from "../components/ProductCard";
import { fetchWithAuth } from "../utils/api";

const STATUS_OPTIONS = ["ALL", "ON_SALE", "RESERVED", "SOLD"];
const VIEW_OPTIONS = ["LATEST", "NEARBY"];
const STATUS_LABELS = {
  ALL: "전체",
  ON_SALE: "판매중",
  RESERVED: "예약중",
  SOLD: "판매완료",
};

const MarketplacePage = () => {
  const [viewMode, setViewMode] = useState("LATEST");
  const [status, setStatus] = useState("ALL");
  const [radiusKm, setRadiusKm] = useState(3);
  const [page, setPage] = useState(0);
  const [productPage, setProductPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { verifiedLocation, locationLoading } = useContext(LocationContext);

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      if (viewMode === "NEARBY" && locationLoading) {
        return;
      }

      if (viewMode === "NEARBY" && !verifiedLocation) {
        if (isMounted) {
          setError(null);
          setLoading(false);
          setProductPage({
            products: [],
            page: 0,
            totalPages: 0,
            hasPrevious: false,
            hasNext: false,
          });
        }
        return;
      }

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
        if (viewMode === "NEARBY") {
          query.set("radius_km", String(radiusKm));
        }

        const endpoint = viewMode === "NEARBY"
          ? `/products/nearby?${query.toString()}`
          : `/products?${query.toString()}`;

        const response = await fetchWithAuth(endpoint, { method: "GET" });
        if (!isMounted) {
          return;
        }

        if (!response.success) {
          setError(response.error?.message ?? "상품 목록을 불러오지 못했습니다.");
          return;
        }

        setProductPage(response.response);
      } catch {
        if (isMounted) {
          setError("상품 목록 요청에 실패했습니다.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, [page, radiusKm, status, viewMode, verifiedLocation, locationLoading]);

  return (
    <div className="page-section">
      <div className="page-section__header">
        <div>
          <span className="section-kicker">Marketplace</span>
          <h1>방금 올라온 상품</h1>
          <p>
            실시간 1:1 채팅으로 바로 거래를 이어갈 수 있는 상품만 모았습니다.
          </p>
          {viewMode === "NEARBY" && (
            <div className="location-summary-card location-summary-card--inline">
              <div className="location-summary-card__header">
                <p className="muted-text">
                  {locationLoading
                    ? "현재 위치 인증 상태를 확인하는 중입니다."
                    : verifiedLocation
                      ? `인증 위치 기준 ${radiusKm}km 안의 상품을 거리순으로 보여줍니다.`
                      : "근처 상품을 보려면 먼저 위치 인증이 필요합니다."}
                </p>
                {!locationLoading && !verifiedLocation && (
                  <Link to="/location" className="ghost-button">
                    위치 인증하러 가기
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="toolbar-chip-row">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={`filter-chip ${viewMode === option ? "filter-chip--active" : ""}`}
              onClick={() => {
                setViewMode(option);
                setPage(0);
              }}
            >
              {option === "LATEST" ? "최신순" : "근처 상품"}
            </button>
          ))}
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
          {viewMode === "NEARBY" && [1, 3, 5, 10].map((option) => (
            <button
              key={`radius-${option}`}
              type="button"
              className={`filter-chip ${radiusKm === option ? "filter-chip--active" : ""}`}
              onClick={() => {
                setRadiusKm(option);
                setPage(0);
              }}
            >
              {option}km
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="feedback">상품을 불러오는 중입니다.</div>}
      {error && <div className="feedback feedback--error">{error}</div>}

      {!loading && !error && productPage?.products?.length === 0 && (
        <div className="empty-state">
          <h2>{viewMode === "NEARBY" ? "근처 상품을 불러올 수 없습니다" : "등록된 상품이 없습니다"}</h2>
          <p>
            {viewMode === "NEARBY" && !verifiedLocation
              ? "위치 인증을 완료하면 인증 위치 기준으로 근처 상품을 보여줍니다."
              : "가장 먼저 상품을 등록해서 거래를 시작해보세요."}
          </p>
        </div>
      )}

      <div className="product-grid">
        {productPage?.products?.map((product) => (
          <ProductCard key={product.id} product={product} />
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

export default MarketplacePage;
