import React, { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { AuthContext } from "../App";
import { fetchWithAuth } from "../utils/api";
import { CHAT_WS_URL } from "../config/runtime";
const HISTORY_PAGE_SIZE = 30;
const HISTORY_SCROLL_THRESHOLD = 80;
const READ_FLUSH_DEBOUNCE_MS = 3000;
const WS_RECONNECT_BASE_DELAY_MS = 1000;
const WS_RECONNECT_MAX_DELAY_MS = 5000;

const buildStompFrame = (command, headers = {}, body = "") => {
  const headerLines = Object.entries(headers).map(([key, value]) => `${key}:${value}`);
  const headerBlock = headerLines.length > 0 ? `\n${headerLines.join("\n")}` : "";
  return `${command}${headerBlock}\n\n${body}\0`;
};

const parseStompFrame = (rawFrame) => {
  const normalized = rawFrame.replace(/\r/g, "");
  const [headerSection, ...bodyParts] = normalized.split("\n\n");
  const [command, ...headerLines] = headerSection.split("\n");
  const headers = {};

  headerLines.filter(Boolean).forEach((line) => {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) {
      return;
    }
    const key = line.slice(0, separatorIndex);
    const value = line.slice(separatorIndex + 1);
    headers[key] = value;
  });

  return {
    command,
    headers,
    body: bodyParts.join("\n\n"),
  };
};

const normalizeMessage = (message) => ({
  messageId: message.messageId ?? message.id,
  messageSeq: message.messageSeq ?? null,
  clientMessageId: message.clientMessageId ?? null,
  content: message.content ?? "",
  senderId: message.senderId ?? message.sender?.id ?? null,
  createdAt: message.createdAt ?? message.receivedAt ?? null,
  unreadCount: message.unreadCount ?? null,
});

const mergeMessages = (messages) => {
  const mergedById = new Map();
  messages.forEach((message) => {
    const normalized = normalizeMessage(message);
    const identityKey = normalized.clientMessageId != null
      ? `client:${normalized.clientMessageId}`
      : normalized.messageId != null
        ? `message:${normalized.messageId}`
        : `fallback:${mergedById.size}:${normalized.content}`;

    const previous = mergedById.get(identityKey);
    mergedById.set(identityKey, {
      ...previous,
      ...normalized,
      senderId: normalized.senderId ?? previous?.senderId ?? null,
      messageId: normalized.messageId ?? previous?.messageId ?? null,
      messageSeq: normalized.messageSeq ?? previous?.messageSeq ?? null,
      clientMessageId: normalized.clientMessageId ?? previous?.clientMessageId ?? null,
      createdAt: normalized.createdAt ?? previous?.createdAt ?? null,
      content: normalized.content ?? previous?.content ?? "",
      unreadCount: normalized.unreadCount ?? previous?.unreadCount ?? null,
    });
  });

  return Array.from(mergedById.values()).sort((left, right) => {
    if (left.messageSeq != null && right.messageSeq != null) {
      return Number(left.messageSeq) - Number(right.messageSeq);
    }
    if (left.messageSeq != null) {
      return 1;
    }
    if (right.messageSeq != null) {
      return -1;
    }
    if (left.messageId != null && right.messageId != null) {
      return Number(left.messageId) - Number(right.messageId);
    }
    if (left.messageId != null) {
      return 1;
    }
    if (right.messageId != null) {
      return -1;
    }
    return 0;
  });
};

const mergeReadSeqSnapshot = (currentSnapshot, incomingSnapshot) => {
  const nextSnapshot = { ...currentSnapshot };
  Object.entries(incomingSnapshot ?? {}).forEach(([readerId, readSeq]) => {
    const normalizedReadSeq = Number(readSeq ?? 0);
    const previousReadSeq = Number(nextSnapshot[readerId] ?? 0);
    nextSnapshot[readerId] = Math.max(previousReadSeq, normalizedReadSeq);
  });
  return nextSnapshot;
};

