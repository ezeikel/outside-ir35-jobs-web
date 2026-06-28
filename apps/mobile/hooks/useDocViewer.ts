import { useCallback, useState } from "react";
import { toast } from "sonner-native";

// Shared state for the full-screen DocViewer (CVs + compliance docs). The caller
// hands a function that fetches a short-lived presigned URL; this hook opens the
// viewer, infers PDF vs image from the URL, and exposes props to spread onto
// <DocViewer />.

type ViewerState = {
  url: string | null;
  title: string;
  kind: "pdf" | "image";
};

// Infer the renderer from the file extension in the (presigned) URL. The R2 key
// ends in the original extension, so the path before the query string carries it.
const kindFromUrl = (url: string): "pdf" | "image" => {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  if (/\.(png|jpe?g|webp|gif|heic)$/.test(path)) return "image";
  return "pdf";
};

export const useDocViewer = () => {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ViewerState>({
    url: null,
    title: "",
    kind: "pdf",
  });
  const [opening, setOpening] = useState(false);

  // Open the viewer for `title`, resolving the file URL via `fetchUrl`.
  const view = useCallback(
    async (title: string, fetchUrl: () => Promise<string>) => {
      if (opening) return;
      setOpening(true);
      // Open immediately with a spinner, then fill the URL once resolved.
      setState({ url: null, title, kind: "pdf" });
      setOpen(true);
      try {
        const url = await fetchUrl();
        setState({ url, title, kind: kindFromUrl(url) });
      } catch {
        setOpen(false);
        toast.error("Couldn’t open this document. Try again.");
      } finally {
        setOpening(false);
      }
    },
    [opening],
  );

  const close = useCallback(() => {
    setOpen(false);
    setState((s) => ({ ...s, url: null }));
  }, []);

  return {
    view,
    opening,
    // Spread onto <DocViewer {...viewerProps} />.
    viewerProps: {
      isOpen: open,
      onClose: close,
      url: state.url,
      title: state.title,
      kind: state.kind,
    },
  };
};
