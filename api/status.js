/**
 * サーバーが生きているか、だいきだけがこっそり確認するための生存信号機能
 */
export default function handler(request, response) {
  // 404を装うなら、ここもあえてエラーを返してもいいし、
  // だいきだけがわかる合言葉を返してもいい
  response.status(200).json({
    status: "Hidden Mode Active",
    message: "System is breathing..."
  });
}
