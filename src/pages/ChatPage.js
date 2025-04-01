import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

const Chat = () => {
  const { roomId } = useParams();
  const [socket, setSocket] = useState(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  // ✅ WebSocket 연결 & 이벤트 처리
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080/ws/chat");

    ws.onopen = () => {
      console.log("✅ WebSocket connected");
      ws.send(JSON.stringify({ type: "JOIN", roomId: Number(roomId) }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📩 Received:", data);

        if (data.type === "READ") {
          // ✅ 읽음 처리 메시지일 경우 메시지 리스트 갱신
          setMessages((prev) =>
            prev.map((message) => {
              if (Number(message.messageId) === Number(data.messageId)) {
                return { ...message, unreadCount: data.unreadCount };
              }
              return message;
            })
          );
        } else {
          // ✅ 새로운 메시지일 경우 추가
          setMessages((prev) => [...prev, data]);
        }
      } catch (err) {
        console.error("❌ JSON parse error:", err);
      }
    };

    ws.onclose = () => {
      console.warn("🔌 WebSocket disconnected");
    };

    setSocket(ws);
    return () => {
      ws.close();
    };
  }, [roomId]);

  // ✅ 메시지 전송 핸들러
  const sendMessage = () => {
    if (socket?.readyState === WebSocket.OPEN && input.trim()) {
      const payload = {
        type: "MESSAGE",
        roomId: Number(roomId),
        message: input.trim(),
        clientMessageId: uuidv4(),
      };
      socket.send(JSON.stringify(payload));
      setInput("");
    }
  };

  // ✅ 자동 스크롤 처리
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
      <h2>💬 Chat Room #{roomId}</h2>

      <div
        style={{
          height: 300,
          overflowY: "auto",
          border: "1px solid #ccc",
          padding: 10,
        }}
      >
        {messages.map((m, idx) => (
          <div key={m.messageId || idx} style={{ marginBottom: 10 }}>
            <div>
              <strong>User {m.senderId ?? "?"}</strong>: {m.content ?? "[내용 없음]"}
              <span style={{ fontSize: "10px", color: "#666" }}>
                {" "}
                (ID: {m.messageId})
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "#888" }}>
              🕒 {m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : "시간 없음"} |{" "}
              {m.unreadCount > 0 ? (
                <span style={{ color: "#ff6b6b" }}>🙈 안읽음: {m.unreadCount}명</span>
              ) : (
                <span style={{ color: "#51cf66" }}>✓ 읽음</span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ marginTop: 10 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="메시지를 입력하세요..."
          style={{ width: "80%", padding: 8 }}
        />
        <button
          onClick={sendMessage}
          style={{
            padding: "8px 12px",
            marginLeft: 5,
            backgroundColor: "#228be6",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          전송
        </button>
      </div>
    </div>
  );
};

export default Chat;
