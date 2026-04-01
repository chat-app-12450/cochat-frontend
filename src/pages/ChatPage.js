import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ChatRoomListPanel from "../components/ChatRoomListPanel";
import UserChatRoom from "./UserChatRoom";
import { fetchWithAuth } from "../utils/api";

const ChatPage = () => {
  const { roomId } = useParams();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadRooms = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchWithAuth("/chat/rooms", { method: "GET" });
        if (!isMounted) {
          return;
        }

        if (!response.success) {
          setError(response.error?.message ?? "채팅방 목록을 불러오지 못했습니다.");
          return;
        }

        setRooms(response.response.chatRooms ?? []);
      } catch {
        if (isMounted) {
          setError("채팅방 목록 요청에 실패했습니다.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRooms();
    return () => {
      isMounted = false;
    };
  }, [roomId]);

  const currentRoom = useMemo(
    () => rooms.find((room) => String(room.id) === String(roomId)),
    [roomId, rooms]
  );

  return (
    roomId ? (
      <section className="chat-stage chat-stage--single">
        <div className="chat-stage__header">
          <div>
            <span className="section-kicker">Conversation</span>
            <h2>{currentRoom?.counterpart?.name ?? currentRoom?.name ?? "채팅방"}</h2>
          </div>
          <div className="chat-stage__header-actions">
            {currentRoom?.product && (
              <div className="chat-stage__product">
                <span className="muted-text">거래 상품</span>
                <strong>{currentRoom.product.title}</strong>
              </div>
            )}
            <Link to="/chat/rooms" className="ghost-button">
              채팅방 목록
            </Link>
          </div>
        </div>

        <UserChatRoom roomId={roomId} />
      </section>
    ) : (
      <div className="chat-layout">
        <ChatRoomListPanel rooms={rooms} currentRoomId={roomId} loading={loading} error={error} />

        <section className="chat-stage">
          <div className="empty-state">
            <h2>대화할 채팅방을 선택하세요</h2>
            <p>상품 상세에서 채팅하기를 누르면 새로운 1:1 채팅이 생성됩니다.</p>
          </div>
        </section>
      </div>
    )
  );
};

export default ChatPage;
