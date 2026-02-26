# イメージ例
from flask import Flask, request, send_file
import yt_dlp

@app.route('/api/download')
def download():
    url = request.args.get('url')
    # ここで yt-dlp を使って動画を一時保存し、send_file でユーザーに返す
    return send_file(video_file)
