import React from "react";
import UserChatRoom from "./UserChatRoom";
import BotChatRoom from "./BotChatRoom";
import { useParams } from "react-router-dom";
import { AuthContext } from "../App";
import { useContext } from "react";

const ChatPage = () => {
  const { roomId } = useParams();
  const { user } = useContext(AuthContext);

  return (
    <div
      style={{
        display: "flex",
        gap: 32,
        justifyContent: "center",
        alignItems: "flex-start",
        padding: 32,
        background: "#f8f9fa",
        minHeight: "100vh",
      }}
    >
      <UserChatRoom roomId={roomId} />
      <BotChatRoom roomId={roomId} />
    </div>
  );
};

export default ChatPage;
