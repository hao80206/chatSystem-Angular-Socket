describe('Dashboard Page', () => {
    const username = 'Stella'; // use a test user
    const password = '123';   // test password
  
    beforeEach(() => {
      // make sure your app is running
      cy.visit('http://localhost:4200/login');
  
      // login first
      cy.get('input[name="loginUsername"]').type(username);
      cy.get('input[name="loginPassword"]').type(password);
      cy.get('.login-form').first().find('button[type="submit"]').click();
  
      // wait for dashboard to load
      cy.url().should('include', '/dashboard');
    });
  
    it('should display welcome message', () => {
      cy.contains(`Welcome, ${username}! Your Groups are`).should('exist');
    });
  
    it('should show user groups grid', () => {
      cy.get('.group-grid').should('exist');
  
      // optionally check there are group cards
      cy.get('.group-card').should('have.length.greaterThan', 0);
  
      // check that "Open" buttons exist for each group
      cy.get('.group-button').contains('Open').should('exist');
    });
  
    it('should allow user to open a group', () => {
      // click first Open button
      cy.get('.group-card').first().find('.group-button').contains('Open').click();
  
      // verify that URL changes to group channels
      cy.url().should('include', '/group/');
  
      // optionally check that channel list is visible
      cy.contains("Channels").should("exist");
        cy.get(".channel-card").should("have.length.greaterThan", 0);
    });
  
  
    it('should allow creating a new group (if admin)', () => {
      // only visible for admins
      cy.get('.create-group-area').then(($el) => {
        if ($el.is(':visible')) {
          cy.get('input[name="newGroupName"]').type('Test Group');
          cy.get('.create-group-area').find('button[type="submit"]').click();
  
          // confirm alert
          cy.on('window:alert', (text) => {
            expect(text).to.equal('Group created successfully!');
          });
        }
      });
    });
  });
  