const isNearBottom = (element) => {
  if (!element) {
    return true;
  }
  return element.scrollHeight - element.scrollTop - element.clientHeight < 80;
};

const UserChatRoom = ({ roomId, openChat = false }) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [connectionError, setConnectionError] = useState(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [nextBeforeMessageSeq, setNextBeforeMessageSeq] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const socketRef = useRef(null);
  const connectedRef = useRef(false);
  const frameBufferRef = useRef("");
  const messageListRef = useRef(null);
  const roomIdRef = useRef(roomId);
  const isLoadingHistoryRef = useRef(false);
  const scrollInstructionRef = useRef({ type: "none" });
  const pendingReadSeqRef = useRef(null);
  const lastFlushedReadSeqRef = useRef(null);
  const readFlushTimeoutRef = useRef(null);
  const isFlushingReadRef = useRef(false);
  const lastAppliedReadSeqByUserRef = useRef({});
  const { user } = useContext(AuthContext);
  // 채팅 payload의 senderId는 DB PK(id) 기준이라, 로그인용 문자열 userId가 아니라 숫자 id로 비교해야 한다.
  const myUserId = user?.id;

  const clearReadFlushTimer = useCallback(() => {
    if (readFlushTimeoutRef.current != null) {
      window.clearTimeout(readFlushTimeoutRef.current);
      readFlushTimeoutRef.current = null;
    }
  }, []);

  const flushPendingRead = useCallback(async ({ keepalive = false, roomIdOverride = null } = {}) => {
    const targetReadSeq = pendingReadSeqRef.current;
    const targetRoomId = roomIdOverride ?? roomIdRef.current;

    if (targetReadSeq == null || targetRoomId == null) {
      return;
    }
    if ((lastFlushedReadSeqRef.current ?? 0) >= targetReadSeq) {
      pendingReadSeqRef.current = null;
      return;
    }
    if (isFlushingReadRef.current) {
      return;
    }

    isFlushingReadRef.current = true;
    pendingReadSeqRef.current = null;

    try {
      await fetchWithAuth(`/chat/rooms/${targetRoomId}/read?read_upto_seq=${targetReadSeq}`, {
        method: "POST",
        keepalive,
      });
      lastFlushedReadSeqRef.current = targetReadSeq;
    } catch {
      // 읽음 반영이 실패하면 다음 flush 때 다시 보낼 수 있도록 pending으로 되돌린다.
      pendingReadSeqRef.current = Math.max(pendingReadSeqRef.current ?? 0, targetReadSeq);
    } finally {
      isFlushingReadRef.current = false;

      const remainingPendingReadSeq = pendingReadSeqRef.current;
      if (remainingPendingReadSeq != null
        && (lastFlushedReadSeqRef.current ?? 0) < remainingPendingReadSeq) {
        clearReadFlushTimer();
        readFlushTimeoutRef.current = window.setTimeout(() => {
          void flushPendingRead();
        }, READ_FLUSH_DEBOUNCE_MS);
      }
    }
  }, [clearReadFlushTimer]);

  const queueReadFlush = useCallback((messageSeq, { immediate = false, keepalive = false, roomIdOverride = null } = {}) => {
    if (messageSeq == null) {
      return;
    }

    pendingReadSeqRef.current = Math.max(pendingReadSeqRef.current ?? 0, messageSeq);

    if (immediate) {
      clearReadFlushTimer();
      void flushPendingRead({ keepalive, roomIdOverride });
      return;
    }

    clearReadFlushTimer();
    // active room에서는 새 메시지마다 바로 DB를 치지 않고, 잠깐 조용해졌을 때 한 번만 flush 한다.
    readFlushTimeoutRef.current = window.setTimeout(() => {
      void flushPendingRead();
    }, READ_FLUSH_DEBOUNCE_MS);
  }, [clearReadFlushTimer, flushPendingRead]);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        clearReadFlushTimer();
        void flushPendingRead({ keepalive: true });
      }
    };

    const handlePageHide = () => {
      clearReadFlushTimer();
      void flushPendingRead({ keepalive: true });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [clearReadFlushTimer, flushPendingRead]);

  useLayoutEffect(() => {
    const messageList = messageListRef.current;
    const instruction = scrollInstructionRef.current;
    if (!messageList || instruction.type === "none") {
      return;
    }

    if (instruction.type === "bottom") {
      messageList.scrollTop = messageList.scrollHeight;
    }

    if (instruction.type === "preserve") {
      // 이전 메시지를 위에 prepend하면 scrollHeight가 커지므로,
      // 늘어난 높이만큼 scrollTop을 보정해서 사용자가 보던 위치를 유지한다.
      messageList.scrollTop =
        messageList.scrollHeight - instruction.previousScrollHeight + instruction.previousScrollTop;
    }

    scrollInstructionRef.current = { type: "none" };
  }, [messages]);

  const loadHistory = useCallback(async (beforeMessageSeq = null) => {
    if (isLoadingHistoryRef.current) {
      return;
    }

    const requestedRoomId = roomId;
    const messageList = messageListRef.current;
    const previousScrollHeight = messageList?.scrollHeight ?? 0;
    const previousScrollTop = messageList?.scrollTop ?? 0;

    isLoadingHistoryRef.current = true;
    setIsLoadingHistory(true);

    try {
      const query = new URLSearchParams({
        room_id: String(requestedRoomId),
        size: String(HISTORY_PAGE_SIZE),
      });
      if (beforeMessageSeq != null) {
        query.set("before_message_seq", String(beforeMessageSeq));
      }

      const data = await fetchWithAuth(`/chat/history?${query.toString()}`, { method: "GET" });
      if (requestedRoomId !== roomIdRef.current || !data?.response) {
        return;
      }

      const page = data.response;
      const historyMessages = Array.isArray(page.messages) ? page.messages.map(normalizeMessage) : [];
      const readSeqSnapshot = page.readSeqSnapshot ?? {};

      // 첫 로딩은 맨 아래로, 이전 페이지 로딩은 현재 읽던 위치를 유지한다.
      scrollInstructionRef.current = beforeMessageSeq == null
        ? { type: "bottom" }
        : {
            type: "preserve",
            previousScrollHeight,
            previousScrollTop,
          };

      setMessages((prev) => {
        if (beforeMessageSeq == null) {
          return mergeMessages(historyMessages);
        }
        return mergeMessages([...historyMessages, ...prev]);
      });
      setHasMoreHistory(Boolean(page.hasMore));
      setNextBeforeMessageSeq(page.nextBeforeMessageSeq ?? null);
      lastAppliedReadSeqByUserRef.current = mergeReadSeqSnapshot(
        lastAppliedReadSeqByUserRef.current,
        readSeqSnapshot
      );
      if (beforeMessageSeq == null) {
        // 첫 히스토리 조회는 백엔드가 lastMessageSeq까지 이미 읽음 처리한다.
        const latestHistoryMessageSeq = historyMessages.at(-1)?.messageSeq ?? null;
        lastFlushedReadSeqRef.current = latestHistoryMessageSeq;
        pendingReadSeqRef.current = null;
      }
    } catch {
      // ignore history loading errors here and keep room usable for realtime messages
    } finally {
      if (requestedRoomId === roomIdRef.current) {
        isLoadingHistoryRef.current = false;
        setIsLoadingHistory(false);
      }
    }
  }, [roomId]);

  useEffect(() => {
    let isActive = true;
    const previousRoomId = roomId;
    let reconnectAttempt = 0;
    let reconnectTimerId = null;
    let isIntentionalClose = false;

    setMessages([]);
    setConnectionError(null);
    setHasMoreHistory(true);
    setNextBeforeMessageSeq(null);
    isLoadingHistoryRef.current = false;
    scrollInstructionRef.current = { type: "none" };
    pendingReadSeqRef.current = null;
    lastFlushedReadSeqRef.current = null;
    lastAppliedReadSeqByUserRef.current = {};
    clearReadFlushTimer();

    loadHistory();

    const clearReconnectTimer = () => {
      if (reconnectTimerId != null) {
        window.clearTimeout(reconnectTimerId);
        reconnectTimerId = null;
      }
    };

    const scheduleReconnect = () => {
      if (!isActive || isIntentionalClose) {
        return;
      }

      clearReconnectTimer();
      reconnectAttempt += 1;
      const reconnectDelay = Math.min(
        WS_RECONNECT_BASE_DELAY_MS * reconnectAttempt,
        WS_RECONNECT_MAX_DELAY_MS
      );
      setConnectionError(`실시간 채팅 재연결 중... (${Math.ceil(reconnectDelay / 1000)}초)`);
      reconnectTimerId = window.setTimeout(() => {
        connectSocket();
      }, reconnectDelay);
    };

    const connectSocket = () => {
      if (!isActive) {
        return;
      }

      clearReconnectTimer();
      frameBufferRef.current = "";

      const ws = new WebSocket(CHAT_WS_URL);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!isActive || socketRef.current !== ws) {
          return;
        }
        ws.send(buildStompFrame("CONNECT", {
          "accept-version": "1.2",
          "heart-beat": "0,0",
        }));
      };

      ws.onmessage = (event) => {
        if (!isActive || socketRef.current !== ws) {
          return;
        }

        frameBufferRef.current += event.data;
        const frames = frameBufferRef.current.split("\0");
        frameBufferRef.current = frames.pop() ?? "";

        frames
          .filter(Boolean)
          .map(parseStompFrame)
          .forEach((frame) => {
            if (!isActive || socketRef.current !== ws) {
              return;
            }

            if (frame.command === "CONNECTED") {
              connectedRef.current = true;
              reconnectAttempt = 0;
              setConnectionError(null);
              ws.send(buildStompFrame("SUBSCRIBE", {
                id: `room-${roomId}`,
                destination: `/topic/chat/rooms/${roomId}`,
              }));
              return;
            }

            if (frame.command === "MESSAGE") {
              try {
                const rawData = JSON.parse(frame.body);
                if (rawData?.type === "READ") {
                  const readerId = rawData.readerId;
                  const newReadSeq = Number(rawData.newReadSeq ?? 0);
                  if (readerId == null || newReadSeq <= 0 || String(readerId) === String(myUserId)) {
                    return;
                  }

                  const readerKey = String(readerId);
                  const previousAppliedReadSeq = Number(lastAppliedReadSeqByUserRef.current[readerKey] ?? 0);
                  if (newReadSeq <= previousAppliedReadSeq) {
                    return;
                  }

                  const previousReadSeq = Math.max(
                    previousAppliedReadSeq,
                    Number(rawData.previousReadSeq ?? 0)
                  );

                  setMessages((prev) => prev.map((message) => {
                    if (message.messageSeq == null) {
                      return message;
                    }
                    if (String(message.senderId) === readerKey) {
                      return message;
                    }
                    if (message.messageSeq <= previousReadSeq || message.messageSeq > newReadSeq) {
                      return message;
                    }
                    return {
                      ...message,
                      unreadCount: Math.max(Number(message.unreadCount ?? 0) - 1, 0),
                    };
                  }));
                  lastAppliedReadSeqByUserRef.current[readerKey] = newReadSeq;
                  return;
                }

                const data = normalizeMessage(rawData);
                if (isNearBottom(messageListRef.current)) {
                  scrollInstructionRef.current = { type: "bottom" };
                }
                setMessages((prev) => mergeMessages([...prev, data]));
                if (String(data.senderId) !== String(myUserId) && data.messageSeq != null) {
                  queueReadFlush(data.messageSeq);
                }
              } catch {
                // ignore malformed broadcast
              }
              return;
            }

            if (frame.command === "ERROR") {
              connectedRef.current = false;
              setConnectionError(frame.body || "채팅 서버 연결이 거부되었습니다.");
              ws.close();
            }
          });
      };

      ws.onclose = () => {
        if (socketRef.current === ws) {
          socketRef.current = null;
        }
        connectedRef.current = false;
        if (!isActive || isIntentionalClose) {
          return;
        }
        scheduleReconnect();
      };

      ws.onerror = () => {
        connectedRef.current = false;
        if (!isActive || isIntentionalClose) {
          return;
        }
        setConnectionError("실시간 채팅 연결에 실패했습니다.");
      };
    };

    connectSocket();

    return () => {
      isActive = false;
      isIntentionalClose = true;
      connectedRef.current = false;
      frameBufferRef.current = "";
      clearReadFlushTimer();
      clearReconnectTimer();
      void flushPendingRead({ keepalive: true, roomIdOverride: previousRoomId });
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(buildStompFrame("DISCONNECT"));
      }
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [roomId, loadHistory, myUserId, queueReadFlush, clearReadFlushTimer, flushPendingRead]);

  const sendMessage = () => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !connectedRef.current || !input.trim()) {
      return;
    }

    const messageText = input.trim();
    const clientMessageId = uuidv4();

    const payload = JSON.stringify({
      message: messageText,
      clientMessageId,
    });

    scrollInstructionRef.current = { type: "bottom" };
    setMessages((prev) => mergeMessages([
      ...prev,
      {
        clientMessageId,
        content: messageText,
        senderId: myUserId,
        createdAt: Date.now(),
        messageSeq: null,
        unreadCount: null,
      },
    ]));

    socket.send(buildStompFrame("SEND", {
      destination: `/app/chat/rooms/${roomId}/messages`,
      "content-type": "application/json",
    }, payload));
    setInput("");
  };

  const handleMessageScroll = () => {
    const messageList = messageListRef.current;
    if (!messageList || isLoadingHistory || !hasMoreHistory || nextBeforeMessageSeq == null) {
      return;
    }

    if (messageList.scrollTop <= HISTORY_SCROLL_THRESHOLD) {
      loadHistory(nextBeforeMessageSeq);
    }
  };

  return (
    <div className="message-panel">
      {connectionError && (
        <div className="feedback feedback--error">
          {connectionError}
        </div>
      )}
      <div
        className="message-panel__list"
        ref={messageListRef}
        onScroll={handleMessageScroll}
      >
        {isLoadingHistory && (
          <div className="muted-text message-panel__loader">
            이전 메시지 불러오는 중...
          </div>
        )}
        {messages.map((m, idx) => {
          const isMine = String(m.senderId) === String(myUserId);
          const unreadLabel = openChat
            ? null
            : m.unreadCount == null
              ? "전송 중..."
              : m.unreadCount > 0
                ? `안읽음 ${m.unreadCount}`
                : "읽음";
          return (
            <div
              key={m.messageId ?? idx}
              className={`message-row ${isMine ? "message-row--mine" : ""}`}
            >
              <div className={`message-bubble ${isMine ? "message-bubble--mine" : ""}`}>
                <div className="message-bubble__author">
                  {isMine ? "나" : `User ${m.senderId ?? "?"}`}
                </div>
                <div className="message-bubble__content">
                  {m.content ?? "[내용 없음]"}
                </div>
                {unreadLabel && (
                  <div className="message-bubble__meta">
                    {unreadLabel}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="message-panel__composer">
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
          className="message-panel__input"
        />
        <button
          onClick={sendMessage}
          className="primary-button"
        >
          전송
        </button>
      </div>
    </div>
  );
};

export default UserChatRoom; 
