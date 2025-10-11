describe('Channel List Page', () => {
    beforeEach(() => {
      // Log in first (reuse login flow)
      cy.visit('http://localhost:4200/login');
      cy.get('input[name="loginUsername"]').type('Stella');
      cy.get('input[name="loginPassword"]').type('123');
      cy.get('.login-form').first().find('button[type="submit"]').click();
  
      // Navigate to a group page (group 1 for example)
      cy.url().should('include', '/dashboard');
      cy.contains('Open').first().click(); // opens first group
      cy.url().should('include', '/group/1/channels');
    });
  
    it('should display group information and channel list', () => {
      cy.contains("You're in Group").should('exist');
      cy.get('.channel-card').should('exist');
      cy.get('.channel-name').first().should('be.visible');
    });
  
    it('should allow opening a channel', () => {
      cy.get('.channel-card').first().within(() => {
        cy.contains('Open').click();
      });
      // after open, should navigate to channel chat
      cy.url().should('include', '/channel/');
    });
  
    it('should show create channel form for admins', () => {
      cy.get('body').then(($body) => {
        if ($body.find('.create-new-channel').length > 0) {
          cy.get('input[name="channelName"]').type('TestChannel');
          cy.get('.create-new-channel').find('button[type="submit"]').click();
  
          cy.on('window:alert', (text) => {
            expect(text).to.equal('Channel created successfully!');
          });
        } else {
          cy.log('User is not an admin, skipping channel creation test.');
        }
      });
    });
  
    it('should show delete buttons only for admins', () => {
      cy.get('body').then(($body) => {
        if ($body.find('.create-new-channel').length > 0) {
          cy.get('.channel-button').contains('Delete').should('exist');
        } else {
          cy.get('.channel-button').contains('Delete').should('not.exist');
        }
      });
    });
  });
  