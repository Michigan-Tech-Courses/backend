export const crontab
= `
10 * * * * scrape-instructors?max=0
20 */2 * * * scrape-rate-my-professors?max=0
40 * * * * scrape-sections?max=0
45 * * * * scrape-transfer-courses?max=0
50 * * * * scrape-section-details?max=0
`;
