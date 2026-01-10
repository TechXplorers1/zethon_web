import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getDatabase, ref, update, remove, set, get } from "firebase/database";
import { database } from '../../../firebase';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';



// --- IndexedDB Helpers ---
const DB_NAME = 'ClientManagementDB';
const DB_VERSION = 1;
const STORE_NAME = 'clients_cache';

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
};

const dbGet = async (key) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const dbSet = async (key, value) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const ClientManagement = () => {
  const navigate = useNavigate();

  // --- Client Management States ---
  const [managerList, setManagerList] = useState([]);
  const [clientFilter, setClientFilter] = useState('registered');
  const [editingClientId, setEditingClientId] = useState(null);
  const [tempSelectedManager, setTempSelectedManager] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [isDeleteClientConfirmModalOpen, setIsDeleteClientConfirmModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [isUnacceptClientConfirmModalOpen, setIsUnacceptClientConfirmModalOpen] = useState(false);
  const [clientToUnaccept, setClientToUnaccept] = useState(null);
  const [isClientDetailsModalOpen, setIsClientDetailsModalOpen] = useState(false);
  const [selectedClientForDetails, setSelectedClientForDetails] = useState(null);
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [currentClientToEdit, setCurrentClientToEdit] = useState(null);
  const [newCoverLetterFile, setNewCoverLetterFile] = useState(null); // Add this for cover letters
  const [selectedServiceFilter, setSelectedServiceFilter] = useState('All');
  const simplifiedServices = ['Mobile Development', 'Web Development', 'Digital Marketing', 'IT Talent Supply', 'Cyber Security'];
  const [newResumeFiles, setNewResumeFiles] = useState({});
  const [serviceRegistrations, setServiceRegistrations] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedClientForPayment, setSelectedClientForPayment] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState({
    amount: '',
    description: '',
    transactionDate: '',
  });
  const [generatedPaymentLink, setGeneratedPaymentLink] = useState('');
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [registrationForManager, setRegistrationForManager] = useState(null);
  const [managerSearchTerm, setManagerSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coverLetterFile, setCoverLetterFile] = useState(null);
  const [isConfirmManagerModalOpen, setIsConfirmManagerModalOpen] = useState(false);
  const [managerToConfirm, setManagerToConfirm] = useState(null);
  // --- Client Details Tabs and Data ---
  const [activeClientDetailsTab, setActiveClientDetailsTab] = useState('Profile');
  const [clientApplications, setClientApplications] = useState([]);
  const [clientInterviews, setClientInterviews] = useState([]);
  const [clientDateRange, setClientDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const [todayClientAppCounts, setTodayClientAppCounts] = useState({});
  // --- Application Modals & Editing ---
  const [isAppViewModalOpen, setIsAppViewModalOpen] = useState(false);
  const [isAppEditModalOpen, setIsAppEditModalOpen] = useState(false);
  const [isAppDeleteConfirmOpen, setIsAppDeleteConfirmOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  // Page size for applications / registrations
  const PAGE_SIZE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  const [clientAppsPage, setClientAppsPage] = useState(1);
  const CLIENT_APPS_PAGE_SIZE = 5;


  // Simple in-browser cache key so we don't re-download on every visit
  const CLIENT_MGMT_CACHE_KEY = 'clientManagement_cache_v1';


  const derivedCounts = useMemo(() => {
    const counts = {
      registered: 0,
      unassigned: 0,
      active: 0,
      rejected: 0,
      restored: 0,
    };

    serviceRegistrations.forEach((reg) => {
      const status = reg.assignmentStatus;

      if (status === 'registered' || !status) {
        counts.registered++;
      } else if (status === 'pending_manager') {
        counts.unassigned++;
      } else if (['pending_employee', 'pending_acceptance', 'active'].includes(status)) {
        // NOTE: we are intentionally NOT counting 'inactive' as active here,
        // to match what the "Active Clients" tab actually displays.
        counts.active++;
      } else if (status === 'rejected') {
        counts.rejected++;
      } else if (status === 'restored') {
        counts.restored++;
      }
    });

    return counts;
  }, [serviceRegistrations]);



  // 1) Load clients + users ONCE (no streaming)
  // 1) Load clients + users ONCE (no streaming) with session cache
  useEffect(() => {
    let cancelled = false;

    const loadClientsAndUsers = async () => {
      try {
        setLoading(true);

        // --- 1. Try to read from IndexedDB cache first ---
        let cached = null;
        try {
          cached = await dbGet(CLIENT_MGMT_CACHE_KEY);
          // Check if cache is valid and fresh (e.g., < 2 minutes old)
          const CACHE_VALIDITY_MS = 2 * 60 * 1000; // 2 minutes
          if (!cancelled && cached && Array.isArray(cached.serviceRegistrations)) {
            const isFresh = (Date.now() - (cached.cachedAt || 0)) < CACHE_VALIDITY_MS;
            if (isFresh) {
              setServiceRegistrations(cached.serviceRegistrations);
              setManagerList(cached.managerList || []);
              setError(null);
              setLoading(false);
              return; // ✅ Served from fresh cache
            } else {
              console.log("IndexedDB cache found but stale. Fetching fresh data...");
            }
          }
        } catch (cacheErr) {
          console.warn('ClientManagement cache read failed, falling back to network:', cacheErr);
        }

        // --- CIRCUIT BREAKER: Prevent infinite loops ---
        // const lastFetch = localStorage.getItem('last_client_fetch_timestamp');
        // Reduced from 10000 to 1000ms to allow easier testing
        // if (lastFetch && (Date.now() - parseInt(lastFetch) < 1000)) {
        //   console.warn("⚠️ Data fetch blocked: Too frequent requests. Using cache if available.");
        //   // Try to use memory cache or just return to avoid network cost
        //   if (cached && cached.serviceRegistrations) {
        //     setServiceRegistrations(cached.serviceRegistrations);
        //     setManagerList(cached.managerList || []);
        //     setLoading(false);
        //     return;
        //   }
        // }

        // --- 2. If no cache, fetch OPTIMIZED index from Firebase ---
        console.log("Fetching fresh data from Firebase...");
        localStorage.setItem('last_client_fetch_timestamp', Date.now());

        // Instead of fetching "clients" (huge), we fetch "service_registrations_index" (small)
        const [indexSnap, usersSnap] = await Promise.all([
          get(ref(database, 'service_registrations_index')),
          // Revert to fetching 'users' because 'employees_index' is not being populated by EmployeeManagement yet
          get(ref(database, 'users')),
        ]);

        if (cancelled) return;

        // ---- Index → serviceRegistrations ----
        // The index is already flat! We just need to convert object to array.
        const indexData = indexSnap.exists() ? indexSnap.val() : {};
        const allRegistrations = Object.values(indexData);

        // If index is empty, it might mean migration hasn't run. 
        if (allRegistrations.length === 0) {
          console.warn("No service_registrations_index found. Please run Optimize Database in Admin Page.");
        }

        // ---- Users → managers list (supports roles[] or role) ----
        const usersData = usersSnap.exists() ? usersSnap.val() : {};
        const allUsers = Object.keys(usersData).map((key) => ({
          firebaseKey: key,
          ...usersData[key],
        }));

        const managers = allUsers.filter((u) => {
          if (Array.isArray(u.roles)) {
            return u.roles.map((r) => r.toLowerCase()).includes('manager');
          }
          return (u.role || '').toLowerCase() === 'manager';
        });

        if (cancelled) return;

        setServiceRegistrations(allRegistrations);
        setManagerList(managers);
        setError(null);

        // --- 3. Save to IndexedDB cache (no sessionStorage, so no QuotaExceeded) ---
        try {
          await dbSet(CLIENT_MGMT_CACHE_KEY, {
            serviceRegistrations: allRegistrations,
            managerList: managers,
            cachedAt: Date.now(),
          });
        } catch (cacheErr) {
          console.warn('ClientManagement cache write failed (will simply not cache):', cacheErr);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch clients and users:', err);
          setError('Failed to load client data. Please try again later.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadClientsAndUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  // 2) Compute today's applications COUNT from in-memory data (NO DB calls)
  useEffect(() => {
    if (!serviceRegistrations || serviceRegistrations.length === 0) {
      setTodayClientAppCounts({});
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const counts = {};

    serviceRegistrations.forEach(client => {
      const jobAppsRaw = client.jobApplications || client.jobapplications || null;

      const appsArray = jobAppsRaw
        ? (Array.isArray(jobAppsRaw) ? jobAppsRaw : Object.values(jobAppsRaw))
        : [];

      const todayCount = appsArray.filter(app => {
        if (!app.appliedDate) return false;
        const appDate = new Date(app.appliedDate).toISOString().split('T')[0];
        return appDate === today;
      }).length;

      counts[client.registrationKey] = todayCount;
    });

    setTodayClientAppCounts(counts);
  }, [serviceRegistrations]);



  const serviceOptions = [
    'All',
    'Mobile Development',
    'Web Development',
    'Digital Marketing',
    'IT Talent Supply',
    'Job Supporting',
    'Cyber Security'
  ];

  const handleAcceptClient = async (registration) => {
    try {
      const updates = {};
      const indexKey = `service_registrations_index/${registration.clientFirebaseKey}_${registration.registrationKey}`;

      updates[`clients/${registration.clientFirebaseKey}/serviceRegistrations/${registration.registrationKey}/assignmentStatus`] = 'pending_manager';
      updates[`${indexKey}/assignmentStatus`] = 'pending_manager';

      await update(ref(database), updates);

      // Optimistic update
      setServiceRegistrations(prevRegistrations => prevRegistrations.map(reg =>
        reg.registrationKey === registration.registrationKey ? { ...reg, assignmentStatus: 'pending_manager' } : reg
      ));
    } catch (error) {
      console.error("Failed to accept client registration:", error);
    }
  };

  const handleResumeFileChange = (e, index) => {
    if (e.target.files[0]) {
      setNewResumeFiles(prev => ({
        ...prev,
        [index]: e.target.files[0] // Store the new file with its corresponding index
      }));
    }
  };
  const handleDeclineClient = async (registration) => {
    if (!registration || !registration.clientFirebaseKey || !registration.registrationKey) {
      console.error("Missing registration details to decline client.");
      return;
    }
    try {
      const updates = {};
      const indexKey = `service_registrations_index/${registration.clientFirebaseKey}_${registration.registrationKey}`;

      updates[`clients/${registration.clientFirebaseKey}/serviceRegistrations/${registration.registrationKey}/assignmentStatus`] = 'rejected';
      updates[`${indexKey}/assignmentStatus`] = 'rejected';

      await update(ref(database), updates);

      console.log(`Client ${registration.firstName} declined and moved to rejected.`);
      // OPTIMISTIC UPDATE: update local state immediately
      setServiceRegistrations(prevRegistrations => prevRegistrations.map(reg =>
        reg.registrationKey === registration.registrationKey ? { ...reg, assignmentStatus: 'rejected' } : reg
      ));
    } catch (error) {
      console.error("Failed to decline client registration:", error);
    }
  };



  const handleUnacceptClientClick = (registration) => {
    setClientToUnaccept(registration);
    setIsUnacceptClientConfirmModalOpen(true);
  };

  const handleCancelUnaccept = () => {
    setIsUnacceptClientConfirmModalOpen(false);
    setClientToUnaccept(null);
  };

  const handleConfirmUnaccept = async () => {
    if (!clientToUnaccept) return;
    try {
      const updates = {};
      const indexKey = `service_registrations_index/${clientToUnaccept.clientFirebaseKey}_${clientToUnaccept.registrationKey}`;

      updates[`clients/${clientToUnaccept.clientFirebaseKey}/serviceRegistrations/${clientToUnaccept.registrationKey}/assignmentStatus`] = 'registered';
      updates[`${indexKey}/assignmentStatus`] = 'registered';

      await update(ref(database), updates);

      // OPTIMISTIC UPDATE: update local state immediately
      setServiceRegistrations(prevRegistrations => prevRegistrations.map(reg =>
        reg.registrationKey === clientToUnaccept.registrationKey ? { ...reg, assignmentStatus: 'registered' } : reg
      ));
      setIsUnacceptClientConfirmModalOpen(false);
      setClientToUnaccept(null);
      console.log(`Client ${clientToUnaccept.firstName} unaccepted and moved back to registered.`);
    } catch (error) {
      console.error("Failed to unaccept client registration:", error);
      alert("Error unaccepting client.");
    }
  };


  const handleOpenPaymentModal = (client) => {
    setSelectedClientForPayment(client);
    setPaymentDetails({
      amount: '',
      description: '',
      transactionDate: new Date().toISOString().slice(0, 10),
    });
    setGeneratedPaymentLink('');
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setSelectedClientForPayment(null);
    setPaymentDetails({
      amount: '',
      description: '',
      transactionDate: '',
    });
    setGeneratedPaymentLink('');
  };

  const handlePaymentDetailsChange = (e) => {
    const { name, value } = e.target;
    setPaymentDetails(prevDetails => ({
      ...prevDetails,
      [name]: value,
    }));
  };


  // New helper functions to manage the educationDetails array in state
  const handleAddEducationEntry = () => {
    setCurrentClientToEdit(prev => ({
      ...prev,
      educationDetails: [...(prev.educationDetails || []), {
        universityName: '',
        universityAddress: '',
        courseOfStudy: '',
        graduationFromDate: '',
        graduationToDate: '',
      }]
    }));
  };

  const handleRemoveEducationEntry = (index) => {
    const updatedEducation = [...(currentClientToEdit.educationDetails || [])];
    updatedEducation.splice(index, 1);
    setCurrentClientToEdit(prev => ({ ...prev, educationDetails: updatedEducation }));
  };

  // New handler for changes within the education details array
  const handleEducationChange = (e, index, field) => {
    const { value } = e.target;
    const updatedEducation = [...(currentClientToEdit.educationDetails || [])];
    updatedEducation[index] = {
      ...updatedEducation[index],
      [field]: value
    };
    setCurrentClientToEdit(prev => ({ ...prev, educationDetails: updatedEducation }));
  };

  const handleGeneratePaymentLink = () => {


    const mockLink = `https://31228083-199d-476b-a6cb-d029dbd0ce9-figmaiframepreview.figma.site#/pay/1/INV-14752-12703`;
    setGeneratedPaymentLink(mockLink);
    console.log('Generating payment link with details:', paymentDetails, ' for client:', selectedClientForPayment);
  };

  const handlePayNow = () => {
    console.log('Processing immediate payment with details:', paymentDetails, ' for client:', selectedClientForPayment);

    handleClosePaymentModal();
  };

  const handleCopyLink = () => {
    if (generatedPaymentLink) {

      const textArea = document.createElement('textarea');
      textArea.value = generatedPaymentLink;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        console.log('Payment link copied using execCommand!');
      } catch (e) {
        console.error('Fallback copy failed: ', e);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleSendEmail = () => {
    console.log('Sending email with link:', generatedPaymentLink);

  };

  const handlePreviewLink = () => {
    if (generatedPaymentLink) {
      window.open(generatedPaymentLink, '_blank');
    }
  };

  const handleDeleteRejectedClient = (client) => {
    setClientToDelete(client);
    setIsDeleteClientConfirmModalOpen(true);
  };

  const handleConfirmClientDelete = async () => {
    if (!clientToDelete) return;
    if (!clientToDelete || !clientToDelete.clientFirebaseKey || !clientToDelete.registrationKey) {
      console.error("Missing client or registration keys for deletion.");
      return;
    }

    try {
      const updates = {};
      const indexKey = `service_registrations_index/${clientToDelete.clientFirebaseKey}_${clientToDelete.registrationKey}`;

      // Remove from both locations
      updates[`clients/${clientToDelete.clientFirebaseKey}/serviceRegistrations/${clientToDelete.registrationKey}`] = null;
      updates[indexKey] = null;
      updates[`clients-jobapplication/${clientToDelete.clientFirebaseKey}/${clientToDelete.registrationKey}`] = null;

      await update(ref(database), updates);

      console.log(`Successfully deleted service registration: ${clientToDelete.registrationKey}`);

      // Clean up local state (Optional: also update the local clients list to remove the service instantly)
      setIsDeleteClientConfirmModalOpen(false);
      setClientToDelete(null);

    } catch (error) {
      console.error("Failed to delete client service registration:", error);
      alert("Error deleting service registration.");
    }
  };

  const handleCancelClientDelete = () => {
    setIsDeleteClientConfirmModalOpen(false);
    setClientToDelete(null);
  };

  const handleAssignClient = async (registration) => {
    // Check if the manager selection was made in the modal (the name should be on the registration object)
    if (!registration || !registration.manager || !registration.managerFirebaseKey) {
      alert('Please select a manager first using the "Select Manager" button.');
      return;
    }

    try {
      const updates = {};
      const indexKey = `service_registrations_index/${registration.clientFirebaseKey}_${registration.registrationKey}`;

      // Update Main Node
      updates[`clients/${registration.clientFirebaseKey}/serviceRegistrations/${registration.registrationKey}/manager`] = registration.manager;
      updates[`clients/${registration.clientFirebaseKey}/serviceRegistrations/${registration.registrationKey}/assignedManager`] = registration.managerFirebaseKey;
      updates[`clients/${registration.clientFirebaseKey}/serviceRegistrations/${registration.registrationKey}/assignmentStatus`] = 'pending_employee';

      // Update Index
      updates[`${indexKey}/manager`] = registration.manager;
      updates[`${indexKey}/assignedManager`] = registration.managerFirebaseKey;
      updates[`${indexKey}/assignmentStatus`] = 'pending_employee';

      await update(ref(database), updates);

      // OPTIMISTIC UPDATE: Update local state immediately
      setServiceRegistrations(prev => prev.map(reg =>
        reg.registrationKey === registration.registrationKey
          ? {
            ...reg,
            manager: registration.manager,
            assignedManager: registration.managerFirebaseKey,
            assignmentStatus: 'pending_employee'
          }
          : reg
      ));
    } catch (error) {
      console.error("Failed to assign manager:", error);
    }
  };


  const handleRestoreClient = async (registration) => {
    if (!registration || !registration.clientFirebaseKey || !registration.registrationKey) {
      console.error("Missing registration details to restore client.");
      return;
    }
    try {
      const updates = {};
      const indexKey = `service_registrations_index/${registration.clientFirebaseKey}_${registration.registrationKey}`;

      updates[`clients/${registration.clientFirebaseKey}/serviceRegistrations/${registration.registrationKey}/assignmentStatus`] = 'pending_manager';
      updates[`${indexKey}/assignmentStatus`] = 'pending_manager';

      await update(ref(database), updates);

      console.log(`Client ${registration.firstName} restored and moved to unassigned.`);
      // OPTIMISTIC UPDATE: update local state immediately
      setServiceRegistrations(prevRegistrations => prevRegistrations.map(reg =>
        reg.registrationKey === registration.registrationKey ? { ...reg, assignmentStatus: 'pending_manager' } : reg
      ));
    } catch (error) {
      console.error("Failed to restore client registration:", error);
    }
  };


  const handleOpenManagerModal = (registration) => {
    setRegistrationForManager(registration);
    setIsManagerModalOpen(true);
  };

  const handleCloseManagerModal = () => {
    setIsManagerModalOpen(false);
    setRegistrationForManager(null);
    setManagerSearchTerm('');
  };

  const handleSelectManager = (manager) => {
    if (!registrationForManager) return;
    setManagerToConfirm(manager);
    setIsConfirmManagerModalOpen(true);
  };

  const handleClientSearchChange = (event) => {
    setClientSearchTerm(event.target.value);
  };

  const getFilteredRegistrations = (tabOverride) => {
    let filtered = serviceRegistrations;

    // Only keep registrations that use one of the known services
    const validServices = serviceOptions.filter(s => s !== 'All');
    filtered = filtered.filter(c => !c.service || validServices.includes(c.service));

    const appliedFilter = tabOverride || clientFilter;

    if (appliedFilter === 'registered') {
      filtered = filtered.filter(c => c.assignmentStatus === 'registered' || !c.assignmentStatus);
    } else if (appliedFilter === 'unassigned') {
      filtered = filtered.filter(c => c.assignmentStatus === 'pending_manager');
    } else if (appliedFilter === 'active') {
      filtered = filtered.filter(c =>
        ['pending_employee', 'pending_acceptance', 'active', 'inactive'].includes(c.assignmentStatus)
      );
    } else if (appliedFilter === 'rejected') {
      filtered = filtered.filter(c => c.assignmentStatus === 'rejected');
    }

    if (selectedServiceFilter !== 'All') {
      filtered = filtered.filter(client => client.service === selectedServiceFilter);
    }

    const searchTermLower = clientSearchTerm.toLowerCase();
    return filtered.filter(client =>
      (client.firstName?.toLowerCase().includes(searchTermLower)) ||
      (client.lastName?.toLowerCase().includes(searchTermLower)) ||
      (client.email?.toLowerCase().includes(searchTermLower)) ||
      (client.mobile?.toLowerCase().includes(searchTermLower)) ||
      (client.jobsToApply?.toLowerCase().includes(searchTermLower)) ||
      (client.country?.toLowerCase().includes(searchTermLower)) ||
      (client.service?.toLowerCase().includes(searchTermLower))
    );
  };

  const getTabCount = (tab) => {
    return getFilteredRegistrations(tab).length;
  };



  const handleConfirmSelectManager = async () => {
    if (!managerToConfirm || !registrationForManager) return;

    // 1. Basic IDs
    const clientKey = registrationForManager.clientFirebaseKey;
    const regKey = registrationForManager.registrationKey;

    // Old manager (if any) so we can clean up their index
    const oldManagerId = registrationForManager.assignedManager || null;

    // New manager
    const newManagerId = managerToConfirm.firebaseKey;
    const assignmentKey = `${clientKey}_${regKey}`;

    const updatedManagerInfo = {
      manager: `${managerToConfirm.firstName} ${managerToConfirm.lastName}`,
      assignedManager: newManagerId,
    };

    // 2. Build a multi-location update payload
    const updates = {};

    // 2A. Update main client registration node
    updates[`clients/${clientKey}/serviceRegistrations/${regKey}/manager`] =
      updatedManagerInfo.manager;
    updates[`clients/${clientKey}/serviceRegistrations/${regKey}/assignedManager`] =
      updatedManagerInfo.assignedManager;
    updates[`clients/${clientKey}/serviceRegistrations/${regKey}/assignmentStatus`] =
      'pending_employee';

    // 2B. Create / update the Manager → Client reverse index
    updates[`manager_assignments/${newManagerId}/${assignmentKey}`] = {
      clientFirebaseKey: clientKey,
      registrationKey: regKey,
      clientName: `${registrationForManager.firstName || ''} ${registrationForManager.lastName || ''
        }`.trim(),
      status: 'pending_employee',
    };

    // 2C. Update the Service Registrations Index (Optimization)
    const indexKey = `service_registrations_index/${clientKey}_${regKey}`;
    updates[`${indexKey}/manager`] = updatedManagerInfo.manager;
    updates[`${indexKey}/assignedManager`] = updatedManagerInfo.assignedManager;
    updates[`${indexKey}/assignmentStatus`] = 'pending_employee';

    // 2D. If there was an old manager, remove the old index entry
    if (oldManagerId) {
      updates[`manager_assignments/${oldManagerId}/${assignmentKey}`] = null;
    }

    try {
      // 3. Apply all updates atomically
      await update(ref(database), updates);

      // 4. Update local state so the UI immediately reflects it
      setServiceRegistrations(prev =>
        prev.map(reg =>
          reg.registrationKey === regKey
            ? {
              ...reg,
              ...updatedManagerInfo,
              assignmentStatus: 'pending_employee',
            }
            : reg
        )
      );

      // Optionally: you can show a toast/snackbar here
      // triggerNotification("Manager assigned successfully!");

    } catch (error) {
      console.error('Failed to assign manager:', error);
      alert('Failed to assign manager. Please try again.');
    } finally {
      // 5. Close modals and clear temp state
      setIsConfirmManagerModalOpen(false);
      setIsManagerModalOpen(false);
      setManagerToConfirm(null);
      setRegistrationForManager(null);
    }
  };


  // All registrations after applying tab/service/search filters
  const filteredClients = useMemo(
    () => getFilteredRegistrations(),
    [serviceRegistrations, clientFilter, selectedServiceFilter, clientSearchTerm]
  );

  // --- Pagination (5 applications per page, client-side using cached data) ---
  const totalPages = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // When filters/search change, reset to page 1 so we don't request invalid pages
  useEffect(() => {
    setCurrentPage(1);
  }, [clientFilter, selectedServiceFilter, clientSearchTerm]);

  // --- Client Details and Edit Client Modals Handlers ---
  const handleViewClientDetails = async (client) => {
    // `client` here is the registration row (from Active/Registered/Etc.)
    // It already has clientFirebaseKey + registrationKey

    // NORMALIZE keys from Index (resume -> resumes, coverLetter -> coverLetterUrl)
    const normalizedClient = {
      ...client,
      resumes: client.resumes || client.resume || [],
      coverLetterUrl: client.coverLetterUrl || client.coverLetter || '',
      coverLetterFileName: client.coverLetterFileName || (client.coverLetter ? 'cover_letter' : '') // Fallback
    };

    setSelectedClientForDetails(normalizedClient);
    setActiveClientDetailsTab('Profile');
    setIsClientDetailsModalOpen(true);

    try {
      // 1) Load the base profile for extra fields (optional but nice)
      if (client.clientFirebaseKey) {
        const clientProfileRef = ref(database, `clients/${client.clientFirebaseKey}`);
        const profileSnap = await get(clientProfileRef);
        if (profileSnap.exists()) {
          const baseProfile = profileSnap.val() || {};
          // Merge base profile into the selected client details (so Profile tab shows full info)
          setSelectedClientForDetails(prev => ({
            ...(prev || {}),
            ...baseProfile,
            // Keep registration-level keys from the original row and our normalization
            clientFirebaseKey: client.clientFirebaseKey,
            registrationKey: client.registrationKey,
            resumes: normalizedClient.resumes,
            coverLetterUrl: normalizedClient.coverLetterUrl
          }));
        }
      }

      // 2) Load job applications for THIS registration
      if (!client.clientFirebaseKey || !client.registrationKey) {
        setClientApplications([]);
        setClientInterviews([]);
        return;
      }

      const clientKey = client.clientFirebaseKey;
      const regKey = client.registrationKey;

      const jobApplicationsRef = ref(
        database,
        `clients-jobapplication/${clientKey}/${regKey}`
      );

      const snapshot = await get(jobApplicationsRef);

      if (!snapshot.exists()) {
        setClientApplications([]);
        setClientInterviews([]);
        return;
      }

      const raw = snapshot.val();

      // Handle both array and object forms just in case
      let appsArray = [];
      if (Array.isArray(raw)) {
        appsArray = raw.filter(Boolean); // drop null holes if any
      } else {
        appsArray = Object.keys(raw).map(key => ({
          firebaseKey: key,
          ...raw[key],
        }));
      }

      // Enrich each app with client/registration keys so edit/delete modals keep working
      appsArray = appsArray.map(app => ({
        ...app,
        clientFirebaseKey: clientKey,
        registrationKey: regKey,
      }));

      // All apps go into Applications tab
      setClientApplications(appsArray);

      // Only "Interview" status (or whatever you use) goes into Interviews tab
      const interviews = appsArray.filter(
        app => app.status && app.status.toLowerCase() === 'interview'
      );
      setClientInterviews(interviews);
    } catch (err) {
      console.error("Failed to load client details:", err);
      setClientApplications([]);
      setClientInterviews([]);
    }
  };




  const handleCloseClientDetailsModal = () => {
    setIsClientDetailsModalOpen(false);
    setSelectedClientForDetails(null);
    setClientApplications([]);
    setClientInterviews([]);
    setActiveClientDetailsTab('Profile');
  };


  const handleEditClientDetailsClick = () => {
    setCurrentClientToEdit({ ...selectedClientForDetails });
    setIsClientDetailsModalOpen(false);
    setIsEditClientModalOpen(true);
  };

  const handleCloseEditClientModal = () => {
    setIsEditClientModalOpen(false);
    setCurrentClientToEdit(null);
    setNewResumeFiles({}); // Reset file input state
    setNewCoverLetterFile(null);
  };

  const handleEditClientChange = (e) => {
    const { name, value, files } = e.target;
    // Handle new file selection separately
    if (name === "newResumeFile") {
      setNewResumeFile(files[0]);
    } else if (name === "newCoverLetterFile") {
      setNewCoverLetterFile(files[0]);
    } else {
      setCurrentClientToEdit(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleCoverLetterFileChange = (e) => {
    if (e.target.files[0]) {
      setNewCoverLetterFile(e.target.files[0]);
    }
  };

  const handleNewResumeUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const newFilesObject = {};
    files.forEach((file, index) => {
      // We use a special 'new_' prefix to distinguish these from updates
      newFilesObject[`new_${index}`] = file;
    });
    setNewResumeFiles(prev => ({ ...prev, ...newFilesObject }));
  };

  const handleSaveClientDetails = async (e) => {
    e.preventDefault();
    if (!currentClientToEdit || !currentClientToEdit.clientFirebaseKey) {
      alert("Error: No client selected or client is missing a key.");
      return;
    }
    setIsSaving(true);

    try {
      const storage = getStorage();
      const updatedResumes = [...(currentClientToEdit.resumes || [])];

      // Separate files meant for updating vs. files that are newly added
      const filesToUpdate = {};
      const filesToAdd = [];
      Object.entries(newResumeFiles).forEach(([key, file]) => {
        if (String(key).startsWith('new_')) {
          filesToAdd.push(file);
        } else {
          filesToUpdate[key] = file;
        }
      });

      // --- Process UPDATES on existing resumes ---
      const updatePromises = Object.entries(filesToUpdate).map(async ([indexStr, file]) => {
        const index = parseInt(indexStr, 10);
        const filePath = `resumes/${currentClientToEdit.clientFirebaseKey}/${currentClientToEdit.registrationKey}/${file.name}`;
        const fileRef = storageRef(storage, filePath);
        await uploadBytes(fileRef, file);
        const downloadUrl = await getDownloadURL(fileRef);
        return { index, data: { name: file.name, url: downloadUrl, size: file.size } };
      });
      const updateResults = await Promise.all(updatePromises);
      updateResults.forEach(({ index, data }) => {
        if (updatedResumes[index]) updatedResumes[index] = data;
      });

      // --- Process NEWLY ADDED resumes ---
      const addPromises = filesToAdd.map(async (file) => {
        const filePath = `resumes/${currentClientToEdit.clientFirebaseKey}/${currentClientToEdit.registrationKey}/${Date.now()}-${file.name}`;
        const fileRef = storageRef(storage, filePath);
        await uploadBytes(fileRef, file);
        const downloadUrl = await getDownloadURL(fileRef);
        return { name: file.name, url: downloadUrl, size: file.size };
      });
      const addResults = await Promise.all(addPromises);
      updatedResumes.push(...addResults); // Append new resumes to the array

      // --- Continue with the rest of the save logic ---
      const updates = { ...currentClientToEdit, resumes: updatedResumes };

      if (newCoverLetterFile) {
        const filePath = `coverletters/${currentClientToEdit.clientFirebaseKey}/${currentClientToEdit.registrationKey}/${newCoverLetterFile.name}`;
        const fileRef = storageRef(storage, filePath);
        await uploadBytes(fileRef, newCoverLetterFile);
        updates.coverLetterUrl = await getDownloadURL(fileRef);
        updates.coverLetterFileName = newCoverLetterFile.name;
      }

      const { firstName, lastName, email, mobile, ...registrationUpdates } = updates;

      const updatePayload = {};
      const indexKey = `service_registrations_index/${currentClientToEdit.clientFirebaseKey}_${currentClientToEdit.registrationKey}`;

      // 1. Update Registration Node
      updatePayload[`clients/${currentClientToEdit.clientFirebaseKey}/serviceRegistrations/${currentClientToEdit.registrationKey}`] = registrationUpdates;

      // 2. Update Client Profile Node
      updatePayload[`clients/${currentClientToEdit.clientFirebaseKey}/firstName`] = firstName;
      updatePayload[`clients/${currentClientToEdit.clientFirebaseKey}/lastName`] = lastName;
      updatePayload[`clients/${currentClientToEdit.clientFirebaseKey}/email`] = email;
      updatePayload[`clients/${currentClientToEdit.clientFirebaseKey}/mobile`] = mobile;

      // 3. Update Service Index (Optimization)
      // We only update fields that might have changed to avoid overwriting unrelated index data
      updatePayload[`${indexKey}/firstName`] = firstName || '';
      updatePayload[`${indexKey}/lastName`] = lastName || '';
      updatePayload[`${indexKey}/email`] = email || '';
      updatePayload[`${indexKey}/mobile`] = mobile || '';
      if (registrationUpdates.service) updatePayload[`${indexKey}/service`] = registrationUpdates.service;
      if (registrationUpdates.country) updatePayload[`${indexKey}/country`] = registrationUpdates.country;
      if (registrationUpdates.jobsToApply) updatePayload[`${indexKey}/jobsToApply`] = registrationUpdates.jobsToApply;
      if (registrationUpdates.visaStatus) updatePayload[`${indexKey}/visaStatus`] = registrationUpdates.visaStatus;

      await update(ref(database), updatePayload);

      handleCloseEditClientModal();
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 3000);

    } catch (error) {
      console.error("Failed to update client details in Firebase:", error);
      alert("An error occurred while saving the changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Rendering Functions ---
  const renderClientTable = (registrationsToRender, serviceType, currentClientFilter, title = '') => {
    const headers = ['First Name', 'Last Name', 'Mobile', 'Email', serviceType === 'Job Supporting' ? 'Jobs Apply For' : 'Service', 'Registered Date', 'Country'];
    if (serviceType === 'Job Supporting') headers.push('Visa Status');
    if (['unassigned', 'active', 'restored'].includes(currentClientFilter)) headers.push('Manager');
    headers.push('Details', 'Actions');

    const getManagerName = (managerFirebaseKey, fallbackName) => {
      const manager = managerList.find(m => m.firebaseKey === managerFirebaseKey);
      return manager ? `${manager.firstName} ${manager.lastName}` : (fallbackName || 'N/A');
    };

    return (
      <div className="client-table-container">
        {title && <h4 className="client-table-title">{title} ({registrationsToRender.length})</h4>}
        <table className="client-table">
          <thead><tr><th>S.No.</th>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {registrationsToRender.length > 0 ? (
              registrationsToRender.map((registration, index) => (
                <tr key={registration.registrationKey}>
                  <td>{index + 1}</td>
                  <td>{registration.firstName}</td>
                  <td>{registration.lastName}</td>
                  <td>{registration.mobile}</td>
                  <td>{registration.email}</td>
                  <td
                    style={{
                      // Essential styles for wrapping long, continuous text in a table cell:
                      wordBreak: 'break-word',
                      whiteSpace: 'normal',
                      minWidth: '200px', // Optional: Ensures the column has a minimum width before wrapping starts
                      maxWidth: '300px'  // Optional: Prevents the column from becoming excessively wide
                    }}
                  >{registration.service === 'Job Supporting' ? registration.jobsToApply : registration.service}</td>
                  <td>{registration.appliedDate}</td>
                  <td>{registration.country}</td>
                  {registration.service === 'Job Supporting' && <td>{registration.visaStatus}</td>}
                  {(currentClientFilter === 'unassigned' || currentClientFilter === 'restored') && (
                    <td>
                      <button onClick={() => handleOpenManagerModal(registration)} className="action-button select-manager">
                        {registration.manager ? registration.manager : 'Select Manager'}
                      </button>
                    </td>
                  )}
                  {currentClientFilter === 'active' && (
                    <td>
                      {getManagerName(registration.assignedManager, registration.manager)}
                    </td>
                  )}
                  <td>
                    <button
                      onClick={() => handleViewClientDetails(registration)}
                      className="action-button view"
                    >
                      View
                      {todayClientAppCounts[registration.registrationKey] > 0 && (
                        <span style={{
                          marginLeft: '6px',
                          backgroundColor: '#007bff',
                          color: '#fff',
                          borderRadius: '12px',
                          padding: '2px 8px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}>
                          {todayClientAppCounts[registration.registrationKey]}
                        </span>
                      )}
                    </button>
                  </td>

                  <td style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <div className="action-buttons">
                      {currentClientFilter === 'registered' && (
                        <>
                          <button onClick={() => handleAcceptClient(registration)} className="action-button accept">Accept</button>
                          <button onClick={() => handleDeclineClient(registration)} className="action-button decline">Decline</button>
                        </>
                      )}
                      {(currentClientFilter === 'unassigned' || currentClientFilter === 'restored') && (
                        <>
                          {/* Unaccept button added here for Unassigned Clients */}
                          <button onClick={() => handleUnacceptClientClick(registration)} className="action-button cancel">Unaccept</button>
                          <button onClick={() => handleAssignClient(registration)} className="action-button assign" disabled={!registration.manager}>Save</button>
                        </>
                      )}
                      {currentClientFilter === 'active' && (<button onClick={() => handleOpenManagerModal(registration)} className="action-button edit-manager">Edit Manager</button>)}
                      {currentClientFilter === 'rejected' && (
                        <>
                          <button onClick={() => handleRestoreClient(registration)} className="action-button restore">Restore</button>
                          {/* Delete button confirmed here for Rejected Clients */}
                          <button onClick={() => handleDeleteRejectedClient(registration)} className="action-button delete-btn">Delete</button>
                        </>
                      )}
                    </div>
                    {/* Send Payment Link Button */}
                    <button
                      onClick={() => handleOpenPaymentModal(registration)}
                      className="action-button send-payment-link"
                    >
                      {/* Credit Card Icon (from Screenshot 2025-07-02 at 7.33.16 PM.jpeg) */}
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ width: '0.9rem', height: '0.9rem' }}>
                        <path d="M20 4H4C3.44772 4 3 4.44772 3 5V19C3 19.5523 3.44772 20 4 20H20C20.5523 20 21 19.5523 21 19V5C21 4.44772 20.5523 4 20 4ZM5 7H19V9H5V7ZM5 11H17V13H5V11ZM5 15H13V17H5V15Z" />
                      </svg>
                      Send Payment Link
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No {serviceType !== 'All' ? serviceType : ''} clients found for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {filteredClients.length > 0 && (
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              type="button"
              onClick={handlePrevPage}
              disabled={safeCurrentPage === 1}
            >
              ← Previous
            </button>

            <span className="pagination-info">
              Page <strong>{safeCurrentPage}</strong> of <strong>{totalPages}</strong>
            </span>

            <button
              className="pagination-btn"
              type="button"
              onClick={handleNextPage}
              disabled={safeCurrentPage === totalPages}
            >
              Next →
            </button>
          </div>
        )}


      </div>
    );
  };

  const renderAllServiceTables = () => {
    const servicesToDisplay = serviceOptions.filter(service => service !== 'All');
    return (
      <div className="all-services-list">
        {servicesToDisplay.map(service => {
          // Only use the current page's clients, already filtered & sliced
          const clientsForService = paginatedClients.filter(registration => {
            let matchesFilter = false;
            if (clientFilter === 'registered') {
              matchesFilter = registration.assignmentStatus === 'registered' || !registration.assignmentStatus;
            } else if (clientFilter === 'unassigned') {
              matchesFilter = registration.assignmentStatus === 'pending_manager';
            } else if (clientFilter === 'active') {
              matchesFilter = ['pending_employee', 'pending_acceptance', 'active'].includes(registration.assignmentStatus);
            } else if (clientFilter === 'rejected') {
              matchesFilter = registration.assignmentStatus === 'rejected';
            }

            const matchesService = registration.service === service;

            const searchTermLower = clientSearchTerm.toLowerCase();
            const matchesSearch =
              (registration.firstName || '').toLowerCase().includes(searchTermLower) ||
              (registration.lastName || '').toLowerCase().includes(searchTermLower) ||
              (registration.email || '').toLowerCase().includes(searchTermLower);

            return matchesFilter && matchesService && matchesSearch;
          });

          if (clientsForService.length === 0) {
            return null;
          }

          return (
            <div key={service} className="service-table-list-item">
              {renderClientTable(clientsForService, service, clientFilter, service)}
            </div>
          );
        })}
      </div>
    );
  };


  const [showScrollToTop, setShowScrollToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const nearBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;

      setShowScrollToTop(nearBottom);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


  useEffect(() => {
    // Whenever the date range, client, or applications change,
    // reset to the first page so pagination doesn't break.
    setClientAppsPage(1);
  }, [clientDateRange.startDate, clientDateRange.endDate, clientApplications, selectedClientForDetails]);



  const scrollToBottom = () => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth"
    });
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  {/* Client Details PAGE (inline, no popup) */ }
  if (isClientDetailsModalOpen && selectedClientForDetails) {
    return (
      <div className="ad-body-container">
        <style>{`
        /* Import Inter font from Google Fonts */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        :root {
          --bg-body: #f3f4f6;
          --bg-card: #ffffff;
          --text-primary: #1f2937;
          --text-secondary: #6b7280;
          --border-color: #e5e7eb;
          --shadow-color-1: rgba(0, 0, 0, 0.05);
          --shadow-color-3: rgba(0, 0, 0, 0.04);
          --modal-overlay-bg: rgba(0, 0, 0, 0.5);
          --modal-bg: #ffffff;
          --modal-border: #e5e7eb;
          --modal-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          --modal-title-color: #1f2937;
          --modal-subtitle-color: #6b7280;
          --modal-close-btn-color: #6b7280;
          --modal-close-btn-hover: #1f2937;
          --modal-input-border: #d1d5db;
          --modal-input-bg: #ffffff;
          --modal-input-text: #1f2937;
          --modal-focus-border: #2563eb;
          --modal-label-color: #374151;
          --dept-table-header-bg: #f9fafb;
          --dept-table-header-text: #6b7280;
          --dept-table-row-hover-bg: #f9fafb;
          --action-btn-border: #e5e7eb;
          --action-btn-text: #4b5563;
          --action-btn-hover-bg: #f9fafb;
          --delete-btn-bg: #EF4444;
          --delete-btn-hover-bg: #DC2626;
          --delete-btn-text: #ffffff;
          --confirm-modal-cancel-btn-bg: #e5e7eb;
          --confirm-modal-cancel-btn-text: #4b5563;
          --confirm-modal-cancel-btn-hover: #d1d5db;
          --modal-create-btn-bg: #2563eb;
          --modal-create-btn-text: #ffffff;
          --modal-create-btn-hover: #1d4ed8;

          /* Client Management Specific Colors */
          --client-filter-tab-bg-active-registered: #E6F0FF;
          --client-filter-tab-text-active-registered: #3A60EE;
          --client-filter-tab-badge-registered: #3A60EE;
          --client-filter-tab-bg-active-unassigned: #FEF3C7;
          --client-filter-tab-text-active-unassigned: #B45309;
          --client-filter-tab-badge-unassigned: #B45309;
          --client-filter-tab-bg-active-active: #D9F5E6;
          --client-filter-tab-text-active-active: #28A745;
          --client-filter-tab-badge-active: #28A745;
          --client-filter-tab-bg-active-rejected: #FFEDEE;
          --client-filter-tab-text-active-rejected: #DC3545;
          --client-filter-tab-badge-rejected: #DC3545;
          --client-filter-tab-bg-active-restored: #F0E6FF;
          --client-filter-tab-text-active-restored: #6A40EE;
          --client-filter-tab-badge-restored: #6A40EE;
        }

        .ad-body-container {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg-body);
            min-height: 100vh;
            flex-direction: column;
            color: var(--text-primary);
        }

        /* Client Management Styles */

        .client-details-tabs {
  display: flex;
  justify-content: center;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 1rem;
}

.tab-button {
  flex: 1;
  padding: 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.scroll-btn {
  position: fixed;
  bottom: 90px;
  right: 25px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #007bff;
  color: #fff;
  font-size: 1.5rem;
  border: none;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0px 4px 10px rgba(0,0,0,0.15);
  transition: background 0.3s ease;
  z-index: 9999;
}

.scroll-btn:hover {
  background: #0058c9;
}


.tab-button:hover {
  background-color: var(--bg-body);
}

.tab-button.active {
  color: #007bff;
  border-bottom: 3px solid #007bff;
  font-weight: 600;
}

.action-icon {
  font-size: 1.1rem;
  transition: transform 0.2s ease;
}

.action-icon.view { color: #007bff; }
.action-icon.edit { color: #28a745; }
.action-icon.delete { color: #dc3545; }

.action-icon:hover {
  transform: scale(1.2);
}


        .client-management-container {
           padding: 0 1.5rem 1.5rem;
        }

        .client-management-box {
            background-color: var(--bg-card);
            border-radius: 0.75rem;
            box-shadow: 0 4px 6px -1px var(--shadow-color-1), 0 2px 4px -1px var(--shadow-color-3);
            border: 1px solid var(--border-color);
            padding: 1.5rem;
             margin-top: 2.9rem;
        }

        .client-management-header-section {
            display: flex;
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 1.5rem;
        }

        .client-management-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
            
        }

        .client-details-page {
  margin-top: 24px;
  padding: 20px;
  background: var(--bg-color);
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
}

.client-details-page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.back-to-list-button {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--primary-color);
}


        .client-filter-tabs {
            position: relative;
            display: flex;
            border-radius: 0.5rem;
            background-color: #EEE;
            box-shadow: 0 0 0px 1px rgba(0, 0, 0, 0.06);
            padding: 0.25rem;
            width: 100%;
            font-size: 14px;
            margin: 0 auto 20px auto;
            overflow-x: auto;
            white-space: nowrap;
            flex-wrap: wrap;
            justify-content: center;
        }

        .client-filter-tab-item {
            flex-shrink: 0;
            flex-grow: 1;
            text-align: center;
            display: flex;
            cursor: pointer;
            align-items: center;
            justify-content: center;
            border-radius: 0.5rem;
            border: none;
            padding: .5rem 10px;
            transition: all .15s ease-in-out;
            color: rgba(51, 65, 85, 1);
            font-weight: normal;
            margin: 0 2px 5px 2px;
        }

        .client-filter-tab-item input[type="radio"] {
            display: none;
        }

        .client-filter-tab-item input[type="radio"]:checked + .client-filter-tab-label {
            font-weight: 600;
        }
        
        .client-filter-tab-label {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            border-radius: 0.5rem;
            padding: 0.3rem;
        }

        .client-filter-tab-item .badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 20px;
            height: 20px;
            border-radius: 50%;
            color: white;
            font-size: 0.75em;
            font-weight: bold;
            padding: 0 6px;
            margin-left: 5px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            transition: background-color 0.15s ease;
        }

        .client-filter-tab-item.registered input[type="radio"]:checked + .client-filter-tab-label { background-color: var(--client-filter-tab-bg-active-registered); color: var(--client-filter-tab-text-active-registered); }
        .client-filter-tab-item.registered .badge { background-color: var(--client-filter-tab-badge-registered); }
        .client-filter-tab-item.unassigned input[type="radio"]:checked ~ .client-filter-tab-label { background-color: var(--client-filter-tab-bg-active-unassigned); color: var(--client-filter-tab-text-active-unassigned); }
        .client-filter-tab-item.unassigned .badge { background-color: var(--client-filter-tab-badge-unassigned); }
        .client-filter-tab-item.active input[type="radio"]:checked ~ .client-filter-tab-label { background-color: var(--client-filter-tab-bg-active-active); color: var(--client-filter-tab-text-active-active); }
        .client-filter-tab-item.active .badge { background-color: var(--client-filter-tab-badge-active); }
        .client-filter-tab-item.rejected input[type="radio"]:checked ~ .client-filter-tab-label { background-color: var(--client-filter-tab-bg-active-rejected); color: var(--client-filter-tab-text-active-rejected); }
        .client-filter-tab-item.rejected .badge { background-color: var(--client-filter-tab-badge-rejected); }
        .client-filter-tab-item.restored input[type="radio"]:checked ~ .client-filter-tab-label { background-color: var(--client-filter-tab-bg-active-restored); color: var(--client-filter-tab-text-active-restored); }
        .client-filter-tab-item.restored .badge { background-color: var(--client-filter-tab-badge-restored); }

        .client-search-and-filter-group {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            margin-bottom: 1.5rem;
            align-items: flex-end;
        }

        .client-search-input-group {
            display: flex;
            align-items: center;
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            overflow: hidden;
            background-color: var(--bg-card);
            flex-grow: 1;
            min-width: 200px;
        }

        .client-search-input-group .search-icon-wrapper {
            padding: 0.75rem 1rem;
            color: var(--text-secondary);
            background-color: var(--bg-card);
            border-right: 1px solid var(--border-color);
        }

        .client-search-input-group .client-search-input {
            flex-grow: 1;
            padding: 0.75rem 1rem;
            border: none;
            outline: none;
            background-color: var(--bg-card);
            color: var(--text-primary);
            font-size: 0.9rem;
        }

        .pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin: 25px 0;
  font-size: 1rem;
}

.pagination-btn {
  background-color: #3b82f6; /* Blue */
  color: #ffffff;
  border: none;
  padding: 10px 18px;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.25s ease-in-out;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.35);
}

.pagination-btn:hover:not(:disabled) {
  background-color: #2563eb;
  transform: translateY(-2px);
}

.pagination-btn:disabled {
  background-color: #cccccc;
  color: #666666;
  cursor: not-allowed;
  box-shadow: none;
}

.pagination-info {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  background: rgba(59, 130, 246, 0.08);
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.2);
}


        .service-filter-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            flex-grow: 1;
            min-width: 180px;
        }

        .service-filter-group .form-label {
            font-size: 1.25rem;
            font-weight: 500;
            color: var(--modal-label-color);
        }

        .service-filter-group .form-select {
            padding: 0.75rem 1rem;
            border: 1px solid var(--modal-input-border);
            border-radius: 0.5rem;
            background-color: var(--modal-input-bg);
            color: var(--modal-input-text);
            font-size: 0.9rem;
            width: 100%;
        }

        .client-table-title {
            margin-bottom: 1rem;
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
            text-align: center;
        }

        .client-table-container {
            overflow-x: auto;
        }

        .client-table {
            width: 100%;
            border-collapse: collapse;
            background-color: var(--bg-card);
        }

        .client-table th, .client-table td {
            padding: 1rem;
            text-align: left;
            white-space: nowrap;
            border-bottom: 1px solid var(--border-color);
        }

        .client-table thead th {
            background-color: var(--dept-table-header-bg);
            color: var(--dept-table-header-text);
            font-size: 0.875rem;
            font-weight: 600;
            text-transform: uppercase;
          
        }

        .client-table tbody tr:last-child td {
            border-bottom: none;
        }

        .client-table tbody tr:nth-child(even) {
            background-color: var(--bg-body);
        }

        .client-table tbody tr:hover {
            background-color: var(--dept-table-row-hover-bg);
        }
        
        .client-table .action-buttons {
            display: flex;
            gap: 0.5rem;
            justify-content: flex-start;
            align-items: center;
        }

        .client-table .action-button {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 0.85em;
            font-weight: 600;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            transition: all 0.2s ease;
        }
        
        .client-table .action-button:hover {
            transform: translateY(-1px);
        }
        
        .client-table .action-button.view { background-color: #e0e7ff; color: #3730a3; }
        .client-table .action-button.accept { background-color: #28a745; color: white; }
        .client-table .action-button.decline { background-color: #dc3545; color: white; }
        .client-table .action-button.assign { background-color: #007bff; color: white; }
        .client-table .action-button.restore { background-color: #6f42c1; color: white; }
        .client-table .action-button.edit-manager { background-color: #007bff; color: white; }
        .client-table .action-button.save { background-color: #28a745; color: white; }
        .client-table .action-button.cancel { background-color: #6c757d; color: white; }
        .client-table .action-button.delete-btn { background-color: var(--delete-btn-bg); color: var(--delete-btn-text); }
         .client-table td .action-button.send-payment-link {
         background-color: #28a745; /* Green color for payment link */
           color: white;
           display: flex;
           align-items: center;
           gap: 0.5rem;
           }
          .client-table td .action-button.send-payment-link:hover {
          background-color: #218838;
           } 

        .client-table .manager-select {
            padding: 6px 8px;
            border-radius: 5px;
            border: 1px solid var(--border-color);
            background-color: var(--bg-card);
            color: var(--text-primary);
            font-size: 0.85em;
            width: 100%;
        }

        .all-services-list {
            display: flex;
            flex-direction: column;
            gap: 2rem;
            margin-top: 1.5rem;
        }

        .service-table-list-item {
            background-color: var(--bg-card);
            border-radius: 0.75rem;
            box-shadow: 0 4px 6px -1px var(--shadow-color-1), 0 2px 4px -1px var(--shadow-color-3);
            border: 1px solid var(--border-color);
            padding: 1.5rem;
            width: 100%;
        }

        .client-table .action-button.select-manager {
            background-color: #f0f0f0;
            color: #333;
            border: 1px solid #ccc;
        }
        
        /* Manager Select Modal Styles */
        .manager-select-modal {
            max-width: 450px;
        }
             .manager-search-container {
            margin-top: 1rem;
        }
        .manager-search-input {
            width: 100%;
            padding: 0.75rem 1rem;
            border: 1px solid var(--modal-input-border);
            border-radius: 0.5rem;
            font-size: 1rem;
        }
        .manager-list {
             display: flex;
            flex-direction: column;
            gap: 0.75rem;
            margin-top: 1rem;
            max-height: 300px; /* Add max-height for scrollability */
            overflow-y: auto;
        }
        .manager-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 0.75rem;
            border-radius: 0.5rem;
            cursor: pointer;
            transition: background-color 0.2s ease;
        }
        .manager-item:hover {
            background-color: var(--dept-table-row-hover-bg);
        }
        .manager-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: #007bff;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            flex-shrink: 0;
        }
        .manager-info {
            display: flex;
            flex-direction: column;
        }
        .manager-name {
            font-weight: 600;
            color: var(--text-primary);
        }
        .manager-email {
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        /* Modal Styles */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: var(--modal-overlay-bg);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease, visibility 0.3s ease;
        }

        .modal-overlay.open {
            opacity: 1;
            visibility: visible;
        }

        .modal-content {
            background-color: var(--modal-bg);
            border-radius: 0.75rem;
            box-shadow: var(--modal-shadow);
            border: 1px solid var(--modal-border);
            width: 90%;
            max-width: 500px;
            padding: 1.5rem;
            position: relative;
            transform: translateY(-20px);
            opacity: 0;
            transition: transform 0.3s ease, opacity 0.3s ease;
        }
        
        .modal-overlay.open .modal-content {
            transform: translateY(0);
            opacity: 1;
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 1rem;
        }

        .modal-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--modal-title-color);
        }
        
        .modal-subtitle {
            font-size: 0.875rem;
            color: var(--modal-subtitle-color);
            margin-top: 0.25rem;
        }

        .modal-close-btn {
            background: none;
            border: none;
            font-size: 1.5rem;
            color: var(--modal-close-btn-color);
            cursor: pointer;
        }
        
        .confirm-modal-buttons {
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
            margin-top: 1.5rem;
        }

        .confirm-cancel-btn, .confirm-delete-btn {
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-weight: 500;
            border: none;
            cursor: pointer;
        }

        .confirm-cancel-btn {
            background-color: var(--confirm-modal-cancel-btn-bg);
            color: var(--confirm-modal-cancel-btn-text);
        }
        
        .confirm-delete-btn {
            background-color: var(--delete-btn-bg);
            color: var(--delete-btn-text);
        }

        .assign-modal-content {
            background-color: var(--modal-bg);
            border-radius: 0.75rem;
            width: 90%;
            max-width: 900px; 
            padding: 1.5rem;
            position: relative;
            overflow-y: auto;
            max-height: 90vh;
        }

        .assign-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 1.5rem;
        }

        .assign-modal-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--modal-title-color);
        }

        .assign-modal-close-button {
            background: none;
            border: none;
            font-size: 1.5rem;
            color: var(--modal-close-btn-color);
            cursor: pointer;
        }

        .client-preview-grid-container {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1.5rem;
        }

        @media (min-width: 768px) {
            .client-preview-grid-container {
                grid-template-columns: repeat(2, 1fr);
            }
        }

        .client-preview-section {
            background-color: var(--bg-body);
            border-radius: 0.5rem;
            border: 1px solid var(--border-color);
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }

        .client-preview-section-title {
            font-size: 1rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid var(--border-color);
        }

        .assign-form-group {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }

        .assign-form-group label {
            font-size: 0.75rem;
            font-weight: 500;
            color: var(--text-secondary);
            text-transform: uppercase;
        }
        
        .assign-form-group input, .assign-form-group select, .assign-form-group textarea, .read-only-value {
            width: 100%;
            padding: 0.6rem 0.8rem;
            border: 1px solid var(--modal-input-border);
            border-radius: 0.4rem;
            background-color: var(--modal-input-bg);
            color: var(--modal-input-text);
            font-size: 0.9rem;
            box-sizing: border-box;
        }
        
        .read-only-value {
            background-color: var(--bg-body);
            min-height: 38px;
            display: flex;
            align-items: center;
        }

        .client-preview-skills-section {
            grid-column: 1 / -1;
            background-color: var(--bg-body);
            border-radius: 0.5rem;
            border: 1px solid var(--border-color);
            padding: 1rem;
            margin-top: 1.5rem;
        }
        
        .assign-form-actions {
            grid-column: 1 / -1;
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
            margin-top: 1.5rem;
        }
        
        .assign-form-button {
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-weight: 600;
            border: none;
            cursor: pointer;
        }
        
        .assign-form-button.cancel {
            background-color: var(--confirm-modal-cancel-btn-bg);
            color: var(--confirm-modal-cancel-btn-text);
        }

        .assign-form-button.assign {
            background-color: var(--modal-create-btn-bg);
            color: var(--modal-create-btn-text);
        }

        .payment-status-tag {
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
    display: inline-block; /* Ensure it respects padding and background */
}

/* Payment Management Modal Specific Styles */
.payment-modal-content {
    max-width: 500px; /* Adjust max-width for payment modal */
    padding: 1.25rem; /* Reduced padding */
}

.payment-modal-client-details {
    background-color: var(--bg-body);
    border-radius: 0.5rem;
    padding: 0.75rem; /* Reduced padding */
    margin-top: 0.75rem; /* Reduced margin */
    border: 1px solid var(--border-color);
}

.payment-modal-client-details p {
    margin: 0.15rem 0; /* Reduced margin */
    font-size: 0.85rem; /* Slightly smaller font */
    color: var(--text-primary);
}

.payment-modal-client-details strong {
    font-weight: 600;
    color: var(--text-primary);
}

.payment-modal-options {
    margin-top: 1rem; /* Reduced margin */
    padding-top: 0.75rem; /* Reduced padding */
    border-top: 1px solid var(--border-color);
}

.payment-modal-options h4 {
    font-size: 0.95rem; /* Slightly smaller font */
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.5rem; /* Reduced margin */
}

.payment-modal-option-item {
    font-size: 0.8rem; /* Smaller font */
    color: var(--text-secondary);
    margin-bottom: 0.3rem; /* Reduced margin */
}

.payment-modal-option-item strong {
    color: var(--text-primary);
}

.modal-form .form-group {
    gap: 0.4rem; /* Reduced gap between label and input */
}

.modal-form .form-label {
    margin-bottom: 0; /* Remove default margin */
}

.modal-footer {
    margin-top: 1rem; /* Reduced margin */
    gap: 0.6rem; /* Reduced gap between buttons */
    /* Added for equal sizing and filling space */
    display: flex;
    justify-content: flex-end; /* Changed to flex-end */
    flex-wrap: wrap; /* Allow buttons to wrap on smaller screens */
}

.modal-footer button {
    flex-grow: 0; /* Changed to 0 */
    flex-basis: auto; /* Allow buttons to shrink as needed */
    min-width: unset; /* Reset min-width */
    padding: 0.75rem 1.5rem; /* Consistent padding */
    font-size: 0.9rem; /* Consistent font size */
}

.pay-now-btn {
    background-color: #007bff; /* Blue for Pay Now button */
    color: #ffffff;
    border-radius: 0.5rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s;
    display: flex; /* Ensure icon and text are aligned */
    align-items: center;
    justify-content: center;
    gap: 0.5rem; /* Space between icon and text */
}

.pay-now-btn:hover {
    background-color: #0056b3; /* Darker blue on hover */
}

/* Generated Link Section */
.generated-link-section {
    margin-top: 1rem; /* Reduced margin-top */
    padding-top: 0.75rem; /* Reduced padding-top */
    border-top: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: 0.75rem; /* Reduced gap */
}

.generated-link-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #28a745; /* Green for success */
    font-weight: 600;
    font-size: 0.9rem; /* Slightly smaller font */
}

.generated-link-input-group {
    display: flex;
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    overflow: hidden;
    background-color: var(--modal-input-bg);
}

.generated-link-input {
    flex-grow: 1;
    padding: 0.6rem 0.8rem; /* Reduced padding */
    border: none;
    outline: none;
    background-color: transparent;
    color: var(--modal-input-text);
    font-size: 0.85rem; /* Slightly smaller font */
    white-space: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch; /* For smooth scrolling on iOS */
    max-height: 3.5rem; /* Reduced max-height for scrollability */
    overflow-y: auto; /* Make it scrollable vertically */
}

.generated-link-actions {
    display: flex;
    gap: 0.4rem; /* Reduced gap */
    padding: 0.4rem; /* Reduced padding */
    border-left: 1px solid var(--border-color);
    flex-shrink: 0;
}

.generated-link-action-btn {
    padding: 0.5rem 0.7rem; /* Reduced padding */
    border-radius: 0.5rem;
    border: 1px solid var(--border-color);
    background-color: var(--bg-card);
    color: var(--text-primary);
    font-size: 0.75rem; /* Slightly smaller font */
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
    display: flex;
    align-items: center;
    gap: 0.3rem; /* Reduced gap */
    white-space: nowrap;
}

.generated-link-action-btn:hover {
    background-color: var(--bg-nav-link-hover);
}

.generated-link-close-btn {
    width: 100%;
    padding: 0.75rem 1.5rem;
    background-color: var(--confirm-modal-cancel-btn-bg);
    color: var(--confirm-modal-cancel-btn-text);
    border-radius: 0.5rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s;
    margin-top: 0.75rem; /* Reduced margin-top */
}

.generated-link-close-btn:hover {
    background-color: var(--confirm-modal-cancel-btn-hover);
}
       .payment-modal-content .generated-link-input-group {
                flex-direction: column;
            }

            .payment-modal-content .generated-link-action-btn {
                width: 100%;
                justify-content: center;
            }

            

      `}
        </style>



        <div className="client-management-page">
          <section className="client-details-page">
            <div className="client-details-page-header">
              <button
                className="back-to-list-button"
                onClick={handleCloseClientDetailsModal}
              >
                ← Back to Clients
              </button>

              <h3 className="client-details-page-title">
                Client Details: {selectedClientForDetails.firstName} {selectedClientForDetails.lastName}
              </h3>
            </div>

            {/* Tabs */}
            <div className="client-details-tabs">
              {['Profile', 'Applications', 'Interviews'].map((tab) => (
                <button
                  key={tab}
                  className={`tab-button ${activeClientDetailsTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveClientDetailsTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* SERVICE-BASED VIEW (same logic as before) */}
            {simplifiedServices.includes(selectedClientForDetails.service) ? (
              <div className="client-preview-grid-container" style={{ gridTemplateColumns: '1fr' }}>
                <div className="client-preview-section">
                  <h4 className="client-preview-section-title">Service Request Details</h4>

                  <div className="assign-form-group">
                    <label>First Name *</label>
                    <div className="read-only-value">{selectedClientForDetails.firstName || '-'}</div>
                  </div>
                  <div className="assign-form-group">
                    <label>Last Name *</label>
                    <div className="read-only-value">{selectedClientForDetails.lastName || '-'}</div>
                  </div>
                  <div className="assign-form-group">
                    <label>Mobile *</label>
                    <div className="read-only-value">{selectedClientForDetails.mobile || '-'}</div>
                  </div>
                  <div className="assign-form-group">
                    <label>Email ID *</label>
                    <div className="read-only-value">{selectedClientForDetails.email || '-'}</div>
                  </div>
                  <div className="assign-form-group">
                    <label>Service *</label>
                    <div className="read-only-value">{selectedClientForDetails.service || '-'}</div>
                  </div>

                  {selectedClientForDetails.subServices &&
                    selectedClientForDetails.subServices.length > 0 && (
                      <div className="assign-form-group">
                        <label>What service do you want?</label>
                        <div className="read-only-value">
                          {selectedClientForDetails.subServices.join(', ') || '-'}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            ) : (
              <>
                {/* PROFILE TAB */}
                {activeClientDetailsTab === 'Profile' && (
                  <div className="client-preview-grid-container">
                    <div className="client-preview-section">
                      <h4 className="client-preview-section-title">Personal Information</h4>
                      <div className="assign-form-group">
                        <label>First Name</label>
                        <div className="read-only-value">{selectedClientForDetails.firstName || '-'}</div>
                      </div>
                      <div className="assign-form-group">
                        <label>Middle Name</label>
                        <div className="read-only-value">{selectedClientForDetails.middleName || '-'}</div>
                      </div>
                      <div className="assign-form-group">
                        <label>Last Name</label>
                        <div className="read-only-value">{selectedClientForDetails.lastName || '-'}</div>
                      </div>
                      <div className="assign-form-group">
                        <label>Date of Birth</label>
                        <div className="read-only-value">{selectedClientForDetails.dob || '-'}</div>
                      </div>
                      <div className="assign-form-group">
                        <label>Gender</label>
                        <div className="read-only-value">{selectedClientForDetails.gender || '-'}</div>
                      </div>
                      <div className="assign-form-group">
                        <label>Ethnicity</label>
                        <div className="read-only-value">{selectedClientForDetails.ethnicity || '-'}</div>
                      </div>
                    </div>
                    <div className="client-preview-section">
                      <h4 className="client-preview-section-title">Contact Information</h4>
                      <div className="assign-form-group">
                        <label>Address</label>
                        <div className="read-only-value" style={{ minHeight: '60px' }}>{selectedClientForDetails.address || '-'}</div>
                      </div>
                      <div className="assign-form-group">
                        <label>County</label>
                        <div className="read-only-value">{selectedClientForDetails.county || '-'}</div>
                      </div>
                      <div className="assign-form-group">
                        <label>Zip Code</label>
                        <div className="read-only-value">{selectedClientForDetails.zipCode || '-'}</div>
                      </div>
                      <div className="assign-form-group">
                        <label>Mobile</label>
                        <div className="read-only-value">{selectedClientForDetails.mobile || '-'}</div>
                      </div>
                      <div className="assign-form-group">
                        <label>Email</label>
                        <div className="read-only-value">{selectedClientForDetails.email || '-'}</div>
                      </div>
                      <div className="assign-form-group">
                        <label>Country</label>
                        <div className="read-only-value">{selectedClientForDetails.country || '-'}</div>
                      </div>
                    </div>
                    <div className="client-preview-section">
                      <h4 className="client-preview-section-title">Employment Information</h4>
                      <div className="assign-form-group">
                        <label>Security Clearance</label>
                        <div className="read-only-value">{selectedClientForDetails.securityClearance || '-'}</div>
                      </div>
                      {selectedClientForDetails.securityClearance === 'yes' && (
                        <div className="assign-form-group">
                          <label>Clearance Level</label>
                          <div className="read-only-value">{selectedClientForDetails.clearanceLevel || '-'}</div>
                        </div>
                      )}
                      <div className="assign-form-group">
                        <label>Willing to Relocate</label>
                        <div className="read-only-value">{selectedClientForDetails.willingToRelocate || '-'}</div>
                      </div>
                      <div className="assign-form-group">
                        <label>Work Preference</label>
                        <div className="read-only-value">{selectedClientForDetails.workPreference || '-'}</div>
                      </div>
                      <div className="assign-form-group">
                        <label>Restricted Companies</label>
                        <div className="read-only-value">{selectedClientForDetails.restrictedCompanies || '-'}</div>
                      </div>
                      <div className="assign-form-group">
                        <label>Years of Experience</label>
                        <div className="read-only-value">{selectedClientForDetails.yearsOfExperience || '-'}</div>
                      </div>
                    </div>
                    <div className="client-preview-section">
                      <h4 className="client-preview-section-title">Job Preferences & Status</h4>
                      <div className="assign-form-group">
                        <label>Jobs to Apply</label>
                        <div className="read-only-value">{selectedClientForDetails.jobsToApply || '-'}</div>
                      </div>
                      <div className="assign-form-group">
                        <label>Current Salary</label>
                        <div className="read-only-value">{selectedClientForDetails.currentSalary || '-'}</div>
                      </div>
                      <div className="assign-form-group">
                        <label>Expected Salary</label>
                        <div className="read-only-value">{selectedClientForDetails.expectedSalary || '-'}</div>
                      </div>
                      <div className="assign-form-group">
                        <label>Visa Status</label>
                        <div className="read-only-value">{selectedClientForDetails.visaStatus || '-'}</div>
                      </div>
                      {selectedClientForDetails.visaStatus === 'other' && (
                        <div className="assign-form-group">
                          <label>Other Visa Status</label>
                          <div className="read-only-value">{selectedClientForDetails.otherVisaStatus || '-'}</div>
                        </div>
                      )}
                    </div>
                    <div className="client-preview-section">
                      <h4 className="client-preview-section-title">Education Details</h4>
                      {selectedClientForDetails.educationDetails && selectedClientForDetails.educationDetails.length > 0 ? (
                        selectedClientForDetails.educationDetails.map((edu, index) => (
                          <div key={index} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                            <h5 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Education Entry {index + 1}</h5>
                            <div className="assign-form-group">
                              <label>University Name:</label>
                              <div className="read-only-value">{edu.universityName || '-'}</div>
                            </div>
                            <div className="assign-form-group">
                              <label>University Address:</label>
                              <div className="read-only-value">{edu.universityAddress || '-'}</div>
                            </div>
                            <div className="assign-form-group">
                              <label>Course of Study:</label>
                              <div className="read-only-value">{edu.courseOfStudy || '-'}</div>
                            </div>
                            <div className="assign-form-group">
                              <label>Graduation From Date:</label>
                              <div className="read-only-value">{edu.graduationFromDate || '-'}</div>
                            </div>
                            <div className="assign-form-group">
                              <label>Graduation To Date:</label>
                              <div className="read-only-value">{edu.graduationToDate || '-'}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="read-only-value">No education details provided.</div>
                      )}
                    </div>
                    <div className="client-preview-section">
                      <h4 className="client-preview-section-title">Employment Details</h4>
                      <div className="assign-form-group">
                        <label>Current Company</label>
                        <div className="read-only-value">{selectedClientForDetails.currentCompany || '-'}</div>
                      </div>
                      <div className="assign-form-group">
                        <label>Current Designation</label>
                        <div className="read-only-value">{selectedClientForDetails.currentDesignation || '-'}</div>
                      </div>
                      <div className="assign-form-group">
                        <label>Notice Period</label>
                        <div className="read-only-value">{selectedClientForDetails.noticePeriod || '-'}</div>
                      </div>
                      <div className="assign-form-group">
                        <label>Preferred Interview Time</label>
                        <div className="read-only-value">{selectedClientForDetails.preferredInterviewTime || '-'}</div>
                      </div>
                      <div className="assign-form-group">
                        <label>Earliest Joining Date</label>
                        <div className="read-only-value">{selectedClientForDetails.earliestJoiningDate || '-'}</div>
                      </div>
                      <div className="assign-form-group">
                        <label>Relieving Date</label>
                        <div className="read-only-value">{selectedClientForDetails.relievingDate || '-'}</div>
                      </div>
                    </div>
                    <div className="client-preview-section">
                      <h4 className="client-preview-section-title">References</h4>
                      <div className="assign-form-group">
                        <label>Reference Name</label>
                        <div className="read-only-value">{selectedClientForDetails.referenceName || '-'}</div>
                      </div>
                      <div className="assign-form-group">
                        <label>Reference Phone</label>
                        <div className="read-only-value">{selectedClientForDetails.referencePhone || '-'}</div>
                      </div>
                      <div className="assign-form-group">
                        <label>Reference Address</label>
                        <div className="read-only-value">{selectedClientForDetails.referenceAddress || '-'}</div>
                      </div>
                      <div className="assign-form-group">
                        <label>Reference Email</label>
                        <div className="read-only-value">{selectedClientForDetails.referenceEmail || '-'}</div>
                      </div>
                      <div className="assign-form-group">
                        <label>Reference Role</label>
                        <div className="read-only-value">{selectedClientForDetails.referenceRole || '-'}</div>
                      </div>
                    </div>
                    <div className="client-preview-section">
                      <h4 className="client-preview-section-title">Job Portal Accounts</h4>
                      <div className="assign-form-group">
                        <label>Account Name</label>
                        <div className="read-only-value">{selectedClientForDetails.jobPortalAccountNameandCredentials || '-'}</div>
                      </div>
                    </div>
                    <div className="client-preview-section">
                      <h4 className="client-preview-section-title">Resume(s)</h4>
                      {selectedClientForDetails.resumes && selectedClientForDetails.resumes.length > 0 ? (
                        selectedClientForDetails.resumes.map((resume, index) => (
                          <div key={index} className="assign-form-group">
                            <label>Resume {index + 1}</label>
                            <div className="read-only-value" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{resume.name}</span>
                              <a href={resume.url} download={resume.name} target="_blank" rel="noopener noreferrer" className="assign-form-button assign" style={{ textDecoration: 'none' }}>Download</a>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="read-only-value">No resumes uploaded.</div>
                      )}
                    </div>
                    <div className="client-preview-section">
                      <h4 className="client-preview-section-title">Cover Letter</h4>
                      {selectedClientForDetails.coverLetterUrl ? (
                        <div className="assign-form-group">
                          <label>File Name</label>
                          <div className="read-only-value" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{selectedClientForDetails.coverLetterFileName || 'cover_letter.pdf'}</span>
                            {selectedClientForDetails.coverLetterUrl && (<a href={selectedClientForDetails.coverLetterUrl} download={selectedClientForDetails.coverLetterFileName || 'cover_letter.pdf'} target="_blank" rel="noopener noreferrer" className="assign-form-button assign" style={{ textDecoration: 'none' }}>Download</a>)}
                          </div>
                        </div>
                      ) : (
                        <div className="read-only-value">No cover letter uploaded.</div>
                      )}
                    </div>
                    <div className="assign-form-actions">
                      <button className="assign-form-button assign" onClick={handleEditClientDetailsClick}>
                        Edit Client Details
                      </button>
                    </div>
                  </div>

                )}

                {/* APPLICATIONS TAB – reuse existing table component */}
                {activeClientDetailsTab === 'Applications' && (
                  () => {
                    // --- 1. Build filtered list ---

                    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

                    const filteredApps = clientApplications.filter((app) => {
                      if (!app.appliedDate) return false;

                      const appDate = new Date(app.appliedDate);
                      const appDateStr = appDate.toISOString().split('T')[0];

                      // 👉 DEFAULT: no filters → show ALL applications
                      if (!clientDateRange.startDate && !clientDateRange.endDate) {
                        return true;
                      }

                      // 👉 If filters are set → use From / To range
                      const start = clientDateRange.startDate ? new Date(clientDateRange.startDate) : null;
                      const end = clientDateRange.endDate ? new Date(clientDateRange.endDate) : null;

                      if (start) {
                        start.setHours(0, 0, 0, 0);
                      }
                      if (end) {
                        end.setHours(23, 59, 59, 999);
                      }

                      return (!start || appDate >= start) && (!end || appDate <= end);
                    });

                    // --- 2. Pagination (5 per page) ---

                    const totalPages = Math.max(1, Math.ceil(filteredApps.length / CLIENT_APPS_PAGE_SIZE));
                    const safePage = Math.min(clientAppsPage, totalPages);
                    const startIndex = (safePage - 1) * CLIENT_APPS_PAGE_SIZE;
                    const endIndex = startIndex + CLIENT_APPS_PAGE_SIZE;
                    const paginatedApps = filteredApps.slice(startIndex, endIndex);
                    return (
                      <div className="applications-tab-content">
                        <div className="date-filter" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label>From: </label>
                          <input
                            type="date"
                            value={clientDateRange.startDate}
                            onChange={(e) =>
                              setClientDateRange((prev) => ({ ...prev, startDate: e.target.value }))
                            }
                          />
                          <label style={{ marginLeft: '1rem' }}>To: </label>
                          <input
                            type="date"
                            value={clientDateRange.endDate}
                            onChange={(e) =>
                              setClientDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                            }
                          />
                        </div>

                        <table className="client-table">
                          <thead>
                            <tr>
                              <th>Employee Name</th>
                              <th>Client Name</th>
                              <th>Applied Date</th>
                              <th>Company</th>
                              <th>Job Title</th>
                              <th>Job ID</th>
                              <th>Job Boards</th>
                              <th>Description Link</th>
                              <th>Applied Time</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedApps.map((app, idx) => (
                              <tr key={idx}>
                                <td>{app.employeeName || '-'}</td>
                                <td>{selectedClientForDetails?.firstName || '-'}</td>
                                <td>{app.appliedDate || '-'}</td>
                                <td>{app.company || '-'}</td>
                                <td>{app.jobTitle || '-'}</td>
                                <td>{app.jobId || '-'}</td>
                                <td>{app.jobBoards || '-'}</td>
                                <td>
                                  {app.jobDescriptionUrl ? (
                                    <a href={app.jobDescriptionUrl} target="_blank" rel="noreferrer" style={{ color: 'Blue', textAlign: "center" }}>
                                      Link
                                    </a>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                                <td>{app.timestamp || '-'}</td>
                                <td>{app.status || '-'}</td>
                                <td>
                                  <i
                                    className="fa fa-eye action-icon view"
                                    title="View"
                                    onClick={() => {
                                      setSelectedApplication(app);
                                      setIsAppViewModalOpen(true);
                                    }}
                                    style={{ cursor: 'pointer', marginRight: '10px', color: '#007bff' }}
                                  />
                                  <i
                                    className="fa fa-edit action-icon edit"
                                    title="Edit"
                                    onClick={() => {
                                      setSelectedApplication(app);
                                      setIsAppEditModalOpen(true);
                                    }}
                                    style={{ cursor: 'pointer', marginRight: '10px', color: '#28a745' }}
                                  />
                                  <i
                                    className="fa fa-trash action-icon delete"
                                    title="Delete"
                                    onClick={() => {
                                      setSelectedApplication(app);
                                      setIsAppDeleteConfirmOpen(true);
                                    }}
                                    style={{ cursor: 'pointer', color: '#dc3545' }}
                                  />
                                </td>
                              </tr>
                            ))}
                            {filteredApps.length === 0 && (
                              <tr>
                                <td colSpan="11" style={{ textAlign: 'center' }}>
                                  No applications found
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>

                        {/* Pagination controls (always 5 per page) */}
                        {filteredApps.length > 0 && (
                          <div
                            style={{
                              marginTop: '12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '0.875rem',
                            }}
                          >
                            <div>
                              Showing{' '}
                              <strong>
                                {filteredApps.length === 0 ? 0 : startIndex + 1} –{' '}
                                {Math.min(endIndex, filteredApps.length)}
                              </strong>{' '}
                              of <strong>{filteredApps.length}</strong> applications
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => setClientAppsPage((p) => Math.max(1, p - 1))}
                                disabled={safePage === 1}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '4px',
                                  border: '1px solid #d1d5db',
                                  backgroundColor: safePage === 1 ? '#e5e7eb' : '#ffffff',
                                  cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                                }}
                              >
                                Previous
                              </button>
                              <span>
                                Page <strong>{safePage}</strong> of <strong>{totalPages}</strong>
                              </span>
                              <button
                                onClick={() =>
                                  setClientAppsPage((p) => Math.min(totalPages, p + 1))
                                }
                                disabled={safePage === totalPages}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '4px',
                                  border: '1px solid #d1d5db',
                                  backgroundColor: safePage === totalPages ? '#e5e7eb' : '#ffffff',
                                  cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                                }}
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                {/* INTERVIEWS TAB – reuse existing table component */}
                {activeClientDetailsTab === 'Interviews' && (
                  <div className="interviews-tab-content">
                    <table className="client-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Client</th>
                          <th>Job Title</th>
                          <th>Company</th>
                          <th>Round</th>
                          <th>Attachments</th>
                          <th>Time</th>
                          <th>Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientInterviews.length > 0 ? (
                          clientInterviews.map((interview, idx) => (
                            <tr key={idx}>
                              <td>{interview.employeeName || '-'}</td>
                              <td>{selectedClientForDetails?.firstName || '-'}</td>
                              <td>{interview.jobTitle || '-'}</td>
                              <td>{interview.company || '-'}</td>
                              <td>{interview.round || '-'}</td>
                              <td>
                                {interview.attachments ? (
                                  <a href={interview.attachments} target="_blank" rel="noreferrer">
                                    View
                                  </a>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td>{interview.time || '-'}</td>
                              <td>{interview.date || '-'}</td>
                              <td>{interview.status || '-'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="9" style={{ textAlign: 'center' }}>No interviews found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    );
  }



  return (
    <div className="ad-body-container">
      <style>{`
        /* Import Inter font from Google Fonts */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        :root {
          --bg-body: #f3f4f6;
          --bg-card: #ffffff;
          --text-primary: #1f2937;
          --text-secondary: #6b7280;
          --border-color: #e5e7eb;
          --shadow-color-1: rgba(0, 0, 0, 0.05);
          --shadow-color-3: rgba(0, 0, 0, 0.04);
          --modal-overlay-bg: rgba(0, 0, 0, 0.5);
          --modal-bg: #ffffff;
          --modal-border: #e5e7eb;
          --modal-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          --modal-title-color: #1f2937;
          --modal-subtitle-color: #6b7280;
          --modal-close-btn-color: #6b7280;
          --modal-close-btn-hover: #1f2937;
          --modal-input-border: #d1d5db;
          --modal-input-bg: #ffffff;
          --modal-input-text: #1f2937;
          --modal-focus-border: #2563eb;
          --modal-label-color: #374151;
          --dept-table-header-bg: #f9fafb;
          --dept-table-header-text: #6b7280;
          --dept-table-row-hover-bg: #f9fafb;
          --action-btn-border: #e5e7eb;
          --action-btn-text: #4b5563;
          --action-btn-hover-bg: #f9fafb;
          --delete-btn-bg: #EF4444;
          --delete-btn-hover-bg: #DC2626;
          --delete-btn-text: #ffffff;
          --confirm-modal-cancel-btn-bg: #e5e7eb;
          --confirm-modal-cancel-btn-text: #4b5563;
          --confirm-modal-cancel-btn-hover: #d1d5db;
          --modal-create-btn-bg: #2563eb;
          --modal-create-btn-text: #ffffff;
          --modal-create-btn-hover: #1d4ed8;

          /* Client Management Specific Colors */
          --client-filter-tab-bg-active-registered: #E6F0FF;
          --client-filter-tab-text-active-registered: #3A60EE;
          --client-filter-tab-badge-registered: #3A60EE;
          --client-filter-tab-bg-active-unassigned: #FEF3C7;
          --client-filter-tab-text-active-unassigned: #B45309;
          --client-filter-tab-badge-unassigned: #B45309;
          --client-filter-tab-bg-active-active: #D9F5E6;
          --client-filter-tab-text-active-active: #28A745;
          --client-filter-tab-badge-active: #28A745;
          --client-filter-tab-bg-active-rejected: #FFEDEE;
          --client-filter-tab-text-active-rejected: #DC3545;
          --client-filter-tab-badge-rejected: #DC3545;
          --client-filter-tab-bg-active-restored: #F0E6FF;
          --client-filter-tab-text-active-restored: #6A40EE;
          --client-filter-tab-badge-restored: #6A40EE;
        }

        .ad-body-container {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg-body);
            min-height: 100vh;
            flex-direction: column;
            color: var(--text-primary);
        }

        /* Client Management Styles */

        .client-details-tabs {
  display: flex;
  justify-content: center;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 1rem;
}

.tab-button {
  flex: 1;
  padding: 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.scroll-btn {
  position: fixed;
  bottom: 90px;
  right: 25px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #007bff;
  color: #fff;
  font-size: 1.5rem;
  border: none;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0px 4px 10px rgba(0,0,0,0.15);
  transition: background 0.3s ease;
  z-index: 9999;
}

.scroll-btn:hover {
  background: #0058c9;
}


.tab-button:hover {
  background-color: var(--bg-body);
}

.tab-button.active {
  color: #007bff;
  border-bottom: 3px solid #007bff;
  font-weight: 600;
}

.action-icon {
  font-size: 1.1rem;
  transition: transform 0.2s ease;
}

.action-icon.view { color: #007bff; }
.action-icon.edit { color: #28a745; }
.action-icon.delete { color: #dc3545; }

.action-icon:hover {
  transform: scale(1.2);
}


        .client-management-container {
           padding: 0 1.5rem 1.5rem;
        }

        .client-management-box {
            background-color: var(--bg-card);
            border-radius: 0.75rem;
            box-shadow: 0 4px 6px -1px var(--shadow-color-1), 0 2px 4px -1px var(--shadow-color-3);
            border: 1px solid var(--border-color);
            padding: 1.5rem;
             margin-top: 2.9rem;
        }

        .client-management-header-section {
            display: flex;
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 1.5rem;
        }

        .client-management-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
            
        }

        .client-details-page {
  margin-top: 24px;
  padding: 20px;
  background: var(--bg-color);
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
}

.client-details-page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.back-to-list-button {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--primary-color);
}


        .client-filter-tabs {
            position: relative;
            display: flex;
            border-radius: 0.5rem;
            background-color: #EEE;
            box-shadow: 0 0 0px 1px rgba(0, 0, 0, 0.06);
            padding: 0.25rem;
            width: 100%;
            font-size: 14px;
            margin: 0 auto 20px auto;
            overflow-x: auto;
            white-space: nowrap;
            flex-wrap: wrap;
            justify-content: center;
        }

        .client-filter-tab-item {
            flex-shrink: 0;
            flex-grow: 1;
            text-align: center;
            display: flex;
            cursor: pointer;
            align-items: center;
            justify-content: center;
            border-radius: 0.5rem;
            border: none;
            padding: .5rem 10px;
            transition: all .15s ease-in-out;
            color: rgba(51, 65, 85, 1);
            font-weight: normal;
            margin: 0 2px 5px 2px;
        }

        .client-filter-tab-item input[type="radio"] {
            display: none;
        }

        .client-filter-tab-item input[type="radio"]:checked + .client-filter-tab-label {
            font-weight: 600;
        }
        
        .client-filter-tab-label {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            border-radius: 0.5rem;
            padding: 0.3rem;
        }

        .client-filter-tab-item .badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 20px;
            height: 20px;
            border-radius: 50%;
            color: white;
            font-size: 0.75em;
            font-weight: bold;
            padding: 0 6px;
            margin-left: 5px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            transition: background-color 0.15s ease;
        }

        .client-filter-tab-item.registered input[type="radio"]:checked + .client-filter-tab-label { background-color: var(--client-filter-tab-bg-active-registered); color: var(--client-filter-tab-text-active-registered); }
        .client-filter-tab-item.registered .badge { background-color: var(--client-filter-tab-badge-registered); }
        .client-filter-tab-item.unassigned input[type="radio"]:checked ~ .client-filter-tab-label { background-color: var(--client-filter-tab-bg-active-unassigned); color: var(--client-filter-tab-text-active-unassigned); }
        .client-filter-tab-item.unassigned .badge { background-color: var(--client-filter-tab-badge-unassigned); }
        .client-filter-tab-item.active input[type="radio"]:checked ~ .client-filter-tab-label { background-color: var(--client-filter-tab-bg-active-active); color: var(--client-filter-tab-text-active-active); }
        .client-filter-tab-item.active .badge { background-color: var(--client-filter-tab-badge-active); }
        .client-filter-tab-item.rejected input[type="radio"]:checked ~ .client-filter-tab-label { background-color: var(--client-filter-tab-bg-active-rejected); color: var(--client-filter-tab-text-active-rejected); }
        .client-filter-tab-item.rejected .badge { background-color: var(--client-filter-tab-badge-rejected); }
        .client-filter-tab-item.restored input[type="radio"]:checked ~ .client-filter-tab-label { background-color: var(--client-filter-tab-bg-active-restored); color: var(--client-filter-tab-text-active-restored); }
        .client-filter-tab-item.restored .badge { background-color: var(--client-filter-tab-badge-restored); }

        .client-search-and-filter-group {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            margin-bottom: 1.5rem;
            align-items: flex-end;
        }

        .client-search-input-group {
            display: flex;
            align-items: center;
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            overflow: hidden;
            background-color: var(--bg-card);
            flex-grow: 1;
            min-width: 200px;
        }

        .client-search-input-group .search-icon-wrapper {
            padding: 0.75rem 1rem;
            color: var(--text-secondary);
            background-color: var(--bg-card);
            border-right: 1px solid var(--border-color);
        }

        .client-search-input-group .client-search-input {
            flex-grow: 1;
            padding: 0.75rem 1rem;
            border: none;
            outline: none;
            background-color: var(--bg-card);
            color: var(--text-primary);
            font-size: 0.9rem;
        }

        .pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin: 25px 0;
  font-size: 1rem;
}

.pagination-btn {
  background-color: #3b82f6; /* Blue */
  color: #ffffff;
  border: none;
  padding: 10px 18px;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.25s ease-in-out;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.35);
}

.pagination-btn:hover:not(:disabled) {
  background-color: #2563eb;
  transform: translateY(-2px);
}

.pagination-btn:disabled {
  background-color: #cccccc;
  color: #666666;
  cursor: not-allowed;
  box-shadow: none;
}

.pagination-info {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  background: rgba(59, 130, 246, 0.08);
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.2);
}


        .service-filter-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            flex-grow: 1;
            min-width: 180px;
        }

        .service-filter-group .form-label {
            font-size: 1.25rem;
            font-weight: 500;
            color: var(--modal-label-color);
        }

        .service-filter-group .form-select {
            padding: 0.75rem 1rem;
            border: 1px solid var(--modal-input-border);
            border-radius: 0.5rem;
            background-color: var(--modal-input-bg);
            color: var(--modal-input-text);
            font-size: 0.9rem;
            width: 100%;
        }

        .client-table-title {
            margin-bottom: 1rem;
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
            text-align: center;
        }

        .client-table-container {
            overflow-x: auto;
        }

        .client-table {
            width: 100%;
            border-collapse: collapse;
            background-color: var(--bg-card);
        }

        .client-table th, .client-table td {
            padding: 1rem;
            text-align: left;
            white-space: nowrap;
            border-bottom: 1px solid var(--border-color);
        }

        .client-table thead th {
            background-color: var(--dept-table-header-bg);
            color: var(--dept-table-header-text);
            font-size: 0.875rem;
            font-weight: 600;
            text-transform: uppercase;
          
        }

        .client-table tbody tr:last-child td {
            border-bottom: none;
        }

        .client-table tbody tr:nth-child(even) {
            background-color: var(--bg-body);
        }

        .client-table tbody tr:hover {
            background-color: var(--dept-table-row-hover-bg);
        }
        
        .client-table .action-buttons {
            display: flex;
            gap: 0.5rem;
            justify-content: flex-start;
            align-items: center;
        }

        .client-table .action-button {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 0.85em;
            font-weight: 600;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            transition: all 0.2s ease;
        }
        
        .client-table .action-button:hover {
            transform: translateY(-1px);
        }
        
        .client-table .action-button.view { background-color: #e0e7ff; color: #3730a3; }
        .client-table .action-button.accept { background-color: #28a745; color: white; }
        .client-table .action-button.decline { background-color: #dc3545; color: white; }
        .client-table .action-button.assign { background-color: #007bff; color: white; }
        .client-table .action-button.restore { background-color: #6f42c1; color: white; }
        .client-table .action-button.edit-manager { background-color: #007bff; color: white; }
        .client-table .action-button.save { background-color: #28a745; color: white; }
        .client-table .action-button.cancel { background-color: #6c757d; color: white; }
        .client-table .action-button.delete-btn { background-color: var(--delete-btn-bg); color: var(--delete-btn-text); }
         .client-table td .action-button.send-payment-link {
         background-color: #28a745; /* Green color for payment link */
           color: white;
           display: flex;
           align-items: center;
           gap: 0.5rem;
           }
          .client-table td .action-button.send-payment-link:hover {
          background-color: #218838;
           } 

        .client-table .manager-select {
            padding: 6px 8px;
            border-radius: 5px;
            border: 1px solid var(--border-color);
            background-color: var(--bg-card);
            color: var(--text-primary);
            font-size: 0.85em;
            width: 100%;
        }

        .all-services-list {
            display: flex;
            flex-direction: column;
            gap: 2rem;
            margin-top: 1.5rem;
        }

        .service-table-list-item {
            background-color: var(--bg-card);
            border-radius: 0.75rem;
            box-shadow: 0 4px 6px -1px var(--shadow-color-1), 0 2px 4px -1px var(--shadow-color-3);
            border: 1px solid var(--border-color);
            padding: 1.5rem;
            width: 100%;
        }

        .client-table .action-button.select-manager {
            background-color: #f0f0f0;
            color: #333;
            border: 1px solid #ccc;
        }
        
        /* Manager Select Modal Styles */
        .manager-select-modal {
            max-width: 450px;
        }
             .manager-search-container {
            margin-top: 1rem;
        }
        .manager-search-input {
            width: 100%;
            padding: 0.75rem 1rem;
            border: 1px solid var(--modal-input-border);
            border-radius: 0.5rem;
            font-size: 1rem;
        }
        .manager-list {
             display: flex;
            flex-direction: column;
            gap: 0.75rem;
            margin-top: 1rem;
            max-height: 300px; /* Add max-height for scrollability */
            overflow-y: auto;
        }
        .manager-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 0.75rem;
            border-radius: 0.5rem;
            cursor: pointer;
            transition: background-color 0.2s ease;
        }
        .manager-item:hover {
            background-color: var(--dept-table-row-hover-bg);
        }
        .manager-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: #007bff;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            flex-shrink: 0;
        }
        .manager-info {
            display: flex;
            flex-direction: column;
        }
        .manager-name {
            font-weight: 600;
            color: var(--text-primary);
        }
        .manager-email {
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        /* Modal Styles */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: var(--modal-overlay-bg);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease, visibility 0.3s ease;
        }

        .modal-overlay.open {
            opacity: 1;
            visibility: visible;
        }

        .modal-content {
            background-color: var(--modal-bg);
            border-radius: 0.75rem;
            box-shadow: var(--modal-shadow);
            border: 1px solid var(--modal-border);
            width: 90%;
            max-width: 500px;
            padding: 1.5rem;
            position: relative;
            transform: translateY(-20px);
            opacity: 0;
            transition: transform 0.3s ease, opacity 0.3s ease;
        }
        
        .modal-overlay.open .modal-content {
            transform: translateY(0);
            opacity: 1;
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 1rem;
        }

        .modal-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--modal-title-color);
        }
        
        .modal-subtitle {
            font-size: 0.875rem;
            color: var(--modal-subtitle-color);
            margin-top: 0.25rem;
        }

        .modal-close-btn {
            background: none;
            border: none;
            font-size: 1.5rem;
            color: var(--modal-close-btn-color);
            cursor: pointer;
        }
        
        .confirm-modal-buttons {
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
            margin-top: 1.5rem;
        }

        .confirm-cancel-btn, .confirm-delete-btn {
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-weight: 500;
            border: none;
            cursor: pointer;
        }

        .confirm-cancel-btn {
            background-color: var(--confirm-modal-cancel-btn-bg);
            color: var(--confirm-modal-cancel-btn-text);
        }
        
        .confirm-delete-btn {
            background-color: var(--delete-btn-bg);
            color: var(--delete-btn-text);
        }

        .assign-modal-content {
            background-color: var(--modal-bg);
            border-radius: 0.75rem;
            width: 90%;
            max-width: 900px; 
            padding: 1.5rem;
            position: relative;
            overflow-y: auto;
            max-height: 90vh;
        }

        .assign-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 1.5rem;
        }

        .assign-modal-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--modal-title-color);
        }

        .assign-modal-close-button {
            background: none;
            border: none;
            font-size: 1.5rem;
            color: var(--modal-close-btn-color);
            cursor: pointer;
        }

        .client-preview-grid-container {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1.5rem;
        }

        @media (min-width: 768px) {
            .client-preview-grid-container {
                grid-template-columns: repeat(2, 1fr);
            }
        }

        .client-preview-section {
            background-color: var(--bg-body);
            border-radius: 0.5rem;
            border: 1px solid var(--border-color);
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }

        .client-preview-section-title {
            font-size: 1rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid var(--border-color);
        }

        .assign-form-group {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }

        .assign-form-group label {
            font-size: 0.75rem;
            font-weight: 500;
            color: var(--text-secondary);
            text-transform: uppercase;
        }
        
        .assign-form-group input, .assign-form-group select, .assign-form-group textarea, .read-only-value {
            width: 100%;
            padding: 0.6rem 0.8rem;
            border: 1px solid var(--modal-input-border);
            border-radius: 0.4rem;
            background-color: var(--modal-input-bg);
            color: var(--modal-input-text);
            font-size: 0.9rem;
            box-sizing: border-box;
        }
        
        .read-only-value {
            background-color: var(--bg-body);
            min-height: 38px;
            display: flex;
            align-items: center;
        }

        .client-preview-skills-section {
            grid-column: 1 / -1;
            background-color: var(--bg-body);
            border-radius: 0.5rem;
            border: 1px solid var(--border-color);
            padding: 1rem;
            margin-top: 1.5rem;
        }
        
        .assign-form-actions {
            grid-column: 1 / -1;
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
            margin-top: 1.5rem;
        }
        
        .assign-form-button {
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-weight: 600;
            border: none;
            cursor: pointer;
        }
        
        .assign-form-button.cancel {
            background-color: var(--confirm-modal-cancel-btn-bg);
            color: var(--confirm-modal-cancel-btn-text);
        }

        .assign-form-button.assign {
            background-color: var(--modal-create-btn-bg);
            color: var(--modal-create-btn-text);
        }

        .payment-status-tag {
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
    display: inline-block; /* Ensure it respects padding and background */
}

/* Payment Management Modal Specific Styles */
.payment-modal-content {
    max-width: 500px; /* Adjust max-width for payment modal */
    padding: 1.25rem; /* Reduced padding */
}

.payment-modal-client-details {
    background-color: var(--bg-body);
    border-radius: 0.5rem;
    padding: 0.75rem; /* Reduced padding */
    margin-top: 0.75rem; /* Reduced margin */
    border: 1px solid var(--border-color);
}

.payment-modal-client-details p {
    margin: 0.15rem 0; /* Reduced margin */
    font-size: 0.85rem; /* Slightly smaller font */
    color: var(--text-primary);
}

.payment-modal-client-details strong {
    font-weight: 600;
    color: var(--text-primary);
}

.payment-modal-options {
    margin-top: 1rem; /* Reduced margin */
    padding-top: 0.75rem; /* Reduced padding */
    border-top: 1px solid var(--border-color);
}

.payment-modal-options h4 {
    font-size: 0.95rem; /* Slightly smaller font */
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.5rem; /* Reduced margin */
}

.payment-modal-option-item {
    font-size: 0.8rem; /* Smaller font */
    color: var(--text-secondary);
    margin-bottom: 0.3rem; /* Reduced margin */
}

.payment-modal-option-item strong {
    color: var(--text-primary);
}

.modal-form .form-group {
    gap: 0.4rem; /* Reduced gap between label and input */
}

.modal-form .form-label {
    margin-bottom: 0; /* Remove default margin */
}

.modal-footer {
    margin-top: 1rem; /* Reduced margin */
    gap: 0.6rem; /* Reduced gap between buttons */
    /* Added for equal sizing and filling space */
    display: flex;
    justify-content: flex-end; /* Changed to flex-end */
    flex-wrap: wrap; /* Allow buttons to wrap on smaller screens */
}

.modal-footer button {
    flex-grow: 0; /* Changed to 0 */
    flex-basis: auto; /* Allow buttons to shrink as needed */
    min-width: unset; /* Reset min-width */
    padding: 0.75rem 1.5rem; /* Consistent padding */
    font-size: 0.9rem; /* Consistent font size */
}

.pay-now-btn {
    background-color: #007bff; /* Blue for Pay Now button */
    color: #ffffff;
    border-radius: 0.5rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s;
    display: flex; /* Ensure icon and text are aligned */
    align-items: center;
    justify-content: center;
    gap: 0.5rem; /* Space between icon and text */
}

.pay-now-btn:hover {
    background-color: #0056b3; /* Darker blue on hover */
}

/* Generated Link Section */
.generated-link-section {
    margin-top: 1rem; /* Reduced margin-top */
    padding-top: 0.75rem; /* Reduced padding-top */
    border-top: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: 0.75rem; /* Reduced gap */
}

.generated-link-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #28a745; /* Green for success */
    font-weight: 600;
    font-size: 0.9rem; /* Slightly smaller font */
}

.generated-link-input-group {
    display: flex;
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    overflow: hidden;
    background-color: var(--modal-input-bg);
}

.generated-link-input {
    flex-grow: 1;
    padding: 0.6rem 0.8rem; /* Reduced padding */
    border: none;
    outline: none;
    background-color: transparent;
    color: var(--modal-input-text);
    font-size: 0.85rem; /* Slightly smaller font */
    white-space: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch; /* For smooth scrolling on iOS */
    max-height: 3.5rem; /* Reduced max-height for scrollability */
    overflow-y: auto; /* Make it scrollable vertically */
}

.generated-link-actions {
    display: flex;
    gap: 0.4rem; /* Reduced gap */
    padding: 0.4rem; /* Reduced padding */
    border-left: 1px solid var(--border-color);
    flex-shrink: 0;
}

.generated-link-action-btn {
    padding: 0.5rem 0.7rem; /* Reduced padding */
    border-radius: 0.5rem;
    border: 1px solid var(--border-color);
    background-color: var(--bg-card);
    color: var(--text-primary);
    font-size: 0.75rem; /* Slightly smaller font */
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
    display: flex;
    align-items: center;
    gap: 0.3rem; /* Reduced gap */
    white-space: nowrap;
}

.generated-link-action-btn:hover {
    background-color: var(--bg-nav-link-hover);
}

.generated-link-close-btn {
    width: 100%;
    padding: 0.75rem 1.5rem;
    background-color: var(--confirm-modal-cancel-btn-bg);
    color: var(--confirm-modal-cancel-btn-text);
    border-radius: 0.5rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s;
    margin-top: 0.75rem; /* Reduced margin-top */
}

.generated-link-close-btn:hover {
    background-color: var(--confirm-modal-cancel-btn-hover);
}
       .payment-modal-content .generated-link-input-group {
                flex-direction: column;
            }

            .payment-modal-content .generated-link-action-btn {
                width: 100%;
                justify-content: center;
            }

            

      `}
      </style>

      <main >
        <div className="client-management-container">
          <div className="client-management-box">
            <div className="client-management-header-section">
              <h2 className="client-management-title">Client Details Management</h2>
            </div>

            {/* Client Filter Tabs */}
            <div className="client-filter-tabs">
              {[
                {
                  label: 'Registered Clients',
                  value: 'registered',
                  count: derivedCounts.registered,
                  activeBg: 'var(--client-filter-tab-bg-active-registered)',
                  activeColor: 'var(--client-filter-tab-text-active-registered)',
                  badgeBg: 'var(--client-filter-tab-badge-registered)'
                },
                {
                  label: 'Unassigned Clients',
                  value: 'unassigned',
                  count: derivedCounts.unassigned,
                  activeBg: 'var(--client-filter-tab-bg-active-unassigned)',
                  activeColor: 'var(--client-filter-tab-text-active-unassigned)',
                  badgeBg: 'var(--client-filter-tab-badge-unassigned)'
                },
                {
                  label: 'Active Clients',
                  value: 'active',
                  count: derivedCounts.active,
                  activeBg: 'var(--client-filter-tab-bg-active-active)',
                  activeColor: 'var(--client-filter-tab-text-active-active)',
                  badgeBg: 'var(--client-filter-tab-badge-active)'
                },
                {
                  label: 'Rejected Clients',
                  value: 'rejected',
                  count: derivedCounts.rejected,
                  activeBg: 'var(--client-filter-tab-bg-active-rejected)',
                  activeColor: 'var(--client-filter-tab-text-active-rejected)',
                  badgeBg: 'var(--client-filter-tab-badge-rejected)'
                },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`client-filter-tab-item ${option.value}`}
                  style={{
                    backgroundColor: clientFilter === option.value ? option.activeBg : 'transparent',
                    color: clientFilter === option.value ? option.activeColor : 'rgba(51, 65, 85, 1)',
                  }}
                >
                  <input
                    type="radio"
                    name="client-filter"
                    value={option.value}
                    checked={clientFilter === option.value}
                    onChange={(e) => {
                      setClientFilter(e.target.value);
                      setClientSearchTerm('');
                      // selectedServiceFilter state is intentionally NOT reset here, to maintain selection across tabs
                    }}
                  />
                  <span className="client-filter-tab-label">{option.label}</span>
                  <span className="badge" style={{ backgroundColor: clientFilter === option.value ? option.badgeBg : '#9AA0A6' }}>
                    {option.count}
                  </span>
                </label>
              ))}
            </div>

            {/* Search Input and Service Dropdown */}
            <div className="client-search-and-filter-group">
              <div className="client-search-input-group">
                <span className="search-icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" style={{ width: '1rem', height: '1rem' }}>
                    <path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.1-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z" />
                  </svg>
                </span>
                <input
                  type="text"
                  id="clientSearch"
                  placeholder="Search clients by name, email, mobile, job, or country"
                  className="client-search-input"
                  value={clientSearchTerm}
                  onChange={handleClientSearchChange}
                />
              </div>


              <div className="service-filter-group">
                <label htmlFor="serviceFilter" className="form-label" style={{ fontSize: '20px' }}>Services:</label>
                <select
                  id="serviceFilter"
                  name="serviceFilter"


                  className="form-select"
                  value={selectedServiceFilter}
                  onChange={(e) => setSelectedServiceFilter(e.target.value)}
                >
                  {serviceOptions.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {selectedServiceFilter === 'All' ? (
              renderAllServiceTables()
            ) : (
              <>
                <h4 className="client-table-title">
                  {selectedServiceFilter} Clients ({filteredClients.length})
                </h4>
                {renderClientTable(paginatedClients, selectedServiceFilter, clientFilter)}
              </>
            )}

          </div>
        </div>
      </main>

      {/* Delete Client Confirmation Modal */}
      {isDeleteClientConfirmModalOpen && (
        <div className="modal-overlay open">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Confirm Deletion</h3>
              <button className="modal-close-btn" onClick={handleCancelClientDelete}>&times;</button>
            </div>
            <p className="modal-subtitle">Are you sure you want to delete this client? This action cannot be undone.</p>
            <div className="confirm-modal-buttons">
              <button type="button" className="confirm-cancel-btn" onClick={handleCancelClientDelete}>Cancel</button>
              <button type="button" className="confirm-delete-btn" onClick={handleConfirmClientDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {isManagerModalOpen && registrationForManager && (
        <div className="modal-overlay open">
          <div className="modal-content manager-select-modal">
            <div className="modal-header">
              <h3 className="modal-title">Select Manager for {registrationForManager.firstName}</h3>
              <button className="modal-close-btn" onClick={handleCloseManagerModal}>&times;</button>
            </div>

            <div className="manager-search-container">
              <input
                type="text"
                placeholder="Search managers by name..."
                className="manager-search-input"
                value={managerSearchTerm}
                onChange={(e) => setManagerSearchTerm(e.target.value)}
              />
            </div>

            <div className="manager-list">
              {managerList
                .filter(manager =>
                  `${manager.firstName} ${manager.lastName}`.toLowerCase().includes(managerSearchTerm.toLowerCase())
                )
                .map(manager => (
                  <div key={manager.firebaseKey} className="manager-item" onClick={() => handleSelectManager(manager)}>
                    <div className="manager-avatar">{`${(manager.firstName || ' ').charAt(0)}${(manager.lastName || ' ').charAt(0)}`}</div>
                    <div className="manager-info">
                      <div className="manager-name">{`${manager.firstName} ${manager.lastName}`}</div>
                      <div className="manager-email">{manager.workEmail || manager.email}</div>
                    </div>
                  </div>
                ))
              }
              {managerList.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No managers found.</p>
              )}
            </div>
          </div>
        </div>
      )}



      {/* Edit Client Modal */}
      {isEditClientModalOpen && currentClientToEdit && (
        <div className="modal-overlay open">
          <div className="assign-modal-content">
            <div className="assign-modal-header">
              <h3 className="assign-modal-title">Edit Client Details: {currentClientToEdit.firstName} {currentClientToEdit.lastName}</h3>
              <button className="assign-modal-close-button" onClick={handleCloseEditClientModal}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ width: '1.2rem', height: '1.2rem' }}>
                  <path d="M6.29289 6.29289C6.68342 5.90237 7.31658 5.90237 7.70711 6.29289L12 10.5858L16.2929 6.29289C16.6834 5.90237 17.3166 5.90237 17.7071 6.29289C18.0976 6.68342 18.0976 7.31658 17.7071 7.70711L13.4142 12L17.7071 16.2929C18.0976 16.6834 18.0976 17.3166 17.7071 17.7071C17.3166 18.0976 16.6834 18.0976 16.2929 17.7071L12 13.4142L7.70711 17.7071C5.90237 7.31658 5.90237 6.68342 6.29289 6.29289Z" />
                </svg>
              </button>
            </div>
            {simplifiedServices.includes(currentClientToEdit.service) ? (
              <div className="client-preview-grid-container" style={{ gridTemplateColumns: '1fr' }}>
                <div className="client-preview-section">
                  <h4 className="client-preview-section-title">Service Request Details</h4>
                  <div className="assign-form-group">
                    <label htmlFor="firstName">First Name *</label>
                    <input type="text" id="firstName" name="firstName" value={currentClientToEdit.firstName || ''} onChange={handleEditClientChange} required />
                  </div>
                  <div className="assign-form-group">
                    <label htmlFor="lastName">Last Name *</label>
                    <input type="text" id="lastName" name="lastName" value={currentClientToEdit.lastName || ''} onChange={handleEditClientChange} required />
                  </div>
                  <div className="assign-form-group">
                    <label htmlFor="mobile">Mobile *</label>
                    <input type="tel" id="mobile" name="mobile" value={currentClientToEdit.mobile || ''} onChange={handleEditClientChange} required />
                  </div>
                  <div className="assign-form-group">
                    <label htmlFor="email">Email ID *</label>
                    <input type="email" id="email" name="email" value={currentClientToEdit.email || ''} onChange={handleEditClientChange} required />
                  </div>
                  <div className="assign-form-group">
                    <label htmlFor="service">Service *</label>
                    <select id="service" name="service" value={currentClientToEdit.service || ''} onChange={handleEditClientChange} required>
                      <option value="">Select Service</option>
                      {serviceOptions.filter(opt => opt !== 'All').map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div className="assign-form-group">
                    <label htmlFor="subServices">What service do you want? (Comma Separated)</label>
                    <textarea
                      id="subServices"
                      name="subServices"
                      value={Array.isArray(currentClientToEdit.subServices) ? currentClientToEdit.subServices.join(', ') : (currentClientToEdit.subServices || '')}
                      onChange={(e) => {
                        const { name, value } = e.target;
                        setCurrentClientToEdit(prev => ({ ...prev, [name]: value.split(',').map(s => s.trim()) }));
                      }}
                    ></textarea>
                  </div>
                  <div className="assign-form-group">
                    <label htmlFor="userType">Who are you?</label>
                    <select id="userType" name="userType" value={currentClientToEdit.userType || ''} onChange={handleEditClientChange}>
                      <option value="">Select Type</option>
                      <option value="Individual">Individual</option>
                      <option value="Business Owner">Business Owner</option>
                      <option value="Startup Founder">Startup Founder</option>
                      <option value="Agency">Agency</option>
                      <option value="Student">Student</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="client-preview-grid-container">
                  <div className="client-preview-section">
                    <h4 className="client-preview-section-title">Personal Information</h4>
                    <div className="assign-form-group">
                      <label htmlFor="firstName">First Name</label>
                      <input type="text" id="firstName" name="firstName" value={currentClientToEdit.firstName || ''} onChange={handleEditClientChange} />
                    </div>
                    <div className="assign-form-group">
                      <label htmlFor="middleName">Middle Name</label>
                      <input type="text" id="middleName" name="middleName" value={currentClientToEdit.middleName || ''} onChange={handleEditClientChange} />
                    </div>
                    <div className="assign-form-group">
                      <label htmlFor="lastName">Last Name</label>
                      <input type="text" id="lastName" name="lastName" value={currentClientToEdit.lastName || ''} onChange={handleEditClientChange} />
                    </div>
                    <div className="assign-form-group">
                      <label htmlFor="dob">Date of Birth</label>
                      <input type="date" id="dob" name="dob" value={currentClientToEdit.dob || ''} onChange={handleEditClientChange} />
                    </div>
                    <div className="assign-form-group">
                      <label htmlFor="gender">Gender</label>
                      <select id="gender" name="gender" value={currentClientToEdit.gender || ''} onChange={handleEditClientChange}>
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="assign-form-group">
                      <label htmlFor="ethnicity">Ethnicity</label>
                      <input type="text" id="ethnicity" name="ethnicity" value={currentClientToEdit.ethnicity || ''} onChange={handleEditClientChange} />
                    </div>
                  </div>
                  <div className="client-preview-section">
                    <h4 className="client-preview-section-title">Contact Information</h4>
                    <div className="assign-form-group">
                      <label htmlFor="address">Address</label>
                      <textarea id="address" name="address" value={currentClientToEdit.address || ''} onChange={handleEditClientChange}></textarea>
                    </div>
                    <div className="assign-form-group">
                      <label htmlFor="county">County</label>
                      <input type="text" id="county" name="county" value={currentClientToEdit.county || ''} onChange={handleEditClientChange} />
                    </div>
                    <div className="assign-form-group">
                      <label htmlFor="zipCode">Zip Code</label>
                      <input type="text" id="zipCode" name="zipCode" value={currentClientToEdit.zipCode || ''} onChange={handleEditClientChange} />
                    </div>
                    <div className="assign-form-group">
                      <label htmlFor="mobile">Mobile</label>
                      <input type="tel" id="mobile" name="mobile" value={currentClientToEdit.mobile || ''} onChange={handleEditClientChange} />
                    </div>
                    <div className="assign-form-group">
                      <label htmlFor="email">Email</label>
                      <input type="email" id="email" name="email" value={currentClientToEdit.email || ''} onChange={handleEditClientChange} />
                    </div>
                    <div className="assign-form-group">
                      <label htmlFor="country">Country</label>
                      <input type="text" id="country" name="country" value={currentClientToEdit.country || ''} onChange={handleEditClientChange} />
                    </div>
                  </div>
                  <div className="client-preview-section">
                    <h4 className="client-preview-section-title">Employment Information</h4>
                    <div className="assign-form-group">
                      <label htmlFor="securityClearance">Security Clearance</label>
                      <select id="securityClearance" name="securityClearance" value={currentClientToEdit.securityClearance || 'no'} onChange={handleEditClientChange}>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    {currentClientToEdit.securityClearance === 'yes' && (
                      <div className="assign-form-group">
                        <label htmlFor="clearanceLevel">Clearance Level</label>
                        <input type="text" id="clearanceLevel" name="clearanceLevel" value={currentClientToEdit.clearanceLevel || ''} onChange={handleEditClientChange} />
                      </div>
                    )}
                    <div className="assign-form-group">
                      <label htmlFor="willingToRelocate">Willing to Relocate</label>
                      <select id="willingToRelocate" name="willingToRelocate" value={currentClientToEdit.willingToRelocate || 'no'} onChange={handleEditClientChange}>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div className="assign-form-group">
                      <label htmlFor="workPreference">Work Preference</label>
                      <input type="text" id="workPreference" name="workPreference" value={currentClientToEdit.workPreference || ''} onChange={handleEditClientChange} />
                    </div>
                    <div className="assign-form-group">
                      <label htmlFor="restrictedCompanies">Restricted Companies</label>
                      <input type="text" id="restrictedCompanies" name="restrictedCompanies" value={currentClientToEdit.restrictedCompanies || ''} onChange={handleEditClientChange} />
                    </div>
                    <div className="assign-form-group">
                      <label htmlFor="yearsOfExperience">Years of Experience</label>
                      <input type="text" id="yearsOfExperience" name="yearsOfExperience" value={currentClientToEdit.yearsOfExperience || ''} onChange={handleEditClientChange} />
                    </div>
                  </div>
                  <div className="client-preview-section">
                    <h4 className="client-preview-section-title">Job Preferences & Status</h4>
                    <div className="assign-form-group">
                      <label htmlFor="jobsToApply">Jobs to Apply</label>
                      <textarea id="jobsToApply" name="jobsToApply" value={currentClientToEdit.jobsToApply || ''} onChange={handleEditClientChange}></textarea>
                    </div>
                    <div className="assign-form-group">
                      <label htmlFor="currentSalary">Current Salary</label>
                      <input type="text" id="currentSalary" name="currentSalary" value={currentClientToEdit.currentSalary || ''} onChange={handleEditClientChange} />
                    </div>
                    <div className="assign-form-group">
                      <label htmlFor="expectedSalary">Expected Salary</label>
                      <input type="text" id="expectedSalary" name="expectedSalary" value={currentClientToEdit.expectedSalary || ''} onChange={handleEditClientChange} />
                    </div>
                    <div className="assign-form-group">
                      <label htmlFor="visaStatus">Visa Status</label>
                      <input type="text" id="visaStatus" name="visaStatus" value={currentClientToEdit.visaStatus || ''} onChange={handleEditClientChange} />
                    </div>
                    {currentClientToEdit.visaStatus === 'other' && (
                      <div className="assign-form-group">
                        <label htmlFor="otherVisaStatus">Other Visa Status</label>
                        <input type="text" id="otherVisaStatus" name="otherVisaStatus" value={currentClientToEdit.otherVisaStatus || ''} onChange={handleEditClientChange} />
                      </div>
                    )}
                  </div>
                  <div className="client-preview-section">
                    <h4 className="client-preview-section-title">Education Details</h4>
                    {currentClientToEdit.educationDetails && currentClientToEdit.educationDetails.length > 0 ? (
                      currentClientToEdit.educationDetails.map((edu, index) => (
                        <div key={index} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                          <h5 style={{ fontSize: '1rem', marginBottom: '1rem' }}>
                            Education Entry {index + 1}
                            {currentClientToEdit.educationDetails.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveEducationEntry(index)}
                                style={{ float: 'right', background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}
                              >
                                Remove
                              </button>
                            )}
                          </h5>
                          <div className="assign-form-group">
                            <label>University Name</label>
                            <input type="text" name="universityName" value={edu.universityName || ''} onChange={(e) => handleEducationChange(e, index, 'universityName')} />
                          </div>
                          <div className="assign-form-group">
                            <label>University Address</label>
                            <input type="text" name="universityAddress" value={edu.universityAddress || ''} onChange={(e) => handleEducationChange(e, index, 'universityAddress')} />
                          </div>
                          <div className="assign-form-group">
                            <label>Course of Study</label>
                            <input type="text" name="courseOfStudy" value={edu.courseOfStudy || ''} onChange={(e) => handleEducationChange(e, index, 'courseOfStudy')} />
                          </div>
                          <div className="assign-form-group">
                            <label>Graduation From Date</label>
                            <input type="date" name="graduationFromDate" value={edu.graduationFromDate || ''} onChange={(e) => handleEducationChange(e, index, 'graduationFromDate')} />
                          </div>
                          <div className="assign-form-group">
                            <label>Graduation To Date</label>
                            <input type="date" name="graduationToDate" value={edu.graduationToDate || ''} onChange={(e) => handleEducationChange(e, index, 'graduationToDate')} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="read-only-value">No education details provided.</div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                      <button type="button" onClick={handleAddEducationEntry} className="assign-form-button assign" style={{ padding: '8px 16px' }}>
                        + Add Education
                      </button>
                    </div>
                  </div>
                  <div className="client-preview-section">
                    <h4 className="client-preview-section-title">Employment Details</h4>
                    <div className="assign-form-group">
                      <label htmlFor="currentCompany">Current Company</label>
                      <input type="text" id="currentCompany" name="currentCompany" value={currentClientToEdit.currentCompany || ''} onChange={handleEditClientChange} />
                    </div>
                    <div className="assign-form-group">
                      <label htmlFor="currentDesignation">Current Designation</label>
                      <input type="text" id="currentDesignation" name="currentDesignation" value={currentClientToEdit.currentDesignation || ''} onChange={handleEditClientChange} />
                    </div>
                    <div className="assign-form-group">
                      <label htmlFor="noticePeriod">Notice Period</label>
                      <select id="noticePeriod" name="noticePeriod" value={currentClientToEdit.noticePeriod || ''} onChange={handleEditClientChange}>
                        <option value="">Select Notice Period</option>
                        <option value="immediately">Immediately</option>
                        <option value="1_week">1 Week</option>
                        <option value="2_week">2 Weeks</option>
                        <option value="3_week">3 Weeks</option>
                        <option value="1_month">1 Month</option>
                      </select>
                    </div>
                    <div className="assign-form-group">
                      <label htmlFor="preferredInterviewTime">Preferred Interview Time</label>
                      <input type="text" id="preferredInterviewTime" name="preferredInterviewTime" value={currentClientToEdit.preferredInterviewTime || ''} onChange={handleEditClientChange} />
                    </div>
                    <div className="assign-form-group">
                      <label htmlFor="earliestJoiningDate">Earliest Joining Date</label>
                      <input type="date" id="earliestJoiningDate" name="earliestJoiningDate" value={currentClientToEdit.earliestJoiningDate || ''} onChange={handleEditClientChange} />
                    </div>
                    <div className="assign-form-group">
                      <label htmlFor="relievingDate">Relieving Date</label>
                      <input type="date" id="relievingDate" name="relievingDate" value={currentClientToEdit.relievingDate || ''} onChange={handleEditClientChange} />
                    </div>
                  </div>
                  <div className="client-preview-section">
                    <h4 className="client-preview-section-title">References</h4>
                    <div className="assign-form-group">
                      <label htmlFor="referenceName">Reference Name</label>
                      <input type="text" id="referenceName" name="referenceName" value={currentClientToEdit.referenceName || ''} onChange={handleEditClientChange} />
                    </div>
                    <div className="assign-form-group">
                      <label htmlFor="referencePhone">Reference Phone</label>
                      <input type="tel" id="referencePhone" name="referencePhone" value={currentClientToEdit.referencePhone || ''} onChange={handleEditClientChange} />
                    </div>
                    <div className="assign-form-group">
                      <label htmlFor="referenceAddress">Reference Address</label>
                      <textarea id="referenceAddress" name="referenceAddress" value={currentClientToEdit.referenceAddress || ''} onChange={handleEditClientChange}></textarea>
                    </div>
                    <div className="assign-form-group">
                      <label htmlFor="referenceEmail">Reference Email</label>
                      <input type="email" id="referenceEmail" name="referenceEmail" value={currentClientToEdit.referenceEmail || ''} onChange={handleEditClientChange} />
                    </div>
                    <div className="assign-form-group">
                      <label htmlFor="referenceRole">Reference Role</label>
                      <input type="text" id="referenceRole" name="referenceRole" value={currentClientToEdit.referenceRole || ''} onChange={handleEditClientChange} />
                    </div>
                  </div>
                  <div className="client-preview-section">
                    <h4 className="client-preview-section-title">Job Portal Accounts</h4>
                    <div className="assign-form-group">
                      <label htmlFor="jobPortalAccountNameandCredentials">Account Name & Credentials</label>
                      <textarea id="jobPortalAccountNameandCredentials" name="jobPortalAccountNameandCredentials" value={currentClientToEdit.jobPortalAccountNameandCredentials || ''} onChange={handleEditClientChange}></textarea>
                    </div>
                  </div>
                  <div className="client-preview-section">
                    <h4 className="client-preview-section-title">Resume(s)</h4>

                    {/* FIX: Use optional chaining (?.) to prevent crash if currentClientToEdit is null */}
                    {currentClientToEdit?.resumes && currentClientToEdit.resumes.length > 0 ? (
                      // This part for updating existing resumes remains the same
                      currentClientToEdit.resumes.map((resume, index) => (
                        <div key={index} className="assign-form-group" style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e0e0e0' }}>
                          <label htmlFor={`newResumeFile-${index}`}>
                            Resume {index + 1}: <span style={{ fontWeight: 'normal', color: '#6b7280' }}>{resume.name}</span>
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                            <input
                              type="file"
                              id={`newResumeFile-${index}`}
                              name={`newResumeFile-${index}`}
                              onChange={(e) => handleResumeFileChange(e, index)}
                              accept=".pdf,.doc,.docx"
                              style={{ display: 'none' }}
                            />
                            <label htmlFor={`newResumeFile-${index}`} className="action-button assign" style={{ cursor: 'pointer', textDecoration: 'none', backgroundColor: '#007bff', color: 'white' }}>
                              Update File
                            </label>
                            {newResumeFiles[index] && <span style={{ fontSize: '0.85rem', color: '#28a745' }}>New: {newResumeFiles[index].name}</span>}
                          </div>
                        </div>
                      ))
                    ) : (
                      // ADDED: Input to add new resumes when none exist
                      <div className="assign-form-group">
                        <label htmlFor="add-new-resumes">Add New Resume(s)</label>
                        <input
                          type="file"
                          id="add-new-resumes"
                          multiple
                          onChange={handleNewResumeUpload}
                          accept=".pdf,.doc,.docx"
                        />
                        {Object.entries(newResumeFiles).map(([key, file]) =>
                          key.startsWith('new_') && <div key={key} style={{ fontSize: '0.85rem', color: '#28a745' }}>Selected: {file.name}</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="client-preview-section">
                    <h4 className="client-preview-section-title">Cover Letter</h4>
                    <div className="assign-form-group">
                      <label>Current File:</label>
                      <div className="read-only-value">{currentClientToEdit.coverLetterFileName || 'No cover letter uploaded.'}</div>
                    </div>
                    <div className="assign-form-group">
                      <label htmlFor="newCoverLetterFile">Upload New Cover Letter (replaces current)</label>
                      <input type="file" id="newCoverLetterFile" name="newCoverLetterFile" onChange={handleCoverLetterFileChange} accept=".pdf,.doc,.docx" />
                      {newCoverLetterFile && <p style={{ fontSize: '0.8rem', marginTop: '5px', color: '#28a745' }}>New file: {newCoverLetterFile.name}</p>}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="assign-form-actions">
              <button className="assign-form-button cancel" onClick={handleCloseEditClientModal}>
                Cancel
              </button>
              <button className="assign-form-button assign" onClick={handleSaveClientDetails} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                    />
                    <span style={{ marginLeft: '8px' }}>Saving...</span>
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unaccept Confirmation Modal (Unassigned -> Registered) */}
      <div className={`modal-overlay ${isUnacceptClientConfirmModalOpen ? 'open' : ''}`}>
        <div className="modal-content confirm-modal-content">
          <h3 className="modal-title">Confirm Unaccept Client</h3>
          <p className="modal-subtitle">Are you sure you want to unaccept **{clientToUnaccept?.firstName} {clientToUnaccept?.lastName}**? This will move the client back to the 'Registered Clients' tab.</p>
          <div className="confirm-modal-buttons">
            <button onClick={handleCancelUnaccept} className="confirm-cancel-btn">Cancel</button>
            <button onClick={handleConfirmUnaccept} className="action-button decline">Unaccept</button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal (Rejected -> Permanent Delete) */}
      <div className={`modal-overlay ${isDeleteClientConfirmModalOpen ? 'open' : ''}`}>
        <div className="modal-content confirm-modal-content">
          <h3 className="modal-title">Confirm Permanent Deletion</h3>
          <p className="modal-subtitle">Are you sure you want to permanently delete **{clientToDelete?.firstName} {clientToDelete?.lastName}**? This action cannot be undone.</p>
          <div className="confirm-modal-buttons">
            <button onClick={handleCancelClientDelete} className="confirm-cancel-btn">Cancel</button>
            <button onClick={handleConfirmClientDelete} className="confirm-delete-btn">Delete Permanently</button>
          </div>
        </div>
      </div>


      {showSuccessModal && (
        <div className="modal-overlay open">
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h3 className="modal-title" style={{ marginBottom: '0.5rem' }}>Successfully Submitted!</h3>
            <p className="modal-subtitle">Client details have been updated.</p>
          </div>
        </div>
      )}


      {isConfirmManagerModalOpen && managerToConfirm && (
        <div className="modal-overlay open">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Confirm Manager Assignment</h3>
              <button
                className="modal-close-btn"
                onClick={() => setIsConfirmManagerModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <p className="modal-subtitle">
              Are you sure you want to assign manager: <strong>{managerToConfirm.firstName} {managerToConfirm.lastName}</strong>
              to client: <strong>{registrationForManager?.firstName} {registrationForManager?.lastName}</strong>?
            </p>
            <div className="confirm-modal-buttons">
              <button
                type="button"
                className="confirm-cancel-btn"
                onClick={() => setIsConfirmManagerModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm-delete-btn"
                onClick={handleConfirmSelectManager}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}


      {/* --- View Application Modal --- */}
      {isAppViewModalOpen && selectedApplication && (
        <div className="modal-overlay open">
          <div className="assign-modal-content" style={{ maxWidth: '800px' }}>
            <div className="assign-modal-header">
              <h3>Application Details</h3>
              <button className="assign-modal-close-button" onClick={() => setIsAppViewModalOpen(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              {Object.entries(selectedApplication).map(([key, value]) => (
                <p key={key}>
                  <strong>{key}:</strong> {String(value) || '-'}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- Edit Application Modal --- */}
      {isAppEditModalOpen && selectedApplication && (
        <div className="modal-overlay open">
          <div className="assign-modal-content" style={{ maxWidth: '800px' }}>
            <div className="assign-modal-header">
              <h3>Edit Application</h3>
              <button className="assign-modal-close-button" onClick={() => setIsAppEditModalOpen(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              {Object.keys(selectedApplication).map((field) => (
                <div className="assign-form-group" key={field}>
                  <label>{field}</label>
                  <input
                    type="text"
                    value={selectedApplication[field] || ''}
                    onChange={(e) =>
                      setSelectedApplication((prev) => ({ ...prev, [field]: e.target.value }))
                    }
                  />
                </div>
              ))}
              <div style={{ textAlign: 'right' }}>
                <button
                  className="save-btn"
                  onClick={async () => {
                    try {
                      const clientKey = selectedClientForDetails.clientFirebaseKey;
                      const regKey = selectedClientForDetails.registrationKey;

                      const jobApplicationsRef = ref(
                        database,
                        `clients/${clientKey}/serviceRegistrations/${regKey}/jobApplications`
                      );

                      const snapshot = await get(jobApplicationsRef);
                      const applicationsObj = snapshot.val();

                      if (!applicationsObj) {
                        console.error("❌ No applications found");
                        return;
                      }

                      // Convert object → array of { key, ...data }
                      const entries = Object.entries(applicationsObj); // [[key1, {...}], [key2, {...}]]
                      const updatedEntries = entries.map(([key, value]) => {
                        if (value.id === selectedApplication.id) {
                          return [key, selectedApplication]; // replace updated one
                        }
                        return [key, value];
                      });

                      // Convert back to object
                      const updatedObj = Object.fromEntries(updatedEntries);

                      // Push updated object back to Firebase
                      await set(jobApplicationsRef, updatedObj);

                      console.log("✅ Application updated successfully");
                      setIsAppEditModalOpen(false);
                    } catch (error) {
                      console.error("Error updating application:", error);
                    }
                  }}
                >
                  Save Changes
                </button>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Delete Confirmation Modal --- */}
      {isAppDeleteConfirmOpen && selectedApplication && (
        <div className="modal-overlay open">
          <div className="assign-modal-content" style={{ maxWidth: '400px' }}>
            <div className="assign-modal-header">
              <h3>Confirm Deletion</h3>
              <button className="assign-modal-close-button" onClick={() => setIsAppDeleteConfirmOpen(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this application?</p>
              <div className="confirm-modal-buttons">
                <button
                  className="confirm-cancel-btn"
                  onClick={() => setIsAppDeleteConfirmOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="confirm-delete-btn"
                  onClick={async () => {
                    try {
                      const clientKey = selectedClientForDetails.clientFirebaseKey;
                      const regKey = selectedClientForDetails.registrationKey;

                      const jobApplicationsRef = ref(
                        database,
                        `clients/${clientKey}/serviceRegistrations/${regKey}/jobApplications`
                      );

                      const snapshot = await get(jobApplicationsRef);
                      const applicationsObj = snapshot.val();

                      if (!applicationsObj) {
                        console.error("❌ No applications found");
                        setIsAppDeleteConfirmOpen(false);
                        return;
                      }

                      // Find the Firebase key of the selected application using its id
                      const targetKey = Object.keys(applicationsObj).find(
                        (key) => applicationsObj[key].id === selectedApplication.id
                      );

                      if (targetKey) {
                        const targetRef = ref(
                          database,
                          `clients/${clientKey}/serviceRegistrations/${regKey}/jobApplications/${targetKey}`
                        );

                        await remove(targetRef);

                        console.log("✅ Application deleted successfully");
                      } else {
                        console.error("❌ Application not found for deletion");
                      }

                      setIsAppDeleteConfirmOpen(false);
                    } catch (error) {
                      console.error("Error deleting application:", error);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {isPaymentModalOpen && selectedClientForPayment && (
        <div className="modal-overlay open">
          <div className="modal-content payment-modal-content">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Payment Management</h3>
                <p className="modal-subtitle">Create payment links or process immediate payments for {selectedClientForPayment.firstName} {selectedClientForPayment.lastName}</p>
              </div>
              <button className="modal-close-btn" onClick={handleClosePaymentModal}>&times;</button>
            </div>
            <form className="modal-form" onSubmit={(e) => { e.preventDefault(); handleGeneratePaymentLink(); }}>
              <div className="form-group modal-form-full-width">
                <label htmlFor="paymentAmount" className="form-label">Amount *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: '500' }}>USD</span>
                  <input
                    type="number"
                    id="paymentAmount"
                    name="amount"
                    className="form-input"
                    placeholder="0.00"
                    value={paymentDetails.amount}
                    onChange={handlePaymentDetailsChange}
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>
              <div className="form-group modal-form-full-width">
                <label htmlFor="paymentDescription" className="form-label">Description *</label>
                <input
                  type="text"
                  id="paymentDescription"
                  name="description"
                  className="form-input"
                  placeholder="e.g., Service charges, Consultation fee"
                  value={paymentDetails.description}
                  onChange={handlePaymentDetailsChange}
                  required
                />
              </div>
              <div className="form-group modal-form-full-width">
                <label htmlFor="transactionDate" className="form-label">Transaction Date</label>
                <input
                  type="date"
                  id="transactionDate"
                  name="transactionDate"
                  className="form-input"
                  value={paymentDetails.transactionDate}
                  readOnly
                />
              </div>
              <div className="payment-modal-client-details modal-form-full-width">
                <p><strong>Client Details:</strong></p>
                <p>Name: {selectedClientForPayment.firstName} {selectedClientForPayment.lastName}</p>
                <p>Email: {selectedClientForPayment.email}</p>
                <p>Phone: {selectedClientForPayment.mobile}</p>
              </div>
              {generatedPaymentLink ? (
                <div className="generated-link-section modal-form-full-width">
                  <div className="generated-link-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM16.7071 9.29289C17.0976 8.90237 17.0976 8.26921 16.7071 7.87869C16.3166 7.48816 15.6834 7.48816 15.2929 7.87869L10.5 12.6716L8.70711 10.8787C8.31658 10.4882 7.68342 10.4882 7.29289 10.8787C6.90237 11.2692 6.90237 11.9024 7.29289 12.2929L9.87869 14.8787C10.2692 15.2692 10.9024 15.2692 11.2929 14.8787L16.7071 9.46447V9.29289Z" />
                    </svg>
                    Payment Link Generated:
                  </div>
                  <div className="generated-link-input-group">
                    <input
                      type="text"
                      className="generated-link-input"
                      value={generatedPaymentLink}
                      readOnly
                    />
                    <div className="generated-link-actions">
                      <button type="button" className="generated-link-action-btn" onClick={handleCopyLink}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M16 1H4C2.89543 1 2 1.89543 2 3V17H4V3H16V1ZM18 5H8C6.89543 5 6 5.89543 6 7V21C6 22.1046 6.89543 23 8 23H18C19.1046 23 20 22.1046 20 21V7C20 5.89543 19.1046 5 18 5ZM8 7H18V21H8V7Z" />
                        </svg>
                        Copy Link
                      </button>
                      <button type="button" className="generated-link-action-btn" onClick={handleSendEmail}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Send Email
                      </button>
                      <button type="button" className="generated-link-action-btn" onClick={handlePreviewLink}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 6H6C4.89543 6 4 6.89543 4 8V18C4 19.1046 4.89543 20 6 20H16C17.1046 20 18 19.1046 18 18V14M14 4L20 4M20 4V10M20 4L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Preview
                      </button>
                    </div>
                  </div>
                  <button type="button" className="generated-link-close-btn" onClick={handleClosePaymentModal}>Close</button>
                </div>
              ) : (
                <div className="modal-footer modal-form-full-width">
                  <button type="button" className="confirm-cancel-btn" onClick={handleClosePaymentModal}>Cancel</button>

                  <button type="submit" className="create-employee-btn">

                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ width: '0.9rem', height: '0.9rem' }}>
                      <path d="M12 4H10C7.79086 4 6 5.79086 6 8C6 10.2091 7.79086 12 10 12H12V14H10C6.68629 14 4 11.3137 4 8C4 4.68629 6.68629 2 10 2H12V4ZM14 10H12C9.79086 10 8 11.7909 8 14C8 16.2091 9.79086 18 12 18H14V20H12C8.68629 20 6 17.3137 6 14C6 10.6863 8.68629 8 12 8H14V10ZM18 6H16V8H18C21.3137 8 24 10.6863 24 14C24 17.3137 21.3137 20 18 20H16V18H18C20.2091 18 22 16.2091 22 14C22 11.7909 20.2091 10 18 10H16V6Z" />
                    </svg>
                    Generate Link
                  </button>
                </div>
              )}

              <div className="payment-modal-options modal-form-full-width">
                <h4>Payment Options:</h4>
                <p className="payment-modal-option-item">
                  • <strong>Pay Now:</strong> Opens secure payment gateway for immediate processing
                </p>
                <p className="payment-modal-option-item">
                  • <strong>Generate Link:</strong> Creates shareable payment link for client use
                </p>
              </div>
            </form>
          </div>
        </div>
      )}
      <button
        className="scroll-btn"
        onClick={showScrollToTop ? scrollToTop : scrollToBottom}
      >
        {showScrollToTop ? "⬆" : "⬇"}
      </button>

    </div>
  );
};

// This is a wrapper to make the component runnable.
// In a real application, you would import ClientManagement and use it within your routing structure.
// const App = () => {
//     return <ClientManagement />;
// }

export default ClientManagement;