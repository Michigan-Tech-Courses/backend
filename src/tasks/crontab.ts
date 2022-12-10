export const crontab
= `
10 * * * * scrape-instructors?max=1
20 */2 * * * scrape-rate-my-professors?max=1
40 * * * * scrape-sections?max=1
45 * * * * scrape-transfer-courses?max=1
50 * * * * scrape-section-details?max=1
`;
