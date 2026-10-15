import {createHash} from 'node:crypto';
import {ContractError} from './core.mjs';
// Reviewed policy, not spending authorization. Future quotes require new review.
export const REVIEWED_PRICE=Object.freeze({version:'deepseek-flash-peak-2026-10-14',provider:'DeepSeek',model:'deepseek-flash',currencies:Object.freeze(['USD','CNY']),basis:'peak-cache-miss',sourceUsd:'https://api-docs.deepseek.com/quick_start/pricing/',sourceCny:'https://api-docs.deepseek.com/zh-cn/quick_start/pricing/',reviewedAt:'2026-10-14',effectiveAt:'2026-10-14T00:00:00.000Z',expiresAt:'2026-10-15T00:00:00.000Z',usd:Object.freeze({inputPerMillion:.30,outputPerMillion:1.20}),cny:Object.freeze({inputPerMillion:2,outputPerMillion:8})});
export const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function pricePolicy({mode,price=REVIEWED_PRICE,rates,now}){
 if(digest(price)!==digest(REVIEWED_PRICE))throw new ContractError('price_untrusted',503);
 if(rates&&(Object.keys(rates).length!==2||rates.inputPerMillion!==price.usd.inputPerMillion||rates.outputPerMillion!==price.usd.outputPerMillion))throw new ContractError('price_untrusted',503);
 if(mode==='live'&&(!Number.isSafeInteger(now)||now<Date.parse(price.effectiveAt)||now>=Date.parse(price.expiresAt)))throw new ContractError('price_expired',503);
 // Legacy dry fixtures use synthetic rates, never live authorization, after expiry.
 return REVIEWED_PRICE;
}
export function costMicros(usage,rate){return Math.ceil(usage.prompt_tokens*rate.inputPerMillion+usage.completion_tokens*rate.outputPerMillion);}
export function normalizeUsage(u){const int=n=>Number.isSafeInteger(n)&&n>=0;if(!u||!int(u.prompt_tokens)||!int(u.completion_tokens)||!int(u.total_tokens)||u.total_tokens!==u.prompt_tokens+u.completion_tokens||u.prompt_tokens>6000||u.completion_tokens>800)return null;if(u.completion_tokens_details!=null&&(typeof u.completion_tokens_details!=='object'||Array.isArray(u.completion_tokens_details)))return null;const reason=u.completion_tokens_details?.reasoning_tokens;if(reason!==undefined&&(!int(reason)||reason!==0))return null;for(const key of ['prompt_cache_hit_tokens','prompt_cache_miss_tokens'])if(u[key]!==undefined&&(!int(u[key])||u[key]>u.prompt_tokens))return null;if(u.prompt_cache_hit_tokens!==undefined&&u.prompt_cache_miss_tokens!==undefined&&u.prompt_cache_hit_tokens+u.prompt_cache_miss_tokens!==u.prompt_tokens)return null;return {prompt_tokens:u.prompt_tokens,completion_tokens:u.completion_tokens,total_tokens:u.total_tokens};}
