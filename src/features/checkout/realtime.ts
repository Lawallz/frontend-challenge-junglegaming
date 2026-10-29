import type { Socket } from 'socket.io-client'
import type { ClientToServerEvents,ServerToClientEvents,SubscriptionTarget } from '@/shared/api/contracts'
import { getSessionToken } from '@/features/auth/session'
export type KurioSocket=Socket<ServerToClientEvents,ClientToServerEvents>
export async function connectRealtime():Promise<KurioSocket|null>{if(import.meta.env.VITE_ENABLE_MOCKS!=='true')return null;const {io}=await import('socket.io-client');return io(import.meta.env.VITE_SOCKET_URL||window.location.origin,{path:'/socket.io/',transports:['websocket'],query:{token:getSessionToken()??''},autoConnect:true,reconnection:true})}
export function targetKey(target:SubscriptionTarget){return `${target.type}:${target.id}`}