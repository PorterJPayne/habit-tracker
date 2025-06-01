// main.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBstpAtUtpV9JuVqWetD7FhpNDppgAYGCs",
  authDomain: "habit-tracker-7c16d.firebaseapp.com",
  projectId: "habit-tracker-7c16d",
  storageBucket: "habit-tracker-7c16d.appspot.com",
  messagingSenderId: "329214838371",
  appId: "1:329214838371:web:4d50e8ddedffc72defda56"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM elements
const userNameSpan = document.getElementById('user-name');
const visionSpan = document.getElementById('identity-vision');
const editVisionBtn = document.getElementById('edit-vision');
const habitInput = document.getElementById('habit-input');
const habitNote = document.getElementById('habit-note');
const addHabitBtn = document.getElementById('add-habit');
const habitList = document.getElementById('habit-list');
const journalEntry = document.getElementById('journal-entry');
const saveJournalBtn = document.getElementById('save-journal');
const signOutBtn = document.getElementById('sign-out');

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    userNameSpan.textContent = user.displayName;
    await loadUserData();
  } else {
    signIn();
  }
});

async function signIn() {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error('Sign in error:', error);
  }
}

signOutBtn?.addEventListener('click', () => {
  signOut(auth);
});

editVisionBtn?.addEventListener('click', async () => {
  const newVision = prompt('What is your updated vision?');
  if (newVision && currentUser) {
    await updateDoc(doc(db, 'users', currentUser.uid), { vision: newVision });
    visionSpan.textContent = newVision;
  }
});

addHabitBtn?.addEventListener('click', async () => {
  const name = habitInput.value.trim();
  const note = habitNote.value.trim();
  if (!name || !currentUser) return;

  await addDoc(collection(db, 'users', currentUser.uid, 'habits'), {
    name,
    note,
    completed: false,
    date: Timestamp.now()
  });
  habitInput.value = '';
  habitNote.value = '';
  await loadHabits();
});

saveJournalBtn?.addEventListener('click', async () => {
  if (!currentUser) return;
  const content = journalEntry.value.trim();
  if (!content) return;
  await setDoc(doc(db, 'users', currentUser.uid, 'journal', new Date().toDateString()), {
    content,
    timestamp: Timestamp.now()
  });
  journalEntry.value = '';
});

async function loadUserData() {
  if (!currentUser) return;
  const userDocRef = doc(db, 'users', currentUser.uid);
  const userDoc = await getDoc(userDocRef);
  if (!userDoc.exists()) {
    await setDoc(userDocRef, { vision: '[Your future self vision here]' });
  }
  visionSpan.textContent = (await getDoc(userDocRef)).data().vision;
  await loadHabits();
}

async function loadHabits() {
  if (!currentUser) return;
  const habitsSnapshot = await getDocs(collection(db, 'users', currentUser.uid, 'habits'));
  habitList.innerHTML = '';
  habitsSnapshot.forEach(docSnap => {
    const data = docSnap.data();
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${data.name}</span>
      <button data-id="${docSnap.id}" class="delete-btn">Delete</button>
    `;
    habitList.appendChild(li);
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      await deleteDoc(doc(db, 'users', currentUser.uid, 'habits', id));
      await loadHabits();
    });
  });
}

// Ensure sign-in on load
window.addEventListener('load', () => {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      signIn();
    }
  });
});
