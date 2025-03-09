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
    const subscriptionRefs = useRef({});

    const fetchChatHistory = async () => {
        try {
            const data = await fetchWithAuth(`/api/chat/history/${roomId}`);
            if (!data.success) {
                throw new Error(data.error?.message || 'Failed to fetch chat history');
            }
            const historicalMessages = data.response.chatHistory;
            setMessages(historicalMessages);
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
            
            const client = new Client({
                webSocketFactory: () => new SockJS("http://localhost:8080/ws/chat"),
                connectHeaders: {
                    'Authorization': `Bearer ${Cookies.get('token')}`
                },
                debug: (msg) => console.log("🛠 WebSocket Debug:", msg),
                onConnect: (frame) => {
                    const chatSubscription = client.subscribe(`/topic/chat/${roomId}`, (response) => {
                        try {
                            const body = JSON.parse(response.body);
                            console.log("Received message:", body);
                            setMessages((prev) => [...prev, body]);
                        } catch (error) {
                            console.error("Failed to parse message:", error);
                        }
                    });
                    subscriptionRefs.current['chat'] = chatSubscription;
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
                Object.values(subscriptionRefs.current).forEach(subscription => {
                    if (subscription) {
                        subscription.unsubscribe();
                    }
                });
                subscriptionRefs.current = {};
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

    // 메시지별 안읽음 수 구독 함수
    const subscribeToUnreadCount = (client, messageId) => {
        // 이미 구독중인 경우 중복 구독 방지
        if (subscriptionRefs.current[messageId]) {
            return;
        }

        const subscription = client.subscribe(`/topic/unread/${messageId}`, (unreadResponse) => {
            try {
                const unreadCount = JSON.parse(unreadResponse.body);
                console.log(`Message ${messageId} unread count updated:`, unreadCount);
                
                setMessages(prev => prev.map(msg => 
                    msg.id === messageId ? { ...msg, unreadCount } : msg
                ));
            } catch (error) {
                console.error("Failed to parse unread count:", error);
            }
        });

        // 구독 참조 저장
        subscriptionRefs.current[messageId] = subscription;
    };

    // 메시지 목록이 변경될 때마다 새로운 메시지의 안읽음 수 구독
    useEffect(() => {
        if (stompClient && messages.length > 0) {
            messages.forEach(msg => {
                if (msg.id) {
                    subscribeToUnreadCount(stompClient, msg.id);
                }
            });
        }
    }, [stompClient, messages]);

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
                                        {`${msg.unreadCount}명 안읽음`}
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
