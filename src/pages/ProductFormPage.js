import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ProductForm from "../components/ProductForm";
import { fetchWithAuth } from "../utils/api";
import { AuthContext } from "../App";

const EMPTY_FORM = {
  title: "",
  description: "",
  price: "",
  imageUrls: "",
};

const ProductFormPage = ({ mode }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(mode === "edit");
  const [error, setError] = useState(null);
  const [isEditable, setIsEditable] = useState(mode !== "edit");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { productId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (mode !== "edit" || !productId) {
      return;
    }

    let isMounted = true;

    const loadProduct = async () => {
      setLoading(true);
      setError(null);
      setIsEditable(false);
      try {
        const response = await fetchWithAuth(`/products/${productId}`, { method: "GET" });
        if (!isMounted) {
          return;
        }

        if (!response.success) {
          setError(response.error?.message ?? "상품 정보를 불러오지 못했습니다.");
          return;
        }

        const product = response.response;
        if (user?.userId && product.sellerUserId !== user.userId) {
          setError("본인 상품만 수정할 수 있습니다.");
          return;
        }

        setIsEditable(true);
        setForm({
          title: product.title ?? "",
          description: product.description ?? "",
          price: String(product.price ?? ""),
          imageUrls: (product.imageUrls ?? []).join("\n"),
        });
      } catch {
        if (isMounted) {
          setError("상품 정보를 불러오지 못했습니다.");
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
  }, [mode, productId, user?.userId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      imageUrls: form.imageUrls
        .split("\n")
        .map((url) => url.trim())
        .filter(Boolean),
    };

    try {
      const response = await fetchWithAuth(
        mode === "edit" ? `/products/${productId}` : "/products",
        {
          method: mode === "edit" ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        }
      );

      if (!response.success) {
        setError(response.error?.message ?? "상품 저장에 실패했습니다.");
        return;
      }

      navigate(`/products/${response.response.id}`, { replace: true });
    } catch {
      setError("상품 저장 요청에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-section page-section--narrow">
      <div className="page-section__header">
        <div>
          <span className="section-kicker">{mode === "edit" ? "Edit Listing" : "New Listing"}</span>
          <h1>{mode === "edit" ? "상품 수정" : "상품 등록"}</h1>
          <p>이미지 URL 기반으로 등록하고, 가격과 설명을 바로 수정할 수 있습니다.</p>
        </div>
      </div>

      {loading ? (
        <div className="feedback">상품 정보를 불러오는 중입니다.</div>
      ) : mode === "edit" && !isEditable ? (
        <div className="empty-state">
          <h2>수정 화면을 열 수 없습니다</h2>
          <p>{error ?? "본인 상품만 수정할 수 있습니다."}</p>
          <Link to="/products/me" className="primary-button">
            내 상품으로 돌아가기
          </Link>
        </div>
      ) : (
        <ProductForm
          form={form}
          onChange={handleChange}
          onSubmit={handleSubmit}
          submitLabel={mode === "edit" ? "상품 수정" : "상품 등록"}
          isSubmitting={isSubmitting}
          error={error}
        />
      )}
    </div>
  );
};

export default ProductFormPage;
