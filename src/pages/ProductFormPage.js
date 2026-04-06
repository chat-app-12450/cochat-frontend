import React, { useCallback, useContext, useEffect, useState } from "react";
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
  const [verifiedLocation, setVerifiedLocation] = useState(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [locationStatus, setLocationStatus] = useState("상품 등록 전에 현재 위치를 인증해주세요.");
  const [isLocating, setIsLocating] = useState(false);
  const [isVerifyingLocation, setIsVerifyingLocation] = useState(false);
  const { productId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const requestCurrentLocation = useCallback(() => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("이 브라우저에서는 위치 기능을 지원하지 않습니다."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => reject(new Error("현재 위치를 가져오지 못했습니다.")),
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }), []);

  const loadVerifiedLocation = useCallback(async () => {
    try {
      const response = await fetchWithAuth("/user/location", { method: "GET" });
      if (!response.success) {
        return;
      }

      const verified = response.response ?? null;
      setVerifiedLocation(verified);
      if (verified?.locationLabel) {
        setLocationLabel(verified.locationLabel);
      }
      if (verified) {
        setLocationStatus(`현재 인증 위치: ${verified.locationLabel || "좌표 인증 완료"}`);
      }
    } catch {
      // ignore optional state on first load
    }
  }, []);

  useEffect(() => {
    void loadVerifiedLocation();
  }, [loadVerifiedLocation]);

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

    if (mode !== "edit" && !verifiedLocation) {
      setError("상품 등록 전에 위치 인증을 먼저 해주세요.");
      setIsSubmitting(false);
      return;
    }

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

  const handleVerifyLocation = async () => {
    setError(null);
    setIsLocating(true);
    setIsVerifyingLocation(true);

    try {
      const currentLocation = await requestCurrentLocation();
      const response = await fetchWithAuth("/user/location/verify", {
        method: "POST",
        body: JSON.stringify({
          locationLabel: locationLabel.trim() || null,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        }),
      });

      if (!response.success) {
        setError(response.error?.message ?? "위치 인증에 실패했습니다.");
        return;
      }

      setVerifiedLocation(response.response);
      if (response.response?.locationLabel) {
        setLocationLabel(response.response.locationLabel);
      }
      setLocationStatus(
        `위치 인증 완료: ${response.response?.locationLabel || "좌표 인증 완료"} · ${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`
      );
    } catch {
      setError("위치 인증에 실패했습니다. 브라우저 위치 권한을 확인해주세요.");
    } finally {
      setIsLocating(false);
      setIsVerifyingLocation(false);
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
        <>
          {mode !== "edit" && (
            <div className="group-room-panel__create" style={{ marginBottom: 24 }}>
              <div className="group-room-panel__grid group-room-panel__grid--triple">
                <input
                  className="message-panel__input"
                  value={locationLabel}
                  onChange={(event) => setLocationLabel(event.target.value)}
                  placeholder="예: 성수동, 건대입구, 왕십리"
                  maxLength={120}
                />
                <button
                  type="button"
                  className="ghost-button"
                  onClick={handleVerifyLocation}
                  disabled={isLocating || isVerifyingLocation}
                >
                  {isVerifyingLocation ? "위치 인증 중..." : "현재 위치 인증"}
                </button>
                <span className="muted-text group-room-panel__status-chip">
                  {verifiedLocation ? `인증 위치: ${verifiedLocation.locationLabel || "좌표 인증 완료"}` : "위치 미인증"}
                </span>
              </div>
              <p className="muted-text group-room-panel__location-status">{locationStatus}</p>
            </div>
          )}

          <ProductForm
            form={form}
            onChange={handleChange}
            onSubmit={handleSubmit}
            submitLabel={mode === "edit" ? "상품 수정" : "상품 등록"}
            isSubmitting={isSubmitting}
            error={error}
          />
        </>
      )}
    </div>
  );
};

export default ProductFormPage;
