// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDfas2AL0mK1aj9Fsoko7GdGAmjQgVoWYw",
  authDomain: "cybersleuth-35b04.firebaseapp.com",
  databaseURL: "https://cybersleuth-35b04-default-rtdb.firebaseio.com",
  projectId: "cybersleuth-35b04",
  storageBucket: "cybersleuth-35b04.firebasestorage.app",
  messagingSenderId: "1045639482296",
  appId: "1:1045639482296:web:43d4faccd66c5c24d85d4d",
  measurementId: "G-9CMTTZ795J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);