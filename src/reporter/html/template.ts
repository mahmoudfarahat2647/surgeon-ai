// Template string helper — the main HTML template is assembled in generator.ts
export function htmlWrapper(title: string, styles: string, body: string, scripts: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>${styles}</style>
</head>
<body>
${body}
<script>${scripts}</script>
</body>
</html>`;
}
