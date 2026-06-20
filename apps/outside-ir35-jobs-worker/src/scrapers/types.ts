// A raw scraped listing — attribution + a SHORT extract only. We are an INDEX,
// not a re-publisher: we store the sourceUrl + a brief description, never the
// full job body. The classifier reads these to extract structured fields.
//
// Every scraper (Jobserve, CWJobs, …) returns ScrapedJob[]; the pipeline is
// source-agnostic from here down (prefilter → classify → embed → ingest).
export type ScrapedJob = {
  position: string;
  companyName: string;
  location: string;
  dayRateText: string; // raw, e.g. "£500pd inside IR35" / "£60 per hour" — parsed downstream
  description: string; // short extract, not the full body
  sourceUrl: string; // canonical link back to the origin listing
};
