import React from "react";
import { useNavigate } from "react-router-dom";
import ProductStatusBadge from "./ProductStatusBadge";

const formatPrice = (price) =>
  new Intl.NumberFormat("ko-KR").format(Number(price ?? 0));

const formatDate = (value) => {
  if (!value) {
    return "";
  }
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
};

const ProductCard = ({ product, actionLabel, actionTo }) => {
  const navigate = useNavigate();

  return (
    <article
      className="product-card"
      onClick={() => navigate(`/products/${product.id}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate(`/products/${product.id}`);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="product-card__image">
        {product.thumbnailUrl ? (
          <img src={product.thumbnailUrl} alt={product.title} />
        ) : (
          <div className="product-card__image-fallback">NO IMAGE</div>
        )}
      </div>

      <div className="product-card__body">
        <div className="product-card__topline">
          <ProductStatusBadge status={product.status} />
          <span className="muted-text">{formatDate(product.createdAt)}</span>
        </div>

        <h3>{product.title}</h3>
        <p className="product-card__price">{formatPrice(product.price)}원</p>
        <p className="muted-text">판매자 {product.sellerName}</p>

        {actionLabel && actionTo && (
          <button
            type="button"
            className="inline-link-button"
            onClick={(event) => {
              event.stopPropagation();
              navigate(actionTo);
            }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </article>
  );
};

export default ProductCard;
