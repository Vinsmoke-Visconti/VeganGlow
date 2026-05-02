interface RichTextViewerProps {
  html: string;
  className?: string;
}

export default function RichTextViewer({ html, className }: RichTextViewerProps) {
  return (
    <div
      className={`prose prose-stone max-w-none font-serif prose-headings:font-serif prose-a:text-primary ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
