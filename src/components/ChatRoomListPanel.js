import React from "react";
import { useNavigate } from "react-router-dom";
import ProductStatusBadge from "./ProductStatusBadge";

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

const ChatRoomListPanel = ({ rooms, currentRoomId, loading, error }) => {
  const navigate = useNavigate();

  return (
    <aside className="chat-room-list">
      <div className="page-section__header page-section__header--compact">
        <div>
          <span className="section-kicker">Inbox</span>
          <h2>내 채팅방</h2>
        </div>
      </div>

      {loading && <div className="feedback">채팅방을 불러오는 중입니다.</div>}
      {error && <div className="feedback feedback--error">{error}</div>}
      {!loading && rooms.length === 0 && (
        <div className="empty-state empty-state--small">
          <h3>아직 채팅이 없습니다</h3>
          <p>상품 상세에서 채팅하기를 누르면 1:1 대화방이 생성됩니다.</p>
        </div>
      )}

      <div className="chat-room-list__items">
        {rooms.map((room) => {
          const isActive = String(room.id) === String(currentRoomId);
          return (
            <button
              key={room.id}
              type="button"
              className={`chat-room-card ${isActive ? "chat-room-card--active" : ""}`}
              onClick={() => navigate(`/chat/${room.id}`)}
            >
              <div className="chat-room-card__topline">
                <strong>{room.counterpart?.name ?? room.name}</strong>
                <div className="chat-room-card__meta">
                  {room.unreadCount > 0 && (
                    <span className="chat-room-card__unread">
                      {room.unreadCount > 99 ? "99+" : room.unreadCount}
                    </span>
                  )}
                  {room.product?.status && <ProductStatusBadge status={room.product.status} />}
                </div>
              </div>
              <p className="chat-room-card__product">{room.product?.title ?? "일반 대화"}</p>
              <p className="chat-room-card__message">
                {room.lastMessage?.content ?? "아직 메시지가 없습니다."}
              </p>
              <span className="muted-text">{formatMessageTime(room.lastMessage?.receivedAt)}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};

export default ChatRoomListPanel;
