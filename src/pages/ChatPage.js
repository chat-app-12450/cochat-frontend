import React, { useState, useEffect, useRef, useContext } from "react";
import { useParams } from "react-router-dom";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { AuthContext } from "../App";
import Cookies from 'js-cookie';
import { fetchWithAuth } from "../utils/api";
const Chat = () => {
    const [stompClient, setStompClient] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const { roomId } = useParams();
    const { user } = useContext(AuthContext);
    const messagesEndRef = useRef(null);

    const clientRef = useRef(null);

    const fetchChatHistory = async () => {
        try {
            const data = await fetchWithAuth(`/api/chat/history/${roomId}`);
            // const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error?.message || 'Failed to fetch chat history');
            }
            
            const historicalMessages = data.response;
            setMessages(historicalMessages.map(msg => ({ ...msg, unreadCount: msg.unreadCount || 0 })));
        } catch (error) {
            console.error("Failed to fetch chat history:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const enterChatRoom = async () => {
        try {
            await fetchWithAuth(`/api/chat/room/${roomId}/enter`, {
                method: 'POST'
            });
        } catch (error) {
            console.error("Failed to enter chat room:", error);
        }
    };

    useEffect(() => {
        if (!user || !roomId) return;
        
        let isSubscribed = true;
        
        const initializeChat = async () => {
            if (isSubscribed) {
                await enterChatRoom();
                await fetchChatHistory();
            }
        };
        
        if (!clientRef.current) {
            initializeChat();
            
            const socket = new SockJS("http://localhost:8080/ws/chat");
            const token = Cookies.get('token');
            
            const client = new Client({
                webSocketFactory: () => socket,
                connectHeaders: {
                    'Authorization': `${token || ''}`
                },
                debug: (msg) => console.log("🛠 WebSocket Debug:", msg),
                onConnect: (frame) => {
                    // Subscribe to chat messages
                    client.subscribe(`/topic/chat/${roomId}`, (response) => {
                        try {
                            const body = JSON.parse(response.body);
                            console.log("Received message:", body);
                            setMessages((prev) => [...prev, { ...body, unreadCount: body.unreadCount || 0 }]);
                            
                            // 새 메시지의 안읽음 수 구독도 subscribeToUnreadCount 함수를 사용
                            if (body.id) {
                                subscribeToUnreadCount(client, body.id);
                            }
                        } catch (error) {
                            console.error("Failed to parse message:", error);
                        }
                    });

                    // 기존 메시지들의 안읽음 수 구독을 위한 헬퍼 함수
                    const subscribeToUnreadCount = (client, messageId) => {
                        client.subscribe(`/topic/unread/${messageId}`, (unreadResponse) => {
                            const unreadData = JSON.parse(unreadResponse.body);
                            setMessages(prev => prev.map(msg => 
                                msg.id === messageId ? { ...msg, unreadCount: unreadData.unreadCount } : msg
                            ));
                        });
                    };

                    // 기존 메시지들의 안읽음 수 구독
                    messages.forEach(msg => {
                        if (msg.id) {
                            subscribeToUnreadCount(client, msg.id);
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
        }

        return () => {
            isSubscribed = false;
            if (clientRef.current) {
                console.log("Closing WebSocket...");
                clientRef.current.deactivate();
                clientRef.current = null;
            }
        };
    }, [user, roomId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>Loading messages...</div>
                ) : (
                    <>
                        {messages.map((msg, index) => (
                            <div key={index} style={{ 
                                display: "flex", 
                                flexDirection: "column",
                                alignItems: msg.senderId === user.id ? "flex-end" : "flex-start"
                            }}>
                                <div style={{ 
                                    backgroundColor: msg.senderId === user.id ? "#DCF8C6" : "#E0FFFF",
                                    padding: "10px", 
                                    borderRadius: "10px", 
                                    maxWidth: "60%",
                                    marginBottom: "5px"
                                }}>
                                    <div>{msg.message}</div>
                                    <div style={{ 
                                        fontSize: "12px", 
                                        color: "#666",
                                        textAlign: "right"
                                    }}>
                                        {msg.unreadCount > 0 && `${msg.unreadCount} unread`}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>
            <input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} placeholder="Type a message..." />
            <button onClick={sendMessage}>Send</button>
        </div>
    );
};

export default Chat;
