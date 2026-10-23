"""Live privacy/regression tests. Uses the locally minted session; never prints credentials."""
import json
import os
import unittest
from pathlib import Path
import requests

class CircleRules(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        settings = {}
        for line in (Path(__file__).resolve().parents[1] / '.env').read_text().splitlines():
            if '=' in line:
                k, v = line.split('=', 1)
                settings[k] = v.strip('"\'')
        session = json.loads(Path(os.path.expanduser('~/.cache/lovable-auth/session.json')).read_text())['session']
        cls.uid = session['user']['id']
        cls.base = settings['VITE_SUPABASE_URL'] + '/rest/v1/'
        cls.headers = {'apikey': settings['VITE_SUPABASE_PUBLISHABLE_KEY'], 'Authorization': 'Bearer ' + session['access_token'], 'Content-Type': 'application/json'}
        cls.target = None
        for row in cls.rpc('get_leaderboard', {'_limit': 100}).json():
            profile = cls.rpc('get_public_profile', {'_username': row['username']}).json()[0]
            owned = cls.rpc('owns_customer', {'_customer_id': profile['id']}).json()
            existing = requests.get(cls.base+'circle_entries', headers=cls.headers, params={'customer_id': 'eq.'+profile['id']}).json()
            if not owned and not existing:
                cls.target = profile['id']
                break
        assert cls.target, 'No untouched eligible profile is available'

    @classmethod
    def rpc(cls, name, data):
        return requests.post(cls.base+'rpc/'+name, headers=cls.headers, json=data)

    def change(self, action):
        response = self.rpc('update_circle', {'_customer_id': self.target, '_action': action})
        self.assertEqual(response.status_code, 204)

    def rows(self):
        return requests.get(self.base+'circle_entries', headers=self.headers, params={'customer_id': 'eq.'+self.target}).json()

    def tearDown(self):
        self.change('unsave')
        self.change('remove_history')

    def test_saved_profile_persists_in_storage(self):
        self.change('save')
        self.assertIsNotNone(self.rows()[0]['saved_at'])

    def test_repeat_visits_keep_one_row_and_debounce_timestamp(self):
        self.change('view')
        stamp = self.rows()[0]['viewed_at']
        self.change('view')
        self.assertEqual(len(self.rows()), 1)
        self.assertEqual(self.rows()[0]['viewed_at'], stamp)

    def test_unsaving_preserves_history(self):
        self.change('view')
        self.change('save')
        self.change('unsave')
        self.assertIsNone(self.rows()[0]['saved_at'])
        self.assertIsNotNone(self.rows()[0]['viewed_at'])

    def test_other_users_lists_are_inaccessible(self):
        self.change('save')
        response = requests.get(self.base+'circle_entries', headers=self.headers, params={'user_id': 'neq.'+self.uid})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_direct_insert_cannot_spoof_account(self):
        response = requests.post(self.base+'circle_entries', headers=self.headers, json={'user_id': '00000000-0000-0000-0000-000000000001', 'customer_id': self.target})
        self.assertEqual(response.status_code, 403)

    def test_own_profile_cannot_be_saved(self):
        profiles = requests.get(self.base+'customers', headers=self.headers).json()
        owned = next((p for p in profiles if self.rpc('owns_customer', {'_customer_id': p['id']}).json()), None)
        self.assertIsNotNone(owned)
        response = self.rpc('update_circle', {'_customer_id': owned['id'], '_action': 'save'})
        self.assertEqual(response.status_code, 403)

    def test_nonexistent_profile_rejected(self):
        response = self.rpc('update_circle', {'_customer_id': '00000000-0000-0000-0000-000000000001', '_action': 'save'})
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()