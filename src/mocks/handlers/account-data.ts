import {http,HttpResponse} from 'msw'
import type {ApiErrorBody,OrdersListResponse} from '@/shared/api/contracts'
import {API_ROUTES} from '@/shared/api/contracts'
import {resolveMockSession} from './auth'
import {listMockOrders} from './orders'
import {setMockDefaultWallet,removeMockWallet} from './wallets'
const err=(status:number,code:ApiErrorBody['code'],message:string)=>HttpResponse.json({code,message} satisfies ApiErrorBody,{status})
export const accountDataHandlers=[
 http.get(`*${API_ROUTES.orders}`,({request})=>{const session=resolveMockSession(request);if(session instanceof HttpResponse)return session;const url=new URL(request.url);const page=Math.max(1,Number(url.searchParams.get('page'))||1),pageSize=Math.min(100,Math.max(1,Number(url.searchParams.get('pageSize'))||20));const orders=listMockOrders(session.user.id);return HttpResponse.json({items:orders.slice((page-1)*pageSize,page*pageSize),page,pageSize,total:orders.length,totalPages:Math.ceil(orders.length/pageSize)} satisfies OrdersListResponse)}),
 http.patch('*/wallets/:walletId/default',({request,params})=>{const session=resolveMockSession(request);if(session instanceof HttpResponse)return session;const wallet=setMockDefaultWallet(session.user.id,String(params.walletId));return wallet?HttpResponse.json(wallet):err(404,'NOT_FOUND','Carteira não encontrada.')}),
 http.delete('*/wallets/:walletId',({request,params})=>{const session=resolveMockSession(request);if(session instanceof HttpResponse)return session;return removeMockWallet(session.user.id,String(params.walletId))?new HttpResponse(null,{status:204}):err(404,'NOT_FOUND','Carteira não encontrada.')})
]
