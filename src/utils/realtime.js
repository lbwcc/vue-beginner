import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client/dist/sockjs'
import { resolveWsEndpoint } from '@/config/env'

export const createStompClient = ({ onConnect, onStompError, onWebSocketError, onWebSocketClose } = {}) => {
  return new Client({
    webSocketFactory: () => new SockJS(resolveWsEndpoint()),
    reconnectDelay: 1500,
    heartbeatIncoming: 15000,
    heartbeatOutgoing: 15000,
    onConnect,
    onStompError,
    onWebSocketError,
    onWebSocketClose,
  })
}
