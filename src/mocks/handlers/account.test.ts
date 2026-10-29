import {afterAll,afterEach,beforeAll,describe,expect,it} from 'vitest'
import {setupServer} from 'msw/node'
import {authHandlers,resetMockAuthState} from './auth'
import {profileHandlers} from './profile'
import {profileExtraHandlers} from './profile-extra'
import {cartHandlers,resetMockCart} from './cart'
import {walletHandlers,resetMockWallets} from './wallets'
import {accountDataHandlers} from './account-data'
import {orderHandlers,resetMockOrders} from './orders'
import {resetMockScenario} from '../scenarios'
const server=setupServer(...authHandlers,...profileHandlers,...profileExtraHandlers,...cartHandlers,...walletHandlers,...accountDataHandlers,...orderHandlers)
const json={'Content-Type':'application/json'}
beforeAll(()=>server.listen({onUnhandledRequest:'error'}))
afterAll(()=>server.close())
afterEach(()=>{server.resetHandlers();resetMockAuthState();resetMockCart();resetMockWallets();resetMockOrders();resetMockScenario()})
async function register(username:string,email:string){const r=await fetch('http://localhost/api/auth/register',{method:'POST',headers:json,body:JSON.stringify({username,email,password:'KurioPass123!',confirmPassword:'KurioPass123!'})});return r.json()}
const auth=(token:string)=>({Authorization:`Bearer ${token}`,'Content-Type':'application/json'})
describe('perfil, pedidos e carteiras MSW',()=>{
 it('valida e persiste alterações de perfil e recusa campos inválidos',async()=>{
  const user=await register('first-user','first@kurio.art'),headers=auth(user.accessToken)
  const invalid=await fetch('http://localhost/api/profile',{method:'PUT',headers,body:JSON.stringify({username:'x',email:'invalido',displayName:'',ensName:'not-ens'})})
  expect(invalid.status).toBe(400)
  expect(await invalid.json()).toMatchObject({fieldErrors:{username:expect.any(String),email:expect.any(String),ensName:expect.any(String)}})
  const saved=await fetch('http://localhost/api/profile',{method:'PUT',headers,body:JSON.stringify({username:'first-updated',email:'updated@kurio.art',displayName:'First Updated',ensName:'first.eth'})})
  expect(saved.status).toBe(200)
  expect(await saved.json()).toMatchObject({username:'first-updated',email:'updated@kurio.art',ensName:'first.eth'})
  expect(await (await fetch('http://localhost/api/auth/session',{headers})).json()).toMatchObject({user:{displayName:'First Updated'}})
  const avatar=await fetch('http://localhost/api/profile/avatar',{method:'PUT',headers,body:JSON.stringify({dataUrl:'data:image/png;base64,AAAA'})})
  expect(avatar.status).toBe(200)
  expect(await avatar.json()).toMatchObject({avatarUrl:'data:image/png;base64,AAAA'})
  const invalidPassword=await fetch('http://localhost/api/profile/password',{method:'PUT',headers,body:JSON.stringify({currentPassword:'wrong',newPassword:'NewKurioPass123!',confirmNewPassword:'NewKurioPass123!'})})
  expect(invalidPassword.status).toBe(400)
  const changed=await fetch('http://localhost/api/profile/password',{method:'PUT',headers,body:JSON.stringify({currentPassword:'KurioPass123!',newPassword:'NewKurioPass123!',confirmNewPassword:'NewKurioPass123!'})})
  expect(changed.status).toBe(204)
  expect((await fetch('http://localhost/api/auth/login',{method:'POST',headers:json,body:JSON.stringify({email:'updated@kurio.art',password:'KurioPass123!'})})).status).toBe(401)
  expect((await fetch('http://localhost/api/auth/login',{method:'POST',headers:json,body:JSON.stringify({email:'updated@kurio.art',password:'NewKurioPass123!'})})).status).toBe(200)
 })
 it('isola carteiras, rejeita duplicatas, altera padrão e promove uma carteira ao remover a principal',async()=>{
  const a=await register('wallet-user','wallet@kurio.art'),b=await register('other-user','other@kurio.art'),ha=auth(a.accessToken),hb=auth(b.accessToken)
  const body=(address:string)=>JSON.stringify({role:'primary',label:'Minha carteira',address,network:'ethereum-mainnet',walletType:'metamask'})
  const one=await fetch('http://localhost/api/wallets',{method:'POST',headers:ha,body:body('0x'+'1'.repeat(40))}).then(r=>r.json())
  const duplicate=await fetch('http://localhost/api/wallets',{method:'POST',headers:ha,body:body('0x'+'1'.repeat(40))})
  expect(duplicate.status).toBe(409)
  const two=await fetch('http://localhost/api/wallets',{method:'POST',headers:ha,body:body('0x'+'2'.repeat(40))}).then(r=>r.json())
  await fetch(`http://localhost/api/wallets/${two.id}/default`,{method:'PATCH',headers:ha})
  expect((await (await fetch('http://localhost/api/wallets',{headers:ha})).json()).items.map((w:any)=>[w.id,w.role])).toEqual([[one.id,'secondary'],[two.id,'primary']])
  expect((await (await fetch('http://localhost/api/wallets',{headers:hb})).json()).items).toEqual([])
  await fetch(`http://localhost/api/wallets/${two.id}`,{method:'DELETE',headers:ha})
  expect((await (await fetch('http://localhost/api/wallets',{headers:ha})).json()).items).toMatchObject([{id:one.id,role:'primary'}])
 })
 it('lista somente pedidos próprios e retorna uma lista paginada vazia sem histórico',async()=>{
  const a=await register('order-user','order@kurio.art'),b=await register('reader-user','reader@kurio.art'),ha=auth(a.accessToken),hb=auth(b.accessToken)
  const empty=await fetch('http://localhost/api/orders',{headers:ha}).then(r=>r.json())
  expect(empty).toMatchObject({items:[],total:0,page:1})
  await fetch('http://localhost/api/cart/items',{method:'POST',headers:ha,body:JSON.stringify({nftId:'nft-005',editionId:'nft-005-edition-2',quantity:1})})
  const wallet=await fetch('http://localhost/api/wallets',{method:'POST',headers:ha,body:JSON.stringify({role:'primary',label:'Main',address:'0x'+'3'.repeat(40),network:'ethereum-mainnet',walletType:'metamask'})}).then(r=>r.json())
  const quote=await fetch('http://localhost/api/quotes',{method:'POST',headers:ha,body:JSON.stringify({network:'ethereum-mainnet'})}).then(r=>r.json())
  const created=await fetch('http://localhost/api/orders',{method:'POST',headers:{...ha,'Idempotency-Key':'account-test'},body:JSON.stringify({quoteId:quote.id,acceptedTotal:quote.total,walletId:wallet.id,network:'ethereum-mainnet',buyer:{displayName:'Order User',email:'order@kurio.art'}})})
  expect(created.status).toBe(201)
  expect((await (await fetch('http://localhost/api/orders',{headers:ha})).json()).total).toBe(1)
  expect((await (await fetch('http://localhost/api/orders',{headers:hb})).json()).items).toEqual([])
  const order=await created.json()
  expect((await fetch(`http://localhost/api/orders/${order.id}`,{headers:hb})).status).toBe(404)
 })
})
