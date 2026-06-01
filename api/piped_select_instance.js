const PIPEDS = [
  'https://pipedapi.kavin.rocks',
  'https://api-piped.mha.fi',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.pfcd.me',
  'https://api.piped.projectsegfau.lt',
  'https://pipedapi.in.projectsegfau.lt',
  'https://pipedapi.us.projectsegfau.lt',
  'https://watchapi.whatever.social',
  'https://api.piped.privacydev.net',
  'https://pipedapi.aeong.one',
  'https://pipedapi.leptons.xyz',
  'https://piped-api.garudalinux.org',
  'https://pipedapi.rivo.lol',
  'https://pipedapi.colinslegacy.com',
  'https://api.piped.yt',
  'https://pipedapi.palveluntarjoaja.eu',
  'https://pipedapi.smnz.de',
  'https://pa.mint.lgbt',
  'https://pa.il.ax',
  'https://piped-api.privacy.com.de',
  'https://api.piped.link',
  'https://api.piped.lunar.icu',
  'https://pipedapi.osphost.fi',
  'https://pipedapi.darkness.services',
  'https://pipedapi.ggtyler.dev',
  'https://pipedapi.qdi.fi',
  'https://piped-api.hostux.net',
  'https://pipedapi.simpleprivacy.fr',
  'https://pipedapi-libre.kavin.rocks'
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
