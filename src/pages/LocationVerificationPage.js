import React, { useCallback, useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext, LocationContext } from "../App";
import { fetchWithAuth } from "../utils/api";

const LocationVerificationPage = () => {
  const { user } = useContext(AuthContext);
  const { verifiedLocation, setVerifiedLocation, locationLoading } = useContext(LocationContext);
  const [locationLabel, setLocationLabel] = useState("");
  const [status, setStatus] = useState("위치 인증을 완료하면 상품 등록과 오픈채팅 생성에서 자동으로 사용됩니다.");
  const [error, setError] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (verifiedLocation?.locationLabel) {
      setLocationLabel(verifiedLocation.locationLabel);
    }

    if (verifiedLocation) {
      setStatus(`현재 인증 위치: ${verifiedLocation.locationLabel || "좌표 인증 완료"}`);
    } else {
      setStatus("위치 인증을 완료하면 상품 등록과 오픈채팅 생성에서 자동으로 사용됩니다.");
    }
  }, [verifiedLocation]);

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

  const handleVerify = async () => {
    setError(null);
    setIsVerifying(true);
    setStatus("현재 위치를 확인하고 있습니다...");

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
        setStatus("위치 인증을 다시 시도해주세요.");
        return;
      }

      setVerifiedLocation(response.response ?? null);
      setStatus(
        `위치 인증 완료: ${response.response?.locationLabel || "좌표 인증 완료"} · 이후 기능에서 자동으로 사용됩니다.`
      );
    } catch {
      setError("위치 인증에 실패했습니다. 브라우저 위치 권한과 HTTPS 연결을 확인해주세요.");
      setStatus("위치 인증을 다시 시도해주세요.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="page-section page-section--narrow">
      <div className="page-section__header">
        <div>
          <span className="section-kicker">Neighborhood Verification</span>
          <h1>위치 인증</h1>
          <p>{user?.name ?? "사용자"}님의 현재 위치를 한 번 인증해두면 이후 생성 기능에서 자동으로 사용됩니다.</p>
        </div>
      </div>

      <div className="editor-card location-verification-card">
        <div className="location-summary-card">
          <div className="location-summary-card__header">
            <div>
              <strong>현재 인증 상태</strong>
              <p className="muted-text">
                {locationLoading
                  ? "저장된 위치 인증 상태를 불러오는 중입니다."
                  : verifiedLocation
                    ? `인증 위치: ${verifiedLocation.locationLabel || "좌표 인증 완료"}`
                    : "아직 인증된 위치가 없습니다."}
              </p>
            </div>
            {verifiedLocation && (
              <span className="chat-room-card__type">
                인증 완료
              </span>
            )}
          </div>
        </div>

        <label className="field-group">
          <span>위치 라벨</span>
          <input
            type="text"
            value={locationLabel}
            onChange={(event) => setLocationLabel(event.target.value)}
            placeholder="예: 성수동, 건대입구, 왕십리"
            maxLength={120}
          />
        </label>

        <div className="action-group location-action-row">
          <button
            type="button"
            className="primary-button"
            onClick={handleVerify}
            disabled={isVerifying}
          >
            {isVerifying ? "위치 인증 중..." : "현재 위치로 인증"}
          </button>
          <Link to="/products/new" className="ghost-button">
            상품 등록으로 이동
          </Link>
          <Link to="/chat/open" className="ghost-button">
            오픈채팅으로 이동
          </Link>
        </div>

        {error && <div className="feedback feedback--error">{error}</div>}
        <div className="detail-panel">
          <strong>안내</strong>
          <p className="muted-text">{status}</p>
        </div>
      </div>
    </div>
  );
};

export default LocationVerificationPage;
