import React, { useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useTheme } from '../context/ThemeContext';

const TermsOfService = () => {
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
                <h1 className="display-5 fw-bold mb-3" style={{ color: isDarkMode ? '#fff' : '#000' }}>Terms of Service</h1>
                <p className="text-muted">
                  Last updated: <span className="fw-semibold">{new Date().toLocaleDateString()}</span>
                </p>
              </div>

              <article>
                <section className="mb-5">
                  <h4 style={headingStyle}>1. Agreement to Terms</h4>
                  <p>
                    By accessing our website at <strong>TechXplorers Pvt. Ltd.</strong>, you agree to be bound by these terms of service, all applicable laws and regulations, 
                    and agree that you are responsible for compliance with any applicable local laws. If you do not agree with any of these terms, 
                    you are prohibited from using or accessing this site.
                  </p>
                </section>

                <section className="mb-5">
                  <h4 style={headingStyle}>2. Use License</h4>
                  <p>
                    Permission is granted to temporarily download one copy of the materials (information or software) on TechXplorers' website for personal, 
                    non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license, you may not:
                  </p>
                  <ul>
                    <li>Modify or copy the materials;</li>
                    <li>Use the materials for any commercial purpose or for any public display;</li>
                    <li>Attempt to decompile or reverse engineer any software contained on our website;</li>
                  </ul>
                </section>

                <section className="mb-5">
                  <h4 style={headingStyle}>3. Disclaimer</h4>
                  <div className="p-3 border-start border-4 border-warning bg-opacity-10" style={{ backgroundColor: isDarkMode ? 'rgba(255,193,7,0.1)' : '#fff3cd' }}>
                    <p className="mb-0 fst-italic">
                      The materials on TechXplorers' website are provided on an 'as is' basis. TechXplorers makes no warranties, expressed or implied, 
                      and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability.
                    </p>
                  </div>
                </section>

                <section className="mb-5">
                  <h4 style={headingStyle}>4. Limitations</h4>
                  <p>
                    In no event shall TechXplorers or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, 
                    or due to business interruption) arising out of the use or inability to use the materials on our website.
                  </p>
                </section>

                <section className="mb-5">
                  <h4 style={headingStyle}>5. Governing Law</h4>
                  <p>
                    These terms and conditions are governed by and construed in accordance with the laws of <strong>India</strong> and you irrevocably submit to the 
                    exclusive jurisdiction of the courts in that State or location.
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

export default TermsOfService;