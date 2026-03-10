export default async function handler(req, res) {
    const { id } = req.query;
    if (!id) {
        return res.status(400).json({ error: "Missing video id" });
    }

    try {
        const renderUrl = `https://yt-api-w340.onrender.com/api/video?id=${id}`;
        const response = await fetch(renderUrl);
        
        if (!response.ok) {
            throw new Error(`Render API responded with status: ${response.status}`);
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error("Render API error:", error);
        res.status(500).json({ error: "Internal Server Error", message: error.message });
    }
}
