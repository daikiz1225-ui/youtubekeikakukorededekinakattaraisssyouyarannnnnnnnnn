from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import concurrent.futures

class handler(BaseHTTPRequestHandler):
    def fetch_related_ids(self, video_id):
        """
        kanrenn.js のロジックを Python で再現:
        Invidious APIから関連動画を取得し、上位2件を返す
        """
        # kanrenn.js と同じインスタンス
        target_instance = 'https://inv.thepixora.com'
        url = f'{target_instance}/api/v1/videos/{video_id}'
        
        try:
            # 1. ヘッダーを模倣（PythonのデフォルトUAは拒否されやすいため）
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            req = urllib.request.Request(url, headers=headers)
            
            # 2. タイムアウトを設定して通信
            with urllib.request.urlopen(req, timeout=4) as response:
                if response.getcode() != 200:
                    return []
                
                data = json.loads(response.read().decode())
                
                # 3. kanrenn.js と同じ抽出ロジック
                ids = []
                # パターン1: relatedVideos
                if "relatedVideos" in data and isinstance(data["relatedVideos"], list):
                    ids = [v["videoId"] for v in data["relatedVideos"] if "videoId" in v]
                # パターン2: recommendedVideos
                elif "recommendedVideos" in data and isinstance(data["recommendedVideos"], list):
                    ids = [v["videoId"] for v in data["recommendedVideos"] if "videoId" in v]
                
                # 上位2件を返す
                return ids[:2]
        except Exception as e:
            # デバッグ用に出力（サーバーログで確認可能）
            print(f"Error fetching {video_id}: {e}")
            return []

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        history = data.get('history', [])
        # 履歴から最新10件を対象にする
        history_ids = [item.get('id') for item in history[:10] if item.get('id')]
        
        recommended_ids = []
        
        if history_ids:
            # スレッド数を調整して並列実行
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                results = list(executor.map(self.fetch_related_ids, history_ids))
            
            for ids in results:
                recommended_ids.extend(ids)
            
            # 重複削除
            recommended_ids = list(dict.fromkeys(recommended_ids))

        # もし関連動画が取れなかった場合の最終バックアップ（これが出たら通信自体の失敗）
        if not recommended_ids:
            recommended_ids = ["dQw4w9WgXcQ", "9bZkp7q19f0", "CevxZvSJLk8"] # 最小限
            explanation = "通信エラー、または履歴に基づいた関連動画が見つかりませんでした。"
        else:
            explanation = f"視聴履歴（直近{len(history_ids)}件）から関連動画を抽出しました。"

        res_body = {
            "type": "id_list",
            "ids": recommended_ids[:20],
            "explanation": explanation
        }

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(res_body).encode())
