const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.js',
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1366,
    viewportHeight: 850,
    retries: { runMode: 1, openMode: 0 },
    // Render (plan gratis) puede tardar en "despertar" la primera vez
    responseTimeout: 60000,
  },
});
