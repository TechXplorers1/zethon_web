import React, { useState, useRef, useEffect } from 'react';
import { Container, Nav, Navbar } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/zethon_logo.png';
import '../styles/navbar.css';
import ServicesDropdown from './Services';
import IndustriesDropdown from './Industry';

import { useAuth } from './AuthContext'; // Import AuthContext

const CustomNavbar = ({ scrolled, aboutRef }) => {
  const { user, logout } = useAuth(); // Get user and logout from context
  const [showServicesPopup, setShowServicesPopup] = useState(false);
  const [showIndustriesPopup, setShowIndustriesPopup] = useState(false);
  const navigate = useNavigate();

  const servicesTimeoutRef = useRef(null);
  const industriesTimeoutRef = useRef(null);
  const servicesRef = useRef(null);
  const industriesRef = useRef(null);

  // --- Services handlers ---
  const handleServicesEnter = () => {
    clearTimeout(servicesTimeoutRef.current);
    setShowServicesPopup(true);
  };

  const handleServicesLeave = () => {
    servicesTimeoutRef.current = setTimeout(() => {
      if (!servicesRef.current?.matches(':hover')) {
        setShowServicesPopup(false);
      }
    }, 300);
  };

  const handleServicesDropdownLeave = () => {
    servicesTimeoutRef.current = setTimeout(() => {
      setShowServicesPopup(false);
    }, 300);
  };

  // --- Industries handlers ---
  const handleIndustriesEnter = () => {
    clearTimeout(industriesTimeoutRef.current);
    setShowIndustriesPopup(true);
  };

  const handleIndustriesLeave = () => {
    industriesTimeoutRef.current = setTimeout(() => {
      if (!industriesRef.current?.matches(':hover')) {
        setShowIndustriesPopup(false);
      }
    }, 300);
  };

  const handleIndustriesDropdownLeave = () => {
    industriesTimeoutRef.current = setTimeout(() => {
      setShowIndustriesPopup(false);
    }, 300);
  };

  const scrollToAbout = () => {
    if (aboutRef?.current) {
      aboutRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleHomeClick = (e) => {
    e.preventDefault();
    navigate('/');
    window.scrollTo(0, 0); // Scroll to top of the page
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardPath = () => {
    if (!user || !user.roles) return '/';
    if (user.roles.includes('admin')) return '/adminpage';
    if (user.roles.includes('manager')) return '/managerworksheet';
    if (user.roles.includes('employee')) return '/employees';
    return '/clientdashboard'; // Default for clients
  };

  useEffect(() => {
    return () => {
      clearTimeout(servicesTimeoutRef.current);
      clearTimeout(industriesTimeoutRef.current);
    };
  }, []);

  return (
    <Navbar expand="lg" fixed="top" className={`navbar-custom ${scrolled ? 'scrolled' : ''}`}>
      <Container fluid>
        <Navbar.Brand as={Link} to="/" onClick={handleHomeClick} className="d-flex align-items-center">
          <img src={logo} alt="Zethon Tech Logo" height="50" />
          <span style={{ color: 'white', marginLeft: '10px', fontWeight: '', fontSize: '1.5rem' }}>
            Zethon Tech
          </span>
        </Navbar.Brand>


        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center">
            <Nav.Link as={Link} to="/" className="nav-link" onClick={handleHomeClick}>Home</Nav.Link>

            {/* Services */}
            <div
              className="nav-link services-popup-wrapper"
              onMouseEnter={handleServicesEnter}
              onMouseLeave={handleServicesLeave}
            >
              <span>Services</span>
              {showServicesPopup && (
                <div
                  className="services-dropdown-container"
                  ref={servicesRef}
                  onMouseEnter={() => clearTimeout(servicesTimeoutRef.current)}
                  onMouseLeave={handleServicesDropdownLeave}
                >
                  <ServicesDropdown />
                </div>
              )}
            </div>

            {/* Industries */}
            <div
              className="nav-link industries-popup-wrapper"
              onMouseEnter={handleIndustriesEnter}
              onMouseLeave={handleIndustriesLeave}
            >
              <span>Industries</span>
              {showIndustriesPopup && (
                <div
                  className="industries-dropdown-container"
                  ref={industriesRef}
                  onMouseEnter={() => clearTimeout(industriesTimeoutRef.current)}
                  onMouseLeave={handleIndustriesDropdownLeave}
                >
                  <IndustriesDropdown />
                </div>
              )}
            </div>

            <Nav.Link
              className="nav-link"
              onClick={(e) => {
                e.preventDefault();
                if (window.location.pathname === '/') {
                  if (aboutRef?.current) {
                    aboutRef.current.scrollIntoView({ behavior: 'smooth' });
                  }
                } else {
                  navigate('/');
                  setTimeout(() => {
                    if (aboutRef?.current) {
                      aboutRef.current.scrollIntoView({ behavior: 'smooth' });
                    }
                  }, 100); // Optional: adjust delay if needed
                }
              }}
            >
              About
            </Nav.Link>


            {/* <Nav.Link as={Link} to="/careers" className="nav-link">Careers</Nav.Link> */}
            <Nav.Link as={Link} to="/contact" className="nav-link">Contact</Nav.Link>

            {user ? (
              <>
                <Nav.Link as={Link} to={getDashboardPath()} className="nav-link">Dashboard</Nav.Link>
                <Nav.Link onClick={handleLogout} className="nav-link">Logout</Nav.Link>
              </>
            ) : (
              <Nav.Link as={Link} to="/login" className="nav-link">Login</Nav.Link>
            )}

          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default CustomNavbar;