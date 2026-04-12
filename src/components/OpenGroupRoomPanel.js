import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LocationContext } from "../App";
import { fetchWithAuth } from "../utils/api";

const DEFAULT_RADIUS_KM = 3;

const formatMessageTime = (value) => {
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

const formatDistance = (distanceMeters) => {
  if (distanceMeters == null) {
    return "";
  }

  const distance = Number(distanceMeters);
  if (!Number.isFinite(distance)) {
    return "";
  }

  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  }

  return `${(distance / 1000).toFixed(1)}km`;
};

const OpenGroupRoomPanel = ({ onOpenRoom }) => {
  const [keywordInput, setKeywordInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [joinedRooms, setJoinedRooms] = useState([]);
  const [searchRooms, setSearchRooms] = useState([]);
  const [joinedLoading, setJoinedLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(50);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [isCreating, setIsCreating] = useState(false);
  const [joiningRoomId, setJoiningRoomId] = useState(null);
  const [leavingRoomId, setLeavingRoomId] = useState(null);
  const { verifiedLocation, locationLoading } = useContext(LocationContext);

  const loadJoinedRooms = useCallback(async () => {
    setJoinedLoading(true);
    try {
      const response = await fetchWithAuth("/chat/open-rooms/joined", { method: "GET" });
      if (!response.success) {
        setError(response.error?.message ?? "참여 중인 오픈채팅을 불러오지 못했습니다.");
        return;
      }
      setJoinedRooms(response.response?.chatRooms ?? []);
    } catch {
      setError("참여 중인 오픈채팅 요청에 실패했습니다.");
    } finally {
      setJoinedLoading(false);
    }
  }, []);

  const loadSearchRooms = useCallback(async (keyword, location, searchRadiusKm) => {
    setSearchLoading(true);

    try {
      const query = new URLSearchParams();
      if (keyword) {
        query.set("keyword", keyword);
      }
      if (location?.latitude != null && location?.longitude != null) {
        query.set("latitude", String(location.latitude));
        query.set("longitude", String(location.longitude));
        query.set("radius_km", String(searchRadiusKm ?? DEFAULT_RADIUS_KM));
      }

      const endpoint = query.toString()
        ? `/chat/open-rooms?${query.toString()}`
        : "/chat/open-rooms";

      const response = await fetchWithAuth(endpoint, { method: "GET" });
      if (!response.success) {
        setError(response.error?.message ?? "오픈채팅 검색에 실패했습니다.");
        return;
      }

      setSearchRooms(response.response?.chatRooms ?? []);
    } catch {
      setError("오픈채팅 검색 요청에 실패했습니다.");
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const searchLocation = useMemo(() => (
    verifiedLocation?.latitude != null && verifiedLocation?.longitude != null
      ? verifiedLocation
      : null
  ), [verifiedLocation]);

  const locationStatus = useMemo(() => {
    if (locationLoading) {
      return "위치 인증 상태를 확인하는 중입니다.";
    }

    if (!verifiedLocation) {
      return "위치 인증 페이지에서 현재 위치를 인증하면 오픈채팅 생성과 근처 검색에 자동으로 사용됩니다.";
    }

    return `인증 위치: ${verifiedLocation.locationLabel || "좌표 인증 완료"} · 반경 ${radiusKm}km 기준으로 근처 오픈채팅을 찾습니다.`;
  }, [locationLoading, verifiedLocation, radiusKm]);

  useEffect(() => {
    setError(null);
    void loadJoinedRooms();
    void loadSearchRooms(searchKeyword, searchLocation, radiusKm);
  }, [loadJoinedRooms, loadSearchRooms, searchKeyword, searchLocation, radiusKm]);

  const joinedRoomIds = useMemo(
    () => new Set(joinedRooms.map((room) => room.id)),
    [joinedRooms]
  );

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    setSearchKeyword(keywordInput.trim());
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    const trimmedName = createName.trim();
    const trimmedDescription = createDescription.trim();
    if (!trimmedName) {
      setError("오픈채팅 이름을 입력해주세요.");
      return;
    }

    if (!maxParticipants || Number(maxParticipants) < 2) {
      setError("최대 인원은 2명 이상이어야 합니다.");
      return;
    }

    if (locationLoading) {
      setError("위치 인증 상태를 확인하는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    if (!verifiedLocation) {
      setError("오픈채팅을 만들기 전에 위치 인증 페이지에서 현재 위치를 먼저 인증해주세요.");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetchWithAuth("/chat/open-rooms", {
        method: "POST",
        body: JSON.stringify({
          name: trimmedName,
          description: trimmedDescription || null,
          maxParticipants: Number(maxParticipants),
        }),
      });

      if (!response.success) {
        setError(response.error?.message ?? "오픈채팅 생성에 실패했습니다.");
        return;
      }

      setCreateName("");
      setCreateDescription("");
      setMaxParticipants(50);
      await loadJoinedRooms();
      await loadSearchRooms(searchKeyword, searchLocation, radiusKm);
      onOpenRoom(response.response.id);
    } catch {
      setError("오픈채팅 생성 요청에 실패했습니다.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async (room) => {
    setJoiningRoomId(room.id);
    setError(null);

    try {
      const response = await fetchWithAuth(`/chat/open-rooms/${room.id}/join`, {
        method: "POST",
      });

      if (!response.success) {
        setError(response.error?.message ?? "오픈채팅 참여에 실패했습니다.");
        return;
      }

      await loadJoinedRooms();
      await loadSearchRooms(searchKeyword, searchLocation, radiusKm);
      onOpenRoom(response.response.id);
    } catch {
      setError("오픈채팅 참여 요청에 실패했습니다.");
    } finally {
      setJoiningRoomId(null);
    }
  };

  const handleLeave = async (roomId) => {
    setLeavingRoomId(roomId);
    setError(null);

    try {
      const response = await fetchWithAuth(`/chat/open-rooms/${roomId}/leave`, {
        method: "POST",
      });

      if (!response.success) {
        setError(response.error?.message ?? "오픈채팅 나가기에 실패했습니다.");
        return;
      }

      await loadJoinedRooms();
      await loadSearchRooms(searchKeyword, searchLocation, radiusKm);
    } catch {
      setError("오픈채팅 나가기 요청에 실패했습니다.");
    } finally {
      setLeavingRoomId(null);
    }
  };

  return (
    <section className="group-room-panel">
      <div className="page-section__header page-section__header--compact">
        <div>
          <span className="section-kicker">Open Chat</span>
          <h2>오픈채팅</h2>
        </div>
      </div>

      <form className="group-room-panel__create" onSubmit={handleCreateSubmit}>
        <div className="group-room-panel__grid group-room-panel__grid--triple">
          <input
            className="message-panel__input"
            value={createName}
            onChange={(event) => setCreateName(event.target.value)}
            placeholder="예: 강서구 자취생 모임"
            maxLength={100}
          />
          <input
            className="message-panel__input"
            type="number"
            min="2"
            max="500"
            value={maxParticipants}
            onChange={(event) => setMaxParticipants(event.target.value)}
            placeholder="최대 인원"
          />
          <button type="submit" className="primary-button" disabled={isCreating}>
            {isCreating ? "생성 중..." : "오픈채팅 만들기"}
          </button>
        </div>
        <div className="location-summary-card">
          <div className="location-summary-card__header">
            <div>
              <strong>위치 인증 상태</strong>
              <p className="muted-text">{locationStatus}</p>
            </div>
            <Link
              to="/location"
              className={verifiedLocation ? "ghost-button" : "primary-button"}
            >
              {verifiedLocation ? "위치 다시 인증" : "위치 인증하러 가기"}
            </Link>
          </div>
        </div>
        <textarea
          className="group-room-panel__textarea"
          value={createDescription}
          onChange={(event) => setCreateDescription(event.target.value)}
          placeholder="채팅방 소개를 짧게 적어두면 검색한 사용자가 분위기를 파악하기 쉽습니다."
          maxLength={500}
          rows={3}
        />
      </form>

      <div className="group-room-panel__section">
        <div className="page-section__header page-section__header--compact">
          <div>
            <span className="section-kicker">Joined</span>
            <h3>내가 참여 중인 오픈채팅</h3>
          </div>
        </div>

        {joinedLoading && <div className="feedback">참여 중인 오픈채팅을 불러오는 중입니다.</div>}
        {error && <div className="feedback feedback--error">{error}</div>}
        {!joinedLoading && joinedRooms.length === 0 && (
          <div className="empty-state empty-state--small">
            <h3>참여 중인 오픈채팅이 없습니다</h3>
            <p>아래 검색 결과에서 관심 있는 방에 참여해보세요.</p>
          </div>
        )}

        <div className="group-room-panel__list">
          {joinedRooms.map((room) => (
            <article key={`joined-${room.id}`} className="group-room-card">
              <div className="group-room-card__topline">
                <div>
                  <strong>{room.name}</strong>
                  <span className="muted-text group-room-card__meta-text">
                    참여 {room.participantCount} / {room.maxParticipants ?? "제한 없음"}명
                  </span>
                </div>
                <div className="group-room-card__actions">
                  <button type="button" className="ghost-button" onClick={() => onOpenRoom(room.id)}>
                    입장
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => handleLeave(room.id)}
                    disabled={leavingRoomId === room.id}
                  >
                    {leavingRoomId === room.id ? "나가는 중..." : "나가기"}
                  </button>
                </div>
              </div>
              <p className="group-room-card__description">
                {room.description || "아직 소개글이 없습니다."}
              </p>
              <p className="group-room-card__participants">
                {room.locationLabel || "위치 라벨 없음"}
              </p>
              <div className="group-room-card__footer">
                <span className="muted-text">
                  {room.lastMessage?.content ?? "아직 메시지가 없습니다."}
                </span>
                <span className="muted-text">{formatMessageTime(room.lastMessage?.receivedAt)}</span>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="group-room-panel__section">
        <div className="page-section__header page-section__header--compact">
          <div>
            <span className="section-kicker">Explore</span>
            <h3>오픈채팅 검색</h3>
          </div>
        </div>

        <form className="group-room-panel__search" onSubmit={handleSearchSubmit}>
          <input
            className="message-panel__input"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            placeholder="채팅방 이름으로 검색"
          />
          <select
            className="message-panel__input"
            value={radiusKm}
            onChange={(event) => setRadiusKm(Number(event.target.value))}
          >
            <option value={1}>1km</option>
            <option value={3}>3km</option>
            <option value={5}>5km</option>
            <option value={10}>10km</option>
          </select>
          <button type="submit" className="ghost-button">
            검색
          </button>
        </form>
        <p className="muted-text group-room-panel__location-status">{locationStatus}</p>

        {searchLoading && <div className="feedback">오픈채팅 검색 결과를 불러오는 중입니다.</div>}
        {!searchLoading && searchRooms.length === 0 && (
          <div className="empty-state empty-state--small">
            <h3>검색된 오픈채팅이 없습니다</h3>
            <p>다른 키워드로 검색하거나 직접 새로운 오픈채팅을 만들어보세요.</p>
          </div>
        )}

        <div className="group-room-panel__list">
          {searchRooms.map((room) => {
            const isJoined = joinedRoomIds.has(room.id);
            return (
              <article key={room.id} className="group-room-card">
                <div className="group-room-card__topline">
                  <div>
                    <strong>{room.name}</strong>
                    <span className="muted-text group-room-card__meta-text">
                      참여 {room.participantCount} / {room.maxParticipants ?? "제한 없음"}명
                    </span>
                  </div>
                  <div className="group-room-card__actions">
                    {isJoined && <span className="chat-room-card__type">참여 중</span>}
                    <button
                      type="button"
                      className={isJoined ? "ghost-button" : "primary-button"}
                      onClick={() => (isJoined ? onOpenRoom(room.id) : handleJoin(room))}
                      disabled={joiningRoomId === room.id}
                    >
                      {joiningRoomId === room.id
                        ? "처리 중..."
                        : isJoined
                          ? "입장"
                          : "참여"}
                    </button>
                  </div>
                </div>
                <p className="group-room-card__description">
                  {room.description || "아직 소개글이 없습니다."}
                </p>
                <p className="group-room-card__participants">
                  {[room.locationLabel, formatDistance(room.distanceMeters)].filter(Boolean).join(" · ")
                    || "위치 정보 없음"}
                </p>
                <p className="group-room-card__participants">
                  {room.participants?.slice(0, 4).map((participant) => participant.name).join(", ")
                    || "참여자 없음"}
                </p>
                <div className="group-room-card__footer">
                  <span className="muted-text">
                    {room.lastMessage?.content ?? "아직 메시지가 없습니다."}
                  </span>
                  <span className="muted-text">{formatMessageTime(room.lastMessage?.receivedAt)}</span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default OpenGroupRoomPanel;
