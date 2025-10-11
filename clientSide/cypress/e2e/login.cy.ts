describe('Login Page', () => {
    it('#01 should display an alert if username or password is empty', () => {
      cy.visit('http://localhost:4200/login');
  
      // Only click the login button inside the first form
      cy.get('.login-form').first().find('button[type="submit"]').click();
  
      cy.on('window:alert', (str) => {
        expect(str).to.equal('Username and password are required!');
      });
    });
  
    it('#02 should login successfully with valid credentials', () => {
      cy.visit('http://localhost:4200/login');
  
      cy.get('input[name="loginUsername"]').type('Stella');
      cy.get('input[name="loginPassword"]').type('123');
      cy.get('.login-form').first().find('button[type="submit"]').click();
  
      cy.url().should('include', '/dashboard');
       // assert welcome message exists
        cy.contains('Welcome, Stella! Your Groups are').should('exist');

        // assert user’s groups grid exists
        cy.get('.group-grid').should('exist');

        // optionally check for Open buttons
        cy.get('.group-button').contains('Open').should('exist');
    });
  
    it('#03 should alert if credentials are wrong', () => {
      cy.visit('http://localhost:4200/login');
  
      cy.get('input[name="loginUsername"]').type('Stella');
      cy.get('input[name="loginPassword"]').type('wrong');
      cy.get('.login-form').first().find('button[type="submit"]').click();
  
      cy.on('window:alert', (str) => {
        expect(str).to.equal('Invalid username or password');
      });
    });
  });
  