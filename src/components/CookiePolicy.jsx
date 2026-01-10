import React, { useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useTheme } from '../context/ThemeContext';

const CookiePolicy = () => {
  const { isDarkMode } = useTheme();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const themeStyles = {
    backgroundColor: isDarkMode ? '#111827' : '#F3F4F6',
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
              
              <div className="text-center mb-5">
                <h1 className="display-5 fw-bold mb-3" style={{ color: isDarkMode ? '#fff' : '#000' }}>Cookie Policy</h1>
                <p className="text-muted">
                  Last updated: <span className="fw-semibold">{new Date().toLocaleDateString()}</span>
                </p>
              </div>

              <article>
                <section className="mb-5">
                  <h4 style={headingStyle}>1. What Are Cookies?</h4>
                  <p>
                    Cookies are small text files that are placed on your computer or mobile device by websites that you visit. 
                    They are widely used in order to make websites work, or work more efficiently, as well as to provide information to the owners of the site.
                  </p>
                </section>

                <section className="mb-5">
                  <h4 style={headingStyle}>2. How We Use Cookies</h4>
                  <p className="mb-3">We use cookies for a variety of reasons detailed below:</p>
                  
                  <Row className="g-3">
                    <Col md={4}>
                      <div className="p-3 rounded h-100" style={{ backgroundColor: isDarkMode ? '#374151' : '#F3F4F6' }}>
                        <strong className="d-block mb-2" style={{ color: isDarkMode ? '#fff' : '#000' }}>Essential</strong>
                        <small>Necessary for the website to function and cannot be switched off.</small>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="p-3 rounded h-100" style={{ backgroundColor: isDarkMode ? '#374151' : '#F3F4F6' }}>
                        <strong className="d-block mb-2" style={{ color: isDarkMode ? '#fff' : '#000' }}>Performance</strong>
                        <small>Allow us to count visits and traffic sources to measure performance.</small>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="p-3 rounded h-100" style={{ backgroundColor: isDarkMode ? '#374151' : '#F3F4F6' }}>
                        <strong className="d-block mb-2" style={{ color: isDarkMode ? '#fff' : '#000' }}>Functionality</strong>
                        <small>Enable enhanced functionality and personalization (like theme prefs).</small>
                      </div>
                    </Col>
                  </Row>
                </section>

                <section className="mb-5">
                  <h4 style={headingStyle}>3. Managing Cookies</h4>
                  <p>
                    Most web browsers allow some control of most cookies through the browser settings. To find out more about cookies, 
                    including how to see what cookies have been set, visit the following third-party resources:
                  </p>
                  <ul className="list-unstyled">
                    <li>🔗 <a href="https://www.aboutcookies.org" target="_blank" rel="noreferrer" style={{color: '#6D28D9'}}>www.aboutcookies.org</a></li>
                    <li>🔗 <a href="https://www.allaboutcookies.org" target="_blank" rel="noreferrer" style={{color: '#6D28D9'}}>www.allaboutcookies.org</a></li>
                  </ul>
                  <p className="text-muted small mt-3">
                    * Please note that strictly necessary cookies are essential for the website's operation, and refusing them may impact your user experience.
                  </p>
                </section>

                <section className="mb-5">
                  <h4 style={headingStyle}>4. Changes to This Policy</h4>
                  <p>
                    We may update our Cookie Policy from time to time. We encourage you to review this policy periodically for any changes.
                  </p>
                </section>
              </article>

            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default CookiePolicy;