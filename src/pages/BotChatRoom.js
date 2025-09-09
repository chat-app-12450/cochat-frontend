import React, { useEffect, useState, useRef } from "react";

const BOT_API_URL = process.env.REACT_APP_BOT_API_URL;
const BOT_WS_URL = process.env.REACT_APP_BOT_WS_URL;

const BotChatRoom = ({ roomId }) => {
  const [socket, setSocket] = useState(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]); // {type: 'user'|'bot', content: string, timestamp: string}
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // 메시지 내역 먼저 불러오기
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${BOT_API_URL}/history?room_id=${roomId}`, {
          credentials: "include"
        });
        const data = await res.json();
        if (data.history) {
          // BotChatRoom의 메시지 형태에 맞게 변환
          setMessages(data.history.map(m => ({
            type: m.type === 'bot' ? 'bot' : 'user',
            content: m.content,
            
            timestamp: m.timestamp,
          })));
        }
      } catch (err) {
        // 에러 처리
      }
    };
    fetchHistory();

    const ws = new WebSocket(`${BOT_WS_URL}?room_id=${roomId}`);
    ws.onopen = () => {
      // 연결됨
    };
    ws.onmessage = (event) => {
      // 서버에서 받은 챗봇 답변
      setMessages((prev) => [
        ...prev,
        { type: "bot", content: event.data, roomId: roomId },
      ]);
    };
    setSocket(ws);
    return () => ws.close();
  }, [roomId]);

  const sendMessage = () => {
    if (socket?.readyState === WebSocket.OPEN && input.trim()) {
      // 유저 메시지 먼저 추가
      setMessages((prev) => [
        ...prev,
        {type: 'user', content: input.trim()},
      ]);
      console.log(input.trim() + " 전송");
      socket.send(input.trim());
      setInput("");
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div style={{
      background: "white",
      borderRadius: 16,
      boxShadow: "0 4px 24px rgba(34,139,230,0.10)",
      padding: 24,
      width: 350,
      minHeight: 480,
      height: 480,
      display: "flex",
      flexDirection: "column",
    }}>
      <h2 style={{ color: "#228be6", textAlign: "center", marginBottom: 16 }}>챗봇 채팅방</h2>
      <div style={{
        flex: 1,
        overflowY: "auto",
        border: "1px solid #e3eafc",
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
        background: "#f8faff",
        height: 350,
        minHeight: 350,
        maxHeight: 350,
      }}>
        {messages.map((m, idx) => (
          <div key={idx} style={{ marginBottom: 10, textAlign: m.type === 'user' ? 'right' : 'left' }}>
            <div style={{
              display: "inline-block",
              background: m.type === 'user' ? "#e7f5ff" : "#fff9db",
              color: m.type === 'user' ? "#228be6" : "#fab005",
              borderRadius: 8,
              padding: "6px 12px",
              fontWeight: 500,
              maxWidth: 220,
              wordBreak: "break-all",
            }}>
              {m.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="챗봇에게 메시지 보내기..."
          style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #b6e0fe" }}
        />
        <button
          onClick={sendMessage}
          style={{
            padding: "8px 12px",
            backgroundColor: "#fab005",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          전송
        </button>
      </div>
    </div>
  );
};

export default BotChatRoom; 