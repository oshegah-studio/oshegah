"""Live card-request rules. Uses the minted session; no credentials are printed.
Run: python3 scripts/card_requests.integration.test.py
Leaves cancellation-only test requests identifiable by notes for controlled cleanup.
"""
import json,os,unittest,uuid
from pathlib import Path
import requests
class CardRules(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cfg={}
  for line in (Path(__file__).resolve().parents[1]/'.env').read_text().splitlines():
   if '=' in line:
    k,v=line.split('=',1);cfg[k]=v.strip('\"\'')
  s=json.loads(Path(os.path.expanduser('~/.cache/lovable-auth/session.json')).read_text())['session']
  cls.uid=s['user']['id'];cls.base=cfg['VITE_SUPABASE_URL']+'/rest/v1/';cls.headers={'apikey':cfg['VITE_SUPABASE_PUBLISHABLE_KEY'],'Authorization':'Bearer '+s['access_token'],'Content-Type':'application/json'}
  p=requests.get(cls.base+'profiles',headers=cls.headers,params={'auth_user_id':'eq.'+cls.uid}).json()[0]
  c=requests.get(cls.base+'customers',headers=cls.headers,params={'user_id':'eq.'+p['id']}).json()[0]
  cls.customer=c['id'];cls.created=[]
  cls.config=cls.rpc('card_request_config',{}).json()
  region=next((k for k,v in cls.config['governorate_fees'].items() if v['enabled']),'Cairo')
  cls.payload={'full_name':'Workflow validation','phone':'01012345678','email':'','contact_method':'whatsapp','country':'EG','governorate':region,'city':'Test validation','address':'Validation only; not a fulfillment request','instructions':'','notes':'OSHEGAH_CARD_WORKFLOW_TEST','quantity':1,'consent':True}
 @classmethod
 def rpc(cls,name,data):return requests.post(cls.base+'rpc/'+name,headers=cls.headers,json=data)
 def submit(self,changes=None,key=None,customer=None):
  r=self.rpc('submit_card_request',{'_customer_id':customer or self.customer,'_key':key or str(uuid.uuid4()),'_payload':{**self.payload,**(changes or {})}})
  if r.status_code==200:self.created.append(r.json())
  return r
 def tearDown(self):
  for i in set(self.created):self.rpc('change_card_request',{'_id':i,'_action':'customer_cancel'})
  self.created=[]
 def test_server_uses_active_price_and_ignores_client_price(self):
  r=self.submit({'unit_price':1,'subtotal':1,'total':1});self.assertEqual(r.status_code,200)
  d=self.rpc('get_card_request',{'_id':r.json()}).json()['request'];self.assertEqual(d['unit_price'],self.config['unit_price']);self.assertEqual(d['subtotal'],self.config['unit_price']);self.assertEqual(d['currency'],'EGP')
  fee=self.config['delivery_charge'] if self.config['delivery_mode']=='flat' else self.config['governorate_fees'][self.payload['governorate']]['fee']
  self.assertEqual(d['delivery_charge'],fee);self.assertEqual(d['total'],None if fee is None else self.config['unit_price']+fee)
 def test_maximum_quantity_uses_active_limit(self):
  limit=self.config['max_quantity'];self.assertEqual(self.submit({'quantity':limit}).status_code,200);self.assertEqual(self.submit({'quantity':limit+1}).status_code,400)
 def test_quantity_must_be_positive_integer(self):
  for n in [0,-1,1.5]:self.assertEqual(self.submit({'quantity':n}).status_code,400)
 def test_delivery_is_egypt_only(self):self.assertEqual(self.submit({'country':'US'}).status_code,400)
 def test_owned_saved_profile_required(self):self.assertEqual(self.submit(customer=str(uuid.uuid4())).status_code,403)
 def test_consent_required(self):self.assertEqual(self.submit({'consent':False}).status_code,400)
 def test_mobile_phone_normalized(self):
  r=self.submit();d=self.rpc('get_card_request',{'_id':r.json()}).json();self.assertEqual(d['request']['contact']['phone'],'+201012345678')
 def test_duplicate_key_creates_one_request(self):
  key=str(uuid.uuid4());a=self.submit(key=key);b=self.submit(key=key);self.assertEqual(a.json(),b.json())
 def test_unverified_admin_cannot_change_status_or_price(self):
  r=self.submit();self.assertEqual(self.rpc('change_card_request',{'_id':r.json(),'_action':'status','_status':'approved'}).status_code,403);self.assertEqual(self.rpc('change_card_request',{'_id':r.json(),'_action':'delivery','_delivery':0}).status_code,403)
 def test_private_lists_and_direct_writes(self):
  response=requests.get(self.base+'card_requests',headers=self.headers,params={'user_id':'neq.'+self.uid});self.assertEqual(response.json(),[])
  self.assertEqual(self.rpc('get_card_requests',{'_admin':True}).status_code,403)
  self.assertEqual(requests.post(self.base+'card_requests',headers=self.headers,json={'user_id':self.uid}).status_code,403)
 def test_submitted_cancellation_and_customer_safe_history(self):
  r=self.submit();self.assertEqual(self.rpc('change_card_request',{'_id':r.json(),'_action':'customer_cancel','_note':'Must remain hidden'}).status_code,204)
  d=self.rpc('get_card_request',{'_id':r.json()}).json();self.assertEqual(d['request']['status'],'cancelled');self.assertEqual(len(d['history']),2);self.assertNotIn('internal_note',d['history'][0]);self.assertNotIn('changed_by',d['history'][0]);self.assertEqual(self.rpc('change_card_request',{'_id':r.json(),'_action':'customer_cancel'}).status_code,403)
 def test_anonymous_requests_are_denied(self):
  h={'apikey':self.headers['apikey']};self.assertEqual(requests.post(self.base+'rpc/get_card_requests',headers=h,json={}).status_code,401)
 def test_paginated_at_most_twenty(self):
  d=self.rpc('get_card_requests',{'_page':1}).json();self.assertEqual(d['page_size'],20);self.assertLessEqual(len(d['rows']),20)
if __name__=='__main__':unittest.main()
