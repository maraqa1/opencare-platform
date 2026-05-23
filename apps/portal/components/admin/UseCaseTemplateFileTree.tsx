export function UseCaseTemplateFileTree({
  files,
}: {
  files: Array<{ path: string; type: string; size?: number | null }> | undefined;
}) {
  return (
    <article className="panel span-12">
      <p className="eyebrow">Files</p>
      <h3 className="section-heading">Safe package file tree</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Path</th>
            <th>Type</th>
            <th>Size</th>
          </tr>
        </thead>
        <tbody>
          {!files || files.length === 0 ? (
            <tr>
              <td colSpan={3}>No files listed.</td>
            </tr>
          ) : (
            files.map((file) => (
              <tr key={file.path}>
                <td><code>{file.path}</code></td>
                <td>{file.type}</td>
                <td>{file.size ?? "n/a"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </article>
  );
}

