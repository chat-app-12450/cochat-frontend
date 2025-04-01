import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Chat = () => {
  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [connected, setConnected] = useState(false);
  
  const token = "testToken1";
  const wsRef = useRef(null);

  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (!roomId) return;

    console.log("Opening WebSocket...");
    const ws = new WebSocket(`ws://localhost:8080/ws/chat?token=${token}&roomId=${roomId}`);

    ws.onopen = () => {
      console.log("✅ WebSocket Connected! Room:", roomId);
      setConnected(true);
    
      const joinMessage = {
        type: "JOIN",
        roomId: Number(roomId),
      };
    
      console.log("sending join", joinMessage); // 여기
      ws.send(JSON.stringify(joinMessage));
    };
    

    ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        if (response.type === "MESSAGE") {
          setMessages((prev) => [...prev, response]);
        } else {
          console.log("Received non-message type:", response.type);
        }
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket Error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket Closed");
      setConnected(false);
    };

    wsRef.current = ws;

    return () => {
      console.log("Closing WebSocket...");
      ws.close();
      wsRef.current = null;
    };
  }, [roomId]);

  const sendMessage = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket is not connected");
      return;
    }

    const message = {
      type: "MESSAGE",
      roomId: Number(roomId),
      message: inputMessage,
    };

    wsRef.current.send(JSON.stringify(message));
    setInputMessage("");
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
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          className="flex-grow border rounded px-3 py-2"
          placeholder="메시지를 입력하세요..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          disabled={!connected}
        />
        <Button onClick={sendMessage} disabled={!connected}>전송</Button>
      </div>
      {!connected && (
        <div className="text-red-500 mt-4">
          Disconnected from chat server
        </div>
      )}
    </div>
  );
};

export default Chat;
