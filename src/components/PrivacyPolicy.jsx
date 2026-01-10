import React, { useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useTheme } from '../context/ThemeContext'; // Ensure this path is correct

const PrivacyPolicy = () => {
  const { isDarkMode } = useTheme();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Theme Styles
  const themeStyles = {
    backgroundColor: isDarkMode ? '#111827' : '#F3F4F6', // Dark bg vs Light gray bg
    color: isDarkMode ? '#E5E7EB' : '#374151',
    minHeight: '100vh',
  };

  const cardStyles = {
    backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
    color: isDarkMode ? '#D1D5DB' : '#4B5563',
    border: 'none',
    boxShadow: isDarkMode ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)',
  };

  const headingStyle = {
    color: isDarkMode ? '#F9FAFB' : '#111827',
    fontWeight: '700',
    borderBottom: `2px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
    paddingBottom: '0.5rem',
    marginBottom: '1.5rem',
  };

  return (
    <div style={themeStyles} className="py-5">
      <Container>
        <Row className="justify-content-center">
          <Col lg={10} xl={8}>
            <Card className="p-4 p-md-5" style={cardStyles}>
              
              {/* Header */}
              <div className="text-center mb-5">
                <h1 className="display-5 fw-bold mb-3" style={{ color: isDarkMode ? '#fff' : '#000' }}>Privacy Policy</h1>
                <p className="text-muted">
                  Last updated: <span className="fw-semibold">{new Date().toLocaleDateString()}</span>
                </p>
              </div>

              {/* Content */}
              <article>
                <section className="mb-5">
                  <h4 style={headingStyle}>1. Introduction</h4>
                  <p>
                    Welcome to <strong>TechXplorers Pvt. Ltd.</strong> ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. 
                    This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights.
                  </p>
                </section>

                <section className="mb-5">
                  <h4 style={headingStyle}>2. Information We Collect</h4>
                  <p>We may collect, use, store, and transfer different kinds of personal data about you which we have grouped together as follows:</p>
                  <ul className="list-group list-group-flush bg-transparent">
                    <li className="list-group-item bg-transparent" style={{ color: 'inherit' }}>• <strong>Identity Data:</strong> First name, last name, username.</li>
                    <li className="list-group-item bg-transparent" style={{ color: 'inherit' }}>• <strong>Contact Data:</strong> Email address, telephone numbers, billing address.</li>
                    <li className="list-group-item bg-transparent" style={{ color: 'inherit' }}>• <strong>Technical Data:</strong> IP address, browser type, time zone setting.</li>
                  </ul>
                </section>

                <section className="mb-5">
                  <h4 style={headingStyle}>3. How We Use Your Data</h4>
                  <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
                  <ul>
                    <li>To provide the services you have requested (e.g., Web Development, IT Support).</li>
                    <li>To manage our relationship with you.</li>
                    <li>To improve our website, products/services, marketing, and customer relationships.</li>
                  </ul>
                </section>

                <section className="mb-5">
                  <h4 style={headingStyle}>4. Data Security</h4>
                  <p>
                    We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way. 
                    We limit access to your personal data to those employees, agents, contractors, and other third parties who have a business need to know.
                  </p>
                </section>

                {/* Contact Box */}
                <div className="p-4 rounded" style={{ backgroundColor: isDarkMode ? '#374151' : '#F9FAFB' }}>
                  <h5 className="fw-bold mb-3" style={{ color: isDarkMode ? '#fff' : '#000' }}>5. Contact Us</h5>
                  <p className="mb-2">If you have any questions about this privacy policy, please contact us at:</p>
                  <p className="mb-1"><strong>Email:</strong> <a href="mailto:inquiries@techxplorers.in" className="text-decoration-none">inquiries@techxplorers.in</a></p>
                  <p className="mb-0"><strong>Address:</strong> Maruthi Nagar 3rd cross, Near Panda Mini mart, Anantapur, 515001, India.</p>
                </div>
              </article>

            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default PrivacyPolicy;