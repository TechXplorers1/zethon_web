// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDKmSGm3-l7YhAWtiGvf0pXwP2XjODzgzE",
  authDomain: "zethonweb.firebaseapp.com",
  projectId: "zethonweb",
  databaseURL: "https://zethonweb-default-rtdb.firebaseio.com/",
  storageBucket: "zethonweb.firebasestorage.app",
  messagingSenderId: "167964900456",
  appId: "1:167964900456:web:237eb600247cccdad9cfdd",
  measurementId: "G-0D2LZBZWDN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);