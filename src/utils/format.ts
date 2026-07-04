export function formatIssue(issue: number): string {
  return `Week${issue}`;
}

export function formatLetterTitle(title: string): string {
  return title.replace(/^The Lead Letter:\s*/i, '');
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
