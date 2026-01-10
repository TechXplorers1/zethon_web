import React, { useState, useEffect, useRef } from 'react';
import { Container, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import emailjs from 'emailjs-com';

import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

import '../../../styles/JobSupportForm.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import CustomNavbar from '../../../components/Navbar';
import { ref, set, update } from "firebase/database";
import { database } from '../../../firebase';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
const JobSupportContactForm = () => {

  const form = useRef(); // Create a ref for the form element

  useEffect(() => {
    emailjs.init('I1UJMnujMWkyQsjA0');
  }, []);

  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    middleName: '',
    lastName: '',
    dob: '',
    gender: '',
    ethnicity: '',

    // Contact Information
    address: '',
    zipCode: '',
    mobile: '',
    email: '',

    // Employment Information
    securityClearance: '',
    clearanceLevel: '',
    willingToRelocate: '',
    workPreference: '',
    restrictedCompanies: '',

    // Job Preferences
    jobsToApply: '',
    technologySkills: '',
    currentSalary: '',
    expectedSalary: '',
    visaStatus: '',
    otherVisaStatus: '',

    // Education
    universityName: '',
    universityAddress: '',
    courseOfStudy: '',
    graduationFromDate: '',
    graduationToDate: '',

    // Current Employment
    currentCompany: '',
    currentDesignation: '',
    preferredInterviewTime: '',
    earliestJoiningDate: '',
    relievingDate: '',

    // References
    referenceName: '',
    referencePhone: '',
    referenceAddress: '',
    referenceEmail: '',
    referenceRole: '',

    // Job Portal Information
    jobPortalAccountNameandCredentials: ''
  });

  const [resumeFile, setResumeFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ success: false, message: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Specific handlers for the PhoneInput components
  const handleMobileChange = (value) => {
    setFormData(prev => ({ ...prev, mobile: value }));
  };

  const handleReferencePhoneChange = (value) => {
    setFormData(prev => ({ ...prev, referencePhone: value }));
  };

  // New handler for file input
  const handleFileChange = (e) => {
    setResumeFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    let loggedInUser = JSON.parse(sessionStorage.getItem('loggedInClient'));
    if (!loggedInUser) {
      loggedInUser = JSON.parse(localStorage.getItem('user'));
    }

    if (!loggedInUser || !loggedInUser.firebaseKey) {
      alert("Please log in to submit this application.");
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Send Email (Existing Logic)
      const response = await emailjs.send(
        'service_6zo0q3i',
        'template_plu2dxj',
        formData,
        'I1UJMnujMWkyQsjA0'
      );
      console.log('EmailJS Response:', response);

      // 2. Upload Resume if exists
      let resumeUrl = '';
      if (resumeFile) {
        const storage = getStorage();
        const fileRef = storageRef(storage, `resumes/${loggedInUser.firebaseKey}/${Date.now()}_${resumeFile.name}`);
        await uploadBytes(fileRef, resumeFile);
        resumeUrl = await getDownloadURL(fileRef);
      }

      // 3. Save to Firebase (Atomic Update: Clients + Index)
      const registrationKey = Date.now().toString();
      const clientFirebaseKey = loggedInUser.firebaseKey;

      const submissionData = {
        ...formData,
        resumeUrl,
        service: 'Job Supporting',
        serviceType: 'Job Supporting',
        status: 'New',
        assignmentStatus: 'registered', // Required for "Registered Clients" count
        appliedDate: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        registrationKey: registrationKey,
        clientFirebaseKey: clientFirebaseKey
      };

      const updates = {};
      updates[`clients/${clientFirebaseKey}/serviceRegistrations/${registrationKey}`] = submissionData;
      updates[`service_registrations_index/${clientFirebaseKey}_${registrationKey}`] = submissionData;

      await update(ref(database), updates);

      form.current.reset();
      // Reset form
      setFormData({
        firstName: '',
        middleName: '',
        lastName: '',
        dob: '',
        gender: '',
        ethnicity: '',
        address: '',
        zipCode: '',
        mobile: '',
        email: '',
        securityClearance: '',
        clearanceLevel: '',
        willingToRelocate: '',
        workPreference: '',
        restrictedCompanies: '',
        jobsToApply: '',
        technologySkills: '',
        currentSalary: '',
        expectedSalary: '',
        visaStatus: '',
        otherVisaStatus: '',
        universityName: '',
        universityAddress: '',
        courseOfStudy: '',
        graduationFromDate: '',
        graduationToDate: '',
        currentCompany: '',
        currentDesignation: '',
        preferredInterviewTime: '',
        earliestJoiningDate: '',
        relievingDate: '',
        referenceName: '',
        referencePhone: '',
        referenceAddress: '',
        referenceEmail: '',
        referenceRole: '',
        jobPortalAccountNameandCredentials: ''
      });
      setResumeFile(null);

      setSubmitStatus({ success: true, message: 'Form submitted successfully! Your application has been recorded.' });
    } catch (error) {
      console.error("Submission Error:", error);
      setSubmitStatus({ success: false, message: 'Submission failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  useEffect(() => {
    if (!window.location.hash.includes('#')) {
      window.location.href = window.location.href + '#';
      window.location.reload();
    }
  }, []);

  return (
    <div style={{ backgroundColor: 'transparent', padding: '10px' }}>
      <CustomNavbar />
      <Container className="my-1 contact-form1">
        <CustomNavbar />

        <h1 className="text-center mb-4" style={{ fontFamily: "Orbitron" }}>CONNECT WITH ZETHON</h1>
        <p className="text-center mb-4">
          <b>Fill out your contact details below and our experts will be in touch</b>
        </p>

        {submitStatus.message && (
          <Alert variant={submitStatus.success ? 'success' : 'danger'}>
            {submitStatus.message}
          </Alert>
        )}

        <Form onSubmit={handleSubmit} className="mx-auto" style={{ maxWidth: '800px' }}>
          {/* Personal Information */}
          <h4 className="mb-3 border-bottom pb-2">Personal Information</h4>
          <Row>
            <Col md={4}>
              <Form.Group className="mb-3" controlId="formFirstName">
                <Form.Label>First Name<span className="text-danger"> *</span></Form.Label>
                <Form.Control
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  type="text"
                  required
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3" controlId="formMiddleName">
                <Form.Label>Middle Name<span className="text-danger"> *</span></Form.Label>
                <Form.Control
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleChange}
                  type="text"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3" controlId="formLastName">
                <Form.Label>Last Name<span className="text-danger"> *</span></Form.Label>
                <Form.Control
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  type="text"
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3" controlId="formDob">
                <Form.Label>Date of Birth<span className="text-danger"> *</span></Form.Label>
                <Form.Control
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  type="date"
                  required
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3" controlId="formGender">
                <Form.Label>Gender<span className="text-danger"> *</span></Form.Label>
                <Form.Select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                  className="custom-select-cyan"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3" controlId="formEthnicity">
                <Form.Label>Ethnicity<span className="text-danger"> *</span></Form.Label>
                <Form.Control
                  name="ethnicity"
                  value={formData.ethnicity}
                  onChange={handleChange}
                  type="text"
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Contact Information */}
          <h4 className="mb-3 mt-4 border-bottom pb-2">Contact Information</h4>
          <Form.Group className="mb-3" controlId="formAddress">
            <Form.Label>Full Address<span className="text-danger"> *</span></Form.Label>
            <Form.Control
              name="address"
              value={formData.address}
              onChange={handleChange}
              as="textarea"
              rows={2}
              required
            />
          </Form.Group>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3" controlId="formZipCode">
                <Form.Label>Zip Code<span className="text-danger"> *</span></Form.Label>
                <Form.Control
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  type="text"
                  required
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3" controlId="formMobile">
                <Form.Label>Mobile Number<span className="text-danger"> *</span></Form.Label>
                <PhoneInput
                  international
                  defaultCountry="IN"
                  value={formData.mobile}
                  onChange={handleMobileChange}
                  className="form-control"
                  name="mobile"
                />
                {/* Hidden input to pass the value through the form ref */}
                <input type="hidden" name="mobile" value={formData.mobile || ''} />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3" controlId="formEmail">
                <Form.Label>Email<span className="text-danger"> *</span></Form.Label>
                <Form.Control
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  type="email"
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Employment Information */}
          <h4 className="mb-3 mt-4 border-bottom pb-2">Employment Information</h4>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="formSecurityClearance">
                <Form.Label>Security Clearance<span className="text-danger"> *</span></Form.Label>
                <Form.Select
                  name="securityClearance"
                  value={formData.securityClearance}
                  onChange={handleChange}
                  className="custom-select-cyan"
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="not-applicable">Not Applicable</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="formClearanceLevel">
                <Form.Label>Clearance Level<span className="text-danger"> *</span></Form.Label>
                <Form.Control
                  name="clearanceLevel"
                  value={formData.clearanceLevel}
                  onChange={handleChange}
                  type="text"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="formRelocation">
                <Form.Label>Willing to Relocate?<span className="text-danger"> *</span></Form.Label>
                <Form.Select
                  name="willingToRelocate"
                  value={formData.willingToRelocate}
                  onChange={handleChange}
                  required
                  className="custom-select-cyan"
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="formWorkPreference">
                <Form.Label>Work Preference<span className="text-danger"> *</span></Form.Label>
                <Form.Select
                  name="workPreference"
                  value={formData.workPreference}
                  onChange={handleChange}
                  required
                  className="custom-select-cyan"
                >
                  <option value="">Select</option>
                  <option value="remote">Remote</option>
                  <option value="onsite">Onsite</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="remote-hybrid">Remote + Hybrid</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3" controlId="formRestrictedCompanies">
            <Form.Label>Companies you don't want to apply to<span className="text-danger"> *</span></Form.Label>
            <Form.Control
              name="restrictedCompanies"
              value={formData.restrictedCompanies}
              onChange={handleChange}
              as="textarea"
              rows={2}
            />
          </Form.Group>

          {/* Job Preferences */}
          <h4 className="mb-3 mt-4 border-bottom pb-2">Job Preferences</h4>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="formJobsToApply">
                <Form.Label>Jobs to apply for<span className="text-danger"> *</span></Form.Label>
                <Form.Control
                  name="jobsToApply"
                  value={formData.jobsToApply}
                  onChange={handleChange}
                  as="textarea"
                  rows={2}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="formTechnology">
                <Form.Label>Technology/Skills<span className="text-danger"> *</span></Form.Label>
                <Form.Control
                  name="technologySkills"
                  value={formData.technologySkills}
                  onChange={handleChange}
                  as="textarea"
                  rows={2}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="formCurrentSalary">
                <Form.Label>Current Salary<span className="text-danger"> *</span></Form.Label>
                <Form.Control
                  name="currentSalary"
                  value={formData.currentSalary}
                  onChange={handleChange}
                  type="text"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="formExpectedSalary">
                <Form.Label>Expected Salary<span className="text-danger"> *</span></Form.Label>
                <Form.Control
                  name="expectedSalary"
                  value={formData.expectedSalary}
                  onChange={handleChange}
                  type="text"
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3" controlId="formVisaStatus">
            <Form.Label>Visa Status<span className="text-danger"> *</span></Form.Label>
            <Form.Select
              name="visaStatus"
              value={formData.visaStatus}
              onChange={handleChange}
              required
              className="custom-select-cyan"
            >
              <option value="">Select visa status</option>
              <option value="citizen">Citizen</option>
              <option value="green-card">Green Card</option>
              <option value="h1b">H1B</option>
              <option value="opt">OPT</option>
              <option value="other">Other</option>
            </Form.Select>
            {formData.visaStatus === 'other' && (
              <Form.Control
                name="otherVisaStatus"
                type="text"
                value={formData.otherVisaStatus}
                onChange={handleChange}
                className="mt-2"
                required
              />
            )}
          </Form.Group>

          {/* Education */}
          <h4 className="mb-3 mt-4 border-bottom pb-2">Education</h4>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="formUniversityName">
                <Form.Label>University Name<span className="text-danger"> *</span></Form.Label>
                <Form.Control
                  name="universityName"
                  value={formData.universityName}
                  onChange={handleChange}
                  type="text"
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="formUniversityAddress">
                <Form.Label>University Address<span className="text-danger"> *</span></Form.Label>
                <Form.Control
                  name="universityAddress"
                  value={formData.universityAddress}
                  onChange={handleChange}
                  type="text"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3" controlId="formCourseOfStudy">
                <Form.Label>Course of Study<span className="text-danger"> *</span></Form.Label>
                <Form.Control
                  name="courseOfStudy"
                  value={formData.courseOfStudy}
                  onChange={handleChange}
                  type="text"
                  required
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3" controlId="formGraduationDate">
                <Form.Label>Graduation From Date<span className="text-danger"> *</span></Form.Label>
                <Form.Control
                  name="graduationFromDate"
                  value={formData.graduationFromDate}
                  onChange={handleChange}
                  type="date"
                  required
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3" controlId="formGraduationDate">
                <Form.Label>Graduation To Date<span className="text-danger"> *</span></Form.Label>
                <Form.Control
                  name="graduationToDate"
                  value={formData.graduationToDate}
                  onChange={handleChange}
                  type="date"
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Current Employment */}
          <h4 className="mb-3 mt-4 border-bottom pb-2">Current Employment</h4>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="formCurrentCompany">
                <Form.Label>Current Company<span className="text-danger"> *</span></Form.Label>
                <Form.Control
                  name="currentCompany"
                  value={formData.currentCompany}
                  onChange={handleChange}
                  type="text"
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="formCurrentDesignation">
                <Form.Label>Current Designation<span className="text-danger"> *</span></Form.Label>
                <Form.Control
                  name="currentDesignation"
                  value={formData.currentDesignation}
                  onChange={handleChange}
                  type="text"
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="formInterviewTime">
                <Form.Label>Preferred Interview Time<span className="text-danger"> *</span></Form.Label>
                <Form.Control
                  name="preferredInterviewTime"
                  value={formData.preferredInterviewTime}
                  onChange={handleChange}
                  type="text"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="formJoiningDate">
                <Form.Label>Earliest Joining Date<span className="text-danger"> *</span></Form.Label>
                <Form.Control
                  name="earliestJoiningDate"
                  value={formData.earliestJoiningDate}
                  onChange={handleChange}
                  type="date"
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3" controlId="formRelievingDate">
            <Form.Label>Relieving Date from Current Company<span className="text-danger"> *</span></Form.Label>
            <Form.Control
              name="relievingDate"
              value={formData.relievingDate}
              onChange={handleChange}
              type="date"
            />
          </Form.Group>

          {/* References */}
          <h4 className="mb-3 mt-4 border-bottom pb-2">References</h4>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="formReferenceName">
                <Form.Label>Reference Name</Form.Label>
                <Form.Control
                  name="referenceName"
                  value={formData.referenceName}
                  onChange={handleChange}
                  type="text"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="formReferencePhone">
                <Form.Label>Reference Phone</Form.Label>
                <PhoneInput
                  international
                  defaultCountry="IN"
                  value={formData.referencePhone}
                  onChange={handleReferencePhoneChange}
                  className="form-control"
                />
                {/* Hidden input to pass the value through the form ref */}
                <input type="hidden" name="referencePhone" value={formData.referencePhone || ''} />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3" controlId="formReferenceAddress">
            <Form.Label>Reference Address</Form.Label>
            <Form.Control
              name="referenceAddress"
              value={formData.referenceAddress}
              onChange={handleChange}
              type="text"
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formReferenceEmail">
            <Form.Label>Reference Email</Form.Label>
            <Form.Control
              name="referenceEmail"
              value={formData.referenceEmail}
              onChange={handleChange}
              type="email"
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formReferenceRole">
            <Form.Label>Reference Role</Form.Label>
            <Form.Control
              name="referenceRole"
              value={formData.referenceRole}
              onChange={handleChange}
              type="text"
            />
          </Form.Group>

          {/* Job Portal Information */}
          <h4 className="mb-3 mt-4 border-bottom pb-2">Job Portal Information</h4>
          <Form.Group className="mb-3" controlId="formJobPortalCredentials">
            <Form.Label>Job Portal Account Name & Credentials</Form.Label>
            <Form.Control
              name="jobPortalAccountNameandCredentials"
              value={formData.jobPortalAccountNameandCredentials}
              onChange={handleChange}
              as="textarea"
              rows={2}
            />
          </Form.Group>

          <div className="d-grid mt-4">
            <Button
              type="submit"
              size="lg"
              style={{ backgroundColor: '#00ffff', borderColor: '#00ffff', color: '#000' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Submit'}
            </Button>
          </div>
        </Form>
      </Container>
    </div>
  );
};

export default JobSupportContactForm;