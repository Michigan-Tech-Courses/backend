export const crontab
= `
10 * * * * scrape-instructors ?max=2
20 23 * * * scrape-rate-my-professors ?max=2
40 * * * * scrape-sections ?max=2
45 * * * * scrape-transfer-courses ?max=2
50 * * * * scrape-section-details ?max=2
`;
