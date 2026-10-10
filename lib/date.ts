export function formatDateInput(
  date: Date,
): string {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0');

  const day = String(
    date.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getToday(): string {
  return formatDateInput(
    new Date(),
  );
}

export function addDays(
  date: string,
  days: number,
): string {
  const result = new Date(
    `${date}T12:00:00`,
  );

  result.setDate(
    result.getDate() + days,
  );

  return formatDateInput(result);
}

export function formatDisplayDate(
  date: string,
): string {
  return new Date(
    `${date}T12:00:00`,
  ).toLocaleDateString(
    'en-CA',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
  );
}