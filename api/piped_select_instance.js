const PIPEDS = [
  'https://pipedapi.kavin.rocks',
  'https://api-piped.mha.fi',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.pfcd.me'
];

// テスト用動画ID
const TEST_ID = "4cvXaWyORr8";

async function testInstance(url) {
  const start = Date.now();

  try {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 3000);

    const response = await fetch(
      `${url}/streams/${TEST_ID}`,
      {
        signal: controller.signal
      }
    );

    clearTimeout(timeout);

    if (!response.ok)
      throw new Error();

    const json = await response.json();

    return {
      url,
      latency: Date.now() - start,
      hasDash: !!json.dash,
      hasHls: !!json.hls,
      success: true
    };

  } catch {

    return {
      url,
      latency: 999999,
      hasDash: false,
      hasHls: false,
      success: false
    };

  }
}

export default async function handler(req, res) {

  try {

    const results = await Promise.all(
      PIPEDS.map(testInstance)
    );

    const ranked = results
      .filter(x => x.success)
      .sort(
        (a, b) =>
          a.latency - b.latency
      );

    res.status(200).json({
      instances: ranked
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

}
