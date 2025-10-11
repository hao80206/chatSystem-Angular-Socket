import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200', // your Angular dev server
    setupNodeEvents(on, config) {
      // implement node event listeners here if needed
    },
    specPattern: 'cypress/e2e/**/*.cy.{js,ts}' // default test folder
  },
});
