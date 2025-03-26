import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export default function ChatRoom() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const ws = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket("ws://localhost:8080/ws/chat");

    ws.current.onopen = () => console.log("🟢 WebSocket connected!");
    ws.current.onclose = () => console.warn("🔌 WebSocket disconnected");
    ws.current.onerror = (err) => console.error("❌ WebSocket error:", err);

    ws.current.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        console.log("📨 Raw received:", raw);

        // 만약 서버에서 감싼 구조로 보내면 아래에서 분기 처리
        const message = raw.response ?? raw;

        setMessages((prev) => [...prev, message]);
      } catch (err) {
        console.error("❌ Failed to parse message:", err);
      }
    };

    return () => {
      ws.current?.close();
    };
  }, []);

  const sendMessage = () => {
    if (input.trim() && ws.current?.readyState === WebSocket.OPEN) {
      const message = {
        roomId: 1,
        senderId: 1,
        content: input,
      };
      ws.current.send(JSON.stringify(message));
      setInput("");
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">📡 WebSocket Chat (No STOMP)</h2>
      <div className="border rounded-lg h-96 overflow-y-scroll p-4 mb-4 shadow-sm bg-white">
        {messages.length === 0 && <div className="text-gray-400">🙈 메시지 없음</div>}
        {messages.map((msg, idx) => (
          <div key={idx} className="mb-2">
            <div>
              <span className="font-semibold">👤 User {msg.senderId ?? "?"}:</span>{" "}
              {msg.content ?? "[내용 없음]"}
            </div>
            <div className="text-sm text-gray-500">
              🕓 {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : "시간 없음"} |{" "}
              🙈 안읽음: {msg.unreadCount ?? 0}명
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-grow border rounded px-3 py-2"
          placeholder="메시지를 입력하세요..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <Button onClick={sendMessage}>전송</Button>
      </div>
    </div>
  );
}
