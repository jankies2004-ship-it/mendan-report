// GASのURLは環境変数 GAS_URL からのみ取得する。
// 未設定時に本番URLへフォールバックすると、Preview環境から本番シートへ誤って
// 書き込む恐れがあるため、エラーを返して処理を止める。
export function getGasUrl(res) {
  const url = process.env.GAS_URL;
  if (!url) {
    res.status(500).json({ error: 'サーバー設定エラー：GAS_URL が設定されていません' });
    return null;
  }
  return url;
}
