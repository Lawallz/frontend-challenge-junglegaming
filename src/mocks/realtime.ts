import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { EthAmount,NftUpdatedEvent,OrderUpdatedEvent,SubscriptionTarget } from '@/shared/api/contracts'
import { nftFixtures } from './fixtures/nfts'
import { resolveMockUserId } from './handlers/auth'
import { getScenario } from './scenarios'
const link=ws.link(/^ws:\/\/[^/]+\/$/)
const disconnectedOrders=new Set<string>()
export const realtimeHandler=link.addEventListener('connection',connection=>{
 const socket=toSocketIo(connection),subscriptions=new Map<string,SubscriptionTarget>(),token=connection.client.url.searchParams.get('token')??undefined,userId=resolveMockUserId(token)
 let timer:ReturnType<typeof setTimeout>|undefined
 const sendNft=(id:string)=>{const nft=nftFixtures.find(item=>item.id===id);if(!nft)return;const scenario=getScenario();if((scenario.name==='realtime-price-update'||scenario.name==='realtime-latency'))nft.price='0.09' as EthAmount;if(scenario.name==='realtime-edition-soldout')for(const edition of nft.editions)edition.available=0;nft.version+=1;const event:NftUpdatedEvent={eventId:`nft:${id}:${nft.version}`,type:'nft.updated',resource:{type:'nft',id},version:nft.version,occurredAt:new Date().toISOString(),audienceUserId:null,payload:{nftId:id,price:nft.price,editions:nft.editions.map(({id,available})=>({id,available}))}};socket.client.emit('nft.updated',event)}
 socket.client.on('subscribe',async(_message,target:SubscriptionTarget)=>{
  if(!target||!['nft','order'].includes(target.type)||!target.id)return
  subscriptions.set(`${target.type}:${target.id}`,target)
  const scenario=getScenario()
  if(target.type==='nft'&&['realtime-price-update','realtime-edition-soldout','realtime-latency'].includes(scenario.name))timer=setTimeout(()=>sendNft(target.id),scenario.name==='realtime-latency'?1200:250)
  if(target.type!=='order'||!userId||(!scenario.name.startsWith('realtime-order-')&&scenario.name!=='realtime-disconnect'))return
  const {updateMockOrderStatus}=await import('./handlers/orders')
  if(!subscriptions.has(`order:${target.id}`))return
  if(scenario.name==='realtime-disconnect'&&!disconnectedOrders.has(target.id)){disconnectedOrders.add(target.id);connection.client.close();return}
  const status=scenario.name==='realtime-order-declined'?'declined':scenario.name==='realtime-order-pending'?'pending':'confirmed'
  const updated=updateMockOrderStatus(userId,target.id,status,status==='declined'?'Pagamento de demonstração recusado.':null)
  if(!updated)return
  const event:OrderUpdatedEvent={eventId:`order:${target.id}:${updated.version}`,type:'order.updated',resource:{type:'order',id:target.id},version:updated.version,occurredAt:updated.updatedAt,audienceUserId:userId,payload:{orderId:target.id,status:updated.status,transactionRef:updated.transactionRef,declineReason:updated.declineReason}}
  socket.client.emit('order.updated',event)
  if(scenario.name==='realtime-order-duplicate'){socket.client.emit('order.updated',event);socket.client.emit('order.updated',{...event,eventId:`order:${target.id}:old`,version:1,payload:{...event.payload,status:'pending',transactionRef:null}})}
  if(scenario.name==='realtime-order-pending')timer=setTimeout(()=>{const terminal=updateMockOrderStatus(userId,target.id,'confirmed');if(!terminal)return;socket.client.emit('order.updated',{...event,eventId:`order:${target.id}:${terminal.version}`,version:terminal.version,occurredAt:terminal.updatedAt,payload:{...event.payload,status:'confirmed',transactionRef:terminal.transactionRef,declineReason:null}})},2000)
 })
 socket.client.on('unsubscribe',(_message,target:SubscriptionTarget)=>subscriptions.delete(`${target.type}:${target.id}`))
 connection.server.addEventListener('close',()=>{if(timer)clearTimeout(timer);subscriptions.clear()})
})
