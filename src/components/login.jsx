// In login.jsx, replace the entire file content with this code.
import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { Button, Modal, Form, InputGroup, Alert, Spinner } from 'react-bootstrap'; // Import Spinner
import { FcGoogle } from "react-icons/fc";
import { MdEmail } from "react-icons/md";
import { RiLockPasswordFill } from "react-icons/ri";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import { useAuth } from '../components/AuthContext';
import '../styles/AuthForm.css';

import { auth, database } from "../firebase";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { ref, get, child, set, update } from "firebase/database";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false); // NEW: State for loading

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [modalAlert, setModalAlert] = useState({ type: "", message: "" });

  const processLogin = async (user) => {
    try {
      const { uid, email, photoURL } = user;

      // ✅ Use direct path reference instead of child() on root
      const userRef = ref(database, `users/${uid}`);
      const snapshot = await get(userRef);

      let userDataFromDb;

      if (snapshot.exists()) {
        userDataFromDb = snapshot.val();
      } else {
        // ✅ Batch both writes into one atomic update
        const updates = {
          [`users/${uid}`]: { email, roles: ['client'] },
          [`clients/${uid}`]: {
            email,
            firstName: email.split('@')[0],
            lastName: '',
          },
        };
        await update(ref(database), updates);

        userDataFromDb = updates[`users/${uid}`];
      }

      // ✅ Construct user data once
      const finalUserData = {
        firebaseKey: uid,
        uid,
        email,
        roles: userDataFromDb.roles || ['client'],
        avatar:
          photoURL ||
          `https://placehold.co/40x40/007bff/white?text=${email.charAt(0).toUpperCase()}`,
      };


      sessionStorage.setItem('loggedInClient', JSON.stringify(finalUserData));
      // ✅ Cache in sessionStorage and context
      sessionStorage.setItem('loggedInEmployee', JSON.stringify(finalUserData));
      login(finalUserData);

      // ✅ Map roles to routes (cleaner and faster)
      const roleRoutes = {
        admin: '/adminpage',
        manager: '/managerworksheet',
        employee: '/employees',
        asset: '/assetworksheet',
        client: '/',
      };

      const userRole = finalUserData.roles.find((r) => roleRoutes[r]) || 'client';
      navigate(roleRoutes[userRole]);
    } catch (error) {
      console.error('Login process failed:', error);
      alert('Login failed. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true); // NEW: Start loading

    if (!email || !password) {
      setLoginError("Please enter both email and password.");
      setIsLoggingIn(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await processLogin(userCredential.user);
    } catch (error) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setLoginError("Invalid email or password.");
      } else {
        setLoginError("An error occurred during login. Please try again.");
        console.error("Firebase email login error:", error);
      }
    } finally {
      setIsLoggingIn(false); // NEW: Stop loading
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError("");
    setIsLoggingIn(true); // NEW: Start loading for Google login
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await processLogin(result.user);
    } catch (error) {
      setLoginError("Failed to sign in with Google. Please try again.");
      console.error("Firebase Google login error:", error);
    } finally {
      setIsLoggingIn(false); // NEW: Stop loading
    }
  };

  const handlePasswordReset = async () => {
    if (!forgotEmail.includes("@")) {
      setModalAlert({ type: "danger", message: "Please enter a valid email address." });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setModalAlert({ type: "success", message: `A password reset link has been sent to ${forgotEmail}.` });
    } catch (error) {
      setModalAlert({ type: "danger", message: "Could not send password reset email. Please check the address and try again." });
      console.error("Password reset error:", error);
    }
  }

  const openForgotModal = () => {
    setShowForgotModal(true);
    setForgotEmail("");
    setModalAlert({ type: "", message: "" });
  }

  return (
    <>
      <div className="auth-page-wrapper">
        <div className="auth-card">
          <h3 className="text-center auth-title">Login to Your Account</h3>
          <Button
            variant="outline-secondary"
            className="w-100 mb-3 d-flex align-items-center justify-content-center gap-2 google-btn"
            onClick={handleGoogleLogin}
            disabled={isLoggingIn} // NEW: Disable during login
          >
            <FcGoogle size={22} /> Continue with Google
          </Button>
          <div className="or-divider">OR</div>

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="form-label-modern">Email</Form.Label>
              <div className="input-group-modern">
                <span className="input-group-icon"><MdEmail /></span>
                <Form.Control
                  className="form-control-modern"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                />
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label-modern">Password</Form.Label>
              <div className="input-group-modern">
                <span className="input-group-icon"><RiLockPasswordFill /></span>
                <Form.Control
                  className="form-control-modern"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <span className="password-toggle-icon" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <AiFillEye size={20} /> : <AiFillEyeInvisible size={20} />}
                </span>
              </div>
            </Form.Group>

            <div className="text-end mb-3">
              <span
                style={{ color: '#007bff', fontWeight: 600, cursor: 'pointer' }}
                onClick={openForgotModal}
              >
                Forgot Password?
              </span>
            </div>

            {loginError && <Alert variant="danger" className="py-2">{loginError}</Alert>}

            <Button type="submit" className="w-100 btn btn-primary text-white fw-bold auth-btn-modern" disabled={isLoggingIn}>
              {isLoggingIn ? (
                <>
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                  Logging In...
                </>
              ) : (
                'Log In'
              )}
            </Button>


            <div className="text-center mt-3">
              <span className="auth-link-text">Don't have an account?</span>
              <span
                style={{ color: '#007bff', fontWeight: 600, marginLeft: '0.5rem', cursor: 'pointer' }}
                onClick={() => navigate('/signup')}
              >
                Sign Up
              </span>
            </div>
          </Form>
        </div>

        <Modal show={showForgotModal} onHide={() => setShowForgotModal(false)} centered>
          <Modal.Header closeButton><Modal.Title>Reset Password</Modal.Title></Modal.Header>
          <Modal.Body>
            {modalAlert.message && <Alert variant={modalAlert.type}>{modalAlert.message}</Alert>}
            <Form.Group>
              <Form.Label>Enter your registered email</Form.Label>
              <Form.Control
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="Email address"
                autoComplete="email"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={handlePasswordReset}>Send Reset Link</Button>
          </Modal.Footer>
        </Modal>
      </div>
    </>
  );
}