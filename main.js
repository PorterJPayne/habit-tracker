// Updated main.js logic to separate habits and one-time tasks

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
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyBstpAtUtpV9JuVqWetD7FhpNDppgAYGCs",
  authDomain: "habit-tracker-7c16d.firebaseapp.com",
  projectId: "habit-tracker-7c16d",
  storageBucket: "habit-tracker-7c16d.appspot.com",
  messagingSenderId: "329214838371",
  appId: "1:329214838371:web:4d50e8ddedffc72defda56"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const userNameSpan = document.getElementById('user-name');
const visionSpan = document.getElementById('identity-vision');
const editVisionBtn = document.getElementById('edit-vision');
const habitInput = document.getElementById('habit-input');
const habitNote = document.getElementById('habit-note');
const habitType = document.getElementById('habit-type');
const addHabitBtn = document.getElementById('add-habit');
const habitsContainer = document.getElementById('habits-container');
const tasksContainer = document.getElementById('tasks-container');

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

document.getElementById('sign-out')?.addEventListener('click', () => signOut(auth));

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
  const type = habitType.value;
  if (!name || !currentUser) return;

  await addDoc(collection(db, 'users', currentUser.uid, 'entries'), {
    name,
    note,
    type,
    completed: false,
    createdAt: Timestamp.now(),
    history: []
  });
  habitInput.value = '';
  habitNote.value = '';
  await loadEntries();
});

async function loadUserData() {
  if (!currentUser) return;
  const userDocRef = doc(db, 'users', currentUser.uid);
  const userDoc = await getDoc(userDocRef);
  if (!userDoc.exists()) {
    await setDoc(userDocRef, { vision: '[Your future self vision here]' });
  }
  visionSpan.textContent = (await getDoc(userDocRef)).data().vision;
  await loadEntries();
}

async function loadEntries() {
  if (!currentUser) return;
  const snapshot = await getDocs(collection(db, 'users', currentUser.uid, 'entries'));
  habitsContainer.innerHTML = '';
  tasksContainer.innerHTML = '';

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const el = document.createElement('div');
    el.className = 'entry-card';
    el.innerHTML = `
      <h4>${data.name}</h4>
      <p>${data.note}</p>
      <button onclick="toggleComplete('${docSnap.id}')">${data.completed ? 'Undo' : 'Complete'}</button>
      <button onclick="deleteEntry('${docSnap.id}')">Delete</button>
    `;

    if (data.type === 'habit') {
      habitsContainer.appendChild(el);
    } else {
      tasksContainer.appendChild(el);
    }
  });
}

window.deleteEntry = async function (id) {
  if (!currentUser) return;
  await deleteDoc(doc(db, 'users', currentUser.uid, 'entries', id));
  await loadEntries();
};

window.toggleComplete = async function (id) {
  if (!currentUser) return;
  const ref = doc(db, 'users', currentUser.uid, 'entries', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const entry = snap.data();
  const updated = !entry.completed;
  const history = updated ? [...entry.history, Timestamp.now()] : entry.history.slice(0, -1);
  await updateDoc(ref, { completed: updated, history });
  await loadEntries();
};
