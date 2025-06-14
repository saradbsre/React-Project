export function handlePrint(previewElementId: string = 'checklist-report-preview') {
  const previewElement = document.getElementById(previewElementId);
  if (!previewElement) {
    alert('Could not find report preview element.');
    return;
  }
  const printContents = previewElement.innerHTML;
  const win = window.open('', '', 'width=900,height=700');
  if (win) {
    // Create the document structure
    win.document.head.innerHTML = `
      <title>Checklist Report</title>
      <link rel="stylesheet" type="text/css" href="/index.css">
      <style>
        body { background: #f5fafd; margin: 0; padding: 0; }
      </style>
    `;
    const body = win.document.body;
    body.innerHTML = printContents;

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