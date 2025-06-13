export function handlePrint(previewElementId: string = 'checklist-report-preview') {
  const previewElement = document.getElementById(previewElementId);
  if (!previewElement) {
    alert('Could not find report preview element.');
    return;
  }
  const printContents = previewElement.innerHTML;
  const win = window.open('', '', 'width=900,height=700');
  if (win) {
      win.document.write(`
        <html>
          <head>
            <title>Checklist Report</title>
            <link rel="stylesheet" type="text/css" href="/index.css">
            <style>
              body { background: #f5fafd; margin: 0; padding: 0; }
              /* You can still add print-specific overrides here if needed */
            </style>
          </head>
          <body>${printContents}</body>
        </html>
      `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 500);
  } else {
    alert('Failed to open print window.');
  }
}