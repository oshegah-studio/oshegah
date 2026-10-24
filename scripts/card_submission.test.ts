import {strict as assert} from 'node:assert';
import {confirmCardSubmission,deliveryAddressSchema,logSubmissionError,submissionError} from '../src/features/cards/submission';
let passed=0;
async function test(name:string,fn:()=>Promise<void>|void){await fn();console.log(`PASS ${++passed}: ${name}`);}
const id='11111111-1111-4111-8111-111111111111';
const details={request:{id,request_number:48,created_at:'2026-10-24T17:35:30+00:00'}};
await test('multiline address accepted unchanged',()=>{assert.equal(deliveryAddressSchema.parse('Building\nFloor\r\nApartment\t4'),'Building\nFloor\r\nApartment\t4');});
await test('unsafe controls rejected',()=>{assert.equal(deliveryAddressSchema.safeParse('Address\u0001hidden').success,false);});
await test('empty required address rejected',()=>{assert.equal(deliveryAddressSchema.safeParse(' ').success,false);});
await test('confirmed submit and details return actual receipt',async()=>{const r=await confirmCardSubmission({submit:async()=>({data:id,error:null}),readback:async()=>({data:details,error:null})});assert.equal(r.summary?.number,48);});
await test('backend rejection never yields success',async()=>{await assert.rejects(()=>confirmCardSubmission({submit:async()=>({data:null,error:Error('PROFILE_REQUIRED')}),readback:async()=>{throw Error('must not read');}}),/PROFILE_REQUIRED/);});
await test('lost submission response never yields fake success',async()=>{await assert.rejects(()=>confirmCardSubmission({submit:async()=>{throw Error('Network failed');},readback:async()=>({data:details,error:null})}),/Network failed/);});
const original=console.error;const logs:unknown[][]=[];console.error=(...args)=>{logs.push(args);};
try{
 await test('confirmed creation survives details readback failure',async()=>{const r=await confirmCardSubmission({submit:async()=>({data:id,error:null}),readback:async()=>({data:null,error:{code:'42501',message:'private personal data'}})});assert.equal(r.id,id);assert.equal(r.summary,null);});
 await test('diagnostics omit arbitrary backend details',()=>{logSubmissionError('submit',{code:'P0001',message:'INVALID_FIELD: address',details:'sensitive address'});logSubmissionError('submit',{code:'sensitive',message:'private customer email',details:'token'});const encoded=JSON.stringify(logs);assert.ok(encoded.includes('P0001'));assert.ok(encoded.includes('address'));for(const secret of ['private personal data','sensitive address','private customer email','token'])assert.equal(encoded.includes(secret),false);});
}finally{console.error=original;}
await test('expected errors never expose internal error names',()=>{for(const lang of ['en','ar'])for(const message of ['AUTH_REQUIRED','PROFILE_REQUIRED','INVALID_FIELD: address','CONSENT_REQUIRED','SETTINGS_UNAVAILABLE']){const result=submissionError({message},lang);assert.notEqual(result,message);assert.ok(result.length>10);}});
console.log(`${passed} submission regression tests passed.`);