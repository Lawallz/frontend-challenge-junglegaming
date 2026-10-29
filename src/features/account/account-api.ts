import type {ChangePasswordRequest,OrdersListResponse,Profile,UpdateAvatarRequest,UpdateProfileRequest,Wallet,WalletInput,WalletsResponse} from '@/shared/api/contracts'
import {API_ROUTES} from '@/shared/api/contracts'
import {getSessionToken} from '@/features/auth/session'
import {http} from '@/shared/api/http'
const config=()=>{const token=getSessionToken();return token?{headers:{Authorization:`Bearer ${token}`}}:undefined}
export async function getProfile(){return (await http.get<Profile>(API_ROUTES.profile,config())).data}
export async function updateProfile(input:UpdateProfileRequest){return (await http.put<Profile>(API_ROUTES.profile,input,config())).data}
export async function updateAvatar(input:UpdateAvatarRequest){return (await http.put<Profile>(API_ROUTES.profileAvatar,input,config())).data}
export async function changePassword(input:ChangePasswordRequest){await http.put(API_ROUTES.profilePassword,input,config())}
export async function getOrders(){return (await http.get<OrdersListResponse>(API_ROUTES.orders,{...config(),params:{page:1,pageSize:50}})).data}
export async function getAccountWallets(){return (await http.get<WalletsResponse>(API_ROUTES.wallets,config())).data.items}
export async function addWallet(input:WalletInput){return (await http.post<Wallet>(API_ROUTES.wallets,input,config())).data}
export async function setDefaultWallet(id:string){return (await http.patch<Wallet>(API_ROUTES.walletDefault(id),undefined,config())).data}
export async function removeWallet(id:string){await http.delete(API_ROUTES.wallet(id),config())}