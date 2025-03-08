import React, { useContext, useEffect, useState } from "react";
import { fetchWithAuth } from "../utils/api";
import { AuthContext } from "../App";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
    const { user, setUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        const fetchPosts = async () => {
            const response = await fetchWithAuth("/api/posts/following/latest");
            if (response.success) {
                setPosts(response.response.posts);
            }
        };

        const fetchMessages = async () => {
            const response = await fetchWithAuth("/api/chat/messages");
            if (response.success) {
                setMessages(response.response.messages);
            }
        };

        fetchPosts();
        fetchMessages();
    }, []);

    const handleLogout = async () => {
        await fetchWithAuth("/api/user/logout", { method: "POST" });
        setUser(null);
        navigate("/login");
    };

    return (
        <div>
            <h2>Welcome, {user?.name}</h2>
            <button onClick={handleLogout}>Logout</button>

            <h3>Chat Messages</h3>
            {messages.length === 0 ? (
                <p>No messages available</p>
            ) : (
                <div className="messages-container">
                    {messages.map((message) => (
                        <div key={message.id} className={`message ${message.senderId === user.id ? 'sent' : 'received'}`}>
                            <strong>{message.senderName}</strong>
                            <p>{message.message}</p>
                            <small>{message.sentAt}</small>
                        </div>
                    ))}
                </div>
            )}

            <h3>Latest Posts</h3>
            {posts.length === 0 ? (
                <p>No posts available</p>
            ) : (
                posts.map((post) => (
                    <div key={post.postId}>
                        <h4>{post.title}</h4>
                        <p>{post.content}</p>
                    </div>
                ))
            )}
        </div>
    );
};

export default HomePage;
