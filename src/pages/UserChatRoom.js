import React, { useEffect, useState, useRef, useContext } from "react";
import { v4 as uuidv4 } from "uuid";
import { AuthContext } from "../App";

const CHAT_API_URL = process.env.REACT_APP_CHAT_API_URL;
const CHAT_WS_URL = process.env.REACT_APP_CHAT_WS_URL;

const UserChatRoom = ({ roomId }) => {
  const [socket, setSocket] = useState(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const { user } = useContext(AuthContext);
  const myUserId = user?.userId || user?.id;

  useEffect(() => {
    // 메시지 내역 먼저 불러오기
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${CHAT_API_URL}/chat/history?room_id=${roomId}`, {
          credentials: "include"
        });
        const data = await res.json();
        console.log("data" ,data)
        if (data.response) {
          setMessages(data.response);
        }
      } catch (err) {
        // 에러 처리
      }
    };
    fetchHistory();

    const ws = new WebSocket(CHAT_WS_URL);
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "JOIN", roomId: Number(roomId) }));
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages((prev) => [...prev, data]);
      } catch (err) {
        // ignore
      }
    };
    setSocket(ws);
    return () => ws.close();
  }, [roomId]);

  const sendMessage = () => {
    if (socket?.readyState === WebSocket.OPEN && input.trim()) {
      const payload = {
        type: "MESSAGE",
        roomId: Number(roomId),
        message: input.trim(),
        clientMessageId: uuidv4(),
      };
      console.log("message sent", payload);
      socket.send(JSON.stringify(payload));
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
      <h2 style={{ color: "#228be6", textAlign: "center", marginBottom: 16 }}>유저 채팅방</h2>
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
        {messages.map((m, idx) => {
          const isMine = String(m.senderId) === String(myUserId);
          return (
            <div
              key={m.messageId}
              style={{
                marginBottom: 10,
                textAlign: isMine ? 'right' : 'left',
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  background: isMine ? "#e7f5ff" : "#fff9db",
                  color: isMine ? "#228be6" : "#fab005",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontWeight: 500,
                  maxWidth: 220,
                  wordBreak: "break-all",
                }}
              >
                {isMine ? "나" : `User ${m.senderId ?? "?"}`} : {m.content ?? "[내용 없음]"}
              </div>
            </div>
          );
        })}
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
          placeholder="메시지를 입력하세요..."
          style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #b6e0fe" }}
        />
        <button
          onClick={sendMessage}
          style={{
            padding: "8px 12px",
            backgroundColor: "#228be6",
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

export default UserChatRoom; 