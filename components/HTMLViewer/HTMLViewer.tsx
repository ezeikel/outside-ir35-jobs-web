import DOMPurify from 'dompurify';

type HTMLViewerProps = {
  html: string;
};

const HTMLViewer = ({ html }: HTMLViewerProps) => {
  const safeHtml = DOMPurify.sanitize(html);

  return <div dangerouslySetInnerHTML={{ __html: safeHtml }} />;
};

export default HTMLViewer;
