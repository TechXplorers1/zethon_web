import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ClientManagement from './ClientManagement';
import DepartmentManagement from './DepartmentManagement';
import EmployeeManagement from './EmployeeManagement';
import AssetManagement from './AssetManagement';
import RequestManagement from './RequestManagement';
import ProjectManagement from './ProjectManagement';
import AdsManagement from './AdsManagement';
import { database } from '../../../firebase'; // Import your Firebase config
import { ref, update, get } from "firebase/database"; // Import update function
import logo from '../../../assets/zethon_logo.png';


const AdminPage = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('clientManagement');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  // Centralized state for the logged-in user's profile
  const [userProfile, setUserProfile] = useState({
    name: 'Admin',
    employeeId: 'ADMIN001',
    email: 'admin@techxplorers.com',
    mobile: '+91 99999 88888',
    lastLogin: new Date().toLocaleString(),
    // Add default values for all profile fields
    firstName: 'Admin',
    lastName: 'User',
    dateOfBirth: '',
    gender: '',
    personalEmail: '',
    personalNumber: '',
    address: ''
  });

  // States for the profile modal
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [editableProfile, setEditableProfile] = useState({});
  const [isEditingUserProfile, setIsEditingUserProfile] = useState(false);

  // useEffect to get logged-in user data from sessionStorage
  useEffect(() => {
    const loggedInUserData = sessionStorage.getItem('loggedInEmployee');
    if (loggedInUserData) {
      const userData = JSON.parse(loggedInUserData);
      // Ensure all profile fields have values
      // Set the full user object to state
      const completeUserData = {
        ...userProfile, // Use defaults as fallback
        ...userData,    // Override with actual user data
        // Make sure name is properly split if needed
        firstName: userData.firstName || (userData.name ? userData.name.split(' ')[0] : 'Admin'),
        lastName: userData.lastName || (userData.name && userData.name.split(' ').length > 1
          ? userData.name.split(' ').slice(1).join(' ') : 'User')
      };
      setUserProfile(completeUserData);
    }
  }, []);

  const getInitials = (name) => {
    if (!name) return '';
    const nameParts = (name || '').split(' ').filter(part => part.length > 0);
    if (nameParts.length >= 2) return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
    return nameParts[0]?.charAt(0).toUpperCase() || '';
  };

  // In AdminPage.jsx, ADD this new useEffect hook

  // This effect handles the setup when the profile modal is opened.
  useEffect(() => {
    if (isUserProfileModalOpen) {
      // 1. Close the profile dropdown automatically
      setIsProfileDropdownOpen(false);

      // 2. Initialize the editable profile with the current user's data
      setEditableProfile({ ...userProfile });

      // 3. Ensure the modal starts in view-only mode
      setIsEditingUserProfile(false);
    }
  }, [isUserProfileModalOpen, userProfile]);

  const closeUserProfileModal = () => {
    setIsUserProfileModalOpen(false);
    setIsEditingUserProfile(false); // Reset edit mode
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setEditableProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      // Update the name field by combining first and last names
      const updatedProfile = {
        ...editableProfile,
        name: `${editableProfile.firstName} ${editableProfile.lastName}`.trim()
      };

      // If we have a firebaseKey, update in Firebase
      if (userProfile.firebaseKey) {
        const userRef = ref(database, `users/${userProfile.firebaseKey}`);
        await update(userRef, updatedProfile);
      }

      // Update local state and session storage to reflect changes immediately
      setUserProfile(updatedProfile);
      sessionStorage.setItem('loggedInEmployee', JSON.stringify(updatedProfile));

      setIsEditingUserProfile(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    }
  };

  // Effect to close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const adminViewOptions = [
    { value: 'clientManagement', label: 'Client Management' },
    { value: 'departments', label: 'Departments' },
    { value: 'employeeManagement', label: 'Employee Management' },
    { value: 'assetManagement', label: 'Asset Management' },
    { value: 'requestManagement', label: 'Request Management' },
    { value: 'projectManagement', label: 'Project Management' },
    { value: 'adsManagement', label: 'Ads Management' },

  ];
  // --- OPTIMIZATION MIGRATION TOOL ---
  const runDataOptimizationMigration = async () => {
    if (!window.confirm("⚠️ This will create a 'Master Index' of all client registrations to reduce data usage. \n\nThis process reads all data once and writes an optimized list. \n\nContinue?")) return;

    try {
      // 1. Fetch ALL clients one last time (this is the heavy operation we are fixing)
      const allClientsSnap = await get(ref(database, 'clients'));
      if (!allClientsSnap.exists()) return alert("No clients found to migrate.");

      const allClients = allClientsSnap.val();
      const indexUpdates = {};
      let count = 0;

      // 2. Flatten the data
      Object.keys(allClients).forEach(clientKey => {
        const client = allClients[clientKey];
        if (client.serviceRegistrations) {
          Object.keys(client.serviceRegistrations).forEach(regKey => {
            const reg = client.serviceRegistrations[regKey];
            const indexKey = `${clientKey}_${regKey}`; // Unique ID for the index

            // Create a lightweight object for the list
            // We include ALL fields used for Filtering and Display in the main table
            indexUpdates[`service_registrations_index/${indexKey}`] = {
              clientFirebaseKey: clientKey,
              registrationKey: regKey,

              // Basic Info
              firstName: reg.firstName || client.firstName || '',
              middleName: reg.middleName || client.middleName || '',
              lastName: reg.lastName || client.lastName || '',
              dob: reg.dob || reg.dateOfBirth || client.dob || client.dateOfBirth || '',
              gender: reg.gender || client.gender || '',
              ethnicity: reg.ethnicity || client.ethnicity || '',
              mobile: reg.mobile || client.mobile || '',
              email: reg.email || client.email || '',

              // Address
              address: reg.address || client.address || '',
              city: reg.city || client.city || '',
              state: reg.state || client.state || '',
              county: reg.county || client.county || '',
              zipCode: reg.zipCode || reg.zipcode || client.zipCode || client.zipcode || '',
              country: reg.country || client.country || '',
              countryCode: reg.countryCode || client.countryCode || '+1',

              // Professional Info
              service: reg.service || 'Unknown',
              assignmentStatus: reg.assignmentStatus || 'registered',
              currentCompany: reg.currentCompany || '',
              currentDesignation: reg.currentDesignation || '',
              yearsOfExperience: reg.yearsOfExperience || '',
              currentSalary: reg.currentSalary || '',
              expectedSalary: reg.expectedSalary || '',
              noticePeriod: reg.noticePeriod || '',

              // Job Preferences & Visa
              jobsToApply: reg.jobsToApply || '',
              workPreference: reg.workPreference || '',
              willingToRelocate: reg.willingToRelocate || '',
              restrictedCompanies: reg.restrictedCompanies || '',
              preferredInterviewTime: reg.preferredInterviewTime || '',
              earliestJoiningDate: reg.earliestJoiningDate || '',
              relievingDate: reg.relievingDate || '',

              // Clearance
              securityClearance: reg.securityClearance || '',
              clearanceLevel: reg.clearanceLevel || '',

              // Visa
              visaStatus: reg.visaStatus || '',
              otherVisaStatus: reg.otherVisaStatus || '',

              // Education (Array)
              educationDetails: reg.educationDetails || [],

              // References
              referenceName: reg.referenceName || '',
              referencePhone: reg.referencePhone || '',
              referenceAddress: reg.referenceAddress || '',
              referenceEmail: reg.referenceEmail || '',
              referenceRole: reg.referenceRole || '',

              // Account
              jobPortalAccountNameandCredentials: reg.jobPortalAccountNameandCredentials || '',

              // Files (URLs/Metadata only)
              resume: reg.resume || reg.resumes || [],
              coverLetter: reg.coverLetter || reg.coverLetterUrl || '',

              // Dates - Ensure we capture the date meaningfully and format it
              appliedDate: (reg.appliedDate || reg.dateOfJoin || reg.registeredDate || client.registeredDate || client.dateOfJoin || new Date().toISOString()).split('T')[0],
              registeredDate: (reg.registeredDate || reg.dateOfJoin || client.registeredDate || client.dateOfJoin || new Date().toISOString()).split('T')[0],

              // Manager Info
              manager: reg.manager || null,
              assignedManager: reg.assignedManager || null,
            };
            count++;
          });
        }
      });

      // 2B. NEW: Create Master Employee Index (to avoid fetching all users)
      const allUsersSnap = await get(ref(database, 'users'));
      let employeeCount = 0;
      if (allUsersSnap.exists()) {
        const allUsers = allUsersSnap.val();
        Object.keys(allUsers).forEach(userKey => {
          const user = allUsers[userKey];
          // Check if user has an internal role
          const roles = Array.isArray(user.roles) ? user.roles.map(r => r.toLowerCase()) : [(user.role || '').toLowerCase()];
          const internalRoles = ['admin', 'manager', 'employee', 'team lead', 'hr', 'support', 'sales', 'development'];
          const isInternal = roles.some(r => internalRoles.includes(r));

          if (isInternal) {
            indexUpdates[`employees_index/${userKey}`] = {
              firebaseKey: userKey,
              firstName: user.firstName || '',
              lastName: user.lastName || '',
              email: user.email || user.workEmail || '',
              mobile: user.mobile || user.personalNumber || '',
              roles: user.roles || [user.role || 'employee'],
              department: user.department || '',
              accountStatus: user.accountStatus || 'Active'
            };
            employeeCount++;
          }
        });
      }

      // 3. Write the index to Firebase
      if (count > 0 || employeeCount > 0) {
        await update(ref(database), indexUpdates);
        alert(`✅ Optimization Successful!\n\nCreated index for ${count} registrations.\nCreated index for ${employeeCount} employees.\n\nThe 'Admin Worksheet' will now be much faster after you refresh.`);
      } else {
        alert("No registrations or employees found to index.");
      }

    } catch (e) {
      console.error("Migration Error:", e);
      alert("Migration Failed: " + e.message);
    }
  };

  return (
    <div className="ad-body-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        :root {
            --bg-body: #f3f4f6; --bg-card: #ffffff; --text-primary: #1f2937;
            --text-secondary: #6b7280; --border-color: #e5e7eb;
            --shadow-color-1: rgba(0, 0, 0, 0.05); --bg-header: #ffffff;
            --logo-x-color: #2563eb; --admin-tag-bg: #fee2e2;
            --admin-tag-text: #991b1b; --admin-avatar-bg: #1f2937;
            --admin-avatar-text: #ffffff; --radio-group-bg: #ffffff;
            --radio-group-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            --radio-item-color: #4b5563; --radio-item-bg-checked: #eff6ff;
            --radio-item-text-checked: #1f2937; --radio-item-hover-bg: #f9fafb;
            --bg-nav-link-hover: #f9fafb;
        }




        .ad-dashboard-header {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0; /* Adjusted for radio buttons */
  padding: 0 1.5rem;
}

