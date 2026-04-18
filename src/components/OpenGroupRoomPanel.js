import React, { useCallback, useEffect, useMemo, useState } from "react";
import { fetchWithAuth } from "../utils/api";

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
  const [isCreating, setIsCreating] = useState(false);
  const [joiningRoomId, setJoiningRoomId] = useState(null);
  const [leavingRoomId, setLeavingRoomId] = useState(null);

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

  const loadSearchRooms = useCallback(async (keyword) => {
    setSearchLoading(true);

    try {
      const query = new URLSearchParams();
      if (keyword) {
        query.set("keyword", keyword);
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

  useEffect(() => {
    setError(null);
    void loadJoinedRooms();
    void loadSearchRooms(searchKeyword);
  }, [loadJoinedRooms, loadSearchRooms, searchKeyword]);

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
      await loadSearchRooms(searchKeyword);
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
      await loadSearchRooms(searchKeyword);
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
      await loadSearchRooms(searchKeyword);
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
          <button type="submit" className="ghost-button">
            검색
          </button>
        </form>

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
