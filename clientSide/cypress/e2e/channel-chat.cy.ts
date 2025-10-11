describe('Channel Chat Page', () => {

    beforeEach(() => {
      // Step 1: Log in
      cy.visit('http://localhost:4200/login');
      cy.get('input[name="loginUsername"]').type('Stella');
      cy.get('input[name="loginPassword"]').type('123');
      cy.get('.login-form').first().find('button[type="submit"]').click();
  
      // Step 2: Navigate to first group and first channel
      cy.url().should('include', '/dashboard');
      cy.contains('Open').first().click(); // go into first group
      cy.url().should('include', '/group/');
      cy.get('.channel-card').first().find('button').contains('Open').click();
  
      cy.url().should('include', '/channel/');
    });
  
    it('should display group and channel info', () => {
      cy.contains("You're in Group:").should('exist');
      cy.get('.chat-container').should('exist');
    });
  
    it('should allow sending a text message', () => {
      cy.get('.send-message-form input[type="text"]').type('Hello from Cypress!');
      cy.get('.send-message-form button').contains('Send').click();
  
      cy.get('.message-field')
        .contains('Hello from Cypress!')
        .should('exist');
    });
  
    it('should toggle video chat buttons correctly', () => {
      // Start video chat
      cy.get('body').then(($body) => {
        if ($body.find('button.leave-channel-button').filter(':contains("Start Video Chat")').length) {
          cy.contains('Start Video Chat').click();
          cy.contains('End Video Chat').should('exist');
  
          // End video chat
          cy.contains('End Video Chat').click();
          cy.contains('Start Video Chat').should('exist');
        } else {
          cy.log('Video chat button not visible for this user.');
        }
      });
    });
  
    it('should allow image upload (if supported)', () => {
      // Simulate choosing an image
      const imagePath = 'test-image.jpg';
      cy.get('input[type="file"][accept="image/*"]').selectFile(`cypress/fixtures/${imagePath}`, { force: true });
      cy.get('.send-message-form button').contains('Send').click();

       // Wait for rendering to stabilize (important for Angular)
        cy.wait(1000); // short pause for change detection

        // Check that at least one image message appears
        cy.get('.sent-image').should('have.length.at.least', 1);
    });
  
    it('should show admin controls for admins only', () => {
      cy.get('body').then(($body) => {
        if ($body.find('.admin-actions').length > 0) {
          cy.contains('IMPORTANT: User Control Panel').should('exist');
          cy.get('.ban-btn').should('exist');
        } else {
          cy.log('User is not a group admin; admin panel not visible.');
        }
      });
    });
  
    it('should allow returning to channel list', () => {
      cy.contains('Back to Channel List').click();
      cy.url().should('include', '/group/');
    });

    it('should logout and redirect to login with confirm alert', () => {
        // Stub window.confirm to automatically return true
        cy.window().then((win) => {
          cy.stub(win, 'confirm').returns(true);
        });
    
        // Click logout button in navbar
        cy.get('.nav-link').contains('LogOut').click();
    
        // Confirm redirect to login page
        cy.url().should('include', '/login');
      });
  });
  