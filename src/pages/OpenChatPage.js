import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import OpenGroupRoomPanel from "../components/OpenGroupRoomPanel";

const OpenChatPage = () => {
  const navigate = useNavigate();

  const handleOpenRoom = useCallback((roomId) => {
    navigate(`/chat/${roomId}`);
  }, [navigate]);

  return (
    <section className="page-section page-section--narrow">
      <OpenGroupRoomPanel onOpenRoom={handleOpenRoom} />
    </section>
  );
};

export default OpenChatPage;
