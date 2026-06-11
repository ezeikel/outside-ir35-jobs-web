import DOMPurify from 'isomorphic-dompurify';

interface HTMLViewerProps {
  html: string;
}

const HTMLViewer = ({ html }: HTMLViewerProps) => {
  const safeHtml = DOMPurify.sanitize(html);

  return <div dangerouslySetInnerHTML={{ __html: safeHtml }} />;
};

export default HTMLViewer;
