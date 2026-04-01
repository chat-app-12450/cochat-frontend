import React from "react";

const STATUS_LABELS = {
  ON_SALE: "판매중",
  RESERVED: "예약중",
  SOLD: "판매완료",
};

const ProductStatusBadge = ({ status }) => (
  <span className={`status-badge status-badge--${status?.toLowerCase() ?? "unknown"}`}>
    {STATUS_LABELS[status] ?? status ?? "상태 없음"}
  </span>
);

export default ProductStatusBadge;
