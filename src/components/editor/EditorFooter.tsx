export function EditorFooter({ body }: { body: string }) {
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  return (
    <footer className="editor-footer">
      <div>
        <span>{words} words</span>
        <span className="footer-separator">·</span>
        <span>{body.length} characters</span>
      </div>
      <div className="editor-footer-right">
        <span>Markdown supported</span>
        <span className="footer-separator">·</span>
        <span>Last edited just now</span>
      </div>
    </footer>
  );
}
