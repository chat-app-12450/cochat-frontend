import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ChatRoomListPanel from "../components/ChatRoomListPanel";
import UserChatRoom from "./UserChatRoom";
import { fetchWithAuth } from "../utils/api";

const ChatPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentRoomError, setCurrentRoomError] = useState(null);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth("/chat/rooms", { method: "GET" });

      if (!response.success) {
        setError(response.error?.message ?? "채팅방 목록을 불러오지 못했습니다.");
        return;
      }

      setRooms(response.response.chatRooms ?? []);
    } catch {
      setError("채팅방 목록 요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCurrentRoom = useCallback(async () => {
    if (!roomId) {
      setCurrentRoom(null);
      setCurrentRoomError(null);
      return;
    }

    try {
      const response = await fetchWithAuth(`/chat/rooms/${roomId}`, { method: "GET" });
      if (!response.success) {
        setCurrentRoom(null);
        setCurrentRoomError(response.error?.message ?? "채팅방 정보를 불러오지 못했습니다.");
        return;
      }

      setCurrentRoom(response.response ?? null);
      setCurrentRoomError(null);
    } catch {
      setCurrentRoom(null);
      setCurrentRoomError("채팅방 정보 요청에 실패했습니다.");
    }
  }, [roomId]);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      if (roomId) {
        await loadCurrentRoom();
      } else {
        await loadRooms();
      }
      if (!isMounted) {
        return;
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [loadCurrentRoom, loadRooms, roomId]);

  const handleLeaveCurrentGroupRoom = useCallback(async () => {
    if (!currentRoom || leaveLoading) {
      return;
    }

    setLeaveLoading(true);
    try {
      const response = await fetchWithAuth(`/chat/open-rooms/${currentRoom.id}/leave`, {
        method: "POST",
      });

      if (!response.success) {
        setError(response.error?.message ?? "그룹 채팅방 나가기에 실패했습니다.");
        return;
      }

      await loadRooms();
      navigate("/chat/open", { replace: true });
    } catch {
      setError("그룹 채팅방 나가기 요청에 실패했습니다.");
    } finally {
      setLeaveLoading(false);
    }
  }, [currentRoom, leaveLoading, loadRooms, navigate]);

  return (
    roomId ? (
      <section className="chat-stage chat-stage--single">
        <div className="chat-stage__header">
          <div>
            <span className="section-kicker">Conversation</span>
            <h2>{currentRoom?.counterpart?.name ?? currentRoom?.name ?? "채팅방"}</h2>
            {currentRoomError && <p className="muted-text">{currentRoomError}</p>}
          </div>
          <div className="chat-stage__header-actions">
            {currentRoom?.product && (
              <div className="chat-stage__product">
                <span className="muted-text">거래 상품</span>
                <strong>{currentRoom.product.title}</strong>
              </div>
            )}
            {currentRoom?.openChat && (
              <button
                type="button"
                className="ghost-button"
                onClick={handleLeaveCurrentGroupRoom}
                disabled={leaveLoading}
              >
                {leaveLoading ? "나가는 중..." : "그룹방 나가기"}
              </button>
            )}
            <Link to={currentRoom?.openChat ? "/chat/open" : "/chat/rooms"} className="ghost-button">
              {currentRoom?.openChat ? "오픈채팅으로" : "채팅방 목록"}
            </Link>
          </div>
        </div>

        <UserChatRoom roomId={roomId} />
      </section>
    ) : (
      <section className="page-section page-section--narrow">
        <ChatRoomListPanel rooms={rooms} currentRoomId={roomId} loading={loading} error={error} />
      </section>
    )
  );
};

export default ChatPage;
