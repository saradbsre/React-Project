export function handlePrint(previewElementId: string = 'checklist-report-preview') {
  const previewElement = document.getElementById(previewElementId);
  if (!previewElement) {
    alert('Could not find report preview element.');
    return;
  }
  const printContents = previewElement.innerHTML;
  const win = window.open('', '', 'width=900,height=700');
  if (win) {
    win.document.head.innerHTML = `
      <title>Checklist Report</title>
      <link rel="stylesheet" type="text/css" href="/index.css">
      <style>
        body { background: #f5fafd; margin: 0; padding: 0; }
      </style>
    `;
    win.document.body.innerHTML = printContents;

    win.document.close();
    win.focus();

    // Wait for all images to load before printing
    const images = win.document.images;
    if (images.length === 0) {
      setTimeout(() => {
        win.print();
        win.close();
      }, 500);
    } else {
      let loaded = 0;
      const checkAndPrint = () => {
        loaded++;
        if (loaded === images.length) {
          setTimeout(() => {
            win.print();
            win.close();
          }, 300);
        }
      };
      for (let i = 0; i < images.length; i++) {
        if (images[i].complete) {
          checkAndPrint();
        } else {
          images[i].addEventListener('load', checkAndPrint);
          images[i].addEventListener('error', checkAndPrint);
        }
      }
    }
  } else {
    alert('Failed to open print window.');
  }
}