@media (min-width: 768px) {
  .ad-dashboard-header {
    flex-direction: row;
    align-items: center; /* This centers items vertically in a row, but we want text-align left for content */
  }
}

.ad-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--text-primary);
  text-align: left; /* Ensure title text starts from left */
}

.ad-subtitle {
  color: var(--text-secondary);
  margin-top: 0.25rem;
  margin-bottom: 0.95rem;
  text-align: left; /* Ensure subtitle text starts from left */
}


        .ad-body-container { font-family: 'Inter', sans-serif; background-color: var(--bg-body); min-height: 100vh; color: var(--text-primary); }
        .ad-header { background-color: var(--bg-header); box-shadow: 0 1px 2px 0 var(--shadow-color-1); padding: 1rem 1.5rem; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 50; }
        .ad-logo { display: flex; align-items: center; color: var(--text-primary); font-size: 1.5rem; font-weight: 700; }
        .ad-logo-x { color: var(--logo-x-color); }
        .ad-header-right { display: flex; align-items: center; gap: 1rem; }
        .ad-header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}
        .ad-employee-info { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
        .ad-employee-info-text { display: none;flex-direction: column;
  align-items: flex-end;
  gap: 0.125rem;de }
        @media (min-width: 768px) { .ad-employee-info-text { display: flex; } }
        .ad-employee-name { font-size: 0.875rem; font-weight: 600;margin: 0;
  padding: 0;
  line-height: 1.2; }
        .ad-admin-tag { background-color: var(--admin-tag-bg); color: var(--admin-tag-text); padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
        .ad-initials-avatar { width: 2.5rem; height: 2.5rem; border-radius: 9999px; background-color: var(--admin-avatar-bg); color: var(--admin-avatar-text); display: flex; align-items: center; justify-content: center; font-weight: 600; }
        .ad-main-content {flex: 1; padding: 1.5rem; }
        @media (min-width: 768px) {
  .ad-main-content {
    padding: 2rem;
  }
}
/* Custom Radio Button Tabs Styles (Matching Screenshot) */
.custom-radio-group-container {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  border-radius: 9999px; /* Fully rounded pill shape */
  background-color: var(--radio-group-bg);
  box-sizing: border-box;
  box-shadow: var(--radio-group-shadow); /* Soft shadow */
  padding: 0.5rem; /* Padding inside the container */
  font-size: 1rem; /* Base font size */
  font-family: 'Inter', sans-serif;
  color: var(--radio-item-color); /* Default text color for inactive items */
  min-width: 250px; /* Ensure it doesn't get too small */
  margin-bottom: 1.5rem; /* Space below the tabs, consistent with old style */
  margin-left: 1.5rem; /* Align with padding of dashboard header */
  margin-right: 1.5rem; /* Align with padding of dashboard header */
}

.custom-radio-group-container .custom-radio-item {
  flex: 1 1 auto; /* Distribute items evenly */
  text-align: center;
  position: relative; /* For z-index if needed */
}

.custom-radio-group-container .custom-radio-item input[type="radio"] {
  display: none; /* Hide the actual radio button */
}

.custom-radio-group-container .custom-radio-item .custom-radio-label {
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  border-radius: 9999px; /* Fully rounded for the active pill */
  border: none;
  padding: 0.75rem 1.5rem; /* Padding inside the tab button */
  transition: all 0.2s ease-in-out;
  white-space: nowrap; /* Prevent text wrapping */
  font-weight: 500; /* Medium font weight */
  line-height: 1; /* Ensure consistent height */
}

.custom-radio-group-container .custom-radio-item input[type="radio"]:checked + .custom-radio-label {
  background-color: var(--radio-item-bg-checked); /* Light blue background for active tab */
  color: var(--radio-item-text-checked); /* Blue text for active tab */
  font-weight: 600; /* Bolder text for active tab */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); /* Subtle shadow for active tab */
}

.custom-radio-group-container .custom-radio-item .custom-radio-label:hover:not(.custom-radio-group-container .custom-radio-item input[type="radio"]:checked + .custom-radio-label) {
  background-color: var(--radio-item-hover-bg); /* Subtle hover background for inactive tabs */
}        .custom-radio-item { flex: 1 1 auto; text-align: center; }
        .custom-radio-item input[type="radio"] { display: none; }
        .custom-radio-label { display: flex; cursor: pointer; align-items: center; justify-content: center; border-radius: 9999px; padding: 0.75rem 1.5rem; transition: all 0.2s ease-in-out; font-weight: 500; color: var(--radio-item-color); }
        .custom-radio-item input[type="radio"]:checked + .custom-radio-label { background-color: var(--radio-item-bg-checked); color: var(--radio-item-text-checked); font-weight: 600; }
        
        .profile-dropdown-container { position: relative; cursor: pointer;
  z-index: 60; }
        .profile-dropdown-menu { position: absolute; top: calc(100% + 0.5rem); right: 0; background-color: var(--bg-header); border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid var(--border-color); min-width: 12rem; padding: 0.5rem 0; list-style: none; margin: 0; z-index: 60; }
        .profile-dropdown-item { padding: 0.75rem 1rem; color: var(--text-primary); font-size: 0.9rem; font-weight: 500; display: flex; align-items: center; gap: 0.75rem; transition: background-color 0.15s ease; }
        .profile-dropdown-item:hover { background-color: var(--bg-nav-link-hover); }
        .profile-dropdown-item.logout { color: #ef4444; }
        .profile-dropdown-item.logout:hover { background-color: #fee2e2; }

        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background-color: var(--bg-card); border-radius: 0.75rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); width: 90%; max-width: 500px; padding: 1.5rem; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .modal-title { font-size: 1.25rem; font-weight: 600; }
        .modal-close-button { background: none; border: none; font-size: 1.5rem; cursor: pointer; }
        .profile-details-grid { display: flex; flex-direction: column; gap: 1rem; }
        .profile-detail-item { display: flex; flex-direction: column; gap: 0.25rem; }
        .profile-detail-label { font-size: 0.875rem; color: var(--text-secondary); }
        .profile-detail-item input { width: 100%; padding: 0.5rem; border-radius: 0.375rem; border: 1px solid var(--border-color); }
        .profile-detail-item input:read-only { background-color: #f9fafb; cursor: not-allowed; }
        .profile-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem; }
        .edit-button, .close-button { padding: 0.5rem 1rem; border-radius: 0.375rem; border: 1px solid transparent; font-weight: 500; cursor: pointer; }
        .edit-button { background-color: #3b82f6; color: white; }
        .close-button { background-color: #e5e7eb; color: #374151; }
   
             /* Responsive adjustments */
         @media (max-width: 768px) {
        .ad-dashboard-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 0.5rem;
            }
      }
      `}
      </style>
      <header className="ad-header">
        <div className="ad-header-left">
          <div className="ad-logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            <img src={logo} alt="Zethon Tech Logo" height="50" />
            <span style={{ color: 'black', marginLeft: '10px', fontWeight: '', fontSize: '1.5rem' }}>
              Zethon Tech
            </span>
          </div>
        </div>
        <div className="ad-header-right">
          <div className="profile-dropdown-container" ref={profileDropdownRef}>
            <div className="ad-employee-info" onClick={() => setIsProfileDropdownOpen(prev => !prev)}>
              <div className="ad-employee-info-text">
                <p className="ad-employee-name">{userProfile.name}</p>
                <span className="ad-admin-tag">Admin</span>
              </div>
              <div className="ad-initials-avatar">{getInitials(userProfile.name)}</div>
            </div>
            {isProfileDropdownOpen && (
              <ul className="profile-dropdown-menu">
                <li className="profile-dropdown-item" onClick={() => setIsUserProfileModalOpen(true)}>
                  Profile
                </li>
                {/* <li className="profile-dropdown-item logout" onClick={() => navigate('/')}>
                  Log out
                </li> */}
              </ul>
            )}
          </div>
        </div>
      </header>
      <main className="ad-main-content">
        <div className="ad-content-wrapper">
          <div className="ad-dashboard-header">
            <div>

              <h2 className="ad-title">Admin Worksheet</h2>
              <p className="ad-subtitle">System administration and Employee management</p>
              <button
                onClick={runDataOptimizationMigration}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(to right, #2563eb, #3b82f6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  marginBottom: '20px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                }}
              >
                ⚡ Optimize Database (Run Once)
              </button>
            </div>
          </div>
          <div className="custom-radio-group-container">
            {adminViewOptions.map((option) => (
              <label className="custom-radio-item" key={option.value}>
                <input type="radio" name="adminView" value={option.value} checked={currentView === option.value} onChange={() => setCurrentView(option.value)} />
                <span className="custom-radio-label">{option.label}</span>
              </label>
            ))}
          </div>
          <div className="ad-content-wrapper">
            {currentView === 'clientManagement' && <ClientManagement />}
            {currentView === 'departments' && <DepartmentManagement />}
            {currentView === 'employeeManagement' && <EmployeeManagement />}
            {currentView === 'assetManagement' && <AssetManagement />}
            {currentView === 'requestManagement' && <RequestManagement />}
            {currentView === 'projectManagement' && <ProjectManagement />}
            {currentView === 'adsManagement' && <AdsManagement />}
          </div>
        </div>
      </main>

      {/* User Profile Modal */}
      {isUserProfileModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title">Admin Profile</h3>
              <button className="modal-close-button" onClick={closeUserProfileModal}>&times;</button>
            </div>
            <div className="profile-details-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Personal Info Section */}
              <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '10px' }}>
                <h5 style={{ fontWeight: 600, color: '#2563eb' }}>Personal Information</h5>
              </div>
              <div className="profile-detail-item">
                <label className="profile-detail-label" htmlFor="firstName">First Name:</label>
                <input type="text" id="firstName" name="firstName" value={editableProfile.firstName || ''} onChange={handleProfileChange} readOnly={!isEditingUserProfile} />
              </div>
              <div className="profile-detail-item">
                <label className="profile-detail-label" htmlFor="lastName">Last Name:</label>
                <input type="text" id="lastName" name="lastName" value={editableProfile.lastName || ''} onChange={handleProfileChange} readOnly={!isEditingUserProfile} />
              </div>
              <div className="profile-detail-item">
                <label className="profile-detail-label" htmlFor="dateOfBirth">Date of Birth:</label>
                <input type="date" id="dateOfBirth" name="dateOfBirth" value={editableProfile.dateOfBirth || ''} onChange={handleProfileChange} readOnly={!isEditingUserProfile} />
              </div>
              <div className="profile-detail-item">
                <label className="profile-detail-label" htmlFor="gender">Gender:</label>
                <input type="text" id="gender" name="gender" value={editableProfile.gender || ''} onChange={handleProfileChange} readOnly={!isEditingUserProfile} />
              </div>

              {/* Contact Info Section */}
              <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', margin: '15px 0' }}>
                <h5 style={{ fontWeight: 600, color: '#2563eb' }}>Contact & Address</h5>
              </div>
              <div className="profile-detail-item">
                <label className="profile-detail-label" htmlFor="personalEmail">Personal Email:</label>
                <input type="email" id="personalEmail" name="personalEmail" value={editableProfile.personalEmail || ''} onChange={handleProfileChange} readOnly={!isEditingUserProfile} />
              </div>
              <div className="profile-detail-item">
                <label className="profile-detail-label" htmlFor="personalNumber">Personal Number:</label>
                <input type="tel" id="personalNumber" name="personalNumber" value={editableProfile.personalNumber || ''} onChange={handleProfileChange} readOnly={!isEditingUserProfile} />
              </div>
              <div className="profile-detail-item" style={{ gridColumn: '1 / -1' }}>
                <label className="profile-detail-label" htmlFor="address">Address:</label>
                <input type="text" id="address" name="address" value={editableProfile.address || ''} onChange={handleProfileChange} readOnly={!isEditingUserProfile} />
              </div>
              {/* Work Info Section (Read-only) */}
              <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', margin: '15px 0' }}>
                <h5 style={{ fontWeight: 600, color: '#2563eb' }}>Work Information</h5>
              </div>
              <div className="profile-detail-item">
                <label className="profile-detail-label">Employee ID:</label>
                <input type="text" value={userProfile.employeeId || ''} readOnly />
              </div>
              <div className="profile-detail-item">
                <label className="profile-detail-label">Work Email:</label>
                <input type="text" value={userProfile.email || ''} readOnly />
              </div>
              <div className="profile-detail-item">
                <label className="profile-detail-label">Work Number:</label>
                <input type="text" value={userProfile.mobile || ''} readOnly />
              </div>
              <div className="profile-detail-item">
                <label className="profile-detail-label">Last Login:</label>
                <input type="text" value={userProfile.lastLogin || ''} readOnly />
              </div>
            </div>
            <div className="profile-actions">
              {isEditingUserProfile ? (
                <>
                  <button className="edit-button" onClick={handleSaveProfile}>
                    Save Changes
                  </button>
                  <button className="close-button" onClick={() => setIsEditingUserProfile(false)}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button className="edit-button" onClick={() => setIsEditingUserProfile(true)}>
                    Edit Profile
                  </button>
                  <button className="close-button" onClick={closeUserProfileModal}>
                    Close
                  </button>
                </>
              )}
              <button className="close-button" onClick={closeUserProfileModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;