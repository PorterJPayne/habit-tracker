// main.js

// Firebase SDK Imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-app.js';
import {
  getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc
} from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-firestore.js';
import {
  getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut
} from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-auth.js';

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBstpAtUtpV9JuVqWetD7FhpNDppgAYGCs",
  authDomain: "habit-tracker-7c16d.firebaseapp.com",
  projectId: "habit-tracker-7c16d",
  storageBucket: "habit-tracker-7c16d.appspot.com",
  messagingSenderId: "329214838371",
  appId: "1:329214838371:web:4d50e8ddedffc72defda56",
  measurementId: "G-22KVBFSEL5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const habitsRef = collection(db, 'habits');
const journalRef = collection(db, 'journal');

const userNameDisplay = document.getElementById('user-name');
const signOutBtn = document.getElementById('sign-out');
const addHabitBtn = document.getElementById('add-habit');
const habitInput = document.getElementById('habit-input');
const habitNote = document.getElementById('habit-note');
const habitList = document.getElementById('habit-list');
const saveJournalBtn = document.getElementById('save-journal');
const journalEntry = document.getElementById('journal-entry');

let currentUser = null;

onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    userNameDisplay.textContent = user.displayName;
    renderHabits();
  } else {
    signInWithPopup(auth, provider);
  }
});

signOutBtn.addEventListener('click', () => {
  signOut(auth);
});

addHabitBtn.addEventListener('click', async () => {
  const name = habitInput.value.trim();
  const note = habitNote.value.trim();
  if (name && currentUser) {
    await addDoc(habitsRef, {
      uid: currentUser.uid,
      name,
      note,
      completed: false,
      date: new Date().toISOString().split('T')[0]
    });
    habitInput.value = '';
    habitNote.value = '';
    renderHabits();
  }
});

async function renderHabits() {
  const snapshot = await getDocs(habitsRef);
  habitList.innerHTML = '';
  snapshot.forEach(docSnap => {
    const habit = docSnap.data();
    if (habit.uid === currentUser.uid && habit.date === new Date().toISOString().split('T')[0]) {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${habit.name}${habit.note ? ' - ' + habit.note : ''}</span>
        <button data-id="${docSnap.id}" class="toggle-habit">${habit.completed ? 'Undo' : 'Complete'}</button>
        <button data-id="${docSnap.id}" class="delete-habit">Delete</button>
      `;
      habitList.appendChild(li);
    }
  });

  document.querySelectorAll('.toggle-habit').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const docRef = doc(db, 'habits', id);
      const docSnap = await getDocs(habitsRef);
      docSnap.forEach(async ds => {
        if (ds.id === id) {
          await updateDoc(docRef, { completed: !ds.data().completed });
          renderHabits();
        }
      });
    });
  });

  document.querySelectorAll('.delete-habit').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      await deleteDoc(doc(db, 'habits', id));
      renderHabits();
    });
  });
}

saveJournalBtn.addEventListener('click', async () => {
  const entry = journalEntry.value.trim();
  if (entry && currentUser) {
    await addDoc(journalRef, {
      uid: currentUser.uid,
      entry,
      date: new Date().toISOString().split('T')[0]
    });
    journalEntry.value = '';
    alert('Journal saved.');
  }
});
