import React, { useState, useEffect, useRef } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

const Chat = () => {
    const [stompClient, setStompClient] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState("");

    const roomId = 1; 
    const token = "testToken1"; 

    const clientRef = useRef(null);

    useEffect(() => {
        if (clientRef.current) return; // Prevent duplicate connections

        console.log("Opening WebSocket...");

        // Remove the direct WebSocket connection
        const socket = new SockJS("http://localhost:8080/ws/chat");

        const client = new Client({
            webSocketFactory: () => socket,
            connectHeaders: {
                'Authorization': `Bearer ${token}`
            },
            debug: (msg) => console.log("🛠 WebSocket Debug:", msg),
            onConnect: (frame) => {
                console.log("✅ WebSocket Connected!", frame);

                client.subscribe(`/topic/chat/${roomId}`, (response) => {
                    try {
                        const body = JSON.parse(response.body);
                        setMessages((prev) => [...prev, { ...body, unreadCount: body.unreadCount || 0 }]);
                    } catch (error) {
                        console.error("Failed to parse message:", error);
                    }
                });

                setStompClient(client);
            },
            onStompError: (frame) => {
                console.error("WebSocket Broker Error:", frame);
            },
        });

        client.activate();
        clientRef.current = client; 

        return () => {
            console.log("Closing WebSocket...");
            client.deactivate();
            clientRef.current = null;
        };
    }, []);

    // ✅ Send Message Function
    const sendMessage = () => {
        if (stompClient && stompClient.connected) {
            const message = { message: inputMessage, roomId: roomId };

            stompClient.publish({
                destination: `/app/sendMessage`,
                body: JSON.stringify(message),
            });

            setInputMessage("");
        } else {
            console.warn("Not connected to WebSocket.");
        }
    };

    return (
        <div>
            <h2>Chat WebSocket Test</h2>
            <div style={{ border: "1px solid black", padding: "10px", height: "400px", overflowY: "auto" }}>
                {messages.map((msg, index) => (
                    <div key={index} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                        <p style={{ backgroundColor: "#E0FFFF", padding: "10px", borderRadius: "10px", maxWidth: "60%", textAlign: "left" }}>
                            {msg.message}
                        </p>
                    </div>
                ))}
            </div>
            <input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} placeholder="Type a message..." />
            <button onClick={sendMessage}>Send</button>
        </div>
    );
};

export default Chat;
