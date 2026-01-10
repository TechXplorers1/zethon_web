import React, { useState, useEffect, useCallback } from 'react';
import { database } from '../../../firebase';
import { ref, get, update } from "firebase/database";

// --- IndexedDB Helpers (For Cost-Free Caching) ---
const IDB_CONFIG = { name: 'AppCacheDB', version: 1, store: 'firebase_cache' };

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_CONFIG.name, IDB_CONFIG.version);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_CONFIG.store)) {
        db.createObjectStore(IDB_CONFIG.store);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const dbGet = async (key) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IDB_CONFIG.store, 'readonly');
    const request = transaction.objectStore(IDB_CONFIG.store).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const dbSet = async (key, val) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IDB_CONFIG.store, 'readwrite');
    const request = transaction.objectStore(IDB_CONFIG.store).put(val, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const AssetManagement = () => {
  // --- Component State ---
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Modal State
  const [isAssignAssetModalOpen, setIsAssignAssetModalOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    assetFirebaseKey: '',
    employeeFirebaseKey: '',
    reason: ''
  });
  const [assetSearchTermInModal, setAssetSearchTermInModal] = useState('');

  // --- Smart Data Fetching Logic ---
  // forceNetwork = true: Download from Firebase (Costs money)
  // forceNetwork = false: Load from Browser Cache (Free)
  const loadData = useCallback(async (forceNetwork = false) => {
    if (forceNetwork) setLoading(true);

    try {
      // 1. Load EMPLOYEES (Cache for 24 hours to save bandwidth)
      let usersMap = {};
      const cachedUsers = await dbGet('cache_employees_index');
      const isUserCacheValid = cachedUsers && (Date.now() - cachedUsers.timestamp) < (24 * 60 * 60 * 1000);

      if (!forceNetwork && isUserCacheValid) {
        usersMap = cachedUsers.data;
      } else {
        // Only download if cache is missing or older than 24h, or forced
        const usersSnap = await get(ref(database, "employees_index"));
        usersMap = usersSnap.exists() ? usersSnap.val() : {};
        if (Object.keys(usersMap).length === 0) {
          console.warn("Employees index empty. Might need to run optimization.");
        }
        await dbSet('cache_employees_index', { data: usersMap, timestamp: Date.now() });
      }

      const usersArray = Object.keys(usersMap).map(key => ({
        firebaseKey: key,
        ...usersMap[key],
      }));
      setEmployees(usersArray);

      // 2. Load ASSETS (Check Cache first, then Network)
      const cachedAssets = await dbGet('cache_assets_full');

      // If we have cache and aren't forcing network, load it immediately
      if (!forceNetwork && cachedAssets) {
        const assetsMap = cachedAssets.data;
        setAssets(Object.keys(assetsMap).map(key => ({ firebaseKey: key, ...assetsMap[key] })));
        setLastUpdated(cachedAssets.timestamp);
      }

      // If no cache or forced network refresh, fetch from Firebase
      if (forceNetwork || !cachedAssets) {
        const assetsSnap = await get(ref(database, "assets"));
        const assetsMap = assetsSnap.exists() ? assetsSnap.val() : {};

        await dbSet('cache_assets_full', { data: assetsMap, timestamp: Date.now() });

        setAssets(Object.keys(assetsMap).map(key => ({ firebaseKey: key, ...assetsMap[key] })));
        setLastUpdated(Date.now());
      }

      setError(null);
    } catch (err) {
      console.error("Data load failed:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Effects ---
  // Initial load only.
  useEffect(() => {
    loadData(false); // Initial load from cache (Fast & Free)
  }, [loadData]);


  // --- Derived Data ---
  const recentActivity = assets
    .filter(asset => asset.status === 'assigned' && asset.assignedTo !== 'Unassigned')
    .sort((a, b) => {
      const parseDate = (d) => {
        if (!d) return 0;
        if (d.includes('/')) return new Date(d.split('/').reverse().join('-'));
        return new Date(d);
      };
      return parseDate(b.assignedDate) - parseDate(a.assignedDate);
    })
    .slice(0, 10); // Limit to 10 items for UI cleanliness

  const filteredAvailableAssets = assets.filter(asset =>
    asset.status === 'available' &&
    (asset.name.toLowerCase().includes(assetSearchTermInModal.toLowerCase()) ||
      (asset.serialNumber || '').toLowerCase().includes(assetSearchTermInModal.toLowerCase()))
  );

  // --- Event Handlers ---
  const handleAssignAssetClick = () => setIsAssignAssetModalOpen(true);

  const handleCloseAssignAssetModal = () => {
    setIsAssignAssetModalOpen(false);
    setNewAssignment({ assetFirebaseKey: '', employeeFirebaseKey: '', reason: '' });
    setAssetSearchTermInModal('');
  };

  const handleNewAssignmentChange = (e) => {
    const { name, value } = e.target;
    setNewAssignment(prev => ({ ...prev, [name]: value }));
  };

  const handleAssignAsset = async (e) => {
    e.preventDefault();
    const { assetFirebaseKey, employeeFirebaseKey, reason } = newAssignment;
    if (!assetFirebaseKey || !employeeFirebaseKey || !reason) {
      alert('Please fill in all required fields.');
      return;
    }

    const assetRef = ref(database, `assets/${assetFirebaseKey}`);
    const assignedDate = new Date().toLocaleDateString('en-GB');

    const updates = {
      status: 'assigned',
      assignedTo: employeeFirebaseKey,
      assignedDate: assignedDate,
      returnDate: null
    };

    try {
      // 1. Update Firebase
      await update(assetRef, updates);

      // 2. Update Local Cache & State (Saves a download cost!)
      const updatedAssets = assets.map(a =>
        a.firebaseKey === assetFirebaseKey ? { ...a, ...updates } : a
      );
      setAssets(updatedAssets);

      // Update IndexedDB so the next reload is fresh
      const cachedWrapper = await dbGet('cache_assets_full') || { data: {} };
      if (cachedWrapper.data[assetFirebaseKey]) {
        cachedWrapper.data[assetFirebaseKey] = { ...cachedWrapper.data[assetFirebaseKey], ...updates };
        await dbSet('cache_assets_full', { data: cachedWrapper.data, timestamp: Date.now() });
      }

      handleCloseAssignAssetModal();
    } catch (err) {
      console.error("Failed to assign asset:", err);
      alert("Error assigning asset. Please try again.");
    }
  };

  // --- Style Helper Functions ---
  const getStatusTagBg = (status) => {
    switch (status?.toLowerCase()) {
      case 'assigned': return '#E0F2FE';
      case 'available': return '#D1FAE5';
      case 'in maintenance': return '#FEE2E2';
      default: return '#E5E7EB';
    }
  };

  const getStatusTagText = (status) => {
    switch (status?.toLowerCase()) {
      case 'assigned': return '#0284C7';
      case 'available': return '#065F46';
      case 'in maintenance': return '#991B1B';
      default: return '#4B5563';
    }
  };

  // --- Render ---
  return (
    <div className="ad-body-container">
      <style>{`
        /* Styles from your original file */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        :root {
            --bg-body: #f3f4f6; --bg-card: #ffffff; --text-primary: #1f2937; --text-secondary: #6b7280;
            --border-color: #e5e7eb; --shadow-color-1: rgba(0, 0, 0, 0.05); --shadow-color-3: rgba(0, 0, 0, 0.04);
            --modal-overlay-bg: rgba(0, 0, 0, 0.5); --modal-bg: #ffffff; --modal-border: #e5e7eb;
            --modal-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
            --modal-title-color: #1f2937; --modal-subtitle-color: #6b7280; --modal-close-btn-color: #6b7280;
            --modal-input-border: #d1d5db; --modal-input-bg: #ffffff; --search-icon: #9ca3af;
            --modal-label-color: #374151; --confirm-modal-cancel-btn-bg: #e5e7eb; --confirm-modal-cancel-btn-text: #4b5563;
            --create-employee-btn-bg: #2563eb; --create-employee-btn-text: #ffffff;
            --asset-card-icon-bg-total: #E0F2FE; --asset-card-icon-color-total: #2563EB;
            --asset-card-icon-bg-available: #D1FAE5; --asset-card-icon-color-available: #065F46;
            --asset-card-icon-bg-assigned: #F3E8FF; --asset-card-icon-color-assigned: #7E22CE;
            --asset-card-icon-bg-pending: #FEF3C7; --asset-card-icon-color-pending: #92400E;
            --assign-asset-btn-bg: #2563EB; --assign-asset-btn-hover: #1D4ED8; --assign-asset-btn-text: #ffffff;
            --asset-section-title-color: #1f2937; --asset-section-subtitle-color: #6b7280;
            --asset-activity-table-header-bg: #f9fafb; --asset-activity-table-header-text: #6b7280;
            --asset-activity-table-row-border: #e5e7eb; --asset-activity-table-row-hover-bg: #f9fafb;
            --asset-activity-text-primary: #1f2937; --asset-activity-text-secondary: #6b7280;
        }
        .ad-body-container { font-family: 'Inter', sans-serif; background-color: var(--bg-body); min-height: 100vh; color: var(--text-primary); }
        .asset-management-container { padding: 1.5rem; }
        .asset-management-box { background-color: var(--bg-card); border-radius: 0.75rem; box-shadow: 0 4px 6px -1px var(--shadow-color-1), 0 2px 4px -1px var(--shadow-color-3); border: 1px solid var(--border-color); padding: 1.5rem; }
        .asset-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
        .asset-title { font-size: 1.5rem; font-weight: 600; color: var(--asset-section-title-color); }
        .asset-subtitle { font-size: 0.875rem; color: var(--asset-section-subtitle-color); }
        .header-actions { display: flex; gap: 0.75rem; align-items: center; }
        .refresh-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1rem; background-color: #fff; color: #374151; border: 1px solid #e5e7eb; border-radius: 0.5rem; cursor: pointer; font-weight: 500; }
        .refresh-btn:hover { background-color: #f9fafb; }
        .assign-asset-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1rem; background-color: var(--assign-asset-btn-bg); color: var(--assign-asset-btn-text); border-radius: 0.5rem; font-weight: 500; border: none; cursor: pointer; transition: background-color 0.2s; }
        .assign-asset-btn:hover { background-color: var(--assign-asset-btn-hover); }
        .asset-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .asset-stat-card { background-color: var(--bg-card); border-radius: 0.75rem; border: 1px solid var(--border-color); padding: 1rem; display: flex; align-items: center; gap: 1rem; }
        .asset-stat-card-icon-wrapper { border-radius: 9999px; padding: 0.75rem; font-size: 1.5rem; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; }
        .asset-stat-card-icon-wrapper.total { background-color: var(--asset-card-icon-bg-total); color: var(--asset-card-icon-color-total); }
        .asset-stat-card-icon-wrapper.available { background-color: var(--asset-card-icon-bg-available); color: var(--asset-card-icon-color-available); }
        .asset-stat-card-icon-wrapper.assigned { background-color: var(--asset-card-icon-bg-assigned); color: var(--asset-card-icon-color-assigned); }
        .asset-stat-card-icon-wrapper.pending { background-color: var(--asset-card-icon-bg-pending); color: var(--asset-card-icon-color-pending); }
        .asset-stat-card-value { font-size: 1.875rem; font-weight: 700; }
        .asset-stat-card-label { font-size: 0.875rem; color: var(--text-secondary); }
        .recent-activity-section { padding-top: 1.5rem; border-top: 1px solid var(--border-color); }
        .recent-activity-section h3 { font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; }
        .asset-activity-table-container { overflow-x: auto; }
        .asset-activity-table { width: 100%; border-collapse: collapse; }
        .asset-activity-table th, .asset-activity-table td { padding: 1rem; text-align: left; border-bottom: 1px solid var(--asset-activity-table-row-border); }
        .asset-activity-table thead { background-color: var(--asset-activity-table-header-bg); }
        .asset-activity-table th { font-weight: 600; color: var(--asset-activity-table-header-text); font-size: 0.75rem; text-transform: uppercase; }
        .asset-activity-table .asset-info { display: flex; align-items: center; gap: 0.75rem; }
        .asset-status-tag { padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 500; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--modal-overlay-bg); display: flex; justify-content: center; align-items: center; z-index: 1000; opacity: 0; visibility: hidden; transition: opacity 0.3s ease; }
        .modal-overlay.open { opacity: 1; visibility: visible; }
        .modal-content { background-color: var(--modal-bg); border-radius: 0.75rem; box-shadow: var(--modal-shadow); width: 90%; max-width: 600px; padding: 1.5rem; position: relative; }
        .modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
        .modal-title { font-size: 1.25rem; font-weight: 600; }
        .modal-subtitle { font-size: 0.875rem; color: var(--modal-subtitle-color); margin-top: 0.25rem; }
        .modal-close-btn { background: none; border: none; font-size: 1.5rem; color: var(--modal-close-btn-color); cursor: pointer; }
        .modal-form { display: grid; grid-template-columns: 1fr; gap: 1rem; }
        .modal-form-full-width { grid-column: 1 / -1; }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .form-label { font-weight: 500; color: var(--modal-label-color); }
        .form-input, .form-select, textarea { padding: 0.75rem 1rem; border: 1px solid var(--modal-input-border); border-radius: 0.5rem; width: 100%; box-sizing: border-box; background-color: #fff; }
        .modal-footer { margin-top: 1.5rem; display: flex; justify-content: flex-end; gap: 0.75rem; }
        .create-employee-btn { padding: 0.75rem 1.5rem; background-color: var(--create-employee-btn-bg); color: var(--create-employee-btn-text); border-radius: 0.5rem; font-weight: 600; border: none; cursor: pointer; }
        .confirm-cancel-btn { padding: 0.75rem 1.5rem; background-color: var(--confirm-modal-cancel-btn-bg); color: var(--confirm-modal-cancel-btn-text); border-radius: 0.5rem; font-weight: 500; border: none; cursor: pointer; }
      `}</style>

      <main>
        <div className="asset-management-container">
          <div className="asset-management-box">
            <div className="asset-header">
              <div>
                <h2 className="asset-title">Asset Management</h2>
                <p className="asset-subtitle">
                  {lastUpdated
                    ? `Data cached: ${new Date(lastUpdated).toLocaleTimeString()}`
                    : 'Assign and manage equipment for your team.'}
                </p>
              </div>

              <div className="header-actions">
                {/* Manual Sync Button: Use this if you know data changed on another computer */}
                <button className="refresh-btn" onClick={() => loadData(true)} disabled={loading}>
                  {loading ? ' Syncing...' : ' Sync Data'}
                </button>
                <button className="assign-asset-btn" onClick={handleAssignAssetClick}>Assign Asset</button>
              </div>
            </div>

            {loading && !assets.length ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>Loading asset data...</div>
            ) : error ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>Error: {error}</div>
            ) : (
              <>
                <div className="asset-stats-grid">
                  <div className="asset-stat-card"><div className="asset-stat-card-icon-wrapper total">#</div><div><div className="asset-stat-card-value">{assets.length}</div><div className="asset-stat-card-label">Total Assets</div></div></div>
                  <div className="asset-stat-card"><div className="asset-stat-card-icon-wrapper available">✓</div><div><div className="asset-stat-card-value">{assets.filter(a => a.status === 'available').length}</div><div className="asset-stat-card-label">Available</div></div></div>
                  <div className="asset-stat-card"><div className="asset-stat-card-icon-wrapper assigned">👤</div><div><div className="asset-stat-card-value">{assets.filter(a => a.status === 'assigned').length}</div><div className="asset-stat-card-label">Assigned</div></div></div>
                  <div className="asset-stat-card"><div className="asset-stat-card-icon-wrapper pending">🔧</div><div><div className="asset-stat-card-value">{assets.filter(a => a.status === 'in maintenance').length}</div><div className="asset-stat-card-label">Maintenance</div></div></div>
                </div>

                <div className="recent-activity-section">
                  <h3>Recent Asset Activity</h3>
                  <div className="asset-activity-table-container">
                    <table className="asset-activity-table">
                      <thead><tr><th>Asset</th><th>Assigned To</th><th>Status</th><th>Date</th></tr></thead>
                      <tbody>
                        {recentActivity.map(asset => {
                          const employee = employees.find(e => e.firebaseKey === asset.assignedTo);
                          return (
                            <tr key={asset.firebaseKey}>
                              <td>
                                <div className="asset-info">
                                  <div>
                                    <div style={{ fontWeight: 500 }}>{asset?.name}</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{asset?.serialNumber || 'N/A'}</div>
                                  </div>
                                </div>
                              </td>
                              <td>{employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown User'}</td>
                              <td><span className="asset-status-tag" style={{ backgroundColor: getStatusTagBg(asset?.status), color: getStatusTagText(asset?.status) }}>{asset?.status}</span></td>
                              <td>{asset.assignedDate}</td>
                            </tr>
                          );
                        })}
                        {recentActivity.length === 0 && (
                          <tr><td colSpan="4" style={{ textAlign: 'center', padding: '1rem', color: '#888' }}>No recent assignments found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {isAssignAssetModalOpen && (
        <div className={`modal-overlay ${isAssignAssetModalOpen ? 'open' : ''}`}>
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Assign Asset to User</h3>
                <p className="modal-subtitle">Select an available asset and assign it.</p>
              </div>
              <button className="modal-close-btn" onClick={handleCloseAssignAssetModal}>&times;</button>
            </div>
            <form className="modal-form" onSubmit={handleAssignAsset}>
              <div className="form-group modal-form-full-width">
                <label className="form-label">Search Available Assets</label>
                <input type="text" className="form-input" placeholder="Search by name or serial number..." value={assetSearchTermInModal} onChange={(e) => setAssetSearchTermInModal(e.target.value)} />
              </div>
              <div className="form-group modal-form-full-width">
                <label className="form-label">Select Asset *</label>
                <select name="assetFirebaseKey" className="form-select" value={newAssignment.assetFirebaseKey} onChange={handleNewAssignmentChange} required>
                  <option value="">Choose an asset</option>
                  {filteredAvailableAssets.map(asset => (
                    <option key={asset.firebaseKey} value={asset.firebaseKey}>{asset.name} ({asset.serialNumber || 'No S/N'})</option>
                  ))}
                </select>
              </div>
              <div className="form-group modal-form-full-width">
                <label className="form-label">Assign to User *</label>
                <select name="employeeFirebaseKey" className="form-select" value={newAssignment.employeeFirebaseKey} onChange={handleNewAssignmentChange} required>
                  <option value="">Choose a user</option>
                  {employees.map(employee => (
                    <option key={employee.firebaseKey} value={employee.firebaseKey}>{employee.firstName} {employee.lastName} ({employee.email})</option>
                  ))}
                </select>
              </div>
              <div className="form-group modal-form-full-width">
                <label className="form-label">Assignment Reason *</label>
                <textarea name="reason" className="form-input" placeholder="e.g., New hire setup, replacement, etc." value={newAssignment.reason} onChange={handleNewAssignmentChange} rows="3" required></textarea>
              </div>
              <div className="modal-footer modal-form-full-width">
                <button type="button" className="confirm-cancel-btn" onClick={handleCloseAssignAssetModal}>Cancel</button>
                <button type="submit" className="create-employee-btn">Assign Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetManagement;