import { useEffect, useRef, useCallback } from 'react';

type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

type WebSocketHandler = (message: WebSocketMessage) => void;

export function useWebSocket(roomCode: string | null, userId: number | null) {
  const ws = useRef<WebSocket | null>(null);
  const handlers = useRef<Map<string, WebSocketHandler>>(new Map());

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  const subscribe = useCallback((type: string, handler: WebSocketHandler) => {
    handlers.current.set(type, handler);
    
    return () => {
      handlers.current.delete(type);
    };
  }, []);

  useEffect(() => {
    if (!roomCode || !userId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      sendMessage({
        type: 'join-room',
        roomCode,
        userId
      });
    };

    ws.current.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        const handler = handlers.current.get(message.type);
        if (handler) {
          handler(message);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [roomCode, userId, sendMessage]);

  return { sendMessage, subscribe };
}
