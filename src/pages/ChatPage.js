import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";

const Chat = () => {
  const { roomId } = useParams();
  const [socket, setSocket] = useState(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080/ws/chat");

    ws.onopen = () => {
      console.log("✅ WebSocket connected!");
      // 서버가 JOIN 같은 이벤트 처리 안 하면 생략 가능
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📩 Received:", data);

        setMessages((prev) => [...prev, data]);
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

  const sendMessage = () => {
    if (socket?.readyState === WebSocket.OPEN && input.trim()) {
      const payload = {
        type: "MESSAGE",
        roomId: Number(roomId),
        senderId: 1, // 테스트용 하드코딩된 유저 ID
        message: input,
      };
      socket.send(JSON.stringify(payload));
      setInput("");
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
      <h2>💬 Chat Room #{roomId}</h2>
      <div style={{ height: 300, overflowY: "auto", border: "1px solid #ccc", padding: 10 }}>
        {messages.map((m, idx) => (
          <div key={idx} style={{ marginBottom: 10 }}>
            <div>
              <strong>User {m.senderId ?? "?"}</strong>: {m.content ?? "[내용 없음]"}
            </div>
            <div style={{ fontSize: "12px", color: "#888" }}>
              🕒 {m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : "시간 없음"} | 🙈 안읽음: {m.unreadCount ?? 0}명
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
        <button onClick={sendMessage} style={{ padding: "8px 12px", marginLeft: 5 }}>
          전송
        </button>
      </div>
    </div>
  );
};

export default Chat;
