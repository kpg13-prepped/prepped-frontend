import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());

const PORT = 3001;

app.get("/api/address-search", async (req, res) => {
  const q = String(req.query.q || "").trim();

  if (q.length < 3) {
    return res.status(200).json({ results: [] });
  }

  const safeQ = q.replace(/'/g, "''");

  const filter =
    `full_address_ascii ILIKE '%${safeQ}%' OR ` +
    `road_name_ascii ILIKE '%${safeQ}%' OR ` +
    `suburb_locality ILIKE '%${safeQ}%' OR ` +
    `town_city ILIKE '%${safeQ}%'`;

  const url =
    `https://data.linz.govt.nz/services;key=${process.env.LINZ_API_KEY}/wfs` +
    `?service=WFS` +
    `&version=2.0.0` +
    `&request=GetFeature` +
    `&typeNames=layer-123113` +
    `&outputFormat=json` +
    `&CQL_FILTER=${encodeURIComponent(filter)}` +
    `&count=8`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("LINZ HTTP error:", response.status, errorText);
      return res.status(500).json({
        error: "LINZ request failed",
        status: response.status,
        details: errorText,
      });
    }

    const data: any = await response.json();

    const results = (data.features || []).map((f: any) => ({
      id: f.properties?.address_id ?? null,
      fullAddress: f.properties?.full_address ?? "",
      suburb: f.properties?.suburb_locality ?? "",
      city: f.properties?.town_city ?? "",
      region: f.properties?.territorial_authority ?? "",
      lat: f.geometry?.coordinates?.[1] ?? null,
      lng: f.geometry?.coordinates?.[0] ?? null,
    }));

    return res.status(200).json({ results });
  } catch (error) {
    console.error("LINZ lookup failed:", error);
    return res.status(500).json({ error: "Address lookup failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
