import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../App";
import ProductStatusBadge from "../components/ProductStatusBadge";
import { fetchWithAuth } from "../utils/api";

const formatPrice = (price) =>
  `${new Intl.NumberFormat("ko-KR").format(Number(price ?? 0))}원`;

const ProductDetailPage = () => {
  const { productId } = useParams();
  const { user } = useContext(AuthContext);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [busyAction, setBusyAction] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const loadProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchWithAuth(`/products/${productId}`, { method: "GET" });
        if (!isMounted) {
          return;
        }

        if (!response.success) {
          setError(response.error?.message ?? "상품 정보를 불러오지 못했습니다.");
          return;
        }

        setProduct(response.response);
        setActiveImageIndex(0);
      } catch {
        if (isMounted) {
          setError("상품 상세 요청에 실패했습니다.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProduct();
    return () => {
      isMounted = false;
    };
  }, [productId]);

  const isOwner = user?.userId && product?.sellerUserId === user.userId;
  const isReservedBuyer = user?.userId && product?.reservedBuyerUserId === user.userId;

  const refreshProduct = async () => {
    const response = await fetchWithAuth(`/products/${productId}`, { method: "GET" });
    if (response.success) {
      setProduct(response.response);
    } else {
      setActionError(response.error?.message ?? "상품 상태를 다시 불러오지 못했습니다.");
    }
  };

  const handleMutation = async (actionKey, endpoint, method = "POST", body = null) => {
    setBusyAction(actionKey);
    setActionError(null);
    try {
      const response = await fetchWithAuth(endpoint, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      if (!response.success) {
        setActionError(response.error?.message ?? "요청을 처리하지 못했습니다.");
        return;
      }

      if (response.response?.id) {
        setProduct(response.response);
      } else {
        await refreshProduct();
      }
    } catch {
      setActionError("요청 처리 중 오류가 발생했습니다.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateChat = async () => {
    setBusyAction("chat");
    setActionError(null);
    try {
      const response = await fetchWithAuth(`/products/${productId}/chat-rooms`, { method: "POST" });
      if (!response.success) {
        setActionError(response.error?.message ?? "채팅방을 만들지 못했습니다.");
        return;
      }
      navigate(`/chat/${response.response.id}`);
    } catch {
      setActionError("채팅방 생성 요청에 실패했습니다.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("정말 이 상품을 삭제할까요?")) {
      return;
    }

    setBusyAction("delete");
    setActionError(null);
    try {
      const response = await fetchWithAuth(`/products/${productId}`, { method: "DELETE" });
      if (!response.success) {
        setActionError(response.error?.message ?? "상품 삭제에 실패했습니다.");
        return;
      }
      navigate("/products/me", { replace: true });
    } catch {
      setActionError("상품 삭제 요청에 실패했습니다.");
    } finally {
      setBusyAction(null);
    }
  };

  const renderActionButtons = () => {
    if (!product) {
      return null;
    }

    if (isOwner) {
      return (
        <div className="action-group">
          <Link className="primary-button" to={`/products/${product.id}/edit`}>
            상품 수정
          </Link>
          {product.status === "RESERVED" && (
            <button
              type="button"
              className="ghost-button"
              disabled={busyAction === "reopen"}
              onClick={() => handleMutation("reopen", `/products/${product.id}/reopen`)}
            >
              판매중 복귀
            </button>
          )}
          {product.status === "ON_SALE" && (
            <button
              type="button"
              className="ghost-button"
              disabled={busyAction === "manual-sold"}
              onClick={() =>
                handleMutation("manual-sold", `/products/${product.id}/status`, "PATCH", { status: "SOLD" })
              }
            >
              판매완료 처리
            </button>
          )}
          <button type="button" className="danger-button" disabled={busyAction === "delete"} onClick={handleDelete}>
            상품 삭제
          </button>
        </div>
      );
    }

    return (
      <div className="action-group">
        <button
          type="button"
          className="primary-button"
          disabled={busyAction === "chat"}
          onClick={handleCreateChat}
        >
          {busyAction === "chat" ? "채팅방 생성 중..." : "채팅하기"}
        </button>

        {product.status === "ON_SALE" && (
          <>
            <button
              type="button"
              className="ghost-button"
              disabled={busyAction === "reserve"}
              onClick={() => handleMutation("reserve", `/products/${product.id}/reserve`)}
            >
              예약하기
            </button>
            <button
              type="button"
              className="ghost-button"
              disabled={busyAction === "purchase"}
              onClick={() => handleMutation("purchase", `/products/${product.id}/purchase`)}
            >
              바로 구매
            </button>
          </>
        )}

        {product.status === "RESERVED" && isReservedBuyer && (
          <>
            <button
              type="button"
              className="ghost-button"
              disabled={busyAction === "purchase"}
              onClick={() => handleMutation("purchase", `/products/${product.id}/purchase`)}
            >
              구매 확정
            </button>
            <button
              type="button"
              className="ghost-button"
              disabled={busyAction === "cancel-reserve"}
              onClick={() => handleMutation("cancel-reserve", `/products/${product.id}/reserve/cancel`)}
            >
              예약 취소
            </button>
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="feedback">상품 정보를 불러오는 중입니다.</div>;
  }

  if (error || !product) {
    return <div className="feedback feedback--error">{error ?? "상품 정보를 찾을 수 없습니다."}</div>;
  }

  const currentImage = product.imageUrls?.[activeImageIndex] ?? null;

  return (
    <div className="detail-layout">
      <section className="detail-visual">
        <div className="detail-visual__hero">
          {currentImage ? (
            <img src={currentImage} alt={product.title} />
          ) : (
            <div className="detail-visual__fallback">NO IMAGE</div>
          )}
        </div>
        <div className="detail-visual__thumbs">
          {(product.imageUrls ?? []).map((imageUrl, index) => (
            <button
              key={`${imageUrl}-${index}`}
              type="button"
              className={`detail-thumb ${activeImageIndex === index ? "detail-thumb--active" : ""}`}
              onClick={() => setActiveImageIndex(index)}
            >
              <img src={imageUrl} alt={`${product.title}-${index + 1}`} />
            </button>
          ))}
        </div>
      </section>

      <section className="detail-meta">
        <div className="detail-meta__header">
          <ProductStatusBadge status={product.status} />
          <span className="muted-text">version {product.version}</span>
        </div>
        <h1>{product.title}</h1>
        <p className="detail-price">{formatPrice(product.price)}</p>
        <p className="detail-description">{product.description}</p>

        <div className="detail-panel">
          <div className="detail-row">
            <span>판매자</span>
            <strong>{product.sellerName}</strong>
          </div>
          <div className="detail-row">
            <span>예약자</span>
            <strong>{product.reservedBuyerName ?? "-"}</strong>
          </div>
          <div className="detail-row">
            <span>구매자</span>
            <strong>{product.soldBuyerName ?? "-"}</strong>
          </div>
        </div>

        {actionError && <div className="feedback feedback--error">{actionError}</div>}

        {renderActionButtons()}
      </section>
    </div>
  );
};

export default ProductDetailPage;
