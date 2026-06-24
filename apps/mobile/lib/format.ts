// Day-rate formatting, matching the web's "£600–£675" / "£600+" presentation.
export const formatDayRate = (range: number[]): string => {
  const nums = (range ?? []).filter((n) => Number.isFinite(n) && n > 0);
  if (nums.length === 0) return "Rate on application";
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const gbp = (n: number) => `£${n.toLocaleString("en-GB")}`;
  if (min === max) return `${gbp(min)}/day`;
  return `${gbp(min)}–${gbp(max)}/day`;
};

// "3d ago" style posted label from an ISO string.
export const postedLabel = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const hours = Math.floor((Date.now() - then) / 36e5);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};
